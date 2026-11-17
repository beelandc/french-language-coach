"""Tests for the feedback eval reports (issue #231)."""

import json
from datetime import datetime, timezone

import pytest

from evals.report import (
    BASE_CAVEATS,
    RUBRIC_CAVEAT,
    SCHEMA_VERSION,
    STATUS_COMPLETED,
    STATUS_STOPPED_SPEND_CAP,
    build_report,
    render_markdown,
    write_reports,
)
from evals.schema import load_dataset
from evals.scoring import CallUsage, aggregate_metrics, score_conversation

START = datetime(2026, 11, 15, 21, 0, 0, tzinfo=timezone.utc)


def metrics_for_one_conversation():
    record = {r.id: r for r in load_dataset()}["fb-001"]
    score = score_conversation(
        record, "invalid_feedback",
        CallUsage(cost_usd=0.0004, latency_ms=1500, call_latencies_ms=[700, 800], attempts=2),
    )
    return aggregate_metrics([score]), score.to_dict()


def make_report(status=STATUS_COMPLETED, validation=None, models=None, **spend_overrides):
    metrics, conversation = metrics_for_one_conversation()
    spend = {
        "total_usd": 0.0123, "feedback_by_config": {"mistral-large": 0.0004},
        "judge_usd": 0.0019, "judge_validation_usd": 0.01, "cap_usd": 5.0,
    }
    spend.update(spend_overrides)
    return build_report(
        run_id="20261115-210000",
        started_at=START,
        finished_at=START,
        status=status,
        git_commit=None,
        dataset={"path": "evals/datasets/feedback_v1.jsonl", "sha256": "ab" * 32,
                 "records_total": 27, "records_selected": ["fb-001"]},
        options={"models": ["mistral-large"], "limit": 1, "ids": None, "max_spend_usd": 5.0,
                 "claude_effort": None, "skip_judge_validation": validation is None},
        judge={"provider": "mistral", "model": "mistral-large-latest",
               "shares_provider_with": ["mistral-large"], "rationale": "Because | reasons."},
        prices=[{"provider": "mistral", "model": "mistral-large-latest", "input_per_mtok": 0.5,
                 "output_per_mtok": 1.5, "cache_read_per_mtok": 0.05, "checked_on": "2026-11-13"}],
        spend=spend,
        judge_validation=validation,
        models=models if models is not None else [
            {"key": "mistral-large", "provider": "mistral", "model": "mistral-large-latest",
             "effort": None, "status": STATUS_COMPLETED, "metrics": metrics,
             "conversations": [conversation]},
            {"key": "claude-opus", "provider": "anthropic", "model": "claude-opus-5-5",
             "effort": "medium", "status": "not_run", "metrics": None, "conversations": []},
        ],
    )


VALIDATION = {
    "path": "evals/datasets/judge_validation_v1.jsonl", "items_total": 2, "complete": True,
    "n": 2, "agreement": 0.5, "addresses_error_agreement": 1.0,
    "correction_acceptable_agreement": 0.5, "judge_errors": 0,
    "by_source_style": {"claude": {"n": 1, "agreement": 1.0}, "mistral": {"n": 1, "agreement": 0.0}},
    "disagreements": [
        {"id": "jv-002", "record_id": "fb-001", "error_index": 0, "source_style": "mistral",
         "candidate": {"original": "une croissant", "corrected": "une croissante", "explanation": ""},
         "hand": {"addresses_error": True, "correction_acceptable": False},
         "judge": {"addresses_error": True, "correction_acceptable": True},
         "judge_reason": "looks fine", "judge_error": None}
    ],
}


def test_build_report_structure():
    report = make_report(validation=VALIDATION)
    assert report["schema_version"] == SCHEMA_VERSION
    assert report["started_at"] == "2026-11-15T21:00:00+00:00"
    assert report["caveats"] == BASE_CAVEATS
    assert set(report) >= {"spend", "judge", "judge_validation", "models", "prices", "dataset"}


def test_partial_and_aborted_caveats():
    models = [{"key": "claude-haiku", "provider": "anthropic", "model": "claude-haiku-5-5",
               "effort": "medium", "status": "aborted_errors", "metrics": None, "conversations": []}]
    report = make_report(status=STATUS_STOPPED_SPEND_CAP, models=models)
    extra = report["caveats"][len(BASE_CAVEATS):]
    assert "partial (status: stopped_spend_cap)" in extra[0]
    assert "claude-haiku" in extra[1]


def test_markdown_sections_and_values():
    md = render_markdown(make_report(validation=VALIDATION))
    for heading in ("# Feedback eval 20261115-210000", "## Results", "## By difficulty",
                    "## Details", "## Spend", "## Judge", "## Prices", "## Caveats"):
        assert heading in md
    assert "**Total spend:** $0.0123 of the $5.0000 cap" in md
    assert "| Feedback: mistral-large | $0.000400 |" in md
    assert "| **Total** | **$0.0123** |" in md
    # invalid feedback: recall 0/3, precision n/a
    assert "| mistral-large (`mistral/mistral-large-latest`) | completed | 0.0% (0/3) | n/a (0) |" in md
    assert "| claude-opus (`anthropic/claude-opus-5-5`, effort medium) | not_run | n/a |" in md
    assert "| mistral-large | beginner | 1 |" in md
    assert "Because \\| reasons." not in md  # rationale is prose, not a table cell
    assert "Because | reasons." in md
    assert "**Agreement with hand verdicts: 50.0%** on 2 items" in md
    assert "| jv-002 | une croissant → une croissante | True / False | True / True | looks fine |" in md
    assert "| `mistral/mistral-large-latest` | 0.5 / 1.5 / 0.05 | 2026-11-13 |" in md


def test_markdown_without_validation():
    md = render_markdown(make_report(validation={"skipped": True, "reason": "--skip-judge-validation"}))
    assert "Judge validation: **not measured** (--skip-judge-validation)." in md
    md_none = render_markdown(make_report(validation=None))
    assert "Judge validation: **not measured** (not run)." in md_none


def test_markdown_without_disagreements():
    validation = dict(VALIDATION, disagreements=[], agreement=1.0)
    assert "Disagreements:" not in render_markdown(make_report(validation=validation))


@pytest.mark.parametrize("value, expected", [(None, "n/a"), (0, "$0.0000"), (0.5, "$0.5000")])
def test_usd_format(value, expected):
    from evals.report import _usd

    assert _usd(value) == expected


def test_write_reports_creates_dir_and_avoids_collisions(tmp_path):
    report = make_report()
    out = tmp_path / "nested" / "results"
    first = write_reports(report, out)
    second = write_reports(report, out)
    assert [p.name for p in first] == ["feedback_eval_20261115-210000.json", "feedback_eval_20261115-210000.md"]
    assert [p.name for p in second] == [
        "feedback_eval_20261115-210000-2.json", "feedback_eval_20261115-210000-2.md",
    ]
    assert json.loads(first[0].read_text(encoding="utf-8"))["spend"]["total_usd"] == 0.0123
    assert first[1].read_text(encoding="utf-8").startswith("# Feedback eval")


def test_schema_version_2_for_rubric_fields():
    # Issue #269 added the rubric block, options.rubric and a per-model rubric flag
    assert SCHEMA_VERSION == 2


def test_report_without_rubric_says_not_used():
    report = make_report(validation=VALIDATION)
    assert report["rubric"] is None
    assert RUBRIC_CAVEAT not in report["caveats"]
    assert "- **Feedback rubric:** not used" in render_markdown(report)


def test_report_with_rubric_arms():
    metrics, conversation = metrics_for_one_conversation()
    models = [
        {"key": "claude-haiku", "provider": "anthropic", "model": "claude-haiku-5-5",
         "effort": "medium", "rubric": True, "status": STATUS_COMPLETED, "metrics": metrics,
         "conversations": [conversation]},
        {"key": "claude-haiku:no-rubric", "provider": "anthropic", "model": "claude-haiku-5-5",
         "effort": "medium", "rubric": False, "status": STATUS_COMPLETED, "metrics": metrics,
         "conversations": [conversation]},
    ]
    report = make_report(validation=VALIDATION, models=models)
    report = {**report, "rubric": {"path": "data/feedback_rubric.md", "sha256": "cd" * 32}}
    md = render_markdown(report)
    assert "- **Feedback rubric:** `data/feedback_rubric.md` (sha256 `cdcdcdcdcdcd…`)" in md
    assert "claude-haiku (`anthropic/claude-haiku-5-5`, effort medium, rubric on)" in md
    assert "claude-haiku:no-rubric (`anthropic/claude-haiku-5-5`, effort medium, rubric off)" in md


def test_rubric_caveat_added_when_rubric_used():
    from evals.report import build_caveats

    caveats = build_caveats(STATUS_COMPLETED, [], {"path": "data/feedback_rubric.md", "sha256": "x"})
    assert caveats[-1] == RUBRIC_CAVEAT
