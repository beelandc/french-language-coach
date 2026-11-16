"""Per-conversation scoring and per-model metrics for the feedback eval (issue #231).

Pure functions: the runner gathers the model output, the ``llm_calls`` usage and the
match decisions, and this module turns them into a :class:`ConversationScore` and
then into the metrics the report shows, overall and per difficulty level.
"""

from dataclasses import dataclass, field
from typing import Any, Optional

from evals.matching import (
    METHOD_DETERMINISTIC,
    METHOD_JUDGE_ERROR,
    DeterministicResult,
    JudgePair,
    MatchDecision,
)
from evals.schema import FeedbackEvalRecord
from services.llm.metrics import percentile

#: Difficulty levels in report order (``scenarios.VALID_DIFFICULTIES`` is a set).
DIFFICULTY_ORDER = ("beginner", "intermediate", "advanced")

OUTCOME_VALID = "valid"
OUTCOME_INVALID = "invalid_feedback"
OUTCOME_PROVIDER_ERROR = "provider_error"


@dataclass
class CallUsage:
    """The ``llm_calls`` rows of one conversation's feedback request.

    Attributes:
        cost_usd: Summed ``estimated_cost_usd`` over the attempts (retry included).
        latency_ms: Summed ``latency_ms`` over the attempts (what a learner waits).
        call_latencies_ms: Each attempt's latency.
        attempts: Number of provider calls.
        first_attempt_valid: The first attempt's row has ``status == "success"``.
    """

    cost_usd: float = 0.0
    latency_ms: int = 0
    call_latencies_ms: list[int] = field(default_factory=list)
    attempts: int = 0
    first_attempt_valid: bool = False


@dataclass
class ConversationScore:
    """Everything the report needs about one conversation for one model."""

    record_id: str
    difficulty: str
    outcome: str
    is_clean: bool
    labeled_errors: int
    detected_errors: int
    correctly_fixed_errors: int
    corrections_total: int
    true_corrections: int
    false_corrections: int
    no_op_corrections: int
    model_grammar_score: Optional[int]
    label_grammar_score: int
    usage: CallUsage
    judge_pairs: int = 0
    judge_errors: int = 0
    judge_cost_usd: float = 0.0
    error_message: Optional[str] = None
    errors: list[dict[str, Any]] = field(default_factory=list)
    corrections: list[dict[str, Any]] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return self.outcome == OUTCOME_VALID

    @property
    def grammar_abs_error(self) -> Optional[int]:
        if self.model_grammar_score is None:
            return None
        return abs(self.model_grammar_score - self.label_grammar_score)

    def to_dict(self) -> dict[str, Any]:
        """Serialize for the JSON report."""
        return {
            "record_id": self.record_id,
            "difficulty": self.difficulty,
            "outcome": self.outcome,
            "error_message": self.error_message,
            "is_clean": self.is_clean,
            "labeled_errors": self.labeled_errors,
            "detected_errors": self.detected_errors,
            "correctly_fixed_errors": self.correctly_fixed_errors,
            "corrections_total": self.corrections_total,
            "true_corrections": self.true_corrections,
            "false_corrections": self.false_corrections,
            "no_op_corrections": self.no_op_corrections,
            "model_grammar_score": self.model_grammar_score,
            "label_grammar_score": self.label_grammar_score,
            "grammar_abs_error": self.grammar_abs_error,
            "cost_usd": round(self.usage.cost_usd, 8),
            "latency_ms": self.usage.latency_ms,
            "call_latencies_ms": self.usage.call_latencies_ms,
            "attempts": self.usage.attempts,
            "first_attempt_valid": self.usage.first_attempt_valid,
            "judge_pairs": self.judge_pairs,
            "judge_errors": self.judge_errors,
            "judge_cost_usd": round(self.judge_cost_usd, 8),
            "errors": self.errors,
            "corrections": self.corrections,
        }


def score_conversation(
    record: FeedbackEvalRecord,
    outcome: str,
    usage: CallUsage,
    *,
    deterministic: Optional[DeterministicResult] = None,
    judge_decisions: Optional[dict[JudgePair, MatchDecision]] = None,
    model_grammar_score: Optional[int] = None,
    judge_cost_usd: float = 0.0,
    error_message: Optional[str] = None,
) -> ConversationScore:
    """Score one conversation.

    For a non-valid outcome, pass no ``deterministic`` result: every labeled error is a
    miss and there are no corrections.

    Args:
        record: The labeled conversation.
        outcome: ``valid``, ``invalid_feedback`` or ``provider_error``.
        usage: Feedback-call usage from ``llm_calls``.
        deterministic: The deterministic pass (valid outcomes only).
        judge_decisions: The judge's decision per judge pair.
        model_grammar_score: The model's ``grammar_score`` (valid outcomes only).
        judge_cost_usd: Cost of this conversation's judge calls.
        error_message: Why the outcome isn't valid.
    """
    judge_decisions = judge_decisions or {}
    decisions: list[MatchDecision] = []
    corrections = []
    no_ops = 0
    if deterministic is not None:
        decisions = list(deterministic.decisions) + list(judge_decisions.values())
        corrections = deterministic.corrections
        no_ops = deterministic.no_op_count

    error_rows = []
    detected = fixed = 0
    for e_index, error in enumerate(record.errors):
        hits = [d for d in decisions if d.error_index == e_index and d.detected]
        is_detected = bool(hits)
        is_correct = any(d.correct for d in hits)
        detected += is_detected
        fixed += is_correct
        error_rows.append(
            {
                "index": e_index,
                "category": error.category.value,
                "original": error.original,
                "corrected": error.corrected,
                "detected": is_detected,
                "correct": is_correct,
                "methods": sorted({d.method for d in hits}),
                "matched_corrections": sorted({d.correction_index for d in hits}),
            }
        )

    correction_rows = []
    true_count = 0
    for c_index, correction in enumerate(corrections):
        matched = sorted(
            {d.error_index for d in decisions if d.correction_index == c_index and d.detected}
        )
        true_count += bool(matched)
        judged = [
            d
            for d in decisions
            if d.correction_index == c_index and d.method != METHOD_DETERMINISTIC
        ]
        correction_rows.append(
            {
                "index": c_index,
                "original": correction.original,
                "corrected": correction.corrected,
                "explanation": correction.explanation,
                "status": "true" if matched else "false",
                "matched_errors": matched,
                "judge": [
                    {
                        "error_index": d.error_index,
                        "detected": d.detected,
                        "correct": d.correct,
                        "method": d.method,
                        "reason": d.reason,
                    }
                    for d in judged
                ],
            }
        )

    return ConversationScore(
        record_id=record.id,
        difficulty=record.difficulty,
        outcome=outcome,
        is_clean=record.is_clean,
        labeled_errors=len(record.errors),
        detected_errors=detected,
        correctly_fixed_errors=fixed,
        corrections_total=len(corrections),
        true_corrections=true_count,
        false_corrections=len(corrections) - true_count,
        no_op_corrections=no_ops,
        model_grammar_score=model_grammar_score,
        label_grammar_score=record.grammar_score,
        usage=usage,
        judge_pairs=len(judge_decisions),
        judge_errors=sum(1 for d in judge_decisions.values() if d.method == METHOD_JUDGE_ERROR),
        judge_cost_usd=judge_cost_usd,
        error_message=error_message,
        errors=error_rows,
        corrections=correction_rows,
    )


def _ratio(numerator: float, denominator: float) -> Optional[float]:
    return None if denominator == 0 else round(numerator / denominator, 4)


def _mean(values: list[float], digits: int) -> Optional[float]:
    return round(sum(values) / len(values), digits) if values else None


def compute_metrics(scores: list[ConversationScore]) -> dict[str, Any]:
    """Compute the metrics for a group of conversations (see the #231 prompt artifact).

    Recall and validity are over all attempted conversations; precision, grammar MAE
    and corrections per conversation over valid ones; correction accuracy over
    detected errors. Ratios are ``None`` when their denominator is 0.
    """
    valid = [s for s in scores if s.is_valid]
    labeled = sum(s.labeled_errors for s in scores)
    detected = sum(s.detected_errors for s in scores)
    fixed = sum(s.correctly_fixed_errors for s in scores)
    corrections = sum(s.corrections_total for s in valid)
    true_corrections = sum(s.true_corrections for s in valid)
    grammar_errors = [s.grammar_abs_error for s in valid if s.grammar_abs_error is not None]
    costs = [s.usage.cost_usd for s in scores]
    conversation_latencies = [s.usage.latency_ms for s in scores if s.usage.attempts]
    call_latencies = [ms for s in scores for ms in s.usage.call_latencies_ms]
    return {
        "conversations": len(scores),
        "valid_conversations": len(valid),
        "labeled_errors": labeled,
        "detected_errors": detected,
        "correctly_fixed_errors": fixed,
        "error_recall": _ratio(detected, labeled),
        "corrections_total": corrections,
        "true_corrections": true_corrections,
        "false_corrections": corrections - true_corrections,
        "false_corrections_on_clean": sum(s.false_corrections for s in valid if s.is_clean),
        "no_op_corrections": sum(s.no_op_corrections for s in valid),
        "precision": _ratio(true_corrections, corrections),
        "correction_accuracy": _ratio(fixed, detected),
        "grammar_mae": _mean(grammar_errors, 2),
        "grammar_mae_n": len(grammar_errors),
        "schema_valid_first_attempt_rate": _ratio(
            sum(s.usage.first_attempt_valid for s in scores), len(scores)
        ),
        "schema_valid_final_rate": _ratio(len(valid), len(scores)),
        "provider_errors": sum(1 for s in scores if s.outcome == OUTCOME_PROVIDER_ERROR),
        "cost_per_conversation_usd": _mean(costs, 8),
        "total_cost_usd": round(sum(costs), 8),
        "latency_p50_ms": percentile(conversation_latencies, 50),
        "latency_p95_ms": percentile(conversation_latencies, 95),
        "call_latency_p50_ms": percentile(call_latencies, 50),
        "call_latency_p95_ms": percentile(call_latencies, 95),
        "judge_pairs": sum(s.judge_pairs for s in scores),
        "judge_errors": sum(s.judge_errors for s in scores),
        "judge_cost_usd": round(sum(s.judge_cost_usd for s in scores), 8),
        "mean_corrections_per_conversation": _mean(
            [s.corrections_total for s in valid], 2
        ),
    }


def aggregate_metrics(scores: list[ConversationScore]) -> dict[str, Any]:
    """Return ``{"overall": ..., "by_difficulty": {level: ...}}`` for one model."""
    return {
        "overall": compute_metrics(scores),
        "by_difficulty": {
            level: compute_metrics([s for s in scores if s.difficulty == level])
            for level in DIFFICULTY_ORDER
        },
    }
