# SPDD Prompt: Migrate Recent Sessions Section from IndexPage to ScenarioPage

**GitHub Issue**: #214
**Issue Title**: Migrate Recent Sessions section from IndexPage to ScenarioPage
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/214
**Artifact ID**: FLC-045-202609081535
**Created**: 2026-09-08 15:35
**Author**: Mistral Vibe AI Assistant
**Related Analysis**: `spdd/analysis/FLC-045-202609081530-[Analysis]-issue-214-recent-sessions-to-scenario-page.md`

---

## Context

### Current Codebase State
- The "Recent Sessions" (Quick Access) section currently lives on `IndexPage.tsx`, the central navigation hub. This is technical debt from when the app was exclusively Conversation Practice.
- `ScenarioPage.tsx` is the Conversation Practice / scenario selection page; it currently only renders a heading and the `ScenarioSelector` component.
- The Quick Access section uses `sessionApi.listSessions(1, 5)`, the `QuickAccessSession` component, and global `.quick-access-*` CSS classes (no CSS changes needed for the move).
- `IndexPage.test.tsx` uses jest-style mocks (`jest.mock`/`jest.fn`) with `@testing-library/react`.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/src/pages/IndexPage.tsx` | Landing page; owns the section being moved | State L14-16, fetch effect L66-94, handlers L104-131, Quick Access JSX L173-227 |
| `frontend/src/pages/ScenarioPage.tsx` | Destination page; currently minimal | L1-14 (whole file) |
| `frontend/src/components/QuickAccessSession.tsx` | Session card (unchanged) | Props: `session`, `onClick` |
| `frontend/src/components/ScenarioSelector.tsx` | Scenario grid (unchanged) | Uses `useNavigate`, `useSessions` |
| `frontend/src/utils/api.ts` | `sessionApi.listSessions(page, perPage)` | L101 |
| `frontend/src/types/index.ts` | `SessionSummary`, `SessionListResponse` | unchanged |
| `frontend/src/pages/IndexPage.test.tsx` | Tests to trim | Session Fetching L93-189, Quick Access nav L238-268, Rendering L71-83, Accessibility L285-290 |
| `frontend/src/styles/global.css` | `.quick-access-*` styles (global) | L2920+ — no changes |
| `README.md` | Docs referencing Quick Access on landing page | ~L16, ~L27, ~L61, ~L298, ~L376 |

### Existing Patterns
- **Fetching + transform**: `IndexPage.tsx` L66-94 — `listSessions(1, 5)`, map `id` to `String(id)`, normalize `overall_score` null/undefined to null.
- **Retry handler**: `IndexPage.tsx` L109-131 — re-runs the same fetch/transform.
- **Navigation**: `useNavigate`; "View All Sessions" → `/sessions`; resume → `/sessions/:id`; empty-state "Start Now" → `/scenarios`.
- **Test structure**: `IndexPage.test.tsx` — `jest.mock('react-router-dom')` returning `useNavigate: () => mockNavigate`; `jest.mock('../utils/api')` with `sessionApi.listSessions: jest.fn()`; `mockSessions` fixture; `waitFor` for async.

---

## Goal

**Primary Objective**: Relocate the "Recent Sessions" (Quick Access) section from `IndexPage.tsx` to `ScenarioPage.tsx`, positioning it below the `ScenarioSelector`, preserving all functionality, data-testids, and accessibility; update tests and README accordingly.

**Secondary Objectives**:
- Remove all now-unused session-fetching state, handlers, and imports from `IndexPage.tsx` (no dead code, no TS unused-symbol errors).
- Create `ScenarioPage.test.tsx` mirroring the relocated test assertions.
- Update README.md so the Quick Access / Recent Sessions section is documented as living on the Conversation Practice (scenarios) page.

---

## Constraints

### Architecture Constraints
- React 19 + TypeScript; react-router-dom v7 `useNavigate`.
- Do NOT extract the section into a new reusable component (out of scope; move verbatim).
- Do NOT modify `QuickAccessSession`, `ScenarioSelector`, the API, the CSS, or the test-runner config.
- Keep all `data-testid` attributes and `aria-label`s unchanged.
- Position the Quick Access section BELOW the `ScenarioSelector` on ScenarioPage.

### Code Quality Constraints
- Minimal diff. Move the existing logic verbatim; only the section title may change to "Recent Conversation Sessions".
- Remove only imports that become unused in `IndexPage.tsx`. (`useCallback` is still used by `handleFeatureClick`/`handleGetStarted`; `useNavigate` is still used; keep those.)
- TypeScript must compile cleanly (no unused variables/imports).
- Match existing code style (indentation, naming, error-handling density).

### Testing Constraints
- Follow the exact pattern of `IndexPage.test.tsx` (jest-style mocks + `@testing-library/react`).
- In `ScenarioPage.test.tsx`, mock `react-router-dom` (`useNavigate`), `../utils/api` (`sessionApi.listSessions`), and `../components/ScenarioSelector` (render a stable placeholder with `data-testid="scenario-selector"`) to isolate page-level behavior.
- Cover: loading state, successful fetch (2 sessions), empty state, error state + retry, "View All Sessions" → `/sessions`, "Start Now" (empty) → `/scenarios`, resume via `QuickAccessSession` onClick → `/sessions/:id`, data-testid presence, and the section title text.
- Update `IndexPage.test.tsx`: remove the Quick Access rendering tests (QuickAccessSection, View All Sessions button), the entire `Session Fetching` block, the Quick Access navigation tests (View All Sessions, Start Now), and the View All Sessions accessibility test; remove the now-unused `sessionApi` mock.

### Acceptance Criteria
- AC1: Recent Sessions section removed from IndexPage
- AC2: Recent Sessions section added to ScenarioPage below the scenarios
- AC3: All functionality preserved (API calls, session display, navigation)
- AC4: All data-testid attributes maintained
- AC5: Tests updated to reflect the new location
- AC6: Section title may be updated (use "Recent Conversation Sessions")

---

## Examples

### Input/Output Examples
1. **ScenarioPage loading**: Mount → `quick-access-loading` visible, `listSessions` called with `(1, 5)`.
2. **ScenarioPage loaded**: `listSessions` resolves with 2 sessions → `quick-access-list` renders two `QuickAccessSession` cards ("Ordering at a Café", "Asking for Directions").
3. **ScenarioPage empty**: `listSessions` resolves with `[]` → `quick-access-empty` shows "No recent sessions. Start a new one!"; clicking `quick-access-start-btn` calls `navigate('/scenarios')`.
4. **ScenarioPage error**: `listSessions` rejects → `quick-access-error` shows "Failed to load recent sessions" + `quick-access-retry-btn`; clicking retry re-calls `listSessions`.
5. **View All**: Clicking `view-all-sessions-btn` calls `navigate('/sessions')`.
6. **Resume**: `QuickAccessSession` `onClick('1')` calls `navigate('/sessions/1')`.
7. **IndexPage after move**: No `quick-access-section`; `sessionApi.listSessions` is NOT called.

### Edge Cases
- `overall_score` null/undefined → handled by transform (set to null); `QuickAccessSession` shows "In Progress".
- `id` from backend is a number → transform coerces to `String(id)`.
- Error during retry → error state re-shown.

### Test Cases
```tsx
// ScenarioPage.test.tsx (jest-style, mirroring IndexPage.test.tsx)
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('../utils/api', () => ({ sessionApi: { listSessions: jest.fn() } }))
jest.mock('../components/ScenarioSelector', () => () => <div data-testid="scenario-selector" />)

it('displays loading state initially', () => {
  ;(sessionApi.listSessions as jest.Mock).mockImplementation(() => new Promise(() => {}))
  render(<ScenarioPage />)
  expect(screen.getByTestId('quick-access-loading')).toBeInTheDocument()
})

it('displays sessions when fetch succeeds', async () => {
  ;(sessionApi.listSessions as jest.Mock).mockResolvedValue({ sessions: mockSessions, pagination: {...} })
  render(<ScenarioPage />)
  await waitFor(() => expect(screen.getByTestId('quick-access-list')).toBeInTheDocument())
  expect(screen.getByText('Ordering at a Café')).toBeInTheDocument()
})

it('navigates to /sessions when View All Sessions button is clicked', () => {
  ;(sessionApi.listSessions as jest.Mock).mockImplementation(() => new Promise(() => {}))
  render(<ScenarioPage />)
  fireEvent.click(screen.getByTestId('view-all-sessions-btn'))
  expect(mockNavigate).toHaveBeenCalledWith('/sessions')
})
```

---

## Deliverables

### Code Changes
- [ ] `frontend/src/pages/IndexPage.tsx` — Remove Quick Access JSX (L173-227), session state (L14-16), fetch effect (L66-94), `handleSessionResume` (L104-106), `handleRetry` (L109-131), and now-unused imports (`sessionApi`, `QuickAccessSession`, `SessionSummary`, `SessionListResponse`, `useEffect`, `useState`). Keep `useCallback` (still used), `useNavigate` (still used), `FeatureCard`, `FeatureConfig`.
- [ ] `frontend/src/pages/ScenarioPage.tsx` — Add session-fetching state/effects/handlers (moved from IndexPage) and render the Quick Access section below `<ScenarioSelector />`, with title "Recent Conversation Sessions".

### Tests
- [ ] `frontend/src/pages/IndexPage.test.tsx` — Remove Quick Access rendering tests, the `Session Fetching` block, Quick Access navigation tests, the View All Sessions accessibility test, and the `sessionApi` mock import/mock.
- [ ] `frontend/src/pages/ScenarioPage.test.tsx` — New file: render, loading, loaded, empty, error+retry, View All navigation, Start Now navigation, resume navigation, data-testid presence, title text; mock `ScenarioSelector`.

### Documentation
- [ ] `README.md` — Update Quick Access / Recent Sessions references (~L16, ~L27, ~L61) to describe the section as living on the Conversation Practice (scenarios) page; update the ScenarioPage route/component descriptions (~L298, ~L376) to mention recent sessions.

---

## Actual Prompt

```
Implement issue #214: Migrate the "Recent Sessions" (Quick Access) section from IndexPage to ScenarioPage.

CONTEXT:
- React 19 + TypeScript, react-router-dom v7, global CSS (no CSS changes needed).
- The section is in frontend/src/pages/IndexPage.tsx (state L14-16, fetch effect L66-94, handlers L104-131, JSX L173-227). It calls sessionApi.listSessions(1, 5), renders QuickAccessSession cards, and has loading/error/empty states with navigation to /sessions and /sessions/:id.
- Destination: frontend/src/pages/ScenarioPage.tsx (currently minimal; renders <ScenarioSelector /> only).
- Tests in frontend/src/pages/IndexPage.test.tsx use jest.mock/jest.fn + @testing-library/react. NOTE: these .test.tsx files are not currently matched by vitest or jest config (pre-existing infra gap) — do NOT modify test-runner config; just follow the existing file pattern exactly.

GOAL:
- Remove the Quick Access section (JSX + state + handlers + unused imports) from IndexPage.
- Add it to ScenarioPage BELOW the ScenarioSelector, with the title "Recent Conversation Sessions".
- Preserve all functionality and all data-testid attributes exactly.
- Trim IndexPage tests; create ScenarioPage.test.tsx mirroring the relocated assertions.
- Update README.md references that place the Quick Access section on the landing page.

CONSTRAINTS:
- Move verbatim; do NOT extract a new component, do NOT change the API call, do NOT modify QuickAccessSession/ScenarioSelector/CSS/test-runner config.
- Remove only imports that become unused in IndexPage (useCallback and useNavigate are still used — keep them).
- TypeScript must compile with no unused-symbol errors.
- Keep all data-testid attributes and aria-labels unchanged.

EXAMPLES:
- Loading: ScenarioPage mounts -> quick-access-loading shown; listSessions called with (1, 5).
- Loaded: 2 sessions -> quick-access-list shows both QuickAccessSession cards.
- Empty: [] -> quick-access-empty -> Start Now navigates to /scenarios.
- Error: reject -> quick-access-error -> Retry re-fetches.
- View All: view-all-sessions-btn -> navigate('/sessions'); resume -> navigate('/sessions/:id').
- IndexPage after move: no quick-access-section, no sessionApi call.

ACCEPTANCE CRITERIA (from issue #214):
- [ ] Recent Sessions section removed from IndexPage
- [ ] Recent Sessions section added to ScenarioPage below the scenarios
- [ ] All functionality preserved (API calls, session display, navigation)
- [ ] All data-testid attributes maintained
- [ ] Tests updated to reflect the new location
- [ ] Section title may be updated (use "Recent Conversation Sessions")

DELIVERABLES:
- frontend/src/pages/IndexPage.tsx (trimmed)
- frontend/src/pages/ScenarioPage.tsx (section added below ScenarioSelector)
- frontend/src/pages/IndexPage.test.tsx (Quick Access tests removed)
- frontend/src/pages/ScenarioPage.test.tsx (new, mirroring relocated tests; mock ScenarioSelector)
- README.md (Quick Access / Recent Sessions described on the scenarios page)
```

---

## AI Response

Implementation complete. Summary of what was produced, driven by the prompt above:

- `frontend/src/pages/ScenarioPage.tsx`: Added session-fetching state/effects/handlers (moved verbatim from IndexPage) and rendered the Quick Access section below `<ScenarioSelector />` with the contextual title "Recent Conversation Sessions". All data-testids and aria-labels preserved.
- `frontend/src/pages/IndexPage.tsx`: Removed the Quick Access JSX, session state, fetch effect, `handleSessionResume`, `handleRetry`, and now-unused imports (`useState`, `useEffect`, `sessionApi`, `QuickAccessSession`, `SessionSummary`, `SessionListResponse`). Kept `useCallback` and `useNavigate` (still used by feature-card and Get Started navigation).
- `frontend/src/pages/IndexPage.test.tsx`: Removed the `sessionApi` mock, the `Session Fetching` block, the Quick Access rendering tests, the View All / Start Now navigation tests, and the View All Sessions accessibility test. Added a regression test asserting the Quick Access section is no longer rendered on IndexPage.
- `frontend/src/pages/ScenarioPage.test.tsx`: New file mirroring the relocated assertions; mocks `react-router-dom` (`useNavigate`), `sessionApi.listSessions`, `ScenarioSelector`, and `QuickAccessSession` to isolate page-level behavior. Covers rendering, loading, loaded, empty, error (Error + non-Error fallback), retry, View All navigation, Start Now navigation, resume navigation, data-testid presence, title text, and accessibility.
- `README.md`: Updated Quick Access / Recent Sessions references to describe the section as living on the Conversation Practice (scenarios) page.

---

## Human Review Notes

### Changes Made
- [x] ScenarioPage: relocated Quick Access section below ScenarioSelector with title "Recent Conversation Sessions"
- [x] IndexPage: removed Quick Access section + dead state/handlers/imports
- [x] IndexPage.test.tsx: trimmed relocated tests + added regression test
- [x] ScenarioPage.test.tsx: created with 18 tests
- [x] README.md: updated to reflect new location of the section

### Quality Checks
- [x] Code follows existing patterns (verbatim relocation)
- [x] Tests pass (ScenarioPage: 18/18; IndexPage: 9 pass including new regression test)
- [x] Documentation updated (README.md)
- [x] All acceptance criteria met (see Verification below)

### Issues Found
- **Pre-existing (NOT introduced by this change)**: `IndexPage.test.tsx` has 6 failing assertions that use `getByTestId('feature-card-*')`. Root cause: `FeatureCard.tsx` hardcodes `data-testid="feature-card"` and does not forward the per-feature `data-testid` prop passed by IndexPage. These tests were already failing on `main` (in fact, on `main` the entire IndexPage test suite failed to *compile* under ts-jest because IndexPage imported `QuickAccessSession`, which has a pre-existing unused `navigate` (TS6133)). After this change, IndexPage no longer imports `QuickAccessSession`, so the suite now runs and the feature-card failures are the only remaining ones. Fixing the FeatureCard data-testid forwarding is a separate issue, out of scope for #214.
- **Pre-existing (NOT introduced by this change)**: `QuickAccessSession.tsx:12` has an unused `navigate` (TS6133) under ts-jest's `noUnusedLocals`. This blocked the real component from being imported in tests, so `ScenarioPage.test.tsx` mocks `QuickAccessSession` (consistent with mocking `ScenarioSelector` for page-level isolation). Fixing the unused `navigate` is out of scope.
- **Test runner note**: `.test.tsx` files are not matched by the default vitest or jest config (pre-existing infra gap). For verification, tests were run with a one-off `npx jest --testMatch '**/*.test.tsx' --testPathPattern ...` override; no committed config was changed.

---

## Verification

- [x] AC1: Recent Sessions section removed from IndexPage (regression test confirms absence)
- [x] AC2: Recent Sessions section added to ScenarioPage below the scenarios (test confirms ScenarioSelector precedes Quick Access in DOM)
- [x] AC3: All functionality preserved (listSessions(1,5) called, loading/loaded/empty/error/retry states, View All -> /sessions, resume -> /sessions/:id, Start Now -> /scenarios)
- [x] AC4: All data-testid attributes maintained (quick-access-section, -list, -loading, -error, -empty, view-all-sessions-btn, -retry-btn, -start-btn)
- [x] AC5: Tests updated to reflect the new location (IndexPage trimmed; ScenarioPage.test.tsx created, 18 tests passing)
- [x] AC6: Section title updated to "Recent Conversation Sessions"
- [x] TypeScript compiles cleanly for IndexPage.tsx and ScenarioPage.tsx (no new errors introduced)
- [x] ESLint clean on all four changed/new frontend files
- [x] Vitest storybook suite still green (21 files, 115 tests) — no regressions
- [x] Documentation (README.md) updated

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
