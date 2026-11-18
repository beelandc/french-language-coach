"""Tests for the study-plan eval (issue #270). No API calls: the service is faked."""

import json

import pytest

from config import Settings
from evals import run_study_plan_eval as ev
from evals.schema import load_dataset
from routers.grammar import get_lessons
from schemas.study_plan import StudyPlanDraft
from services.llm.base import AgentRunError, AgentRunResult
from services.llm.study_coach import StudyCoachOutcome
from tests.llm_fakes import study_plan_input

LESSONS = set(get_lessons())


@pytest.fixture(scope="module")
def records():
    return {r.id: r for r in load_dataset()}


def settings() -> Settings:
    return Settings(_env_file=None, ANTHROPIC_API_KEY="a", MISTRAL_API_KEY="m")


class TestTargets:
    def test_committed_targets_are_consistent(self, records):
        targets = ev.load_targets()
        assert len(targets) == 10
        assert ev.check_targets(targets, records, LESSONS) == []

    def test_targets_cover_every_scored_category_in_the_selection(self, records):
        targets = ev.load_targets()
        covered = {
            records[rid].errors[t.error_index].category.value
            for rid, ts in targets.items() for t in ts
        }
        assert covered >= {
            "gender", "agreement", "conjugation", "tense_mood", "auxiliary", "article",
            "contraction", "preposition", "pronoun", "word_order",
        }

    def test_check_targets_reports_problems(self, records):
        bad = {
            "fb-999": [],
            "fb-008": [
                ev.ErrorTarget(1, ["articles"]),  # lexical: not scored
                ev.ErrorTarget(2, ["nope"]),
                ev.ErrorTarget(2, []),
                ev.ErrorTarget(9, ["articles"]),
            ],
        }
        problems = ev.check_targets(bad, records, LESSONS)
        assert "fb-999: not in the dataset" in problems
        assert "fb-008 error 1: lexical errors aren't scored" in problems
        assert "fb-008 error 2: unknown lesson 'nope'" in problems
        assert "fb-008 error 2: listed twice" in problems
        assert "fb-008 error 2: no lessons" in problems
        assert "fb-008 error 9: no such error" in problems
        assert "fb-008 error 0: scored error without a target" in problems


class TestInputsAndScoring:
    def test_synthesized_feedback(self, records):
        feedback = ev.synthesize_feedback(records["fb-001"])
        assert feedback["focus_area"] == ev.FOCUS_AREA_FR["contraction"]
        assert feedback["grammar_score"] == records["fb-001"].grammar_score
        assert feedback["example_corrections"][0] == {
            "original": "une croissant", "corrected": "un croissant",
            "explanation": "croissant is masculine",
        }

    def test_synthesized_feedback_for_clean_record(self, records):
        clean = next(r for r in records.values() if not r.errors)
        assert ev.synthesize_feedback(clean)["focus_area"] == "la fluidité"

    def test_score_plan(self):
        targets = [
            ev.ErrorTarget(0, ["gender-agreement", "articles"]),
            ev.ErrorTarget(1, ["articles"]),
            ev.ErrorTarget(2, ["negation"]),
        ]
        assert ev.score_plan(["articles", "negation"], targets, LESSONS) == (3, [], [])
        assert ev.score_plan(["articles", "made-up"], targets, LESSONS) == (2, [2], ["made-up"])

    def test_aggregate_and_thresholds(self):
        ok = ev.RecordResult("a", "beginner", "ok", 3, covered_errors=3, cited_lessons=["x", "y"],
                             cost_usd=0.1, latency_ms=100, iterations=4, cards=3)
        partial = ev.RecordResult("b", "beginner", "ok", 2, covered_errors=1, cited_lessons=["z"],
                                  invalid_lessons=["z"], cost_usd=0.2, latency_ms=300,
                                  iterations=6, cards=1)
        failed = ev.RecordResult("c", "advanced", "failed", 3, cost_usd=0.05, error="iteration_cap: x")
        metrics = ev.aggregate([ok, partial, failed])
        assert metrics["lesson_ids_valid"] == pytest.approx(2 / 3)
        assert metrics["grammar_errors_covered"] == pytest.approx(4 / 8)
        assert (metrics["completed"], metrics["failed"]) == (2, 1)
        assert metrics["total_cost_usd"] == pytest.approx(0.35)
        assert (metrics["mean_latency_ms"], metrics["max_latency_ms"]) == (200, 300)
        assert metrics["passed"] == {"lesson_ids_valid": False, "grammar_errors_covered": False}

    def test_aggregate_empty(self):
        metrics = ev.aggregate([])
        assert metrics["lesson_ids_valid"] is None
        assert metrics["passed"] == {"lesson_ids_valid": False, "grammar_errors_covered": False}

    def test_estimate_cost(self):
        assert ev.estimate_cost("claude-sonnet-5-5", 10) == pytest.approx(
            (6000 * 2 + 600 * 10) / 1e6 * 6 * 10, abs=1e-4
        )
        assert ev.estimate_cost("unpriced-model", 1) is None


class FakeService:
    """Returns a plan per record, or raises, without calling an API."""

    def __init__(self, plans):
        self.plans = list(plans)
        self.calls = []

    async def get_study_plan(self, messages, feedback, difficulty):
        self.calls.append((messages, feedback, difficulty))
        plan = self.plans.pop(0)
        if isinstance(plan, Exception):
            raise plan
        usage = AgentRunResult(text="", input_tokens=5000, output_tokens=500, iterations=3)
        return StudyCoachOutcome(plan=plan, result=usage, model="claude-sonnet-5-5", latency_ms=1234)


def draft(*lessons):
    args = study_plan_input()
    args["items"] = [{**args["items"][0], "lesson_id": lesson} for lesson in lessons]
    return StudyPlanDraft.model_validate(args)


class TestRunEval:
    @pytest.mark.asyncio
    async def test_dry_run_makes_no_calls(self):
        lines = []
        report = await ev.run_eval(
            ev.Options(dry_run=True, limit=2), settings=settings(),
            service_factory=lambda s: pytest.fail("no service in a dry run"), out=lines.append,
        )
        assert report is None
        assert lines[0].startswith("fb-001 (beginner): 3 targeted errors")
        assert "2 runs on claude-sonnet-5-5. Estimated cost: $" in lines[-1]

    @pytest.mark.asyncio
    async def test_run_scores_writes_reports_and_records_failures(self, tmp_path):
        failure = AgentRunError("iteration_cap", "no valid plan", AgentRunResult(
            text="", input_tokens=9000, output_tokens=900, iterations=8))
        service = FakeService([draft("articles", "negation"), failure])
        lines = []

        report = await ev.run_eval(
            ev.Options(limit=2, output_dir=tmp_path, model="claude-sonnet-5-5"),
            settings=settings(), service_factory=lambda s: service, out=lines.append,
        )

        first, second = report["records"]
        assert (first["id"], first["status"], first["covered_errors"]) == ("fb-001", "ok", 3)
        assert first["cost_usd"] == pytest.approx((5000 * 2 + 500 * 10) / 1e6)
        assert first["latency_ms"] == 1234
        assert (second["status"], second["covered_errors"], second["iterations"]) == ("failed", 0, 8)
        assert second["error"].startswith("iteration_cap")
        assert second["uncovered"] == [0, 1, 2]
        assert report["metrics"]["grammar_errors_covered"] == pytest.approx(3 / 6)
        assert report["metrics"]["lesson_ids_valid"] == 1.0
        # the agent got the record's transcript and the synthesized feedback
        messages, feedback, difficulty = service.calls[0]
        assert messages[0]["role"] == "assistant"
        assert feedback["example_corrections"][1]["original"] == "à le comptoir"
        assert difficulty == "beginner"
        # reports written
        json_files = list(tmp_path.glob("study_plan_eval_*.json"))
        md_files = list(tmp_path.glob("study_plan_eval_*.md"))
        assert len(json_files) == len(md_files) == 1
        assert json.loads(json_files[0].read_text())["metrics"]["covered_errors"] == 3
        markdown = md_files[0].read_text()
        assert "| fb-001 | beginner | ok | articles, negation | 3/3 |" in markdown
        assert "failed: iteration_cap" in markdown
        assert "FAIL" in markdown
        assert lines[-1].startswith("Wrote ")

    @pytest.mark.asyncio
    async def test_bad_targets_file_is_rejected(self, tmp_path):
        bad = tmp_path / "targets.json"
        bad.write_text(json.dumps({"version": 1, "records": [{"id": "fb-999", "targets": []}]}))
        with pytest.raises(ValueError, match="fb-999: not in the dataset"):
            await ev.run_eval(ev.Options(dry_run=True, targets=bad), settings=settings(), out=lambda _: None)


class TestParseArgs:
    def test_defaults_and_flags(self):
        assert ev.parse_args([]) == ev.Options()
        options = ev.parse_args(["--dry-run", "--model", "claude-haiku-5-5", "--limit", "3"])
        assert (options.dry_run, options.model, options.limit) == (True, "claude-haiku-5-5", 3)

    def test_rejects_zero_limit(self):
        with pytest.raises(SystemExit):
            ev.parse_args(["--limit", "0"])
