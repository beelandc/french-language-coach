"""LLM call metrics endpoints (issues #228 and #236).

Handlers parse parameters and shape HTTP responses; aggregation, filtering and the
model comparison report live in :mod:`services.llm.metrics`.
"""

import logging
from math import ceil
from typing import Literal, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.llm_metrics import (
    LLMCallLogItem,
    LLMCallLogResponse,
    LLMMetricsResponse,
    LLMTimeseriesResponse,
    ModelReport,
)
from schemas.session import PaginationInfo
from services.llm.metrics import (  # noqa: F401  (percentile/summarize re-exported)
    DEFAULT_BASELINE,
    MetricsFilters,
    build_filters,
    build_report,
    build_timeseries,
    fetch_call_page,
    fetch_rows,
    metrics_summary,
    parse_baseline,
    percentile,
    render_report_csv,
    render_report_markdown,
    report_filename,
    summarize,
)
from services.llm.pricing import PriceTable, load_price_document, load_price_table

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/metrics", tags=["metrics"])

DATE_HELP = (
    "YYYY-MM-DD (whole day) or ISO 8601 datetime, UTC unless an offset is given "
    "(URL-encode '+' as %2B, or use 'Z')"
)


def metrics_filters(
    date_from: Optional[str] = Query(None, description=f"Calls on or after. {DATE_HELP}"),
    date_to: Optional[str] = Query(None, description=f"Calls on or before. {DATE_HELP}"),
    feature: Optional[str] = Query(None, description="Exact feature, e.g. chat or feedback"),
    provider: Optional[str] = Query(None, description="Exact provider, e.g. mistral or anthropic"),
    model: Optional[str] = Query(None, description="Exact model id"),
    status: Optional[Literal["success", "error"]] = Query(None, description="Call status"),
) -> MetricsFilters:
    """Shared filter parameters for the metrics endpoints; 400 on invalid dates."""
    try:
        return build_filters(date_from, date_to, feature, provider, model, status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/llm", response_model=LLMMetricsResponse)
async def get_llm_metrics(
    filters: MetricsFilters = Depends(metrics_filters),
    db: AsyncSession = Depends(get_db),
) -> LLMMetricsResponse:
    """Return LLM call totals and p50/p95 latency, overall and per feature/provider/model."""
    return metrics_summary(await fetch_rows(db, filters))


@router.get("/llm/calls", response_model=LLMCallLogResponse)
async def list_llm_calls(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    filters: MetricsFilters = Depends(metrics_filters),
    db: AsyncSession = Depends(get_db),
) -> LLMCallLogResponse:
    """Return matching calls, newest first. A page past the end returns no calls."""
    calls, total = await fetch_call_page(db, filters, page, per_page)
    return LLMCallLogResponse(
        calls=[LLMCallLogItem.model_validate(call) for call in calls],
        pagination=PaginationInfo(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=ceil(total / per_page) if total else 0,
        ),
    )


@router.get("/llm/timeseries", response_model=LLMTimeseriesResponse)
async def get_llm_timeseries(
    bucket: Literal["hour", "day"] = Query("day", description="Bucket size"),
    filters: MetricsFilters = Depends(metrics_filters),
    db: AsyncSession = Depends(get_db),
) -> LLMTimeseriesResponse:
    """Return per-bucket statistics for each feature, provider and model.

    Only buckets that have calls are returned.
    """
    rows = await fetch_rows(db, filters)
    return LLMTimeseriesResponse(bucket=bucket, points=build_timeseries(rows, bucket))


@router.get("/llm/pricing", response_model=PriceTable)
async def get_llm_pricing() -> PriceTable:
    """Return the price table the cost estimates use, with check dates and sources."""
    return load_price_document()


@router.get("/llm/report", response_model=ModelReport)
async def get_llm_report(
    baseline: str = Query(
        DEFAULT_BASELINE, description="Baseline model as provider:model"
    ),
    report_format: Literal["json", "markdown", "csv"] = Query(
        "json", alias="format", description="json, or markdown/csv as a download"
    ),
    filters: MetricsFilters = Depends(metrics_filters),
    db: AsyncSession = Depends(get_db),
) -> Union[ModelReport, Response]:
    """Compare models within each feature on latency, reliability, tokens and cost."""
    try:
        parse_baseline(baseline)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    extra_warnings = []
    try:
        prices = load_price_table()
    except Exception:
        logger.exception("Could not load the LLM price table for the report")
        prices = {}
        extra_warnings.append("Price table could not be loaded; price check dates are missing")

    report = build_report(
        await fetch_rows(db, filters), filters, baseline, prices,
        extra_warnings=extra_warnings,
    )
    if report_format == "json":
        return report

    if report_format == "markdown":
        content, media_type, extension = render_report_markdown(report), "text/markdown", "md"
    else:
        content, media_type, extension = render_report_csv(report), "text/csv", "csv"
    return Response(
        content=content,
        media_type=f"{media_type}; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{report_filename(report, extension)}"'
        },
    )
