"""Aggregation, filtering and reporting over ``llm_calls`` (issues #228 and #236).

The metrics router calls into this module so that the eval work (#231, #232) can
reuse the same filters, summaries and model comparison report.
"""

import csv
import io
import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.llm_call import STATUS_ERROR, LLMCall
from schemas.llm_metrics import (
    FeatureReport,
    LLMMetricsGroup,
    LLMMetricsResponse,
    LLMMetricsStats,
    LLMTimeseriesPoint,
    ModelReport,
    ModelReportDeltas,
    ModelReportRow,
    ReportMetadata,
    ReportPriceInfo,
)
from services.llm.pricing import PriceEntry

COST_DECIMALS = 8
MIN_SAMPLE_SIZE = 20
PARTIAL_RANGE_RATIO = 0.5
DEFAULT_BASELINE = "mistral:mistral-large-latest"
REFUSAL_PREFIX = "refusal"
BUCKETS = ("hour", "day")
LATENCY_BASIS = "successful calls"

REPORT_NOTES = [
    "Operational metrics only (latency, errors, tokens, cost). Feedback quality and "
    "accuracy come from the eval harness (#231).",
    "Live traffic is not a controlled comparison: models may have handled different "
    "conversations at different times. Compare within a feature and check each "
    "model's sample size and date range.",
    "Latency and token averages use successful calls only; error rate counts all calls.",
    "Costs are estimates from the price table at the time of each call, not vendor "
    "invoices.",
    "Refusals are detected only for Anthropic models; Mistral does not report them.",
]

ROW_COLUMNS = (
    LLMCall.created_at,
    LLMCall.feature,
    LLMCall.provider,
    LLMCall.model,
    LLMCall.status,
    LLMCall.error_message,
    LLMCall.input_tokens,
    LLMCall.output_tokens,
    LLMCall.cache_read_tokens,
    LLMCall.latency_ms,
    LLMCall.estimated_cost_usd,
)


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MetricsFilters:
    """Shared filters for the metrics endpoints.

    Attributes:
        date_from: Raw ``date_from`` value, echoed in report metadata.
        date_to: Raw ``date_to`` value, echoed in report metadata.
        start: Inclusive lower bound on ``created_at`` (naive UTC).
        end: Exclusive upper bound on ``created_at`` (naive UTC).
        feature: Exact feature to match.
        provider: Exact provider to match.
        model: Exact model to match.
        status: ``success`` or ``error``.
    """

    date_from: Optional[str] = None
    date_to: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    feature: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None

    def as_dict(self) -> dict[str, Optional[str]]:
        """Return the six raw filter values, keyed by query parameter name."""
        return {
            "date_from": self.date_from,
            "date_to": self.date_to,
            "feature": self.feature,
            "provider": self.provider,
            "model": self.model,
            "status": self.status,
        }


def parse_date_bound(value: str, *, is_end: bool) -> datetime:
    """Parse a ``date_from``/``date_to`` value into a naive UTC bound.

    A date-only value (``YYYY-MM-DD``) covers the whole day: as a start it means
    midnight, as an end it means the next midnight (exclusive). A datetime is exact;
    as an end, one microsecond is added so the given instant is included. Aware
    datetimes are converted to UTC; naive ones are taken as UTC.

    Args:
        value: The raw query value.
        is_end: Whether this is the ``date_to`` (exclusive upper) bound.

    Raises:
        ValueError: If the value is neither a date nor an ISO 8601 datetime.
    """
    name = "date_to" if is_end else "date_from"
    text = value.strip()
    try:
        if len(text) == 10:
            day = date.fromisoformat(text)
            start = datetime(day.year, day.month, day.day)
            return start + timedelta(days=1) if is_end else start
        moment = datetime.fromisoformat(text)
    except ValueError:
        raise ValueError(
            f"Invalid {name} '{value}': use YYYY-MM-DD or an ISO 8601 datetime"
        ) from None
    if moment.tzinfo is not None:
        moment = moment.astimezone(timezone.utc).replace(tzinfo=None)
    return moment + timedelta(microseconds=1) if is_end else moment


def build_filters(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    feature: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    status: Optional[str] = None,
) -> MetricsFilters:
    """Validate raw filter values and build :class:`MetricsFilters`.

    Raises:
        ValueError: If a date cannot be parsed or ``date_from`` is after ``date_to``.
    """
    start = parse_date_bound(date_from, is_end=False) if date_from else None
    end = parse_date_bound(date_to, is_end=True) if date_to else None
    if start is not None and end is not None and start >= end:
        raise ValueError("date_from must be less than or equal to date_to")
    return MetricsFilters(
        date_from=date_from,
        date_to=date_to,
        start=start,
        end=end,
        feature=feature,
        provider=provider,
        model=model,
        status=status,
    )


def apply_filters(stmt: Any, filters: MetricsFilters) -> Any:
    """Add the filters to a SQLAlchemy ``select`` as ``WHERE`` clauses (AND)."""
    conditions = []
    if filters.start is not None:
        conditions.append(LLMCall.created_at >= filters.start)
    if filters.end is not None:
        conditions.append(LLMCall.created_at < filters.end)
    for column, value in (
        (LLMCall.feature, filters.feature),
        (LLMCall.provider, filters.provider),
        (LLMCall.model, filters.model),
        (LLMCall.status, filters.status),
    ):
        if value is not None:
            conditions.append(column == value)
    return stmt.where(*conditions) if conditions else stmt


# ---------------------------------------------------------------------------
# Summaries
# ---------------------------------------------------------------------------


def percentile(values: list[int], p: float) -> Optional[int]:
    """Return the nearest-rank ``p``th percentile of ``values``, or ``None`` if empty."""
    if not values:
        return None
    ordered = sorted(values)
    rank = max(math.ceil(p / 100 * len(ordered)), 1)
    return ordered[rank - 1]


def summarize(rows: Iterable[Any]) -> dict[str, Any]:
    """Aggregate ``llm_calls`` rows into the fields of :class:`LLMMetricsStats`."""
    rows = list(rows)
    latencies = [row.latency_ms for row in rows]
    priced = [row.estimated_cost_usd for row in rows if row.estimated_cost_usd is not None]
    return {
        "calls": len(rows),
        "errors": sum(1 for row in rows if row.status == STATUS_ERROR),
        "input_tokens": sum(row.input_tokens or 0 for row in rows),
        "output_tokens": sum(row.output_tokens or 0 for row in rows),
        "cache_read_tokens": sum(row.cache_read_tokens or 0 for row in rows),
        "estimated_cost_usd": round(sum(priced), COST_DECIMALS),
        "unpriced_calls": len(rows) - len(priced),
        "latency_p50_ms": percentile(latencies, 50),
        "latency_p95_ms": percentile(latencies, 95),
    }


async def fetch_rows(db: AsyncSession, filters: MetricsFilters) -> list[Any]:
    """Return the matching ``llm_calls`` rows with the columns aggregation needs."""
    result = await db.execute(apply_filters(select(*ROW_COLUMNS), filters))
    return list(result.all())


def _group_key(row: Any) -> tuple[str, str, str]:
    return (row.feature, row.provider, row.model)


def metrics_summary(rows: Iterable[Any]) -> LLMMetricsResponse:
    """Build the ``GET /metrics/llm`` response: totals plus one group per
    feature, provider and model, sorted by that key."""
    rows = list(rows)
    grouped: dict[tuple[str, str, str], list[Any]] = defaultdict(list)
    for row in rows:
        grouped[_group_key(row)].append(row)
    groups = [
        LLMMetricsGroup(feature=feature, provider=provider, model=model, **summarize(group))
        for (feature, provider, model), group in sorted(grouped.items())
    ]
    return LLMMetricsResponse(totals=LLMMetricsStats(**summarize(rows)), groups=groups)


async def fetch_call_page(
    db: AsyncSession, filters: MetricsFilters, page: int, per_page: int
) -> tuple[list[LLMCall], int]:
    """Return one page of matching calls, newest first, and the total match count."""
    total = await db.scalar(apply_filters(select(func.count(LLMCall.id)), filters))
    result = await db.execute(
        apply_filters(select(LLMCall), filters)
        .order_by(LLMCall.created_at.desc(), LLMCall.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    return list(result.scalars().all()), int(total or 0)


# ---------------------------------------------------------------------------
# Time series
# ---------------------------------------------------------------------------


def bucket_start(moment: datetime, bucket: str) -> datetime:
    """Truncate ``moment`` to the start of its hour or day.

    Raises:
        ValueError: If ``bucket`` is not ``hour`` or ``day``.
    """
    if bucket == "hour":
        return moment.replace(minute=0, second=0, microsecond=0)
    if bucket == "day":
        return moment.replace(hour=0, minute=0, second=0, microsecond=0)
    raise ValueError(f"bucket must be one of: {', '.join(BUCKETS)}")


def build_timeseries(rows: Iterable[Any], bucket: str) -> list[LLMTimeseriesPoint]:
    """Summarise rows per (bucket, feature, provider, model).

    Only buckets with calls are returned. Rows without ``created_at`` are skipped.
    """
    grouped: dict[tuple[datetime, str, str, str], list[Any]] = defaultdict(list)
    for row in rows:
        if row.created_at is None:
            continue
        grouped[(bucket_start(row.created_at, bucket), *_group_key(row))].append(row)
    return [
        LLMTimeseriesPoint(
            bucket_start=start, feature=feature, provider=provider, model=model,
            **summarize(group),
        )
        for (start, feature, provider, model), group in sorted(grouped.items())
    ]


# ---------------------------------------------------------------------------
# Model comparison report
# ---------------------------------------------------------------------------


def parse_baseline(value: str) -> tuple[str, str]:
    """Split ``provider:model`` on the first colon.

    Raises:
        ValueError: If either part is empty.
    """
    provider, sep, model = value.partition(":")
    if not sep or not provider.strip() or not model.strip():
        raise ValueError(
            "baseline must be 'provider:model', e.g. 'mistral:mistral-large-latest'"
        )
    return provider.strip(), model.strip()


def _mean(values: list[float], decimals: int) -> Optional[float]:
    return round(sum(values) / len(values), decimals) if values else None


def _pct_delta(value: Optional[float], base: Optional[float]) -> Optional[float]:
    if value is None or base is None or base == 0:
        return None
    return round((value - base) / base * 100, 1)


def _span_seconds(first: Optional[datetime], last: Optional[datetime]) -> float:
    if first is None or last is None:
        return 0.0
    return (last - first).total_seconds()


def _report_row(provider: str, model: str, rows: list[Any], is_baseline: bool) -> ModelReportRow:
    """Compute the comparison metrics for one provider/model within a feature."""
    calls = len(rows)
    errors = [row for row in rows if row.status == STATUS_ERROR]
    successes = [row for row in rows if row.status != STATUS_ERROR]
    latencies = [row.latency_ms for row in successes]
    priced = [row.estimated_cost_usd for row in rows if row.estimated_cost_usd is not None]
    total_cost = round(sum(priced), COST_DECIMALS)
    mean_cost = round(total_cost / len(priced), COST_DECIMALS) if priced else None
    times = [row.created_at for row in rows if row.created_at is not None]
    return ModelReportRow(
        provider=provider,
        model=model,
        is_baseline=is_baseline,
        calls=calls,
        successful_calls=len(successes),
        errors=len(errors),
        error_rate=round(len(errors) / calls, 4) if calls else 0.0,
        refusals=sum(
            1 for row in errors if (row.error_message or "").startswith(REFUSAL_PREFIX)
        ),
        latency_mean_ms=_mean(latencies, 1),
        latency_p50_ms=percentile(latencies, 50),
        latency_p95_ms=percentile(latencies, 95),
        mean_input_tokens=_mean([row.input_tokens or 0 for row in successes], 1),
        mean_output_tokens=_mean([row.output_tokens or 0 for row in successes], 1),
        priced_calls=len(priced),
        unpriced_calls=calls - len(priced),
        mean_cost_per_call_usd=mean_cost,
        cost_per_1000_calls_usd=(
            round(mean_cost * 1000, COST_DECIMALS) if mean_cost is not None else None
        ),
        total_cost_usd=total_cost,
        first_call_at=min(times) if times else None,
        last_call_at=max(times) if times else None,
    )


def _deltas(row: ModelReportRow, base: ModelReportRow) -> ModelReportDeltas:
    """Compare ``row`` with the baseline row of the same feature."""
    return ModelReportDeltas(
        latency_mean_pct=_pct_delta(row.latency_mean_ms, base.latency_mean_ms),
        latency_p50_pct=_pct_delta(row.latency_p50_ms, base.latency_p50_ms),
        latency_p95_pct=_pct_delta(row.latency_p95_ms, base.latency_p95_ms),
        mean_input_tokens_pct=_pct_delta(row.mean_input_tokens, base.mean_input_tokens),
        mean_output_tokens_pct=_pct_delta(row.mean_output_tokens, base.mean_output_tokens),
        mean_cost_per_call_pct=_pct_delta(
            row.mean_cost_per_call_usd, base.mean_cost_per_call_usd
        ),
        error_rate_pp=round((row.error_rate - base.error_rate) * 100, 1),
    )


def _row_warnings(
    row: ModelReportRow, feature: str, feature_span: float, model_count: int
) -> list[str]:
    """Return the sample-size, unpriced and partial-range warnings for a row."""
    label = f"{row.provider}:{row.model} ({feature})"
    warnings = []
    if row.calls < MIN_SAMPLE_SIZE:
        warnings.append(f"{label}: sample size {row.calls} is below {MIN_SAMPLE_SIZE}")
    if row.unpriced_calls:
        warnings.append(
            f"{label}: {row.unpriced_calls} of {row.calls} calls have no price entry; "
            "cost figures exclude them"
        )
    if model_count >= 2 and feature_span > 0:
        ratio = _span_seconds(row.first_call_at, row.last_call_at) / feature_span
        if ratio < PARTIAL_RANGE_RATIO:
            first = row.first_call_at.isoformat() if row.first_call_at else "n/a"
            last = row.last_call_at.isoformat() if row.last_call_at else "n/a"
            warnings.append(
                f"{label}: calls cover only {int(ratio * 100)}% of the feature's date "
                f"range ({first} to {last})"
            )
    return warnings


def build_report(
    rows: Iterable[Any],
    filters: MetricsFilters,
    baseline: str,
    prices: dict[tuple[str, str], PriceEntry],
    generated_at: Optional[datetime] = None,
    extra_warnings: Optional[list[str]] = None,
) -> ModelReport:
    """Build the model comparison report.

    Rows are grouped by feature, then by (provider, model). Each non-baseline row
    is compared with the baseline row of the same feature.

    Args:
        rows: ``llm_calls`` rows from :func:`fetch_rows`.
        filters: Filters the rows were fetched with (echoed in metadata).
        baseline: Baseline as ``provider:model``.
        prices: Price table from ``load_price_table()``; may be empty.
        generated_at: Generation time; defaults to now (UTC, whole seconds).
        extra_warnings: Report-level warnings from the caller (listed first).

    Raises:
        ValueError: If ``baseline`` is not ``provider:model``.
    """
    baseline_key = parse_baseline(baseline)
    if generated_at is None:
        generated_at = datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
    rows = list(rows)

    warnings = list(extra_warnings or [])
    if filters.status:
        warnings.append(
            f"Status filter '{filters.status}' is applied; error rates reflect the filter"
        )

    by_feature: dict[str, dict[tuple[str, str], list[Any]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for row in rows:
        by_feature[row.feature][(row.provider, row.model)].append(row)

    features: list[FeatureReport] = []
    for feature in sorted(by_feature):
        models = by_feature[feature]
        report_rows = [
            _report_row(provider, model, group, (provider, model) == baseline_key)
            for (provider, model), group in models.items()
        ]
        report_rows.sort(key=lambda r: (not r.is_baseline, r.provider, r.model))
        base = report_rows[0] if report_rows[0].is_baseline else None

        firsts = [r.first_call_at for r in report_rows if r.first_call_at is not None]
        lasts = [r.last_call_at for r in report_rows if r.last_call_at is not None]
        first = min(firsts) if firsts else None
        last = max(lasts) if lasts else None
        span = _span_seconds(first, last)

        if base is None:
            warnings.append(
                f"Baseline {baseline} has no calls for feature '{feature}'; "
                "no deltas computed"
            )
        for row in report_rows:
            if base is not None and not row.is_baseline:
                row.deltas = _deltas(row, base)
            row.warnings = _row_warnings(row, feature, span, len(report_rows))
            warnings.extend(row.warnings)

        features.append(
            FeatureReport(
                feature=feature,
                baseline_present=base is not None,
                first_call_at=first,
                last_call_at=last,
                rows=report_rows,
            )
        )

    times = [row.created_at for row in rows if row.created_at is not None]
    report_models = sorted({(r.provider, r.model) for f in features for r in f.rows})
    price_info = [
        ReportPriceInfo(
            provider=provider,
            model=model,
            checked_on=prices[(provider, model)].checked_on,
            source=prices[(provider, model)].source,
        )
        for provider, model in report_models
        if (provider, model) in prices
    ]

    return ModelReport(
        metadata=ReportMetadata(
            generated_at=generated_at,
            baseline=baseline,
            filters=filters.as_dict(),
            covered_from=min(times) if times else None,
            covered_to=max(times) if times else None,
            min_sample_size=MIN_SAMPLE_SIZE,
            latency_basis=LATENCY_BASIS,
            prices=price_info,
            notes=list(REPORT_NOTES),
            warnings=warnings,
        ),
        features=features,
    )


# ---------------------------------------------------------------------------
# Report rendering
# ---------------------------------------------------------------------------


def report_filename(report: ModelReport, extension: str) -> str:
    """Return the download filename, e.g. ``llm-model-report-20261114-0718.csv``."""
    stamp = report.metadata.generated_at.strftime("%Y%m%d-%H%M")
    return f"llm-model-report-{stamp}.{extension}"


def _md_cell(value: Any) -> str:
    """Format a Markdown table cell: ``n/a`` for None, ``|`` escaped."""
    if value is None:
        return "n/a"
    if isinstance(value, datetime):
        value = value.isoformat(sep=" ")
    return str(value).replace("|", "\\|")


def _signed(value: Optional[float], suffix: str) -> str:
    return "n/a" if value is None else f"{value:+.1f}{suffix}"


def _usd(value: Optional[float]) -> Optional[str]:
    return None if value is None else f"{value:.8f}".rstrip("0").rstrip(".")


def render_report_markdown(report: ModelReport) -> str:
    """Render the report as Markdown: metadata, notes, warnings, prices, and per
    feature a metrics table and a comparison-with-baseline table."""
    meta = report.metadata
    set_filters = [f"{key}={value}" for key, value in meta.filters.items() if value]
    lines = [
        "# LLM model comparison report",
        "",
        f"- **Generated**: {_md_cell(meta.generated_at)} UTC",
        f"- **Baseline**: {_md_cell(meta.baseline)}",
        f"- **Filters**: {_md_cell(', '.join(set_filters) or 'none')}",
        f"- **Date range covered**: {_md_cell(meta.covered_from)} to "
        f"{_md_cell(meta.covered_to)} UTC",
        f"- **Minimum sample size**: {meta.min_sample_size}",
        f"- **Latency and token basis**: {meta.latency_basis}",
        "",
        "## Notes",
        "",
        *[f"- {note}" for note in meta.notes],
        "",
        "## Warnings",
        "",
        *([f"- {_md_cell(w)}" for w in meta.warnings] or ["None"]),
        "",
        "## Prices used",
        "",
        *(
            [
                f"- {_md_cell(p.provider)}:{_md_cell(p.model)}: checked {p.checked_on}, "
                f"source {p.source}"
                for p in meta.prices
            ]
            or ["None"]
        ),
    ]

    if not report.features:
        lines += ["", "No calls match the filters."]

    for feature in report.features:
        lines += [
            "",
            f"## Feature: {_md_cell(feature.feature)}",
            "",
            "| Model | Calls | Error rate | Refusals | Latency mean / p50 / p95 (ms) "
            "| Tokens in / out per call | Cost per call (USD) "
            "| Cost per 1,000 calls (USD) | Total cost (USD) | First call | Last call |",
            "|---|---|---|---|---|---|---|---|---|---|---|",
        ]
        for row in feature.rows:
            name = f"{row.provider}:{row.model}" + (" (baseline)" if row.is_baseline else "")
            lines.append(
                "| " + " | ".join([
                    _md_cell(name),
                    str(row.calls),
                    f"{row.error_rate * 100:.1f}%",
                    str(row.refusals),
                    f"{_md_cell(row.latency_mean_ms)} / {_md_cell(row.latency_p50_ms)} / "
                    f"{_md_cell(row.latency_p95_ms)}",
                    f"{_md_cell(row.mean_input_tokens)} / {_md_cell(row.mean_output_tokens)}",
                    _md_cell(_usd(row.mean_cost_per_call_usd)),
                    _md_cell(_usd(row.cost_per_1000_calls_usd)),
                    _md_cell(_usd(row.total_cost_usd)),
                    _md_cell(row.first_call_at),
                    _md_cell(row.last_call_at),
                ]) + " |"
            )

        lines += ["", "### Compared with baseline", ""]
        if not feature.baseline_present:
            lines.append(f"Baseline {_md_cell(meta.baseline)} has no calls for this feature.")
            continue
        others = [row for row in feature.rows if not row.is_baseline]
        if not others:
            lines.append("Only the baseline model has calls for this feature.")
            continue
        lines += [
            "| Model | Δ latency mean | Δ p50 | Δ p95 | Δ tokens in | Δ tokens out "
            "| Δ cost per call | Δ error rate (pp) |",
            "|---|---|---|---|---|---|---|---|",
        ]
        for row in others:
            d = row.deltas or ModelReportDeltas()
            lines.append(
                "| " + " | ".join([
                    _md_cell(f"{row.provider}:{row.model}"),
                    _signed(d.latency_mean_pct, "%"),
                    _signed(d.latency_p50_pct, "%"),
                    _signed(d.latency_p95_pct, "%"),
                    _signed(d.mean_input_tokens_pct, "%"),
                    _signed(d.mean_output_tokens_pct, "%"),
                    _signed(d.mean_cost_per_call_pct, "%"),
                    _signed(d.error_rate_pp, " pp"),
                ]) + " |"
            )

    return "\n".join(lines) + "\n"


CSV_COLUMNS = [
    "feature", "provider", "model", "is_baseline", "calls", "successful_calls",
    "errors", "error_rate", "refusals", "latency_mean_ms", "latency_p50_ms",
    "latency_p95_ms", "mean_input_tokens", "mean_output_tokens", "priced_calls",
    "unpriced_calls", "mean_cost_per_call_usd", "cost_per_1000_calls_usd",
    "total_cost_usd", "first_call_at", "last_call_at",
]
CSV_DELTA_COLUMNS = [
    "latency_mean_pct", "latency_p50_pct", "latency_p95_pct", "mean_input_tokens_pct",
    "mean_output_tokens_pct", "mean_cost_per_call_pct", "error_rate_pp",
]


def _csv_value(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def render_report_csv(report: ModelReport) -> str:
    """Render the report as CSV: a header and one row per (feature, provider, model)."""
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(CSV_COLUMNS + [f"delta_{c}" for c in CSV_DELTA_COLUMNS] + ["warnings"])
    for feature in report.features:
        for row in feature.rows:
            data = row.model_dump()
            data["feature"] = feature.feature
            deltas = data.get("deltas") or {}
            writer.writerow(
                [_csv_value(data[c]) for c in CSV_COLUMNS]
                + [_csv_value(deltas.get(c)) for c in CSV_DELTA_COLUMNS]
                + ["; ".join(row.warnings)]
            )
    return buffer.getvalue()
