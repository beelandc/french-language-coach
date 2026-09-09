# SPDD Prompt: Frontend UI for Displaying Grammar Recommendations

**GitHub Issue**: #220
**Issue Title**: Frontend UI for displaying grammar recommendations
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/220
**Artifact ID**: FLC-048-202609081745
**Created**: 2026-09-08 17:45
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-048-202609081740-[Analysis]-issue-220-grammar-recommendations-ui.md`

---

## Context

### Current Codebase State
- The backend endpoint `GET /grammar/recommendations/?focus_area=<value>` exists (issue #40, PR
  #218). It always returns HTTP 200 with `RecommendationResponse`:
  `{ focus_area: string, matched_topics: string[], lessons: LessonSummary[] }` where each
  `LessonSummary` is `{ id, title, topic, difficulty }`. Unknown/blank focus_area returns general
  beginner lessons (fallback). Lessons are capped at 3.
- Frontend: React 19 + react-router-dom 7. Components in `frontend/src/components/`, types in
  `frontend/src/types/index.ts`, API client in `frontend/src/utils/api.ts`.
- `grammarApi` in `utils/api.ts` (lines 125-203) wraps typed `api<T>()` calls (relative URLs,
  JSON, throws `Error(detail)` on non-OK). It has `listLessons`, `getLesson`, etc. No
  recommendations function yet.
- `LessonCard` (`components/LessonCard.tsx`) renders a `LessonSummary` with props
  `{ lesson: LessonSummary, onClick: (id: string) => void }`, `data-testid="lesson-card-${id}"`,
  role="button", Enter/Space activation.
- `LessonBrowser` is the canonical component-local fetch pattern: `useEffect` + `useCallback`
  `fetchLessons`, `isLoading`/`error`/empty states, and
  `handleLessonClick = (id) => navigate('/lessons/${id}')`.
- `FeedbackView` (`components/FeedbackView.tsx`) loads feedback via `useSessions().getFeedback`,
  renders Scores/Strengths/Focus Area/Corrections inside `.feedback-content`.
  `feedback.focus_area: string` (types/index.ts:60) is the recommendations query key. The Focus
  Area section is `data-testid="focus-area-section"` (line 162-167).
- Routing (`App.tsx`): `/lessons/:lessonId` → `LessonDetailPage` (already registered).
- Vite dev proxy (`vite.config.ts:25`) proxies `/grammar` → `http://localhost:8000`, so
  `/grammar/recommendations/` is proxied automatically; no proxy change needed.
- Test conventions: vitest + @testing-library/react; tests co-located as `*.test.tsx`; mock the
  api via `vi.mock('../utils/api', () => ({ grammarApi: { ... } }))`; wrap router-dependent
  renders in `<MemoryRouter>`; use `data-testid` selectors; `waitFor` for async. Import vitest
  APIs explicitly (`describe, it, expect, vi, beforeEach, afterEach`) — the repo config does NOT
  set `test.globals`.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/src/types/index.ts` | Shared TS types | `LessonSummary` line 224; `Feedback` line 54 (`focus_area` line 60) |
| `frontend/src/utils/api.ts` | API client | `grammarApi` line 125; `api<T>()` line 40; re-exports line 258 |
| `frontend/src/components/LessonCard.tsx` | Lesson card (reuse) | props `{ lesson, onClick }`; `data-testid="lesson-card-${id}"` |
| `frontend/src/components/LessonBrowser.tsx` | Reference fetch pattern | `fetchLessons` useCallback; `handleLessonClick` → `navigate('/lessons/${id}')` |
| `frontend/src/components/FeedbackView.tsx` | Integration target | Focus Area section lines 161-167; `.feedback-content` line 135 |
| `frontend/src/components/index.ts` | Component barrel exports | add `RecommendedLessons` export |
| `frontend/src/App.tsx` | Routes | `/lessons/:lessonId` already exists |
| `frontend/src/components/FeedbackView.test.tsx` | Existing tests | mock child components (ScoreCard/CorrectionItem); add RecommendedLessons mock |

### Existing Patterns
- Component-local fetch: `useEffect` + `useCallback` async fetch, `isLoading`/`error`/data state,
  `err instanceof Error ? err.message : '...'` for messages (see `LessonBrowser.fetchLessons`).
- API method: `api<ResponseType>('/path/?query=' + encodeURIComponent(val), { method: 'GET' })`
  added to the `grammarApi` object.
- Navigation: `useNavigate()` + `navigate('/lessons/${lessonId}')`.
- Test: `vi.mock('../utils/api', ...)` + `MemoryRouter` + `data-testid` + `waitFor`.

---

## Goal

**Primary Objective**: Build a `RecommendedLessons` React component that fetches
`GET /grammar/recommendations/?focus_area=` and renders 1-3 recommended grammar lessons after
session feedback, with loading/error/empty states and click-through to the lesson viewer.

**Secondary Objectives**:
- Add `RecommendationResponse` type and `grammarApi.getRecommendations()` client function.
- Integrate the component into `FeedbackView` after the Focus Area section, gated on non-empty
  `feedback.focus_area`.
- Reuse `LessonCard` for rendering each lesson.
- Write a vitest component test at 80%+ coverage.
- Keep existing FeedbackView tests isolated by mocking the new child component.

---

## Constraints

### Architecture Constraints
- Add the new component to `frontend/src/components/RecommendedLessons.tsx` (new file).
- Add `getRecommendations` to the EXISTING `grammarApi` object in `utils/api.ts` (no new module).
- Add `RecommendationResponse` to `frontend/src/types/index.ts` and re-export it from
  `utils/api.ts` (matching the existing re-export block).
- Reuse `LessonCard` from `./LessonCard` for each lesson; do NOT create a new card component.
- Navigate to the EXISTING `/lessons/:lessonId` route on click (no new route).
- Do NOT modify the backend, the Mistral prompt, or any existing endpoint behavior.
- Do NOT modify `vite.config.ts` or `jest.config.cjs`.
- Component-local state only (no new context hook/provider).

### Code Quality Constraints
- Match existing codebase style: 2-space indent, single quotes, semicolons, `data-testid` hooks.
- JSDoc on the new component and the new api function.
- Minimal diff; do not reformat unrelated code.
- `encodeURIComponent` the `focus_area` query value (free-form LLM text, spaces/French accents).

### Testing Constraints
- New test file: `frontend/src/components/RecommendedLessons.test.tsx` (vitest +
  @testing-library/react).
- Import vitest APIs explicitly: `describe, it, expect, vi, beforeEach, afterEach` (globals are
  NOT enabled in the repo config).
- Mock the api: `vi.mock('../utils/api', () => ({ grammarApi: { getRecommendations: vi.fn() } }))`.
- Wrap renders in `<MemoryRouter>` (component uses `useNavigate`).
- Use `data-testid` selectors and `waitFor` for async state transitions.
- Cover: loading, success (1-3 lessons render title/topic/difficulty), empty, error,
  click→navigate, fallback (unknown focus_area returns general lessons → component renders them),
  and empty `focusArea` prop → renders nothing.
- Achieve 80%+ line coverage of `RecommendedLessons.tsx`.
- Add `vi.mock('./RecommendedLessons', ...)` to `FeedbackView.test.tsx` so existing tests stay
  isolated from the new fetch.

### Acceptance Criteria
- [ ] After session feedback is displayed, a "Recommended lessons" section renders 1-3 lessons
- [ ] Each recommended lesson shows title, topic, and difficulty
- [ ] Each item links to the corresponding lesson viewer route
- [ ] Loading and empty/error states handled gracefully
- [ ] Falls back to general lessons display when focus_area is unknown
- [ ] Component tests with Vitest (@testing-library/react), 80%+ coverage

---

## Examples

### Input/Output Examples

1. **Known focus_area**
   - Input: `focusArea="Past Tenses"`
   - API returns: `{ focus_area: "Past Tenses", matched_topics: ["Past Tenses"], lessons: [
       { id: "passe-compose", title: "Le Passé Composé", topic: "Past Tenses", difficulty: "beginner" },
       { id: "imparfait", title: "L'Imparfait", topic: "Past Tenses", difficulty: "intermediate" },
       { id: "plus-que-parfait", title: "Le Plus-Que-Parfait", topic: "Past Tenses", difficulty: "advanced" } ] }`
   - Expected: section heading "Recommended lessons" + 3 LessonCards; clicking a card navigates to
     `/lessons/passe-compose` etc.

2. **Unknown focus_area (fallback)**
   - Input: `focusArea="Pratiquer davantage"`
   - API returns: `{ focus_area: "...", matched_topics: [], lessons: [ <general beginner lessons> ] }`
   - Expected: section renders the general beginner lessons (fallback owned by backend).

3. **Empty focus_area prop**
   - Input: `focusArea=""` (or whitespace)
   - Expected: component renders nothing (no section, no fetch).

4. **API error**
   - Input: fetch rejects with `Error("Failed to load recommendations")`
   - Expected: `data-testid="recommendations-error"` with the message; rest of feedback view intact.

5. **Empty lessons**
   - Input: API returns `{ lessons: [] }`
   - Expected: `data-testid="recommendations-empty"` with "No recommended lessons available."

### Edge Cases
- Whitespace-only `focusArea` → trim → render nothing.
- `focus_area` with spaces/French accents → `encodeURIComponent` in the query string.
- Component unmounts during fetch → avoid setting state after unmount (cancelled flag).
- `focusArea` changes → `useEffect` re-fetches.

### Test Cases
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RecommendedLessons from './RecommendedLessons'
import { grammarApi } from '../utils/api'

vi.mock('../utils/api', () => ({
  grammarApi: { getRecommendations: vi.fn() },
}))

const mockLessons = [
  { id: 'passe-compose', title: 'Le Passé Composé', topic: 'Past Tenses', difficulty: 'beginner' },
  { id: 'imparfait', title: "L'Imparfait", topic: 'Past Tenses', difficulty: 'intermediate' },
]

describe('RecommendedLessons', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.clearAllMocks() })

  it('renders loading state then lessons', async () => {
    ;(grammarApi.getRecommendations as any).mockResolvedValue({
      focus_area: 'Past Tenses', matched_topics: ['Past Tenses'], lessons: mockLessons,
    })
    render(<MemoryRouter><RecommendedLessons focusArea="Past Tenses" /></MemoryRouter>)
    expect(screen.getByTestId('recommendations-loading')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('recommended-lessons')).toBeInTheDocument()
      expect(screen.getByText('Le Passé Composé')).toBeInTheDocument()
    })
  })

  it('renders error state on failure', async () => {
    ;(grammarApi.getRecommendations as any).mockRejectedValue(new Error('boom'))
    render(<MemoryRouter><RecommendedLessons focusArea="x" /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByTestId('recommendations-error')).toHaveTextContent('boom')
    })
  })

  it('renders nothing when focusArea is empty', () => {
    render(<MemoryRouter><RecommendedLessons focusArea="" /></MemoryRouter>)
    expect(screen.queryByTestId('recommended-lessons')).not.toBeInTheDocument()
  })

  it('renders empty state when no lessons', async () => {
    ;(grammarApi.getRecommendations as any).mockResolvedValue({
      focus_area: 'x', matched_topics: [], lessons: [],
    })
    render(<MemoryRouter><RecommendedLessons focusArea="x" /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByTestId('recommendations-empty')).toBeInTheDocument()
    })
  })

  it('navigates to lesson viewer on card click', async () => {
    ;(grammarApi.getRecommendations as any).mockResolvedValue({
      focus_area: 'Past Tenses', matched_topics: ['Past Tenses'], lessons: mockLessons,
    })
    render(<MemoryRouter initialEntries={['/feedback/1']}><RecommendedLessons focusArea="Past Tenses" /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('lesson-card-passe-compose')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('lesson-card-passe-compose'))
    // navigation asserted via router (use Routes + location state in real test)
  })
})
```

---

## Deliverables

### Code Changes
- [ ] `frontend/src/types/index.ts` — add `RecommendationResponse` interface
      (`{ focus_area: string; matched_topics: string[]; lessons: LessonSummary[] }`).
- [ ] `frontend/src/utils/api.ts` — add `getRecommendations(focusArea)` to `grammarApi`; add
      `RecommendationResponse` to imports and the re-export block.
- [ ] `frontend/src/components/RecommendedLessons.tsx` — new component (props `{ focusArea }`,
      fetch on mount/change, loading/error/empty/list states, reuse `LessonCard`, navigate to
      `/lessons/:id`).
- [ ] `frontend/src/components/index.ts` — export `RecommendedLessons`.
- [ ] `frontend/src/components/FeedbackView.tsx` — render `<RecommendedLessons focusArea={feedback.focus_area} />`
      after the Focus Area section when `feedback.focus_area` is non-empty.

### Tests
- [ ] `frontend/src/components/RecommendedLessons.test.tsx` — vitest tests covering loading,
      success, empty, error, click→navigate, fallback render, empty focusArea.
- [ ] `frontend/src/components/FeedbackView.test.tsx` — add `vi.mock('./RecommendedLessons', ...)`.
- [ ] 80%+ line coverage on `RecommendedLessons.tsx` (verified locally).

### Documentation
- [ ] JSDoc on `RecommendedLessons` and `getRecommendations`.
- [ ] No README change required (no new user-facing route or API; endpoint already documented in #40).

---

## Actual Prompt

```
Implement GitHub issue #220: frontend UI for displaying grammar recommendations.

CONTEXT:
- Backend endpoint GET /grammar/recommendations/?focus_area=<value> exists (issue #40, PR #218),
  always returns 200 with { focus_area, matched_topics: string[], lessons: LessonSummary[] };
  LessonSummary = { id, title, topic, difficulty }; unknown focus_area → fallback beginner lessons.
- Frontend: React 19 + react-router-dom 7. API client grammarApi in utils/api.ts (typed api<T>()).
- LessonCard ({ lesson: LessonSummary, onClick }) renders title/topic/difficulty/id, testid lesson-card-${id}.
- LessonBrowser is the reference component-local fetch pattern (useEffect+useCallback, isLoading/error/empty, navigate('/lessons/${id}')).
- FeedbackView renders feedback.focus_area in a Focus Area section (data-testid="focus-area-section").
- Route /lessons/:lessonId already exists. Vite proxy covers /grammar.

GOAL:
- Add a RecommendedLessons component that fetches recommendations for feedback.focus_area and renders
  1-3 lessons after feedback, with loading/error/empty states, reusing LessonCard, linking to /lessons/:id.

CONSTRAINTS:
- New file frontend/src/components/RecommendedLessons.tsx; add getRecommendations to existing grammarApi;
  add RecommendationResponse type to types/index.ts and re-export from utils/api.ts.
- Reuse LessonCard; navigate to existing /lessons/:lessonId route; component-local state only.
- encodeURIComponent the focus_area. Render nothing for empty/whitespace focusArea.
- Backend owns the fallback (render whatever lessons come back). Errors scoped to the section.
- Match codebase style (2-space, single quotes, semicolons, data-testid). JSDoc on new code.
- Do NOT modify backend, vite.config.ts, jest.config.cjs, or existing endpoints.
- Vitest test (RecommendedLessons.test.tsx): import vitest APIs explicitly (no globals), mock
  '../utils/api' grammarApi.getRecommendations, wrap in MemoryRouter, cover loading/success/empty/
  error/click-navigate/fallback/empty-focusArea; 80%+ coverage. Add vi.mock('./RecommendedLessons')
  to FeedbackView.test.tsx for isolation.

ACCEPTANCE CRITERIA (from issue #220):
- [ ] After feedback, a "Recommended lessons" section renders 1-3 lessons
- [ ] Each lesson shows title, topic, difficulty
- [ ] Each item links to the lesson viewer route
- [ ] Loading and empty/error states handled gracefully
- [ ] Falls back to general lessons when focus_area is unknown (backend-owned)
- [ ] Component tests with Vitest (@testing-library/react), 80%+ coverage

DELIVERABLES:
- types/index.ts: RecommendationResponse type
- utils/api.ts: grammarApi.getRecommendations + re-export
- components/RecommendedLessons.tsx: new component
- components/index.ts: export
- components/FeedbackView.tsx: integrate after Focus Area section
- components/RecommendedLessons.test.tsx: vitest tests
- components/FeedbackView.test.tsx: mock RecommendedLessons
```

---

## AI Response

Implementation completed per the prompt. Summary of what was built:

1. **Types** (`frontend/src/types/index.ts`): added `RecommendationResponse`
   (`{ focus_area, matched_topics: string[], lessons: LessonSummary[] }`) mirroring the backend
   schema from issue #40.
2. **API client** (`frontend/src/utils/api.ts`): added `grammarApi.getRecommendations(focusArea)`
   using `encodeURIComponent`; added `RecommendationResponse` to the type import and the
   re-export block.
3. **Component** (`frontend/src/components/RecommendedLessons.tsx`): new self-contained component
   (props `{ focusArea }`). Component-local `useEffect` keyed on the trimmed `focusArea` fetches
   recommendations with a `cancelled` guard. Renders loading / error / empty / list states, each
   with a distinct `data-testid`. Reuses `LessonCard`; `handleLessonClick` →
   `navigate('/lessons/${id}')`. Renders nothing for empty/whitespace `focusArea`. The backend owns
   the fallback (unknown focus_area → general beginner lessons); the component renders whatever
   `lessons` it receives.
4. **Barrel export** (`frontend/src/components/index.ts`): exports `RecommendedLessons`.
5. **Integration** (`frontend/src/components/FeedbackView.tsx`): renders
   `<RecommendedLessons focusArea={feedback.focus_area} />` immediately after the Focus Area
   section, gated on a non-empty trimmed `focus_area`.
6. **Tests** (`frontend/src/components/RecommendedLessons.test.tsx`): vitest + @testing-library/react,
   18 tests covering rendering, loading, error (Error + non-Error rejections), empty, fallback,
   click→navigate, API invocation (trimming + re-fetch on change), and empty/whitespace focus_area.
7. **Isolation** (`frontend/src/components/FeedbackView.test.tsx`): added
   `vi.mock('./RecommendedLessons', ...)` so existing FeedbackView tests stay isolated.

---

## Human Review Notes

### Changes Made
- [x] `frontend/src/types/index.ts`: added `RecommendationResponse`.
- [x] `frontend/src/utils/api.ts`: added `getRecommendations` to `grammarApi`; wired import + re-export.
- [x] `frontend/src/components/RecommendedLessons.tsx`: new component.
- [x] `frontend/src/components/index.ts`: barrel export.
- [x] `frontend/src/components/FeedbackView.tsx`: integrated after Focus Area section.
- [x] `frontend/src/components/RecommendedLessons.test.tsx`: 18 vitest tests.
- [x] `frontend/src/components/FeedbackView.test.tsx`: child-component mock for isolation.

### Quality Checks
- [x] Code follows existing patterns (grammarApi method, LessonBrowser fetch pattern, LessonCard
      reuse, MemoryRouter + data-testid test style)
- [x] New test passes: 18/18; coverage 100% lines / 85% branch / 95.23% stmts on
      `RecommendedLessons.tsx` (verified locally with a temporary jsdom vitest config)
- [x] No new TypeScript errors introduced (pre-existing tsc errors in `api.ts` unused imports,
      `setupTests.ts`, `storybookMocks.tsx`, `pdfExport.ts` are unchanged and out of scope)
- [x] No breaking changes: existing `FeedbackView.test.tsx` failures are pre-existing (it never
      mocks `useSessions`) and unchanged by this change; it is not run in CI today
- [x] Minimal diff (5 modified + 2 new source files + SPDD artifacts)

### Issues Found
- The repo's vitest CI (`vitest run`) currently runs only Storybook stories (`vite.config.ts`
  defines a single `storybook (chromium)` project); plain `*.test.tsx` files are not included in
  any vitest project, and jest only matches `*.jest.test.*`. The new vitest component test was
  verified locally with a temporary jsdom config (globals + `@testing-library/jest-dom/vitest`).
  Wiring the broader `*.test.tsx` suite into CI is a pre-existing gap and deliberately out of scope
  for this issue (would surface many broken orphaned tests). The temporary config was deleted
  before commit so it is not part of the change.

---

## Verification

- [x] All acceptance criteria from issue #220 are met (AC1-AC6)
- [x] Vitest tests pass with 80%+ coverage on RecommendedLessons.tsx (verified locally: 100% lines)
- [x] Code follows project conventions
- [x] No breaking changes introduced (existing FeedbackView tests isolated via mock)
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
