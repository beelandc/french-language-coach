# SPDD Analysis: Mistral vs Claude Model Comparison Report (Admin UI, with Export)

**GitHub Issue**: #238
**Issue Title**: Mistral vs Claude model comparison report in the admin interface, with export
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/238
**Artifact ID**: FLC-056-202611141726
**Created**: 2026-11-14 17:26
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Add a model comparison report to the admin interface that summarises how the Mistral and Claude models compare on performance and cost, using the data captured by the provider layer (#228). The report can be exported to share or attach to a decision record.
>
> **Depends on:** #236 (`GET /metrics/llm/report`) and #237 (admin page shell, filters, navigation)
> **Related:** #231 (eval harness: quality/accuracy), #232 (eval results and model-choice decision record)
>
> ## Design
> - **Location:** a "Comparison report" tab or section on `/admin/metrics`, reusing the dashboard's filters (date range, feature) and adding a **baseline model** selector (default Mistral `mistral-large-latest`).
> - **Content (per feature: chat, feedback):**
>   - Side-by-side table, one column per model (e.g. Mistral Large, Claude Sonnet 5.5, Claude Haiku 5.5, Claude Opus 5.5): sample size, date range covered, error rate, refusals, latency mean/p50/p95, mean input/output tokens per call, cost per call, cost per 1,000 calls, total cost.
>   - Deltas against the baseline, highlighted as better or worse (e.g. "-62% cost per call", "+180 ms p95").
>   - A short generated summary line per feature, e.g. "For feedback, Claude Haiku 5.5 was the cheapest (… per 1,000 calls) and Claude Sonnet 5.5 the fastest at p95 …", built from the report data (no LLM call needed).
>   - Caveats shown with the report: sample-size warnings, unpriced calls, the price table `checked_on` dates, and a note that live traffic isn't a controlled comparison and that feedback quality is measured by the eval harness (#231).
> - **Export:** download as Markdown and CSV (from the report endpoint's `format` parameter) and as PDF (jsPDF is already a frontend dependency).
> - Typed API function and types for the report response.
>
> ## Acceptance criteria
> - [ ] The report shows, per feature, every model with recorded calls in the selected range, with the listed operational and cost metrics
> - [ ] Deltas are computed against a selectable baseline (default Mistral `mistral-large-latest`)
> - [ ] A plain-language summary per feature names the cheapest, fastest (p50 and p95) and most reliable model
> - [ ] Caveats (sample size, unpriced calls, price dates, live-traffic and quality disclaimers) are always visible and included in exports
> - [ ] The report can be exported as Markdown, CSV and PDF, and the exports match what is on screen
> - [ ] Empty state when fewer than two models have data for a feature (explains how to switch providers with `CHAT_PROVIDER` / `FEEDBACK_PROVIDER`)
> - [ ] Storybook stories and discovered tests for the new components; one Cypress E2E test covers viewing and exporting the report
> - [ ] README documents the report and how to generate comparison data
> - [ ] 80%+ coverage on new components
>
> ## Notes
> - **Generating comparison data:** the app routes each feature to one model at a time, so a live comparison needs traffic recorded under each configuration (e.g. a period with `FEEDBACK_PROVIDER=anthropic`, `FEEDBACK_MODEL=claude-haiku-5-5`). The eval harness (#231) will produce controlled, same-input comparisons. Showing #231 results next to this report could be a follow-up with #232.
> - Keep the summary wording factual and sample-size aware: don't declare a winner when the sample-size warning applies.

---

## Background

Issue #228 added the provider layer (`services/llm/`) that logs every chat and feedback call to `llm_calls`. Issue #236 (PR #241) added `GET /metrics/llm/report`, which groups calls by feature and by provider/model, computes reliability, latency, token and cost metrics, deltas against a baseline, and warnings, and renders the result as JSON, Markdown or CSV. Issue #237 (PR #242) added the `/admin/metrics` dashboard with URL-backed filters, but the report endpoint has no UI yet.

The "Model evaluation (Claude vs Mistral)" milestone needs a readable, shareable comparison to inform the model choice decision (#232). This issue puts the report on the admin page, adds a sample-size-aware plain-language summary, and makes the report exportable for decision records.

Two gaps in the #236 backend matter for this issue's ACs:

1. **No summary in the report.** The JSON, Markdown and CSV outputs have no per-feature summary. If the summary were built only in the frontend, the Markdown and CSV downloads (served by the backend) would not contain it, so the exports would not match the screen.
2. **CSV has no fixed caveats.** `render_report_csv` (`services/llm/metrics.py:664`) writes a header plus one row per model, with only the per-row `warnings` column. The fixed notes (`REPORT_NOTES`, live-traffic and quality disclaimers), report-level warnings and price `checked_on` dates are missing, so the CSV fails AC4 ("caveats included in exports").

---

## Business Value

- Turns the raw report endpoint into something a person can read in a minute: who is cheapest, fastest and most reliable per feature, against a chosen baseline.
- Produces shareable artifacts (Markdown, CSV, PDF) to attach to the model-choice decision record (#232).
- Guards against misleading conclusions: the summary won't name a winner when samples are too small, and the caveats travel with every export.
- Tells the admin how to generate comparison data when only one model has traffic.

---

## Scope In

- [ ] **Backend (additive, backward compatible):**
  - [ ] A per-feature summary computed in `services/llm/metrics.py` (`build_report`) and added to `FeatureReport` as a new `summary` field (structured highlights plus a plain-language `text`), so JSON, Markdown, CSV and PDF all carry the same wording.
  - [ ] Markdown export: a "Summary" line per feature section.
  - [ ] CSV export: a `#`-prefixed comment preamble (generated time, baseline, filters, date range covered, minimum sample size, latency basis, price check dates, notes, report warnings, per-feature summaries) before the unchanged header row and data rows. *(Approved by the user, 2026-11-14.)*
  - [ ] Pydantic schema `FeatureSummary` in `schemas/llm_metrics.py`; pytest coverage for the summary rules and the new export content.
- [ ] **Frontend types and API:** `ModelReport`, `FeatureReport`, `ModelReportRow`, `ModelReportDeltas`, `FeatureSummary`, `ReportMetadata`, `ReportPriceInfo`, `LLMReportFormat` in `frontend/src/types/index.ts`; `metricsApi.getReport(params, baseline)` and `metricsApi.downloadReport(params, baseline, format)` (returns a `Blob` and the server's filename) in `frontend/src/utils/api.ts`.
- [ ] **View switch on `/admin/metrics`:** "Dashboard" and "Comparison report" tabs, with the active tab in the URL (`?view=report`) alongside the shared filters.
- [ ] **Report view** (new components in `frontend/src/components/LLMMetrics/`):
  - [ ] Baseline selector (models with calls in the report, plus the default `mistral:mistral-large-latest`), stored in the URL (`baseline=`).
  - [ ] Per feature: a side-by-side table, one column per model and one row per metric (sample size, date range, error rate, refusals, latency mean/p50/p95, mean input/output tokens, cost per call, cost per 1,000 calls, total cost, unpriced calls), with the baseline delta under each value, colored better/worse (lower latency, cost and error rate are better; token deltas are neutral).
  - [ ] The summary sentence per feature from the backend.
  - [ ] An always-visible caveats panel: notes, report warnings (sample size, unpriced, partial range, missing baseline), minimum sample size, price `checked_on` dates and sources.
  - [ ] Empty state per feature with fewer than two models, naming the feature's env vars (`CHAT_PROVIDER`/`CHAT_MODEL` or `FEEDBACK_PROVIDER`/`FEEDBACK_MODEL`); a report-wide empty state when no calls match.
  - [ ] Loading and error (Retry) states via the existing `MetricsPanel`.
- [ ] **Exports:** Markdown and CSV downloaded from the endpoint's `format` parameter with the exact API parameters used for the on-screen report; PDF built client-side with jsPDF from the on-screen JSON.
- [ ] Storybook stories and Jest tests (`*.jest.test.tsx`) for each new component and helper module; Storybook mocks for the new `metricsApi` functions in `src/testSetup.ts`.
- [ ] One Cypress spec `frontend/cypress/e2e/admin-metrics-report.cy.ts` (view the report, change baseline, export) added to both spec lists in `.github/workflows/cypress-tests.yml`.
- [ ] README: report description, how to generate comparison data, endpoint doc update (summary field, CSV preamble), Frontend Routes row update, project structure and test file list.

## Scope Out

- [ ] Showing eval harness (#231) results next to the report (follow-up with #232).
- [ ] Any LLM call to write the summary (the issue says rule-based).
- [ ] Friendly display names for models (e.g. "Claude Sonnet 5.5"). The UI and exports use `provider:model` ids, as the backend Markdown/CSV do, so screen and exports match.
- [ ] Absolute deltas (e.g. "+180 ms p95"). The backend reports percent deltas (and percentage points for error rate); the screen shows those so it matches the exports. Absolute values are visible in each model's column.
- [ ] New frontend dependencies (e.g. `jspdf-autotable`). The PDF table is drawn with plain jsPDF.
- [ ] Changing providers/models from the UI, scheduling or emailing reports, authentication (Phase 5).
- [ ] Database schema changes. None needed.
- [ ] Rebuilding `static/` (`npm run build`).

---

## Acceptance Criteria (ACs)

1. **AC1: Per-feature table of every model with calls**
   **Given** `llm_calls` rows for several models in the selected date range
   **When** the user opens the "Comparison report" tab on `/admin/metrics`
   **Then** each feature (chat, feedback) shows one column per provider/model with calls, with sample size, date range covered, error rate, refusals, latency mean/p50/p95, mean input/output tokens per call, cost per call, cost per 1,000 calls and total cost.
   **And** changing the date range or feature filter refetches the report.

2. **AC2: Selectable baseline**
   **Given** the report is shown
   **When** the user picks a baseline model (default `mistral:mistral-large-latest`)
   **Then** the report refetches with `baseline=<provider:model>`, the baseline column is marked, every other column shows deltas against it, colored better/worse, and the URL keeps the choice.
   **And Given** the baseline has no calls for a feature **Then** that feature shows "no deltas" with the backend's warning.

3. **AC3: Plain-language summary per feature**
   **Given** a feature with at least two models that each have at least 20 calls (`MIN_SAMPLE_SIZE`)
   **Then** the summary names the cheapest (cost per 1,000 calls), fastest at p50, fastest at p95 and most reliable (lowest error rate) model, with values, naming ties.
   **And Given** a model below 20 calls **Then** it is left out of the rankings and named as excluded; if fewer than two models qualify, the summary says there is not enough data to name a winner.

4. **AC4: Caveats always visible and in exports**
   **Then** the report view always shows the notes (live traffic not controlled, quality from #231, latency basis, cost estimates, refusal detection), report warnings (sample size, unpriced calls, partial range, missing baseline, status filter), minimum sample size, and price `checked_on` dates with sources.
   **And** the Markdown, CSV and PDF exports contain the same caveats.

5. **AC5: Markdown, CSV and PDF exports match the screen**
   **When** the user clicks "Markdown", "CSV" or "PDF"
   **Then** a file downloads; Markdown/CSV come from `GET /metrics/llm/report?format=…` with the same filter parameters and baseline as the on-screen report, and the PDF is generated from the on-screen report data, with the same metrics, deltas, summary and caveats.

6. **AC6: Empty state for fewer than two models**
   **Given** a feature with calls from only one model
   **Then** that feature shows its single model's metrics and a notice explaining that a comparison needs traffic recorded under another model, naming `CHAT_PROVIDER`/`CHAT_MODEL` (chat) or `FEEDBACK_PROVIDER`/`FEEDBACK_MODEL` (feedback).
   **And Given** no calls match at all **Then** the report shows a single empty state with the same guidance.

7. **AC7: Stories, discovered tests, one Cypress E2E**
   **Then** each new component has a `.stories.tsx` (run by `npm run test`) and a `*.jest.test.tsx` (run by `npm run test:jest`), confirmed with `npx vitest list --filesOnly` and `npx jest --listTests`; `admin-metrics-report.cy.ts` visits the report, changes the baseline and exports CSV (download request intercepted), and runs in CI.

8. **AC8: README**
   **Then** the README describes the report tab, the exports, and how to generate comparison data (switching `CHAT_PROVIDER`/`FEEDBACK_PROVIDER` and models over time, and the #231 eval harness for controlled comparisons).

9. **AC9: 80%+ coverage on new components**
   **Then** `npm run test:jest:coverage` reports at least 80% statements/branches/functions/lines for each new file under `src/components/LLMMetrics/`, and backend coverage for `services/llm/metrics.py` stays at or above 80%.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Report endpoint** `GET /metrics/llm/report`: `routers/metrics.py:115-157`. Parameters `baseline` (default `DEFAULT_BASELINE`), `format` (`json|markdown|csv`), shared filters via `metrics_filters` (`routers/metrics.py:52-63`). Markdown/CSV returned with `Content-Disposition: attachment; filename="llm-model-report-YYYYMMDD-HHMM.ext"`.
- **Report builder** `build_report`: `services/llm/metrics.py:408-518`. Groups by feature then provider/model, baseline row first, deltas via `_deltas` (`:368`), warnings via `_row_warnings` (`:383`), constants `MIN_SAMPLE_SIZE = 20`, `DEFAULT_BASELINE`, `REPORT_NOTES` (`:33-51`).
- **Renderers** `render_report_markdown` (`:544`), `render_report_csv` (`:664`), `report_filename` (`:521`), `CSV_COLUMNS`/`CSV_DELTA_COLUMNS` (`:640-653`).
- **Schemas** `ModelReport`, `ReportMetadata`, `FeatureReport`, `ModelReportRow`, `ModelReportDeltas`, `ReportPriceInfo`: `schemas/llm_metrics.py:104-240`.
- **Backend tests**: `tests/test_llm_metrics.py` (report unit tests, Markdown/CSV at `:350-400`, CSV parsed with `csv.DictReader`), `tests/test_metrics_router.py:351-430` (endpoint tests).
- **Dashboard container** `LLMMetricsDashboard`: `frontend/src/components/LLMMetrics/LLMMetricsDashboard.tsx`. URL is the source of truth for filters; `useMetricsRequest` hook (local to the file) handles loading/error/retry and drops stale responses; panels wrapped in `MetricsPanel`.
- **Shared helpers** `metricsUtils.ts`: `filtersFromSearchParams`, `filtersToSearchParams`, `filtersToApiParams(filters, now)` (resolves presets to dates), `formatCost`, `formatLatency`, `formatPercent`, `formatNumber`, `formatDateTime`, `errorMessage`, `MISSING`, `NO_CALLS_MESSAGE`, `NO_MATCH_MESSAGE`.
- **Filter bar** `MetricsFilterBar.tsx` (date range presets/custom, feature, provider, model, status).
- **Fixtures** `frontend/src/components/LLMMetrics/fixtures.ts` (summary, timeseries, call log, pricing).
- **API client** `metricsApi` in `frontend/src/utils/api.ts:293-314`, `metricsQuery` helper (`:278`), generic `api<T>()` (JSON only, throws `Error(detail)` on non-2xx).
- **Types** `frontend/src/types/index.ts:931-1060` (LLM metrics types).
- **Page** `frontend/src/pages/AdminMetricsPage.tsx` (thin wrapper around the dashboard).
- **jsPDF usage pattern** `frontend/src/utils/pdfExport.ts` (dynamic `import('jspdf')`, A4, helvetica, manual layout) and its mock in `pdfExport.test.ts`.
- **Storybook API mocks** `frontend/src/testSetup.ts:87-140` (`mockMetricsApi`, mocked for `./utils/api` and `./utils/api.ts`).
- **Cypress** `frontend/cypress/e2e/admin-metrics.cy.ts` (stubs metrics endpoints with `cy.intercept`); CI spec list in `.github/workflows/cypress-tests.yml:69,131`.
- **Vite proxy**: `/metrics` already proxied (`frontend/vite.config.ts:33`); no new proxy entry needed.

### New Concepts Required

- **`FeatureSummary`** (backend schema + TS type): `text`, `compared_models`, `excluded_models`, `cheapest`, `fastest_p50`, `fastest_p95`, `most_reliable` (lists of `provider:model`, more than one on ties). Built by a new `_feature_summary(...)` in `services/llm/metrics.py`; `FeatureReport.summary: Optional[FeatureSummary]` (`None` when the feature has fewer than two models).
- **`ModelComparisonReport`** (container): fetches the report for the current date range/feature and baseline, owns the export actions, renders the sections below.
- **`ReportBaselineSelector`**: select of `provider:model` options.
- **`ReportFeatureSection`**: per-feature summary, side-by-side table with deltas, and the fewer-than-two-models empty state.
- **`ReportCaveats`**: notes, warnings, minimum sample size, price dates and sources.
- **`ReportExportBar`**: Markdown / CSV / PDF buttons with busy and error state.
- **`MetricsViewTabs`**: "Dashboard" / "Comparison report" tab switch.
- **`reportUtils.ts`**: metric row definitions (label, formatter, delta key, better direction), delta formatting/classification, baseline options, env-var hints per feature, `reportApiParams`, `saveBlob`.
- **`reportPdf.ts`**: `generateReportPDF(report)` building the PDF from the JSON (placed under `components/LLMMetrics/`, because `src/utils/**` is excluded from Jest coverage in `jest.config.cjs`).
- **URL params**: `view=report`, `baseline=provider:model` (omitted when default).

### Key Business Rules

- **Baseline default**: `mistral:mistral-large-latest` (`DEFAULT_BASELINE`).
- **Report filters**: the report applies the shared **date range** and **feature** filters only. Provider, model and status filters are not sent for the report (they would remove models from the comparison or skew error rates) and the report view says so.
- **Better/worse direction**: lower is better for latency (mean/p50/p95), cost per call and error rate. Token deltas are shown without a better/worse color. A delta of 0 or `null` is neutral.
- **Summary eligibility**: only models with `calls >= MIN_SAMPLE_SIZE` are ranked. Fewer than two eligible models → "Not enough data to name a winner for <feature>: …" listing each excluded model's call count. No summary when the feature has fewer than two models (empty state instead).
- **Summary rankings**: cheapest = lowest `cost_per_1000_calls_usd` among eligible models with a cost (models with no priced calls are skipped and mentioned); fastest p50/p95 = lowest `latency_p50_ms`/`latency_p95_ms`; most reliable = lowest `error_rate`. Ties name every tied model. Wording is factual ("had the lowest …"), never "best" or "winner".
- **Exports match screen**: Markdown/CSV requests reuse the exact API parameters (resolved dates) and baseline of the request that produced the on-screen report; the PDF is rendered from the on-screen JSON object.
- **Caveats always included**: notes, warnings, minimum sample size and price dates in every view and export.

---

## Strategic Approach

### Solution Direction

1. **Backend summary**: add `FeatureSummary` to `schemas/llm_metrics.py`, `_feature_summary(rows, feature)` in `services/llm/metrics.py`, set it in `build_report`. Add a "Summary" line per feature to `render_report_markdown`, and a `#` comment preamble to `render_report_csv`. Update `tests/test_llm_metrics.py` (CSV tests skip preamble lines before `DictReader`) and add router assertions.
2. **Frontend types/API**: report types; `metricsApi.getReport` (JSON via `api<T>`) and `metricsApi.downloadReport` (raw `fetch`, error `detail` handling, filename parsed from `Content-Disposition` with a fallback).
3. **View tabs**: `LLMMetricsDashboard` reads `view` from the URL; the filter bar stays shared; the dashboard panels render for the default view, `ModelComparisonReport` for `view=report`. Changing filters keeps `view` and `baseline` (today `handleFiltersChange` rebuilds the query string from filters only, so it must carry them over).
4. **Report components**: `ModelComparisonReport` → `ReportBaselineSelector`, `ReportExportBar`, `ReportCaveats`, `ReportFeatureSection` × features. Reuse `MetricsPanel` for loading/error/empty and `metricsUtils` formatters.
5. **PDF**: `reportPdf.ts`, A4 landscape, helvetica, ASCII-only text (no `Δ`, `−` or `–`, which jsPDF's built-in fonts can't render), header/metadata, caveats, then per feature summary and metric-by-model table, with page breaks.
6. **Tests**: Jest tests and stories per component; Jest tests for `reportUtils` and `reportPdf` (jsPDF mocked); Storybook mocks extended; one Cypress spec; CI workflow spec list.
7. **Docs**: README sections listed in Scope In.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Where to build the summary | Frontend-only: no backend change, but Markdown/CSV downloads lack it (fails "exports match screen"). Backend: one source of truth for all formats, small additive schema change. | **Backend** (`FeatureSummary` on `FeatureReport`). Approved by the user. |
| How CSV carries caveats | `#` comment preamble: header and rows unchanged, readable in spreadsheets, `pandas.read_csv(comment="#")` skips it; naive `DictReader` needs to skip lines. Trailing "notes" rows: break the tabular shape. Extra columns repeated per row: noisy. Separate file: two downloads. | **`#` comment preamble**. Approved by the user. |
| Markdown/CSV source | Backend `format` param (issue's stated approach) vs generating client-side. | **Backend `format`**, as the issue says, with the same resolved parameters as the on-screen request. |
| PDF source | Backend PDF needs a new Python dependency; jsPDF is already in the frontend. | **jsPDF from the on-screen JSON**. |
| Table orientation | Issue asks for one column per model; Markdown export has one row per model. | **One column per model** on screen and in the PDF (fits 2–5 models); Markdown/CSV keep their #236 layout. Same data. |
| Tab vs section | Section: report is far down a long page. Tab: focused view, shares filter bar. | **Tab** with `?view=report`. |
| Which filters apply to the report | All filters: provider/model filter could leave one model, status filter skews error rates. Date + feature only: what the issue says. | **Date range + feature only**, with a note in the report view. |
| Delta display | Backend gives percent (pp for error rate); issue example mentions "+180 ms". Absolute deltas would need new backend fields and would not be in exports. | **Percent / pp deltas**, matching exports. |
| Model names | Friendly names need a mapping table to maintain; ids match exports. | **`provider:model` ids**. |
| Where `reportPdf.ts` lives | `src/utils/**` is excluded from Jest coverage. | **`src/components/LLMMetrics/`**, next to `metricsUtils.ts`. |
| Download mechanism | Plain `<a href>`: simplest, but recomputes preset dates at click time and can't show errors. `fetch` + Blob: same params, error handling. | **`fetch` + Blob + object URL**. |

### Alternatives Considered

- **Generate Markdown/CSV in the frontend from JSON** - Rejected: the issue says to use the endpoint's `format` parameter, and it would duplicate the #236 renderers.
- **Frontend-only summary, spliced into downloaded Markdown** - Rejected: CSV would still lack it and it splits the wording logic in two places.
- **Add `jspdf-autotable`** - Rejected: new dependency (needs approval) for a table we can draw with plain jsPDF.
- **Separate `/admin/metrics/report` route** - Rejected: the issue wants a tab or section on `/admin/metrics` reusing its filters.
- **Absolute deltas in the backend** - Rejected for this issue: not in the ACs, would widen the API and CSV; can be a follow-up.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Backend changes in a "frontend" issue | The ACs (summary in exports, caveats in CSV) can't be met by the frontend alone. | Additive backend changes: `FeatureReport.summary`, Markdown summary line, CSV preamble. **Resolved: approved by the user (2026-11-14).** |
| CSV caveat format | Where the fixed notes, price dates and summaries go in a CSV. | `#` comment preamble before the unchanged header. **Resolved: approved by the user (2026-11-14).** |
| Which shared filters the report uses | Issue says "date range, feature"; the filter bar also has provider, model, status. | Date range + feature only; show a note in the report view. |
| "+180 ms p95" example | Absolute vs percent deltas. | Percent/pp deltas (match exports); absolute values shown in each model's column. |
| "Mistral Large, Claude Sonnet 5.5" naming | Friendly names vs ids. | `provider:model` ids, matching exports. |
| "Most reliable" definition | Lowest error rate, or also refusals? | Lowest `error_rate` (refusals are counted in errors). |
| "Cheapest" metric | Cost per call vs total cost. | Cost per 1,000 calls (same ranking as cost per call; independent of volume). |
| Summary when samples are small | "Don't declare a winner when the sample-size warning applies." | Rank only models with ≥ 20 calls; if fewer than two qualify, say there isn't enough data. |
| Single-model empty state | Hide the single model's metrics or show them? | Show its metrics table plus the notice (useful context, still an "empty comparison" state). |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| No calls match | Nothing to compare | Report-wide empty state with env-var guidance; caveats still shown; exports still available (they show "No calls match the filters"). |
| Feature with one model | No comparison possible | Per-feature notice naming that feature's env vars; no summary. |
| Baseline has no calls for a feature | No deltas | Columns show values without deltas; notice uses the backend warning; summary still computed (it doesn't depend on the baseline). |
| Baseline in URL that has no calls anywhere | Selector option missing | Add the current baseline to the options so the select stays valid. |
| Malformed `baseline` in URL | Backend returns 400 | Panel error state shows the backend `detail` with Retry; selector lets the user pick a valid one. |
| Model with no priced calls | Cost metrics are `null` | Show `–` on screen, `n/a` in PDF; excluded from "cheapest" and named in the summary. |
| All eligible models with 0 errors | Tie | "X and Y had no errors" (tie names all). |
| Latency `null` (all calls failed) | No latency to rank | Skip that model for p50/p95 rankings. |
| Many models (5+) | Wide table | Table scrolls horizontally on screen; PDF columns shrink, and wrap to a second table block if over 6 models. |
| Long warnings text in PDF | Overflow | `splitTextToSize` wrapping and page breaks. |
| Export request fails | User gets nothing | Export bar shows the error message; other buttons stay usable. |
| Filter change while export in flight | Stale export | Export uses the parameters of the on-screen report it was started from. |
| Preset range ("last 7 days") | Dates resolve at request time | The on-screen request's resolved params are stored and reused for exports. |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| CSV preamble breaks existing parsers | `tests/test_llm_metrics.py` CSV tests use `DictReader`; any external consumer reading row 1 as header | Update tests to skip `#` lines; document in README; endpoint is new (#236, merged today), so no known consumers. |
| jsPDF built-in fonts lack `Δ`, `−`, `–` | Garbled PDF text | ASCII-only strings in the PDF (`n/a`, `-`, "delta"); unit test asserts no non-Latin-1 characters reach `doc.text`. |
| Dynamic `import('jspdf')` under ts-jest | Test failures | `jest.mock('jspdf', …)` as a virtual-free mock; ts-jest compiles to CommonJS `require`, which the mock intercepts. Verify early. |
| Object URL download in jsdom/Cypress | `URL.createObjectURL` missing in jsdom | Stub it in Jest tests; in Cypress assert the intercepted request and the downloaded file. |
| Filter changes drop `view`/`baseline` | Report tab resets on every filter change | Carry `view` and `baseline` over in `handleFiltersChange`; Jest test for it. |
| Existing dashboard tests depend on exact query strings | Breakage | Default view writes no `view` param; run the full Jest suite. |
| Backend coverage for `services/llm/metrics.py` | Falls below 80% | Unit tests for each summary branch (ties, excluded, unpriced, not enough data, single model). |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Per-feature table, all models, all metrics | Yes | Uses existing report fields; adds unpriced calls row. |
| AC2 | Selectable baseline with deltas | Yes | Backend already supports `baseline`; selector + URL state. |
| AC3 | Summary names cheapest, fastest p50/p95, most reliable | Yes | Backend `FeatureSummary` (approved). |
| AC4 | Caveats always visible and in exports | Yes | CSV `#` preamble (approved). |
| AC5 | Markdown, CSV, PDF exports match screen | Yes | Same resolved params; PDF from on-screen JSON. Residual: a call recorded between the screen fetch and an open-ended export can appear in the download; documented. |
| AC6 | Empty state with env-var guidance | Yes | Per feature and report-wide. |
| AC7 | Stories, discovered tests, Cypress | Yes | New spec added to the CI spec list. |
| AC8 | README | Yes | |
| AC9 | 80%+ coverage | Yes | New files are under `components/LLMMetrics/` (included in Jest coverage). |

**AC Coverage Summary**: 9 of 9 ACs are addressable with the proposed approach (backend changes approved).

**Implicit Requirements Not in ACs**:
- Report view works at mobile width (the #237 dashboard has that standard): table scrolls inside its panel.
- Filter state, tab and baseline survive reload (URL).
- Existing dashboard behavior is unchanged in the default view.
- Report requests drop stale responses (reuse the `useMetricsRequest` pattern).

---

## REASONS Canvas

### Requirements
- Comparison report tab on `/admin/metrics` using the shared date range and feature filters.
- Baseline selector (default `mistral:mistral-large-latest`) with deltas colored better/worse.
- Per feature: one column per model with calls; sample size, date range, error rate, refusals, latency mean/p50/p95, mean input/output tokens, cost per call, cost per 1,000 calls, total cost.
- Rule-based, sample-size-aware summary naming the cheapest, fastest at p50 and p95, and most reliable model.
- Always-visible caveats, included in every export.
- Markdown and CSV export via the endpoint's `format`; PDF via jsPDF; exports match the screen.
- Empty state when a feature has fewer than two models, naming `CHAT_PROVIDER`/`FEEDBACK_PROVIDER`.
- Stories, discovered tests, one Cypress E2E, README, 80%+ coverage.

### Examples
- Feedback: Mistral (40 calls, $0.00290/call, p50 2,100 ms, p95 4,800 ms, 2.5% errors), Haiku (30 calls, $0.00110/call, p50 1,300 ms, p95 3,900 ms, 0% errors), Sonnet (25 calls, $0.00410/call, p50 1,600 ms, p95 3,100 ms, 4% errors), baseline Mistral → summary: "For feedback, anthropic:claude-haiku-5-5 had the lowest cost ($1.10 per 1,000 calls), the lowest p50 latency (1,300 ms) and the lowest error rate (0.0%); anthropic:claude-sonnet-5-5 had the lowest p95 latency (3,100 ms)." Haiku column shows cost "−62.1%" in green, Sonnet "+41.4%" in red.
- Same data but Sonnet has 12 calls → Sonnet excluded: "… (anthropic:claude-sonnet-5-5 excluded: 12 calls, below the minimum of 20)."
- Chat: Mistral 30 calls, Haiku 8 calls → "Not enough data to name a winner for chat: anthropic:claude-haiku-5-5 has 8 calls (minimum 20 per model)."
- Chat: only Mistral → no summary; notice: "Only one model has chat calls in this range. To compare, record traffic with another model, e.g. set `CHAT_PROVIDER=anthropic` and `CHAT_MODEL=claude-haiku-5-5`, restart the backend, and use the app for a while."
- Two models tied at 0% errors → "anthropic:claude-haiku-5-5 and mistral:mistral-large-latest had the lowest error rate (0.0%)."
- Baseline `anthropic:claude-haiku-5-5` selected → URL `?view=report&baseline=anthropic%3Aclaude-haiku-5-5`; request `GET /metrics/llm/report?baseline=anthropic:claude-haiku-5-5&…`.
- Range "7d" → on-screen request has `date_from=<resolved ISO>`; clicking CSV requests `…&format=csv` with the identical `date_from`.
- CSV starts with `# LLM model comparison report`, `# Generated: …`, `# Note: Live traffic is not a controlled comparison …`, `# Price: anthropic:claude-haiku-5-5 checked 2026-11-01 (https://…)`, `# Summary (feedback): …`, then the unchanged header row.
- Malformed baseline `?baseline=foo` → panel error "baseline must be 'provider:model', …" with Retry.

### Architecture
- Backend: router (`routers/metrics.py`) parses params; logic in `services/llm/metrics.py`; Pydantic schemas in `schemas/llm_metrics.py`. The summary is pure computation over `ModelReportRow`s inside `build_report`.
- Frontend: `AdminMetricsPage` → `LLMMetricsDashboard` (URL-backed state, shared filter bar) → `MetricsViewTabs` → dashboard panels or `ModelComparisonReport` → `ReportBaselineSelector`, `ReportExportBar`, `ReportCaveats`, `ReportFeatureSection`. API via `metricsApi` in `utils/api.ts`; types in `types/index.ts`; helpers in `LLMMetrics/reportUtils.ts`, PDF in `LLMMetrics/reportPdf.ts`.
- No new dependencies, routes, proxy entries or DB schema changes.

### Standards
- PEP 8, docstrings on new public Python functions; TypeScript strict types; ESLint clean (`npm run lint`), `npx tsc -b` clean.
- 80%+ coverage per new frontend file (Jest) and for `services/llm/metrics.py` (pytest).
- Each new component: `.stories.tsx` + `*.jest.test.tsx`; confirm discovery (`npx jest --listTests`, `npx vitest list --filesOnly`) and say in the PR how tests ran.
- README updated in the same PR; commit `feat(#238): …`; PR with `Closes #238`.

### Omissions
- #231 eval results alongside the report; LLM-written summaries; friendly model names; absolute deltas; new dependencies; backend PDF; auth; DB changes; `static/` rebuild; changing providers from the UI.

### Notes
- `handleFiltersChange` in `LLMMetricsDashboard.tsx` rebuilds the query string from filters only; it must preserve `view` and `baseline`.
- `api<T>()` always parses JSON, so downloads need a separate `fetch` path that reads `detail` from error JSON.
- `src/utils/**` and `src/pages/**` are excluded from Jest coverage; keep testable logic in `components/LLMMetrics/`.
- `MISSING` is an en dash (`–`), which jsPDF's helvetica can't render; use `n/a` in the PDF.
- CSV tests in `tests/test_llm_metrics.py:378-400` parse with `DictReader` from line 1; they need to skip `#` lines.
- Cypress downloads go to `frontend/cypress/downloads` (check it's git-ignored).

### Solutions
- Request-state pattern: `useMetricsRequest` in `LLMMetricsDashboard.tsx` (move it to its own module, `useMetricsRequest.ts`, so the report container can reuse it).
- Panel states: `MetricsPanel.tsx`. Formatting: `metricsUtils.ts`. Table styling: `MetricsBreakdownTable.tsx` and `.llm-metrics-*` classes in `frontend/src/styles/global.css`.
- PDF: `frontend/src/utils/pdfExport.ts` (dynamic import, manual layout) and the jsPDF mock in `pdfExport.test.ts`.
- Jest API mocking: `LLMMetricsDashboard.jest.test.tsx` (`jest.mock('../../utils/api', …)`).
- Cypress stubbing: `frontend/cypress/e2e/admin-metrics.cy.ts`.
- Backend report tests: `tests/test_llm_metrics.py` (`rows_for`, `report` helpers) and `tests/test_metrics_router.py`.
