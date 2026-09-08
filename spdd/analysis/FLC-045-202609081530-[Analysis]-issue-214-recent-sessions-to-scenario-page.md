# SPDD Analysis: Migrate Recent Sessions Section from IndexPage to ScenarioPage

**GitHub Issue**: #214
**Issue Title**: Migrate Recent Sessions section from IndexPage to ScenarioPage
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/214
**Artifact ID**: FLC-045-202609081530
**Created**: 2026-09-08 15:30
**Author**: Mistral Vibe AI Assistant

---

## Original Business Requirement

The "Recent Sessions" section currently resides on the index page (`IndexPage.tsx`), which is technical debt from when the French Language Coach app was exclusively focused on Conversation Practice. This section should be moved to the Conversation Practice page (`ScenarioPage.tsx`), where it is more contextually appropriate.

### Current State
- The "Recent Sessions" section exists in `frontend/src/pages/IndexPage.tsx` (lines 174-227)
- It displays a table with links to recent Conversation Practice sessions
- It includes loading, error, and empty states
- It has a "View All Sessions" button that navigates to `/sessions`

### Desired State
- Remove the "Recent Sessions" section from `IndexPage.tsx`
- Add it to `ScenarioPage.tsx` (the Conversation Practice page)
- Position it **below** the conversation topics/scenarios section
- Maintain all existing functionality (session listing, loading states, navigation)

### Technical Details
- The section uses the `sessionApi.listSessions(1, 5)` API call
- It uses the `QuickAccessSession` component for rendering individual sessions
- The section has data-testid attributes for testing: `quick-access-section`, `quick-access-list`, etc.
- Tests exist in `IndexPage.test.tsx` that will need to be updated/moved

---

## Background

The French Language Coach app has grown from a single-purpose Conversation Practice tool into a multi-feature language learning platform (lessons, reference, exercises, vocabulary). The landing page (`IndexPage`) was refactored in issue #177 into a central navigation hub showcasing all features. However, the "Recent Sessions" (Quick Access) section — which lists recent Conversation Practice sessions — was left on the landing page as technical debt. Since these sessions are exclusively Conversation Practice sessions, the section is more contextually appropriate on the Conversation Practice / scenario selection page (`ScenarioPage`).

---

## Business Value

- **Contextual Appropriateness**: Recent conversation sessions appear where users are already thinking about conversation practice
- **Reduced Landing-Page Clutter**: The central navigation hub focuses on feature discovery rather than conversation-specific history
- **Improved Information Architecture**: Session history lives next to session creation (scenario selection), enabling a natural "resume or start new" flow
- **Consistency**: Aligns the section with the page it logically belongs to

---

## Scope In

- [ ] Remove the "Recent Sessions" / Quick Access section JSX from `IndexPage.tsx`
- [ ] Remove the now-unused session-fetching state and handlers from `IndexPage.tsx` (sessions, isLoading, error, fetchRecentSessions effect, handleSessionResume, handleRetry)
- [ ] Remove now-unused imports from `IndexPage.tsx` (sessionApi, QuickAccessSession, SessionSummary, SessionListResponse, useEffect, useState, useCallback as applicable)
- [ ] Add the Quick Access section to `ScenarioPage.tsx`, positioned below the `ScenarioSelector`
- [ ] Preserve all functionality: `sessionApi.listSessions(1, 5)`, loading/error/empty states, "View All Sessions" navigation to `/sessions`, session resume navigation to `/sessions/:id`, "Start Now" empty-state navigation to `/scenarios`
- [ ] Preserve all data-testid attributes (`quick-access-section`, `quick-access-list`, `quick-access-loading`, `quick-access-error`, `quick-access-empty`, `view-all-sessions-btn`, `quick-access-retry-btn`, `quick-access-start-btn`)
- [ ] Update `IndexPage.test.tsx` to remove tests for the relocated section
- [ ] Create `ScenarioPage.test.tsx` with corresponding tests for the relocated section
- [ ] Update README.md references that describe the Quick Access / Recent Sessions section as living on the landing page

## Scope Out

- [ ] Refactoring the Quick Access section into its own reusable component (would be a separate improvement; this issue is a relocation)
- [ ] Changing the API call (`listSessions(1, 5)`) or its pagination
- [ ] Modifying the `QuickAccessSession` component
- [ ] Adding new session features (filtering, sorting, pagination controls)
- [ ] Changing the test runner configuration (vitest/jest) — pre-existing infrastructure gap, out of scope
- [ ] Backend changes

---

## Acceptance Criteria (ACs)

1. **AC1 - Removed from IndexPage**: Recent Sessions section is removed from IndexPage
   **Given** The IndexPage component
   **When** It renders
   **Then** No `quick-access-section`, "Recent Sessions" title, or session-listing UI is present

2. **AC2 - Added to ScenarioPage below scenarios**: Recent Sessions section is added to ScenarioPage below the scenarios
   **Given** The ScenarioPage component
   **When** It renders
   **Then** The Quick Access section appears below the `ScenarioSelector` component

3. **AC3 - Functionality preserved**: All functionality is preserved (API calls, session display, navigation)
   **Given** The relocated section on ScenarioPage
   **When** Sessions are fetched and rendered
   **Then** `sessionApi.listSessions(1, 5)` is called, sessions display via `QuickAccessSession`, "View All Sessions" navigates to `/sessions`, resume navigates to `/sessions/:id`, and loading/error/empty states behave as before

4. **AC4 - data-testid attributes maintained**: All data-testid attributes are maintained for testing
   **Given** The relocated section
   **When** Inspected
   **Then** `quick-access-section`, `quick-access-list`, `quick-access-loading`, `quick-access-error`, `quick-access-empty`, `view-all-sessions-btn`, `quick-access-retry-btn`, `quick-access-start-btn` are all present

5. **AC5 - Tests updated**: Tests are updated to reflect the new location
   **Given** The test suite
   **When** Tests run
   **Then** IndexPage tests no longer assert the Quick Access section; ScenarioPage tests assert the relocated section and its states/navigation

6. **AC6 - Title update allowed**: The section title may be updated to better fit the context (e.g., "Recent Conversation Sessions")
   **Given** The relocated section on ScenarioPage
   **When** It renders
   **Then** A contextually appropriate title is shown (e.g., "Recent Conversation Sessions")

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **IndexPage** (`frontend/src/pages/IndexPage.tsx`): Modern landing page / central navigation hub. Contains hero section, feature cards grid, and the Quick Access / Recent Sessions section (lines 173-227). Owns session-fetching state (`sessions`, `isLoading`, `error`), the `fetchRecentSessions` effect, `handleSessionResume`, and `handleRetry`.

- **ScenarioPage** (`frontend/src/pages/ScenarioPage.tsx`): Conversation Practice / scenario selection page. Currently minimal: a `page-container` div with a heading and the `ScenarioSelector` component. No state, no session fetching.

- **ScenarioSelector** (`frontend/src/components/ScenarioSelector.tsx`): Renders difficulty selector and the scenarios grid; handles session creation and navigation to `/chat/:sessionId`.

- **QuickAccessSession** (`frontend/src/components/QuickAccessSession.tsx`): Compact session card; receives `session: SessionSummary` and `onClick` resume handler. Unchanged by this task.

- **sessionApi.listSessions** (`frontend/src/utils/api.ts:101`): `listSessions(page, perPage)` → `GET /sessions/?page=&per_page=` returning `SessionListResponse`.

- **Types** (`frontend/src/types/index.ts`): `SessionSummary`, `SessionListResponse`, `QuickAccessSessionProps` — unchanged.

- **Global CSS** (`frontend/src/styles/global.css:2920+`): `.quick-access-section` and related classes are global, so they apply regardless of which page hosts the section. No CSS changes required for the relocation.

- **IndexPage.test.tsx** (`frontend/src/pages/IndexPage.test.tsx`): Jest-style tests (`jest.mock`, `jest.fn`, `@testing-library/react`) covering rendering, session fetching (loading/loaded/empty/error), navigation, and accessibility. The Quick Access-specific tests are in the `Session Fetching`, `Navigation` (View All Sessions, Start Now), `Rendering` (QuickAccessSection, View All Sessions button), and `Accessibility` (View All Sessions aria-label) describe blocks.

### New Concepts Required

- **ScenarioPage.test.tsx** (`frontend/src/pages/ScenarioPage.test.tsx`): New test file mirroring the relevant subset of `IndexPage.test.tsx`, asserting the relocated Quick Access section on ScenarioPage.

### Key Business Rules

- **Position**: Quick Access section must appear below the `ScenarioSelector` on ScenarioPage.
- **API**: Must call `sessionApi.listSessions(1, 5)` (first page, 5 sessions) — same as before.
- **Transform**: Backend `id` (number) must be coerced to string; `overall_score` null/undefined handling preserved.
- **Navigation**: "View All Sessions" → `/sessions`; session resume → `/sessions/:id`; empty-state "Start Now" → `/scenarios`.
- **data-testid stability**: All existing test IDs preserved to avoid breaking any consumers (E2E, etc.).

---

## Strategic Approach

### Solution Direction

1. **ScenarioPage**: Add session-fetching state (`sessions`, `isLoading`, `error`) and the same `useEffect`, `handleSessionResume`, `handleRetry` handlers currently in IndexPage. Render the existing `ScenarioSelector` first, then the Quick Access section JSX (moved verbatim, with an optional title update to "Recent Conversation Sessions").

2. **IndexPage**: Remove the Quick Access section JSX and all session-fetching state/handlers/imports that become unused. Keep hero section and feature cards.

3. **Tests**: Remove Quick Access-related assertions from `IndexPage.test.tsx` (and remove the now-unused `sessionApi` mock if IndexPage no longer uses it). Create `ScenarioPage.test.tsx` with the relocated assertions, mocking `react-router-dom` (`useNavigate`), `sessionApi`, and `ScenarioSelector` (to isolate the page from the selector's session-creation logic).

4. **README**: Update the lines that describe the Quick Access / Recent Sessions section as part of the landing page, noting it now lives on the Conversation Practice (scenarios) page.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Move JSX verbatim vs. extract a component | Extract: cleaner, reusable; Verbatim move: smaller diff, matches issue scope | Move verbatim. Extraction is a separate refactor out of scope. |
| Title text | "Recent Sessions" (unchanged) vs. "Recent Conversation Sessions" (contextual) | Use "Recent Conversation Sessions" — the issue explicitly allows it and it fits the Conversation Practice page context. |
| Mock ScenarioSelector in ScenarioPage tests | Mock: isolates page logic; Render: integration coverage | Mock `ScenarioSelector` to isolate the relocated section's behavior, matching the page-level test scope. |
| Remove `sessionApi` mock from IndexPage tests | If IndexPage no longer calls sessionApi, the mock is dead | Remove the `sessionApi` mock and the Session Fetching / Quick Access navigation tests from IndexPage tests to keep tests honest. |

### Alternatives Considered

- **Extract a `RecentSessions` component first, then place it on ScenarioPage**: Rejected as out of scope — the issue asks for a relocation, and a refactor should be a separate, reviewed change.
- **Keep fetching on IndexPage and pass data down**: Rejected — IndexPage would still own conversation-specific state, defeating the purpose of the move.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Exact title text | "Recent Sessions" vs. "Recent Conversation Sessions" | Issue explicitly permits a contextual title; use "Recent Conversation Sessions". |
| Whether to keep `quick-access-*` CSS class names | Renaming classes broadens the diff and risks E2E regressions | Keep all CSS classes and data-testids unchanged. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| API failure | Must still show error + retry | Preserve `handleRetry` behavior on ScenarioPage |
| Empty session list | Must still show empty state + "Start Now" | Preserve empty-state branch; "Start Now" → `/scenarios` |
| Session with null `overall_score` | In-progress sessions | Preserve null/undefined handling and "In Progress" display (in `QuickAccessSession`) |
| `ScenarioSelector` triggers its own navigation | Page now has two navigational concerns | Keep selectors independent; page-level resume navigation uses `/sessions/:id` |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Orphaned imports/state in IndexPage | Lint/TS errors, dead code | Remove all session-related imports, state, handlers, and the `useEffect` from IndexPage. |
| IndexPage tests reference removed elements | Test failures | Remove the corresponding assertions and the `sessionApi` mock from `IndexPage.test.tsx`. |
| Test runner coverage gap | `.test.tsx` files are not currently matched by vitest or jest config (pre-existing) | Follow existing test file pattern exactly; do not modify runner config (out of scope). Note this in the prompt. |
| E2E tests relying on Quick Access being on `/` | Cypress failures | Per issue, the section is intentionally moving; update E2E if any reference `/`'s quick-access (none found in scope of this change). |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Removed from IndexPage | Yes | Remove JSX + state + imports |
| AC2 | Added to ScenarioPage below scenarios | Yes | Render after `ScenarioSelector` |
| AC3 | Functionality preserved | Yes | Move API call, states, navigation verbatim |
| AC4 | data-testid attributes maintained | Yes | Keep all test IDs unchanged |
| AC5 | Tests updated | Yes | Trim IndexPage tests; add ScenarioPage tests |
| AC6 | Title may be updated | Yes | Use "Recent Conversation Sessions" |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- README.md references to the Quick Access section on the landing page should be updated (per project instructions: update README when changes affect project structure/usage).
- TypeScript must still compile with no unused-variable errors after removing IndexPage session code.

---

## REASONS Canvas

### Requirements
From GitHub issue #214 acceptance criteria:
- Recent Sessions section is removed from IndexPage
- Recent Sessions section is added to ScenarioPage below the scenarios
- All functionality is preserved (API calls, session display, navigation)
- All data-testid attributes are maintained for testing
- Tests are updated to reflect the new location
- The section title may be updated to better fit the context (e.g., "Recent Conversation Sessions")

### Examples
Concrete test cases:
- **Loading**: ScenarioPage mounts → `quick-access-loading` shown while `listSessions(1,5)` pending
- **Loaded**: `listSessions` resolves with 2 sessions → `quick-access-list` shows both `QuickAccessSession` cards
- **Empty**: `listSessions` resolves with `[]` → `quick-access-empty` shows "No recent sessions. Start a new one!" + "Start Now" → navigates to `/scenarios`
- **Error**: `listSessions` rejects → `quick-access-error` shows message + "Retry" button → retry re-fetches
- **View All**: Click `view-all-sessions-btn` → navigates to `/sessions`
- **Resume**: Click a session → navigates to `/sessions/:id`
- **IndexPage after removal**: no `quick-access-section`, no `sessionApi` call

### Architecture
- **Framework**: React 19 with TypeScript, react-router-dom v7
- **Routing**: `useNavigate` hook for programmatic navigation; routes defined in `App.tsx`
- **Styling**: Global CSS in `frontend/src/styles/global.css`; `.quick-access-*` classes are global (no CSS changes needed)
- **Component structure**: Pages in `frontend/src/pages/`, shared components in `frontend/src/components/`
- **API access**: `sessionApi.listSessions(page, perPage)` from `frontend/src/utils/api.ts`
- **Patterns to follow**: Mirror the exact fetching/transform/render logic currently in `IndexPage.tsx` lines 14-131 and 173-227

### Standards
- **Coding**: Match existing React/TypeScript patterns in the codebase; PEP 8 N/A (frontend)
- **Testing**: 80% coverage minimum; follow the existing `IndexPage.test.tsx` patterns (jest-style mocks + @testing-library/react)
- **Documentation**: Update README.md where it describes the Quick Access / Recent Sessions location
- **Accessibility**: Preserve existing `aria-label`s on buttons
- **Change minimality**: Move verbatim; do not refactor the section into a new component

### Omissions
Explicitly out of scope:
- Extracting the Quick Access section into a reusable component
- Changing the API call signature or pagination
- Modifying the `QuickAccessSession` component
- Backend changes
- Modifying vitest/jest test-runner configuration (pre-existing gap)
- Adding session filtering/sorting/pagination controls

### Notes
Implementation hints:
- `IndexPage.tsx` lines 14-131 (state + handlers) and 173-227 (JSX) are the relocation source.
- After removal, IndexPage may no longer need `useState`, `useEffect`, `useCallback`, `sessionApi`, `QuickAccessSession`, `SessionSummary`, `SessionListResponse` — remove only the imports that become unused. Note: `useCallback` is still used by `handleFeatureClick` and `handleGetStarted`; `useNavigate` is still used. Check each import before removing.
- `ScenarioPage.tsx` currently imports only `ScenarioSelector`; add the needed hooks/types/components.
- The `ScenarioSelector` internally uses `useNavigate` and `useSessions`; in ScenarioPage tests, mock `ScenarioSelector` to avoid pulling in the sessions context/hook dependencies.
- README lines to update: ~16, ~27, ~61, ~298, ~376 (Quick Access / Recent Sessions described as on the landing page).

### Solutions
Reference implementations to mimic:
- `IndexPage.tsx` fetching/transform/render logic (the exact code being moved)
- `IndexPage.test.tsx` test structure (jest.mock for `react-router-dom` and `../utils/api`; `mockSessions` fixture; loading/loaded/empty/error/navigation assertions)
- `DeckDetailPage.test.tsx` / `LessonPage.test.tsx` for additional page-level test patterns in this repo

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
