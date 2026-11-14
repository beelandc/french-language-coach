# SPDD Prompt: Admin LLM Metrics Dashboard (Frontend)

**GitHub Issue**: #237
**Issue Title**: Admin LLM metrics dashboard (frontend)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/237
**Artifact ID**: FLC-054-202611140812
**Created**: 2026-11-14 08:12
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-054-202611140803-[Analysis]-issue-237-admin-llm-metrics-dashboard.md`

---

## Context

### Current Codebase State
- Issue #236 (PR #241, merged) exposes the LLM metrics analysis API: `GET /metrics/llm`, `/metrics/llm/calls`, `/metrics/llm/timeseries`, `/metrics/llm/pricing` (plus `/metrics/llm/report`, used by #238, not here). All except pricing accept the shared filters `date_from`, `date_to`, `feature`, `provider`, `model`, `status`.
- The frontend has no view of this data. `/metrics` is already proxied to the backend in `frontend/vite.config.ts`; `/admin/*` isn't proxied and is served by Vite in dev and by the SPA fallback (`main.py:112`) in production.
- The app has no footer. All CSS is in `frontend/src/styles/global.css`.
- Test runners: Jest runs only `*.jest.test.*` and `__tests__/`; its coverage excludes `src/pages/**`, `src/utils/**`, `src/hooks/**`, `src/types/**`. `npm run test` (Vitest) runs only Storybook stories, in headless Chromium, with `src/testSetup.ts` replacing the whole `utils/api` module with a fixed mock object (9 `vi.mock` factories). Plain `*.test.tsx` files aren't run by either.
- The Cypress CI workflow pins `--spec 'cypress/e2e/conversation-flow.cy.ts'` in two jobs.
- Human decisions (2026-11-14): **hand-rolled SVG charts (no new dependency)**; **a new minimal app footer** for the entry link; **add the new Cypress spec to CI**; **no text search** in the call log (shared filters only).

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `routers/metrics.py` | Metrics endpoints (contract) | `metrics_filters()` L51, `get_llm_metrics` L69, `list_llm_calls` L78 (`page`, `per_page` ≤ 100), `get_llm_timeseries` L98 (`bucket=hour\|day`), `get_llm_pricing` L113 |
| `schemas/llm_metrics.py` | Response shapes to mirror in TS | `LLMMetricsStats`, `LLMMetricsGroup`, `LLMMetricsResponse`, `LLMCallLogItem`, `LLMCallLogResponse`, `LLMTimeseriesPoint`, `LLMTimeseriesResponse` |
| `services/llm/pricing.py` | Price table shape | `PriceTier`, `LongContextTier`, `PriceEntry`, `PriceTable` L26-65 |
| `services/llm/metrics.py` | Date bound semantics | `parse_date_bound()` L109: `YYYY-MM-DD` = whole UTC day; ISO datetimes exact; naive = UTC |
| `frontend/src/utils/api.ts` | Typed API client | `api<T>()` L41 (throws `Error(detail)`), `sessionApi` L76, `vocabularyApi` L216, type re-exports L267 |
| `frontend/src/types/index.ts` | Shared TS types | `PaginationInfo` L169 |
| `frontend/src/App.tsx` | Routes | `<Routes>` block; header with home link |
| `frontend/src/testSetup.ts` | Storybook-Vitest module mocks | `mockSessionApi` + 9 `vi.mock(...)` factories |
| `frontend/jest.config.cjs` | Jest discovery and coverage | `testMatch`, `collectCoverageFrom` |
| `frontend/src/components/DeckBrowser.tsx` / `.stories.tsx` | Container with loading/error/empty + pagination; story pattern | — |
| `frontend/src/components/ReviewSession.jest.test.tsx` | Jest pattern with `jest.mock('../utils/api', ...)` | top of file |
| `frontend/cypress/e2e/conversation-flow.cy.ts` | Cypress pattern (`cy.intercept`, aliases) | `mockAllApiEndpoints()` |
| `frontend/cypress/support/index.ts` | `cy.getByTestId` command | L25 |
| `.github/workflows/cypress-tests.yml` | E2E CI | `--spec` at L69 and L131 |
| `README.md` | Frontend Routes table L419; "Cost and latency logging" L516; Frontend Tests L680 | — |

### Existing Patterns
- Function components with a default export, a JSDoc header naming the issue, and `data-testid` attributes on key elements.
- API domain objects in `utils/api.ts` built on `api<T>()`, with query strings built via `URLSearchParams`.
- Stories: `Meta`/`StoryObj` from `@storybook/react`, `tags: ['autodocs']`, `layout: 'padded'`; the preview already wraps every story in `MemoryRouter`.
- Jest tests: `@testing-library/react` (`render`, `screen`, `fireEvent`, `waitFor`), module mocks with `jest.mock(path, factory)`.

---

## Goal

**Primary Objective**: Build the `/admin/metrics` page, an admin dashboard over the #236 metrics API with shared URL-persisted filters, summary cards, a sortable breakdown table, SVG time-series and cost/latency charts, a paginated call log and a pricing panel. Every panel has loading, empty and error states and works on mobile and desktop.

**Secondary Objectives**:
- Typed `metricsApi` and metrics types.
- A low-key footer link to the page.
- A story and a discovered Jest test for each new component, with 80%+ coverage on new components.
- One Cypress spec, run in CI.
- README updates (route row, page description, no-auth caveat).

---

## Constraints

### Architecture Constraints
- **No new dependencies.** Charts are hand-rolled SVG.
- **No backend changes.** Don't touch `routers/`, `services/`, `schemas/`, `models/`, `main.py`.
- Page component `frontend/src/pages/AdminMetricsPage.tsx` stays thin. Logic lives in `frontend/src/components/LLMMetrics/` (components + `metricsUtils.ts`) so it counts toward Jest coverage.
- State: `useSearchParams` (URL is the source of truth) plus local component state. No context or store.
- Don't add a frontend route under `/metrics`. Don't run `npm run build` (it overwrites `static/`).
- No `import.meta` in new files (ts-jest compiles them as CommonJS).
- Prefix all new CSS classes with `llm-metrics-`. Put them in one block at the end of `global.css`, with a `@media (max-width: 768px)` section.

### Code Quality Constraints
- `npx tsc -b` and `npm run lint` must pass with no new errors.
- JSDoc on exported functions, components and props interfaces; comments only for non-obvious logic (UTC handling, percentile caveat).
- Accessibility: labelled form controls; `<th scope="col">`; sort buttons inside headers with `aria-sort` on the `<th>`; charts are `<svg role="img" aria-label="…">` with `<title>` on points; status conveyed by text, not colour alone.

### Testing Constraints
- Every new component gets a `*.jest.test.tsx` (discovered by `npm run test:jest`; verify with `npx jest --listTests`) and a `*.stories.tsx` (discovered by `npm run test`; verify with `npx vitest list --filesOnly`).
- `metricsUtils.ts` gets its own `metricsUtils.jest.test.ts`.
- Coverage: each file in `src/components/LLMMetrics/` at ≥ 80% statements, branches, functions and lines in `npm run test:jest:coverage`.
- Time-dependent helpers take `now` as a parameter; tests pass a fixed date.
- Jest tests for the dashboard mock `../../utils/api` with `jest.mock`.
- Add a `metricsApi` mock (with realistic sample data) to every `vi.mock` factory in `src/testSetup.ts`, hoisted like `mockSessionApi`, so the dashboard story renders under Vitest.
- Existing suites (pytest, Jest, Storybook-Vitest, conversation-flow Cypress) must still pass.

### Acceptance Criteria
- [ ] `/admin/metrics` shows summary cards, the per-model breakdown table, time-series charts, the call log and the pricing panel using the metrics API
- [ ] All panels respond to the shared filters; filters persist in the URL
- [ ] Call log paginates and links to session detail when a session id is present
- [ ] Empty, loading and error states are handled
- [ ] Works on mobile and desktop widths
- [ ] Each new component has a Storybook story and tests that are actually discovered by a test runner (state in the PR how they ran)
- [ ] One Cypress E2E test covers loading the page and applying a filter
- [ ] README documents the page in the Frontend Routes table
- [ ] 80%+ coverage on new components

---

## Examples

### Input/Output Examples
1. **URL → filters → API params** (`now = 2026-11-14T08:00:00Z`)
   - `?range=24h&provider=anthropic` → `{ range: '24h', provider: 'anthropic' }` → `{ date_from: '2026-11-13T08:00:00.000Z', provider: 'anthropic' }`, bucket `hour`
   - `?range=custom&date_from=2026-11-01&date_to=2026-11-07` → API `date_from=2026-11-01&date_to=2026-11-07`, bucket `day`
   - `` (empty) → `{ range: 'all' }` → no date params, bucket `day`
   - `?status=bogus&range=nope&page=-2` → `{ range: 'all' }`, page 1
2. **Filters → URL**: `{ range: 'all', feature: 'chat' }` → `feature=chat` (defaults omitted; `page` dropped on any filter change)
3. **Summary cards**: totals `{calls: 40, errors: 2, estimated_cost_usd: 0.0123, unpriced_calls: 0, latency_p50_ms: 820, latency_p95_ms: 2400}` → "40", "5.0%", "$0.0123", "820 ms", "2.40 s", "0"
4. **Cost per call**: `{calls: 10, unpriced_calls: 2, estimated_cost_usd: 0.004}` → `0.0005` → "$0.0005"; `{calls: 3, unpriced_calls: 3}` → `null` → "–"
5. **Cost formatting**: `12.5` → "$12.50"; `0.0123` → "$0.0123"; `0.000042` → "$0.000042"; `0` → "$0.00"
6. **Latency formatting**: `820` → "820 ms"; `2400` → "2.40 s"; `null` → "–"
7. **parseUtc**: `"2026-11-14T08:00:00"` → `Date` for 08:00 UTC; `"2026-11-14T08:00:00Z"` / `"…+01:00"` unchanged
8. **Series**: points for `chat/mistral/mistral-large-latest` on two days and `chat/anthropic/claude-sonnet-5-5` on one day → 2 series keyed `chat · mistral:mistral-large-latest` (2 points, time-sorted) and `chat · anthropic:claude-sonnet-5-5` (1 point)
9. **Call log**: `{status: 'error', error_message: 'refusal: ...', session_id: 12}` → "Error" badge, message row, link `href="/sessions/12"`; `session_id: null` → "—", no link; `pagination {total: 45, page: 1, per_page: 20, total_pages: 3}` → "Page 1 of 3", Previous disabled
10. **Error state**: `metricsApi.getSummary` rejects `Error('HTTP error! status: 500')` → summary and breakdown panels show that message and Retry; calls, charts and pricing still render

### Edge Cases
- No calls ever (unfiltered summary `totals.calls === 0`) → "No LLM calls recorded yet" in each data panel; pricing still renders.
- Filtered to nothing → "No calls match these filters".
- Single point in a series / single bucket overall → marker drawn, x-domain padded (no NaN in SVG attributes).
- All-zero values → y-domain `[0, 1]` fallback.
- Scatter: groups with no priced calls or `p95 === null` are excluded, with the caption "N not shown (no price or latency)".
- Custom range with from > to → inline validation message, Apply disabled.
- Call log page beyond the end (empty `calls`, `total > 0`) → "No calls on this page" plus a "Back to page 1" button.
- Stale responses after rapid filter changes are ignored (effect cleanup flag).
- Selected filter value not in the dropdown options (from a bookmark) → still shown as an option.
- `long_context` price tier → extra line "Over {threshold} tokens: …".

### Test Cases
```tsx
// metricsUtils.jest.test.ts
import { filtersFromSearchParams, filtersToApiParams, bucketForRange, formatCost, parseUtc, costPerCall } from './metricsUtils'

const NOW = new Date('2026-11-14T08:00:00Z')

test('24h preset resolves to an ISO date_from and hourly buckets', () => {
  const filters = filtersFromSearchParams(new URLSearchParams('range=24h&provider=anthropic'))
  expect(filtersToApiParams(filters, NOW)).toEqual({ date_from: '2026-11-13T08:00:00.000Z', provider: 'anthropic' })
  expect(bucketForRange(filters.range)).toBe('hour')
})

test('invalid URL values fall back to defaults', () => {
  expect(filtersFromSearchParams(new URLSearchParams('status=bogus&range=nope'))).toEqual({ range: 'all' })
})

test('parseUtc treats naive timestamps as UTC', () => {
  expect(parseUtc('2026-11-14T08:00:00').toISOString()).toBe('2026-11-14T08:00:00.000Z')
})

test('cost per call ignores unpriced calls', () => {
  expect(costPerCall({ calls: 10, unpriced_calls: 2, estimated_cost_usd: 0.004 })).toBeCloseTo(0.0005)
  expect(costPerCall({ calls: 3, unpriced_calls: 3, estimated_cost_usd: 0 })).toBeNull()
  expect(formatCost(0.000042)).toBe('$0.000042')
})
```

```tsx
// LLMMetricsDashboard.jest.test.tsx (sketch)
jest.mock('../../utils/api', () => ({
  metricsApi: { getSummary: jest.fn(), listCalls: jest.fn(), getTimeseries: jest.fn(), getPricing: jest.fn() },
}))

it('applies a provider filter to every panel and the URL', async () => {
  renderAt('/admin/metrics')
  await screen.findByTestId('llm-metrics-summary-cards')
  fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'anthropic' } })
  await waitFor(() => expect(metricsApi.listCalls).toHaveBeenLastCalledWith(expect.objectContaining({ provider: 'anthropic' }), 1, 20))
  expect(metricsApi.getTimeseries).toHaveBeenLastCalledWith(expect.objectContaining({ provider: 'anthropic' }), 'day')
  expect(currentSearch()).toContain('provider=anthropic')
})
```

---

## Deliverables

### Code Changes
- [ ] `frontend/src/types/index.ts`: metrics types
- [ ] `frontend/src/utils/api.ts`: `metricsApi` (+ type re-exports)
- [ ] `frontend/src/components/LLMMetrics/metricsUtils.ts`
- [ ] `frontend/src/components/LLMMetrics/MetricsPanel.tsx`
- [ ] `frontend/src/components/LLMMetrics/MetricsFilterBar.tsx`
- [ ] `frontend/src/components/LLMMetrics/MetricsSummaryCards.tsx`
- [ ] `frontend/src/components/LLMMetrics/MetricsBreakdownTable.tsx`
- [ ] `frontend/src/components/LLMMetrics/MetricsLineChart.tsx`
- [ ] `frontend/src/components/LLMMetrics/MetricsCostLatencyChart.tsx`
- [ ] `frontend/src/components/LLMMetrics/LLMCallLog.tsx`
- [ ] `frontend/src/components/LLMMetrics/LLMPricingPanel.tsx`
- [ ] `frontend/src/components/LLMMetrics/LLMMetricsDashboard.tsx`
- [ ] `frontend/src/components/LLMMetrics/fixtures.ts`: shared sample data for stories and tests (excluded from coverage only if the Jest config already excludes it; otherwise it's fully exercised)
- [ ] `frontend/src/pages/AdminMetricsPage.tsx`
- [ ] `frontend/src/App.tsx`: routes `/admin/metrics` and `/admin/metrics/`, minimal footer link
- [ ] `frontend/src/styles/global.css`: `llm-metrics-*` and `app-footer` styles
- [ ] `frontend/src/testSetup.ts`: `metricsApi` mock in every factory
- [ ] `.github/workflows/cypress-tests.yml`: add `cypress/e2e/admin-metrics.cy.ts` to both `--spec` lists

### Tests
- [ ] `*.jest.test.ts(x)` for `metricsUtils` and each of the 9 components
- [ ] `*.stories.tsx` for each of the 9 components (including loading/empty/error variants where relevant)
- [ ] `frontend/cypress/e2e/admin-metrics.cy.ts`: load the page with intercepted endpoints, apply a provider filter, assert the URL and request params; one mobile-viewport smoke check

### Documentation
- [ ] README: Frontend Routes row for `/admin/metrics`; a sentence in "Cost and latency logging" pointing to the page; a no-authentication caveat (Phase 5); Project Structure entry for `components/LLMMetrics/` if that section lists component files
- [ ] JSDoc on new exports
- [ ] This artifact: AI Response, Human Review Notes, Verification after implementation

---

## Actual Prompt

```
Implement GitHub issue #237: Admin LLM metrics dashboard (frontend), in the french-language-coach repo on branch feature/issue-237-admin-llm-metrics-dashboard.

CONTEXT:
- Backend (issue #236, merged) serves, under the Vite-proxied /metrics prefix:
  GET /metrics/llm                       -> { totals: LLMMetricsStats, groups: LLMMetricsGroup[] }
  GET /metrics/llm/calls?page&per_page   -> { calls: LLMCallLogItem[], pagination: PaginationInfo } (newest first, per_page <= 100)
  GET /metrics/llm/timeseries?bucket=hour|day -> { bucket, points: LLMTimeseriesPoint[] } (only buckets with calls)
  GET /metrics/llm/pricing               -> { currency, unit, description?, models: PriceEntry[] }
  Shared filters on all but pricing: date_from, date_to (YYYY-MM-DD = whole UTC day, or ISO datetime;
  naive = UTC), feature, provider, model, status (success|error). Bad dates -> 400 { detail }.
  Field names: see schemas/llm_metrics.py and services/llm/pricing.py (PriceEntry: provider, model,
  input_per_mtok, output_per_mtok, cache_read_per_mtok, long_context?: {threshold_tokens, input_per_mtok,
  output_per_mtok, cache_read_per_mtok}, checked_on, source, notes?). All datetimes are naive UTC strings.
- Frontend: React 19 + TS + react-router v7 + Vite. api<T>() in src/utils/api.ts throws Error(detail).
  PaginationInfo already exists in src/types/index.ts. All CSS lives in src/styles/global.css.
- Tests: Jest runs only *.jest.test.* (coverage excludes pages/, utils/, hooks/, types/); `npm run test`
  runs Storybook stories under Vitest/Chromium with src/testSetup.ts mocking the whole utils/api module.
  Cypress specs in frontend/cypress/e2e (cy.getByTestId exists); CI pins --spec in cypress-tests.yml.
- Approved decisions: hand-rolled SVG charts (no new deps); minimal app footer for the entry link;
  add the new Cypress spec to CI; no text search (shared filters only); default range = all time.

GOAL:
Add the /admin/metrics page:
1. Types (src/types/index.ts): LLMMetricsStats, LLMMetricsGroup, LLMMetricsResponse, LLMCallLogItem,
   LLMCallLogResponse, LLMTimeseriesPoint, LLMTimeseriesResponse, LLMPriceTier, LLMLongContextTier,
   LLMPriceEntry, LLMPriceTable, LLMMetricsRange ('24h'|'7d'|'30d'|'all'|'custom'),
   LLMMetricsFilters { range; dateFrom?; dateTo?; feature?; provider?; model?; status?: 'success'|'error' },
   LLMMetricsApiParams { date_from?; date_to?; feature?; provider?; model?; status? }, LLMTimeBucket.
2. metricsApi (src/utils/api.ts): getSummary(params), listCalls(params, page, perPage),
   getTimeseries(params, bucket), getPricing(). Build queries with URLSearchParams, skipping empty values.
3. src/components/LLMMetrics/metricsUtils.ts (pure, tested):
   - RANGE_OPTIONS (labels: Last 24 hours, Last 7 days, Last 30 days, All time, Custom range),
     DEFAULT_FILTERS = { range: 'all' }, CALL_LOG_PAGE_SIZE = 20
   - filtersFromSearchParams(sp) (sanitises unknown range/status; dateFrom/dateTo only for custom and only if
     YYYY-MM-DD), filtersToSearchParams(filters) (omit defaults), pageFromSearchParams(sp) (int >= 1 else 1)
   - filtersToApiParams(filters, now): 24h/7d/30d -> date_from = (now - N).toISOString(); custom -> dates as-is
   - bucketForRange(range): '24h' -> 'hour', else 'day'
   - isValidCustomRange(from?, to?)
   - parseUtc(s): append 'Z' if no offset/Z; formatDateTime (local), formatBucket(date, bucket) (UTC labels)
   - formatCost (>=1: 2dp; >=0.01: 4dp; >0: up to 6 significant digits, no exponent; 0 -> $0.00),
     formatLatency (<1000 'N ms', else 'N.NN s', null '–'), formatPercent (1dp), formatNumber (en-US grouping)
   - errorRate(stats) (null if calls 0), costPerCall(stats) = cost / (calls - unpriced) or null
   - seriesKey(group) = `${feature} · ${provider}:${model}`; buildSeries(points, valueFn) -> sorted
     [{ key, points: [{ time: Date, value: number }] }] with values null skipped
   - filterOptions(groups) -> { features, providers, models } sorted unique
   - SERIES_COLORS (8 colours readable on white)
4. Components (src/components/LLMMetrics/, default exports, JSDoc, data-testid, llm-metrics-* classes):
   - MetricsPanel { title, loading, error, onRetry?, empty?, emptyMessage?, children, testId? }: section with h2;
     loading -> role="status" "Loading…"; error -> role="alert" message + Retry button; empty -> message.
   - MetricsFilterBar { filters, options, onChange(filters) }: range select; custom -> two <input type="date">
     plus Apply (disabled + message when from > to; note "Dates are UTC days"); feature/provider/model/status
     selects ("All" option); keep a selected value even if absent from options; Clear filters button when
     not default. Labels: "Date range", "Feature", "Provider", "Model", "Status".
   - MetricsSummaryCards { totals }: Total calls, Error rate, Estimated cost, p50 latency, p95 latency,
     Unpriced calls (highlight class when > 0, with a hint that their cost is excluded).
   - MetricsBreakdownTable { groups }: columns Feature, Provider, Model, Calls, Errors, Input tokens,
     Output tokens, Cache-read tokens, Cost, Cost/call, p50, p95; click a header button to sort
     (toggle asc/desc, aria-sort); nulls sort last; default sort Calls desc; horizontally scrollable wrapper.
   - MetricsLineChart { title, series: {key, points, dashed?}[], bucket, formatValue, ariaLabel }:
     SVG viewBox 640x260, width 100%; time x-axis (min..max, padded when one value), y from 0 to
     max*1.1 (fallback 1), 4 y-ticks with formatValue, up to 6 x-tick labels via formatBucket; one path
     per series (if >= 2 points) + circle markers with <title> "key — label: value"; legend list below with
     colour swatch; caption "Buckets without calls are not shown". Never emit NaN.
   - MetricsCostLatencyChart { groups }: scatter, x = cost per call, y = p95 latency, one point per group
     with priced calls and non-null p95; <title> per point; legend; caption for excluded groups; empty
     message when no plottable groups.
   - LLMCallLog { calls, pagination, onPageChange }: columns Time, Feature, Provider, Model, Input/Output/
     Cache-read tokens, Latency, Cost, Status, Session; status badge (text "OK"/"Error"); error row
     (colSpan all) with error_message; session cell <Link to={`/sessions/${id}`}>#{id}</Link> or "—";
     Previous/Next buttons + "Page X of Y (N calls)"; past-the-end -> "No calls on this page" + "Back to page 1".
   - LLMPricingPanel { pricing }: table Provider, Model, Input, Output, Cache read (USD per 1M tokens),
     Checked on, Source (<a target="_blank" rel="noopener noreferrer">), notes and long-context line.
   - LLMMetricsDashboard (container, no props): useSearchParams -> filters + page; now captured per filter
     change; effects (each with a cancelled flag and its own {data, loading, error} + retry counter):
       options: metricsApi.getSummary({}) once  -> dropdown options + hasAnyCalls
       summary: getSummary(apiParams)           -> MetricsSummaryCards + MetricsBreakdownTable + scatter
       timeseries: getTimeseries(apiParams, bucket) -> 3 line charts: Calls over time (calls), Estimated cost
                   over time (estimated_cost_usd), Latency over time (p50 solid + p95 dashed, keys suffixed
                   " p50"/" p95")
       calls: listCalls(apiParams, page, CALL_LOG_PAGE_SIZE) -> LLMCallLog
       pricing: getPricing() once               -> LLMPricingPanel
     Filter change -> setSearchParams(filtersToSearchParams(next)) (drops page). Page change -> set page
     param (omit when 1). Empty message: hasAnyCalls === false -> "No LLM calls recorded yet", else
     "No calls match these filters". Panels: Summary, Breakdown by model, Trends (charts grid),
     Cost vs latency, Call log, Pricing. Leave the top of the dashboard free for a future tab bar (#238).
5. src/pages/AdminMetricsPage.tsx: h2 "LLM metrics", short intro, note "Admin page — no authentication
   until Phase 5", <LLMMetricsDashboard />.
6. App.tsx: routes /admin/metrics and /admin/metrics/; <footer className="app-footer"> after <main> with
   <Link to="/admin/metrics" data-testid="admin-metrics-link">Admin: LLM metrics</Link>.
7. global.css: llm-metrics-* block (cards grid auto-fit minmax(150px,1fr); charts grid 2 columns >= 900px;
   tables in overflow-x:auto wrappers; status badges; filter bar flex-wrap) + @media (max-width: 768px)
   (single column, full-width controls) + small muted .app-footer. No page-level horizontal scroll at 375px.

CONSTRAINTS:
- No new dependencies; no backend changes; no npm run build; no import.meta in new files.
- Logic in src/components/LLMMetrics/ (coverage counted); page stays thin.
- tsc -b and npm run lint clean. Accessible markup as described.
- Each component: <Name>.stories.tsx (autodocs, realistic variants incl. Loading/Empty/Error where the
  component owns them) and <Name>.jest.test.tsx; metricsUtils.jest.test.ts. Shared sample data in
  src/components/LLMMetrics/fixtures.ts.
- Add metricsApi (getSummary/listCalls/getTimeseries/getPricing as vi.fn resolving fixture-like data)
  to every vi.mock factory in src/testSetup.ts via one hoisted const.
- Jest dashboard tests mock '../../utils/api' and render inside MemoryRouter + Routes with a location
  probe to assert the URL.
- >= 80% statements/branches/functions/lines per file in src/components/LLMMetrics/.
- Existing tests keep passing.

EXAMPLES:
(see the Examples section of this artifact: URL/param mapping at now=2026-11-14T08:00:00Z, card values,
cost/latency formatting, parseUtc, series building, call log rendering, error isolation, edge cases)

ACCEPTANCE CRITERIA:
- /admin/metrics shows summary cards, breakdown table, time-series charts, call log and pricing panel from the API
- All panels respond to the shared filters; filters persist in the URL
- Call log paginates and links to session detail when a session id is present
- Empty, loading and error states are handled
- Works on mobile and desktop widths
- Each new component has a story and discovered tests (state in PR how they ran)
- One Cypress E2E test covers loading the page and applying a filter
- README documents the page in the Frontend Routes table
- 80%+ coverage on new components

DELIVERABLES:
- Code: types, metricsApi, metricsUtils, 9 components, fixtures, AdminMetricsPage, App.tsx routes + footer,
  global.css, testSetup.ts mock, cypress-tests.yml spec lists.
- Tests: Jest per component + utils; stories per component; cypress/e2e/admin-metrics.cy.ts (intercept all
  four endpoints, visit /admin/metrics, assert panels, select Provider=anthropic, assert URL and that the
  next /metrics/llm/calls request has provider=anthropic; iphone-x viewport check of no horizontal overflow).
- Docs: README route row, logging-section pointer, no-auth caveat; JSDoc.
- Verification: npx tsc -b, npm run lint, npm run test:jest:coverage, npm run test, npx jest --listTests,
  npx vitest list --filesOnly, Cypress spec(s) locally against the dev server, python3 -m pytest tests/ (regression).
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, on branch `feature/issue-237-admin-llm-metrics-dashboard`.

**Produced:**
- `frontend/src/types/index.ts`: metrics types (`LLMMetricsStats`, `LLMMetricsGroup`, `LLMMetricsResponse`, `LLMCallLogItem`, `LLMCallLogResponse`, `LLMTimeBucket`, `LLMTimeseriesPoint`, `LLMTimeseriesResponse`, `LLMPriceTier`, `LLMLongContextTier`, `LLMPriceEntry`, `LLMPriceTable`, `LLMMetricsRange`, `LLMCallStatus`, `LLMMetricsFilters`, `LLMMetricsApiParams`).
- `frontend/src/utils/api.ts`: `metricsApi` (`getSummary`, `listCalls`, `getTimeseries`, `getPricing`) built on `api<T>()` with a `metricsQuery()` helper that skips empty values.
- `frontend/src/components/LLMMetrics/`:
  - `metricsUtils.ts`: URL/filter mapping, preset resolution, bucket choice, formatting, UTC parsing, cost per call, series building, chart geometry (`chartFrame`, `niceScale`), pricing helpers
  - `MetricsPanel`, `MetricsFilterBar`, `MetricsSummaryCards`, `MetricsBreakdownTable`
  - `MetricsLineChart` and `MetricsCostLatencyChart`: hand-rolled SVG
  - `LLMCallLog`, `LLMPricingPanel`
  - `LLMMetricsDashboard`: the container, with a `useMetricsRequest` hook that keys each request and drops stale responses
  - `useContainerWidth.ts`, `fixtures.ts`
  - 10 `*.jest.test.ts(x)` files and 9 `*.stories.tsx` files
- `frontend/src/pages/AdminMetricsPage.tsx`; routes `/admin/metrics` and `/admin/metrics/` plus the app footer link in `App.tsx`.
- `frontend/src/styles/global.css`: `app-footer` and `llm-metrics-*` styles with a 768 px breakpoint.
- `frontend/src/testSetup.ts`: `mockMetricsApi` in all 8 `vi.mock` factories.
- `frontend/jest.polyfills.cjs` + `jest.config.cjs` `setupFiles`: TextEncoder/TextDecoder for react-router v7 under jsdom.
- `frontend/cypress/e2e/admin-metrics.cy.ts` (2 tests) and the spec added to both `--spec` lists in `.github/workflows/cypress-tests.yml`.
- README: Frontend Routes row, Project Structure entries, dashboard paragraph in "Cost and latency logging", no-auth caveat in Limitations, test file list.

---

## Human Review Notes

### Changes Made
Deviations from the prompt, found during implementation and the visual check (Playwright screenshots at 1280 px and 375 px):

- [x] **Charts draw at the container's real width** (`useContainerWidth` + `chartFrame(width)`) instead of a fixed 640×260 viewBox. With the fixed viewBox, axis text was ~5 px on a phone and oversized in the full-width scatter, and the last x label was clipped.
- [x] **Round axis ticks** (`niceScale`/`niceStep`: steps of 1, 2, 2.5, 5 × 10ⁿ) replace the planned `max * 1.1` domain with 4 even ticks, which produced ticks like 26/20/13/7. The last scatter x label is end-anchored.
- [x] **`formatCost` uses 3 significant digits below $0.01** (e.g. `$0.00145`) instead of "up to 6". The first version rounded 0.00145 to `$0.0014`; 6 digits would print noise such as `$0.00176366`.
- [x] **Mobile overflow fix:** `.llm-metrics-table-wrapper` got `position: relative`. The existing `.visually-hidden` class (position: absolute) on the pricing link text escaped the scroll box and widened the page to 560 px at 375 px. The Cypress phone-width test caught it.
- [x] **Table cells don't wrap** (they scroll instead). The call-log error text sits in a sticky, width-capped block, so it stays readable while the table scrolls.
- [x] **Scatter points are sorted by series key**, so each model has the same colour in every chart.
- [x] **Call log header reads "Time (local)"**, since times are shown in the viewer's time zone and chart buckets are labelled UTC.
- [x] **Panel headings are `<h3>`**, not `<h2>` as the prompt said, because the page heading "LLM metrics" is the `<h2>` under the app's `<h1>`.
- [x] **Jest polyfill (not in the prompt):** jsdom lacks `TextEncoder`, which react-router v7 needs at import time. No existing Jest test rendered a router. The polyfill lives in `frontend/jest.polyfills.cjs` (Jest `setupFiles`), not `setupTests.ts`, so it adds no `tsc` or ESLint errors.
- [x] **Cypress waits on provider-specific intercepts:** React StrictMode in dev fires each effect twice, so re-waiting on `@calls` could match an unfiltered request. The spec also follows the footer link, checks that the filter survives a reload, and checks for no horizontal page scroll at iPhone X width.
- [x] **Dashboard stories have `play` assertions** (Default, NoCallsYet) that run under Vitest, so the story run proves the `metricsApi` mock feeds real data into the panels.
- [x] `testSetup.ts` has 8 `vi.mock` factories, not 9 as the analysis said. All 8 have the mock.

### Quality Checks
- [x] Code follows existing patterns (function components, default exports, `data-testid`, API domain object, story/test conventions)
- [x] Tests pass at 80%+ coverage (new files: 100% statements/lines/functions, ≥ 91.66% branches per file)
- [x] Documentation updated (README)
- [x] All acceptance criteria met (see Verification)

### Issues Found
- **Pre-existing, unchanged:** `npx tsc -b` reports 69 errors and `npx eslint .` 166 problems (161 errors, 5 warnings), the same counts on `main` and on this branch. None are in new files.
- Story tests under Vitest are mostly render smoke tests. Behaviour is covered by the Jest tests.
- The scatter's narrow-width tick branch (`plotWidth < 400`) isn't hit in jsdom (no layout), hence 91.66% branches on that file. It was checked visually at 375 px.

---

## Verification

- [x] All acceptance criteria from issue #237 are met:
  - [x] AC1: `/admin/metrics` shows summary cards, breakdown table, three time-series charts, the cost/latency scatter, the call log and pricing from the API (Jest dashboard test, Cypress, screenshots)
  - [x] AC2: every data panel refetches on filter change; filters live in the URL and survive a reload (Jest + Cypress)
  - [x] AC3: call log pages via `?page=N`, resets to page 1 on a filter change, links `/sessions/:id`, shows error messages (Jest + Cypress)
  - [x] AC4: loading, error with Retry (isolated per panel), "No LLM calls recorded yet" vs "No calls match these filters" (Jest + stories)
  - [x] AC5: no horizontal page scroll at 375 px (Cypress `iphone-x` test, Playwright measurement); desktop layout checked at 1280 px
  - [x] AC6: 9 components with stories (discovered by `npx vitest list --filesOnly`) and Jest tests (discovered by `npx jest --listTests`: 10 LLMMetrics test files + the hook test)
  - [x] AC7: `cypress/e2e/admin-metrics.cy.ts`, added to the CI workflow
  - [x] AC8: README Frontend Routes row
  - [x] AC9: ≥ 80% coverage per new file
- [x] Tests pass:
  - `npm run test:jest`: 14 suites, 194 tests passed (coverage via the standard config: `components/LLMMetrics` 100% statements / 98.99% branches)
  - `npm run test` (Storybook/Vitest): 30 files, 149 tests passed
  - Cypress (Chrome, local dev server, retries on): `conversation-flow.cy.ts` 23/23, `admin-metrics.cy.ts` 2/2. Also passed with `--config retries=0`.
  - `python3 -m pytest tests/`: 757 passed, 1 xfailed (regression check; no backend changes)
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced (no backend changes, no new dependencies; `static/` not rebuilt)
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
