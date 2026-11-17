"""JSON and Markdown reports for the feedback eval (issue #231).

:func:`build_report` assembles the JSON document; :func:`render_markdown` renders it,
so both files always say the same thing; :func:`write_reports` writes the dated pair
under ``evals/results/``.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from evals.scoring import DIFFICULTY_ORDER

#: 2 (issue #269): adds the top-level ``rubric`` block, ``options.rubric`` and a
#: ``rubric`` flag per model.
SCHEMA_VERSION = 2

#: Default output directory.
RESULTS_DIR = Path(__file__).parent / "results"

STATUS_COMPLETED = "completed"
STATUS_STOPPED_SPEND_CAP = "stopped_spend_cap"
STATUS_INTERRUPTED = "interrupted"

BASE_CAVEATS = [
    "The conversations are synthetic (written to read like typed learner French), not "
    "real learner data.",
    "The conversations, labels and preferred corrections were drafted by a Claude model "
    "and reviewed by one maintainer who self-assesses at about B1; Claude models may "
    "agree more often with labels written in Claude's style. Advanced-level labels carry "
    "the least authority, so read the per-difficulty tables.",
    "The judge-validation verdicts were drafted by Claude Code for review by the "
    "maintainer; see evals/README.md for their review status.",
    "The sample is small (27 conversations at most, 71 labeled errors), so small "
    "differences between models aren't meaningful.",
    "The app's feedback prompt asks for example corrections, not every error, which caps "
    "recall for every model.",
    "Each model ran once; outputs are non-deterministic, so a rerun can differ.",
    "Costs are estimates from data/llm_pricing.json at the checked_on dates listed under "
    "Prices.",
]


RUBRIC_CAVEAT = (
    "The feedback rubric (data/feedback_rubric.md) and the dataset labels were both "
    "drafted by Claude Code from the same taxonomy, so part of any gain from the rubric "
    "may be alignment with the labeler's conventions rather than better feedback."
)


def build_caveats(
    status: str, models: list[dict[str, Any]], rubric: Optional[dict[str, Any]] = None
) -> list[str]:
    """Return the report caveats, adding notes for partial runs and rubric arms."""
    caveats = list(BASE_CAVEATS)
    if rubric:
        caveats.append(RUBRIC_CAVEAT)
    if status != STATUS_COMPLETED:
        caveats.append(
            f"This run is partial (status: {status}). Models with status not_run were "
            "skipped, and a conversation in progress when the run stopped is left out of "
            "the metrics, though its cost is in the total spend."
        )
    aborted = [m["key"] for m in models if m.get("status") == "aborted_errors"]
    if aborted:
        caveats.append(
            f"Stopped after repeated provider errors: {', '.join(aborted)}. Their metrics "
            "cover only the conversations attempted."
        )
    return caveats


def build_report(
    *,
    run_id: str,
    started_at: datetime,
    finished_at: datetime,
    status: str,
    git_commit: Optional[str],
    dataset: dict[str, Any],
    options: dict[str, Any],
    judge: dict[str, Any],
    prices: list[dict[str, Any]],
    spend: dict[str, Any],
    judge_validation: Optional[dict[str, Any]],
    models: list[dict[str, Any]],
    rubric: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Assemble the JSON report document (see the #231 prompt artifact for keys).

    ``rubric`` is the path and SHA-256 of the feedback rubric used by the rubric arms
    (issue #269), or ``None`` when no arm used it.
    """
    return {
        "schema_version": SCHEMA_VERSION,
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "status": status,
        "git_commit": git_commit,
        "dataset": dataset,
        "options": options,
        "judge": judge,
        "prices": prices,
        "spend": spend,
        "judge_validation": judge_validation,
        "rubric": rubric,
        "models": models,
        "caveats": build_caveats(status, models, rubric),
    }


# --- Markdown -------------------------------------------------------------------------


def _cell(value: Any) -> str:
    """Format a table cell: ``n/a`` for None, ``|`` escaped."""
    if value is None:
        return "n/a"
    return str(value).replace("|", "\\|")


def _pct(value: Optional[float]) -> str:
    return "n/a" if value is None else f"{value * 100:.1f}%"


def _usd(value: Optional[float]) -> str:
    if value is None:
        return "n/a"
    return f"${value:.4f}" if value >= 0.01 or value == 0 else f"${value:.6f}"


def _ms(value: Optional[int]) -> str:
    return "n/a" if value is None else f"{value:,}"


def _model_label(model: dict[str, Any]) -> str:
    effort = f", effort {model['effort']}" if model.get("effort") else ""
    if "rubric" in model:
        effort += ", rubric on" if model["rubric"] else ", rubric off"
    return f"{model['key']} (`{model['provider']}/{model['model']}`{effort})"


def _summary_rows(models: list[dict[str, Any]]) -> list[str]:
    rows = [
        "| Model | Status | Recall | Precision (false) | Correction accuracy | "
        "Grammar MAE (n) | Schema valid 1st / final | Cost / conversation | "
        "p50 / p95 latency (ms) |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for model in models:
        m = (model.get("metrics") or {}).get("overall")
        if not m:
            rows.append(f"| {_cell(_model_label(model))} | {model['status']} |" + " n/a |" * 7)
            continue
        rows.append(
            "| "
            + " | ".join(
                [
                    _cell(_model_label(model)),
                    model["status"],
                    f"{_pct(m['error_recall'])} ({m['detected_errors']}/{m['labeled_errors']})",
                    f"{_pct(m['precision'])} ({m['false_corrections']})",
                    _pct(m["correction_accuracy"]),
                    f"{_cell(m['grammar_mae'])} ({m['grammar_mae_n']})",
                    f"{_pct(m['schema_valid_first_attempt_rate'])} / "
                    f"{_pct(m['schema_valid_final_rate'])}",
                    _usd(m["cost_per_conversation_usd"]),
                    f"{_ms(m['latency_p50_ms'])} / {_ms(m['latency_p95_ms'])}",
                ]
            )
            + " |"
        )
    return rows


def _difficulty_rows(models: list[dict[str, Any]]) -> list[str]:
    rows = [
        "| Model | Level | Conversations | Recall | Precision (false) | Correction accuracy "
        "| Grammar MAE (n) |",
        "|---|---|---|---|---|---|---|",
    ]
    for model in models:
        by_level = (model.get("metrics") or {}).get("by_difficulty") or {}
        for level in DIFFICULTY_ORDER:
            m = by_level.get(level)
            if not m or not m["conversations"]:
                continue
            rows.append(
                f"| {_cell(model['key'])} | {level} | {m['conversations']} | "
                f"{_pct(m['error_recall'])} ({m['detected_errors']}/{m['labeled_errors']}) | "
                f"{_pct(m['precision'])} ({m['false_corrections']}) | "
                f"{_pct(m['correction_accuracy'])} | "
                f"{_cell(m['grammar_mae'])} ({m['grammar_mae_n']}) |"
            )
    return rows


def _detail_rows(models: list[dict[str, Any]]) -> list[str]:
    rows = [
        "| Model | False on clean | No-op corrections | Corrections / conversation | "
        "Provider errors | Call p50 / p95 (ms) | Judge pairs (errors) | Feedback cost |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for model in models:
        m = (model.get("metrics") or {}).get("overall")
        if not m:
            continue
        rows.append(
            f"| {_cell(model['key'])} | {m['false_corrections_on_clean']} | "
            f"{m['no_op_corrections']} | {_cell(m['mean_corrections_per_conversation'])} | "
            f"{m['provider_errors']} | {_ms(m['call_latency_p50_ms'])} / "
            f"{_ms(m['call_latency_p95_ms'])} | {m['judge_pairs']} ({m['judge_errors']}) | "
            f"{_usd(m['total_cost_usd'])} |"
        )
    return rows


def _judge_section(report: dict[str, Any]) -> list[str]:
    judge = report["judge"]
    lines = [
        "## Judge",
        "",
        f"Judge: `{judge['provider']}/{judge['model']}`.",
        "",
        judge["rationale"],
        "",
    ]
    validation = report.get("judge_validation")
    if not validation or validation.get("skipped"):
        reason = (validation or {}).get("reason", "not run")
        lines += [f"Judge validation: **not measured** ({reason}).", ""]
        return lines
    lines += [
        f"**Agreement with hand verdicts: {_pct(validation['agreement'])}** on "
        f"{validation['n']} items (`{validation['path']}`); addresses-error "
        f"{_pct(validation['addresses_error_agreement'])}, correction-acceptable "
        f"{_pct(validation['correction_acceptable_agreement'])}, judge errors "
        f"{validation['judge_errors']}.",
        "",
        "| Correction style | Items | Agreement |",
        "|---|---|---|",
    ]
    for style, group in validation["by_source_style"].items():
        lines.append(f"| {style} | {group['n']} | {_pct(group['agreement'])} |")
    lines.append("")
    if validation["disagreements"]:
        lines += [
            "Disagreements:",
            "",
            "| Item | Correction | Hand (addresses / acceptable) | Judge | Judge reason |",
            "|---|---|---|---|---|",
        ]
        for d in validation["disagreements"]:
            hand, got = d["hand"], d["judge"]
            lines.append(
                f"| {d['id']} | {_cell(d['candidate']['original'])} → "
                f"{_cell(d['candidate']['corrected'])} | "
                f"{hand['addresses_error']} / {hand['correction_acceptable']} | "
                f"{got['addresses_error']} / {got['correction_acceptable']} | "
                f"{_cell(d['judge_error'] or d['judge_reason'])} |"
            )
        lines.append("")
    return lines


def _rubric_line(rubric: Optional[dict[str, Any]]) -> str:
    if not rubric:
        return "not used"
    return f"`{rubric['path']}` (sha256 `{rubric['sha256'][:12]}…`)"


def render_markdown(report: dict[str, Any]) -> str:
    """Render a report document as Markdown."""
    dataset, options, spend = report["dataset"], report["options"], report["spend"]
    models = report["models"]
    lines = [
        f"# Feedback eval {report['run_id']}",
        "",
        f"- **Status:** {report['status']}",
        f"- **Started / finished (UTC):** {report['started_at']} / {report['finished_at']}",
        f"- **Git commit:** {_cell(report['git_commit'])}",
        f"- **Dataset:** `{dataset['path']}` (sha256 `{dataset['sha256'][:12]}…`), "
        f"{len(dataset['records_selected'])} of {dataset['records_total']} conversations",
        f"- **Options:** limit={_cell(options['limit'])}, ids={_cell(options['ids'])}, "
        f"spend cap {_usd(options['max_spend_usd'])}, "
        f"Claude effort override={_cell(options['claude_effort'])}",
        f"- **Feedback rubric:** {_rubric_line(report.get('rubric'))}",
        f"- **Total spend:** {_usd(spend['total_usd'])} of the {_usd(spend['cap_usd'])} cap",
        "",
        "## Results",
        "",
        *_summary_rows(models),
        "",
        "Recall counts every attempted conversation (invalid feedback misses all its "
        "errors). Precision, grammar MAE and corrections per conversation use valid "
        "feedback only. Correction accuracy is over detected errors. Latency is per "
        "conversation, retries included.",
        "",
        "## By difficulty",
        "",
        *_difficulty_rows(models),
        "",
        "## Details",
        "",
        *_detail_rows(models),
        "",
        "## Spend",
        "",
        "| Component | USD |",
        "|---|---|",
    ]
    for key, value in spend["feedback_by_config"].items():
        lines.append(f"| Feedback: {key} | {_usd(value)} |")
    lines += [
        f"| Judge (matching) | {_usd(spend['judge_usd'])} |",
        f"| Judge (validation) | {_usd(spend['judge_validation_usd'])} |",
        f"| **Total** | **{_usd(spend['total_usd'])}** |",
        "",
        *_judge_section(report),
        "## Prices",
        "",
        "| Model | Input / output / cache read (USD per Mtok) | Checked on |",
        "|---|---|---|",
    ]
    for price in report["prices"]:
        lines.append(
            f"| `{price['provider']}/{price['model']}` | {price['input_per_mtok']} / "
            f"{price['output_per_mtok']} / {price['cache_read_per_mtok']} | "
            f"{price['checked_on']} |"
        )
    lines += ["", "## Caveats", ""]
    lines += [f"- {caveat}" for caveat in report["caveats"]]
    return "\n".join(lines) + "\n"


def write_reports(report: dict[str, Any], output_dir: Path | str) -> tuple[Path, Path]:
    """Write ``feedback_eval_<run_id>.json`` and ``.md``, creating the directory.

    On a name collision, ``-2``, ``-3``, … is appended to both files.

    Returns:
        ``(json_path, markdown_path)``.
    """
    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)
    stem = f"feedback_eval_{report['run_id']}"
    candidate, suffix = stem, 2
    while (directory / f"{candidate}.json").exists() or (directory / f"{candidate}.md").exists():
        candidate = f"{stem}-{suffix}"
        suffix += 1
    json_path = directory / f"{candidate}.json"
    md_path = directory / f"{candidate}.md"
    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    md_path.write_text(render_markdown(report), encoding="utf-8")
    return json_path, md_path
