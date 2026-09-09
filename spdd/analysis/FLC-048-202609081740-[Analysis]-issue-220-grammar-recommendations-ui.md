# SPDD Analysis: Frontend UI for Displaying Grammar Recommendations

**GitHub Issue**: #220
**Issue Title**: Frontend UI for displaying grammar recommendations
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/220
**Artifact ID**: FLC-048-202609081740
**Created**: 2026-09-08 17:40
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

> Scoped out of issue #40 (2.8: Implement grammar-to-conversation recommendation) per the
> SPDD analysis artifact `spdd/analysis/FLC-047-202609081710-[Analysis]-issue-40-grammar-recommendations.md`.
> The analysis explicitly notes "Frontend UI for displaying recommendations (separate issue)".
>
> ## Description
> Build a frontend component that consumes `GET /grammar/recommendations/?focus_area=` and renders
> the recommended grammar lessons to the learner after a conversation session, closing the
> feedback-to-study loop.
>
> ## Acceptance Criteria
> - [ ] After session feedback is displayed, a "Recommended lessons" section renders 1-3 lessons
>       returned by the recommendations endpoint
> - [ ] Each recommended lesson shows title, topic, and difficulty
> - [ ] Each item links to the corresponding lesson viewer route
> - [ ] Loading and empty/error states handled gracefully
> - [ ] Falls back to general lessons display when focus_area is unknown
> - [ ] Component tests with Vitest (@testing-library/react), 80%+ coverage

---

## Background

Issue #40 (merged via PR #218, commit `b40362e`) added the backend endpoint
`GET /grammar/recommendations/?focus_area=<value>` to `routers/grammar.py`. It maps a conversation
feedback `focus_area` string to 1-3 relevant grammar lesson summaries (`LessonSummary`: id, title,
topic, difficulty), falling back to general beginner lessons when the focus_area is unknown. The
endpoint always returns HTTP 200 with a `RecommendationResponse` (`focus_area`, `matched_topics`,
`lessons`).

The post-session feedback view (`frontend/src/components/FeedbackView.tsx`) already displays the
`focus_area` (line 165: "Priority: Improve your {feedback.focus_area}"), but does nothing with it
beyond display. There is currently no bridge from the feedback view to the grammar lesson catalog
on the frontend. This issue closes that loop: after feedback renders, the learner sees recommended
grammar lessons and can click through to study them.

---

## Business Value

- **Closed feedback-to-study loop**: Turns the abstract "focus_area" pointer into actionable next
  steps (concrete lessons to study), increasing the chance a learner continues practicing after
  feedback.
- **Lesson discovery**: Surfaces relevant lessons without requiring the learner to manually browse
  and filter `/lessons`.
- **Engagement**: Reduces friction between receiving feedback and starting remediation.

---

## Scope In

- [x] A new `RecommendedLessons` React component that fetches `GET /grammar/recommendations/?focus_area=`
      and renders 1-3 lessons with loading / error / empty states.
- [x] A `getRecommendations(focusArea)` client function added to `grammarApi` in `utils/api.ts`.
- [x] A `RecommendationResponse` TypeScript type added to `types/index.ts` (mirrors backend schema).
- [x] Integration of `RecommendedLessons` into `FeedbackView.tsx` inside `.feedback-content`,
      after the Focus Area section, gated on `feedback.focus_area` being non-empty.
- [x] Reuse of the existing `LessonCard` component to render each recommended lesson.
- [x] Each recommended lesson links to the existing lesson viewer route `/lessons/:lessonId`.
- [x] Graceful handling of loading, empty (no lessons), and error states.
- [x] Fallback display handled by the backend (unknown focus_area returns general beginner
      lessons, HTTP 200); the component simply renders whatever `lessons` it receives.
- [x] Vitest component tests (`@testing-library/react`) for `RecommendedLessons` at 80%+ coverage.
- [x] Update to `FeedbackView.test.tsx` to mock the new child component so existing tests remain
      isolated.

## Scope Out

- [ ] Changing the backend recommendations endpoint or its response shape (done in #40).
- [ ] Persisting recommendations in the database.
- [ ] Re-ranking recommendations by user history or lesson progress (personalization).
- [ ] Changing the Mistral feedback prompt or `focus_area` contract.
- [ ] Wiring the existing orphaned vitest `*.test.tsx` suite into CI (pre-existing gap; see Notes).
- [ ] Modifying `vite.config.ts` or `jest.config.cjs` test configuration.
- [ ] Storybook stories for the new component (not requested by the issue).

---

## Acceptance Criteria (ACs)

1. **AC1 — Recommended lessons section renders 1-3 lessons after feedback**
   **Given** the feedback view has loaded and `feedback.focus_area` is present
   **When** the `RecommendedLessons` component mounts
   **Then** it calls `GET /grammar/recommendations/?focus_area=<value>` and renders a
   "Recommended lessons" section with 1-3 lesson cards

2. **AC2 — Each lesson shows title, topic, and difficulty**
   **Given** the recommendations response contains lesson summaries
   **When** the section renders
   **Then** each item displays the lesson `title`, `topic`, and `difficulty` (via `LessonCard`,
   which already renders all three plus the id)

3. **AC3 — Each item links to the lesson viewer route**
   **Given** a rendered recommended lesson card
   **When** the user clicks it
   **Then** the app navigates to `/lessons/:lessonId` (the existing `LessonDetailPage` route)

4. **AC4 — Loading and empty/error states handled gracefully**
   **Given** the component is fetching, the response has no lessons, or the fetch fails
   **When** each state occurs
   **Then** the component shows a loading indicator, an empty message, or an error message
   respectively (never crashes, never blocks the rest of the feedback view)

5. **AC5 — Falls back to general lessons when focus_area is unknown**
   **Given** the backend returns general beginner lessons for an unknown `focus_area` (HTTP 200)
   **When** the component renders the response
   **Then** it displays those general lessons (the backend owns the fallback; the component renders
   whatever `lessons` it receives)

6. **AC6 — Component tests with Vitest (@testing-library/react), 80%+ coverage**
   **Given** the `RecommendedLessons` component and its test file
   **When** the vitest suite runs
   **Then** tests cover loading, success, empty, error, click-to-navigate, and fallback rendering,
   achieving 80%+ line coverage of `RecommendedLessons.tsx`

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **FeedbackView** (`frontend/src/components/FeedbackView.tsx`): Post-session view. Loads feedback
  via `useSessions().getFeedback(sessionId)` in a `useEffect`. Renders Scores, Strengths, Focus
  Area, Corrections sections inside `.feedback-content`. `feedback.focus_area: string` is the join
  key for recommendations (types/index.ts:60). Uses `useNavigate` for Back/New Session buttons.
- **Feedback type** (`frontend/src/types/index.ts:54-62`): `focus_area: string` plus scores,
  strengths, `example_corrections`.
- **grammarApi** (`frontend/src/utils/api.ts:125-203`): object of typed fetch wrappers built on the
  generic `api<T>()` client (relative URLs, JSON, error→`Error(detail)`). Has `listLessons`,
  `getLesson`, `searchReferences`, `getReference`, `listExercises`, `getExercise`. No
  recommendations function yet.
- **LessonCard** (`frontend/src/components/LessonCard.tsx`): renders a `LessonSummary`
  (`{ id, title, topic, difficulty }`); props `{ lesson, onClick }`; `data-testid="lesson-card-${id}"`;
  role="button"; Enter/Space keyboard activation. Already used by `LessonBrowser`.
- **LessonSummary** (`frontend/src/types/index.ts:224-229`): `{ id, title, topic, difficulty }` —
  identical shape to the backend `LessonSummary`.
- **LessonBrowser** (`frontend/src/components/LessonBrowser.tsx`): canonical component-local
  data-fetch pattern — `useEffect` + `useCallback` `fetchLessons` calling `grammarApi.listLessons`,
  with `isLoading`/`error`/empty states and `handleLessonClick` → `navigate('/lessons/${id}')`.
- **Lesson viewer route** (`frontend/src/App.tsx`): `/lessons/:lessonId` → `LessonDetailPage`.
- **Backend RecommendationResponse** (`schemas/grammar.py:155-173`): `{ focus_area: str,
  matched_topics: list[str], lessons: list[LessonSummary] }`. Endpoint
  `GET /grammar/recommendations/` (`routers/grammar.py`), required `focus_area` query param,
  always returns 200; unknown/blank focus_area → fallback beginner lessons.
- **Vite dev proxy** (`frontend/vite.config.ts:25`): `/grammar` → `http://localhost:8000`, so
  `/grammar/recommendations/` is proxied in dev automatically.

### New Concepts Required

- **RecommendationResponse type** (`frontend/src/types/index.ts`): TS interface mirroring the
  backend schema: `{ focus_area: string; matched_topics: string[]; lessons: LessonSummary[] }`.
- **getRecommendations client** (`frontend/src/utils/api.ts`): new method on `grammarApi` returning
  `RecommendationResponse`.
- **RecommendedLessons component** (`frontend/src/components/RecommendedLessons.tsx`): a
  self-contained component that takes a `focusArea: string` prop, fetches recommendations on
  mount/change, and renders loading/error/empty/list states using `LessonCard`. Owns its own
  `isLoading`/`error`/`lessons` state (component-local, like `LessonBrowser`, not a context hook).

### Key Business Rules

- **Rule**: The section only renders when `focusArea` is a non-empty (trimmed) string; an empty
  focus_area means no recommendations section (defensive — the backend would return fallback
  lessons, but showing "Recommended lessons" with no focus context is noise).
- **Rule**: The component never blocks or crashes the rest of `FeedbackView`; errors are scoped to
  the section.
- **Rule**: The backend owns the fallback logic (unknown focus_area → general beginner lessons);
  the component simply renders `lessons` from the response. AC5 is satisfied by the backend
  contract already merged in #40; the component renders whatever it receives.
- **Rule**: Reuse `LessonCard` for each lesson and navigate to `/lessons/:lessonId` on click,
  matching `LessonBrowser`'s navigation pattern exactly.
- **Rule**: Encoding — `focus_area` is URL-encoded via `encodeURIComponent` when building the
  query string (it is free-form LLM text that may contain spaces/French accents).

---

## Strategic Approach

### Solution Direction

1. Add `RecommendationResponse` to `frontend/src/types/index.ts` and re-export it from
   `utils/api.ts` for convenience (matching how other response types are re-exported).
2. Add `getRecommendations(focusArea: string)` to `grammarApi` in `utils/api.ts`:
   `api<RecommendationResponse>('/grammar/recommendations/?focus_area=' + encodeURIComponent(focusArea), { method: 'GET' })`.
3. Create `frontend/src/components/RecommendedLessons.tsx`:
   - Props: `{ focusArea: string }`.
   - State: `lessons: LessonSummary[]`, `isLoading: boolean`, `error: string | null`.
   - `useEffect` keyed on `focusArea` calls `grammarApi.getRecommendations(focusArea)`; sets
     state; trims and guards empty `focusArea` (renders nothing).
   - Uses `useNavigate` + `handleLessonClick(id) => navigate('/lessons/${id}')`.
   - Renders: loading (`data-testid="recommendations-loading"`), error
     (`data-testid="recommendations-error"`), empty (`data-testid="recommendations-empty"`), or a
     list of `LessonCard`s inside a section with heading "Recommended lessons"
     (`data-testid="recommended-lessons"`).
   - Reuse `LessonCard` (imported from `./LessonCard`).
4. Integrate into `FeedbackView.tsx`: after the Focus Area section (`data-testid="focus-area-section"`), add `<RecommendedLessons focusArea={feedback.focus_area} />` — only when
   `feedback.focus_area` is non-empty. Export `RecommendedLessons` from `components/index.ts`.
5. Write `frontend/src/components/RecommendedLessons.test.tsx` (vitest + @testing-library/react):
   - Mock `../utils/api` to provide `grammarApi.getRecommendations` as a `vi.fn()`.
   - Wrap renders in `<MemoryRouter>` (uses `useNavigate`).
   - Cover: loading state, success render (1-3 lessons show title/topic/difficulty), empty state,
     error state, click→navigate, fallback render (unknown focus_area returns general lessons →
     component still renders them), and empty `focusArea` prop → renders nothing.
   - Import all vitest APIs explicitly (`describe, it, expect, vi, beforeEach, afterEach`).
6. Update `frontend/src/components/FeedbackView.test.tsx`: add `vi.mock('./RecommendedLessons', ...)`
   so the existing (separately-run) FeedbackView tests stay isolated from the new fetch.
7. Verify locally with a vitest jsdom config (see Notes) and 80%+ coverage on
   `RecommendedLessons.tsx`.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| New component vs inline in FeedbackView | Inline is fewer files; a component is testable/isolated | Separate `RecommendedLessons` component — testable in isolation, matches the `LessonBrowser` component-local fetch pattern, keeps `FeedbackView` focused |
| Component-local state vs context hook | A `useRecommendations` hook/context is reusable but YAGNI for one call site | Component-local `useEffect`+state, mirroring `LessonBrowser` — the repo has no `useLessons` context and adding one for a single call site is over-engineering |
| Reuse LessonCard vs new card | New card could show "recommended" badge; reuse is DRY | Reuse `LessonCard` — it already renders title/topic/difficulty/id and handles a11y/keyboard; AC2 only requires title/topic/difficulty |
| Where to place the section | Before/after Focus Area | After the Focus Area section — the section directly follows the "Priority: Improve your X" text, making the recommendation-to-study link obvious |
| Empty focus_area handling | Render fallback vs render nothing | Render nothing when `focusArea` is empty/whitespace — avoids a "Recommended lessons" heading with no focus context; the backend fallback is for *unknown* non-empty values, not blank |
| Test runner | Vitest (issue requirement) vs jest (CI-wired) | Vitest per the issue; verify locally with a jsdom vitest config. Do not modify repo test config (scope). The repo's vitest CI currently runs only Storybook stories; wiring the broader `*.test.tsx` suite into CI is a pre-existing gap out of scope for this issue |

### Alternatives Considered

- **Alternative 1**: Render recommendations inline in `FeedbackView` without a separate component.
  Rejected — harder to test in isolation and `FeedbackView` is already large; a component matches
  the established `LessonBrowser` pattern.
- **Alternative 2**: Add a `useRecommendations` context hook. Rejected — single call site; a
  context hook is over-engineering (the repo has no `useLessons` context either).
- **Alternative 3**: Build a new "recommended" card with a badge. Rejected — AC2 only requires
  title/topic/difficulty, all of which `LessonCard` already renders; reuse is DRY.
- **Alternative 4**: Wire the `*.test.tsx` vitest suite into `vite.config.ts` CI. Rejected for this
  issue — it would surface many pre-existing broken/orphaned vitest tests (no `globals: true`,
  `FeedbackView.test.tsx` never mocks `useSessions`), breaking CI. That infra fix is a separate
  concern (see Notes).

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Falls back to general lessons when focus_area is unknown" (AC5) — frontend or backend? | Does the component implement fallback, or rely on the backend? | The backend (#40) already returns general beginner lessons for unknown focus_area (HTTP 200, `matched_topics: []`). The component renders whatever `lessons` it receives — AC5 is satisfied by the backend contract. Document this so it is clear the component does not duplicate fallback logic. |
| Empty/blank `focus_area` — render section or not? | Should a blank focus_area show fallback lessons? | Render nothing for a blank/whitespace focus_area (no "Recommended lessons" heading without focus context). The backend's fallback is for *unknown non-empty* values. |
| "1-3 lessons" — enforce cap client-side? | Should the component cap at 3? | The backend already caps at 3. The component renders all returned lessons (≤3 by contract); no client cap needed. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| `focusArea` is empty/whitespace | Feedback may lack a focus_area | Component renders nothing (no section) |
| API returns `lessons: []` | Empty catalog / defensive | Render empty state ("No recommended lessons available.") |
| API request fails (network/500) | Resilience | Render error state with message; do not crash the feedback view |
| `focusArea` changes (re-feedback) | Re-fetch on change | `useEffect` keyed on `focusArea` re-fetches |
| French/space characters in focus_area | URL encoding | `encodeURIComponent` the focus_area in the query string |
| Rapid unmount during fetch | State update after unmount | Use a cancelled flag / ignore — keep simple; React 19 tolerates this but guard against setting state if unmounted |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Integrating into FeedbackView breaks existing FeedbackView tests | Test regressions | Mock `RecommendedLessons` in `FeedbackView.test.tsx` (child-component mock, like the existing ScoreCard/CorrectionItem mocks) |
| New vitest test not run in repo CI | AC6 unverifiable in CI | Verify locally with a jsdom vitest config + coverage; note the pre-existing CI gap. Do not expand scope to rewire CI. |
| `LessonCard` shape mismatch with backend `LessonSummary` | Render errors | `LessonSummary` TS type already matches backend exactly (id/title/topic/difficulty); no mapping needed |
| `focus_area` with special chars breaks URL | Bad request | `encodeURIComponent` the value |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Recommended lessons section renders 1-3 lessons after feedback | Yes | `RecommendedLessons` fetches + renders; gated on non-empty `focus_area` |
| AC2 | Each lesson shows title, topic, difficulty | Yes | Reuse `LessonCard` (renders title, topic, difficulty, id) |
| AC3 | Each item links to lesson viewer route | Yes | `handleLessonClick` → `navigate('/lessons/${id}')` |
| AC4 | Loading/empty/error handled gracefully | Yes | Three states with distinct testids |
| AC5 | Fallback to general lessons for unknown focus_area | Yes (backend) | Backend (#40) returns general beginner lessons; component renders them |
| AC6 | Vitest component tests, 80%+ coverage | Yes | `RecommendedLessons.test.tsx` covering all states + navigation |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- The new type and api client must be exported so other code can reuse them later.
- The Vite dev proxy already covers `/grammar`, so no proxy change is needed.
- `encodeURIComponent` for the focus_area query value.

---

## REASONS Canvas

### Requirements
- After feedback, render a "Recommended lessons" section with 1-3 lessons from
  `GET /grammar/recommendations/?focus_area=` (AC1).
- Each lesson shows title, topic, difficulty (AC2).
- Each item links to `/lessons/:lessonId` (AC3).
- Loading/empty/error states (AC4).
- Fallback to general lessons for unknown focus_area (AC5, backend-owned).
- Vitest component tests, 80%+ coverage (AC6).

### Examples
- `focus_area="Past Tenses"` → response `lessons: [passe-compose, imparfait, plus-que-parfait]` →
  3 LessonCards, each clickable → `/lessons/passe-compose` etc.
- `focus_area="Pratiquer davantage"` (unknown) → backend returns general beginner lessons →
  component renders them (fallback satisfied by backend).
- `focus_area=""` → component renders nothing.
- API failure → `data-testid="recommendations-error"` with message; feedback view otherwise intact.

### Architecture
- Frontend: React 19 + react-router-dom 7, components in `src/components/`, pages in `src/pages/`.
- API client: `utils/api.ts` generic `api<T>()` + `grammarApi` object; relative URLs (Vite proxy).
- Component-local data fetch pattern (LessonBrowser is the reference): `useEffect`+`useCallback`,
  `isLoading`/`error`/empty states, `useNavigate` for lesson links.
- Types in `src/types/index.ts`, re-exported from `utils/api.ts`.
- Routing: `/lessons/:lessonId` already registered (App.tsx).

### Standards
- Match existing codebase style (2-space indent, single quotes, semicolons, `data-testid` for
  test hooks).
- 80%+ coverage for new component.
- Docstrings/JSDoc for the new component and api function.
- Minimal diff; do not reformat unrelated code.
- Do not modify test infra (`vite.config.ts`, `jest.config.cjs`).

### Omissions
- No backend changes (endpoint done in #40).
- No DB persistence, no personalization, no Mistral prompt changes.
- No CI rewiring of the vitest `*.test.tsx` suite (pre-existing gap, out of scope).
- No Storybook stories for the new component.

### Notes
- The repo's vitest CI (`vitest run`) currently runs ONLY Storybook stories
  (`vite.config.ts` has a single `storybook (chromium)` project). Plain `*.test.tsx` files are not
  included in any vitest project, and jest (`jest.config.cjs`) only matches `*.jest.test.*`. The
  existing `*.test.tsx` files are therefore not executed in CI today and several are broken
  (e.g., `FeedbackView.test.tsx` never mocks `useSessions`; many rely on `globals: true` which is
  not set). This is a pre-existing condition, not introduced by this issue. The new test will be
  verified locally with a jsdom vitest config (globals + `@testing-library/jest-dom/vitest`) and
  80%+ coverage; wiring the broader suite into CI is deliberately out of scope.
- `feedback.focus_area` is free-form LLM text (French/English); `encodeURIComponent` it.
- Backend `RecommendationResponse` JSON: `{ focus_area, matched_topics: [], lessons: [{id,title,topic,difficulty}] }`.

### Solutions
- Reuse `LessonCard` (`src/components/LessonCard.tsx`) for each lesson.
- Reuse `LessonBrowser`'s fetch/state/navigate pattern for the new component.
- Reuse `grammarApi` + generic `api<T>()` for the client function.
- Mirror the `RecommendationResponse` Pydantic schema as a TS interface.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
