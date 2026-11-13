"""Response schemas for the LLM metrics endpoint (issue #228)."""

from typing import Optional

from pydantic import BaseModel


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
