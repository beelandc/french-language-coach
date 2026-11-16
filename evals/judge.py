"""LLM judge for corrections the deterministic pass can't decide (issue #231).

The judge decides, for one labeled learner error and one tutor correction, whether the
correction addresses that error and whether its fix is acceptable French. It runs
through the provider layer (``LLMService.get_chat_response``) on its own service,
whose chat route is the judge model, so its calls are recorded as ``feature="chat"``
and never mix with the ``feedback`` calls under test. It is never told which model
wrote the correction.

This module also holds the judge-validation set (hand verdicts on drafted
corrections) and the agreement computation that reports how far to trust the judge.
"""

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from evals.matching import METHOD_JUDGE, METHOD_JUDGE_ERROR, Correction
from evals.schema import DatasetError, FeedbackEvalRecord, LabeledError
from services.llm.service import LLMService

logger = logging.getLogger(__name__)

#: Default location of the v1 judge-validation set.
JUDGE_VALIDATION_PATH = Path(__file__).parent / "datasets" / "judge_validation_v1.jsonl"

#: Session ids used for judge-validation calls start here (one per item).
VALIDATION_SESSION_BASE = 900_000

JUDGE_SYSTEM_PROMPT = """You are an expert French teacher reviewing a tutor's written \
feedback on a learner's French.

You get one learner message, one error a human labeler found in it, and one correction \
the tutor proposed. Decide two things:

1. addresses_error: does the tutor's correction target this labeled error, i.e. try to \
fix the same mistake, even if the tutor quotes a shorter or longer span, rewrites the \
sentence, explains it badly or gets the fix wrong? A wrong or partial fix of this mistake \
still addresses it (answer true here and judge the fix in point 2). A correction about a \
different word or a different mistake does not address it.
2. correction_acceptable: if it addresses the error, is the tutor's fix of that error \
correct, natural French? It does not have to match the labeler's correction word for \
word; any correct fix is acceptable. A fix that leaves the error, half-fixes it or \
introduces a new error in the corrected part is not acceptable. If addresses_error is \
false, correction_acceptable must be false.

Reply with ONLY this JSON object and nothing else:
{"addresses_error": true or false, "correction_acceptable": true or false, \
"reason": "<one short sentence in English>"}"""

JUDGE_REASK = "Reply with only the JSON object."

_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE)


class JudgeParseError(ValueError):
    """The judge's reply wasn't a valid verdict object."""


class JudgeVerdict(BaseModel):
    """The judge's verdict on one pair. Extra keys are ignored."""

    model_config = ConfigDict(strict=True)

    addresses_error: bool
    correction_acceptable: bool
    reason: str = ""

    @model_validator(mode="after")
    def _acceptable_requires_addressed(self) -> "JudgeVerdict":
        if not self.addresses_error:
            self.correction_acceptable = False
        return self


def parse_verdict(text: str) -> JudgeVerdict:
    """Parse a judge reply into a :class:`JudgeVerdict`.

    Strips Markdown code fences and any prose around the object (everything before the
    first ``{`` and after the last ``}``), then validates strictly, so ``"true"`` is
    not accepted for a boolean.

    Raises:
        JudgeParseError: No object found, or it fails validation.
    """
    cleaned = _FENCE.sub("", text.strip())
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end < start:
        raise JudgeParseError("no JSON object in judge reply")
    try:
        return JudgeVerdict.model_validate_json(cleaned[start : end + 1])
    except ValidationError as exc:
        raise JudgeParseError(f"invalid verdict: {exc.errors()[0]['msg']}") from exc


def build_judge_message(
    record: FeedbackEvalRecord, error: LabeledError, correction: Correction
) -> str:
    """Build the user turn for one judge request (no model identity)."""
    accepted = [error.corrected, *error.alternatives]
    lines = [
        "Learner message:",
        record.messages[error.message_index].content,
        "",
        "Labeled error:",
        f"- category: {error.category.value}",
        f"- erroneous span: {error.original}",
        f"- accepted corrections: {' | '.join(accepted)}",
    ]
    if error.note:
        lines.append(f"- labeler note: {error.note}")
    lines += [
        "",
        "Tutor's correction:",
        f"- original: {correction.original}",
        f"- corrected: {correction.corrected}",
        f"- explanation: {correction.explanation or '(none)'}",
    ]
    return "\n".join(lines)


@dataclass
class JudgeDecision:
    """A judge outcome; ``error`` is set (and both flags are False) on a judge error."""

    addresses_error: bool
    correction_acceptable: bool
    reason: str = ""
    error: Optional[str] = None

    @property
    def method(self) -> str:
        """``judge`` or ``judge_error``."""
        return METHOD_JUDGE_ERROR if self.error else METHOD_JUDGE


Hook = Callable[[], Awaitable[None]]


class Judge:
    """Calls the judge model through the provider layer, with a per-run cache.

    Attributes:
        provider: Judge provider id.
        model: Judge model.
        calls: Provider calls made (re-asks included).
        errors: Pairs that ended in a judge error.
    """

    def __init__(
        self,
        service: LLMService,
        db: Optional[AsyncSession],
        before_call: Optional[Hook] = None,
        after_call: Optional[Hook] = None,
    ):
        """Create the judge.

        Args:
            service: An ``LLMService`` whose chat route is the judge model.
            db: Session the calls are recorded in.
            before_call: Awaited before every provider call (the spend check); any
                exception it raises propagates.
            after_call: Awaited after every provider call, successful or not.
        """
        self._service = service
        self._db = db
        self._before_call = before_call
        self._after_call = after_call
        self._cache: dict[tuple[str, int, str, str], JudgeDecision] = {}
        self.provider, self.model = service.route("chat")
        self.calls = 0
        self.errors = 0

    async def _call(self, turns: list[dict[str, str]], session_id: Optional[int]) -> str:
        if self._before_call is not None:
            await self._before_call()
        self.calls += 1
        try:
            return await self._service.get_chat_response(
                turns, JUDGE_SYSTEM_PROMPT, db=self._db, session_id=session_id
            )
        finally:
            if self._after_call is not None:
                await self._after_call()

    async def judge(
        self,
        record: FeedbackEvalRecord,
        error_index: int,
        correction: Correction,
        session_id: Optional[int] = None,
    ) -> JudgeDecision:
        """Return the judge's decision for one pair, from the cache when possible.

        A reply that doesn't parse gets one re-ask; a second failure, or a provider
        exception, gives a decision with ``error`` set. Exceptions from ``before_call``
        (the spend cap) propagate.
        """
        key = (record.id, error_index, *correction.key)
        if key in self._cache:
            return self._cache[key]

        message = build_judge_message(record, record.errors[error_index], correction)
        turns = [{"role": "user", "content": message}]
        decision: JudgeDecision
        try:
            reply = await self._call(turns, session_id)
            try:
                verdict = parse_verdict(reply)
            except JudgeParseError:
                if reply.strip():
                    turns += [
                        {"role": "assistant", "content": reply},
                        {"role": "user", "content": JUDGE_REASK},
                    ]
                else:
                    turns = [{"role": "user", "content": f"{message}\n\n{JUDGE_REASK}"}]
                verdict = parse_verdict(await self._call(turns, session_id))
            decision = JudgeDecision(
                verdict.addresses_error, verdict.correction_acceptable, verdict.reason
            )
        except JudgeParseError as exc:
            decision = JudgeDecision(False, False, error=f"judge_parse_error: {exc}")
        except Exception as exc:
            if _is_spend_stop(exc):
                raise
            decision = JudgeDecision(False, False, error=f"judge_provider_error: {exc}")

        if decision.error:
            self.errors += 1
            logger.warning("Judge error on %s error %d: %s", record.id, error_index, decision.error)
        self._cache[key] = decision
        return decision


def _is_spend_stop(exc: BaseException) -> bool:
    """True for the runner's spend-cap exception, which must never be swallowed."""
    return getattr(exc, "stops_run", False) is True


# --- Judge-validation set -------------------------------------------------------------

_STRICT = ConfigDict(extra="forbid", strict=True)
_JV_ID = re.compile(r"^jv-\d{3}$")


class ValidationCandidate(BaseModel):
    """A drafted tutor correction."""

    model_config = _STRICT

    original: str = Field(min_length=1)
    corrected: str = Field(min_length=1)
    explanation: str = ""


class HandVerdict(BaseModel):
    """The hand verdict for one validation item."""

    model_config = _STRICT

    addresses_error: bool
    correction_acceptable: bool

    @model_validator(mode="after")
    def _consistent(self) -> "HandVerdict":
        if self.correction_acceptable and not self.addresses_error:
            raise ValueError("correction_acceptable requires addresses_error")
        return self


class JudgeValidationItem(BaseModel):
    """One hand-judged (labeled error, candidate correction) pair.

    Attributes:
        id: ``jv-NNN``.
        record_id: A record id in the feedback dataset.
        error_index: Index into that record's ``errors``.
        source_style: Which model family's phrasing the candidate imitates, so
            agreement can be broken down (``mistral``, ``claude`` or ``neutral``).
        candidate: The tutor correction to judge.
        verdict: The hand verdict.
        note: Why the verdict is what it is.
    """

    model_config = _STRICT

    id: str
    record_id: str
    error_index: int = Field(ge=0)
    source_style: Literal["mistral", "claude", "neutral"]
    candidate: ValidationCandidate
    verdict: HandVerdict
    note: Optional[str] = None

    @field_validator("id")
    @classmethod
    def _check_id(cls, value: str) -> str:
        if not _JV_ID.match(value):
            raise ValueError(f"id {value!r} must match jv-NNN")
        return value

    def correction(self) -> Correction:
        """Return the candidate as a :class:`Correction`."""
        return Correction(
            self.candidate.original, self.candidate.corrected, self.candidate.explanation
        )


def load_judge_validation(
    path: Path | str, records: dict[str, FeedbackEvalRecord]
) -> list[JudgeValidationItem]:
    """Load and validate a judge-validation JSONL file against the dataset.

    Raises:
        DatasetError: Invalid line (1-based line number in the message), duplicate id,
            unknown ``record_id`` or out-of-range ``error_index``.
    """
    path = Path(path)
    items: list[JudgeValidationItem] = []
    seen: set[str] = set()
    with path.open(encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                item = JudgeValidationItem.model_validate_json(line)
            except ValidationError as exc:
                raise DatasetError(f"{path} line {line_no}: {exc}") from exc
            if item.id in seen:
                raise DatasetError(f"{path} line {line_no}: duplicate id {item.id!r}")
            record = records.get(item.record_id)
            if record is None:
                raise DatasetError(f"{path} line {line_no}: unknown record_id {item.record_id!r}")
            if item.error_index >= len(record.errors):
                raise DatasetError(
                    f"{path} line {line_no}: error_index {item.error_index} out of range "
                    f"for {item.record_id} ({len(record.errors)} errors)"
                )
            seen.add(item.id)
            items.append(item)
    return items


@dataclass
class ValidationOutcome:
    """The judge's decision on one validation item."""

    item: JudgeValidationItem
    decision: JudgeDecision

    @property
    def addresses_agrees(self) -> bool:
        return not self.decision.error and (
            self.decision.addresses_error == self.item.verdict.addresses_error
        )

    @property
    def acceptable_agrees(self) -> bool:
        return not self.decision.error and (
            self.decision.correction_acceptable == self.item.verdict.correction_acceptable
        )

    @property
    def agrees(self) -> bool:
        return self.addresses_agrees and self.acceptable_agrees


async def run_judge_validation(
    judge: Judge,
    items: list[JudgeValidationItem],
    records: dict[str, FeedbackEvalRecord],
    outcomes: Optional[list[ValidationOutcome]] = None,
) -> list[ValidationOutcome]:
    """Judge every validation item, in order.

    Args:
        judge: The judge.
        items: Validation items.
        records: Dataset records by id.
        outcomes: List to append to, so a caller keeps partial results if the spend
            cap stops the run midway.
    """
    results = outcomes if outcomes is not None else []
    for index, item in enumerate(items):
        decision = await judge.judge(
            records[item.record_id],
            item.error_index,
            item.correction(),
            session_id=VALIDATION_SESSION_BASE + index,
        )
        results.append(ValidationOutcome(item, decision))
    return results


def _rate(numerator: int, denominator: int) -> Optional[float]:
    return None if denominator == 0 else round(numerator / denominator, 4)


def compute_agreement(outcomes: list[ValidationOutcome]) -> dict[str, Any]:
    """Summarize judge agreement with the hand verdicts.

    An item agrees when both booleans match; a judge error is a disagreement.

    Returns:
        ``n``, ``agreement``, per-field agreement, ``judge_errors``, ``by_source_style``
        (n and agreement per style) and ``disagreements`` (id, hand and judge verdicts,
        judge reason or error).
    """
    by_style: dict[str, dict[str, Any]] = {}
    for style in sorted({o.item.source_style for o in outcomes}):
        group = [o for o in outcomes if o.item.source_style == style]
        by_style[style] = {
            "n": len(group),
            "agreement": _rate(sum(o.agrees for o in group), len(group)),
        }
    disagreements = [
        {
            "id": o.item.id,
            "record_id": o.item.record_id,
            "error_index": o.item.error_index,
            "source_style": o.item.source_style,
            "candidate": o.item.candidate.model_dump(),
            "hand": o.item.verdict.model_dump(),
            "judge": {
                "addresses_error": o.decision.addresses_error,
                "correction_acceptable": o.decision.correction_acceptable,
            },
            "judge_reason": o.decision.reason,
            "judge_error": o.decision.error,
        }
        for o in outcomes
        if not o.agrees
    ]
    n = len(outcomes)
    return {
        "n": n,
        "agreement": _rate(sum(o.agrees for o in outcomes), n),
        "addresses_error_agreement": _rate(sum(o.addresses_agrees for o in outcomes), n),
        "correction_acceptable_agreement": _rate(sum(o.acceptable_agrees for o in outcomes), n),
        "judge_errors": sum(1 for o in outcomes if o.decision.error),
        "by_source_style": by_style,
        "disagreements": disagreements,
    }


def judge_rationale(judge_provider: str, judge_model: str, shares_with: list[str]) -> str:
    """Explain the judge choice and its self-preference exposure for the report."""
    shared = (
        f"It shares a provider with: {', '.join(shares_with)}. "
        if shares_with
        else "It shares a provider with none of the models under test. "
    )
    if (judge_provider, judge_model) == ("mistral", "mistral-large-latest"):
        why = (
            "Mistral Large is the default judge (decided in the #231 SPDD analysis). "
            "The dataset's conversations, labels and preferred corrections were drafted "
            "by a Claude model, so a Claude judge would stack a second Claude-favoring "
            "bias on top; Mistral Large shares a provider only with the Mistral baseline. "
        )
    else:
        why = (
            f"{judge_provider}/{judge_model} was chosen for this run instead of the default "
            "judge (mistral/mistral-large-latest), e.g. as a sensitivity check. "
        )
    mitigations = (
        "Mitigations: the judge only rules on pairs the deterministic pass can't decide, "
        "it is not told which model wrote a correction, its task is narrow, and its "
        "agreement with hand verdicts is reported by the style of the drafted correction."
    )
    return why + shared + mitigations


def sample_record(
    record: FeedbackEvalRecord,
    error_index: int,
    correction: Correction,
    decision: JudgeDecision,
    config_key: str,
    source_style: str,
) -> dict[str, Any]:
    """Build one ``--export-judge-sample`` line (validation format plus review flags)."""
    return {
        "id": None,
        "record_id": record.id,
        "error_index": error_index,
        "source_style": source_style,
        "candidate": {
            "original": correction.original,
            "corrected": correction.corrected,
            "explanation": correction.explanation,
        },
        "verdict": {
            "addresses_error": decision.addresses_error,
            "correction_acceptable": decision.correction_acceptable,
        },
        "note": f"judge reason: {decision.reason}" if decision.reason else None,
        "config": config_key,
        "needs_review": True,
    }


def dump_jsonl(rows: list[dict[str, Any]]) -> str:
    """Serialize rows as JSONL (UTF-8, no ASCII escaping)."""
    return "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows)

