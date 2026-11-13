"""LLM call metrics endpoint (issue #228)."""

import math
from collections import defaultdict
from typing import Any, Iterable, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.llm_call import STATUS_ERROR, LLMCall
from schemas.llm_metrics import LLMMetricsGroup, LLMMetricsResponse, LLMMetricsStats

router = APIRouter(prefix="/metrics", tags=["metrics"])

COST_DECIMALS = 8


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


@router.get("/llm", response_model=LLMMetricsResponse)
async def get_llm_metrics(db: AsyncSession = Depends(get_db)) -> LLMMetricsResponse:
    """Return LLM call totals and p50/p95 latency, overall and per feature/provider/model."""
    result = await db.execute(
        select(
            LLMCall.feature,
            LLMCall.provider,
            LLMCall.model,
            LLMCall.status,
            LLMCall.input_tokens,
            LLMCall.output_tokens,
            LLMCall.cache_read_tokens,
            LLMCall.latency_ms,
            LLMCall.estimated_cost_usd,
        )
    )
    rows = result.all()

    grouped: dict[tuple[str, str, str], list[Any]] = defaultdict(list)
    for row in rows:
        grouped[(row.feature, row.provider, row.model)].append(row)

    groups = [
        LLMMetricsGroup(feature=feature, provider=provider, model=model, **summarize(group))
        for (feature, provider, model), group in sorted(grouped.items())
    ]
    return LLMMetricsResponse(totals=LLMMetricsStats(**summarize(rows)), groups=groups)
