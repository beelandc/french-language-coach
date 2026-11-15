# SPDD Prompt: Mistral vs Claude Model Comparison Report (Admin UI, with Export)

**GitHub Issue**: #238
**Issue Title**: Mistral vs Claude model comparison report in the admin interface, with export
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/238
**Artifact ID**: FLC-056-202611141808
**Created**: 2026-11-14 18:08
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [spdd/analysis/FLC-056-202611141726-[Analysis]-issue-238-model-comparison-report.md](../analysis/FLC-056-202611141726-[Analysis]-issue-238-model-comparison-report.md)

---

## Context

### Current Codebase State
- `GET /metrics/llm/report` (issue #236) returns a `ModelReport` (JSON) or a Markdown/CSV download. It has no per-feature summary, and the CSV carries only per-row warnings, without the fixed notes, report warnings or price check dates.
- `/admin/metrics` (issue #237) is a single dashboard view: URL-backed filters (`MetricsFilterBar`), panels wrapped in `MetricsPanel`, data loaded through a file-local `useMetricsRequest` hook in `LLMMetricsDashboard.tsx`.
- jsPDF (`^2.5.1`) is already a frontend dependency, used by `src/utils/pdfExport.ts`.
- `/metrics` is already proxied by Vite. No new proxy entry is needed.
- The user approved (2026-11-14): additive backend changes (`FeatureReport.summary`, a Markdown summary line, CSV caveats) and a `#` comment preamble for the CSV.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `schemas/llm_metrics.py` | Report Pydantic schemas | `FeatureReport` (~l.181), `ReportMetadata`, `ModelReport` |
| `services/llm/metrics.py` | Report builder and renderers | `MIN_SAMPLE_SIZE` (l.34), `REPORT_NOTES` (l.41), `build_report` (l.408), `render_report_markdown` (l.544), `CSV_COLUMNS` (l.640), `render_report_csv` (l.664) |
| `routers/metrics.py` | Report endpoint | `get_llm_report` (l.115-157), unchanged |
| `tests/test_llm_metrics.py` | Report unit tests | helpers `row`, `rows_for`, `price`, `report` (l.29-70); CSV tests (l.378-400) |
| `tests/test_metrics_router.py` | Endpoint tests | report tests (l.351-430) |
| `frontend/src/types/index.ts` | TS types | LLM metrics types (l.931-1060) |
| `frontend/src/utils/api.ts` | API client | `api<T>` (l.48), `metricsQuery` (l.278), `metricsApi` (l.293-314) |
| `frontend/src/components/LLMMetrics/LLMMetricsDashboard.tsx` | Dashboard container | `useMetricsRequest`, `handleFiltersChange`, panels |
| `frontend/src/components/LLMMetrics/metricsUtils.ts` | Shared helpers | `filtersToApiParams`, `filtersToSearchParams`, `formatCost`, `formatLatency`, `formatPercent`, `formatNumber`, `formatDateTime`, `errorMessage`, `MISSING` |
| `frontend/src/components/LLMMetrics/MetricsPanel.tsx` | Panel wrapper | props `title, loading, error, onRetry, empty, emptyMessage, testId, className, children` |
| `frontend/src/components/LLMMetrics/fixtures.ts` | Story/test fixtures | `sampleSummary`, `samplePricing`, … |
| `frontend/src/utils/pdfExport.ts`, `pdfExport.test.ts` | jsPDF pattern and mock | dynamic `import('jspdf')` |
| `frontend/src/testSetup.ts` | Storybook API mocks | `mockMetricsApi` (l.88) |
| `frontend/src/styles/global.css` | Styles | `.llm-metrics-*` (l.4768-5070) |
| `frontend/cypress/e2e/admin-metrics.cy.ts` | E2E pattern | `cy.intercept` stubs |
| `.github/workflows/cypress-tests.yml` | CI spec list | l.69, l.131 |
| `README.md` | Docs | endpoint row (l.404), Frontend Routes (l.440), metrics section (l.526-528), structure (l.258, l.343), test list (l.752) |

### Existing Patterns
- Backend: logic in `services/llm/metrics.py`, schemas in `schemas/`, routers thin. Tests are plain pytest classes using the `rows_for(...)` and `report(...)` helpers.
- Frontend: the URL query string is the source of truth. Panels use `MetricsPanel` for loading/error/empty states. Each component has a `.stories.tsx` (run by Vitest via Storybook) and a `*.jest.test.tsx` (run by Jest). Jest tests mock `../../utils/api` with `jest.mock`.
- `src/utils/**` and `src/pages/**` are excluded from Jest coverage, so testable logic stays in `components/LLMMetrics/`.

---

## Goal

**Primary Objective**: Add a "Comparison report" tab to `/admin/metrics` that shows the #236 model comparison report per feature, with a selectable baseline, deltas colored better/worse, a rule-based sample-size-aware summary, always-visible caveats, and Markdown/CSV/PDF exports that match the screen.

**Secondary Objectives**:
- Backend: a per-feature `summary` in the report, in JSON and Markdown; caveats and summaries in the CSV as a `#` preamble.
- Move `useMetricsRequest` into its own module so the report container can reuse it.
- Stories, discovered tests, one Cypress spec, README.

---

## Constraints

### Architecture Constraints
- No new dependencies (frontend or backend), routes, Vite proxy entries or DB changes.
- The API change only adds fields. The CSV header row and data columns stay unchanged; only `#` lines are added before them.
- The report sends **only** `date_from`, `date_to` and `feature` (plus `baseline`, and `format` for downloads). Provider, model and status filters are not applied to the report.
- Don't change the default dashboard view's behavior or URL. The default view writes no `view` param, and the default baseline writes no `baseline` param.
- Don't run `npm run build` (it overwrites `static/`).
- Don't change `routers/metrics.py` (the endpoint already accepts `baseline` and `format`).

### Code Quality Constraints
- PEP 8. Docstrings on new public Python functions. JSDoc header comments on new TS modules and components, matching the existing LLMMetrics files.
- TypeScript strict; `npm run lint` and `npx tsc -b` clean.
- PDF text is ASCII/Latin-1 only (jsPDF's helvetica can't render `Δ`, `−`, `–`).

### Testing Constraints
- Backend: pytest for every summary branch and the new export content; `services/llm/metrics.py` stays at 80% coverage or higher.
- Frontend: each new component gets a `.stories.tsx` **and** a `*.jest.test.tsx`; each new helper module gets a `*.jest.test.ts(x)`. Confirm discovery with `npx jest --listTests` and `npx vitest list --filesOnly`. At least 80% statements/branches/functions/lines per new file under `src/components/LLMMetrics/` (`npm run test:jest:coverage`).
- Existing Jest, Vitest/Storybook and pytest suites keep passing.
- One Cypress spec, added to both spec lists in `cypress-tests.yml`.

### Acceptance Criteria
From issue #238:
- [ ] The report shows, per feature, every model with recorded calls in the selected range, with the listed operational and cost metrics
- [ ] Deltas are computed against a selectable baseline (default Mistral `mistral-large-latest`)
- [ ] A plain-language summary per feature names the cheapest, fastest (p50 and p95) and most reliable model
- [ ] Caveats (sample size, unpriced calls, price dates, live-traffic and quality disclaimers) are always visible and included in exports
- [ ] The report can be exported as Markdown, CSV and PDF, and the exports match what is on screen
- [ ] Empty state when fewer than two models have data for a feature (explains how to switch providers with `CHAT_PROVIDER` / `FEEDBACK_PROVIDER`)
- [ ] Storybook stories and discovered tests for the new components; one Cypress E2E test covers viewing and exporting the report
- [ ] README documents the report and how to generate comparison data
- [ ] 80%+ coverage on new components

---

## Examples

### Input/Output Examples
1. **Summary, all eligible**: feedback rows Mistral (40 calls, $2.90 per 1,000, p50 2100, p95 4800, error rate 0.025), Haiku (30, $1.10, 1300, 3900, 0.0), Sonnet (25, $4.10, 1600, 3100, 0.04)
   - Expected `summary.text`: `For feedback, anthropic:claude-haiku-5-5 had the lowest cost per 1,000 calls ($1.10); anthropic:claude-haiku-5-5 had the lowest p50 latency (1,300 ms); anthropic:claude-sonnet-5-5 had the lowest p95 latency (3,100 ms); anthropic:claude-haiku-5-5 had the lowest error rate (0.0%).`
   - `cheapest == fastest_p50 == most_reliable == ["anthropic:claude-haiku-5-5"]`, `fastest_p95 == ["anthropic:claude-sonnet-5-5"]`, `excluded_models == []`.
2. **One model below the minimum**: same but Sonnet has 12 calls → Sonnet isn't ranked; text ends with ` Not ranked (fewer than 20 calls): anthropic:claude-sonnet-5-5 (12 calls).`
3. **Not enough data**: chat Mistral 30, Haiku 8 → `Not enough data to name a winner for chat: anthropic:claude-haiku-5-5 has 8 calls (minimum 20 per model).`; all leader lists empty.
4. **Single model**: `summary is None`; the frontend shows the empty-state notice naming `CHAT_PROVIDER` / `CHAT_MODEL`.
5. **Tie**: Haiku and Mistral both at 0 errors → `anthropic:claude-haiku-5-5 and mistral:mistral-large-latest had the lowest error rate (0.0%)`.
6. **Baseline change**: the user picks `anthropic:claude-haiku-5-5` → URL `?view=report&baseline=anthropic%3Aclaude-haiku-5-5`; request `/metrics/llm/report?baseline=anthropic%3Aclaude-haiku-5-5`.
7. **Export params**: range `7d` → the on-screen request has `date_from=<ISO>`; clicking CSV requests the identical `date_from` plus `format=csv`.

### Edge Cases
- No features → report-wide empty state with env-var guidance; caveats still shown; exports enabled.
- Baseline missing for a feature → values shown without deltas, plus a notice.
- Baseline from the URL not among the models → still listed in the selector.
- Malformed baseline → the 400 `detail` is shown in the panel error with Retry.
- Model with no priced calls → `–` on screen, `n/a` in PDF; not ranked for cost, listed as `(not priced: …)` in the cost clause; if no eligible model has a cost, the clause is `no model had priced calls, so cost is not ranked`.
- All calls failed (latency `null`) → skipped for latency rankings; if nobody has latency, that clause is omitted.
- Download error → message in the export bar; buttons usable again.
- Filter change → `view` and `baseline` preserved; `page` dropped (as today).
- More than 6 models → PDF table split into blocks of 6 model columns.

### Test Cases
```python
class TestFeatureSummary:
    def test_ranks_eligible_models(self):
        rows = (rows_for(MISTRAL, 20, feature="feedback", latency_ms=2000, estimated_cost_usd=0.003)
                + rows_for(HAIKU, 20, feature="feedback", latency_ms=1000, estimated_cost_usd=0.001))
        summary = report(rows).features[0].summary
        assert summary.cheapest == ["anthropic:claude-haiku-5-5"]
        assert summary.fastest_p95 == ["anthropic:claude-haiku-5-5"]
        assert summary.text.startswith("For feedback, ")

    def test_not_enough_data(self):
        rows = rows_for(MISTRAL, 20) + rows_for(HAIKU, 5)
        summary = report(rows).features[0].summary
        assert summary.text.startswith("Not enough data to name a winner for chat")
        assert summary.cheapest == [] and summary.excluded_models == ["anthropic:claude-haiku-5-5"]
```
```tsx
it('shows deltas colored by direction', () => {
  render(<ReportFeatureSection feature={sampleReport.features[0]} />)
  expect(screen.getByText('−62.1%')).toHaveClass('llm-report-delta-better')
})
```

---

## Deliverables

### Code Changes
- [ ] `schemas/llm_metrics.py`: `FeatureSummary`; `FeatureReport.summary: Optional[FeatureSummary] = None`
- [ ] `services/llm/metrics.py`: `build_feature_summary`, helpers, wiring in `build_report`, Markdown summary line, CSV preamble, shared filters-text helper
- [ ] `frontend/src/types/index.ts`: report types
- [ ] `frontend/src/utils/api.ts`: `metricsApi.getReport`, `metricsApi.downloadReport`, `filenameFromDisposition`
- [ ] `frontend/src/components/LLMMetrics/useMetricsRequest.ts` (moved from the dashboard)
- [ ] `frontend/src/components/LLMMetrics/reportUtils.ts`, `reportPdf.ts`
- [ ] Components: `MetricsViewTabs`, `ReportBaselineSelector`, `ReportExportBar`, `ReportCaveats`, `ReportFeatureSection`, `ModelComparisonReport`
- [ ] `LLMMetricsDashboard.tsx`: tabs, view/baseline URL state, dashboard panels moved into an inner `DashboardView` so the report view doesn't fire dashboard requests
- [ ] `fixtures.ts`: report fixtures; `testSetup.ts`: Storybook mocks
- [ ] `global.css`: tab and report styles, mobile-friendly
- [ ] `frontend/cypress/e2e/admin-metrics-report.cy.ts`; `.github/workflows/cypress-tests.yml`

### Tests
- [ ] pytest: summary branches, Markdown summary, CSV preamble, router JSON/CSV
- [ ] Jest: every new component, `reportUtils`, `reportPdf`, `useMetricsRequest`, API report functions; dashboard tab/URL behavior
- [ ] Storybook stories for every new component
- [ ] Cypress: view report, change baseline, export CSV

### Documentation
- [ ] README: endpoint row, metrics section (report tab, exports, generating comparison data), Frontend Routes row, project structure, test list
- [ ] Docstrings/JSDoc on new code

---

## Actual Prompt

```
Implement GitHub issue #238 in french-language-coach: a model comparison report tab on
/admin/metrics with baseline selection, summary, caveats and Markdown/CSV/PDF export.
Branch: feature/issue-238-model-comparison-report. Analysis:
spdd/analysis/FLC-056-202611141726-[Analysis]-issue-238-model-comparison-report.md

CONTEXT:
- Backend report: GET /metrics/llm/report (routers/metrics.py:115) → build_report
  (services/llm/metrics.py:408) → ModelReport (schemas/llm_metrics.py). Params: baseline
  (provider:model, default "mistral:mistral-large-latest"), format (json|markdown|csv),
  shared filters date_from/date_to/feature/provider/model/status. Markdown/CSV are
  downloads with Content-Disposition filename "llm-model-report-YYYYMMDD-HHMM.ext".
  MIN_SAMPLE_SIZE = 20. REPORT_NOTES holds the fixed caveats. Rows per feature:
  baseline first; each row has calls, successful_calls, errors, error_rate, refusals,
  latency_mean_ms/p50/p95 (successful calls), mean_input_tokens/mean_output_tokens,
  priced_calls, unpriced_calls, mean_cost_per_call_usd, cost_per_1000_calls_usd,
  total_cost_usd, first_call_at, last_call_at, deltas (pct; error_rate_pp in points;
  None for the baseline row or when the feature has no baseline), warnings.
- Frontend: /admin/metrics → AdminMetricsPage → LLMMetricsDashboard
  (components/LLMMetrics). URL query string is the source of truth (metricsUtils:
  filtersFromSearchParams, filtersToSearchParams, filtersToApiParams(filters, now) which
  resolves presets to ISO dates). File-local hook useMetricsRequest(requestKey, load)
  gives {data, loading, error, retry} and drops stale responses. MetricsPanel handles
  loading/error/empty. metricsApi in utils/api.ts uses api<T>() (JSON only, throws
  Error(detail)). jsPDF is a dependency (see utils/pdfExport.ts: dynamic import).
- Jest coverage excludes src/utils/** and src/pages/**; Jest only runs *.jest.test.* and
  __tests__/; Vitest runs Storybook stories (testSetup.ts mocks utils/api).
- User-approved decisions: (1) additive backend summary + export changes; (2) CSV
  caveats as a "#" comment preamble before the unchanged header row.

GOAL:
A) Backend
 1. schemas/llm_metrics.py: add
      class FeatureSummary(BaseModel): text: str; compared_models: list[str] = [];
        excluded_models: list[str] = []; cheapest: list[str] = []; fastest_p50: list[str] = [];
        fastest_p95: list[str] = []; most_reliable: list[str] = []
    (docstring: model keys are "provider:model", several on ties) and
    FeatureReport.summary: Optional[FeatureSummary] = None.
 2. services/llm/metrics.py: public build_feature_summary(feature, rows:
    list[ModelReportRow]) -> Optional[FeatureSummary]:
    - fewer than 2 rows → None.
    - eligible = rows with calls >= MIN_SAMPLE_SIZE; excluded = the rest.
    - fewer than 2 eligible → text "Not enough data to name a winner for {feature}: "
      + "; ".join("{key} has {calls} calls" for each excluded row)
      + " (minimum {MIN_SAMPLE_SIZE} per model)."; leader lists empty.
    - else build clauses in this order, each "{names} had the lowest {metric} ({value})":
        cost per 1,000 calls over eligible rows with cost_per_1000_calls_usd not None,
          value formatted by _money ($ with 2 decimals when >= 0.01, else up to 6
          decimals with trailing zeros trimmed); if some eligible rows have no cost,
          append " (not priced: {names})" to the clause; if none has a cost the clause
          is "no model had priced calls, so cost is not ranked";
        p50 latency, p95 latency ("{v:,} ms") over rows with a value (omit the clause
          if none);
        error rate ("{rate*100:.1f}%").
      Leaders = every row with the minimum value (ties). names joined "A", "A and B",
      "A, B and C". text = "For {feature}, " + "; ".join(clauses) + "."; if excluded,
      append " Not ranked (fewer than {MIN} calls): " + ", ".join("{key} ({calls}
      calls)") + ".". Fill compared_models, excluded_models and leader lists.
    - Never use "best"/"winner" except in "Not enough data to name a winner".
    - Call it in build_report: FeatureReport(..., summary=build_feature_summary(feature,
      report_rows)).
 3. render_report_markdown: in each feature section, after the "## Feature: x" heading
    and blank line, add "**Summary**: {text}" (or "**Summary**: Fewer than two models
    have calls for this feature, so there is nothing to compare.") then a blank line.
 4. render_report_csv: before the header, write "# "-prefixed lines:
      "# LLM model comparison report", "# Generated: {generated_at} UTC",
      "# Baseline: …", "# Filters: …" (same text as Markdown; extract a shared
      _filters_text(meta) helper), "# Date range covered: {from} to {to} UTC",
      "# Minimum sample size: N", "# Latency and token basis: …",
      one "# Note: …" per note, one "# Warning: …" per warning (or "# Warnings: none"),
      one "# Price: provider:model checked YYYY-MM-DD ({source})" per price,
      one "# Summary ({feature}): {text or the fewer-than-two-models sentence}" per
      feature. Replace CR/LF inside values with spaces. Header and rows unchanged.
B) Frontend types/API
 5. types/index.ts: ModelReportDeltas, ModelReportRow, FeatureSummary, FeatureReport,
    ReportPriceInfo, ReportMetadata, ModelReport (mirroring the schemas; datetimes as
    string | null), LLMReportFormat = 'markdown' | 'csv', LLMReportExportFormat =
    LLMReportFormat | 'pdf', LLMMetricsView = 'dashboard' | 'report',
    LLMReportApiParams = Pick<LLMMetricsApiParams, 'date_from' | 'date_to' | 'feature'>,
    ReportDownload { blob: Blob; filename: string }.
 6. utils/api.ts: metricsApi.getReport(params, baseline) → api<ModelReport>(
    `/metrics/llm/report${metricsQuery(params, { baseline })}`);
    metricsApi.downloadReport(params, baseline, format) → fetch the same URL plus
    format; on !ok read JSON detail (fallback "HTTP error! status: N") and throw Error;
    else return { blob, filename: filenameFromDisposition(header,
    `llm-model-report.${format === 'markdown' ? 'md' : 'csv'}`) }. Export
    filenameFromDisposition(header: string | null, fallback): parses filename="x" or
    filename=x.
C) Frontend components (all under components/LLMMetrics/)
 7. useMetricsRequest.ts: move the hook out of LLMMetricsDashboard.tsx unchanged
    (export it and RequestState).
 8. reportUtils.ts:
    - DEFAULT_BASELINE = 'mistral:mistral-large-latest'; modelKey(row).
    - viewFromSearchParams(params) ('report' only when view=report), baselineFromSearch
      Params(params) (trimmed, default DEFAULT_BASELINE).
    - reportApiParams(filters, now): filtersToApiParams then keep only date_from,
      date_to, feature. hasIgnoredReportFilters(filters): provider/model/status set.
    - baselineOptions(report | null, current): sorted unique keys from all features'
      rows, plus DEFAULT_BASELINE and current.
    - REPORT_METRICS: ordered list of {id, label, value(row) => string, delta?: keyof
      ModelReportDeltas, unit?: '%' | 'pp', direction: 'lower' | 'neutral'}:
        Sample size (calls; formatNumber), Date range (formatDateTime first → last),
        Error rate (formatPercent; error_rate_pp, pp, lower), Refusals,
        Latency mean / p50 / p95 (formatLatency; *_pct, lower),
        Mean input tokens / Mean output tokens (one decimal; *_pct, neutral),
        Cost per call (formatCost; mean_cost_per_call_pct, lower),
        Cost per 1,000 calls (formatCost), Total cost (formatCost), Unpriced calls.
    - formatDelta(value, unit, ascii=false): null → null; "+12.3%", "−62.1%",
      "+1.5 pp" (U+2212 minus on screen, "-" when ascii); 0 → "0.0%".
      classifyDelta(value, direction): 'better' (<0 and lower), 'worse' (>0 and lower),
      else 'neutral'.
    - envVarsForFeature(feature): chat → CHAT_PROVIDER/CHAT_MODEL, feedback →
      FEEDBACK_PROVIDER/FEEDBACK_MODEL, other → `${FEATURE}_PROVIDER/_MODEL`.
    - singleModelMessage(feature) and NO_REPORT_DATA_MESSAGE texts (see EXAMPLES).
    - pdfFilename(report) = llm-model-report-YYYYMMDD-HHMM.pdf from generated_at.
    - toPdfText(text): replace – — − with "-", Δ with "delta ", ≥ with ">=", ≤ "<=",
      then any char > U+00FF with "?".
    - saveBlob(blob, filename): object URL, temporary <a download>, click, revoke.
 9. reportPdf.ts: buildReportPdfContent(report) (pure: {title, metaLines, notes,
    warnings, prices, features: [{heading, summary, notice?, header: string[], rows:
    string[][]}]}, all strings via toPdfText; table cell = value + " (" + ascii delta
    + ")" when a delta exists; baseline header suffixed " (baseline)") and
    generateReportPDF(report): dynamic import('jspdf'), A4 landscape, mm, helvetica;
    title, metadata, "Caveats" (notes, warnings, minimum sample size, prices), then per
    feature heading, summary/notice (splitTextToSize), table (font 8; metric column
    50 mm, model columns share the rest; blocks of at most 6 model columns); addPage
    when y passes pageHeight - margin; doc.save(pdfFilename(report)).
10. MetricsViewTabs {view, onChange}: role="tablist" with two role="tab" buttons
    ("Dashboard", "Comparison report"), aria-selected, data-testid
    llm-metrics-tab-dashboard / llm-metrics-tab-report.
11. ReportBaselineSelector {value, options, onChange, disabled?}: labelled select
    "Baseline model" (data-testid report-baseline-select).
12. ReportExportBar {onExport(format: LLMReportExportFormat) => Promise<void>,
    disabled?}: buttons "Markdown", "CSV", "PDF" (data-testid report-export-<fmt>);
    while one runs all are disabled and its label is "Exporting…"; a rejected promise
    shows role="alert" with errorMessage(error); success clears it.
13. ReportCaveats {metadata}: always rendered, never collapsed, heading "Caveats":
    notes list; warnings list or "No warnings."; "Models with fewer than N calls are
    not ranked."; "Latency and token averages use {latency_basis}."; "Prices used"
    list "{provider}:{model}: checked {checked_on}" with a source link (sourceLabel
    from metricsUtils) or "No price entries for these models."
    data-testid report-caveats.
14. ReportFeatureSection {feature, baseline}: <section data-testid=
    "report-feature-{feature}">, heading "{Feature} report" (e.g. "Chat"), covered range.
    Fewer than 2 rows → notice (data-testid report-feature-empty-{feature}) with
    singleModelMessage, then still the table. Otherwise summary paragraph
    (data-testid report-summary-{feature}). If !baseline_present → notice "Baseline
    {baseline} has no calls for this feature, so no deltas are shown." Table in
    .llm-metrics-table-wrapper: header row "Metric" + one column per row
    (modelKey, "Baseline" badge on is_baseline); one body row per REPORT_METRICS item;
    each cell shows the value and, when a delta exists, a <span class="llm-report-delta
    llm-report-delta-{better|worse|neutral}"> with the formatted delta and a
    title like "vs baseline".
15. ModelComparisonReport {filters, baseline, onBaselineChange}:
    - request = useMetricsRequest(`report|${key}|${baseline}`, async () => { const
      params = reportApiParams(filters, new Date()); return { params, report: await
      metricsApi.getReport(params, baseline) } }), where key = the JSON of
      reportApiParams minus resolved dates (use filters.range, dateFrom, dateTo,
      feature).
    - When hasIgnoredReportFilters → note "The comparison report uses the date range
      and feature filters only. Provider, model and status filters apply to the
      dashboard."
    - Toolbar: ReportBaselineSelector (options from baselineOptions) + ReportExportBar
      (disabled until data). Export: markdown/csv → metricsApi.downloadReport(
      data.params, data.report.metadata.baseline, format) then saveBlob; pdf →
      generateReportPDF(data.report).
    - MetricsPanel title "Comparison report" (testId llm-metrics-report-panel) with
      loading/error/retry. With data: ReportCaveats, then either the report-wide empty
      state (data-testid report-empty, NO_REPORT_DATA_MESSAGE) when features is empty,
      or one ReportFeatureSection per feature.
16. LLMMetricsDashboard.tsx: import useMetricsRequest from the new module; read view
    and baseline from the URL; render MetricsViewTabs under the filter bar; move the
    existing summary/timeseries/calls/pricing requests and panels into an inner
    DashboardView component (props: filters, page, emptyMessage, onPageChange), so
    they only load in the dashboard view; the options request stays in the parent.
    handleFiltersChange keeps view and baseline params; handleViewChange sets/deletes
    view (and deletes page); handleBaselineChange sets baseline or deletes it when it
    equals DEFAULT_BASELINE.
17. global.css: .llm-metrics-tabs/.llm-metrics-tab/.llm-metrics-tab-active,
    .llm-report-toolbar (flex, wraps), .llm-report-note, .llm-report-notice,
    .llm-report-summary, .llm-report-caveats, .llm-report-feature,
    .llm-report-delta (block, small), -better (#065f46), -worse (#991b1b),
    -neutral (#6b7280); works at 375 px (table scrolls inside its wrapper).
D) Fixtures, stories, tests, E2E, docs
18. fixtures.ts: sampleReport (feedback: mistral baseline 40 calls, haiku 30, sonnet
    25, deltas, summary from EXAMPLES 1; chat: mistral 30, haiku 8 with "not enough
    data" summary), singleModelReport, noBaselineReport, emptyReport (features []).
    testSetup.ts: mockMetricsApi.getReport → sampleReport, downloadReport → {blob,
    filename}.
19. Stories (Vitest via Storybook) for the six components; Jest tests for the six
    components, reportUtils, reportPdf (jest.mock('jspdf') with a jsPDF class mock;
    assert save called with the pdf filename, text calls contain the summary, notes,
    prices, and no character > U+00FF), useMetricsRequest, and the API report
    functions (src/utils/api.report.jest.test.ts mocking global.fetch). Extend
    LLMMetricsDashboard.jest.test.tsx: tab switch writes view=report, filter change
    keeps view/baseline, report view doesn't call getSummary-only dashboard requests
    beyond the options call.
20. pytest: TestFeatureSummary (single model None; ranking; ties; excluded below min;
    not enough data; partial and fully unpriced; null latency); Markdown summary line
    (both variants); CSV preamble (lines start "#", has notes/prices/summary; data
    parsed with DictReader after skipping "#" lines; empty report → preamble + header);
    update existing CSV tests to skip "#" lines; router: JSON has features[].summary,
    CSV body starts with "# LLM model comparison report".
21. Cypress frontend/cypress/e2e/admin-metrics-report.cy.ts: stub GET /metrics/llm*
    (options), /metrics/llm/report JSON, and the csv variant (query format=csv) with
    a CSV body and Content-Disposition; visit /admin/metrics?view=report; assert the
    feature sections, summary and caveats; change the baseline → request carries
    baseline and the URL updates; click CSV → wait for the intercept and readFile
    cypress/downloads/<filename> contains "# LLM model comparison report". Add the spec
    to both --spec lists in .github/workflows/cypress-tests.yml.
22. README: endpoint row (summary field; CSV "#" preamble), metrics section paragraph
    (report tab, baseline, summary rules, caveats, exports) and a "Generating
    comparison data" subsection (switch CHAT_PROVIDER/CHAT_MODEL or
    FEEDBACK_PROVIDER/FEEDBACK_MODEL for a period, restart, use the app; at least 20
    calls per model; #231 eval harness for controlled comparisons), Frontend Routes
    row mentions the Comparison report tab, project structure for new files, test
    list entry for the Cypress spec.

CONSTRAINTS:
- No new dependencies, DB changes, routes or proxy entries; don't touch routers/metrics.py;
  don't run npm run build.
- CSV header and data columns unchanged; API changes additive.
- Report requests send only date_from/date_to/feature (+ baseline/format).
- Default dashboard URL and behavior unchanged.
- PEP 8, docstrings, JSDoc headers; lint + tsc clean.
- 80%+ coverage per new frontend file (Jest) and for services/llm/metrics.py.
- PDF strings ASCII/Latin-1 only.

EXAMPLES:
- Summary texts: see examples 1-5 in this artifact.
- singleModelMessage('chat'): "Only one model has chat calls in this range, so there
  is nothing to compare yet. To compare, record chat traffic under another model: set
  CHAT_PROVIDER and CHAT_MODEL in .env (e.g. CHAT_PROVIDER=anthropic,
  CHAT_MODEL=claude-haiku-5-5), restart the backend and use the app. Each model needs
  at least 20 calls to be ranked."
- NO_REPORT_DATA_MESSAGE: "No LLM calls match these filters, so there is nothing to
  compare. Comparison data comes from running the app under different models: switch
  CHAT_PROVIDER / CHAT_MODEL or FEEDBACK_PROVIDER / FEEDBACK_MODEL for a period, then
  come back."
- formatDelta(-62.1, '%') = "−62.1%", classifyDelta(-62.1, 'lower') = 'better';
  formatDelta(1.5, 'pp', true) = "+1.5 pp"; classifyDelta(8, 'neutral') = 'neutral'.
- filenameFromDisposition('attachment; filename="llm-model-report-20261114-1808.csv"',
  'x.csv') = "llm-model-report-20261114-1808.csv"; (null, 'x.csv') = "x.csv".

ACCEPTANCE CRITERIA (issue #238):
- Per feature, every model with calls in the range, with the listed metrics
- Deltas against a selectable baseline (default mistral:mistral-large-latest)
- Plain-language summary per feature names the cheapest, fastest (p50, p95), most reliable
- Caveats always visible and included in exports
- Markdown, CSV and PDF exports that match the screen
- Empty state when fewer than two models have data for a feature, naming
  CHAT_PROVIDER / FEEDBACK_PROVIDER
- Stories and discovered tests for new components; one Cypress E2E for view + export
- README documents the report and how to generate comparison data
- 80%+ coverage on new components

DELIVERABLES:
- Backend: schemas/llm_metrics.py, services/llm/metrics.py, tests/test_llm_metrics.py,
  tests/test_metrics_router.py
- Frontend: types/index.ts, utils/api.ts, utils/api.report.jest.test.ts,
  components/LLMMetrics/{useMetricsRequest.ts, reportUtils.ts, reportPdf.ts,
  MetricsViewTabs, ReportBaselineSelector, ReportExportBar, ReportCaveats,
  ReportFeatureSection, ModelComparisonReport (.tsx + .stories.tsx + .jest.test.tsx),
  LLMMetricsDashboard.tsx (+ test updates), fixtures.ts}, testSetup.ts, styles/global.css
- E2E: frontend/cypress/e2e/admin-metrics-report.cy.ts, .github/workflows/cypress-tests.yml
- README.md
- Verify: python3 -m pytest tests/ -v --tb=short; pytest --cov for services/llm/metrics.py;
  npm run test; npm run test:jest:coverage; npm run lint; npx tsc -b;
  npx jest --listTests and npx vitest list --filesOnly for discovery; Cypress spec if a
  backend + dev server can be run locally.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, 2026-11-14.

**Backend**
- `schemas/llm_metrics.py`: `FeatureSummary`; `FeatureReport.summary` (optional, added field only).
- `services/llm/metrics.py`: `build_feature_summary` (+ `_leaders`, `_join_names`, `_money`, `SINGLE_MODEL_SUMMARY`), wired into `build_report`; Markdown `**Summary**:` line per feature; CSV `#` preamble (`_csv_preamble`, `_comment`); shared `_filters_text`. Header row and data columns unchanged. `routers/metrics.py` untouched.

**Frontend**
- Types (`types/index.ts`) and `metricsApi.getReport` / `metricsApi.downloadReport` / `filenameFromDisposition` (`utils/api.ts`).
- `components/LLMMetrics/`: `useMetricsRequest.ts` (moved), `reportUtils.ts`, `reportPdf.ts`, `MetricsViewTabs`, `ReportBaselineSelector`, `ReportExportBar`, `ReportCaveats`, `ReportFeatureSection`, `ModelComparisonReport` (each with `.stories.tsx` and `.jest.test.tsx`; `reportUtils`, `reportPdf` and `useMetricsRequest` with Jest tests).
- `LLMMetricsDashboard.tsx`: tabs, `view`/`baseline` URL state, dashboard panels moved into an inner `DashboardView` (report view doesn't fire dashboard requests).
- `fixtures.ts` (report fixtures + `reportRow` helper), `testSetup.ts` (Storybook mocks), `global.css` (tabs, report, deltas, mobile).
- Cypress `admin-metrics-report.cy.ts`, added to both spec lists in `.github/workflows/cypress-tests.yml`.
- README: endpoint row, report tab paragraph, "Generating comparison data", Frontend Routes row, project structure, test list.

---

## Human Review Notes

### Changes Made
- [x] **`generateReportPDF(report, emptyMessage)`** takes the empty-state message as a second argument, and the PDF content is built by a separate pure `buildReportPdfContent` (plus exported `splitColumns`), so the "PDF matches the screen" checks can run without jsPDF.
- [x] **PDF single-model feature** prints the same notice as the screen (env-var guidance) instead of a "Summary:" line, so it matches what's on screen.
- [x] **`ReportFeatureSection`** gained a `minSampleSize` prop (from report metadata) so the empty-state text uses the backend's minimum. Its heading is the feature name ("Chat"), not "Chat report".
- [x] **Dropped `src/utils/api.report.jest.test.ts`.** ts-jest type-checks `utils/api.ts`, which has 5 type errors from before this branch (unused `LessonSummary`/`DeckSummary` imports, missing `SessionListResponse` import, two `!== ''` comparisons), so the suite can't compile. That's also why `src/utils/**` is excluded from Jest. Fixing them is outside #238. `downloadReport` and `filenameFromDisposition` are covered end to end by the Cypress spec (stubbed `Content-Disposition`, downloaded file read back).
- [x] **Unicode in `toPdfText` / `formatDelta`** is written as `\uXXXX` escapes, because the dash/minus look-alikes are hard to tell apart. The regex for "outside Latin-1" is `[\u0100-\uFFFF]`, not `[^\u0000-\u00FF]`, which trips ESLint `no-control-regex`.
- [x] **Summary wording** is one clause per metric (as in the prompt), not grouped by model.

### Quality Checks
- [x] Code follows existing patterns (URL state, `MetricsPanel`, `useMetricsRequest`, jsPDF dynamic import, `jest.mock` of `utils/api`)
- [x] Tests pass at 80%+ coverage
- [x] Documentation updated
- [x] All acceptance criteria met

### Issues Found
- **Pre-existing, not fixed (out of scope):** `npx tsc -b` and `npm run lint` already fail on `main` (Exercise components, `utils/api.ts`, `testSetup.ts`, empty interfaces in `types/index.ts`). New and changed report code adds no tsc or ESLint errors (`npx eslint src/components/LLMMetrics` is clean).
- **Residual export gap (documented):** for an open-ended range ("All time", presets), a call recorded between the on-screen fetch and a Markdown/CSV export can appear in the file. Exports reuse the exact resolved parameters; the PDF always uses the on-screen data.
- A Vite dev server was already running on :5173 from this checkout; Cypress ran against it (Vite serves source, so it reflected the branch).

---

## Verification

- [x] All acceptance criteria from issue #238 are met
  - AC1 per-feature table, every model, all metrics: `ReportFeatureSection` + tests
  - AC2 selectable baseline, colored deltas, URL state: `ReportBaselineSelector`, dashboard tests, Cypress
  - AC3 summary names cheapest, fastest p50/p95, most reliable; sample-size aware: `build_feature_summary` + `TestFeatureSummary` (12 tests)
  - AC4 caveats always visible and in exports: `ReportCaveats`; Markdown notes/warnings/prices (existing) + summary; CSV `#` preamble; PDF caveats section
  - AC5 Markdown/CSV/PDF exports match the screen: same params object (Jest), same baseline (Cypress), PDF from on-screen JSON (Jest)
  - AC6 empty states with `CHAT_PROVIDER` / `FEEDBACK_PROVIDER` guidance: per feature and report-wide
  - AC7 stories + discovered tests + Cypress: 6 new story files (`npx vitest list --filesOnly`), 9 new Jest files (`npx jest --listTests`), `admin-metrics-report.cy.ts`
  - AC8 README: report, exports, generating comparison data
  - AC9 coverage: see below
- [x] Tests pass with 80%+ coverage
  - `python3 -m pytest tests/`: **789 passed, 1 xfailed**
  - Coverage: `services/llm/metrics.py` **99%**, `schemas/llm_metrics.py` **100%**
  - `npm run test` (Vitest/Storybook): **36 files, 168 tests passed**
  - `npm run test:jest`: **23 suites, 261 tests passed**
  - Jest coverage, new files (stmts/branch/funcs/lines): `ModelComparisonReport` 96/90/100/100, `reportPdf` 99/94/100/100, `MetricsViewTabs`, `ReportBaselineSelector`, `ReportCaveats`, `ReportExportBar`, `ReportFeatureSection`, `reportUtils`, `useMetricsRequest` 100/100/100/100; `LLMMetricsDashboard` still 100%
  - Cypress (electron, local): `admin-metrics-report.cy.ts` 1/1 and `admin-metrics.cy.ts` 2/2 passed
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced (API fields added only; CSV header/columns unchanged; default dashboard URL unchanged; existing #237 tests pass unchanged apart from added mocks)
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
