"""Feedback eval harness: compare models on accuracy, cost and latency (issue #231).

Runs each selected model configuration over the labeled feedback dataset through the
app's provider layer (``LLMService.get_feedback``: same prompt, strict validation and
single retry as the app), matches the corrections to the labeled errors (deterministic
pass, then an LLM judge), checks the judge against hand verdicts, and writes a dated
JSON and Markdown report under ``evals/results/``.

It makes real, paid API calls, so it is never run in CI. Run it from the repo root::

    python3 -m evals.run_feedback_eval --dry-run
    python3 -m evals.run_feedback_eval --limit 3
    python3 -m evals.run_feedback_eval --models all --max-spend-usd 8

Calls are recorded in an in-memory database, never in the app's ``french_coach.db``.
See ``evals/README.md`` for the flags, metric definitions and the judge choice.
"""

import sys
from pathlib import Path

# Allow `python3 evals/run_feedback_eval.py` as well as `python3 -m evals.run_feedback_eval`:
# the imports below need the repo root on sys.path.
if __package__ in (None, ""):  # pragma: no cover
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import asyncio
import functools
import hashlib
import math
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool

import models.llm_call  # registers the llm_calls table on Base
from config import Settings
from database import Base
from evals.judge import (
    JUDGE_SYSTEM_PROMPT,
    JUDGE_VALIDATION_PATH,
    VALIDATION_SESSION_BASE,
    Judge,
    ValidationOutcome,
    compute_agreement,
    dump_jsonl,
    judge_rationale,
    load_judge_validation,
    run_judge_validation,
    sample_record,
)
from evals.matching import Correction, JudgePair, MatchDecision, match_deterministic
from evals.report import (
    RESULTS_DIR,
    STATUS_COMPLETED,
    STATUS_INTERRUPTED,
    STATUS_STOPPED_SPEND_CAP,
    build_report,
    write_reports,
)
from evals.schema import DATASET_PATH, DatasetError, FeedbackEvalRecord, load_dataset
from evals.scoring import (
    DIFFICULTY_ORDER,
    OUTCOME_INVALID,
    OUTCOME_PROVIDER_ERROR,
    OUTCOME_VALID,
    CallUsage,
    ConversationScore,
    aggregate_metrics,
    score_conversation,
)
from models.llm_call import STATUS_SUCCESS, LLMCall
from services.llm.anthropic_provider import DEFAULT_EFFORT
from services.llm.base import (
    FEATURE_CHAT,
    FEATURE_FEEDBACK,
    FEEDBACK_PROMPT,
    FeedbackValidationError,
    LLMProvider,
    build_transcript,
)
from services.llm.pricing import estimate_cost_usd, load_price_table
from services.llm.service import LLMService

REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class EvalConfig:
    """A model configuration under test."""

    key: str
    provider: str
    model: str


EVAL_CONFIGS: dict[str, EvalConfig] = {
    "mistral-large": EvalConfig("mistral-large", "mistral", "mistral-large-latest"),
    "claude-sonnet": EvalConfig("claude-sonnet", "anthropic", "claude-sonnet-5-5"),
    "claude-haiku": EvalConfig("claude-haiku", "anthropic", "claude-haiku-5-5"),
    "claude-opus": EvalConfig("claude-opus", "anthropic", "claude-opus-5-5"),
}
DEFAULT_CONFIG_KEYS = ("mistral-large", "claude-sonnet", "claude-haiku")
DEFAULT_JUDGE = ("mistral", "mistral-large-latest")
DEFAULT_MAX_SPEND_USD = 5.00
CLAUDE_EFFORTS = ("low", "medium", "high", "xhigh", "max")

#: Session ids: config ``i`` (1-based) uses ``i * SESSION_STRIDE + record ordinal``.
SESSION_STRIDE = 1000
#: A config stops after this many provider errors in a row (bad key, outage).
MAX_CONSECUTIVE_PROVIDER_ERRORS = 3
#: The run refuses a validation set smaller than this (AC: at least 10 items).
MIN_VALIDATION_ITEMS = 10
#: A-priori projections, before any call has been observed.
CHARS_PER_TOKEN = 3
FEEDBACK_OUTPUT_ALLOWANCE = 8000
JUDGE_OUTPUT_ALLOWANCE = 1000
JUDGE_OVERHEAD_CHARS = 600

EXIT_OK = 0
EXIT_ERROR = 1
EXIT_SPEND_CAP = 2
EXIT_INTERRUPTED = 130

MODEL_NOT_RUN = "not_run"
MODEL_RUNNING = "running"
MODEL_ABORTED = "aborted_errors"

SettingsFactory = Callable[[str, str, Optional[str]], Settings]


class PreflightError(Exception):
    """The run can't start (bad selection, unpriced model, missing key, bad data)."""


class SpendCapReached(Exception):
    """The next call would take the run over its spend cap."""

    #: Tells the judge never to swallow this exception.
    stops_run = True


@dataclass
class RunOptions:
    """Parsed command-line options."""

    models: list[str] = field(default_factory=lambda: list(DEFAULT_CONFIG_KEYS))
    limit: Optional[int] = None
    ids: Optional[list[str]] = None
    max_spend_usd: float = DEFAULT_MAX_SPEND_USD
    dry_run: bool = False
    judge_provider: str = DEFAULT_JUDGE[0]
    judge_model: str = DEFAULT_JUDGE[1]
    skip_judge_validation: bool = False
    claude_effort: Optional[str] = None
    dataset: Path = DATASET_PATH
    judge_validation: Path = JUDGE_VALIDATION_PATH
    output_dir: Path = RESULTS_DIR
    export_judge_sample: int = 0


@dataclass
class RunResult:
    """What a run produced."""

    status: str
    exit_code: int
    estimate_usd: float = 0.0
    json_path: Optional[Path] = None
    md_path: Optional[Path] = None
    sample_path: Optional[Path] = None
    report: Optional[dict[str, Any]] = None


@dataclass
class ModelRun:
    """Progress of one configuration."""

    config: EvalConfig
    effort: Optional[str]
    status: str = MODEL_NOT_RUN
    scores: list[ConversationScore] = field(default_factory=list)


# --- Arguments and selection ----------------------------------------------------------


def _positive_int(value: str) -> int:
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("must be at least 1")
    return number


def _non_negative_int(value: str) -> int:
    number = int(value)
    if number < 0:
        raise argparse.ArgumentTypeError("must be 0 or more")
    return number


def _positive_float(value: str) -> float:
    number = float(value)
    if not number > 0:
        raise argparse.ArgumentTypeError("must be greater than 0")
    return number


def _model_keys(value: str) -> list[str]:
    if value.strip() == "all":
        return list(EVAL_CONFIGS)
    keys = [key.strip() for key in value.split(",") if key.strip()]
    unknown = [key for key in keys if key not in EVAL_CONFIGS]
    if unknown or not keys:
        raise argparse.ArgumentTypeError(
            f"unknown model key(s) {unknown or value!r}; choose from "
            f"{', '.join(EVAL_CONFIGS)} or 'all'"
        )
    return list(dict.fromkeys(keys))


def _id_list(value: str) -> list[str]:
    ids = [item.strip() for item in value.split(",") if item.strip()]
    if not ids:
        raise argparse.ArgumentTypeError("no ids given")
    return ids


def parse_args(argv: Optional[list[str]] = None) -> RunOptions:
    """Parse command-line arguments into :class:`RunOptions`."""
    parser = argparse.ArgumentParser(
        prog="python3 -m evals.run_feedback_eval",
        description="Compare feedback models on the labeled dataset (paid API calls).",
    )
    parser.add_argument(
        "--models",
        type=_model_keys,
        default=list(DEFAULT_CONFIG_KEYS),
        help=f"comma-separated keys from {', '.join(EVAL_CONFIGS)}, or 'all' "
        f"(default: {','.join(DEFAULT_CONFIG_KEYS)})",
    )
    parser.add_argument(
        "--limit", type=_positive_int, help="at most N conversations per model, "
        "taken in turn from each difficulty level"
    )
    parser.add_argument("--ids", type=_id_list, help="comma-separated record ids")
    parser.add_argument(
        "--max-spend-usd", type=_positive_float, default=DEFAULT_MAX_SPEND_USD,
        help=f"spend cap for the whole run (default: {DEFAULT_MAX_SPEND_USD:.2f})",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="show the plan and an estimate; no calls"
    )
    parser.add_argument("--judge-provider", choices=("mistral", "anthropic"), default=DEFAULT_JUDGE[0])
    parser.add_argument("--judge-model", default=DEFAULT_JUDGE[1])
    parser.add_argument("--skip-judge-validation", action="store_true")
    parser.add_argument("--claude-effort", choices=CLAUDE_EFFORTS)
    parser.add_argument("--dataset", type=Path, default=DATASET_PATH)
    parser.add_argument("--judge-validation", type=Path, default=JUDGE_VALIDATION_PATH)
    parser.add_argument("--output-dir", type=Path, default=RESULTS_DIR)
    parser.add_argument(
        "--export-judge-sample", type=_non_negative_int, default=0,
        help="also write up to N judge-decided pairs for hand review",
    )
    args = parser.parse_args(argv)
    return RunOptions(
        models=args.models,
        limit=args.limit,
        ids=args.ids,
        max_spend_usd=args.max_spend_usd,
        dry_run=args.dry_run,
        judge_provider=args.judge_provider,
        judge_model=args.judge_model,
        skip_judge_validation=args.skip_judge_validation,
        claude_effort=args.claude_effort,
        dataset=args.dataset,
        judge_validation=args.judge_validation,
        output_dir=args.output_dir,
        export_judge_sample=args.export_judge_sample,
    )


def select_records(
    records: list[FeedbackEvalRecord],
    ids: Optional[list[str]] = None,
    limit: Optional[int] = None,
) -> list[FeedbackEvalRecord]:
    """Apply ``--ids`` (file order kept), then ``--limit`` round-robin by difficulty.

    Raises:
        PreflightError: An id isn't in the dataset, or nothing is selected.
    """
    selected = records
    if ids:
        known = {record.id for record in records}
        unknown = [record_id for record_id in ids if record_id not in known]
        if unknown:
            raise PreflightError(f"unknown record id(s): {', '.join(unknown)}")
        wanted = set(ids)
        selected = [record for record in records if record.id in wanted]
    if limit is not None and limit < len(selected):
        queues = [[r for r in selected if r.difficulty == level] for level in DIFFICULTY_ORDER]
        queues.append([r for r in selected if r.difficulty not in DIFFICULTY_ORDER])
        picked: list[FeedbackEvalRecord] = []
        while len(picked) < limit:
            for queue in queues:
                if queue and len(picked) < limit:
                    picked.append(queue.pop(0))
        selected = picked
    if not selected:
        raise PreflightError("no conversations selected")
    return list(selected)


# --- Settings, prices and estimates ---------------------------------------------------


def build_settings(provider: str, model: str, claude_effort: Optional[str] = None) -> Settings:
    """Settings routing both features to one provider/model (keys come from ``.env``)."""
    return Settings(
        _env_file=REPO_ROOT / ".env",
        FEEDBACK_PROVIDER=provider,
        FEEDBACK_MODEL=model,
        CHAT_PROVIDER=provider,
        CHAT_MODEL=model,
        CLAUDE_FEEDBACK_EFFORT=claude_effort,
    )


def settings_error_message(exc: ValidationError) -> str:
    """The validation messages only: ``str(exc)`` would echo inputs, including keys."""
    return "; ".join(error["msg"] for error in exc.errors())


def config_effort(config: EvalConfig, override: Optional[str]) -> Optional[str]:
    """The Claude feedback effort a config runs at (``None`` for Mistral)."""
    if config.provider != "anthropic":
        return None
    return override or DEFAULT_EFFORT[FEATURE_FEEDBACK]


def estimate_feedback_cost(config: EvalConfig, record: FeedbackEvalRecord) -> float:
    """A-priori cost of one feedback call, with a generous output allowance."""
    chars = len(FEEDBACK_PROMPT) + len(build_transcript([m.model_dump() for m in record.messages]))
    cost = estimate_cost_usd(
        config.provider, config.model, math.ceil(chars / CHARS_PER_TOKEN),
        FEEDBACK_OUTPUT_ALLOWANCE, 0,
    )
    return cost or 0.0


def estimate_judge_cost(provider: str, model: str, records: list[FeedbackEvalRecord]) -> float:
    """A-priori cost of one judge call, sized for the longest learner message."""
    longest = max(
        (len(m.content) for r in records for m in r.messages if m.role == "user"), default=0
    )
    chars = len(JUDGE_SYSTEM_PROMPT) + longest + JUDGE_OVERHEAD_CHARS
    cost = estimate_cost_usd(
        provider, model, math.ceil(chars / CHARS_PER_TOKEN), JUDGE_OUTPUT_ALLOWANCE, 0
    )
    return cost or 0.0


def _price_rows(pairs: list[tuple[str, str]]) -> list[dict[str, Any]]:
    table = load_price_table()
    rows = []
    for provider, model in dict.fromkeys(pairs):
        entry = table[(provider, model)]
        rows.append(
            {
                "provider": provider,
                "model": model,
                "input_per_mtok": entry.input_per_mtok,
                "output_per_mtok": entry.output_per_mtok,
                "cache_read_per_mtok": entry.cache_read_per_mtok,
                "checked_on": entry.checked_on.isoformat(),
            }
        )
    return rows


def _relative(path: Path) -> str:
    try:
        return str(Path(path).resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def _sha256(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _git_commit() -> Optional[str]:
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, capture_output=True,
            text=True, timeout=5, check=True,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return completed.stdout.strip() or None


# --- Recording database and spend -----------------------------------------------------


async def _sum_cost(db: AsyncSession, *conditions: Any) -> float:
    stmt = select(func.coalesce(func.sum(LLMCall.estimated_cost_usd), 0.0)).where(*conditions)
    return float((await db.execute(stmt)).scalar_one())


class SpendTracker:
    """Enforces the spend cap from the costs recorded in the eval database."""

    def __init__(self, db: AsyncSession, cap_usd: float, judge_apriori_usd: float):
        self.db = db
        self.cap_usd = cap_usd
        self.judge_apriori_usd = judge_apriori_usd
        self.max_feedback_usd: dict[str, float] = {}
        self.max_judge_call_usd: Optional[float] = None

    async def spent(self) -> float:
        """Total recorded spend so far."""
        return await _sum_cost(self.db)

    async def check(self, projection_usd: float, what: str) -> None:
        """Raise :class:`SpendCapReached` if ``spent + projection`` exceeds the cap."""
        spent = await self.spent()
        if spent + projection_usd > self.cap_usd:
            raise SpendCapReached(
                f"stopping before {what}: spent ${spent:.4f} + projected "
                f"${projection_usd:.4f} would exceed the ${self.cap_usd:.4f} cap"
            )

    async def before_judge_call(self) -> None:
        """Spend check before a judge call (the judge's ``before_call`` hook)."""
        projection = (
            self.max_judge_call_usd
            if self.max_judge_call_usd is not None
            else self.judge_apriori_usd
        )
        await self.check(projection, "a judge call")

    async def after_judge_call(self) -> None:
        """Track the largest judge call cost (the judge's ``after_call`` hook)."""
        stmt = select(LLMCall.estimated_cost_usd).order_by(LLMCall.id.desc()).limit(1)
        cost = (await self.db.execute(stmt)).scalar_one_or_none() or 0.0
        self.max_judge_call_usd = max(self.max_judge_call_usd or 0.0, cost)


async def read_usage(db: AsyncSession, session_id: int) -> CallUsage:
    """Read one conversation's feedback calls from the eval database."""
    stmt = (
        select(LLMCall)
        .where(LLMCall.session_id == session_id, LLMCall.feature == FEATURE_FEEDBACK)
        .order_by(LLMCall.id)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    latencies = [row.latency_ms for row in rows]
    return CallUsage(
        cost_usd=round(sum(row.estimated_cost_usd or 0.0 for row in rows), 8),
        latency_ms=sum(latencies),
        call_latencies_ms=latencies,
        attempts=len(rows),
        first_attempt_valid=bool(rows) and rows[0].status == STATUS_SUCCESS,
    )


# --- The run --------------------------------------------------------------------------


def _preflight(
    options: RunOptions,
    configs: list[EvalConfig],
    records_by_id: dict[str, FeedbackEvalRecord],
    settings_factory: SettingsFactory,
) -> tuple[dict[str, Settings], Settings, list]:
    """Check prices, keys and the validation set before any call."""
    table = load_price_table()
    pairs = [(c.provider, c.model) for c in configs] + [(options.judge_provider, options.judge_model)]
    unpriced = sorted({f"{p}/{m}" for p, m in pairs if (p, m) not in table})
    if unpriced:
        raise PreflightError(
            f"no price entry for {', '.join(unpriced)} in data/llm_pricing.json; "
            "the spend cap can't be enforced"
        )

    config_settings: dict[str, Settings] = {}
    for config in configs:
        try:
            config_settings[config.key] = settings_factory(
                config.provider, config.model, options.claude_effort
            )
        except ValidationError as exc:
            raise PreflightError(f"{config.key}: {settings_error_message(exc)}") from None
    try:
        judge_settings = settings_factory(options.judge_provider, options.judge_model, None)
    except ValidationError as exc:
        raise PreflightError(f"judge: {settings_error_message(exc)}") from None

    items: list = []
    if not options.skip_judge_validation:
        try:
            items = load_judge_validation(options.judge_validation, records_by_id)
        except (DatasetError, OSError) as exc:
            raise PreflightError(f"judge validation set: {exc}") from None
        if len(items) < MIN_VALIDATION_ITEMS:
            raise PreflightError(
                f"judge validation set has {len(items)} items; at least "
                f"{MIN_VALIDATION_ITEMS} are required"
            )
    return config_settings, judge_settings, items


def _source_style(config: EvalConfig) -> str:
    return "mistral" if config.provider == "mistral" else "claude"


async def _run_config(
    index: int,
    run: ModelRun,
    service: LLMService,
    judge: Judge,
    tracker: SpendTracker,
    db: AsyncSession,
    records: list[FeedbackEvalRecord],
    samples: list[dict[str, Any]],
    out: Callable[[str], None],
) -> None:
    """Evaluate one configuration over the selected records."""
    config = run.config
    run.status = MODEL_RUNNING
    consecutive_errors = 0
    for ordinal, record in enumerate(records, start=1):
        session_id = index * SESSION_STRIDE + ordinal
        projection = tracker.max_feedback_usd.get(config.key) or estimate_feedback_cost(config, record)
        await tracker.check(projection, f"{config.key} {record.id}")

        outcome, feedback, error_message = OUTCOME_VALID, None, None
        try:
            feedback = await service.get_feedback(
                [m.model_dump() for m in record.messages], db=db, session_id=session_id
            )
        except FeedbackValidationError as exc:
            outcome = OUTCOME_INVALID
            error_message = "; ".join(exc.errors) or str(exc)
        except Exception as exc:
            outcome = OUTCOME_PROVIDER_ERROR
            error_message = f"{type(exc).__name__}: {exc}"

        usage = await read_usage(db, session_id)
        tracker.max_feedback_usd[config.key] = max(
            tracker.max_feedback_usd.get(config.key, 0.0), usage.cost_usd
        )

        deterministic = None
        decisions: dict[JudgePair, MatchDecision] = {}
        if feedback is not None:
            corrections = [
                Correction(c["original"], c["corrected"], c.get("explanation", ""))
                for c in feedback["example_corrections"]
            ]
            deterministic = match_deterministic(record, corrections)
            for pair in deterministic.judge_pairs:
                correction = deterministic.corrections[pair.correction_index]
                decision = await judge.judge(record, pair.error_index, correction, session_id)
                decisions[pair] = MatchDecision(
                    pair.error_index, pair.correction_index, decision.addresses_error,
                    decision.correction_acceptable, decision.method,
                    decision.error or decision.reason,
                )
                if not decision.error:
                    samples.append(
                        sample_record(
                            record, pair.error_index, correction, decision,
                            config.key, _source_style(config),
                        )
                    )

        score = score_conversation(
            record,
            outcome,
            usage,
            deterministic=deterministic,
            judge_decisions=decisions,
            model_grammar_score=feedback["grammar_score"] if feedback else None,
            judge_cost_usd=await _sum_cost(
                db, LLMCall.session_id == session_id, LLMCall.feature == FEATURE_CHAT
            ),
            error_message=error_message,
        )
        run.scores.append(score)
        out(
            f"  {config.key} {record.id}: {outcome}, "
            f"{score.detected_errors}/{score.labeled_errors} errors, "
            f"{score.false_corrections} false, ${usage.cost_usd:.4f}, {usage.latency_ms} ms"
        )

        consecutive_errors = consecutive_errors + 1 if outcome == OUTCOME_PROVIDER_ERROR else 0
        if consecutive_errors >= MAX_CONSECUTIVE_PROVIDER_ERRORS:
            run.status = MODEL_ABORTED
            out(f"  {config.key}: {consecutive_errors} provider errors in a row; skipping the rest")
            return
    run.status = STATUS_COMPLETED


def _print_plan(
    out: Callable[[str], None],
    options: RunOptions,
    configs: list[EvalConfig],
    records: list[FeedbackEvalRecord],
    items: list,
    estimate: float,
) -> None:
    out("Feedback eval plan")
    for config in configs:
        effort = config_effort(config, options.claude_effort)
        suffix = f", effort {effort}" if effort else ""
        out(f"  model: {config.key} ({config.provider}/{config.model}{suffix})")
    out(f"  conversations per model: {len(records)} ({', '.join(r.id for r in records)})")
    validation = "skipped" if options.skip_judge_validation else f"{len(items)} validation items"
    out(f"  judge: {options.judge_provider}/{options.judge_model} ({validation})")
    out(f"  spend cap: ${options.max_spend_usd:.4f}; a-priori upper-bound estimate: ${estimate:.4f}")


async def run_eval(
    options: RunOptions,
    *,
    settings_factory: SettingsFactory = build_settings,
    providers: Optional[dict[str, LLMProvider]] = None,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    out: Callable[[str], None] = functools.partial(print, flush=True),
) -> RunResult:
    """Run the eval and write its reports.

    Args:
        options: Run options.
        settings_factory: Builds per-config ``Settings`` (tests pass dummy keys).
        providers: Pre-built providers by id, shared by every service (tests pass fakes).
        now: Clock (UTC), for the run id and timestamps.
        out: Progress output; flushed by default so a log file shows progress as it
            happens when stdout is redirected.

    Raises:
        PreflightError: The run couldn't start; nothing was called or written.
    """
    try:
        records_all = load_dataset(options.dataset)
    except (DatasetError, OSError) as exc:
        raise PreflightError(f"dataset: {exc}") from None
    records = select_records(records_all, options.ids, options.limit)
    if len(records) >= SESSION_STRIDE:
        raise PreflightError(f"at most {SESSION_STRIDE - 1} conversations per run")
    records_by_id = {record.id: record for record in records_all}
    configs = [EVAL_CONFIGS[key] for key in options.models]
    config_settings, judge_settings, items = _preflight(
        options, configs, records_by_id, settings_factory
    )

    judge_apriori = estimate_judge_cost(options.judge_provider, options.judge_model, records_all)
    labeled = sum(len(record.errors) for record in records)
    estimate = round(
        sum(estimate_feedback_cost(c, r) for c in configs for r in records)
        + judge_apriori * (len(items) + labeled * len(configs)),
        8,
    )
    _print_plan(out, options, configs, records, items, estimate)
    if options.dry_run:
        out("Dry run: no calls made, no reports written.")
        return RunResult(status="dry_run", exit_code=EXIT_OK, estimate_usd=estimate)

    started_at = now()
    run_id = started_at.strftime("%Y%m%d-%H%M%S")
    runs = [ModelRun(c, config_effort(c, options.claude_effort)) for c in configs]
    validation_outcomes: list[ValidationOutcome] = []
    samples: list[dict[str, Any]] = []
    status = STATUS_COMPLETED

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=StaticPool)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSession(engine, expire_on_commit=False) as db:
            tracker = SpendTracker(db, options.max_spend_usd, judge_apriori)
            judge = Judge(
                LLMService(settings=judge_settings, providers=providers),
                db,
                before_call=tracker.before_judge_call,
                after_call=tracker.after_judge_call,
            )
            try:
                if items:
                    out(f"Judge validation ({len(items)} items)...")
                    await run_judge_validation(judge, items, records_by_id, validation_outcomes)
                for index, run in enumerate(runs, start=1):
                    out(f"Evaluating {run.config.key}...")
                    service = LLMService(settings=config_settings[run.config.key], providers=providers)
                    await _run_config(index, run, service, judge, tracker, db, records, samples, out)
            except SpendCapReached as exc:
                status = STATUS_STOPPED_SPEND_CAP
                out(str(exc))
            except (KeyboardInterrupt, asyncio.CancelledError):
                status = STATUS_INTERRUPTED
                out("Interrupted; writing a partial report.")
            for run in runs:
                if run.status == MODEL_RUNNING:
                    run.status = status

            report = await _assemble_report(
                db=db,
                options=options,
                run_id=run_id,
                started_at=started_at,
                finished_at=now(),
                status=status,
                configs=configs,
                runs=runs,
                records_all=records_all,
                records=records,
                items=items,
                validation_outcomes=validation_outcomes,
            )
    finally:
        await engine.dispose()

    json_path, md_path = write_reports(report, options.output_dir)
    sample_path = None
    if options.export_judge_sample and samples:
        sample_path = json_path.with_name(f"{json_path.stem}_judge_sample.jsonl")
        sample_path.write_text(dump_jsonl(samples[: options.export_judge_sample]), encoding="utf-8")

    if status == STATUS_STOPPED_SPEND_CAP:
        exit_code = EXIT_SPEND_CAP
    elif status == STATUS_INTERRUPTED:
        exit_code = EXIT_INTERRUPTED
    elif any(run.status == MODEL_ABORTED for run in runs):
        exit_code = EXIT_ERROR
    else:
        exit_code = EXIT_OK
    out(f"Total spend: ${report['spend']['total_usd']:.4f}")
    out(f"Reports: {json_path} and {md_path}")
    return RunResult(
        status=status,
        exit_code=exit_code,
        estimate_usd=estimate,
        json_path=json_path,
        md_path=md_path,
        sample_path=sample_path,
        report=report,
    )


async def _assemble_report(
    *,
    db: AsyncSession,
    options: RunOptions,
    run_id: str,
    started_at: datetime,
    finished_at: datetime,
    status: str,
    configs: list[EvalConfig],
    runs: list[ModelRun],
    records_all: list[FeedbackEvalRecord],
    records: list[FeedbackEvalRecord],
    items: list,
    validation_outcomes: list[ValidationOutcome],
) -> dict[str, Any]:
    """Gather spend from the eval database and build the report document."""
    feedback_by_config = {}
    for index, config in enumerate(configs, start=1):
        feedback_by_config[config.key] = round(
            await _sum_cost(
                db,
                LLMCall.feature == FEATURE_FEEDBACK,
                LLMCall.session_id > index * SESSION_STRIDE,
                LLMCall.session_id < (index + 1) * SESSION_STRIDE,
            ),
            8,
        )
    spend = {
        "total_usd": round(await _sum_cost(db), 8),
        "feedback_by_config": feedback_by_config,
        "judge_usd": round(
            await _sum_cost(
                db, LLMCall.feature == FEATURE_CHAT, LLMCall.session_id < VALIDATION_SESSION_BASE
            ),
            8,
        ),
        "judge_validation_usd": round(
            await _sum_cost(
                db, LLMCall.feature == FEATURE_CHAT, LLMCall.session_id >= VALIDATION_SESSION_BASE
            ),
            8,
        ),
        "cap_usd": options.max_spend_usd,
    }

    if options.skip_judge_validation:
        judge_validation: dict[str, Any] = {"skipped": True, "reason": "--skip-judge-validation"}
    else:
        judge_validation = {
            "path": _relative(options.judge_validation),
            "items_total": len(items),
            "complete": len(validation_outcomes) == len(items),
            **compute_agreement(validation_outcomes),
        }

    shares_with = [c.key for c in configs if c.provider == options.judge_provider]
    return build_report(
        run_id=run_id,
        started_at=started_at,
        finished_at=finished_at,
        status=status,
        git_commit=_git_commit(),
        dataset={
            "path": _relative(options.dataset),
            "sha256": _sha256(options.dataset),
            "records_total": len(records_all),
            "records_selected": [record.id for record in records],
        },
        options={
            "models": [c.key for c in configs],
            "limit": options.limit,
            "ids": options.ids,
            "max_spend_usd": options.max_spend_usd,
            "claude_effort": options.claude_effort,
            "skip_judge_validation": options.skip_judge_validation,
        },
        judge={
            "provider": options.judge_provider,
            "model": options.judge_model,
            "shares_provider_with": shares_with,
            "rationale": judge_rationale(options.judge_provider, options.judge_model, shares_with),
        },
        prices=_price_rows(
            [(c.provider, c.model) for c in configs] + [(options.judge_provider, options.judge_model)]
        ),
        spend=spend,
        judge_validation=judge_validation,
        models=[
            {
                "key": run.config.key,
                "provider": run.config.provider,
                "model": run.config.model,
                "effort": run.effort,
                "status": run.status,
                "metrics": aggregate_metrics(run.scores) if run.scores else None,
                "conversations": [score.to_dict() for score in run.scores],
            }
            for run in runs
        ],
    )


def main(argv: Optional[list[str]] = None) -> int:
    """Command-line entry point; returns the exit code."""
    options = parse_args(argv)
    try:
        result = asyncio.run(run_eval(options))
    except PreflightError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return EXIT_ERROR
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        return EXIT_INTERRUPTED
    return result.exit_code


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
