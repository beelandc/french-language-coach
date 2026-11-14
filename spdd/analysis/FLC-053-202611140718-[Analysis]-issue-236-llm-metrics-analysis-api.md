# SPDD Analysis: LLM Metrics Analysis API (Filters, Call Log, Time Series, Model Comparison Report)

**GitHub Issue**: #236
**Issue Title**: LLM metrics analysis API: filters, call log, time series and model comparison report
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/236
**Artifact ID**: FLC-053-202611140718
**Created**: 2026-11-14 07:18
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Extend the LLM metrics API added in #228 so an admin interface can filter, drill into and compare the data in `llm_calls`. Add a comparison report endpoint that summarises Mistral and Claude models on latency, reliability and cost, as JSON, Markdown or CSV.
>
> Today `GET /metrics/llm` returns only all-time totals and p50/p95 latency per feature, provider and model, with no filters, no per-call view, no trend over time and no comparison.
>
> **Depends on:** #228 (provider layer and `llm_calls` table)
> **Blocks:** #237 (admin metrics dashboard), #238 (comparison report UI)
>
> ## Design
> - **Shared filters** on every metrics endpoint: `date_from`, `date_to` (inclusive, UTC; `llm_calls.created_at` is stored as naive UTC), `feature`, `provider`, `model`, `status`. With no filters, `GET /metrics/llm` behaves exactly as today (backward compatible).
> - **`GET /metrics/llm/calls`**: paginated call log, newest first (`page`, `per_page` max 100, same filters). Each item: id, created_at, feature, provider, model, session_id, input/output/cache-read tokens, latency_ms, estimated_cost_usd, status, error_message. Use the same pagination shape as `GET /sessions/`.
> - **`GET /metrics/llm/timeseries`**: `bucket=hour|day` (default `day`), same filters. For each bucket and each (feature, provider, model): calls, errors, estimated cost, p50/p95 latency.
> - **`GET /metrics/llm/pricing`**: the current price table from `data/llm_pricing.json` (read-only), including `checked_on` and `source`, so the UI can show which prices the estimates use.
> - **`GET /metrics/llm/report`**: a model comparison report.
>   - Grouped by feature; one row per (provider, model) with: sample size, error rate, refusal count, mean/p50/p95 latency, mean input/output tokens per call, mean cost per call, cost per 1,000 calls, total cost.
>   - Relative deltas against a baseline (`baseline=mistral:mistral-large-latest` by default), e.g. "Claude Haiku 5.5: -40% p50 latency, -75% cost per call".
>   - Includes report metadata: generation time, filters, date range covered, price table `checked_on` dates, and warnings (sample size below a threshold, e.g. 20 calls; unpriced calls; models that only appear in part of the range).
>   - `format=json|markdown|csv`. Markdown and CSV are returned as downloads (`Content-Disposition`).
> - Move aggregation (percentiles, summaries, filters) out of `routers/metrics.py` into a service module (e.g. `services/llm/metrics.py`) so the router stays thin and #231/#232 can reuse it.
>
> ## Acceptance criteria
> - [ ] `GET /metrics/llm` accepts the shared filters; with no filters, its response is unchanged and the existing #228 tests pass
> - [ ] `GET /metrics/llm/calls` returns a paginated, filterable call log, newest first
> - [ ] `GET /metrics/llm/timeseries` returns hourly or daily buckets per feature, provider and model
> - [ ] `GET /metrics/llm/pricing` returns the price table with dates and sources
> - [ ] `GET /metrics/llm/report` compares models per feature (sample size, error rate, latency mean/p50/p95, tokens per call, cost per call, cost per 1,000 calls, total cost) with deltas against a configurable baseline and sample-size warnings
> - [ ] The report is available as JSON, Markdown and CSV
> - [ ] Invalid filters (unknown status, `date_from` after `date_to`, bad bucket or format) return 400/422 with clear messages
> - [ ] README API table documents the new endpoints and parameters
> - [ ] 80%+ test coverage on the new code
>
> ## Notes
> - The report compares **operational** metrics only (latency, errors, tokens, cost). Feedback **quality/accuracy** comes from the eval harness (#231). The report should say so, and could later include eval results (#232).
> - Live traffic is not a controlled comparison: different models will have handled different conversations at different times (provider/model is a config switch). Show the date range and sample size for each model, and compare only within a feature (chat vs chat, feedback vs feedback).
> - Consider whether eval-harness traffic (#231) should be tagged so it can be separated from live app traffic (e.g. a `source` column on `llm_calls`). That is a schema change, so decide it in the SPDD analysis with human approval.
> - All routes stay under the existing `/metrics/` prefix, which already has a Vite proxy entry.
> - No authentication exists until Phase 5 (VISION.md); these endpoints are as open as the rest of the API.

**Milestone**: Model evaluation (Claude vs Mistral). **Labels**: api, backend, enhancement, model-eval.

---

## Background

Issue #228 (merged in PR #235) added the provider layer in `services/llm/` and the `llm_calls` table (`models/llm_call.py:11-42`). Every provider call writes one row through `services/llm/recorder.py:17-67`, with feature, provider, model, session id, tokens, latency, estimated cost and `success`/`error` status. Anthropic refusals are recorded as `status="error"` with `error_message="refusal: <category>"` (`services/llm/anthropic_provider.py:118-121`, recorded by `services/llm/service.py:185-205`). Unparseable feedback JSON is recorded as `status="error"` with `error_message="invalid_json: ..."` (`services/llm/service.py:150-157`).

The only read path is `GET /metrics/llm` (`routers/metrics.py:47-73`): it loads every row into Python, groups by (feature, provider, model) and returns totals plus nearest-rank p50/p95 latency (`routers/metrics.py:20-44`). There are no filters, no per-call view, no trend and no comparison, and the aggregation helpers live in the router.

The Model evaluation milestone needs to compare Mistral and Claude on live traffic. The admin dashboard (#237) and comparison report UI (#238) both depend on the backend endpoints this issue adds. The eval harness (#231) and published results (#232) will reuse the aggregation code, so it moves into a service module.

---

## Business Value

- Gives the project owner real numbers to choose models per feature: latency, reliability and cost side by side, with deltas against the current default.
- Unblocks the frontend admin work (#237 dashboard, #238 report UI) with a stable, documented API.
- Makes the comparison report shareable outside the app (Markdown for decision records and #232, CSV for spreadsheets).
- Makes cost estimates auditable: the pricing endpoint and report metadata show which prices (and when they were checked) produced the numbers.
- Keeps aggregation logic reusable for #231/#232 instead of locked in a router.

---

## Scope In

- [ ] New service module `services/llm/metrics.py`: filter model, SQL filter building, `percentile`, `summarize`, call-log query with pagination, time-series bucketing, model comparison report, and Markdown/CSV renderers
- [ ] `routers/metrics.py` reduced to thin HTTP handlers; it keeps importing `percentile` and `summarize` so the existing `tests/test_metrics_router.py` import (`from routers.metrics import percentile, summarize`) still works unchanged
- [ ] Shared filter query parameters on `/metrics/llm`, `/metrics/llm/calls`, `/metrics/llm/timeseries` and `/metrics/llm/report`: `date_from`, `date_to`, `feature`, `provider`, `model`, `status`
- [ ] `GET /metrics/llm` with filters; unchanged response with none
- [ ] `GET /metrics/llm/calls`: paginated call log, newest first, `{calls: [...], pagination: PaginationInfo}` reusing `PaginationInfo` from `schemas/session.py:47-52`
- [ ] `GET /metrics/llm/timeseries`: `bucket=hour|day` (default `day`)
- [ ] `GET /metrics/llm/pricing`: full price table (currency, unit, description, models with prices, long-context tier, `checked_on`, `source`, `notes`)
- [ ] A loader in `services/llm/pricing.py` that returns the whole validated `PriceTable` (the existing `load_price_table` returns only the per-model dict and drops currency/unit/description)
- [ ] `GET /metrics/llm/report`: JSON (default), Markdown and CSV, with `baseline` parameter, deltas, metadata and warnings
- [ ] New Pydantic schemas in `schemas/llm_metrics.py`
- [ ] pytest tests for the service module and every endpoint, including validation errors (80%+ on new code)
- [ ] README: API table rows for the new endpoints and parameters, project-structure line for `services/llm/metrics.py`, and the LLM metrics paragraph

## Scope Out

- [ ] Frontend dashboard (#237) and report UI (#238)
- [ ] Eval harness and quality/accuracy metrics (#231); including eval results in the report (#232)
- [ ] **A `source` column on `llm_calls`** to separate eval traffic from live traffic. Recommended deferral, pending human approval (see Key Design Decisions)
- [ ] Changes to how calls are recorded (`recorder.py`, `service.py`), including a dedicated `refusal` status
- [ ] Retroactive re-pricing of stored rows when the price table changes; the report uses the stored `estimated_cost_usd`
- [ ] Authentication or access control (Phase 5, `VISION.md:223`)
- [ ] Statistical significance testing; the report gives sample sizes and warnings, not p-values
- [ ] Zero-filled time series buckets (see design decisions)
- [ ] A new Vite proxy entry: `/metrics` is already proxied (`frontend/vite.config.ts`), and all new routes sit under it

---

## Acceptance Criteria (ACs)

1. **AC1: Shared filters on `GET /metrics/llm`, backward compatible**
   **Given** `llm_calls` rows across features, providers, models, statuses and dates
   **When** I call `GET /metrics/llm` with no query parameters
   **Then** the response is identical in shape and values to #228's, and `tests/test_metrics_router.py` passes unchanged
   **And when** I add any combination of `date_from`, `date_to`, `feature`, `provider`, `model`, `status`
   **Then** totals and groups are computed only over matching rows (AND logic)

2. **AC2: Call log**
   **Given** 25 matching calls
   **When** I call `GET /metrics/llm/calls?page=2&per_page=10`
   **Then** I get calls 11-20 ordered by `created_at` descending (ties broken by `id` descending), each with id, created_at, feature, provider, model, session_id, input/output/cache-read tokens, latency_ms, estimated_cost_usd, status, error_message, and `pagination = {total: 25, page: 2, per_page: 10, total_pages: 3}`
   **And** `per_page=101` returns 422

3. **AC3: Time series**
   **Given** calls on two days for two models
   **When** I call `GET /metrics/llm/timeseries?bucket=day`
   **Then** I get one point per (bucket, feature, provider, model) that has calls, each with bucket start, calls, errors, estimated cost, unpriced calls and p50/p95 latency, sorted by bucket then feature/provider/model
   **And** `bucket=hour` buckets by hour; `bucket=week` returns 422

4. **AC4: Pricing**
   **When** I call `GET /metrics/llm/pricing`
   **Then** I get the contents of `data/llm_pricing.json` (validated), with each model's prices, `checked_on` and `source`

5. **AC5: Comparison report**
   **Given** chat calls for `mistral:mistral-large-latest` and `anthropic:claude-haiku-5-5`
   **When** I call `GET /metrics/llm/report`
   **Then** I get one section per feature, one row per (provider, model), each with sample size, errors, error rate, refusal count, mean/p50/p95 latency, mean input/output tokens per call, mean cost per call, cost per 1,000 calls, total cost, first/last call time
   **And** each non-baseline row carries deltas against the baseline row of the same feature
   **And** `baseline=anthropic:claude-haiku-5-5` changes the baseline
   **And** rows with fewer than 20 calls produce a sample-size warning

6. **AC6: Report formats**
   **When** I call the report with `format=markdown` or `format=csv`
   **Then** the body is Markdown or CSV with `Content-Type` `text/markdown` / `text/csv` and `Content-Disposition: attachment; filename="llm-model-report-<timestamp>.<ext>"`; `format=json` (default) returns JSON

7. **AC7: Validation**
   **When** `status=pending`, `bucket=week`, `format=pdf` or `per_page=0`
   **Then** 422 with FastAPI's validation message naming the allowed values
   **When** `date_from` is after `date_to`, a date cannot be parsed, or `baseline` is not `provider:model`
   **Then** 400 with a message that says what is wrong (matching `routers/sessions.py:112-116` for the date range)

8. **AC8: README** documents the new endpoints and parameters in the API table.

9. **AC9: Coverage** on `services/llm/metrics.py`, `routers/metrics.py` and new schema code is at least 80%.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **`LLMCall`** (`models/llm_call.py:11-42`): one row per provider call. `created_at` comes from `models/base.py:34` (`datetime.utcnow`, naive UTC). Indexed on `feature`, `model`, `session_id`; `created_at` is not indexed.
- **Status constants** `STATUS_SUCCESS`, `STATUS_ERROR` (`models/llm_call.py:7-8`).
- **`percentile`, `summarize`** (`routers/metrics.py:20-44`): nearest-rank percentile and per-group stats. Move to the service.
- **`LLMMetricsStats`, `LLMMetricsGroup`, `LLMMetricsResponse`** (`schemas/llm_metrics.py:8-47`): the existing response contract, kept as is.
- **Price table** (`services/llm/pricing.py:26-93`, `data/llm_pricing.json`): `PriceTable`, `PriceEntry` with `checked_on` and `source`; `load_price_table()` is `lru_cache`d and returns `{(provider, model): PriceEntry}`.
- **`PaginationInfo`** (`schemas/session.py:47-52`) and the pagination pattern in `routers/sessions.py:86-160` (count query, offset/limit, `total_pages = ceil(total / per_page)`).
- **Refusal recording**: Anthropic refusals raise `LLMProviderError("refusal: <category>")` (`services/llm/anthropic_provider.py:118-121`), recorded as `error` with that message. Mistral has no refusal detection.
- **Feature ids** `FEATURE_CHAT`, `FEATURE_FEEDBACK` (`services/llm/base.py`).

### New Concepts Required

- **`MetricsFilters`**: a frozen dataclass of the six shared filters, with normalised UTC-naive bounds (`start` inclusive, `end` exclusive). Built by a FastAPI dependency in the router so every endpoint shares one parameter definition.
- **Filter dependency** (`metrics_filters` in the router): parses and validates the query parameters and returns `MetricsFilters`.
- **Call log item / response schemas**: `LLMCallLogItem`, `LLMCallLogResponse`.
- **Time series schemas**: `LLMTimeseriesPoint` (bucket start + group key + stats), `LLMTimeseriesResponse` (bucket, points).
- **Pricing schema**: the existing `PriceTable` model can serve as the response model directly.
- **Report schemas**: `ModelReportRow`, `ModelReportDeltas`, `FeatureReport`, `ReportMetadata`, `ModelReport`.
- **Renderers**: `render_report_markdown(report)`, `render_report_csv(report)`.

### Key Business Rules

- **Filters combine with AND.** `date_from`/`date_to` are inclusive. A date-only value (`2026-11-13`) means the whole day: `date_from` starts at 00:00, `date_to` covers up to 23:59:59.999999. Timezone-aware values are converted to UTC and made naive before comparing (stored values are naive UTC). Naive values are taken as UTC.
- **`status`** must be `success` or `error`. `feature`, `provider` and `model` are free text (exact match), so future features such as eval traffic need no code change; an unknown value returns empty results rather than an error.
- **Percentiles** are nearest rank, as in #228.
- **Comparison is only within a feature.** Never across chat and feedback.
- **Refusal** = a row with `status="error"` and `error_message` starting with `refusal`. Only Claude reports refusals today; Mistral's refusal count is always 0, and the report says so.
- **Error rate** = errors / calls (refusals and invalid JSON count as errors, as #228 records them).
- **Latency and token means in the report** are over successful calls only (failed calls have truncated or zero usage and unrepresentative timing); error rate captures failures. The report metadata states this. `GET /metrics/llm` and the time series keep #228's all-calls latency.
- **Cost**: total cost = sum of `estimated_cost_usd` over priced calls (all statuses, since failed calls with usage still cost money). Mean cost per call = total cost / priced calls. Cost per 1,000 calls = mean cost per call × 1,000. Rows with unpriced calls get a warning.
- **Deltas** are relative: `(row - baseline) / baseline × 100`, rounded to one decimal, for mean/p50/p95 latency, mean input/output tokens, mean cost per call. Error rate delta is in percentage points (relative change of a near-zero rate is meaningless). A delta is `null` when either value is missing or the baseline value is 0.
- **Baseline** defaults to `mistral:mistral-large-latest` and applies per feature. If a feature has no baseline row, its deltas are `null` and a warning says so.
- **Warnings**: row has fewer than 20 calls (`MIN_SAMPLE_SIZE = 20`); row has unpriced calls; a model's active span (first to last call) covers less than half of its feature's span when the feature has two or more models; baseline missing for a feature; `status` filter applied (error rate then reflects the filter).
- **Report disclaimer**: operational metrics only; quality/accuracy comes from the eval harness (#231); live traffic is not a controlled comparison.

---

## Strategic Approach

### Solution Direction

1. **Create `services/llm/metrics.py`.** Move `percentile`, `summarize` and `COST_DECIMALS` from the router. Add `MetricsFilters`, `apply_filters(stmt, filters)`, `fetch_rows(db, filters)` and `group_rows(rows)`.
2. **Thin `routers/metrics.py`.** Import `percentile` and `summarize` from the service (keeps the existing test import working). Add the `metrics_filters` dependency and the four new handlers.
3. **Call log** with SQL `WHERE`, `ORDER BY created_at DESC, id DESC`, `COUNT(*)` and `OFFSET/LIMIT`, mirroring `routers/sessions.py`.
4. **Time series** in Python: fetch filtered rows (only the needed columns), truncate `created_at` to the hour or day, group by (bucket, feature, provider, model), summarise. Sparse: only buckets with calls.
5. **Pricing**: add `load_price_document(path=None) -> PriceTable` (cached) in `services/llm/pricing.py`, and make `load_price_table` build its dict from it, so both read the same validated file.
6. **Report**: fetch filtered rows, group by feature then (provider, model), compute row metrics, deltas, warnings and metadata (generated_at, filters, covered range = min/max `created_at` of matched rows, `checked_on` and `source` for each model in the report, `min_sample_size`, `latency_basis = "successful calls"`, disclaimer). Render JSON via Pydantic; Markdown/CSV via renderers, returned as `Response` with `Content-Disposition: attachment`.
7. **Schemas** in `schemas/llm_metrics.py`.
8. **Tests** in a new `tests/test_llm_metrics.py` (service-level) and extensions to `tests/test_metrics_router.py` (endpoints), seeding rows with explicit `created_at`.
9. **README** API table, project structure and LLM metrics paragraph.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **`source` column on `llm_calls` to separate eval traffic (#231)** | Adding it now future-proofs filtering. But it is a schema change with no migration tool: `Base.metadata.create_all` (`main.py:76`) never adds columns to an existing table, so every existing `french_coach.db` would break (`no such column`) until manually altered or recreated. #231 has not decided whether eval calls go through `record_call` at all (it can pass `db=None`, or use its own DB). | **Defer to #231** and do not change the schema here. #231 owns the eval traffic and can add the column with a migration step once its design is known. The filter layer (`MetricsFilters`) is built so adding a `source` filter later is one field. **Needs human approval.** |
| Where aggregation runs | SQL `GROUP BY` is faster, but SQLite has no percentile function, and #228 already aggregates in Python. | Filter in SQL (`WHERE`), aggregate in Python, as #228 does. Fine at testbed scale; noted as a risk. |
| Shared filter definition | Repeating six `Query` params on four handlers drifts; a dependency keeps one definition and one validation point. | One FastAPI dependency returning `MetricsFilters`. |
| Date parsing | `datetime` query params turn `2026-11-13` into midnight, so `date_to=2026-11-13` would silently exclude that day, contradicting "inclusive". | Parse the raw string in the dependency: date-only → whole day; datetime → exact; aware → converted to UTC naive; unparseable → 400 with the bad value. Internally use `start <= created_at < end`. |
| Validation status codes | Issue allows 400 or 422. | Enumerated values (`status`, `bucket`, `format`, `page`, `per_page`) use `Literal`/`Query` constraints → FastAPI 422 with allowed values. Cross-field and custom-format errors (date order, unparseable date, bad baseline) → 400, matching `routers/sessions.py:112-116`. |
| `feature`/`provider` validation | Restricting to `chat|feedback`, `mistral|anthropic` gives clearer errors but must change whenever a feature or provider is added (e.g. eval). | Free text, exact match. Only `status` is enumerated (it is a closed set in the model). |
| Report latency/tokens basis | All calls matches `GET /metrics/llm`; successful calls gives a fairer serving comparison (timeouts and instant auth failures skew latency; failed calls have no output tokens). | Successful calls only for latency and token means; error rate shown alongside; basis stated in metadata. **Flagged for the user; easy to flip.** |
| Error-rate delta | Relative change of small rates is noisy (1% → 2% = +100%). | Percentage points. |
| Time series zero-filling | Zero-filled points make charts easy but multiply rows (groups × buckets) and need a range when no dates are given. | Sparse points; #237 can fill gaps client-side. Document it. |
| Pricing loader | Reading the JSON again in the router duplicates path/validation logic. | `load_price_document()` in `pricing.py`, cached; `load_price_table()` derives from it. Existing pricing tests keep passing. |
| Report total cost basis | Stored per-call cost vs re-pricing with today's table. | Stored `estimated_cost_usd` (what was estimated at call time); metadata lists the current `checked_on` per model so readers can spot stale prices. |
| CSV layout | Metadata/warnings don't fit a flat table. | One row per (feature, provider, model) with all metrics, delta columns, `is_baseline`, first/last call and a `warnings` column (`; `-joined). Report-level metadata lives in JSON/Markdown. |
| Download filename | — | `llm-model-report-YYYYMMDD-HHMM.md` / `.csv` (UTC generation time). |
| Calls response key | Sessions uses `{sessions, pagination}`. | `{calls, pagination}` with the same `PaginationInfo`. |

### Alternatives Considered

- **Add the `source` column now with a startup `ALTER TABLE`**: rejected for this issue. It introduces ad-hoc migration code and a schema change before the consumer (#231) is designed.
- **SQL-side aggregation with window functions for percentiles**: rejected. It is SQLite-specific and complex, and #228 deliberately chose Python aggregation; revisit for PostgreSQL in Phase 5.
- **Separate filter params per endpoint**: rejected (duplication, drift).
- **`datetime`-typed query params like `/sessions/`**: rejected because of the date-only `date_to` pitfall above.
- **Generating the Markdown report with a template engine (Jinja2)**: rejected. It would be a new dependency for a small table; plain string building is enough.
- **Separate `/metrics/llm/report.md` and `/report.csv` routes**: rejected. The issue specifies a `format` parameter.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| `source` column for eval traffic | Add now or defer? | Defer to #231 (schema change without a migration path). **User decision.** |
| Latency/token basis in the report | All calls or successful calls? | Successful calls, stated in metadata. **User decision (default chosen if no answer).** |
| "Refusal count" | There is no refusal status; how to count? | Count `error` rows whose `error_message` starts with `refusal`. Mistral reports none; the report says so. |
| `date_to` inclusive with date-only values | Whole day or midnight? | Whole day. |
| Which deltas | Issue gives latency and cost examples. | Mean/p50/p95 latency, mean input/output tokens, mean cost per call (relative %), error rate (percentage points). |
| "Models that only appear in part of the range" threshold | Not defined. | Warn when a model's first-to-last span covers less than 50% of its feature's span and the feature has 2+ models. |
| Sample-size threshold | "e.g. 20". | Module constant `MIN_SAMPLE_SIZE = 20`, reported in metadata. |
| Does the pricing endpoint take filters? | "Shared filters on every metrics endpoint". | No: it returns static config, not `llm_calls` data. |
| Report with a `status` filter | Error rate becomes meaningless. | Allowed, with a warning. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Empty table / no matches | Every endpoint must still return valid shapes | `/llm`: as #228. Calls: `[]`, total 0, `total_pages` 0. Timeseries: `points: []`. Report: `features: []`, range `null`, no crash |
| `page` beyond last page | Pagination | Empty `calls`, correct totals |
| Baseline model absent in a feature | Deltas undefined | Deltas `null`, warning "baseline … has no calls for feature …" |
| Baseline metric is 0 or `null` (e.g. unpriced baseline, 0 cost) | Division by zero | Delta `null` |
| Row with only failed calls | No successful latency/tokens | Latency/token means and percentiles `null`; error rate 100% |
| All calls in a row unpriced | Mean cost undefined | Cost means `null`, total 0, unpriced warning |
| `date_from == date_to` (date-only) | Single-day query | Returns that whole day |
| `date_from` after `date_to` | Invalid | 400 "date_from must be less than or equal to date_to" |
| Timezone-aware dates (`+02:00`, `Z`) | Stored naive UTC | Converted to UTC naive |
| `baseline=mistral` (no colon) or `:model` | Bad format | 400 "baseline must be 'provider:model'" |
| Model names containing `:` | Baseline parsing | Split on the first `:` only |
| `per_page` > 100 or < 1, `page` < 1 | Limits | 422 |
| Markdown cells containing `|` (error messages are not in the report; model names could be) | Table breakage | Escape `|` in Markdown cells |
| CSV values with commas | CSV breakage | Use the `csv` module |
| Rows with `created_at` NULL (not possible via `record_call`, but the column is nullable) | Bucketing/ordering crash | Skip in time series and range; still counted in summaries; filtered out by date filters naturally |
| Hour bucket on a long range | Many points | Sparse output keeps it to buckets with calls |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Python-side aggregation loads all matching rows | Slow at large volume | Select only needed columns; filters pushed to SQL; acceptable for the SQLite testbed; note for Phase 5 PostgreSQL |
| `created_at` has no index | Date filters scan the table | Acceptable at current volume; adding an index is a schema change, out of scope (flag in PR) |
| Moving `percentile`/`summarize` breaks the #228 tests' import path | AC1 failure | Router re-imports them from the service; tests run unchanged |
| Changing `load_price_table` | Cost estimation regression | Keep its signature and caching; the existing `tests/test_llm_pricing.py` must pass unchanged |
| Floating-point cost sums | Off-by-epsilon totals | Round to `COST_DECIMALS = 8` as #228 does; tests use `pytest.approx` |
| Misleading comparisons on uncontrolled traffic | Wrong model decisions | Disclaimer, per-row date span and sample size, partial-range and sample warnings |
| SQLite naive datetimes vs aware filter values | Comparison errors | Normalise all bounds to naive UTC in the dependency |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Filters on `/metrics/llm`, unchanged without | Yes | Existing tests run unchanged |
| AC2 | Paginated, filterable call log | Yes | Same `PaginationInfo` as `/sessions/` |
| AC3 | Hourly/daily time series | Yes | Sparse buckets |
| AC4 | Pricing endpoint | Yes | New `load_price_document()` |
| AC5 | Comparison report with deltas and warnings | Yes | Refusal count derived from `error_message` |
| AC6 | JSON/Markdown/CSV | Yes | `Content-Disposition` downloads |
| AC7 | 400/422 on invalid input | Yes | 422 for enums/limits, 400 for dates/baseline |
| AC8 | README | Yes | API table, structure, LLM metrics paragraph |
| AC9 | 80%+ coverage | Yes | Service + router tests |

**AC Coverage Summary**: 9 of 9 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Existing `tests/test_llm_pricing.py` and all other suites keep passing.
- Docstrings on all public functions in the new service module.
- The report states that it covers operational metrics only, and that live traffic is not a controlled experiment.
- No new dependencies (`csv`, `io`, `datetime` are stdlib).
- No change to how calls are recorded.

---

## REASONS Canvas

### Requirements
The nine ACs above: shared filters on `/metrics/llm` (backward compatible), call log, time series, pricing, comparison report with configurable baseline, deltas and warnings, JSON/Markdown/CSV output, 400/422 validation, README, 80%+ coverage.

### Examples
- `GET /metrics/llm` with no params on the #228 test data returns exactly what `tests/test_metrics_router.py` asserts.
- `GET /metrics/llm?feature=chat&status=error` → totals over chat errors only.
- `GET /metrics/llm?date_from=2026-11-13&date_to=2026-11-13` → includes a call at `2026-11-13 23:30`, excludes `2026-11-14 00:05`.
- `GET /metrics/llm/calls?per_page=2` with calls at 10:00, 11:00, 12:00 → `[12:00, 11:00]`, `pagination = {total: 3, page: 1, per_page: 2, total_pages: 2}`.
- `GET /metrics/llm/timeseries?bucket=hour` with chat/mistral calls at 10:05 and 10:40 and one at 11:10 → points `{bucket_start: 10:00, calls: 2}` and `{bucket_start: 11:00, calls: 1}`.
- Report, chat feature: Mistral baseline p50 1000 ms, mean cost $0.0010; Haiku p50 600 ms, mean cost $0.00025 → Haiku deltas `latency_p50_pct: -40.0`, `mean_cost_per_call_pct: -75.0`; cost per 1,000 calls $0.25.
- Haiku row with 5 calls → warning "anthropic:claude-haiku-5-5 (chat): sample size 5 is below 20".
- Claude row with two `refusal: cyber` errors out of 10 → `refusal_count: 2`, `error_rate: 0.2`.
- `GET /metrics/llm/report?format=csv` → `text/csv`, `Content-Disposition: attachment; filename="llm-model-report-20261114-0718.csv"`, header row + one row per (feature, provider, model).
- `?status=pending` → 422; `?bucket=week` → 422; `?format=pdf` → 422; `?date_from=2026-11-14&date_to=2026-11-13` → 400; `?date_from=yesterday` → 400; `?baseline=mistral` → 400.

### Architecture
FastAPI router (`routers/metrics.py`, prefix `/metrics`, already registered in `main.py` and proxied in `frontend/vite.config.ts`) → service module (`services/llm/metrics.py`) → async SQLAlchemy queries on `LLMCall` → Pydantic schemas (`schemas/llm_metrics.py`). The price table comes from `services/llm/pricing.py`. Thin router, logic in the service, dependency injection for the DB (`get_db`) and filters.

### Standards
- PEP 8, type hints, docstrings on public functions (match `services/llm/*.py` style)
- 80%+ coverage on new code; pytest with `client`/`test_db` fixtures from `tests/conftest.py`; Given/When/Then comments as in `tests/test_metrics_router.py`
- README updated in the same PR (API table, project structure, LLM metrics paragraph)
- No new dependencies; no schema changes (pending the `source` decision)
- Commit `feat(#236): …` on `feature/issue-236-llm-metrics-analysis-api`

### Omissions
Frontend (#237, #238); eval harness and quality metrics (#231, #232); `source` column (deferred, pending approval); changes to call recording; a `refusal` status; re-pricing stored rows; auth; significance testing; zero-filled time series; an index on `created_at`.

### Notes
- Seed test rows with explicit `created_at` (the `LLMCall` constructor accepts it) to make date and bucket tests deterministic.
- `percentile`/`summarize` must remain importable from `routers.metrics`.
- `load_price_table` is `lru_cache`d and called by `estimate_cost_usd`; keep that behaviour.
- `Content-Disposition` responses: `fastapi.Response(content=..., media_type=..., headers=...)`.
- Router order: define `/llm/calls`, `/llm/timeseries`, `/llm/pricing`, `/llm/report` as fixed paths (no path params, so no shadowing issues).
- The SQLite DB file is created by `create_all` at startup; nothing here changes tables.

### Solutions
- Pagination and date-range validation: `routers/sessions.py:86-160`, `schemas/session.py:47-58`.
- Aggregation: `routers/metrics.py:20-73` (moved, not rewritten).
- Price table models: `services/llm/pricing.py:26-65` (`PriceTable` reused as the pricing response model).
- Test seeding helper: `add_calls` in `tests/test_metrics_router.py:11-27` (extend with `created_at`, `error_message`).

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
