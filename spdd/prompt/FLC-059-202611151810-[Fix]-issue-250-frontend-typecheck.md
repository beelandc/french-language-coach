# SPDD Prompt: Make the frontend type-check pass and gate it in CI

**GitHub Issue**: #250
**Issue Title**: Fix frontend TypeScript errors so `tsc -b` (and `npm run build`) pass, and type-check in CI
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/250
**Artifact ID**: FLC-059-202611151810
**Created**: 2026-11-15 18:10
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-059-202611151804-[Analysis]-issue-250-frontend-typecheck.md`

---

## Context

### Current Codebase State
- `cd frontend && npx tsc -b` reports **69 errors in 22 files** on `main` @ `4014e34`, so `npm run build` (`tsc -b && vite build`) fails at the type-check.
- `frontend/tsconfig.json` references `tsconfig.app.json` (all of `src/`, minus `*.test.*`, `*.spec.*`, `*.stories.*`; strict; `noUnusedLocals`/`noUnusedParameters`; types `vite/client`) and `tsconfig.node.json` (`vite.config.ts`). `tsconfig.jest.json` extends the app config for ts-jest only (types `jest`, `@testing-library/jest-dom`, `node`; `include` = test files).
- CI has path-filtered `jest-tests.yml`, `vitest-tests.yml`, `cypress-tests.yml`, `pytest-tests.yml` and the required `status-gateway.yml`, which only waits on names listed in `expectedWorkflowNames` (`:43-48`). Nothing type-checks.
- User decisions (2026-11-15): leave `jest.config.cjs` coverage exclusions alone (follow-up #254); don't fix the non-type bugs found (#255 exercise `type`/`exercise_type` param, #256 exercise search, #257 exercise scoring); **remove unused logic where it's unused**.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/src/types/index.ts` | Shared types | `Session` 32-45, `BackendMessage` 26-29, `Feedback` 54-62, `CreateSessionResponse` 65-70, `SessionsContextType` 139-152, `SessionListResponse` 176-179, `ExerciseProps` 478-483, per-type `*ExerciseProps` 488-531 |
| `frontend/src/hooks/useSessions.tsx` | Real `SessionsContext` / provider | private `SessionsContextType` 5-20; `createSession` 40-75 (reads `response.messages`, builds `Session` without lock fields) |
| `frontend/src/utils/api.ts` | API client | imports 2-30 (`LessonSummary`, `DeckSummary` unused; `SessionListResponse` missing); `sessionApi.create` 88-92; `listSessions` 114-117; `searchReferences` 166-187 (`!== ''` at 180, 183) |
| `frontend/src/utils/storybookMocks.tsx` | Story mock provider | `useContext` import 9; `mockFeedback.session_id` 39; mock sessions 60-88; `createSession` 126-153 (`as const` 143); `handleSetCurrentSessionId` 248-250 (undefined `setCurrentSessionIdState`); `value` 252-265 (no lock methods) |
| `frontend/src/components/Exercise.tsx` | Exercise wrapper | `handleSubmit` 62-84 (`if (onAnswerSubmit)` 81); `renderExercise` 117-181 (child `feedback`/`isCorrect` props; `default:` 176-180 reads `.type` on `never`); Next button 256-266 (`onAnswerSubmit &&` 257) |
| `frontend/src/components/ExerciseTypes/{FillInTheBlank,MultipleChoice,Translation,Conjugation,SentenceTransformation}Exercise.tsx` | Per-type inputs | unused `feedback`/`isCorrect` destructured ~26-28; JSDoc `@param props.feedback` / `props.isCorrect`; `MultipleChoiceExercise.tsx:7` unused `React` import |
| `frontend/src/components/SessionDetail.tsx` | Session transcript + feedback | message transform 74-80 (pattern to mimic); `hasFeedback` 236; feedback render 281-352 |
| `frontend/src/components/LessonViewer.tsx` | Lesson viewer | `sectionRefs` 105; ref callback on `<section>` 291 |
| `frontend/src/components/QuickAccessSession.tsx` | Quick-access card | unused `navigate` 12 (+ `useNavigate` import) |
| `frontend/src/components/SessionHistoryItem.tsx` | History row | unused `SessionSummary` type import 3 |
| `frontend/src/pages/ExerciseBrowserPage.tsx` | Exercise list | unused `query` 55; `response.references` 67; unused `handlePageChange` 126-129 |
| `frontend/src/pages/ReferencePage.tsx` | Grammar reference | unused `handlePageChange` 98-101 |
| `frontend/src/pages/LessonPage.tsx` | Lesson browser page | unused `params`, `navigate` 20-21 (+ import 8, stale comment 25) |
| `frontend/src/pages/DeckDetailPage.tsx` | Deck detail | `SessionStats` import 16; `reviewStats` state 73-74; unused `handleReviewComplete` 125-130; never-rendered summary block 409-420 |
| `frontend/src/pages/ExercisePage.tsx` | Single exercise | `const [score, setScore] = useState(0)` 29 |
| `frontend/src/styles/global.css` | Global styles | `.deck-review-summary`, `.review-summary-stats` rules 3778-3803 and the `.review-summary-stats` media-query rule 3852-3855 (only used by the dead DeckDetailPage block) |
| `frontend/src/setupTests.ts` | Jest `setupFilesAfterEnv` | `require` 6, `expect` 9 |
| `frontend/src/testSetup.ts` | Vitest (Storybook) setup | unused params `page`, `perPage` 49; `sessionId` 84 |
| `frontend/src/mocks/browser.ts` | MSW browser worker (no importers) | `import { setupWorker } from 'msw'` 3 |
| `frontend/src/utils/pdfExport.ts` | Feedback PDF | unused `index` 129; `doc.internal.getNumberOfPages()` 235 |
| `frontend/src/utils/pdfExport.test.ts` | Vitest-style test (not discovered by any runner today) | mock `internal.getNumberOfPages` 12, 196 |
| `frontend/tsconfig.app.json`, `frontend/tsconfig.jest.json` | TS projects | `exclude` / `include` |
| `frontend/package.json` | Scripts | add `typecheck` |
| `.github/workflows/jest-tests.yml` | Workflow pattern to copy | checkout, setup-node with npm cache, `npm ci` |
| `.github/workflows/status-gateway.yml` | Required gateway | `expectedWorkflowNames` 43-48 |
| `schemas/session.py` | Backend contract | `Message` 7-9, `SessionResponse` 20-31 (`POST /sessions/` response) |
| `README.md`, `frontend/README.md`, `CLAUDE.md` | Docs | README frontend build step ~170; frontend README scripts table ~119; CLAUDE.md Commands `npx tsc -b` line 69 |

### Existing Patterns
- **Backend → frontend message transform** (`SessionDetail.tsx:74-80`): `messages.map((msg, index) => ({ id, session_id: String(data.id), role: msg.role as 'user' | 'assistant', content: msg.content, created_at: data.created_at }))`.
- **Jest + RTL tests** (`src/components/ReviewSession.jest.test.tsx`): `jest.mock('../utils/api', () => ({ ... }))`, `render`/`screen`/`fireEvent`/`waitFor`, jest-dom matchers via `setupTests.ts`. Files must be named `*.jest.test.ts(x)` to be discovered.
- **Workflow shape** (`jest-tests.yml`): `on.pull_request.paths` = `frontend/**` + its own file; `actions/checkout@v4`, `actions/setup-node@v4` with `cache: 'npm'`, `cache-dependency-path: '**/package-lock.json'`, `working-directory: frontend`.
- **Style**: components use no semicolons and single quotes; `pdfExport.ts` uses semicolons. Keep each file's style.

---

## Goal

**Primary Objective**: `cd frontend && npx tsc -b` exits 0 with the current strictness, by fixing code (not config strictness), with no new `any` / `@ts-ignore` / `@ts-expect-error`.

**Secondary Objectives**:
- Fix the real bugs behind the errors: the `storybookMocks` setter `ReferenceError`, the MSW v2 import, and `createSession` storing greeting messages without `id`/`session_id`/`created_at` (undefined React keys in `ChatInterface`).
- Remove the unused logic the errors point at (user decision 3).
- Add a `Frontend Type Check` CI workflow enforced by `status-gateway.yml`, plus an `npm run typecheck` script.
- Cover the behaviour fixes with discoverable Jest tests; update the docs.

---

## Constraints

### Architecture Constraints
- No `tsconfig` strictness changes. The only tsconfig edits allowed: exclude `src/setupTests.ts` from `tsconfig.app.json` and add it to `tsconfig.jest.json` `include`.
- No new dependencies. Don't touch `jest.config.cjs` coverage exclusions (#254).
- `types/index.ts` `SessionsContextType` becomes the single definition. `hooks/useSessions.tsx` imports it, and its private duplicate is deleted. Keep `SessionsContext` / `useSessions` exports as they are.
- Don't fix #255 (`type` vs `exercise_type`), #256 (exercise search) or #257 (scoring). Keep their current behaviour.
- **Must not change**: `static/` (never run `npm run build` / `vite build`), backend code, `jest.config.cjs`, `vite.config.ts`, `.storybook/`, `cypress/`.

### Code Quality Constraints
- Prefer narrowing and correct types over casts. The only cast allowed is `msg.role as MessageRole` (same as `SessionDetail.tsx`), because the backend role is `str`.
- JSDoc on new exported types; update existing JSDoc when you remove props (`@param props.feedback`, `@param props.isCorrect`).
- Match each file's existing style (semicolons, quotes).
- `npm run lint` must not report new errors in touched files compared with `main` (ESLint fixes themselves are out of scope).

### Testing Constraints
- New tests are **Jest** files named `*.jest.test.ts(x)` (discovered by `jest.config.cjs` `testMatch`). Confirm with `npx jest --listTests`. Plain `*.test.tsx` files aren't run by either runner (CLAUDE.md gotcha).
- Aim for ≥80% line coverage of the changed logic in each tested module, and report the per-file numbers from `npx jest --coverage --collectCoverageFrom=<file>` for the four tested files in the PR (the project coverage config excludes them; #254).
- The existing Jest suite (`npm run test:jest`) and Vitest/Storybook suite (`npm run test`) must still pass. Run Cypress locally if the stack can start; otherwise say in the PR that it was left to CI.

### Acceptance Criteria
From issue #250:
- [ ] `cd frontend && npx tsc -b` exits 0 with no errors
- [ ] The likely bugs above are fixed or confirmed harmless, each covered by a test or explained in the PR
- [ ] No new `any`, `@ts-ignore` or `@ts-expect-error` unless justified in the PR
- [ ] A CI type-check runs on PRs touching `frontend/**` and is enforced through `status-gateway.yml`
- [ ] Existing Jest, Vitest (Storybook) and Cypress suites still pass
- [ ] README / CLAUDE.md mention the type-check (and drop or adjust any wording that implies the build passes when it doesn't)

---

## Examples

### Input/Output Examples
1. **Mock provider setter (bug fix)**
   - Input: render `<MockSessionsProvider currentSessionId={null}>` with a consumer that calls `useSessions().setCurrentSessionId('abc')` on click
   - Expected Output: consumer shows `abc`; no `ReferenceError`
2. **Mock provider lock methods**
   - Input: consumer calls `lockSession('mock-session-1')` and `unlockSession('mock-session-1')`
   - Expected Output: both resolve to `undefined`
3. **`createSession` greeting mapping (bug fix)**
   - Input: `sessionApi.create` resolves `{ id: 7, scenario_id: 'cafe_order', difficulty: 'beginner', created_at: '2026-11-15T10:00:00Z', ended_at: null, messages: [{ role: 'assistant', content: 'Bonjour !' }], feedback: null, is_locked: false, locked_at: null, locked_by: null }`
   - Expected Output: `sessions[0]` = `{ id: '7', scenario_id: 'cafe_order', difficulty: 'beginner', created_at: '2026-11-15T10:00:00Z', ended_at: null, messages: [{ id: '7-0', session_id: '7', role: 'assistant', content: 'Bonjour !', created_at: '2026-11-15T10:00:00Z' }], feedback: null, is_locked: false, locked_at: null, locked_by: null }`; `currentSessionId === '7'`; the promise resolves `'7'`
4. **`searchReferences` empty filters (confirmed harmless)**
   - Input: `grammarApi.searchReferences(undefined, '', '')`
   - Expected Output: `fetch` called with `/grammar/reference/?page=1&per_page=10`
   - Input: `grammarApi.searchReferences('subj', 'verbs', 'beginner', 2, 5)`
   - Expected Output: URL `/grammar/reference/?page=2&per_page=5&q=subj&category=verbs&difficulty=beginner`
5. **Exercise flow / Next button (confirmed harmless; condition removed)**
   - Input: fill-in-the-blank exercise `{ id: 'ex-1', type: 'fill-in-the-blank', prompt: 'Je ___ français.', correct_answer: 'parle', topic: 'present tense', difficulty: 'beginner' }`; type `parle`; click `exercise-submit`
   - Expected Output: `onAnswerSubmit` called with `('ex-1', 'parle')`; `✓ Correct!` shown; `exercise-next` visible; clicking it clears feedback and shows the submit button again
6. **Exercise unknown type (runtime fallback kept)**
   - Input: an exercise object parsed from JSON with `type: 'matching'`
   - Expected Output: `exercise-error` renders `Unknown exercise type: matching`

### Edge Cases
- `sessionApi.create` response without `messages` or lock fields (e.g. `testSetup.ts` mock) → `messages: []`, `is_locked: false`, `locked_at: null`, `locked_by: null`.
- `createSession` without a difficulty and with a response lacking `difficulty` → keep the current default of `'intermediate'`.
- `session.feedback` `undefined` (not `null`) in `SessionDetail` → treated as "no feedback" (truthiness narrowing).
- Incorrect exercise answer → `✗ Incorrect. The correct answer is: parle`, and the Next button is still shown (current behaviour).
- Multiple-choice: the Next button behaves the same as before after a submit.

### Test Cases
```tsx
// src/hooks/useSessions.jest.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionsProvider, useSessions } from './useSessions'
import * as apiModule from '../utils/api'

jest.mock('../utils/api', () => ({
  sessionApi: { create: jest.fn() },
}))
const { sessionApi } = apiModule as unknown as { sessionApi: { create: jest.Mock } }

function Probe() {
  const { createSession, sessions } = useSessions()
  return (
    <>
      <button onClick={() => createSession('cafe_order', 'beginner')}>create</button>
      <pre data-testid="sessions">{JSON.stringify(sessions)}</pre>
    </>
  )
}

it('maps greeting messages from POST /sessions/ to frontend messages', async () => {
  // Given
  sessionApi.create.mockResolvedValue({
    id: 7, scenario_id: 'cafe_order', difficulty: 'beginner',
    created_at: '2026-11-15T10:00:00Z', ended_at: null,
    messages: [{ role: 'assistant', content: 'Bonjour !' }],
    feedback: null, is_locked: false, locked_at: null, locked_by: null,
  })
  render(<SessionsProvider><Probe /></SessionsProvider>)
  // When
  fireEvent.click(screen.getByText('create'))
  // Then
  await waitFor(() => {
    const [session] = JSON.parse(screen.getByTestId('sessions').textContent || '[]')
    expect(session.messages[0]).toEqual({
      id: '7-0', session_id: '7', role: 'assistant',
      content: 'Bonjour !', created_at: '2026-11-15T10:00:00Z',
    })
    expect(session.is_locked).toBe(false)
  })
})
```

---

## Deliverables

### Code Changes
- [ ] `frontend/src/types/index.ts`: add `lockSession`/`unlockSession` to `SessionsContextType`; add exported, JSDoc'd `BackendSessionResponse`; remove `feedback?`/`isCorrect?` from the five `*ExerciseProps`
- [ ] `frontend/src/hooks/useSessions.tsx`: import `SessionsContextType` from `../types` (delete the private copy); map `response.messages` and lock fields in `createSession`
- [ ] `frontend/src/utils/api.ts`: drop `LessonSummary`/`DeckSummary` imports; import `SessionListResponse` and `BackendSessionResponse`; type `sessionApi.create` as `api<BackendSessionResponse>`; remove `&& category !== ''` / `&& difficulty !== ''`
- [ ] `frontend/src/utils/storybookMocks.tsx`: drop `useContext`; drop `mockFeedback.session_id`; add lock fields to the three mock sessions and the created session; type the `createSession` param as `Difficulty` with `difficulty ?? 'intermediate'` (no `as const`); fix the setter (call the `useState` setter); add `lockSession`/`unlockSession` async no-ops to `value`
- [ ] `frontend/src/components/Exercise.tsx`: stop passing `feedback`/`isCorrect` to children; `const exerciseType: string = exercise.type` for the `default:` fallback (rendered in the error message; leave `data-testid`/className uses alone); drop the `if (onAnswerSubmit)` guard and `onAnswerSubmit &&` condition
- [ ] `frontend/src/components/ExerciseTypes/*.tsx` (5): remove the unused `feedback`/`isCorrect` destructuring and JSDoc lines; remove the unused `React` import in `MultipleChoiceExercise.tsx`
- [ ] `frontend/src/components/SessionDetail.tsx`: `const feedback = session.feedback`; render the feedback section from `feedback` (truthiness), removing `hasFeedback`
- [ ] `frontend/src/components/LessonViewer.tsx`: `sectionRefs` → `useRef<Record<string, HTMLElement | null>>({})`
- [ ] `frontend/src/components/QuickAccessSession.tsx`, `SessionHistoryItem.tsx`: remove unused imports/locals
- [ ] `frontend/src/pages/ExerciseBrowserPage.tsx`: remove the `query` local, the `.references` fallback (`response.exercises || []`), and `handlePageChange`
- [ ] `frontend/src/pages/ReferencePage.tsx`: remove `handlePageChange`
- [ ] `frontend/src/pages/LessonPage.tsx`: remove `params`, `navigate`, the now-unused router imports and the stale commented destructure
- [ ] `frontend/src/pages/DeckDetailPage.tsx`: remove `reviewStats` state, `handleReviewComplete`, the never-rendered summary block, and the `SessionStats` import if unused
- [ ] `frontend/src/styles/global.css`: remove the now-unused `.deck-review-summary` / `.review-summary-stats` rules (incl. the media-query rule)
- [ ] `frontend/src/pages/ExercisePage.tsx`: `const score = 0` with a comment referencing #257
- [ ] `frontend/src/setupTests.ts`: unchanged content; `tsconfig.app.json` `exclude` adds `src/setupTests.ts`; `tsconfig.jest.json` `include` adds `src/setupTests.ts`
- [ ] `frontend/src/testSetup.ts`: prefix unused mock params with `_` (`_page`, `_perPage`, `_sessionId`)
- [ ] `frontend/src/mocks/browser.ts`: `import { setupWorker } from 'msw/browser'`
- [ ] `frontend/src/utils/pdfExport.ts`: `doc.getNumberOfPages()`; drop the unused `index`
- [ ] `frontend/src/utils/pdfExport.test.ts`: move the `getNumberOfPages` mocks from `internal` to the doc (keep it in sync even though it isn't run)
- [ ] `frontend/package.json`: `"typecheck": "tsc -b"`
- [ ] `.github/workflows/frontend-typecheck.yml`: `name: Frontend Type Check`; `pull_request` + `push` to `main`, paths `frontend/**` and the workflow file; job name `Frontend Type Check`; Node 20; `npm ci`; `npm run typecheck`
- [ ] `.github/workflows/status-gateway.yml`: append `'Frontend Type Check'` to `expectedWorkflowNames`

### Tests
- [ ] `frontend/src/utils/storybookMocks.jest.test.tsx`: setter works; lock methods resolve; `StorybookSessionsProvider.WithFeedback` exposes feedback without `session_id`
- [ ] `frontend/src/hooks/useSessions.jest.test.tsx`: greeting mapping; missing `messages`/lock fields default; difficulty default
- [ ] `frontend/src/components/Exercise.jest.test.tsx`: correct and incorrect flow, Next resets, unknown type fallback, multiple-choice submit
- [ ] `frontend/src/utils/api.jest.test.ts`: `searchReferences` URL building (empty and full filters); `sessionApi.create` posts to `/sessions/`

### Documentation
- [ ] `README.md`: frontend section mentions `npm run typecheck` and the `Frontend Type Check` CI gate
- [ ] `frontend/README.md`: add `npm run typecheck` to the scripts table; note that `npm run build` runs `tsc -b` first and that CI type-checks without building
- [ ] `CLAUDE.md`: Commands use `npm run typecheck` (`tsc -b`); CI section lists the type-check workflow
- [ ] PR body: explain `mocks/browser.ts` (no importers; `tsc` resolution is the check), the `api.ts` and `Exercise.tsx:257` "harmless" verdicts, the removed dead code, and links to #254–#257

---

## Actual Prompt

```
Implement GitHub issue #250 in french-language-coach on branch fix/issue-250-frontend-typecheck.

CONTEXT:
- frontend/ is React 19 + TypeScript (~6.0) + Vite. `npx tsc -b` uses tsconfig.json → tsconfig.app.json
  (src/, strict, noUnusedLocals/noUnusedParameters, excludes *.test.*, *.spec.*, *.stories.*) and
  tsconfig.node.json. tsconfig.jest.json extends the app config for ts-jest only.
- On main @ 4014e34, `npx tsc -b` reports 69 errors in 22 files (full per-file table in
  spdd/analysis/FLC-059-202611151804-[Analysis]-issue-250-frontend-typecheck.md).
- Backend POST /sessions/ returns SessionResponse (schemas/session.py:20-31): id:int, scenario_id,
  difficulty, created_at, ended_at, messages:[{role, content}], feedback, is_locked, locked_at, locked_by.
- Jest discovers only **/*.jest.test.* and __tests__/ (jsdom, ts-jest with tsconfig.jest.json, setup
  src/setupTests.ts, '@/' alias mapped). Vitest runs only Storybook stories (setup src/testSetup.ts).
- CI: path-filtered workflows + status-gateway.yml, which waits on names in expectedWorkflowNames (:43-48).
- User decisions: leave jest.config.cjs coverage exclusions (#254); do NOT fix #255 (listExercises sends
  type= instead of exercise_type=), #256 (exercise search), #257 (exercise scoring); remove unused logic.

GOAL:
Make `cd frontend && npx tsc -b` exit 0 by fixing code, fix the real bugs behind the errors, remove the
unused logic, cover the behaviour fixes with Jest tests, and gate the type-check in CI.

CONSTRAINTS:
- No tsconfig strictness changes, no new dependencies, no new `any`, no @ts-ignore/@ts-expect-error.
  The only cast allowed is `msg.role as MessageRole` (mirrors SessionDetail.tsx:74-80).
- Only tsconfig edits: add "src/setupTests.ts" to tsconfig.app.json "exclude" and to tsconfig.jest.json
  "include".
- Never run `npm run build` / `vite build`; don't touch static/, backend code, jest.config.cjs,
  vite.config.ts, .storybook/, cypress/.
- Keep current behaviour except for the listed bug fixes. Keep each file's style (components: no
  semicolons, single quotes; pdfExport.ts: semicolons). Update JSDoc for removed props; add JSDoc to
  new exported types.

Changes, file by file:
1. src/types/index.ts
   - SessionsContextType: add `lockSession: (sessionId: string, clientId?: string) => Promise<void>` and
     `unlockSession: (sessionId: string, clientId?: string) => Promise<void>`.
   - Add exported `BackendSessionResponse` { id: number; scenario_id: string; difficulty?: string;
     created_at: string; ended_at?: string | null; messages?: BackendMessage[]; feedback?: Feedback | null;
     is_locked?: boolean; locked_at?: string | null; locked_by?: string | null } with JSDoc pointing at
     schemas/session.py SessionResponse. (Optional fields tolerate partial mocks like testSetup.ts.)
   - Remove `feedback?` and `isCorrect?` from the five *ExerciseProps interfaces.
2. src/hooks/useSessions.tsx
   - Delete the private SessionsContextType; import it (type-only) from '../types'.
   - createSession: build `messages: Message[]` from `(response.messages ?? []).map((msg, index) => ({
     id: `${newSessionId}-${index}`, session_id: newSessionId, role: msg.role as MessageRole,
     content: msg.content, created_at: response.created_at }))`. The new Session gets
     `difficulty: difficulty || 'intermediate'` (unchanged), `is_locked: response.is_locked ?? false`,
     `locked_at: response.locked_at ?? null`, `locked_by: response.locked_by ?? null`.
3. src/utils/api.ts
   - Remove unused LessonSummary and DeckSummary imports; import SessionListResponse and
     BackendSessionResponse.
   - sessionApi.create → `api<BackendSessionResponse>(...)` (same URL/body).
   - searchReferences: `if (category)` and `if (difficulty)` (drop the redundant `!== ''`).
4. src/utils/storybookMocks.tsx
   - Drop `useContext`; import Difficulty type. Remove `session_id` from mockFeedback.
   - Add `is_locked: false, locked_at: null, locked_by: null` to mockSession, mockEndedSession,
     mockEmptySession and to the session created in createSession.
   - createSession(scenarioId: string, difficulty?: Difficulty): `difficulty: difficulty ?? 'intermediate'`.
   - Fix the setter: rename the useState pair to `[currentSessionIdState, setCurrentSessionIdState]` so the
     existing handleSetCurrentSessionId works (and update the createSession call site).
   - Add `lockSession` and `unlockSession` as `useCallback(async (_sessionId: string, _clientId?: string)
     => {}, [])` and include them in `value`.
5. src/components/Exercise.tsx
   - Don't pass feedback/isCorrect to the five child components.
   - Before the switch: `const exerciseType: string = exercise.type`; the default branch renders
     `Unknown exercise type: {exerciseType}`.
   - handleSubmit: call `onAnswerSubmit(exercise.id, answer)` unconditionally.
   - Next button: `{isSubmitted && (...)}`.
6. src/components/ExerciseTypes/{FillInTheBlank,MultipleChoice,Translation,Conjugation,
   SentenceTransformation}Exercise.tsx: remove the `feedback`/`isCorrect` destructuring and their
   @param JSDoc lines; remove `import React from 'react'` in MultipleChoiceExercise.tsx only (the others
   use React.ChangeEvent / React.Fragment).
7. src/components/SessionDetail.tsx: replace `const hasFeedback = session.feedback !== null` with
   `const feedback = session.feedback`; render `{feedback ? (...) : (...)}` and use `feedback.` instead of
   `session.feedback.` inside the block.
8. src/components/LessonViewer.tsx: `useRef<Record<string, HTMLElement | null>>({})` for sectionRefs.
9. src/components/QuickAccessSession.tsx: remove `navigate` and the useNavigate import.
   src/components/SessionHistoryItem.tsx: remove the SessionSummary type import.
10. src/pages/ExerciseBrowserPage.tsx: remove `const query = ...`, use `response.exercises || []`
    (update the comment), remove handlePageChange.
    src/pages/ReferencePage.tsx: remove handlePageChange.
    src/pages/LessonPage.tsx: remove params/navigate, the react-router-dom import if now empty, and the
    stale commented-out destructure.
    src/pages/DeckDetailPage.tsx: remove reviewStats state + comment, handleReviewComplete, the
    "Review Session Completion Summary" block, and SessionStats from the import.
    src/styles/global.css: remove .deck-review-summary, .deck-review-summary h2, .review-summary-stats,
    .review-summary-stats span and the .review-summary-stats rule inside the 768px media query (grep
    first to confirm nothing else uses them).
    src/pages/ExercisePage.tsx: replace the score state with `const score = 0` and a comment:
    scoring is not implemented yet (see #257).
11. src/testSetup.ts: rename unused mock params to _page, _perPage, _sessionId.
    src/mocks/browser.ts: `import { setupWorker } from 'msw/browser'`.
    src/utils/pdfExport.ts: `doc.getNumberOfPages()`; `forEach((strength) => ...)`.
    src/utils/pdfExport.test.ts: move getNumberOfPages from `internal` onto the mock doc (both places).
12. package.json: add script `"typecheck": "tsc -b"` after "build".
13. .github/workflows/frontend-typecheck.yml: name "Frontend Type Check"; on push/pull_request to main
    with paths 'frontend/**' and '.github/workflows/frontend-typecheck.yml'; one job `typecheck` named
    "Frontend Type Check" on ubuntu-latest: checkout@v4, setup-node@v4 (node 20, cache npm,
    cache-dependency-path '**/package-lock.json'), `npm ci` and `npm run typecheck` in frontend/.
    .github/workflows/status-gateway.yml: append 'Frontend Type Check' to expectedWorkflowNames.

EXAMPLES:
- MockSessionsProvider(currentSessionId=null) + consumer clicking setCurrentSessionId('abc') → shows 'abc'.
- MockSessionsProvider lockSession/unlockSession → resolve undefined.
- createSession('cafe_order','beginner') with create() → {id:7, created_at:'2026-11-15T10:00:00Z',
  messages:[{role:'assistant',content:'Bonjour !'}], is_locked:false, ...} → sessions[0].messages[0] ===
  {id:'7-0', session_id:'7', role:'assistant', content:'Bonjour !', created_at:'2026-11-15T10:00:00Z'},
  sessions[0].is_locked === false, resolves '7'.
- create() → {id:8, scenario_id:'x', created_at:'...'} (no messages/lock fields) → messages [],
  is_locked false, locked_at null, locked_by null.
- searchReferences(undefined,'','') → fetch('/grammar/reference/?page=1&per_page=10', ...);
  searchReferences('subj','verbs','beginner',2,5) →
  '/grammar/reference/?page=2&per_page=5&q=subj&category=verbs&difficulty=beginner'.
- <Exercise> fill-in-the-blank {id:'ex-1', prompt:'Je ___ français.', correct_answer:'parle'}: type
  'parle', click exercise-submit → onAnswerSubmit('ex-1','parle'), '✓ Correct!', exercise-next visible;
  click Next → feedback gone, exercise-submit back. Wrong answer → '✗ Incorrect. The correct answer is:
  parle', Next still shown.
- <Exercise> with an exercise parsed from JSON having type 'matching' → 'Unknown exercise type: matching'.

ACCEPTANCE CRITERIA:
- `cd frontend && npx tsc -b --force` exits 0 with no errors
- Likely bugs fixed or explained: storybookMocks setter (fixed + test), mocks/browser.ts (fixed; no
  importers, explained in PR), api.ts '' comparisons (harmless, removed + test), Exercise.tsx:257
  (harmless, removed + test), Exercise.tsx:178 (fallback kept without cast + test); plus the
  createSession message mapping (fixed + test)
- No new any / @ts-ignore / @ts-expect-error
- Frontend Type Check workflow runs on PRs touching frontend/** and is in expectedWorkflowNames
- npm run test:jest and npm run test (Vitest/Storybook) pass; Cypress run locally if possible, else CI
- README.md, frontend/README.md and CLAUDE.md mention npm run typecheck / the CI gate

DELIVERABLES:
- The code changes above
- Jest tests (must be discovered; confirm with `npx jest --listTests`):
  src/utils/storybookMocks.jest.test.tsx, src/hooks/useSessions.jest.test.tsx,
  src/components/Exercise.jest.test.tsx, src/utils/api.jest.test.ts
  (mock modules with jest.mock as in src/components/ReviewSession.jest.test.tsx; stub global.fetch for api).
  Report per-file coverage for the tested modules via
  `npx jest --coverage --collectCoverageFrom=<file> <test>`; aim for ≥80% of the changed logic.
- Docs: README.md frontend section, frontend/README.md scripts table, CLAUDE.md Commands/CI notes
- Verification: tsc -b --force = 0 errors; test:jest; test; lint compared with main for touched files;
  `git diff --stat` shows no static/ changes
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, on 2026-11-15.

- **Type-check**: `npx tsc -b --force` goes from 69 errors to 0, with no tsconfig strictness change, no new `any`, and no `@ts-ignore` / `@ts-expect-error`. The only new production cast is `msg.role as MessageRole` in `useSessions.createSession`, copied from `SessionDetail.tsx`.
- **Bug fixes**: the `storybookMocks` setter `ReferenceError`; `mocks/browser.ts` now imports from `msw/browser`; `createSession` maps backend greeting messages to frontend `Message`s (`id` `${sessionId}-${index}`, `session_id`, `created_at`) and copies the lock fields.
- **Single `SessionsContextType`** in `types/index.ts` (with `lockSession`/`unlockSession`). The hook's private copy is gone. New `BackendSessionResponse` types `sessionApi.create`.
- **Unused logic removed**: `feedback` props on all five exercise-type components (and `isCorrect` on four of them, see deviations); the always-true `onAnswerSubmit` checks in `Exercise.tsx`; the redundant `!== ''` in `searchReferences`; unused handlers, locals and imports in five pages and two components; the `DeckDetailPage` review summary that could never render, plus its CSS. `ExercisePage` `score` is now a constant pointing at #257.
- **Tooling**: `setupTests.ts` moved from `tsconfig.app.json` to `tsconfig.jest.json`; `testSetup.ts` mocks drop their unused parameters; `pdfExport.ts` uses `doc.getNumberOfPages()` (and its undiscovered test mock follows).
- **CI**: `npm run typecheck`; `.github/workflows/frontend-typecheck.yml` (`Frontend Type Check`, Node 20, `frontend/**`); `'Frontend Type Check'` added to `status-gateway.yml` `expectedWorkflowNames`.
- **Tests**: 4 new Jest files, 22 tests: `Exercise.jest.test.tsx` (10, incl. 3 parametrised exercise types), `useSessions.jest.test.tsx` (3), `api.jest.test.ts` (4), `storybookMocks.jest.test.tsx` (5).
- **Docs**: `README.md` (type-check section, build note, test file list, CI workflow list, gateway steps), `frontend/README.md` (build description, scripts table), `CLAUDE.md` (Commands, CI line, Jest coverage gotcha).

---

## Human Review Notes

### Changes Made (deviations from the prompt)
- [x] **`MultipleChoiceExercise` keeps `isCorrect`.** The analysis and prompt said to remove `feedback`/`isCorrect` from all five exercise-type components. `MultipleChoiceExercise` does use `isCorrect` (to mark the correct/incorrect option; `tsc` only flagged its `feedback`). I first removed it, caught the mistake during implementation, and restored it as a **required** `isCorrect: boolean | null`. Its `isCorrect !== null` check relies on `null` before submission; an optional prop left `undefined` would wrongly highlight the answer. `Exercise.tsx` passes `isCorrect` only to this child. A Jest test checks no option is marked correct before submitting and that the right options are marked after.
- [x] **Mock parameters dropped instead of `_`-prefixed** (`testSetup.ts` `listSessions`/`deleteSession`, `storybookMocks.tsx` `lockSession`/`unlockSession`). The project's ESLint `no-unused-vars` doesn't ignore `_` names, so prefixed params would have kept or added lint errors. Fewer parameters is still type-compatible with the interface.
- [x] **`LessonPage`**: also removed the commented-out `initialDifficulty`/`initialTopic`/`initialSearch` props, which referenced the deleted `params` destructure, and updated the JSDoc that described URL filters.
- [x] **Extra tests beyond the prompt list**: the other three text-input exercise types, multi-answer feedback, and the mock provider's `createSession`. They cover call sites changed by this issue.
- [x] **`CLAUDE.md` Jest coverage gotcha** now says the TS errors are fixed and points at #233.

### Quality Checks
- [x] Code follows existing patterns (message mapping mirrors `SessionDetail.tsx`; Jest tests follow `ReviewSession.jest.test.tsx`; workflow mirrors `jest-tests.yml`)
- [ ] Tests pass at 80%+ coverage: **changed logic yes; whole files no** (see below)
- [x] Documentation updated
- [x] All acceptance criteria met

**Coverage** (`npx jest --coverage --collectCoverageFrom=<file>` with the four new test files; these files are excluded from the project's Jest coverage config, #233/#254):

| File | Stmts | Branch | Lines | Notes |
|---|---|---|---|---|
| `components/Exercise.tsx` | 91.4% | 93.3% | 91.4% | Uncovered: child `onSubmit` arrow callbacks (the children don't render a submit button) |
| `hooks/useSessions.tsx` | 30.6% | 27.8% | 30.8% | `createSession` fully covered; `sendMessage`/`getFeedback`/`lockSession`/`unlockSession` were never tested and are untouched here |
| `utils/api.ts` | 36.5% | 18.3% | 37.3% | Changed code (`create`, `searchReferences`, `api()` error path) covered; other endpoints untouched |
| `utils/storybookMocks.tsx` | 49.4% | 50% | 52% | Changed code (setter, lock methods, `createSession`, mock data) covered; `sendMessage`/`getFeedback` mocks untouched |

Raising whole-file coverage for the session hook, API client and story mocks was out of scope. Before this issue those files weren't measured at all.

### Issues Found
- `MultipleChoiceExercise` uses `isCorrect` (see deviations); the analysis claim that all five children ignored it was wrong for this one.
- Follow-up #254 overlaps the existing open issue #233 ("Track and reduce Jest coverage exclusions"). Flagged to the user; not closed by the AI.
- Lint (`npx eslint <file>`, branch vs `main`): no touched file got worse. Problem counts dropped in 18 files (e.g. `api.ts` 2→0, `testSetup.ts` 3→0, `ExerciseBrowserPage.tsx` 4→2); the new test files have 0.

---

## Verification

- [x] All acceptance criteria from issue #250 are met
  - [x] `npx tsc -b --force` exits 0 with 0 `error TS` lines (was 69)
  - [x] Likely bugs: storybookMocks setter fixed + `storybookMocks.jest.test.tsx`; `mocks/browser.ts` fixed, no importers, so `tsc` resolution is the check (explained in PR); `api.ts` `''` checks harmless, removed + `api.jest.test.ts`; `Exercise.tsx:257` harmless, removed + `Exercise.jest.test.tsx`; `Exercise.tsx:178` fallback kept without a cast + test; `createSession` mapping fixed + `useSessions.jest.test.tsx`
  - [x] No new `any` / `@ts-ignore` / `@ts-expect-error` (diff scan: matches only in SPDD markdown)
  - [x] `Frontend Type Check` workflow on PRs touching `frontend/**`, listed in `status-gateway.yml` (it will run for the first time on this PR)
  - [x] Existing suites pass: Jest 29 suites / 300 tests (278 existing + 22 new), Vitest 36 files / 170 tests, Cypress 27/27 (Electron, local Vite dev server with `cy.intercept` stubs, as in CI)
  - [x] README.md, frontend/README.md and CLAUDE.md mention `npm run typecheck` / the CI gate
- [ ] Tests pass with 80%+ coverage: changed logic yes; whole-file numbers above
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced (`static/` untouched; no backend changes)
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
