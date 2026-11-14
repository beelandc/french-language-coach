# SPDD Prompt: LLM Metrics Analysis API (Filters, Call Log, Time Series, Model Comparison Report)

**GitHub Issue**: #236
**Issue Title**: LLM metrics analysis API: filters, call log, time series and model comparison report
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/236
**Artifact ID**: FLC-053-202611140746
**Created**: 2026-11-14 07:46
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [spdd/analysis/FLC-053-202611140718-[Analysis]-issue-236-llm-metrics-analysis-api.md](../analysis/FLC-053-202611140718-[Analysis]-issue-236-llm-metrics-analysis-api.md)

**Decisions confirmed by the user (2026-11-14)**:
1. The `source` column on `llm_calls` is deferred to #231. No schema change in this issue.
2. Report latency and token averages count successful calls only. The error rate counts all calls.

---

## Context

### Current Codebase State
- #228 (PR #235, merged) added the provider layer in `services/llm/`, the `llm_calls` table and `GET /metrics/llm`.
- `GET /metrics/llm` loads every `llm_calls` row, groups by (feature, provider, model) in Python and returns totals plus nearest-rank p50/p95 latency. It has no filters, and the aggregation helpers sit in the router.
- `/metrics` is registered in `main.py:90` and proxied in `frontend/vite.config.ts:33`. All new routes sit under it, so no proxy change is needed.
- Tables are created by `Base.metadata.create_all` at startup (`main.py:76`). There is no migration tool.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `routers/metrics.py` | Current metrics router | `percentile()` 20-26, `summarize()` 29-44, `get_llm_metrics()` 47-73, `COST_DECIMALS` 17 |
| `schemas/llm_metrics.py` | Metrics response schemas | `LLMMetricsStats` 8-32, `LLMMetricsGroup` 35-40, `LLMMetricsResponse` 43-47 |
| `models/llm_call.py` | `LLMCall` ORM model | Columns 32-42; `STATUS_SUCCESS`/`STATUS_ERROR` 7-8 |
| `models/base.py` | `id`, `created_at` (naive UTC via `datetime.utcnow`), `updated_at` | 33-35 |
| `services/llm/pricing.py` | Price table models and loader | `PriceEntry` 40-56, `PriceTable` 59-65, `load_price_table()` 74-93 (`lru_cache`), `estimate_cost_usd()` 96-127 |
| `data/llm_pricing.json` | Price table (4 models, `checked_on`, `source`) | whole file |
| `services/llm/anthropic_provider.py` | Refusals raise `LLMProviderError("refusal: <category>")` | 118-121 |
| `services/llm/service.py` | Failed calls recorded with `status="error"`, `error_message=str(exc)`; invalid feedback JSON recorded as `invalid_json: ...` | 150-157, 185-205 |
| `routers/sessions.py` | Pagination and date-range validation pattern | `list_sessions()` 86-170 (400 "date_from must be less than or equal to date_to" at 112-116) |
| `schemas/session.py` | `PaginationInfo` | 47-52 |
| `tests/test_metrics_router.py` | #228 metrics tests (must pass unchanged) | imports `from routers.metrics import percentile, summarize`; `add_calls()` 11-27 |
| `tests/test_llm_pricing.py` | Pricing tests (must pass unchanged) | uses `load_price_table(path)` |
| `tests/conftest.py` | `test_db`, `client` fixtures (in-memory SQLite) | 46-72 |
| `README.md` | API table row for `/metrics/llm` (396); project structure (252, 254-260, 271); "Cost and latency logging" (511-515) | — |

### Existing Patterns
- **Thin router, logic in service**: `routers/*.py` call into `services/`; Pydantic schemas in `schemas/`.
- **Nearest-rank percentiles and Python aggregation** (`routers/metrics.py:20-44`), costs rounded to 8 decimals.
- **Pagination**: `Query(1, ge=1)` / `Query(10, ge=1, le=100)`, `total_pages = ceil(total / per_page)` (0 when total is 0), response `{<items>, pagination: PaginationInfo}`.
- **Tests**: pytest + `@pytest.mark.asyncio`, `client`/`test_db` fixtures, rows inserted with `test_db.add(LLMCall(...))`, Given/When/Then comments.
- **Docstrings**: Google style with `Args:` / `Raises:` as in `services/llm/pricing.py`.

---

## Goal

**Primary Objective**: Add filtering, a call log, a time series, a pricing view and a model comparison report (JSON, Markdown, CSV) to the LLM metrics API, with the aggregation logic in a reusable service module.

**Secondary Objectives**:
- Keep `GET /metrics/llm` backward compatible and the #228 tests unchanged.
- Make every report figure traceable: filters, covered date range, sample sizes, price-check dates, warnings and disclaimers.
- Leave a filter model that #231 can extend with a `source` filter in one field.

---

## Constraints

### Architecture Constraints
- No new dependencies (stdlib `csv`, `io`, `datetime`, `dataclasses` only).
- No schema or table changes. No change to call recording (`recorder.py`, `service.py`, providers).
- Aggregation, filtering, report building and rendering live in `services/llm/metrics.py`. `routers/metrics.py` only parses parameters, calls the service and shapes HTTP responses.
- `routers/metrics.py` must still expose `percentile` and `summarize` (imported from the service).
- `load_price_table()` keeps its signature, return type and caching.

### Code Quality Constraints
- PEP 8, type hints, docstrings on every public function and class.
- Match the existing style in `services/llm/*.py` and `schemas/llm_metrics.py`.

### Testing Constraints
- Backend only; pytest, run by CI's `python3 -m pytest tests/ -v --tb=short`.
- 80%+ line coverage on `services/llm/metrics.py`, `routers/metrics.py` and the changed parts of `schemas/llm_metrics.py` and `services/llm/pricing.py`.
- `tests/test_metrics_router.py` (existing tests) and `tests/test_llm_pricing.py` must pass **unchanged**. New tests can be added to `tests/test_metrics_router.py` below the existing ones, and in a new `tests/test_llm_metrics.py`.
- No network calls.

### Acceptance Criteria
- [ ] `GET /metrics/llm` accepts the shared filters; with no filters, its response is unchanged and the existing #228 tests pass
- [ ] `GET /metrics/llm/calls` returns a paginated, filterable call log, newest first
- [ ] `GET /metrics/llm/timeseries` returns hourly or daily buckets per feature, provider and model
- [ ] `GET /metrics/llm/pricing` returns the price table with dates and sources
- [ ] `GET /metrics/llm/report` compares models per feature (sample size, error rate, latency mean/p50/p95, tokens per call, cost per call, cost per 1,000 calls, total cost) with deltas against a configurable baseline and sample-size warnings
- [ ] The report is available as JSON, Markdown and CSV
- [ ] Invalid filters (unknown status, `date_from` after `date_to`, bad bucket or format) return 400/422 with clear messages
- [ ] README API table documents the new endpoints and parameters
- [ ] 80%+ test coverage on the new code

---

## Examples

### Input/Output Examples
1. **Backward compatibility**: `GET /metrics/llm` on the #228 fixture data returns exactly what `tests/test_metrics_router.py` asserts today.
2. **Filters**: rows: chat/mistral success, chat/mistral error, feedback/anthropic success → `GET /metrics/llm?feature=chat&status=error` → `totals.calls == 1`, one group (chat, mistral).
3. **Whole-day `date_to`**: calls at `2026-11-13 23:30` and `2026-11-14 00:05` → `?date_from=2026-11-13&date_to=2026-11-13` → 1 call.
4. **Call log**: calls at 10:00, 11:00, 12:00 → `GET /metrics/llm/calls?per_page=2` → `calls` at 12:00, 11:00; `pagination == {"total": 3, "page": 1, "per_page": 2, "total_pages": 2}`. `page=2` → the 10:00 call. `page=5` → `calls == []`, same totals.
5. **Time series**: chat/mistral calls at 10:05 and 10:40, one at 11:10 (same day) → `?bucket=hour` → points `(10:00, calls 2)`, `(11:00, calls 1)`; `?bucket=day` (default) → one point `(00:00, calls 3)`.
6. **Report deltas**: chat, `mistral:mistral-large-latest` (baseline) p50 1000 ms, mean cost $0.0010; `anthropic:claude-haiku-5-5` p50 600 ms, mean cost $0.00025 → Haiku `deltas.latency_p50_pct == -40.0`, `deltas.mean_cost_per_call_pct == -75.0`, `cost_per_1000_calls_usd == 0.25`.
7. **Refusals**: 10 Claude chat calls, 2 with `status="error"`, `error_message="refusal: cyber"` → `refusals == 2`, `errors == 2`, `error_rate == 0.2`, `successful_calls == 8`.
8. **Formats**: `?format=csv` → `200`, `content-type` starts with `text/csv`, `content-disposition` `attachment; filename="llm-model-report-YYYYMMDD-HHMM.csv"`. `?format=markdown` → `text/markdown`, `.md`.

### Edge Cases
- Empty table: `/llm` as #228; calls `[]`, `total_pages 0`; timeseries `points: []`; report `features: []`, `covered_from`/`covered_to` `null`.
- Baseline absent for a feature: every row's `deltas` is `null`; warning `Baseline mistral:mistral-large-latest has no calls for feature 'feedback'; no deltas computed`.
- Baseline value 0 or `null` → that delta is `null`.
- Row with only failed calls → latency/token stats `null`, `error_rate 1.0`.
- Row with no priced calls → `mean_cost_per_call_usd`/`cost_per_1000_calls_usd` `null`, `total_cost_usd 0.0`, unpriced warning.
- `?status=pending`, `?bucket=week`, `?format=pdf`, `?per_page=0`, `?per_page=101`, `?page=0` → 422.
- `?date_from=2026-11-14&date_to=2026-11-13`, `?date_from=yesterday`, `?baseline=mistral`, `?baseline=:x`, `?baseline=x:` → 400 with a clear `detail`.
- `?date_from=2026-11-13T08:00:00Z` → 08:00 UTC. `2026-11-13T10:00:00%2B02:00` → 08:00 UTC. An unencoded `+` arrives as a space and returns 400 (README tells callers to encode it or use `Z`).
- `baseline=provider:model:with:colons` → split on the first `:` only.
- Model names containing `|` are escaped in Markdown.

### Test Cases
```python
@pytest.mark.asyncio
async def test_report_deltas_against_baseline(client, test_db):
    # Given 20 chat calls per model, Mistral p50 1000 ms / $0.0010, Haiku p50 600 ms / $0.00025
    await add_call_rows(test_db, 20, feature="chat", provider="mistral",
                        model="mistral-large-latest", latency_ms=1000, estimated_cost_usd=0.001)
    await add_call_rows(test_db, 20, feature="chat", provider="anthropic",
                        model="claude-haiku-5-5", latency_ms=600, estimated_cost_usd=0.00025)

    # When
    report = client.get("/metrics/llm/report").json()

    # Then
    (chat,) = report["features"]
    baseline, haiku = chat["rows"]
    assert baseline["is_baseline"] is True and baseline["deltas"] is None
    assert haiku["deltas"]["latency_p50_pct"] == -40.0
    assert haiku["deltas"]["mean_cost_per_call_pct"] == -75.0
    assert haiku["cost_per_1000_calls_usd"] == pytest.approx(0.25)
    assert haiku["warnings"] == []


def test_date_only_date_to_covers_whole_day():
    # When
    filters = build_filters(date_from="2026-11-13", date_to="2026-11-13")

    # Then: start inclusive, end exclusive at the next midnight
    assert filters.start == datetime(2026, 11, 13)
    assert filters.end == datetime(2026, 11, 14)
```

---

## Deliverables

### Code Changes
- [ ] `services/llm/metrics.py` (new): filters, query helpers, `percentile`, `summarize`, summary, call page, time series, report, renderers
- [ ] `routers/metrics.py`: thin handlers for `/llm`, `/llm/calls`, `/llm/timeseries`, `/llm/pricing`, `/llm/report`; `metrics_filters` dependency
- [ ] `schemas/llm_metrics.py`: call log, time series and report schemas
- [ ] `services/llm/pricing.py`: `load_price_document()`; `load_price_table()` derived from it

### Tests
- [ ] `tests/test_llm_metrics.py` (new): unit tests for the service and `load_price_document()`
- [ ] `tests/test_metrics_router.py`: new endpoint tests appended; existing tests untouched

### Documentation
- [ ] README API table: filters on `/metrics/llm`; rows for the four new endpoints
- [ ] README project structure: `services/llm/metrics.py`; updated `routers/metrics.py` and `schemas/llm_metrics.py` descriptions
- [ ] README "Cost and latency logging": a short paragraph on the new endpoints
- [ ] Docstrings on all new public functions and classes

---

## Actual Prompt

```
Implement GitHub issue #236 (LLM metrics analysis API) in the French Language Coach
repository on branch feature/issue-236-llm-metrics-analysis-api.

CONTEXT:
- FastAPI + async SQLAlchemy + SQLite, Python 3.12. Use python3.
- #228 added the llm_calls table (models/llm_call.py: feature, provider, model,
  session_id, input_tokens, output_tokens, cache_read_tokens, latency_ms,
  estimated_cost_usd (nullable), status 'success'|'error', error_message; id and
  created_at (naive UTC) from models/base.py) and GET /metrics/llm in
  routers/metrics.py, which has percentile() (nearest rank), summarize() and
  COST_DECIMALS = 8, and returns LLMMetricsResponse (schemas/llm_metrics.py).
- Refusals are stored as status='error' with error_message starting 'refusal'
  (only the Anthropic provider detects them). Invalid feedback JSON is stored as
  status='error', error_message 'invalid_json: ...'.
- services/llm/pricing.py has PriceTable/PriceEntry (checked_on, source, notes,
  long_context) and load_price_table(path=None) -> {(provider, model): PriceEntry}
  with lru_cache and a duplicate-entry ValueError.
- Pagination pattern: routers/sessions.py list_sessions() and PaginationInfo in
  schemas/session.py (total, page, per_page, total_pages; total_pages 0 when total 0).
- /metrics is already registered (main.py) and proxied (frontend/vite.config.ts).
- Decisions: no schema change (a `source` column is deferred to #231); report
  latency and token averages use successful calls only.

GOAL:
Add shared filters, a call log, a time series, a pricing view and a model
comparison report (JSON/Markdown/CSV) under /metrics/llm, moving aggregation into
services/llm/metrics.py so the router stays thin and #231/#232 can reuse it.

1. services/llm/metrics.py (new). Public API:
   - Constants: COST_DECIMALS = 8, MIN_SAMPLE_SIZE = 20, PARTIAL_RANGE_RATIO = 0.5,
     DEFAULT_BASELINE = "mistral:mistral-large-latest", REFUSAL_PREFIX = "refusal",
     BUCKETS = ("hour", "day").
   - @dataclass(frozen=True) MetricsFilters: date_from: Optional[str],
     date_to: Optional[str] (raw values, echoed in report metadata),
     start: Optional[datetime] (inclusive, naive UTC), end: Optional[datetime]
     (exclusive, naive UTC), feature, provider, model, status (all Optional[str]).
     Method as_dict() -> dict of the six raw filter values.
   - parse_date_bound(value: str, *, is_end: bool) -> datetime. Date-only
     (YYYY-MM-DD): start -> midnight; end -> next midnight (exclusive). Otherwise
     datetime.fromisoformat(value); aware values converted to UTC and made naive;
     naive taken as UTC; end -> value + 1 microsecond (so date_to is inclusive).
     Raises ValueError(f"Invalid date_from '{value}': use YYYY-MM-DD or an ISO 8601
     datetime") (date_to for ends).
   - build_filters(date_from=None, date_to=None, feature=None, provider=None,
     model=None, status=None) -> MetricsFilters. Raises
     ValueError("date_from must be less than or equal to date_to") when
     start >= end. Status validity is enforced by the router (Literal).
   - apply_filters(stmt, filters): adds WHERE clauses (AND): created_at >= start,
     created_at < end, exact equality for feature/provider/model/status.
   - percentile(values, p) and summarize(rows): moved verbatim from the router.
   - async fetch_rows(db, filters) -> list of Row with columns created_at,
     feature, provider, model, status, error_message, input_tokens, output_tokens,
     cache_read_tokens, latency_ms, estimated_cost_usd.
   - metrics_summary(rows) -> LLMMetricsResponse (the current router logic: groups
     sorted by (feature, provider, model), totals over all rows).
   - async fetch_call_page(db, filters, page, per_page) -> tuple[list[LLMCall], int]:
     COUNT(*) with the filters, then ORDER BY created_at DESC, id DESC,
     OFFSET (page-1)*per_page LIMIT per_page.
   - bucket_start(dt, bucket) -> datetime: truncate to hour or day.
   - build_timeseries(rows, bucket) -> list[LLMTimeseriesPoint]: group by
     (bucket_start, feature, provider, model), summarize each, sort by that key.
     Sparse (only buckets with calls). Skip rows whose created_at is None.
   - parse_baseline(value) -> tuple[str, str]: split on the first ':'; both parts
     non-empty after strip, else ValueError("baseline must be 'provider:model',
     e.g. 'mistral:mistral-large-latest'").
   - build_report(rows, filters, baseline, prices, generated_at=None) -> ModelReport.
     prices is the load_price_table() dict (may be empty). generated_at defaults to
     datetime.utcnow() truncated to seconds.
   - render_report_markdown(report) -> str; render_report_csv(report) -> str;
     report_filename(report, extension) -> "llm-model-report-YYYYMMDD-HHMM.<ext>"
     from generated_at.

   Report rules (per feature, one row per (provider, model)):
   - calls = all rows; errors = status 'error'; successful_calls = calls - errors;
     error_rate = round(errors / calls, 4); refusals = errors whose error_message
     starts with REFUSAL_PREFIX.
   - Latency (mean rounded to 1 dp, nearest-rank p50/p95) and mean input/output
     tokens (1 dp) over successful calls only; None when there are none.
   - priced_calls / unpriced_calls; total_cost_usd = sum of estimated_cost_usd over
     priced calls of any status (round 8); mean_cost_per_call_usd =
     total / priced_calls (round 8, None if no priced calls);
     cost_per_1000_calls_usd = mean * 1000 (round 8, None if mean is None).
   - first_call_at / last_call_at for the row; feature-level first/last too.
   - Row order: baseline row first (if present), then by (provider, model).
     Features sorted by name.
   - Deltas (ModelReportDeltas) on non-baseline rows when the feature has a
     baseline row; otherwise deltas = None. Relative percent, 1 dp:
     latency_mean_pct, latency_p50_pct, latency_p95_pct, mean_input_tokens_pct,
     mean_output_tokens_pct, mean_cost_per_call_pct = (row - base) / base * 100;
     None if either value is None or base == 0. error_rate_pp =
     round((row.error_rate - base.error_rate) * 100, 1).
   - Row warnings (strings, also collected into metadata.warnings):
     * calls < MIN_SAMPLE_SIZE:
       "{provider}:{model} ({feature}): sample size {calls} is below {MIN_SAMPLE_SIZE}"
     * unpriced_calls > 0: "{provider}:{model} ({feature}): {unpriced} of {calls}
       calls have no price entry; cost figures exclude them"
     * feature has 2+ models, feature span > 0, and row span / feature span <
       PARTIAL_RANGE_RATIO: "{provider}:{model} ({feature}): calls cover only
       {pct}% of the feature's date range ({first} to {last})" (pct integer).
   - Feature warning when the baseline is absent:
     "Baseline {baseline} has no calls for feature '{feature}'; no deltas computed".
   - Report warning when filters.status is set:
     "Status filter '{status}' is applied; error rates reflect the filter".
   - Metadata: generated_at, baseline (as given), filters (as_dict), covered_from /
     covered_to (min/max created_at over rows, None if none), min_sample_size,
     latency_basis = "successful calls", prices = [ReportPriceInfo(provider, model,
     checked_on, source)] for each (provider, model) in the report that has a
     price entry (sorted), notes (below), warnings (all, in order: report-level,
     then per feature: feature-level then row-level).
   - Notes (fixed list):
     "Operational metrics only (latency, errors, tokens, cost). Feedback quality and
      accuracy come from the eval harness (#231)."
     "Live traffic is not a controlled comparison: models may have handled different
      conversations at different times. Compare within a feature and check each
      model's sample size and date range."
     "Latency and token averages use successful calls only; error rate counts all calls."
     "Costs are estimates from the price table at the time of each call, not vendor
      invoices."
     "Refusals are detected only for Anthropic models; Mistral does not report them."

   Markdown: "# LLM model comparison report", a metadata bullet list (generated,
   baseline, filters that are set or "none", date range covered, minimum sample
   size, latency basis), "## Notes" bullets, "## Warnings" bullets (or "None"),
   "## Prices used" bullets (provider:model, checked_on, source), then per feature
   "## Feature: {feature}" with a metrics table (Model | Calls | Error rate |
   Refusals | Latency mean / p50 / p95 (ms) | Tokens in / out per call | Cost per
   call (USD) | Cost per 1,000 calls (USD) | Total cost (USD) | First call | Last
   call; baseline row labelled "(baseline)") and "### Compared with baseline"
   table (Model | Δ latency mean | Δ p50 | Δ p95 | Δ tokens in | Δ tokens out |
   Δ cost per call | Δ error rate (pp)), signed values like "-40.0%" / "+1.5 pp",
   "n/a" for None. Escape '|' in cells. Omit the comparison table and say so when
   the baseline is absent. Error rate shown as a percentage with 1 dp.

   CSV (csv module, header + one row per (feature, provider, model)): feature,
   provider, model, is_baseline, calls, successful_calls, errors, error_rate,
   refusals, latency_mean_ms, latency_p50_ms, latency_p95_ms, mean_input_tokens,
   mean_output_tokens, priced_calls, unpriced_calls, mean_cost_per_call_usd,
   cost_per_1000_calls_usd, total_cost_usd, first_call_at, last_call_at,
   delta_latency_mean_pct, delta_latency_p50_pct, delta_latency_p95_pct,
   delta_mean_input_tokens_pct, delta_mean_output_tokens_pct,
   delta_mean_cost_per_call_pct, delta_error_rate_pp, warnings ("; "-joined).
   None -> empty cell; datetimes ISO 8601.

2. schemas/llm_metrics.py: keep the existing three classes unchanged. Add:
   - LLMCallLogItem (from_attributes): id, created_at (Optional[datetime]), feature,
     provider, model, session_id, input_tokens, output_tokens, cache_read_tokens,
     latency_ms, estimated_cost_usd, status, error_message.
   - LLMCallLogResponse: calls: list[LLMCallLogItem]; pagination: PaginationInfo
     (import from schemas.session).
   - LLMTimeseriesPoint(LLMMetricsGroup): bucket_start: datetime.
   - LLMTimeseriesResponse: bucket: str; points: list[LLMTimeseriesPoint].
   - ModelReportDeltas, ModelReportRow, FeatureReport (feature, baseline_present,
     first_call_at, last_call_at, rows), ReportPriceInfo, ReportMetadata,
     ModelReport (metadata, features), with the fields named in section 1.
   Docstrings with Attributes, as in the existing classes.

3. services/llm/pricing.py: add @lru_cache load_price_document(path=None) ->
   PriceTable (reads and validates the file, raises ValueError on duplicate
   provider/model). load_price_table(path=None) keeps its signature and cache and
   builds its dict from load_price_document(path).

4. routers/metrics.py (thin):
   - from services.llm.metrics import percentile, summarize (and the rest); keep
     both names importable from routers.metrics.
   - metrics_filters dependency: Query params date_from (str), date_to (str),
     feature, provider, model (str), status (Optional[Literal["success","error"]]),
     each with a description; calls build_filters and converts ValueError into
     HTTPException(400, detail=str(exc)).
   - GET /llm (response_model=LLMMetricsResponse): filters -> fetch_rows ->
     metrics_summary.
   - GET /llm/calls (LLMCallLogResponse): page Query(1, ge=1), per_page
     Query(10, ge=1, le=100); total_pages = ceil(total / per_page) if total else 0;
     a page past the end returns an empty list (200).
   - GET /llm/timeseries (LLMTimeseriesResponse): bucket
     Literal["hour","day"] = "day".
   - GET /llm/pricing (response_model=PriceTable): load_price_document(). No filters.
   - GET /llm/report (response_model=ModelReport): baseline Query(DEFAULT_BASELINE),
     report_format: Literal["json","markdown","csv"] = Query("json", alias="format");
     parse_baseline ValueError -> 400. Prices: load_price_table(); if it raises,
     use {} (build_report then lists no prices; add the report warning
     "Price table could not be loaded; price check dates are missing"). JSON returns
     the model; markdown/csv return Response(content, media_type
     "text/markdown; charset=utf-8" / "text/csv; charset=utf-8", headers
     {"Content-Disposition": f'attachment; filename="{report_filename(...)}"'}).
   - Module and handler docstrings.

CONSTRAINTS:
- No new dependencies, no schema changes, no changes to recorder.py, service.py,
  providers, main.py or frontend/.
- GET /metrics/llm with no params returns exactly what it returns today.
- tests/test_metrics_router.py's existing tests and tests/test_llm_pricing.py pass
  unchanged.
- feature/provider/model filters are free text (exact match); only status, bucket
  and format are enumerated (422 via FastAPI). Date errors and bad baseline -> 400.
- PEP 8, type hints, docstrings. 80%+ coverage on new/changed code.

EXAMPLES:
- GET /metrics/llm?feature=chat&status=error -> only chat errors.
- date_from=2026-11-13&date_to=2026-11-13 includes 23:30 on the 13th, excludes
  00:05 on the 14th.
- Calls at 10:00, 11:00, 12:00; /llm/calls?per_page=2 -> [12:00, 11:00], pagination
  {total 3, page 1, per_page 2, total_pages 2}; page=5 -> [] with the same totals.
- Calls at 10:05, 10:40, 11:10 -> bucket=hour points (10:00, 2), (11:00, 1);
  bucket=day -> one point with 3 calls.
- Report: Mistral baseline p50 1000 ms, $0.0010/call; Haiku p50 600 ms,
  $0.00025/call -> Haiku latency_p50_pct -40.0, mean_cost_per_call_pct -75.0,
  cost_per_1000_calls_usd 0.25.
- 10 Claude calls with 2 'refusal: cyber' errors -> refusals 2, error_rate 0.2.
- Fewer than 20 calls -> sample-size warning. Baseline missing -> deltas null +
  warning. status filter -> report warning.
- status=pending, bucket=week, format=pdf, per_page=0/101, page=0 -> 422.
  date_from > date_to, date_from=yesterday, baseline=mistral -> 400.
- format=csv -> text/csv + attachment filename llm-model-report-YYYYMMDD-HHMM.csv;
  format=markdown -> text/markdown + .md.

ACCEPTANCE CRITERIA:
- [ ] GET /metrics/llm accepts the shared filters; unchanged with none; #228 tests pass
- [ ] GET /metrics/llm/calls: paginated, filterable call log, newest first
- [ ] GET /metrics/llm/timeseries: hourly or daily buckets per feature, provider, model
- [ ] GET /metrics/llm/pricing: price table with dates and sources
- [ ] GET /metrics/llm/report: per-feature comparison with deltas against a
      configurable baseline and sample-size warnings
- [ ] Report available as JSON, Markdown and CSV
- [ ] Invalid filters return 400/422 with clear messages
- [ ] README API table documents the new endpoints and parameters
- [ ] 80%+ test coverage on the new code

DELIVERABLES:
- services/llm/metrics.py (new), routers/metrics.py, schemas/llm_metrics.py,
  services/llm/pricing.py.
- tests/test_llm_metrics.py (new): parse_date_bound (date-only start/end, aware ->
  UTC, Z suffix, invalid), build_filters (order error, same-day ok), parse_baseline,
  bucket_start, build_timeseries, build_report (metrics, success-only latency and
  tokens, refusals, deltas incl. None/zero baseline, baseline-first ordering,
  missing baseline, all warning types, empty rows, prices metadata, notes),
  renderers (Markdown sections, n/a, pipe escaping, CSV header and rows),
  report_filename, load_price_document (matches load_price_table, duplicate error).
- tests/test_metrics_router.py: append endpoint tests for filters on /llm, calls
  (order, pagination, filters, past-the-end page, 422 limits), timeseries (hour/day,
  422 bucket), pricing, report (JSON shape, custom baseline, markdown/csv headers,
  400 baseline, 422 format, price-load failure warning), filter validation (422
  status, 400 dates). Use a new helper that accepts created_at/error_message;
  don't modify existing tests or add_calls().
- README.md: API table (filters on /metrics/llm; rows for /metrics/llm/calls,
  /timeseries, /pricing, /report with parameters, plus a note that '+' in a
  timezone offset must be URL-encoded as %2B or use 'Z'), project structure
  (services/llm/metrics.py; routers/metrics.py and schemas/llm_metrics.py
  descriptions), and a short paragraph in "Cost and latency logging".
- Run: python3 -m pytest tests/ -v --tb=short and
  python3 -m pytest --cov=services/llm/metrics --cov=routers/metrics
  --cov=schemas/llm_metrics --cov=services/llm/pricing --cov-report=term-missing
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, 2026-11-14.

- `services/llm/metrics.py` (new): `MetricsFilters`, `parse_date_bound`, `build_filters`, `apply_filters`, `percentile`/`summarize` (moved unchanged), `fetch_rows`, `metrics_summary`, `fetch_call_page`, `bucket_start`, `build_timeseries`, `parse_baseline`, `build_report`, `render_report_markdown`, `render_report_csv`, `report_filename`.
- `routers/metrics.py`: thin handlers for `/llm`, `/llm/calls`, `/llm/timeseries`, `/llm/pricing`, `/llm/report`, plus the shared `metrics_filters` dependency. It still exposes `percentile` and `summarize`.
- `schemas/llm_metrics.py`: `LLMCallLogItem`, `LLMCallLogResponse`, `LLMTimeseriesPoint`, `LLMTimeseriesResponse`, `ModelReportDeltas`, `ModelReportRow`, `FeatureReport`, `ReportPriceInfo`, `ReportMetadata`, `ModelReport`. The three #228 classes are unchanged.
- `services/llm/pricing.py`: `load_price_document()` (cached, rejects duplicates); `load_price_table()` now builds its dict from it, with the same signature and caching.
- Tests: `tests/test_llm_metrics.py` (new, 48 tests) and 49 new endpoint tests appended to `tests/test_metrics_router.py`. The #228 tests in that file were not modified.
- README: API table (filters on `/metrics/llm`, four new rows), project structure, "Cost and latency logging" paragraph.

---

## Human Review Notes

### Changes Made
- [x] **`build_report(..., extra_warnings=None)`**: the prompt had the router add the "Price table could not be loaded" warning; the router now passes it in through this parameter, so the warning ordering (report-level first) stays in one place.
- [x] **`generated_at` default** uses `datetime.now(timezone.utc)` made naive instead of the deprecated `datetime.utcnow()`. Same value.
- [x] **Markdown extras**: "No calls match the filters." for an empty report, and "Only the baseline model has calls for this feature." when there is nothing to compare. Both make the download readable in those cases.
- [x] **Test helper** is `add_call(db, ..., count=1)` rather than the `add_call_rows` named in the sample test. The existing `add_calls()` is untouched.
- [x] **Test data fix during implementation**: the first run of `test_json_report` failed (-67.5% vs -75.0%) because the seeded refusal rows used the default $0.001 cost. The test data was wrong, not the code; the rows now use the Haiku price.

### Quality Checks
- [x] Code follows existing patterns (thin router, service module, Pydantic schemas, nearest-rank percentiles, `PaginationInfo`)
- [x] Tests pass at 80%+ coverage
- [x] Documentation updated
- [x] All acceptance criteria met

### Issues Found
- **Coverage of async handlers under `TestClient`**: coverage reports a few lines after `await` as missed (`routers/metrics.py` 84, 106, 144-151; `services/llm/metrics.py` 223, 249-255) although tests exercise them: for example, the Markdown/CSV download tests assert those responses. This is a coverage tracing gap with the test client's worker thread, not missing tests. Module coverage is still 85% / 99%.
- `created_at` has no index, so date filters scan the table. Fine at testbed scale; adding one is a schema change for a later issue.

---

## Verification

- [x] All acceptance criteria from issue #236 are met
  - [x] `GET /metrics/llm` accepts the shared filters; unchanged with none; the #228 tests pass unmodified
  - [x] `GET /metrics/llm/calls`: paginated, filterable, newest first (ties by id)
  - [x] `GET /metrics/llm/timeseries`: `hour`/`day` buckets per feature, provider, model
  - [x] `GET /metrics/llm/pricing`: price table with `checked_on` and `source`
  - [x] `GET /metrics/llm/report`: per-feature comparison, configurable baseline, deltas, sample-size and other warnings
  - [x] JSON, Markdown and CSV (`Content-Disposition: attachment`)
  - [x] 422 for unknown `status`/`bucket`/`format` and bad pagination; 400 for unparseable dates, `date_from` after `date_to`, malformed `baseline`
  - [x] README API table documents the endpoints and parameters
  - [x] Coverage on new/changed code: `services/llm/metrics.py` 99%, `routers/metrics.py` 85%, `schemas/llm_metrics.py` 100%, `services/llm/pricing.py` 100% (98% combined)
- [x] Tests pass: `python3 -m pytest tests/ -q` → 757 passed, 1 xfailed
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced (no schema change; `/metrics/llm` unchanged without filters; `load_price_table` unchanged)
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
