"""Study-plan eval: do the study coach's plans cite real lessons and target the errors? (issue #270)

For 10 labeled conversations from ``feedback_v1.jsonl`` (listed in
``datasets/study_plan_targets_v1.json``), it builds the feedback the agent would see
from the labels, runs the study coach through the app's provider layer
(``LLMService.get_study_plan``: same prompt, tools, iteration cap and validation as the
app) and scores each plan on two pre-registered measures:

* **lesson_ids_valid**: share of cited lesson ids that exist (target: 1.0).
* **grammar_errors_covered**: share of labeled grammar errors whose plan cites at least
  one of the error's target lessons (target: at least 0.80). Failed runs count as
  covering nothing.

It makes real, paid API calls, so it is never run in CI. Run it from the repo root::

    python3 -m evals.run_study_plan_eval --dry-run
    python3 -m evals.run_study_plan_eval --limit 2
    python3 -m evals.run_study_plan_eval

Nothing is written to the app's database (runs aren't recorded in ``llm_calls``); cost
is computed from each run's summed usage. See ``evals/README.md``.
"""

import sys
from pathlib import Path

# Allow `python3 evals/run_study_plan_eval.py` as well as `python3 -m evals.run_study_plan_eval`.
if __package__ in (None, ""):  # pragma: no cover
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import asyncio
import json
import time
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from config import Settings
from evals.report import RESULTS_DIR
from evals.schema import DATASET_PATH, FeedbackEvalRecord, load_dataset
from routers.grammar import get_lessons
from services.llm.base import LLMProviderError
from services.llm.pricing import estimate_cost_usd
from services.llm.service import LLMService

TARGETS_PATH = Path(__file__).parent / "datasets" / "study_plan_targets_v1.json"

#: Pre-registered pass thresholds (set before the first live run).
THRESHOLDS = {"lesson_ids_valid": 1.0, "grammar_errors_covered": 0.80}

#: Categories with no grammar lesson; they aren't scored for coverage.
UNSCORED_CATEGORIES = frozenset({"register", "anglicism", "lexical", "spelling"})

#: French names used as the synthesized feedback's focus area.
FOCUS_AREA_FR = {
    "gender": "le genre des noms",
    "agreement": "l'accord des adjectifs et des participes",
    "conjugation": "la conjugaison",
    "tense_mood": "les temps et les modes",
    "auxiliary": "le choix de l'auxiliaire (être ou avoir)",
    "article": "les articles",
    "contraction": "les contractions et l'élision",
    "preposition": "les prépositions",
    "pronoun": "les pronoms",
    "negation": "la négation",
    "word_order": "l'ordre des mots",
    "spelling": "l'orthographe",
}

#: Dry-run cost assumption per run: model calls and tokens per call.
ESTIMATE_ITERATIONS = 6
ESTIMATE_INPUT_TOKENS = 6000
ESTIMATE_OUTPUT_TOKENS = 600

PROVIDER = "anthropic"


# --- Targets -----------------------------------------------------------------------------


@dataclass
class ErrorTarget:
    """Lessons that count as targeting one labeled error."""

    error_index: int
    lessons: list[str]


def load_targets(path: Path | str = TARGETS_PATH) -> dict[str, list[ErrorTarget]]:
    """Load the targets file as ``{record_id: [ErrorTarget, ...]}``, in file order."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return {
        record["id"]: [ErrorTarget(t["error_index"], list(t["lessons"])) for t in record["targets"]]
        for record in data["records"]
    }


def check_targets(
    targets: dict[str, list[ErrorTarget]],
    records: dict[str, FeedbackEvalRecord],
    lesson_ids: set[str],
) -> list[str]:
    """Return every problem with the targets file (empty when it's consistent).

    Each record must exist; each target must point at an existing error that is scored
    (not a vocabulary or spelling error), name only real lessons, and appear once; and
    every scored error of a selected record must have a target.
    """
    problems: list[str] = []
    for record_id, record_targets in targets.items():
        record = records.get(record_id)
        if record is None:
            problems.append(f"{record_id}: not in the dataset")
            continue
        seen: set[int] = set()
        for target in record_targets:
            where = f"{record_id} error {target.error_index}"
            if not 0 <= target.error_index < len(record.errors):
                problems.append(f"{where}: no such error")
                continue
            if target.error_index in seen:
                problems.append(f"{where}: listed twice")
            seen.add(target.error_index)
            category = record.errors[target.error_index].category.value
            if category in UNSCORED_CATEGORIES:
                problems.append(f"{where}: {category} errors aren't scored")
            if not target.lessons:
                problems.append(f"{where}: no lessons")
            for lesson in target.lessons:
                if lesson not in lesson_ids:
                    problems.append(f"{where}: unknown lesson '{lesson}'")
        for index, error in enumerate(record.errors):
            if error.category.value not in UNSCORED_CATEGORIES and index not in seen:
                problems.append(f"{record_id} error {index}: scored error without a target")
    return problems


# --- Inputs ------------------------------------------------------------------------------


def synthesize_feedback(record: FeedbackEvalRecord) -> dict[str, Any]:
    """Build the feedback the agent would see from the record's labels.

    Corrections are the labeled errors (explanation = the label's note); the focus area
    is the most frequent scored category; all four scores are the labeled grammar score.
    Using labels instead of a live feedback call isolates the study coach from feedback
    quality.
    """
    categories = [
        e.category.value for e in record.errors if e.category.value not in UNSCORED_CATEGORIES
    ]
    top = Counter(categories).most_common(1)
    focus = FOCUS_AREA_FR[top[0][0]] if top else "la fluidité"
    score = record.grammar_score
    return {
        "grammar_score": score,
        "vocabulary_score": score,
        "fluency_score": score,
        "overall_score": score,
        "strengths": [],
        "focus_area": focus,
        "example_corrections": [
            {"original": e.original, "corrected": e.corrected, "explanation": e.note or ""}
            for e in record.errors
        ],
    }


# --- Scoring -----------------------------------------------------------------------------


@dataclass
class RecordResult:
    """Outcome and scores for one record."""

    id: str
    difficulty: str
    status: str  # "ok" or "failed"
    targeted_errors: int
    covered_errors: int = 0
    cited_lessons: list[str] = field(default_factory=list)
    invalid_lessons: list[str] = field(default_factory=list)
    uncovered: list[int] = field(default_factory=list)
    cards: int = 0
    iterations: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: Optional[float] = None
    latency_ms: int = 0
    error: Optional[str] = None


def score_plan(
    cited: list[str], targets: list[ErrorTarget], lesson_ids: set[str]
) -> tuple[int, list[int], list[str]]:
    """Score one plan.

    Returns:
        ``(covered, uncovered_error_indexes, invalid_cited_ids)``.
    """
    cited_set = set(cited)
    uncovered = [t.error_index for t in targets if not cited_set & set(t.lessons)]
    invalid = [lesson for lesson in cited if lesson not in lesson_ids]
    return len(targets) - len(uncovered), uncovered, invalid


def aggregate(results: list[RecordResult]) -> dict[str, Any]:
    """Overall metrics and pass/fail against :data:`THRESHOLDS`."""
    cited = sum(len(r.cited_lessons) for r in results)
    invalid = sum(len(r.invalid_lessons) for r in results)
    targeted = sum(r.targeted_errors for r in results)
    covered = sum(r.covered_errors for r in results)
    ok = [r for r in results if r.status == "ok"]
    costs = [r.cost_usd for r in results if r.cost_usd is not None]
    latencies = sorted(r.latency_ms for r in ok)
    metrics: dict[str, Any] = {
        "records": len(results),
        "completed": len(ok),
        "failed": len(results) - len(ok),
        "cited_lessons": cited,
        "lesson_ids_valid": (cited - invalid) / cited if cited else None,
        "targeted_errors": targeted,
        "covered_errors": covered,
        "grammar_errors_covered": covered / targeted if targeted else None,
        "total_cost_usd": round(sum(costs), 6) if costs else None,
        "mean_cost_usd": round(sum(costs) / len(costs), 6) if costs else None,
        "mean_latency_ms": round(sum(latencies) / len(latencies)) if latencies else None,
        "max_latency_ms": latencies[-1] if latencies else None,
        "mean_iterations": round(sum(r.iterations for r in ok) / len(ok), 2) if ok else None,
        "mean_cards": round(sum(r.cards for r in ok) / len(ok), 2) if ok else None,
    }
    metrics["passed"] = {
        name: metrics[name] is not None and metrics[name] >= threshold
        for name, threshold in THRESHOLDS.items()
    }
    return metrics


# --- Running -----------------------------------------------------------------------------


def estimate_cost(model: str, runs: int) -> Optional[float]:
    """Rough cost of ``runs`` runs from the dry-run token assumption."""
    per_call = estimate_cost_usd(PROVIDER, model, ESTIMATE_INPUT_TOKENS, ESTIMATE_OUTPUT_TOKENS, 0)
    return None if per_call is None else round(per_call * ESTIMATE_ITERATIONS * runs, 4)


async def run_record(
    service: LLMService,
    record: FeedbackEvalRecord,
    targets: list[ErrorTarget],
    lesson_ids: set[str],
    model: str,
) -> RecordResult:
    """Run the study coach on one record and score the plan. Failures are recorded."""
    result = RecordResult(record.id, record.difficulty, "ok", targeted_errors=len(targets))
    start = time.perf_counter()
    try:
        outcome = await service.get_study_plan(
            [m.model_dump() for m in record.messages],
            synthesize_feedback(record),
            record.difficulty,
        )
    except (LLMProviderError, RuntimeError) as exc:
        result.status = "failed"
        result.error = str(exc) or type(exc).__name__
        result.latency_ms = int(round((time.perf_counter() - start) * 1000))
        usage = getattr(exc, "result", None)
        if usage is not None:
            result.input_tokens, result.output_tokens = usage.input_tokens, usage.output_tokens
            result.iterations = getattr(usage, "iterations", 0)
            result.cost_usd = estimate_cost_usd(
                PROVIDER, model, usage.input_tokens, usage.output_tokens, usage.cache_read_tokens
            )
        result.uncovered = [t.error_index for t in targets]
        return result

    cited = [item.lesson_id for item in outcome.plan.items]
    result.covered_errors, result.uncovered, result.invalid_lessons = score_plan(
        cited, targets, lesson_ids
    )
    usage = outcome.result
    result.cited_lessons = cited
    result.cards = len(outcome.plan.cards)
    result.iterations = usage.iterations
    result.input_tokens, result.output_tokens = usage.input_tokens, usage.output_tokens
    result.cost_usd = estimate_cost_usd(
        PROVIDER, model, usage.input_tokens, usage.output_tokens, usage.cache_read_tokens
    )
    result.latency_ms = outcome.latency_ms
    return result


def select(
    records: list[FeedbackEvalRecord], targets: dict[str, list[ErrorTarget]], limit: Optional[int]
) -> list[FeedbackEvalRecord]:
    """The records named in the targets file, in its order, optionally the first ``limit``."""
    by_id = {r.id: r for r in records}
    chosen = [by_id[record_id] for record_id in targets if record_id in by_id]
    return chosen[:limit] if limit else chosen


def build_report(
    results: list[RecordResult], model: str, settings: Settings, started_at: str
) -> dict[str, Any]:
    """The JSON report document."""
    return {
        "eval": "study_plan",
        "issue": 270,
        "generated_at": started_at,
        "model": model,
        "provider": PROVIDER,
        "effort": settings.CLAUDE_STUDY_COACH_EFFORT or "medium",
        "max_iterations": settings.STUDY_COACH_MAX_ITERATIONS,
        "dataset": "evals/datasets/feedback_v1.jsonl",
        "targets": "evals/datasets/study_plan_targets_v1.json",
        "thresholds": THRESHOLDS,
        "metrics": aggregate(results),
        "records": [asdict(r) for r in results],
    }


def _pct(value: Optional[float]) -> str:
    return "n/a" if value is None else f"{value:.0%}"


def render_markdown(report: dict[str, Any]) -> str:
    """Render the report as Markdown."""
    m = report["metrics"]
    verdict = lambda name: "pass" if m["passed"][name] else "FAIL"  # noqa: E731
    lines = [
        f"# Study-plan eval ({report['generated_at']})",
        "",
        f"Issue #{report['issue']}. Model `{report['model']}` (effort {report['effort']}, "
        f"cap {report['max_iterations']} model calls per run). {m['records']} records, "
        f"{m['completed']} completed, {m['failed']} failed.",
        "",
        "| Measure | Result | Threshold | Verdict |",
        "|---|---|---|---|",
        f"| Cited lesson ids that exist | {_pct(m['lesson_ids_valid'])} "
        f"({m['cited_lessons']} cited) | {_pct(THRESHOLDS['lesson_ids_valid'])} "
        f"| {verdict('lesson_ids_valid')} |",
        f"| Labeled grammar errors covered | {_pct(m['grammar_errors_covered'])} "
        f"({m['covered_errors']}/{m['targeted_errors']}) | "
        f"≥ {_pct(THRESHOLDS['grammar_errors_covered'])} | {verdict('grammar_errors_covered')} |",
        "",
        f"Cost: total ${m['total_cost_usd']}, mean ${m['mean_cost_usd']} per run. "
        f"Latency: mean {m['mean_latency_ms']} ms, max {m['max_latency_ms']} ms. "
        f"Mean model calls per run: {m['mean_iterations']}. Mean cards proposed: {m['mean_cards']}.",
        "",
        "| Record | Level | Status | Lessons cited | Covered | Uncovered errors | Calls | Cost (USD) | Latency (ms) |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in report["records"]:
        status = r["status"] if not r["error"] else f"failed: {r['error'][:60]}"
        lines.append(
            f"| {r['id']} | {r['difficulty']} | {status} | {', '.join(r['cited_lessons']) or '-'} "
            f"| {r['covered_errors']}/{r['targeted_errors']} "
            f"| {', '.join(map(str, r['uncovered'])) or '-'} | {r['iterations']} "
            f"| {r['cost_usd']} | {r['latency_ms']} |"
        )
    lines += [
        "",
        "Feedback given to the agent is synthesized from the labels (corrections = labeled "
        "errors), so these numbers measure the study coach, not feedback quality. Targets "
        "are a judgment call written by the implementing assistant; see the targets file.",
        "",
    ]
    return "\n".join(lines)


def write_report(report: dict[str, Any], output_dir: Path) -> tuple[Path, Path]:
    """Write ``study_plan_eval_<timestamp>.json`` and ``.md``; return both paths."""
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.fromisoformat(report["generated_at"]).strftime("%Y%m%d-%H%M%S")
    json_path = output_dir / f"study_plan_eval_{stamp}.json"
    md_path = output_dir / f"study_plan_eval_{stamp}.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(report), encoding="utf-8")
    return json_path, md_path


@dataclass
class Options:
    """Parsed command-line options."""

    dry_run: bool = False
    model: Optional[str] = None
    limit: Optional[int] = None
    output_dir: Path = RESULTS_DIR
    targets: Path = TARGETS_PATH
    dataset: Path = DATASET_PATH


def parse_args(argv: Optional[list[str]] = None) -> Options:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Study-plan eval (issue #270).")
    parser.add_argument("--dry-run", action="store_true", help="no API calls: list records and estimate cost")
    parser.add_argument("--model", help="Claude model (default: STUDY_COACH_MODEL)")
    parser.add_argument("--limit", type=int, help="run only the first N records")
    parser.add_argument("--output-dir", type=Path, default=RESULTS_DIR)
    parser.add_argument("--targets", type=Path, default=TARGETS_PATH)
    parser.add_argument("--dataset", type=Path, default=DATASET_PATH)
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be at least 1")
    return Options(args.dry_run, args.model, args.limit, args.output_dir, args.targets, args.dataset)


async def run_eval(
    options: Options,
    settings: Optional[Settings] = None,
    service_factory: Callable[[Settings], LLMService] = lambda s: LLMService(settings=s),
    out: Callable[[str], None] = print,
) -> Optional[dict[str, Any]]:
    """Run the eval (or the dry run). Returns the report, or ``None`` for a dry run.

    Raises:
        ValueError: The targets file doesn't match the dataset or the lessons.
    """
    settings = settings or Settings()
    model = options.model or settings.STUDY_COACH_MODEL
    if options.model:
        settings = settings.model_copy(update={"STUDY_COACH_MODEL": model})
    records = load_dataset(options.dataset)
    targets = load_targets(options.targets)
    lesson_ids = set(get_lessons())
    problems = check_targets(targets, {r.id: r for r in records}, lesson_ids)
    if problems:
        raise ValueError("Targets file problems:\n- " + "\n- ".join(problems))
    chosen = select(records, targets, options.limit)

    if options.dry_run:
        for record in chosen:
            out(f"{record.id} ({record.difficulty}): {len(targets[record.id])} targeted errors")
        estimate = estimate_cost(model, len(chosen))
        out(
            f"{len(chosen)} runs on {model}. Estimated cost: ${estimate} "
            f"(assumes {ESTIMATE_ITERATIONS} calls x {ESTIMATE_INPUT_TOKENS} input / "
            f"{ESTIMATE_OUTPUT_TOKENS} output tokens per run)."
        )
        return None

    started_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    service = service_factory(settings)
    results = []
    for record in chosen:
        result = await run_record(service, record, targets[record.id], lesson_ids, model)
        out(
            f"{record.id}: {result.status}, covered {result.covered_errors}/"
            f"{result.targeted_errors}, cost ${result.cost_usd}, {result.latency_ms} ms"
        )
        results.append(result)
    report = build_report(results, model, settings, started_at)
    json_path, md_path = write_report(report, options.output_dir)
    out(f"Wrote {json_path} and {md_path}")
    return report


def main(argv: Optional[list[str]] = None) -> int:  # pragma: no cover
    """CLI entry point."""
    asyncio.run(run_eval(parse_args(argv)))
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
