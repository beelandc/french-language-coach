"""Tests for the feedback eval runner and CLI (issue #231).

Every provider is a fake: no test makes a network call or a paid API call.
"""

import asyncio
import functools
import json
from pathlib import Path
from typing import Callable, Optional

import pytest

import evals.run_feedback_eval as runner
from config import Settings
from evals.report import STATUS_COMPLETED, STATUS_INTERRUPTED, STATUS_STOPPED_SPEND_CAP
from evals.run_feedback_eval import (
    DEFAULT_CONFIG_KEYS,
    EVAL_CONFIGS,
    EXIT_ERROR,
    EXIT_INTERRUPTED,
    EXIT_OK,
    EXIT_SPEND_CAP,
    MODEL_ABORTED,
    MODEL_NOT_RUN,
    PreflightError,
    RunOptions,
    config_effort,
    estimate_feedback_cost,
    expand_rubric_arms,
    parse_args,
    run_eval,
    select_records,
)
from evals.schema import FeedbackEvalRecord, load_dataset
from services.llm.base import FEEDBACK_PROMPT, LLMProvider, LLMResult
from services.llm.rubric import build_feedback_system_prompt, feedback_rubric_sha256

REPO_ROOT = Path(__file__).resolve().parents[1]
RECORDS = load_dataset()
BY_ID = {record.id: record for record in RECORDS}
BY_FIRST_TURN = {record.messages[1].content: record for record in RECORDS}
VERDICT_TRUE = '{"addresses_error": true, "correction_acceptable": true, "reason": "ok"}'


def feedback_json(record: FeedbackEvalRecord, grammar: Optional[int] = None, wrong: bool = False) -> str:
    """Valid feedback whose corrections are the record's labeled errors."""
    corrections = [
        {
            "original": error.original,
            "corrected": error.original + "e" if wrong else error.corrected,
            "explanation": "explication",
        }
        for error in record.errors
    ]
    return json.dumps(
        {
            "grammar_score": record.grammar_score if grammar is None else grammar,
            "vocabulary_score": 70, "fluency_score": 70, "overall_score": 70,
            "strengths": ["Clair"], "focus_area": "Accords",
            "example_corrections": corrections,
        },
        ensure_ascii=False,
    )


Behaviour = Callable[[FeedbackEvalRecord, str, bool], object]


class FakeProvider(LLMProvider):
    """Feedback from ``behaviour(record, model, is_retry)``; ``chat`` returns ``judge_reply``."""

    def __init__(self, name: str, behaviour: Optional[Behaviour] = None, judge_reply: str = VERDICT_TRUE):
        self.name = name
        self.behaviour = behaviour or (lambda record, model, retry: feedback_json(record))
        self.judge_reply = judge_reply
        self.feedback_calls: list[tuple[str, str, bool]] = []
        self.system_prompts: list[Optional[str]] = []
        self.chat_calls: list[str] = []

    async def feedback(self, messages, model, correction=None, system_prompt=None):
        record = BY_FIRST_TURN[messages[1]["content"]]
        self.feedback_calls.append((record.id, model, correction is not None))
        self.system_prompts.append(system_prompt)
        result = self.behaviour(record, model, correction is not None)
        if isinstance(result, BaseException):
            raise result
        # 2000 in + 2000 out on Mistral Large = $0.004
        return LLMResult(text=result, input_tokens=2000, output_tokens=2000)

    async def chat(self, messages, system_prompt, model):
        self.chat_calls.append(model)
        return LLMResult(text=self.judge_reply, input_tokens=500, output_tokens=50)


def fake_settings(provider: str, model: str, effort: Optional[str] = None) -> Settings:
    return Settings(
        _env_file=None, MISTRAL_API_KEY="m", ANTHROPIC_API_KEY="a",
        FEEDBACK_PROVIDER=provider, FEEDBACK_MODEL=model,
        CHAT_PROVIDER=provider, CHAT_MODEL=model, CLAUDE_FEEDBACK_EFFORT=effort,
    )


def make_options(tmp_path: Path, **overrides) -> RunOptions:
    return RunOptions(output_dir=tmp_path, **overrides)


async def run(options: RunOptions, mistral: Optional[FakeProvider] = None,
              anthropic: Optional[FakeProvider] = None, **kwargs):
    providers = {
        "mistral": mistral or FakeProvider("mistral"),
        "anthropic": anthropic or FakeProvider("anthropic"),
    }
    lines: list[str] = []
    result = await run_eval(
        options, settings_factory=fake_settings, providers=providers, out=lines.append, **kwargs
    )
    return result, providers, lines


def test_first_turns_identify_records():
    assert len(BY_FIRST_TURN) == len(RECORDS)


class TestArguments:
    def test_defaults(self):
        options = parse_args([])
        assert options.models == list(DEFAULT_CONFIG_KEYS)
        assert (options.limit, options.ids, options.max_spend_usd) == (None, None, 5.0)
        assert (options.judge_provider, options.judge_model) == ("mistral", "mistral-large-latest")
        assert not options.dry_run and options.export_judge_sample == 0

    def test_flags(self):
        options = parse_args(
            ["--models", "all", "--limit", "3", "--ids", "fb-001, fb-010", "--max-spend-usd", "1.5",
             "--dry-run", "--judge-provider", "anthropic", "--judge-model", "claude-opus-5-5",
             "--skip-judge-validation", "--claude-effort", "high", "--export-judge-sample", "5"]
        )
        assert options.models == list(EVAL_CONFIGS)
        assert (options.limit, options.ids, options.max_spend_usd) == (3, ["fb-001", "fb-010"], 1.5)
        assert options.dry_run and options.skip_judge_validation
        assert (options.judge_provider, options.claude_effort, options.export_judge_sample) == (
            "anthropic", "high", 5,
        )

    def test_model_list_deduplicated(self):
        assert parse_args(["--models", "claude-haiku,claude-haiku,mistral-large"]).models == [
            "claude-haiku", "mistral-large",
        ]

    @pytest.mark.parametrize(
        "argv",
        [
            ["--models", "gpt-5"],
            ["--models", ","],
            ["--limit", "0"],
            ["--max-spend-usd", "0"],
            ["--ids", ","],
            ["--export-judge-sample", "-1"],
            ["--claude-effort", "turbo"],
        ],
    )
    def test_invalid(self, argv):
        with pytest.raises(SystemExit):
            parse_args(argv)


class TestSelectRecords:
    def test_limit_round_robins_by_difficulty(self):
        assert [r.id for r in select_records(RECORDS, limit=4)] == [
            "fb-001", "fb-010", "fb-019", "fb-002",
        ]

    def test_ids_then_limit(self):
        picked = select_records(RECORDS, ids=["fb-020", "fb-002", "fb-003"], limit=2)
        assert [r.id for r in picked] == ["fb-002", "fb-020"]

    def test_limit_larger_than_selection(self):
        assert len(select_records(RECORDS, limit=100)) == len(RECORDS)

    def test_unknown_id(self):
        with pytest.raises(PreflightError, match="fb-999"):
            select_records(RECORDS, ids=["fb-001", "fb-999"])

    def test_empty_selection(self):
        with pytest.raises(PreflightError, match="no conversations"):
            select_records([])


class TestHelpers:
    def test_config_effort(self):
        assert config_effort(EVAL_CONFIGS["mistral-large"], "high") is None
        assert config_effort(EVAL_CONFIGS["claude-sonnet"], None) == "medium"
        assert config_effort(EVAL_CONFIGS["claude-sonnet"], "low") == "low"

    def test_estimate_feedback_cost_is_positive(self):
        assert estimate_feedback_cost(EVAL_CONFIGS["claude-sonnet"], BY_ID["fb-001"]) > 0

    def test_build_settings_routes_both_features(self, monkeypatch, tmp_path):
        monkeypatch.setattr(runner, "REPO_ROOT", tmp_path)  # no .env there
        monkeypatch.setenv("ANTHROPIC_API_KEY", "a")
        settings = runner.build_settings("anthropic", "claude-haiku-5-5", "low")
        assert (settings.FEEDBACK_PROVIDER, settings.FEEDBACK_MODEL) == ("anthropic", "claude-haiku-5-5")
        assert (settings.CHAT_PROVIDER, settings.CHAT_MODEL) == ("anthropic", "claude-haiku-5-5")
        assert settings.CLAUDE_FEEDBACK_EFFORT == "low"

    def test_git_commit_failure_is_none(self, monkeypatch):
        def boom(*args, **kwargs):
            raise OSError("no git")

        monkeypatch.setattr(runner.subprocess, "run", boom)
        assert runner._git_commit() is None

    def test_relative_path_outside_repo(self, tmp_path):
        assert runner._relative(tmp_path / "x.jsonl") == str(tmp_path / "x.jsonl")
        assert runner._relative(REPO_ROOT / "evals" / "x") == "evals/x"


class TestPreflight:
    @pytest.mark.asyncio
    async def test_unpriced_model_fails_before_any_call(self, tmp_path):
        options = make_options(tmp_path, judge_model="mistral-small-latest", limit=1)
        with pytest.raises(PreflightError, match="no price entry for mistral/mistral-small-latest"):
            await run(options)
        assert list(tmp_path.iterdir()) == []

    @pytest.mark.asyncio
    async def test_missing_key_message_never_shows_key_values(self, tmp_path, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

        def factory(provider, model, effort=None):
            return Settings(
                _env_file=None, MISTRAL_API_KEY="secret-mistral-value",
                FEEDBACK_PROVIDER=provider, FEEDBACK_MODEL=model,
                CHAT_PROVIDER=provider, CHAT_MODEL=model,
            )

        with pytest.raises(PreflightError) as caught:
            await run_eval(make_options(tmp_path, limit=1), settings_factory=factory, out=lambda _: None)
        assert "claude-sonnet: Value error, ANTHROPIC_API_KEY must be set" in str(caught.value)
        assert "secret-mistral-value" not in str(caught.value)

    @pytest.mark.asyncio
    async def test_missing_judge_key(self, tmp_path, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

        def factory(provider, model, effort=None):
            values = {"MISTRAL_API_KEY": "m"} if provider == "mistral" else {}
            return Settings(
                _env_file=None, FEEDBACK_PROVIDER=provider, FEEDBACK_MODEL=model,
                CHAT_PROVIDER=provider, CHAT_MODEL=model, **values,
            )

        options = make_options(
            tmp_path, models=["mistral-large"], judge_provider="anthropic",
            judge_model="claude-opus-5-5", limit=1,
        )
        with pytest.raises(PreflightError, match="judge: Value error, ANTHROPIC_API_KEY"):
            await run_eval(options, settings_factory=factory, out=lambda _: None)

    @pytest.mark.asyncio
    async def test_small_validation_set_is_refused(self, tmp_path):
        source = runner.JUDGE_VALIDATION_PATH.read_text(encoding="utf-8").splitlines()
        small = tmp_path / "small.jsonl"
        small.write_text("\n".join(source[:3]) + "\n", encoding="utf-8")
        with pytest.raises(PreflightError, match="has 3 items; at least 10"):
            await run(make_options(tmp_path, judge_validation=small, limit=1))

    @pytest.mark.asyncio
    async def test_missing_validation_file(self, tmp_path):
        with pytest.raises(PreflightError, match="judge validation set"):
            await run(make_options(tmp_path, judge_validation=tmp_path / "nope.jsonl", limit=1))

    @pytest.mark.asyncio
    async def test_missing_dataset(self, tmp_path):
        with pytest.raises(PreflightError, match="dataset"):
            await run(make_options(tmp_path, dataset=tmp_path / "nope.jsonl"))


class TestRun:
    @pytest.mark.asyncio
    async def test_dry_run_makes_no_calls_and_writes_nothing(self, tmp_path):
        result, providers, lines = await run(make_options(tmp_path, limit=3, dry_run=True))
        assert (result.status, result.exit_code) == ("dry_run", EXIT_OK)
        assert result.estimate_usd > 0
        assert providers["mistral"].feedback_calls == [] and providers["mistral"].chat_calls == []
        assert list(tmp_path.iterdir()) == []
        assert any("model: claude-sonnet (anthropic/claude-sonnet-5-5, effort medium, rubric on)" in l for l in lines)

    @pytest.mark.asyncio
    async def test_full_run_with_three_default_configs(self, tmp_path):
        # Claude fakes return wrong fixes, so their corrections go to the judge
        anthropic = FakeProvider(
            "anthropic", behaviour=lambda record, model, retry: feedback_json(record, 85, wrong=True)
        )
        result, providers, _ = await run(make_options(tmp_path, limit=3), anthropic=anthropic)
        assert (result.status, result.exit_code) == (STATUS_COMPLETED, EXIT_OK)
        report = json.loads(result.json_path.read_text(encoding="utf-8"))
        assert result.md_path.exists()
        assert result.json_path.name.startswith("feedback_eval_")

        assert [m["key"] for m in report["models"]] == list(DEFAULT_CONFIG_KEYS)
        assert [m["model"] for m in report["models"]] == [
            "mistral-large-latest", "claude-sonnet-5-5", "claude-haiku-5-5",
        ]
        assert all(m["status"] == STATUS_COMPLETED for m in report["models"])
        assert [m["effort"] for m in report["models"]] == [None, "medium", "medium"]

        mistral = report["models"][0]["metrics"]["overall"]
        assert mistral["conversations"] == 3 and mistral["error_recall"] == 1.0
        assert mistral["precision"] == 1.0 and mistral["correction_accuracy"] == 1.0
        assert mistral["grammar_mae"] == 0.0 and mistral["schema_valid_final_rate"] == 1.0
        assert mistral["cost_per_conversation_usd"] == 0.004
        assert mistral["latency_p50_ms"] is not None and mistral["latency_p95_ms"] is not None
        sonnet = report["models"][1]["metrics"]["overall"]
        # The judge fake says every pair is addressed and acceptable
        assert sonnet["judge_pairs"] > 0 and sonnet["error_recall"] == 1.0
        assert sonnet["grammar_mae_n"] == 3

        spend = report["spend"]
        parts = sum(spend["feedback_by_config"].values()) + spend["judge_usd"] + spend["judge_validation_usd"]
        assert spend["total_usd"] == pytest.approx(parts)
        assert spend["cap_usd"] == 5.0 and spend["judge_validation_usd"] > 0

        validation = report["judge_validation"]
        assert validation["n"] == 22 and validation["complete"] is True
        assert validation["agreement"] == round(12 / 22, 4)  # the fake judge always says yes
        assert report["judge"]["shares_provider_with"] == ["mistral-large"]
        assert report["dataset"]["records_selected"] == ["fb-001", "fb-010", "fb-019"]
        assert report["dataset"]["path"] == "evals/datasets/feedback_v1.jsonl"
        assert {p["model"] for p in report["prices"]} == {
            "mistral-large-latest", "claude-sonnet-5-5", "claude-haiku-5-5",
        }
        assert "Agreement with hand verdicts" in result.md_path.read_text(encoding="utf-8")

        # Every judge call ran on the judge model, never on a model under test
        assert set(providers["mistral"].chat_calls) == {"mistral-large-latest"}
        assert providers["anthropic"].chat_calls == []

    @pytest.mark.asyncio
    async def test_invalid_feedback_and_retry(self, tmp_path):
        def behaviour(record, model, retry):
            if record.id == "fb-001":
                return "pas du json"
            return feedback_json(record) if retry else "{}"

        mistral = FakeProvider("mistral", behaviour=behaviour)
        result, _, _ = await run(
            make_options(tmp_path, models=["mistral-large"], limit=2, skip_judge_validation=True),
            mistral=mistral,
        )
        report = result.report
        conversations = report["models"][0]["conversations"]
        assert [c["outcome"] for c in conversations] == ["invalid_feedback", "valid"]
        assert conversations[0]["attempts"] == 2 and conversations[0]["detected_errors"] == 0
        assert "invalid_json" in conversations[0]["error_message"]
        assert conversations[1]["first_attempt_valid"] is False
        metrics = report["models"][0]["metrics"]["overall"]
        assert metrics["schema_valid_first_attempt_rate"] == 0.0
        assert metrics["schema_valid_final_rate"] == 0.5
        assert report["judge_validation"] == {"skipped": True, "reason": "--skip-judge-validation"}

    @pytest.mark.asyncio
    async def test_spend_cap_stops_the_run(self, tmp_path):
        options = make_options(
            tmp_path, models=["mistral-large", "claude-haiku"], limit=5,
            max_spend_usd=0.015, skip_judge_validation=True,
        )
        result, providers, lines = await run(options)
        assert (result.status, result.exit_code) == (STATUS_STOPPED_SPEND_CAP, EXIT_SPEND_CAP)
        report = json.loads(result.json_path.read_text(encoding="utf-8"))
        assert report["status"] == STATUS_STOPPED_SPEND_CAP
        assert [m["status"] for m in report["models"]] == [STATUS_STOPPED_SPEND_CAP, MODEL_NOT_RUN]
        assert len(report["models"][0]["conversations"]) == 3
        assert report["models"][1]["metrics"] is None
        assert report["spend"]["total_usd"] <= 0.015
        assert providers["anthropic"].feedback_calls == []
        assert any("would exceed the $0.0150 cap" in line for line in lines)
        assert any("partial" in caveat for caveat in report["caveats"])

    @pytest.mark.asyncio
    async def test_spend_cap_during_judge_validation(self, tmp_path):
        result, providers, _ = await run(make_options(tmp_path, limit=1, max_spend_usd=0.0001))
        assert result.status == STATUS_STOPPED_SPEND_CAP
        assert providers["mistral"].chat_calls == []
        assert result.report["judge_validation"]["n"] == 0
        assert result.report["judge_validation"]["complete"] is False
        assert all(m["status"] == MODEL_NOT_RUN for m in result.report["models"])

    @pytest.mark.asyncio
    async def test_consecutive_provider_errors_abort_a_config(self, tmp_path):
        failing = FakeProvider("anthropic", behaviour=lambda r, m, retry: RuntimeError("401 bad key"))
        options = make_options(
            tmp_path, models=["claude-haiku", "mistral-large"], limit=5, skip_judge_validation=True
        )
        result, providers, _ = await run(options, anthropic=failing)
        assert result.exit_code == EXIT_ERROR
        haiku, mistral = result.report["models"]
        assert haiku["status"] == MODEL_ABORTED and len(haiku["conversations"]) == 3
        assert haiku["metrics"]["overall"]["provider_errors"] == 3
        assert "RuntimeError: 401 bad key" in haiku["conversations"][0]["error_message"]
        assert mistral["status"] == STATUS_COMPLETED
        assert any("repeated provider errors" in c for c in result.report["caveats"])

    @pytest.mark.asyncio
    async def test_interrupt_writes_partial_report(self, tmp_path):
        def behaviour(record, model, retry):
            return asyncio.CancelledError() if record.id == "fb-010" else feedback_json(record)

        options = make_options(tmp_path, models=["mistral-large"], limit=3, skip_judge_validation=True)
        result, _, _ = await run(options, mistral=FakeProvider("mistral", behaviour=behaviour))
        assert (result.status, result.exit_code) == (STATUS_INTERRUPTED, EXIT_INTERRUPTED)
        assert result.json_path.exists()
        model = result.report["models"][0]
        assert model["status"] == STATUS_INTERRUPTED and len(model["conversations"]) == 1

    @pytest.mark.asyncio
    async def test_export_judge_sample(self, tmp_path):
        anthropic = FakeProvider(
            "anthropic", behaviour=lambda record, model, retry: feedback_json(record, wrong=True)
        )
        options = make_options(
            tmp_path, models=["claude-haiku"], limit=2, skip_judge_validation=True,
            export_judge_sample=2,
        )
        result, _, _ = await run(options, anthropic=anthropic)
        lines = result.sample_path.read_text(encoding="utf-8").splitlines()
        assert len(lines) == 2
        row = json.loads(lines[0])
        assert row["needs_review"] is True and row["source_style"] == "claude"
        assert row["config"] == "claude-haiku"

    @pytest.mark.asyncio
    async def test_judge_errors_are_counted(self, tmp_path):
        anthropic = FakeProvider(
            "anthropic", behaviour=lambda record, model, retry: feedback_json(record, wrong=True)
        )
        mistral = FakeProvider("mistral", judge_reply="not json")
        options = make_options(tmp_path, models=["claude-haiku"], ids=["fb-001"], skip_judge_validation=True)
        result, _, _ = await run(options, mistral=mistral, anthropic=anthropic)
        metrics = result.report["models"][0]["metrics"]["overall"]
        assert metrics["judge_pairs"] == 3 and metrics["judge_errors"] == 3
        assert metrics["error_recall"] == 0.0 and metrics["false_corrections"] == 3


class TestMain:
    def _patch(self, monkeypatch, **kwargs):
        providers = {"mistral": FakeProvider("mistral"), "anthropic": FakeProvider("anthropic")}
        monkeypatch.setattr(
            runner, "run_eval",
            functools.partial(run_eval, settings_factory=fake_settings, providers=providers, **kwargs),
        )
        return providers

    def test_main_dry_run(self, monkeypatch, tmp_path, capsys):
        self._patch(monkeypatch)
        assert runner.main(["--dry-run", "--limit", "2", "--output-dir", str(tmp_path)]) == EXIT_OK
        assert "Feedback eval plan" in capsys.readouterr().out

    def test_main_run_returns_exit_code(self, monkeypatch, tmp_path):
        self._patch(monkeypatch)
        code = runner.main(
            ["--models", "mistral-large", "--limit", "1", "--skip-judge-validation",
             "--output-dir", str(tmp_path)]
        )
        assert code == EXIT_OK
        assert len(list(tmp_path.glob("feedback_eval_*.json"))) == 1

    def test_main_preflight_error(self, monkeypatch, tmp_path, capsys):
        self._patch(monkeypatch)
        assert runner.main(["--ids", "fb-999", "--output-dir", str(tmp_path)]) == EXIT_ERROR
        assert "error: unknown record id(s): fb-999" in capsys.readouterr().err

    def test_main_keyboard_interrupt(self, monkeypatch, capsys):
        def interrupted(coro):
            coro.close()
            raise KeyboardInterrupt

        monkeypatch.setattr(runner.asyncio, "run", interrupted)
        assert runner.main(["--dry-run"]) == EXIT_INTERRUPTED
        assert "interrupted" in capsys.readouterr().err


def test_progress_output_is_flushed_by_default():
    """Progress must reach a redirected log file as it happens (seen in the first full run)."""
    out = run_eval.__kwdefaults__["out"]
    assert out.func is print and out.keywords == {"flush": True}


def test_no_workflow_runs_the_harness():
    """AC: the harness makes paid API calls, so no CI workflow may invoke it."""
    workflows = list((REPO_ROOT / ".github" / "workflows").glob("*.yml"))
    assert workflows
    for workflow in workflows:
        assert "run_feedback_eval" not in workflow.read_text(encoding="utf-8"), workflow.name


class TestRubricArms:
    """Issue #269: --rubric runs each model with and/or without the feedback rubric."""

    def test_rubric_flag_parsing(self):
        assert parse_args([]).rubric == "on"
        assert parse_args(["--rubric", "both"]).rubric == "both"
        with pytest.raises(SystemExit):
            parse_args(["--rubric", "maybe"])

    def test_expand_rubric_arms(self):
        configs = [EVAL_CONFIGS["mistral-large"], EVAL_CONFIGS["claude-haiku"]]
        assert [(c.key, c.rubric) for c in expand_rubric_arms(configs, "on")] == [
            ("mistral-large", True), ("claude-haiku", True),
        ]
        assert [(c.key, c.rubric) for c in expand_rubric_arms(configs, "off")] == [
            ("mistral-large:no-rubric", False), ("claude-haiku:no-rubric", False),
        ]
        both = expand_rubric_arms(configs, "both")
        assert [(c.key, c.rubric) for c in both] == [
            ("mistral-large", True), ("mistral-large:no-rubric", False),
            ("claude-haiku", True), ("claude-haiku:no-rubric", False),
        ]
        assert both[1].model == "mistral-large-latest"
        with pytest.raises(ValueError):
            expand_rubric_arms(configs, "sometimes")

    def test_estimate_uses_the_arm_prompt(self):
        record, config = BY_ID["fb-001"], EVAL_CONFIGS["claude-sonnet"]
        with_rubric = build_feedback_system_prompt(fake_settings("anthropic", "claude-sonnet-5-5"))
        assert estimate_feedback_cost(config, record, with_rubric) > estimate_feedback_cost(config, record)

    @pytest.mark.asyncio
    async def test_both_arms_send_different_prompts_and_are_reported(self, tmp_path):
        options = make_options(tmp_path, models=["claude-haiku"], rubric="both", limit=2)
        result, providers, lines = await run(options)

        # Each arm ran the same records, with its own system prompt
        anthropic = providers["anthropic"]
        rubric_prompt = build_feedback_system_prompt(fake_settings("anthropic", "claude-haiku-5-5"))
        assert anthropic.system_prompts == [rubric_prompt] * 2 + [FEEDBACK_PROMPT] * 2
        assert [c[0] for c in anthropic.feedback_calls] == ["fb-001", "fb-010"] * 2

        report = json.loads(result.json_path.read_text(encoding="utf-8"))
        assert [(m["key"], m["rubric"]) for m in report["models"]] == [
            ("claude-haiku", True), ("claude-haiku:no-rubric", False),
        ]
        assert report["options"]["rubric"] == "both"
        assert report["rubric"] == {
            "path": "data/feedback_rubric.md",
            "sha256": feedback_rubric_sha256("data/feedback_rubric.md"),
        }
        assert set(report["spend"]["feedback_by_config"]) == {"claude-haiku", "claude-haiku:no-rubric"}
        assert any("drafted by Claude Code from the same taxonomy" in c for c in report["caveats"])
        markdown = result.md_path.read_text(encoding="utf-8")
        assert "claude-haiku:no-rubric (`anthropic/claude-haiku-5-5`, effort medium, rubric off)" in markdown
        assert "- **Feedback rubric:** `data/feedback_rubric.md` (sha256 `" in markdown
        assert any("rubric off" in line for line in lines)

    @pytest.mark.asyncio
    async def test_rubric_off_needs_no_rubric_file(self, tmp_path):
        def factory(provider, model, effort=None):
            return fake_settings(provider, model, effort).model_copy(
                update={"FEEDBACK_RUBRIC_FILE": "data/missing-rubric.md"}
            )

        options = make_options(tmp_path, models=["claude-haiku"], rubric="off", limit=1)
        providers = {"mistral": FakeProvider("mistral"), "anthropic": FakeProvider("anthropic")}
        result = await run_eval(options, settings_factory=factory, providers=providers, out=lambda _: None)
        report = json.loads(result.json_path.read_text(encoding="utf-8"))
        assert report["rubric"] is None
        assert "- **Feedback rubric:** not used" in result.md_path.read_text(encoding="utf-8")
        assert providers["anthropic"].system_prompts == [FEEDBACK_PROMPT]

    @pytest.mark.asyncio
    async def test_missing_rubric_file_stops_preflight(self, tmp_path):
        def factory(provider, model, effort=None):
            return fake_settings(provider, model, effort).model_copy(
                update={"FEEDBACK_RUBRIC_FILE": "data/missing-rubric.md"}
            )

        with pytest.raises(PreflightError, match="rubric: .*data/missing-rubric.md"):
            await run_eval(
                make_options(tmp_path, models=["claude-haiku"], limit=1),
                settings_factory=factory, out=lambda _: None,
            )
        assert list(tmp_path.iterdir()) == []

    @pytest.mark.asyncio
    async def test_env_rubric_setting_does_not_override_the_arm(self, tmp_path):
        # Given settings (e.g. from .env) with the rubric turned off
        def factory(provider, model, effort=None):
            return fake_settings(provider, model, effort).model_copy(update={"FEEDBACK_RUBRIC": False})

        options = make_options(tmp_path, models=["claude-haiku"], rubric="on", limit=1)
        providers = {"mistral": FakeProvider("mistral"), "anthropic": FakeProvider("anthropic")}
        await run_eval(options, settings_factory=factory, providers=providers, out=lambda _: None)

        # Then the rubric arm still sends the rubric
        assert providers["anthropic"].system_prompts[0] != FEEDBACK_PROMPT
        assert "## Error taxonomy" in providers["anthropic"].system_prompts[0]
