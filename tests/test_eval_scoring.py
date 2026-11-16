"""Tests for per-conversation scoring and metrics in the feedback eval (issue #231)."""

import pytest

from evals.matching import (
    METHOD_JUDGE,
    METHOD_JUDGE_ERROR,
    Correction,
    JudgePair,
    MatchDecision,
    match_deterministic,
)
from evals.schema import FeedbackEvalRecord, load_dataset
from evals.scoring import (
    DIFFICULTY_ORDER,
    OUTCOME_INVALID,
    OUTCOME_PROVIDER_ERROR,
    OUTCOME_VALID,
    CallUsage,
    aggregate_metrics,
    compute_metrics,
    score_conversation,
)
from scenarios import VALID_DIFFICULTIES


@pytest.fixture(scope="module")
def records() -> dict[str, FeedbackEvalRecord]:
    return {record.id: record for record in load_dataset()}


def usage(cost=0.01, latencies=(1000,), first_valid=True) -> CallUsage:
    return CallUsage(
        cost_usd=cost,
        latency_ms=sum(latencies),
        call_latencies_ms=list(latencies),
        attempts=len(latencies),
        first_attempt_valid=first_valid,
    )


def score_valid(record, corrections, grammar, judge=None, cost=0.01, latencies=(1000,)):
    deterministic = match_deterministic(record, corrections)
    decisions = {}
    for pair in deterministic.judge_pairs:
        detected, correct, method = (judge or {}).get(pair, (False, False, METHOD_JUDGE))
        decisions[pair] = MatchDecision(
            pair.error_index, pair.correction_index, detected, correct, method, "why"
        )
    return score_conversation(
        record,
        OUTCOME_VALID,
        usage(cost, latencies),
        deterministic=deterministic,
        judge_decisions=decisions,
        model_grammar_score=grammar,
        judge_cost_usd=0.001 * len(decisions),
    )


def test_difficulty_order_matches_scenarios():
    assert set(DIFFICULTY_ORDER) == VALID_DIFFICULTIES


class TestScoreConversation:
    def test_mixed_deterministic_judge_and_false(self, records):
        record = records["fb-001"]
        corrections = [
            Correction("une croissant", "un croissant"),  # deterministic, correct
            Correction("à le comptoir", "à la comptoir"),  # judge: detected, wrong fix
            Correction("je n'aime pas le jus", "je déteste le jus"),  # no candidates: false
            Correction("Sur place", "Sur place"),  # no-op
        ]
        score = score_valid(
            record, corrections, 85, judge={JudgePair(1, 1): (True, False, METHOD_JUDGE)}
        )
        assert (score.labeled_errors, score.detected_errors, score.correctly_fixed_errors) == (3, 2, 1)
        assert (score.corrections_total, score.true_corrections, score.false_corrections) == (3, 2, 1)
        assert score.no_op_corrections == 1
        assert score.grammar_abs_error == 5
        assert score.judge_pairs == 1 and score.judge_errors == 0
        assert score.errors[1]["methods"] == ["judge"]
        assert score.corrections[1]["judge"][0]["reason"] == "why"
        assert score.corrections[2]["status"] == "false"

    def test_judge_error_counts_as_not_matched(self, records):
        record = records["fb-001"]
        score = score_valid(
            record,
            [Correction("une croissant", "une croissante")],
            80,
            judge={JudgePair(0, 0): (False, False, METHOD_JUDGE_ERROR)},
        )
        assert score.detected_errors == 0 and score.false_corrections == 1
        assert score.judge_errors == 1

    @pytest.mark.parametrize("outcome", [OUTCOME_INVALID, OUTCOME_PROVIDER_ERROR])
    def test_non_valid_outcome_misses_every_error(self, records, outcome):
        score = score_conversation(
            records["fb-001"], outcome, usage(cost=0.02, latencies=(900, 1100), first_valid=False),
            error_message="schema_mismatch: x",
        )
        assert score.detected_errors == 0 and score.corrections_total == 0
        assert score.grammar_abs_error is None and not score.is_valid
        data = score.to_dict()
        assert data["outcome"] == outcome and data["error_message"] == "schema_mismatch: x"
        assert data["latency_ms"] == 2000 and data["attempts"] == 2


class TestMetrics:
    def test_overall_metrics(self, records):
        scores = [
            # fb-001: 3 errors, 2 detected (1 correct fix via judge), 1 false correction
            score_valid(
                records["fb-001"],
                [
                    Correction("une croissant", "un croissant"),
                    Correction("à le comptoir", "à la comptoir"),
                    Correction("je n'aime pas le jus", "je déteste le jus"),
                ],
                85,
                judge={JudgePair(1, 1): (True, False, METHOD_JUDGE)},
                latencies=(1000,),
            ),
            # fb-007: clean, 1 false correction
            score_valid(records["fb-007"], [Correction("Bonjour", "Salut")], 90, latencies=(3000,)),
            # fb-019: invalid feedback, 5 errors missed
            score_conversation(
                records["fb-019"], OUTCOME_INVALID,
                usage(cost=0.03, latencies=(2000, 2000), first_valid=False),
            ),
        ]
        m = compute_metrics(scores)
        assert m["conversations"] == 3 and m["valid_conversations"] == 2
        assert (m["labeled_errors"], m["detected_errors"], m["correctly_fixed_errors"]) == (8, 2, 1)
        assert m["error_recall"] == 0.25
        assert (m["corrections_total"], m["true_corrections"], m["false_corrections"]) == (4, 2, 2)
        assert m["false_corrections_on_clean"] == 1
        assert m["precision"] == 0.5
        assert m["correction_accuracy"] == 0.5
        # |85 - 80| and |90 - 97|
        assert m["grammar_mae"] == 6.0 and m["grammar_mae_n"] == 2
        assert m["schema_valid_first_attempt_rate"] == 0.6667
        assert m["schema_valid_final_rate"] == 0.6667
        assert m["provider_errors"] == 0
        assert m["total_cost_usd"] == 0.05
        assert m["cost_per_conversation_usd"] == round(0.05 / 3, 8)
        assert (m["latency_p50_ms"], m["latency_p95_ms"]) == (3000, 4000)
        assert (m["call_latency_p50_ms"], m["call_latency_p95_ms"]) == (2000, 3000)
        assert m["judge_pairs"] == 1 and m["judge_cost_usd"] == 0.001
        assert m["mean_corrections_per_conversation"] == 2.0

    def test_grammar_mae_example_from_prompt(self, records):
        # labels 80 (fb-001), 80 (fb-002), 97 (fb-007): model 85, 70, 97 -> (5 + 10 + 0) / 3
        scores = [
            score_valid(records["fb-001"], [], 85),
            score_valid(records["fb-002"], [], 70),
            score_valid(records["fb-007"], [], 97),
        ]
        assert compute_metrics(scores)["grammar_mae"] == 5.0

    def test_empty_group_has_none_ratios(self):
        m = compute_metrics([])
        assert m["conversations"] == 0
        for key in ("error_recall", "precision", "correction_accuracy", "grammar_mae",
                    "schema_valid_final_rate", "latency_p50_ms", "cost_per_conversation_usd"):
            assert m[key] is None

    def test_provider_error_without_calls_has_no_latency(self, records):
        score = score_conversation(records["fb-001"], OUTCOME_PROVIDER_ERROR, CallUsage())
        m = compute_metrics([score])
        assert m["provider_errors"] == 1 and m["latency_p50_ms"] is None

    def test_aggregate_by_difficulty(self, records):
        scores = [
            score_valid(records["fb-001"], [Correction("une croissant", "un croissant")], 80),
            score_valid(records["fb-019"], [], 90),
        ]
        metrics = aggregate_metrics(scores)
        assert metrics["overall"]["conversations"] == 2
        assert list(metrics["by_difficulty"]) == list(DIFFICULTY_ORDER)
        assert metrics["by_difficulty"]["beginner"]["error_recall"] == round(1 / 3, 4)
        assert metrics["by_difficulty"]["advanced"]["error_recall"] == 0.0
        assert metrics["by_difficulty"]["intermediate"]["conversations"] == 0
