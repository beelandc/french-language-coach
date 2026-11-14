"""Response schemas for the LLM metrics endpoints (issues #228 and #236)."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from schemas.session import PaginationInfo


class LLMMetricsStats(BaseModel):
    """Aggregated statistics over a set of ``llm_calls`` rows.

    Attributes:
        calls: Number of calls.
        errors: Calls with status ``error``.
        input_tokens: Total uncached input tokens.
        output_tokens: Total output tokens.
        cache_read_tokens: Total cache-read input tokens.
        estimated_cost_usd: Sum of estimated costs (calls without a price are excluded).
        unpriced_calls: Calls whose model had no price entry.
        latency_p50_ms: Median latency (nearest rank), ``None`` when there are no calls.
        latency_p95_ms: 95th percentile latency (nearest rank), ``None`` when there are
            no calls.
    """

    calls: int
    errors: int
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    estimated_cost_usd: float
    unpriced_calls: int
    latency_p50_ms: Optional[int] = None
    latency_p95_ms: Optional[int] = None


class LLMMetricsGroup(LLMMetricsStats):
    """Statistics for one feature, provider and model."""

    feature: str
    provider: str
    model: str


class LLMMetricsResponse(BaseModel):
    """Response for ``GET /metrics/llm``."""

    totals: LLMMetricsStats
    groups: list[LLMMetricsGroup]


class LLMCallLogItem(BaseModel):
    """One ``llm_calls`` row in the call log (issue #236)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    feature: str
    provider: str
    model: str
    session_id: Optional[int] = None
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    latency_ms: int
    estimated_cost_usd: Optional[float] = None
    status: str
    error_message: Optional[str] = None


class LLMCallLogResponse(BaseModel):
    """Response for ``GET /metrics/llm/calls``: calls newest first, with pagination."""

    calls: list[LLMCallLogItem]
    pagination: PaginationInfo


class LLMTimeseriesPoint(LLMMetricsGroup):
    """Statistics for one time bucket and one feature, provider and model.

    Attributes:
        bucket_start: Start of the hour or day bucket (naive UTC).
    """

    bucket_start: datetime


class LLMTimeseriesResponse(BaseModel):
    """Response for ``GET /metrics/llm/timeseries``.

    Attributes:
        bucket: ``hour`` or ``day``.
        points: Buckets that have calls, sorted by bucket then feature/provider/model.
    """

    bucket: str
    points: list[LLMTimeseriesPoint]


class ModelReportDeltas(BaseModel):
    """Differences between a report row and its feature's baseline row.

    Percent fields are relative changes, ``(row - baseline) / baseline * 100``.
    ``error_rate_pp`` is the difference in percentage points. A field is ``None``
    when either value is missing or the baseline value is 0.
    """

    latency_mean_pct: Optional[float] = None
    latency_p50_pct: Optional[float] = None
    latency_p95_pct: Optional[float] = None
    mean_input_tokens_pct: Optional[float] = None
    mean_output_tokens_pct: Optional[float] = None
    mean_cost_per_call_pct: Optional[float] = None
    error_rate_pp: Optional[float] = None


class ModelReportRow(BaseModel):
    """Comparison metrics for one provider and model within a feature.

    Attributes:
        calls: Sample size (all calls).
        successful_calls: Calls with status ``success``.
        errors: Calls with status ``error`` (refusals and invalid JSON included).
        error_rate: ``errors / calls``.
        refusals: Errors whose message starts with ``refusal``.
        latency_mean_ms, latency_p50_ms, latency_p95_ms: Over successful calls.
        mean_input_tokens, mean_output_tokens: Per successful call.
        priced_calls, unpriced_calls: Calls with and without a cost estimate.
        mean_cost_per_call_usd: Total cost divided by priced calls.
        cost_per_1000_calls_usd: Mean cost per call times 1,000.
        total_cost_usd: Sum of estimated costs over priced calls.
        first_call_at, last_call_at: Time range of this row's calls.
        deltas: Differences against the baseline; ``None`` for the baseline row or
            when the feature has no baseline row.
        warnings: Warnings about this row.
    """

    provider: str
    model: str
    is_baseline: bool
    calls: int
    successful_calls: int
    errors: int
    error_rate: float
    refusals: int
    latency_mean_ms: Optional[float] = None
    latency_p50_ms: Optional[int] = None
    latency_p95_ms: Optional[int] = None
    mean_input_tokens: Optional[float] = None
    mean_output_tokens: Optional[float] = None
    priced_calls: int
    unpriced_calls: int
    mean_cost_per_call_usd: Optional[float] = None
    cost_per_1000_calls_usd: Optional[float] = None
    total_cost_usd: float
    first_call_at: Optional[datetime] = None
    last_call_at: Optional[datetime] = None
    deltas: Optional[ModelReportDeltas] = None
    warnings: list[str] = []


class FeatureReport(BaseModel):
    """Report section for one feature (``chat`` or ``feedback``)."""

    feature: str
    baseline_present: bool
    first_call_at: Optional[datetime] = None
    last_call_at: Optional[datetime] = None
    rows: list[ModelReportRow]


class ReportPriceInfo(BaseModel):
    """When and where the price used for a model was checked."""

    provider: str
    model: str
    checked_on: date
    source: str


class ReportMetadata(BaseModel):
    """Context needed to read the report.

    Attributes:
        generated_at: Generation time (naive UTC).
        baseline: Baseline as ``provider:model``.
        filters: Raw filter values (``None`` when not set).
        covered_from, covered_to: First and last call time in the report.
        min_sample_size: Rows with fewer calls get a warning.
        latency_basis: Which calls latency and token averages use.
        prices: Price check dates and sources for the models in the report.
        notes: Fixed caveats about what the report does and does not show.
        warnings: All warnings: report-level, then per feature.
    """

    generated_at: datetime
    baseline: str
    filters: dict[str, Optional[str]]
    covered_from: Optional[datetime] = None
    covered_to: Optional[datetime] = None
    min_sample_size: int
    latency_basis: str
    prices: list[ReportPriceInfo]
    notes: list[str]
    warnings: list[str]


class ModelReport(BaseModel):
    """Response for ``GET /metrics/llm/report`` (JSON format)."""

    metadata: ReportMetadata
    features: list[FeatureReport]
