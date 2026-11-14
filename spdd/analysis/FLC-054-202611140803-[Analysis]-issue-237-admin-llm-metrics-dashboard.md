# SPDD Analysis: Admin LLM Metrics Dashboard (Frontend)

**GitHub Issue**: #237
**Issue Title**: Admin LLM metrics dashboard (frontend)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/237
**Artifact ID**: FLC-054-202611140803
**Created**: 2026-11-14 08:03
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Add an admin page in the React frontend for viewing and analysing the LLM call metrics captured by the provider layer (#228): overall totals, per-model breakdowns, latency and cost trends, and a searchable call log.
>
> Today the only ways to see the metrics are calling `GET /metrics/llm` directly (curl or the FastAPI `/docs` page) or querying the `llm_calls` table in SQLite.
>
> **Depends on:** #236 (metrics analysis API: filters, call log, time series, pricing), building on #228
> **Related:** #238 (comparison report UI, adds a report tab to this page)
>
> ## Design
> - **Route:** `/admin/metrics` (page component in `frontend/src/pages/`, wired in `App.tsx`). Don't use a frontend route under `/metrics`: that prefix is proxied to the API in `vite.config.ts`.
> - **Filters bar:** date range (presets such as last 24h, 7 days, 30 days, all time, plus custom), feature, provider, model, status. Filter state is kept in the URL query string so views can be bookmarked.
> - **Summary cards:** total calls, error rate, total estimated cost, p50 and p95 latency, unpriced calls.
> - **Breakdown table:** one row per feature, provider and model with calls, errors, tokens, cost, cost per call and p50/p95 latency; sortable columns.
> - **Charts:** calls and estimated cost over time, and p50/p95 latency over time, per model (from the time-series endpoint), plus a cost-per-call vs p95-latency comparison by model.
> - **Call log:** paginated table of individual calls (time, feature, provider, model, tokens, latency, cost, status), with error messages shown for failed calls and a link to the session when `session_id` is set.
> - **Pricing panel:** the price table in use, with `checked_on` dates and source links.
> - **Navigation:** a low-key entry point (e.g. an "Admin" link in the footer or settings area); it doesn't need to be in the main learner navigation.
> - Typed API functions in `frontend/src/utils/api.ts` and types in `frontend/src/types/index.ts`.
> - Loading, empty ("No LLM calls recorded yet") and error states for every panel; responsive layout.
>
> ## Acceptance criteria
> - [ ] `/admin/metrics` shows summary cards, the per-model breakdown table, time-series charts, the call log and the pricing panel using the metrics API
> - [ ] All panels respond to the shared filters; filters persist in the URL
> - [ ] Call log paginates and links to session detail when a session id is present
> - [ ] Empty, loading and error states are handled
> - [ ] Works on mobile and desktop widths
> - [ ] Each new component has a Storybook story and tests that are actually discovered by a test runner (see the CLAUDE.md frontend test-discovery gotcha; state in the PR how they ran)
> - [ ] One Cypress E2E test covers loading the page and applying a filter
> - [ ] README documents the page in the Frontend Routes table
> - [ ] 80%+ coverage on new components
>
> ## Notes
> - **Chart library is an architectural decision.** Options: a small charting dependency (e.g. Recharts) or hand-rolled SVG charts (no new dependency). Decide in the SPDD analysis and get human approval before adding a dependency.
> - **Access control:** there is no authentication until Phase 5 (VISION.md), so the page is reachable by anyone who can reach the app. That's acceptable for the current single-user local setup; note it in the README and revisit with auth.
> - `npm run build` overwrites `static/`; only build if needed and review the diff.

---

## Background

Issue #228 added a provider layer (`services/llm/`) that writes one `llm_calls` row per Mistral or Claude call: tokens, latency, estimated cost and status. Issue #236 (merged in PR #241) added the analysis API on top of it: shared filters, a paginated call log, hourly/daily time series, the price table and a model comparison report. All of it is reachable only through raw HTTP today.

The "Model evaluation (Claude vs Mistral)" milestone needs a way to *look at* this data while switching `CHAT_PROVIDER` / `FEEDBACK_PROVIDER` between providers: how many calls each model has served, what they cost, how latency behaves over time, and which calls failed and why. This issue is the read-only frontend for those endpoints. Issue #238 will add a comparison report tab to the same page, so the layout must leave room for that.

---

## Business Value

- Makes the Claude-vs-Mistral comparison visible without curl, SQL or the `/docs` page.
- Surfaces cost early: total estimated spend, cost per call and unpriced calls (a missing price entry silently drops cost from the totals).
- Speeds up debugging: failed calls are listed with their error messages and a link to the affected session.
- Shows whether the price table is current (`checked_on` dates and source links), so cost estimates can be trusted or refreshed.
- Bookmarkable filtered views (URL state) make it easy to come back to a given comparison.

---

## Scope In

- [ ] New route `/admin/metrics` → `frontend/src/pages/AdminMetricsPage.tsx`, wired in `App.tsx` (plus the `/admin/metrics/` trailing-slash variant, matching existing routes).
- [ ] Typed API client `metricsApi` in `frontend/src/utils/api.ts`: `getSummary`, `listCalls`, `getTimeseries`, `getPricing`, each taking the shared filters.
- [ ] TypeScript types in `frontend/src/types/index.ts` mirroring `schemas/llm_metrics.py` and `services/llm/pricing.py` (`LLMMetricsStats`, `LLMMetricsGroup`, `LLMMetricsResponse`, `LLMCallLogItem`, `LLMCallLogResponse`, `LLMTimeseriesPoint`, `LLMTimeseriesResponse`, `LLMPriceEntry`, `LLMPriceTable`, `LLMMetricsFilters`).
- [ ] Filters bar: date range presets (24h, 7d, 30d, all time, custom from/to dates), feature, provider, model, status; state in the URL query string; a "Clear filters" action.
- [ ] Summary cards: total calls, error rate, total estimated cost, p50 and p95 latency, unpriced calls.
- [ ] Breakdown table: one row per feature/provider/model; calls, errors, input/output/cache-read tokens, cost, cost per call, p50/p95 latency; sortable by any column.
- [ ] Charts: calls over time, estimated cost over time, p50/p95 latency over time (series per feature/provider/model), and a cost-per-call vs p95-latency scatter by model.
- [ ] Call log: paginated table (time, feature, provider, model, tokens, latency, cost, status), error message shown for failed calls, link to `/sessions/:sessionId` when `session_id` is set; page number in the URL.
- [ ] Pricing panel: provider, model, input/output/cache-read prices per million tokens, long-context tier when present, `checked_on`, source link, notes.
- [ ] A shared panel wrapper with loading, error and empty states used by every panel.
- [ ] A low-key "Admin: LLM metrics" link in a new minimal app footer in `App.tsx`.
- [ ] Responsive CSS in `frontend/src/styles/global.css` (cards wrap, tables scroll horizontally, charts scale via `viewBox`).
- [ ] Storybook story and Jest tests (`*.jest.test.tsx`) for every new component; Storybook mocks for `metricsApi` in `src/testSetup.ts`.
- [ ] One Cypress spec `frontend/cypress/e2e/admin-metrics.cy.ts` (load page, apply a filter) and adding it to `.github/workflows/cypress-tests.yml`, which currently runs only `conversation-flow.cy.ts`.
- [ ] README: Frontend Routes table row, a short description in the cost/latency logging section, and the no-authentication caveat.

## Scope Out

- [ ] The model comparison report UI and the report tab (issue #238). This page only leaves room for it.
- [ ] Any backend changes. The #236 API is used as-is. Filter dropdown options come from the existing summary endpoint, not a new "distinct values" endpoint.
- [ ] Authentication or access control for `/admin/*` (Phase 5, VISION.md). Documented as a caveat only.
- [ ] Full-text search of call error messages. The API has no text search; the issue's "searchable call log" is met by the shared filters (feature, provider, model, status, dates).
- [ ] Exporting data (CSV/Markdown export belongs to the report, #238).
- [ ] Auto-refresh / live polling.
- [ ] Editing the price table from the UI.
- [ ] Changing providers or models from the UI.
- [ ] Rebuilding `static/` (`npm run build`). Not needed for the issue; CI and dev mode use the Vite dev server.

---

## Acceptance Criteria (ACs)

1. **AC1: Page shows every panel from the metrics API**
   **Given** the backend has `llm_calls` rows and serves the #236 endpoints
   **When** the user opens `/admin/metrics`
   **Then** the page shows summary cards, the breakdown table, the time-series charts, the cost/latency comparison, the call log and the pricing panel, populated from `GET /metrics/llm`, `/metrics/llm/timeseries`, `/metrics/llm/calls` and `/metrics/llm/pricing`.

2. **AC2: Shared filters drive every panel and persist in the URL**
   **Given** the dashboard is open
   **When** the user picks a date preset, a custom range, a feature, provider, model or status
   **Then** the URL query string updates (e.g. `?range=7d&provider=anthropic`), every data panel refetches with the matching API parameters, and reloading or opening that URL restores the same view.
   **And** the pricing panel, which has no filters in the API, stays as it is.

3. **AC3: Call log paginates and links to sessions**
   **Given** more matching calls than fit on one page
   **When** the user clicks Next / Previous
   **Then** the next page loads (`page` in the URL), the controls show "Page X of Y", and changing a filter resets to page 1.
   **And Given** a call has a `session_id`
   **Then** its row links to `/sessions/<session_id>`; calls without a session show no link.
   **And Given** a call has status `error`
   **Then** its error message is shown with the row.

4. **AC4: Empty, loading and error states**
   **Given** a panel's request is in flight **Then** that panel shows a loading indicator.
   **Given** a request fails **Then** that panel shows an error message (the API's `detail` when present) and a Retry button, and other panels are unaffected.
   **Given** no calls have ever been recorded **Then** panels show "No LLM calls recorded yet".
   **Given** calls exist but none match the filters **Then** panels show "No calls match these filters".

5. **AC5: Mobile and desktop widths**
   **Given** a 375 px wide viewport **Then** cards stack, the filter bar wraps, tables scroll horizontally inside their panel and charts scale, with no page-level horizontal scroll.
   **Given** a desktop viewport **Then** cards sit in a row and charts sit side by side where space allows.

6. **AC6: Stories and discovered tests for each new component**
   **Given** each new component
   **Then** it has a `.stories.tsx` file (run as tests by `npm run test`) and a `*.jest.test.tsx` file (run by `npm run test:jest`), confirmed with `npx jest --listTests` and `npx vitest list --filesOnly`, and the PR says how they ran.

7. **AC7: One Cypress E2E test**
   **Given** the metrics endpoints stubbed with `cy.intercept`
   **When** the spec visits `/admin/metrics` and changes a filter
   **Then** the panels render, the URL gains the filter and the intercepted requests carry the filter parameter. The spec runs in the Cypress CI workflow.

8. **AC8: README route documentation**
   **Then** the Frontend Routes table has a `/admin/metrics` row, and the README notes the page has no authentication until Phase 5.

9. **AC9: 80%+ coverage on new components**
   **Then** `npm run test:jest:coverage` reports at least 80% statements/branches/functions/lines for each file under `src/components/LLMMetrics/`.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **`llm_calls` row / `LLMCall` model**: one row per provider call (`models/` via the #228 provider layer). `created_at` is stored as **naive UTC**.
- **Metrics endpoints**: `routers/metrics.py`
  - `GET /metrics/llm` → `LLMMetricsResponse { totals, groups[] }` (`routers/metrics.py:69`)
  - `GET /metrics/llm/calls?page&per_page` → `LLMCallLogResponse { calls[], pagination }`, newest first, `per_page` ≤ 100 (`routers/metrics.py:78`)
  - `GET /metrics/llm/timeseries?bucket=hour|day` → `{ bucket, points[] }`, only buckets with calls (`routers/metrics.py:98`)
  - `GET /metrics/llm/pricing` → `PriceTable { currency, unit, description, models[] }` (`routers/metrics.py:113`)
  - Shared filters `date_from`, `date_to`, `feature`, `provider`, `model`, `status` via `metrics_filters` (`routers/metrics.py:51`); invalid dates or `date_from > date_to` → 400 with `detail`.
- **Date bound semantics**: `parse_date_bound` (`services/llm/metrics.py:109`): `YYYY-MM-DD` covers the whole UTC day; ISO datetimes are exact, `Z`/offsets are converted to UTC.
- **Schemas**: `schemas/llm_metrics.py` (`LLMMetricsStats`, `LLMMetricsGroup`, `LLMCallLogItem`, `LLMTimeseriesPoint`); `PriceEntry`/`PriceTable` in `services/llm/pricing.py:40-65`; `PaginationInfo` already typed in `frontend/src/types/index.ts:169`.
- **API client**: generic `api<T>()` in `frontend/src/utils/api.ts:41`; throws `Error(detail)` on non-2xx. Domain objects `sessionApi`, `grammarApi`, `vocabularyApi`.
- **Routing**: `frontend/src/App.tsx` (react-router v7). No existing footer.
- **Vite proxy**: `/metrics` → backend (`frontend/vite.config.ts`); `/admin` is not proxied, so it is served by Vite / the SPA fallback (`main.py:112`).
- **Session detail route**: `/sessions/:sessionId` → `SessionDetailPage`.
- **Test infrastructure**: Jest (`*.jest.test.tsx`, `frontend/jest.config.cjs`, coverage excludes `pages/`, `utils/`, `hooks/`, `types/`); Storybook-as-Vitest (`.storybook/`, `src/testSetup.ts` mocks the whole `utils/api` module with a fixed object: `sessionApi`, `grammarApi`, `vocabularyApi`, `api`); Cypress (`frontend/cypress/e2e/conversation-flow.cy.ts`, `cy.getByTestId` helper).
- **Styling**: all CSS lives in `frontend/src/styles/global.css` with `@media (max-width: 768px)` breakpoints.

### New Concepts Required

- **`LLMMetricsFilters`** (type): `{ range, dateFrom?, dateTo?, feature?, provider?, model?, status? }` where `range ∈ 24h | 7d | 30d | all | custom`.
- **URL ⇄ filters mapping** (`metricsUtils.ts`): `filtersFromSearchParams`, `filtersToSearchParams`, `filtersToApiParams(filters, now)` (resolves presets to `date_from` ISO strings at fetch time), `bucketForRange` (`24h` → `hour`, else `day`).
- **Formatting helpers**: cost (adaptive precision for sub-cent values), latency (ms / s), percentages, token counts, and `parseUtc` (append `Z` to naive timestamps before `new Date()`).
- **Series builder**: groups timeseries points into series keyed by `feature · provider:model`, each a sorted list of `{ time, value }`.
- **`metricsApi`** in `utils/api.ts`.
- **Components** under `frontend/src/components/LLMMetrics/`:
  - `LLMMetricsDashboard`: container. Reads and writes URL filters, fetches each panel's data, composes the panels.
  - `MetricsPanel`: shared section wrapper (title, loading / error + retry / empty / content).
  - `MetricsFilterBar`
  - `MetricsSummaryCards`
  - `MetricsBreakdownTable`
  - `MetricsLineChart`: generic multi-series SVG line chart (calls, cost, latency p50/p95)
  - `MetricsCostLatencyChart`: SVG scatter, cost per call vs p95 latency
  - `LLMCallLog`
  - `LLMPricingPanel`
- **`AdminMetricsPage`** (`frontend/src/pages/`): thin page that renders a heading, the no-auth note and `LLMMetricsDashboard`.

### Key Business Rules

- **Error rate** = `errors / calls`; shown as "–" when `calls = 0`.
- **Cost per call** = `estimated_cost_usd / (calls − unpriced_calls)`; "–" when there are no priced calls (matches the backend report's `mean_cost_per_call_usd` definition).
- **Total estimated cost excludes unpriced calls.** The unpriced-calls card makes that visible; a non-zero count is highlighted.
- **Latency percentiles cannot be merged across groups.** Latency series and the scatter are therefore per feature/provider/model, never re-aggregated client-side. Calls and cost series also use the same per-group key, for consistency.
- **Presets are relative.** `range=7d` in the URL means "the 7 days before now" each time the page loads; only `custom` stores absolute `date_from` / `date_to` (`YYYY-MM-DD`, UTC days, as the API defines them).
- **Default view** is `range=all` with no other filters; default values are omitted from the URL.
- **Unknown URL values are ignored** (e.g. `status=foo` → no status filter; `range=bogus` → `all`; non-numeric `page` → 1).
- **Changing any filter resets the call log to page 1.**
- **Pricing is unfiltered**: the panel loads once.
- **Times**: the API returns naive UTC. Call log times are shown in the viewer's local time; chart buckets are labelled in UTC (they are UTC hours/days), and the filter bar notes that custom dates are UTC days.

---

## Strategic Approach

### Solution Direction

1. **Types and API client**: add metrics types to `types/index.ts` and a `metricsApi` object to `utils/api.ts` that serialises filters into query strings (skipping empty values).
2. **Pure helpers** (`components/LLMMetrics/metricsUtils.ts`): URL ⇄ filter mapping, preset resolution, bucket choice, formatting, series building, cost-per-call. Fully unit-tested.
3. **Presentational components** taking data via props: filter bar, summary cards, breakdown table (local sort state), line chart, scatter chart, call log (page controls via callbacks), pricing panel, panel wrapper.
4. **Container** `LLMMetricsDashboard`: `useSearchParams` for state; one effect per data source (summary, timeseries, calls, pricing, plus an unfiltered summary for dropdown options) with a cancellation guard against stale responses; per-panel `{ data, loading, error }` and a retry callback.
5. **Page and route**: `AdminMetricsPage`, routes in `App.tsx`, minimal footer link.
6. **Styles**: an `llm-metrics-*` CSS block in `global.css` with mobile rules.
7. **Tests**: Jest tests per component and helper; stories per component; `metricsApi` added to the `testSetup.ts` mocks so the dashboard story runs; one Cypress spec, added to the CI workflow.
8. **Docs**: README route row, page description and auth caveat.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Chart library** (approved by the user: hand-rolled SVG) | **Recharts**: richer charts with less code, but a new runtime dependency (~100 KB+ gzipped with d3 submodules), React 19 peer-version churn, and ESM transforms in Jest (the config already transforms all of `node_modules`, which slows tests). **Hand-rolled SVG**: no dependency, full control over styling and a11y, easy to test in jsdom; more code, and only the basics (lines, points, axes, legend, `<title>` tooltips). | **Hand-rolled SVG**: two small components (`MetricsLineChart`, `MetricsCostLatencyChart`). The charts needed are simple, data volume is small, and it avoids an architectural dependency decision. Revisit if #238 needs richer charts. |
| Where filter dropdown options come from | A new "distinct values" endpoint would be cleanest but is backend scope. Deriving options from the filtered response makes options vanish once a filter is set. | One **unfiltered** `GET /metrics/llm` call on load; distinct `feature` / `provider` / `model` values from `groups`. Also gives the "never recorded any calls" vs "nothing matches" distinction for empty states. A selected value missing from the options (e.g. from a bookmarked URL) is still shown. |
| URL representation of the date range | Absolute dates make bookmarks stable but "last 7 days" goes stale; relative presets stay meaningful. | `range=24h\|7d\|30d\|all\|custom`; `date_from`/`date_to` only for `custom`. Presets resolve to an ISO `date_from` (with `Z`) at fetch time. |
| Time-series bucket | User-selectable bucket adds a control; fixed `day` makes 24h useless. | Derived: `24h` → `hour`, everything else → `day`. |
| Series key for charts | Per model (summing across features) is simpler to read but wrong for latency percentiles. | `feature · provider:model` for all charts; the feature filter narrows it to per-model. |
| Component location | Flat `components/` (existing style) vs a subfolder. Jest coverage excludes `pages/` and `utils/`. | Subfolder `src/components/LLMMetrics/` (precedent: `components/ExerciseTypes/`) holding components **and** `metricsUtils.ts`, so helpers count toward coverage. The page stays thin. |
| State management | Context / store vs local state. | Local state in the container plus `useSearchParams`. No new state library. |
| Fetching | One combined loader vs per-panel effects. | Per-panel effects so one failing endpoint doesn't blank the page (AC4), each with a `cancelled` flag to drop stale responses. |
| Call log page size | API default 10, max 100. | 20 per page; `page` stored in the URL. |
| Navigation entry | Index page card (too prominent) vs a footer link. | New minimal `<footer>` in `App.tsx` with a small "Admin: LLM metrics" link. |
| Cypress in CI | The workflow pins `--spec 'cypress/e2e/conversation-flow.cy.ts'`, so a new spec would never run in CI. | Add the new spec to both `--spec` lists in `.github/workflows/cypress-tests.yml`. |
| Storybook API mocking | `testSetup.ts` replaces `utils/api` with a fixed object; `metricsApi` would be `undefined` in story tests. | Add a `metricsApi` mock (vi.fn with sample responses) to each `vi.mock` factory in `testSetup.ts`. Presentational stories take props and don't need it. |

### Alternatives Considered

- **Recharts (or Chart.js / visx)**: rejected for now (see table). It is a new dependency, and the charts needed are simple.
- **Backend endpoint for filter options**: rejected; it would widen the issue into backend scope, and the unfiltered summary already has the values.
- **Putting everything in the page component**: rejected; `pages/` is excluded from Jest coverage, so the logic would not count toward AC9 and would be harder to test.
- **Global context for metrics state**: rejected; only one page uses it, and URL state is the source of truth.
- **Tabs now (anticipating #238)**: rejected as speculative. The page is a vertical stack of panels, and #238 can add a tab bar above it.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Resolution |
|-----------|-------------------------|----------------|
| Chart library | The issue requires human approval before adding a dependency. | **Decided by the user (2026-11-14): hand-rolled SVG**, no new dependency. |
| "Searchable call log" | The API has no text search. | **Decided by the user: the shared filters are enough**; no client-side text search. |
| Navigation entry point | "Footer or settings area"; neither exists. | **Decided by the user: a new minimal app footer** in `App.tsx` with one link. |
| Default date range | Not specified. | `all` (sparse local data; matches the "No LLM calls recorded yet" empty state). |
| "Per model" charts | Latency percentiles can't be combined across features. | Series per feature/provider/model (see Key Business Rules). |
| CI workflow change | Adding the Cypress spec to CI touches `.github/workflows/`. | **Decided by the user: add the spec** to both `--spec` lists in `cypress-tests.yml`. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| No `llm_calls` rows at all | Fresh install | Every data panel shows "No LLM calls recorded yet"; pricing still shows. |
| Filters match nothing | Misleading if shown as "no data ever" | "No calls match these filters" plus a Clear filters action in the bar. |
| Naive UTC timestamps (`2026-11-14T08:00:00`) | `new Date()` parses them as local time, shifting by the UTC offset | `parseUtc` appends `Z` when there is no offset. |
| `latency_p50_ms` / `p95` are `null` | No calls in the group | Show "–". |
| All calls in a group unpriced | Cost per call is undefined | "–" in the table; excluded from the scatter with a note ("N models without prices not shown"). |
| `estimated_cost_usd` tiny (e.g. 0.000042) | `$0.00` hides real cost | Adaptive precision: ≥ $1 → 2 dp, ≥ $0.01 → 4 dp, else up to 6 significant digits. |
| Single bucket / single point in a series | A line needs ≥ 2 points; the x-scale domain collapses to one value | Draw a point marker; pad the domain. |
| Gaps (buckets with no calls are omitted) | Lines would imply interpolated activity | Lines connect existing points; markers on every point; noted in a chart caption. |
| Many series (e.g. 2 features × 4 models) | Colour reuse | Fixed palette of 8 distinguishable colours, then cycle with dashed lines; legend always shown. |
| Invalid custom range (from > to) | API returns 400 | Validate in the filter bar (disable Apply, show message); if a hand-edited URL still sends it, panels show the API error. |
| Hand-edited URL (`status=bogus`, `page=-3`) | Robustness | Sanitised to defaults. |
| Page beyond the end | API returns an empty list with `total > 0` | Show "No calls on this page" with a link back to page 1. |
| Rapid filter changes | Out-of-order responses would show stale data | Effect cleanup sets `cancelled`; late responses are dropped. |
| Long error messages | Breaks the table layout | Error message on its own full-width row below the call, wrapped, max-height with scroll. |
| Session deleted after the call | The link 404s | Link anyway; `SessionDetailPage` already handles not-found. |
| Price source URL | External link | `target="_blank" rel="noopener noreferrer"`; only `https://` sources reach the UI (backend validates). |
| `long_context` tier present (Claude Haiku 5.5) | Extra prices | Shown as a sub-line: "Over N tokens: in/out/cache". |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Storybook-Vitest `vi.mock` replaces `utils/api` without `metricsApi` | Dashboard story crashes, so the `npm run test` CI job fails | Add a `metricsApi` mock to every factory in `testSetup.ts`; run `npm run test` locally. |
| ts-jest compiles imported sources with `tsconfig.jest.json` (CommonJS) | `import.meta` or TS errors in new files fail Jest | No `import.meta` in new code; mock `utils/api` with `jest.mock` in tests; run `npx tsc -b` and Jest. |
| New Jest tests not discovered | AC6 fails silently | Name files `*.jest.test.tsx`; check `npx jest --listTests`. |
| Cypress spec not run in CI | AC7 only satisfied locally | Add to `cypress-tests.yml` `--spec` lists. |
| SVG charts look poor on mobile | AC5 | `viewBox` + `width: 100%`, a minimum chart height, legend below the chart, and checks at a 375 px Storybook viewport and with Cypress `cy.viewport('iphone-x')`. |
| Global footer affects existing layouts / Cypress | Visual regressions | Small and unobtrusive; run the existing conversation-flow spec. |
| `global.css` growth | Style collisions | Prefix all new classes `llm-metrics-`. |
| Date preset tests depend on "now" | Flaky tests | `filtersToApiParams(filters, now)` takes `now`; the container passes `new Date()`; tests pass a fixed date. |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | All panels on `/admin/metrics` from the API | Yes | Uses the 4 #236 endpoints (the report endpoint is #238). |
| AC2 | Shared filters, URL persistence | Yes | Pricing has no filters in the API, by design. |
| AC3 | Call log pagination and session links | Yes | `page` in the URL. |
| AC4 | Empty / loading / error states | Yes | Via `MetricsPanel`; two empty-state messages. |
| AC5 | Mobile and desktop | Yes | CSS breakpoints; checked in Storybook viewport and Cypress. |
| AC6 | Story + discovered tests per component | Yes | Jest `*.jest.test.tsx` + stories; `testSetup.ts` mock update. |
| AC7 | One Cypress E2E test | Yes | Plus a CI workflow `--spec` update. |
| AC8 | README Frontend Routes row | Yes | Plus the auth caveat. |
| AC9 | 80%+ coverage on new components | Yes | Components and helpers in `components/LLMMetrics/` (counted by Jest coverage); the page and `api.ts` are excluded by existing config, so the page stays thin. |

**AC Coverage Summary**: 9 of 9 ACs are addressable with the proposed approach (hand-rolled SVG charts, approved).

**Implicit Requirements Not in ACs**:
- `npx tsc -b` and `npm run lint` stay clean.
- Accessibility: tables use `<th scope>`, sort buttons have `aria-sort`, charts have `role="img"` and an `aria-label` summary, and points have `<title>` tooltips; form controls have labels.
- No backend changes; `static/` is not rebuilt.
- The existing conversation-flow Cypress spec and current test suites keep passing.

---

## REASONS Canvas

### Requirements
- `/admin/metrics` page with filters bar, summary cards, breakdown table, time-series charts (calls, cost, p50/p95 latency), cost-per-call vs p95 scatter, paginated call log with session links and error messages, pricing panel.
- Filters (date presets + custom, feature, provider, model, status) in the URL; all data panels respond.
- Loading / empty / error states per panel; responsive.
- Typed `metricsApi` + types; low-key footer link.
- Story + discovered Jest test per component; 80%+ coverage; one Cypress spec; README route row and auth caveat.

### Examples
- `/admin/metrics` with no data → each data panel: "No LLM calls recorded yet"; pricing panel lists 3+ models with `checked_on 2026-11-13` and source links.
- Choosing Provider = `anthropic` → URL `?provider=anthropic`; requests `GET /metrics/llm?provider=anthropic`, `/metrics/llm/timeseries?bucket=day&provider=anthropic`, `/metrics/llm/calls?page=1&per_page=20&provider=anthropic`.
- Choosing "Last 24 hours" at `2026-11-14T08:00:00Z` → URL `?range=24h`; API `date_from=2026-11-13T08:00:00.000Z`, `bucket=hour`.
- Custom range 2026-11-01 → 2026-11-07 → URL `?range=custom&date_from=2026-11-01&date_to=2026-11-07`; API receives the same date strings.
- Totals `{calls: 40, errors: 2, estimated_cost_usd: 0.0123, unpriced_calls: 0, p50: 820, p95: 2400}` → cards: 40 calls, 5.0% errors, $0.0123, 820 ms, 2.40 s, 0 unpriced.
- Group `{calls: 10, unpriced_calls: 2, estimated_cost_usd: 0.004}` → cost per call `$0.0005`.
- Call `{status: 'error', error_message: 'refusal: ...', session_id: 12}` → row shows Error badge, a message row, and a link to `/sessions/12`.
- Call log with `pagination {total: 45, per_page: 20}` → "Page 1 of 3"; Next → `?page=2`; then setting a filter → `page` removed from the URL.
- Summary endpoint returns 500 → summary cards and breakdown show "HTTP error! status: 500" with Retry; call log and charts still render.
- `created_at: "2026-11-14T08:00:00"` → treated as 08:00 UTC.

### Architecture
- React 19 + TS + react-router v7 (`useSearchParams`, `Link`); pages in `src/pages/`, components in `src/components/`, API in `src/utils/api.ts`, types in `src/types/index.ts`, CSS in `src/styles/global.css`.
- Backend API from #236 (`routers/metrics.py`), proxied by Vite under `/metrics`; `/admin` is a frontend-only route served by the SPA fallback in production.
- New subfolder `src/components/LLMMetrics/` (container + presentational components + `metricsUtils.ts`); a thin `AdminMetricsPage`.
- No new dependencies: charts are hand-rolled SVG (approved by the user, 2026-11-14).

### Standards
- TypeScript strict as configured; `npx tsc -b` and `npm run lint` clean; follow existing component style (function components, default exports, `data-testid` attributes, JSDoc header comments referencing the issue).
- Tests: Jest `*.jest.test.tsx` with `@testing-library/react`, `jest.mock('../../utils/api')`; Storybook stories with `tags: ['autodocs']`; 80%+ coverage for each new component file (`npm run test:jest:coverage`).
- Confirm discovery: `npx jest --listTests`, `npx vitest list --filesOnly`; state in the PR how tests ran.
- README updated (Frontend Routes, LLM logging section, auth caveat). Backend untouched, so PEP 8 / pytest are not affected, but the backend suite is run once as a regression check.
- Commit `feat(#237): ...`; SPDD artifacts committed with the code.

### Omissions
- Report tab / comparison report UI (#238); export.
- Backend changes, including a filter-options endpoint.
- Authentication (Phase 5).
- Full-text search of the call log; auto-refresh; price editing; provider switching.
- `npm run build` / `static/` changes.

### Notes
- The API returns naive UTC datetimes: always parse via `parseUtc`.
- `date_from` with a `+` offset must be URL-encoded; use `toISOString()` (ends in `Z`) and `URLSearchParams` to avoid that.
- `metrics_filters` returns 400 with `detail` for bad dates; `api<T>()` surfaces `detail` as the error message.
- The time series omits empty buckets.
- The `testSetup.ts` mocks are copied into 9 `vi.mock` factories; add `metricsApi` to each (or hoist a shared `mockMetricsApi` const, as `mockSessionApi` is).
- The Cypress support file provides `cy.getByTestId`.
- Leave a clear place (above the panels) for #238's tab bar.

### Solutions
- Container/API patterns: `components/DeckBrowser.tsx` (fetch + loading/error/empty + pagination), `components/SessionHistory.tsx`.
- Jest test pattern: `components/ReviewSession.jest.test.tsx` (module mock via `jest.mock('../utils/api', ...)`).
- Story pattern: `components/DeckBrowser.stories.tsx`.
- Cypress pattern: `cypress/e2e/conversation-flow.cy.ts` (`cy.intercept` + aliases + `cy.wait`).
- Backend contract: `schemas/llm_metrics.py`, `services/llm/pricing.py`, `routers/metrics.py`; README "Cost and latency logging" section.
