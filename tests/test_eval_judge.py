"""Tests for the feedback-eval LLM judge and its validation set (issue #231)."""

import json
from pathlib import Path
from typing import Optional

import pytest
from sqlalchemy import select

from config import Settings
from evals.judge import (
    JUDGE_REASK,
    JUDGE_SYSTEM_PROMPT,
    JUDGE_VALIDATION_PATH,
    VALIDATION_SESSION_BASE,
    Judge,
    JudgeDecision,
    JudgeParseError,
    ValidationOutcome,
    build_judge_message,
    compute_agreement,
    dump_jsonl,
    judge_rationale,
    load_judge_validation,
    parse_verdict,
    run_judge_validation,
    sample_record,
)
from evals.matching import METHOD_JUDGE, METHOD_JUDGE_ERROR, Correction
from evals.schema import DatasetError, FeedbackEvalRecord, load_dataset
from models.llm_call import LLMCall
from services.llm.base import LLMProvider, LLMResult
from services.llm.service import LLMService

VERDICT_TRUE = '{"addresses_error": true, "correction_acceptable": true, "reason": "ok"}'
VERDICT_WRONG_FIX = '{"addresses_error": true, "correction_acceptable": false, "reason": "wrong"}'


@pytest.fixture(scope="module")
def records() -> dict[str, FeedbackEvalRecord]:
    return {record.id: record for record in load_dataset()}


class FakeJudgeProvider(LLMProvider):
    """Returns queued replies (or raises queued exceptions) from ``chat``."""

    name = "mistral"

    def __init__(self, replies: list):
        self.replies = list(replies)
        self.calls: list[dict] = []

    async def chat(self, messages, system_prompt, model):
        self.calls.append({"messages": messages, "system_prompt": system_prompt, "model": model})
        reply = self.replies.pop(0)
        if isinstance(reply, BaseException):
            raise reply
        return LLMResult(text=reply, input_tokens=1000, output_tokens=100)

    async def feedback(self, messages, model, correction=None, system_prompt=None):  # pragma: no cover
        raise NotImplementedError


def make_judge(replies: list, db=None, **hooks) -> tuple[Judge, FakeJudgeProvider]:
    provider = FakeJudgeProvider(replies)
    settings = Settings(
        _env_file=None, MISTRAL_API_KEY="m", ANTHROPIC_API_KEY="a",
        CHAT_PROVIDER="mistral", CHAT_MODEL="mistral-large-latest",
    )
    service = LLMService(settings=settings, providers={"mistral": provider})
    return Judge(service, db, **hooks), provider


class TestParseVerdict:
    def test_plain_json(self):
        verdict = parse_verdict(VERDICT_TRUE)
        assert (verdict.addresses_error, verdict.correction_acceptable, verdict.reason) == (
            True, True, "ok",
        )

    def test_code_fence_and_prose(self):
        text = 'Here is my verdict:\n```json\n' + VERDICT_WRONG_FIX + '\n```\nThanks.'
        verdict = parse_verdict(text)
        assert verdict.addresses_error and not verdict.correction_acceptable

    def test_acceptable_forced_false_when_not_addressed(self):
        verdict = parse_verdict('{"addresses_error": false, "correction_acceptable": true}')
        assert verdict.correction_acceptable is False
        assert verdict.reason == ""

    def test_extra_keys_ignored(self):
        verdict = parse_verdict('{"addresses_error": true, "correction_acceptable": true, "x": 1}')
        assert verdict.addresses_error

    @pytest.mark.parametrize(
        "text",
        [
            "no json here",
            '{"addresses_error": "true", "correction_acceptable": true}',
            '{"addresses_error": true}',
            "} backwards {",
        ],
    )
    def test_invalid(self, text):
        with pytest.raises(JudgeParseError):
            parse_verdict(text)


def test_build_judge_message_has_no_model_identity(records):
    record = records["fb-002"]
    message = build_judge_message(
        record, record.errors[2], Correction("avec le train", "en train", "moyen de transport")
    )
    assert record.messages[7].content in message
    assert "accepted corrections: en train | par le train" in message
    assert "labeler note: means of transport: en train" in message
    assert "explanation: moyen de transport" in message
    for name in ("mistral", "claude", "sonnet", "haiku", "opus"):
        assert name not in message.lower()


def test_build_judge_message_without_note_or_explanation(records):
    record = records["fb-001"]
    error = record.errors[0].model_copy(update={"note": None})
    message = build_judge_message(record, error, Correction("une croissant", "un croissant"))
    assert "labeler note" not in message
    assert "explanation: (none)" in message


class TestJudge:
    @pytest.mark.asyncio
    async def test_records_call_and_returns_decision(self, records, test_db):
        judge, provider = make_judge([VERDICT_WRONG_FIX], db=test_db)
        decision = await judge.judge(
            records["fb-001"], 0, Correction("une croissant", "une croissante"), session_id=1001
        )
        assert (decision.addresses_error, decision.correction_acceptable) == (True, False)
        assert decision.method == METHOD_JUDGE
        assert provider.calls[0]["system_prompt"] == JUDGE_SYSTEM_PROMPT
        rows = (await test_db.execute(select(LLMCall))).scalars().all()
        assert [(r.feature, r.session_id, r.model) for r in rows] == [
            ("chat", 1001, "mistral-large-latest")
        ]
        assert (judge.provider, judge.model, judge.calls, judge.errors) == (
            "mistral", "mistral-large-latest", 1, 0,
        )

    @pytest.mark.asyncio
    async def test_cache_avoids_second_call(self, records):
        judge, provider = make_judge([VERDICT_TRUE])
        first = await judge.judge(records["fb-001"], 0, Correction("une croissant", "un croissant"))
        second = await judge.judge(records["fb-001"], 0, Correction("Une croissant", "un croissant."))
        assert first is second
        assert len(provider.calls) == 1

    @pytest.mark.asyncio
    async def test_reask_after_unparseable_reply(self, records):
        judge, provider = make_judge(["I think yes.", VERDICT_TRUE])
        decision = await judge.judge(records["fb-001"], 0, Correction("une croissant", "un croissant"))
        assert decision.addresses_error and decision.error is None
        reask = provider.calls[1]["messages"]
        assert [turn["role"] for turn in reask] == ["user", "assistant", "user"]
        assert reask[1]["content"] == "I think yes."
        assert reask[2]["content"] == JUDGE_REASK

    @pytest.mark.asyncio
    async def test_reask_after_empty_reply_skips_assistant_turn(self, records):
        judge, provider = make_judge(["  ", VERDICT_TRUE])
        await judge.judge(records["fb-001"], 0, Correction("une croissant", "un croissant"))
        reask = provider.calls[1]["messages"]
        assert len(reask) == 1 and reask[0]["content"].endswith(JUDGE_REASK)

    @pytest.mark.asyncio
    async def test_two_bad_replies_is_a_judge_error(self, records):
        judge, _ = make_judge(["nope", "still nope"])
        decision = await judge.judge(records["fb-001"], 0, Correction("une croissant", "un croissant"))
        assert decision.error.startswith("judge_parse_error")
        assert decision.method == METHOD_JUDGE_ERROR
        assert not decision.addresses_error and judge.errors == 1

    @pytest.mark.asyncio
    async def test_provider_exception_is_a_judge_error(self, records):
        judge, _ = make_judge([RuntimeError("rate limited")])
        decision = await judge.judge(records["fb-001"], 0, Correction("une croissant", "un croissant"))
        assert decision.error == "judge_provider_error: rate limited"

    @pytest.mark.asyncio
    async def test_hooks_run_around_each_call(self, records):
        events: list[str] = []

        async def before():
            events.append("before")

        async def after():
            events.append("after")

        judge, _ = make_judge(["bad", VERDICT_TRUE], before_call=before, after_call=after)
        await judge.judge(records["fb-001"], 0, Correction("une croissant", "un croissant"))
        assert events == ["before", "after", "before", "after"]

    @pytest.mark.asyncio
    async def test_spend_stop_from_hook_propagates(self, records):
        class Stop(Exception):
            stops_run = True

        async def before():
            raise Stop("cap")

        judge, provider = make_judge([VERDICT_TRUE], before_call=before)
        with pytest.raises(Stop):
            await judge.judge(records["fb-001"], 0, Correction("une croissant", "un croissant"))
        assert provider.calls == []


class TestValidationSet:
    def test_committed_set_is_valid(self, records):
        items = load_judge_validation(JUDGE_VALIDATION_PATH, records)
        assert len(items) >= 10
        negatives = [i for i in items if not (i.verdict.addresses_error and i.verdict.correction_acceptable)]
        assert len(negatives) >= 5
        assert {i.source_style for i in items} == {"mistral", "claude", "neutral"}
        assert {records[i.record_id].difficulty for i in items} == {
            "beginner", "intermediate", "advanced",
        }

    def _write(self, tmp_path: Path, *rows: dict) -> Path:
        path = tmp_path / "jv.jsonl"
        path.write_text("\n".join(json.dumps(r) for r in rows) + "\n\n", encoding="utf-8")
        return path

    def _row(self, **overrides) -> dict:
        row = {
            "id": "jv-001", "record_id": "fb-001", "error_index": 0, "source_style": "neutral",
            "candidate": {"original": "une croissant", "corrected": "un croissant"},
            "verdict": {"addresses_error": True, "correction_acceptable": True},
        }
        row.update(overrides)
        return row

    def test_loads_minimal_row(self, tmp_path, records):
        items = load_judge_validation(self._write(tmp_path, self._row()), records)
        assert items[0].correction() == Correction("une croissant", "un croissant", "")

    @pytest.mark.parametrize(
        "overrides, message",
        [
            ({"id": "jv-1"}, "line 1"),
            ({"verdict": {"addresses_error": False, "correction_acceptable": True}}, "line 1"),
            ({"source_style": "gpt"}, "line 1"),
            ({"extra": 1}, "line 1"),
            ({"record_id": "fb-999"}, "unknown record_id"),
            ({"error_index": 3}, "out of range"),
        ],
    )
    def test_invalid_rows(self, tmp_path, records, overrides, message):
        with pytest.raises(DatasetError, match=message):
            load_judge_validation(self._write(tmp_path, self._row(**overrides)), records)

    def test_duplicate_id(self, tmp_path, records):
        path = self._write(tmp_path, self._row(), self._row())
        with pytest.raises(DatasetError, match="duplicate id"):
            load_judge_validation(path, records)

    @pytest.mark.asyncio
    async def test_run_validation_uses_validation_session_ids(self, tmp_path, records, test_db):
        path = self._write(
            tmp_path, self._row(), self._row(id="jv-002", error_index=1,
            candidate={"original": "à le comptoir", "corrected": "au comptoir"}),
        )
        items = load_judge_validation(path, records)
        judge, _ = make_judge([VERDICT_TRUE, VERDICT_TRUE], db=test_db)
        outcomes = await run_judge_validation(judge, items, records)
        assert all(o.agrees for o in outcomes)
        rows = (await test_db.execute(select(LLMCall))).scalars().all()
        assert [r.session_id for r in rows] == [VALIDATION_SESSION_BASE, VALIDATION_SESSION_BASE + 1]


def _outcome(records, style, hand, judged, error: Optional[str] = None) -> ValidationOutcome:
    from evals.judge import JudgeValidationItem

    item = JudgeValidationItem.model_validate(
        {
            "id": "jv-001", "record_id": "fb-001", "error_index": 0, "source_style": style,
            "candidate": {"original": "a", "corrected": "b"},
            "verdict": {"addresses_error": hand[0], "correction_acceptable": hand[1]},
        }
    )
    return ValidationOutcome(item, JudgeDecision(judged[0], judged[1], "r", error))


def test_compute_agreement(records):
    outcomes = [
        _outcome(records, "mistral", (True, True), (True, True)),
        _outcome(records, "mistral", (True, False), (True, True)),  # acceptable disagrees
        _outcome(records, "claude", (False, False), (False, False)),
        _outcome(records, "claude", (True, True), (False, False), error="judge_parse_error: x"),
    ]
    summary = compute_agreement(outcomes)
    assert summary["n"] == 4
    assert summary["agreement"] == 0.5
    assert summary["addresses_error_agreement"] == 0.75
    assert summary["correction_acceptable_agreement"] == 0.5
    assert summary["judge_errors"] == 1
    assert summary["by_source_style"] == {
        "claude": {"n": 2, "agreement": 0.5},
        "mistral": {"n": 2, "agreement": 0.5},
    }
    assert len(summary["disagreements"]) == 2
    assert summary["disagreements"][1]["judge_error"] == "judge_parse_error: x"


def test_compute_agreement_empty():
    summary = compute_agreement([])
    assert summary["n"] == 0 and summary["agreement"] is None


def test_judge_rationale():
    default = judge_rationale("mistral", "mistral-large-latest", ["mistral-large"])
    assert "Mistral Large is the default judge" in default
    assert "shares a provider with: mistral-large" in default
    other = judge_rationale("anthropic", "claude-opus-5-5", [])
    assert "sensitivity check" in other and "none of the models" in other


def test_sample_record_and_dump(records):
    row = sample_record(
        records["fb-001"], 0, Correction("une croissant", "un croissant", "masc."),
        JudgeDecision(True, True, "fine"), "claude-haiku", "claude",
    )
    assert row["needs_review"] is True and row["note"] == "judge reason: fine"
    line = dump_jsonl([row])
    assert line.endswith("\n") and json.loads(line)["config"] == "claude-haiku"
    no_reason = sample_record(
        records["fb-001"], 0, Correction("a", "b"), JudgeDecision(False, False), "k", "mistral"
    )
    assert no_reason["note"] is None
