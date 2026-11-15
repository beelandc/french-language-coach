# SPDD Analysis: Make the frontend type-check pass and gate it in CI

**GitHub Issue**: #250
**Issue Title**: Fix frontend TypeScript errors so `tsc -b` (and `npm run build`) pass, and type-check in CI
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/250
**Artifact ID**: FLC-059-202611151804
**Created**: 2026-11-15 18:04
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> `npx tsc -b` in `frontend/` reports **69 type errors across 22 files** on `main`. `npm run build` is `tsc -b && vite build`, so the documented production build stops at the type-check and Vite never runs. CI runs the test suites but never type-checks, so these errors have built up unnoticed. When reviewing a PR you have to diff `tsc` output against `main` to tell whether it adds any.
>
> Found while working on #229 (PR #248, which adds no new errors).
>
> ## Breakdown (`main`, Nov 2026)
>
> | Category | Count | Where |
> |---|---|---|
> | Unused imports, variables and parameters (TS6133/TS6196, under `noUnusedLocals`/`noUnusedParameters`) | ~26 | `ExerciseTypes/*`, `utils/api.ts`, `QuickAccessSession.tsx`, `SessionHistoryItem.tsx`, `storybookMocks.tsx` |
> | Possibly-null access (TS18047) | 12 | `components/SessionDetail.tsx` (`session.feedback`) |
> | Types that no longer match the code (TS2322/2339/2345/2739/2552/2353) | ~20 | `Exercise.tsx`, `storybookMocks.tsx` (mock `Session`s lack the lock fields; mock context lacks `lockSession`/`unlockSession`), `useSessions.tsx` (`createSession` reads `.messages` from a response type without it), `ExerciseBrowserPage.tsx` (`ExerciseListResponse.references`), `api.ts` (`SessionListResponse` not imported), `LessonViewer.tsx`, pages |
> | Test and tooling setup (TS2591/TS2304/TS2305) | ~6 | `setupTests.ts` / `testSetup.ts` (`require`/`expect` without Node or Jest types), `mocks/browser.ts` (`setupWorker` moved to `msw/browser` in MSW v2), `pdfExport.ts` (`getNumberOfPages` not in jsPDF types) |
>
> Reproduce: `cd frontend && npx tsc -b 2>&1 | grep -c "error TS"`
>
> ### Likely real bugs (not just typing)
> - `src/utils/storybookMocks.tsx:249`: calls the undefined `setCurrentSessionIdState`. Any story that calls `setCurrentSessionId` throws a ReferenceError.
> - `src/mocks/browser.ts:3`: `import { setupWorker } from 'msw'` fails under MSW v2. The browser mock worker can't load.
> - `src/utils/api.ts:180,183`: comparing `ReferenceCategory` / `Difficulty` with `''` is always false, so those checks do nothing.
> - `src/components/Exercise.tsx:257`: `onAnswerSubmit && …` tests a required function prop, so it's always true. Check what the intended condition was.
> - `src/components/Exercise.tsx:178`: narrowing produced `never`, which suggests an unreachable or mis-typed branch.
>
> ## Proposed approach
> 1. Fix the errors in place. Prefer correcting types and adding null checks over casts. No `@ts-ignore` / `@ts-expect-error` unless justified in the PR.
> 2. For test setup files: give them the right types (e.g. a test tsconfig with `jest`/`node` types), or exclude them from the app tsconfig if they belong to the Jest config (`tsconfig.jest.json`).
> 3. Add a CI type-check: either a `Frontend Type Check` workflow (path-filtered to `frontend/**`, Node 20, `npm ci && npx tsc -b`) or a step in an existing frontend workflow. Add the workflow name to `expectedWorkflowNames` in `.github/workflows/status-gateway.yml` so it gates merges.
> 4. Don't run `npm run build` as part of the fix unless the `static/` diff is intended and reviewed (see the CLAUDE.md gotcha). CI should type-check only.
>
> ## Acceptance criteria
> - [ ] `cd frontend && npx tsc -b` exits 0 with no errors
> - [ ] The likely bugs above are fixed or confirmed harmless, each covered by a test or explained in the PR
> - [ ] No new `any`, `@ts-ignore` or `@ts-expect-error` unless justified in the PR
> - [ ] A CI type-check runs on PRs touching `frontend/**` and is enforced through `status-gateway.yml`
> - [ ] Existing Jest, Vitest (Storybook) and Cypress suites still pass
> - [ ] README / CLAUDE.md mention the type-check (and drop or adjust any wording that implies the build passes when it doesn't)
>
> ## Out of scope
> - ESLint findings (separate issue)
> - Rebuilding or committing `static/`
> - Loosening `tsconfig` strictness to make errors disappear

---

## Background

`frontend/tsconfig.json` is a solution file that references `tsconfig.app.json` (all of `src/`, excluding `*.test.*`, `*.spec.*` and `*.stories.*`) and `tsconfig.node.json` (`vite.config.ts`). Both are strict and set `noUnusedLocals` / `noUnusedParameters`. Neither Vite (esbuild/oxc strips types) nor Vitest nor Jest's `ts-jest` path for `*.jest.test.*` type-checks the app files as a whole, so the app keeps running while `tsc -b` fails. `npm run build` (`tsc -b && vite build`) therefore fails at the first step.

### Baseline re-measured for this analysis (`main` @ `4014e34`, TypeScript ~6.0, MSW 2.14.6, jsPDF 2.5.2)

`cd frontend && npx tsc -b` → **69 errors** (matches the issue). Full list by file:

| File | Errors | Codes | Root cause |
|---|---|---|---|
| `src/components/Exercise.tsx` | 12 | TS2322 ×10, TS2339, TS2774 | Passes `string \| null` / `boolean \| null` state into child props typed `string \| undefined` / `boolean \| undefined`; `default:` branch of an exhaustive `switch (exercise.type)` reads `.type` on `never`; `onAnswerSubmit &&` on a required prop |
| `src/components/ExerciseTypes/*.tsx` (5 files) | 10 | TS6133 | `feedback` / `isCorrect` props destructured but never rendered (parent `Exercise` renders the feedback itself); unused `React` import in `MultipleChoiceExercise.tsx:7` |
| `src/components/SessionDetail.tsx` | 12 | TS18047 | Guard is `const hasFeedback = session.feedback !== null` (`:236`); TS can't narrow `session.feedback` through a separate boolean |
| `src/utils/storybookMocks.tsx` | 9 | TS6133, TS2353, TS2739 ×3, TS2345, TS1355, TS2552, TS2739 | Mock `Feedback` has stale `session_id`; mock `Session`s lack `is_locked`/`locked_at`/`locked_by`; `as const` on a non-literal; undefined `setCurrentSessionIdState` (`:249`); context value lacks `lockSession`/`unlockSession` |
| `src/utils/api.ts` | 5 | TS6196 ×2, TS2552, TS2367 ×2 | Unused `LessonSummary`/`DeckSummary` imports; `SessionListResponse` used (`:115`) but not imported; redundant `!== ''` after a truthiness check (`:180`, `:183`) |
| `src/hooks/useSessions.tsx` | 2 | TS2339, TS2345 | `sessionApi.create` is typed `{ id; scenario_id; difficulty; created_at }`, but the backend returns the full `SessionResponse` (`schemas/session.py:20`, incl. `messages` and lock fields). The new `Session` pushed into state lacks the lock fields |
| `src/pages/ExerciseBrowserPage.tsx` | 3 | TS6133 ×2, TS2339 | Unused `query` local (`:55`) and `handlePageChange` (`:127`); fallback to non-existent `response.references` (`:67`) |
| `src/pages/LessonPage.tsx` | 2 | TS6133 | Unused `params`, `navigate` |
| `src/pages/DeckDetailPage.tsx` | 1 | TS6133 | Unused `handleReviewComplete` (`:126`) |
| `src/pages/ExercisePage.tsx` | 1 | TS6133 | `setScore` never called (`:29`) |
| `src/pages/ReferencePage.tsx` | 1 | TS6133 | Unused `handlePageChange` (`:99`) |
| `src/components/QuickAccessSession.tsx` | 1 | TS6133 | Unused `navigate` |
| `src/components/SessionHistoryItem.tsx` | 1 | TS6196 | Unused `SessionSummary` type import |
| `src/components/LessonViewer.tsx` | 1 | TS2322 | `sectionRefs` typed `Record<string, HTMLDivElement \| null>` (`:105`) but the ref is attached to a `<section>` (`HTMLElement`) at `:291` |
| `src/setupTests.ts` | 2 | TS2591, TS2304 | Jest-only setup file (`jest.config.cjs` `setupFilesAfterEnv`) uses `require` / `expect`, but is compiled by the app tsconfig (types: `vite/client` only) |
| `src/testSetup.ts` | 3 | TS6133 | Vitest setup: unused mock parameters `page`, `perPage` (`:49`), `sessionId` (`:84`) |
| `src/mocks/browser.ts` | 1 | TS2305 | `setupWorker` moved to `msw/browser` in MSW v2 |
| `src/utils/pdfExport.ts` | 2 | TS6133, TS2339 | Unused `index` param (`:129`); `doc.internal.getNumberOfPages()` isn't in jsPDF's types. The typed public API is `doc.getNumberOfPages()` (`node_modules/jspdf/types/index.d.ts:793`) |

### Assessment of the "likely real bugs"

| Item | Verdict | Evidence |
|---|---|---|
| `storybookMocks.tsx:249` `setCurrentSessionIdState` | **Real bug.** The `useState` setter is named `setCurrentSessionId` (`:118`); the wrapper calls a name that doesn't exist, so `setCurrentSessionId(...)` throws `ReferenceError` in any story | `:118`, `:248-250` |
| `mocks/browser.ts:3` `setupWorker` from `msw` | **Real but dormant.** MSW 2.14.6 exports `setupWorker` only from `msw/browser` (`node_modules/msw/package.json` `exports["./browser"]`). Nothing imports `src/mocks/browser.ts` today (grep across `src/`, `.storybook/`, `cypress/`, `vite.config.ts`), so nothing breaks at runtime yet | grep result: no importers |
| `api.ts:180,183` `!== ''` | **Harmless redundancy, not a behaviour bug.** `category && category !== ''`: the truthiness check already excludes `''`, so TS narrows to `ReferenceCategory` and flags the second comparison. Empty-string filters are correctly omitted today. The fix removes the dead comparison; behaviour stays the same | `api.ts:171-186` |
| `Exercise.tsx:257` `onAnswerSubmit &&` | **Harmless, always true.** `onAnswerSubmit` is required in `ExerciseProps` (`types/index.ts:480`) and the only caller (`ExercisePage.tsx:140`) always passes it. So the "Next Question" button always shows after submit. Keep that behaviour and drop the dead condition | `types/index.ts:478-483` |
| `Exercise.tsx:178` `never` | **Unreachable at the type level, reachable at runtime.** The switch covers every `ExerciseType` member, so `exercise` is `never` in `default:`. Exercises come from JSON/API data, so an unknown `type` can still arrive at runtime and the fallback UI is worth keeping. Capture the type as a `string` before the switch so the fallback compiles without a cast | `Exercise.tsx:118-181` |

### Additional real bug found while researching (in scope: same error site)

- **`useSessions.createSession` stores backend messages without frontend fields.** `POST /sessions/` returns `messages: [{ role, content }]` (`schemas/session.py:7-26`), which may include the AI greeting. `useSessions.tsx:52-63` stores them as `Message[]` without `id`, `session_id` or `created_at`. `ChatInterface.tsx:171` renders `<MessageBubble key={message.id}>`, so greeting messages get an `undefined` key (React key warning). The same transform already exists in `SessionDetail.tsx:74-80` and is the pattern to mimic. Fixing the `TS2339` honestly (typing the response) surfaces this, so it's fixed here.

### Observed but out of scope (follow-up issues filed 2026-11-15)

- **#255**: `grammarApi.listExercises` sends `type=` (`api.ts:208`), but the backend parameter is `exercise_type` (`routers/grammar.py:588`). The type filter on the Exercise Browser is silently ignored. No type error is involved.
- **#256**: The Exercise Browser search box (`ExerciseBrowserPage.tsx:24,55`) never reaches the API: `query` is computed and dropped, and `GET /grammar/exercises/` has no `q` parameter. Removing the unused local makes that explicit without changing behaviour.
- **#257**: `ExercisePage` score never increments (`setScore` unused; `handleAnswerSubmit` comment says scoring is a placeholder).
- **#254**: `jest.config.cjs` `collectCoverageFrom` excludes `hooks/`, `utils/`, `pages/`, `ExerciseTypes/` and several components "because of TS errors". Once these are fixed, the exclusions should be revisited.
- `DeckDetailPage`'s "review complete" summary (`:410-420`) can never render: `reviewStats` is only set by the unused `handleReviewComplete`, and reviews happen on `/review`. It is removed here as dead code (no follow-up needed).

### Decisions confirmed by the user (2026-11-15)

1. **Jest coverage exclusions**: leave `jest.config.cjs` unchanged in this issue; tracked in #254.
2. **Non-type bugs found while researching**: don't fix here; filed as #255 (exercise type filter param), #256 (exercise search) and #257 (exercise page scoring).
3. **Unused logic**: remove it where it's unused, including the `feedback`/`isCorrect` props on `ExerciseTypes/*` (and their prop interfaces) and the dead `DeckDetailPage` review-stats state/block.

---

## Business Value

- The documented production build (`npm run build`) works again, so the app can be built and deployed from source.
- Reviewers no longer have to diff `tsc` output against `main`; CI fails a PR that adds type errors.
- Fixes a real Storybook crash (`setCurrentSessionId`) and a React key bug on the AI greeting message.
- Types match the backend contract again (`Session` lock fields, `POST /sessions/` response), which lowers the chance of future runtime surprises.

---

## Scope In

- [ ] Fix all 69 `tsc -b` errors in `frontend/src/` without loosening `tsconfig` strictness, without new `any`, and without `@ts-ignore` / `@ts-expect-error`
- [ ] Fix `storybookMocks.tsx` (setter name, lock fields, lock/unlock mock methods, stale `session_id`, `as const`)
- [ ] Add `lockSession` / `unlockSession` to the shared `SessionsContextType` in `types/index.ts` and have `hooks/useSessions.tsx` use that single definition instead of its private duplicate
- [ ] Type `sessionApi.create`'s response as the real backend shape and map its messages to frontend `Message`s in `useSessions.createSession` (with lock fields)
- [ ] Move `setupTests.ts` out of the app tsconfig and into `tsconfig.jest.json` (where its Jest/Node types live)
- [ ] Fix `mocks/browser.ts` to import `setupWorker` from `msw/browser`
- [ ] Use jsPDF's public `doc.getNumberOfPages()` in `pdfExport.ts` (and update the mock in `pdfExport.test.ts` to match)
- [ ] Remove dead code flagged by `noUnused*` (imports, locals, unused handlers, unused child props)
- [ ] Add an `npm run typecheck` script (`tsc -b`)
- [ ] Add a `Frontend Type Check` GitHub Actions workflow and register it in `status-gateway.yml`'s `expectedWorkflowNames`
- [ ] New Jest tests for the bug fixes (see Examples)
- [ ] Update `README.md`, `frontend/README.md` and `CLAUDE.md` to mention the type-check

## Scope Out

- [ ] ESLint findings (separate issue per #250)
- [ ] Running `npm run build` / changing `static/`
- [ ] Loosening `tsconfig` strictness (e.g. turning off `noUnusedLocals`)
- [ ] Type-checking test files (`*.test.*`, `*.stories.*`) under `tsc -b`. They're excluded from `tsconfig.app.json` today. Bringing them in would surface a separate, unmeasured backlog
- [ ] The `listExercises` `type` vs `exercise_type` mismatch (#255), Exercise Browser search (#256), ExercisePage scoring (#257)
- [ ] Changing `jest.config.cjs` coverage exclusions (#254)
- [ ] Fixing the pre-existing frontend test-discovery gap (`src/**/*.test.tsx` not run by either runner)

---

## Acceptance Criteria (ACs)

1. **AC1**: Type-check is clean
   **Given** a fresh `npm ci` in `frontend/`
   **When** `npx tsc -b` (or `npm run typecheck`) runs
   **Then** it exits 0 and prints no `error TS` lines

2. **AC2**: Likely bugs are fixed or confirmed harmless
   **Given** the five items listed in the issue (plus the `createSession` message mapping)
   **When** the PR is reviewed
   **Then** each one is either fixed and covered by a test (storybookMocks setter, `createSession` mapping, `Exercise` fallback and Next button, `searchReferences` empty filters), or explained in the PR (`mocks/browser.ts` has no importers, so `tsc` resolution is the check)

3. **AC3**: No new type escape hatches
   **Given** the diff
   **When** searched for `: any`, `as any`, `@ts-ignore`, `@ts-expect-error`
   **Then** there are no new occurrences (any exception is justified in the PR)

4. **AC4**: CI gate
   **Given** a PR touching `frontend/**`
   **When** CI runs
   **Then** a `Frontend Type Check` workflow runs `npm ci && npm run typecheck` on Node 20, and `status-gateway.yml` waits for it and fails if it fails

5. **AC5**: No regressions
   **Given** the change
   **When** `npm run test:jest`, `npm run test` (Vitest/Storybook) and Cypress run
   **Then** they pass as before

6. **AC6**: Docs
   **Given** `README.md`, `frontend/README.md` and `CLAUDE.md`
   **When** read
   **Then** they mention `npm run typecheck` / the CI gate, and nothing implies the build passes when it doesn't

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **`Session` / `Feedback` / `Message` / `BackendMessage` types**: `frontend/src/types/index.ts:17-62`. `Session` has required lock fields (`is_locked`, `locked_at`, `locked_by`) since the session-locking work
- **`SessionsContextType` (two copies)**: `types/index.ts:139-152` (no lock methods; used by `storybookMocks.tsx` and `ChatInterface.test.tsx`) and a private copy in `hooks/useSessions.tsx:5-20` (with lock methods; used for the real `SessionsContext`)
- **`SessionsProvider` / `SessionsContext`**: `hooks/useSessions.tsx`. The real context the mock provider also renders into
- **`MockSessionsProvider` / `StorybookSessionsProvider`**: `utils/storybookMocks.tsx`, used by stories
- **Backend `SessionResponse`**: `schemas/session.py:20-31` (`POST /sessions/` and `GET /sessions/{id}` response model, `routers/sessions.py:19,218`)
- **Exercise discriminated union**: `types/index.ts:384-483` (`ExerciseType`, `Exercise`, `ExerciseProps`, per-type `*ExerciseProps`)
- **Message transform pattern**: `components/SessionDetail.tsx:74-80` (backend `{role, content}` → frontend `Message`)
- **TS project layout**: `frontend/tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`; `tsconfig.jest.json` (used only by ts-jest via `jest.config.cjs`)
- **CI gateway**: `.github/workflows/status-gateway.yml:43-48` (`expectedWorkflowNames`); frontend workflow pattern in `jest-tests.yml`

### New Concepts Required

- **`BackendSessionResponse` type** (`types/index.ts`): the real `POST /sessions/` / `GET /sessions/{id}` shape (`id: number`, `messages: BackendMessage[]`, `feedback`, lock fields). Used to type `sessionApi.create`. (The unused `CreateSessionResponse` stays as is, to keep the diff focused.)
- **`npm run typecheck` script**: `tsc -b`
- **`.github/workflows/frontend-typecheck.yml`**: workflow named `Frontend Type Check`

### Key Business Rules

- **Rule**: `tsc -b` must pass with the current strictness. Fix code, never config strictness.
- **Rule**: Behaviour must stay the same except where a real bug is fixed (storybook setter, greeting message keys).
- **Rule**: CI type-checks only. It must never run `vite build` (which would rewrite `static/`).
- **Rule**: The gateway only counts workflows listed in `expectedWorkflowNames`, so the new workflow name must match exactly.

---

## Strategic Approach

### Solution Direction

1. **Types first**: add lock methods to `types/index.ts` `SessionsContextType`; add `BackendSessionResponse`; have `useSessions.tsx` import `SessionsContextType` from `../types` and delete its private copy.
2. **API / hook**: import `SessionListResponse`, drop unused imports, remove redundant `!== ''`, type `sessionApi.create` as `BackendSessionResponse`; in `createSession`, map `response.messages` to `Message`s (`id: \`${newSessionId}-${index}\``, `session_id`, `role`, `content`, `created_at: response.created_at`) and copy the lock fields from the response.
3. **Components**: `SessionDetail`: narrow via `const feedback = session.feedback` and render from `feedback`. `Exercise`: capture `const exerciseType: string = exercise.type` for the fallback; drop `onAnswerSubmit &&` (and the redundant `if (onAnswerSubmit)` guard); stop passing `feedback`/`isCorrect` to children. `ExerciseTypes/*`: remove the unused `feedback`/`isCorrect` from props and the prop interfaces, plus the unused `React` import. `LessonViewer`: type `sectionRefs` as `HTMLElement`. `QuickAccessSession` / `SessionHistoryItem`: remove unused imports/locals.
4. **Pages**: remove unused locals/handlers (`ExerciseBrowserPage` `query`, `handlePageChange`, `.references` fallback; `ReferencePage` `handlePageChange`; `LessonPage` `params`/`navigate`; `DeckDetailPage` dead `handleReviewComplete` + `reviewStats` state + its never-rendered block; `ExercisePage` `score` becomes a constant with a comment).
5. **Mocks / setup**: fix `storybookMocks.tsx`; `mocks/browser.ts` imports from `msw/browser`; `testSetup.ts` underscore-prefixes unused mock params; `setupTests.ts` is excluded from `tsconfig.app.json` and added to `tsconfig.jest.json` `include`; `pdfExport.ts` uses `doc.getNumberOfPages()` and drops the unused `index` (`pdfExport.test.ts` mock moves `getNumberOfPages` to the doc).
6. **Tests**: new Jest tests (`*.jest.test.tsx`, so they're discovered) for the fixed behaviour.
7. **CI + docs**: add `typecheck` script, `frontend-typecheck.yml`, gateway entry; update READMEs and CLAUDE.md.
8. **Verify**: `npx tsc -b` = 0 errors; `npm run test:jest`; `npm run test`; Cypress if a local stack can run; `npm run lint` compared against `main` (no new lint errors in touched files).

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| `setupTests.ts` typing | (a) Exclude it from `tsconfig.app.json` and include it in `tsconfig.jest.json`: matches who runs it (Jest), no new deps. (b) Rewrite it as `import '@testing-library/jest-dom'`: changes Jest setup behaviour and risks the ESM issue the comment warns about. (c) A new `tsconfig.test.json` referenced from `tsconfig.json`: would also pull every `*.test.*` file into `tsc -b`, a big unmeasured scope | **(a)** |
| Unused `feedback`/`isCorrect` on exercise children | (a) Remove them from child props + interfaces: honest API, the parent already renders feedback. (b) Widen the types to `\| null` and prefix with `_`: keeps dead props around | **(a)** |
| `default:` fallback in `Exercise` | (a) `const exerciseType: string = exercise.type` before the switch: no cast, keeps the runtime fallback. (b) `assertNever`: throws on bad data instead of rendering the fallback. (c) Cast | **(a)** |
| Duplicate `SessionsContextType` | (a) Make `types/index.ts` canonical (add lock methods) and have the hook import it: one source of truth. (b) Make storybookMocks import the hook's private type: leaves two definitions that can drift again | **(a)** |
| `createSession` response typing | (a) New `BackendSessionResponse` type reflecting `schemas/session.py`, plus a message mapping: fixes the key bug. (b) Add `messages?: Message[]` to the inline type: still wrong shape, hides the bug | **(a)** |
| CI type-check placement | (a) Separate `Frontend Type Check` workflow: clear check name, fast, matches the issue. (b) A step in `jest-tests.yml`: would run on two Node versions and blur failure attribution | **(a)**, Node 20, path filter `frontend/**` + its own file, run `npm run typecheck` |
| Dead UI in `DeckDetailPage` | (a) Remove `handleReviewComplete`, `reviewStats` and the block that can never render. (b) Keep the state, drop only the handler: `setReviewStats` then becomes unused and errors | **(a)**, behaviour unchanged |
| `ExercisePage` `setScore` | (a) `const score = 0` with a comment pointing at the placeholder: same behaviour. (b) Implement scoring: a feature change, out of scope | **(a)** |

### Alternatives Considered

- **Turn off `noUnusedLocals`/`noUnusedParameters`**: rejected. The issue explicitly forbids loosening strictness.
- **Exclude broken files from `tsconfig.app.json`**: rejected for app code (it hides errors). Only `setupTests.ts` moves, because it belongs to Jest's tsconfig.
- **Add `@types/...` or bump jsPDF to get `internal.getNumberOfPages` typed**: rejected. The public `doc.getNumberOfPages()` already exists in the installed types, and no new dependency is needed.
- **Run `npm run build` in CI**: rejected. It rewrites tracked `static/` (CLAUDE.md gotcha); `tsc -b` covers the type gate.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Coverage exclusions in `jest.config.cjs` | The exclusions cite "TS errors". Should this issue re-enable coverage for now-clean files? | **Resolved**: leave unchanged; follow-up #254 |
| Follow-up bugs found (`exercise_type` param, exercise search, scoring) | Fix here or file separately? | **Resolved**: filed as #255, #256, #257; out of scope here |
| Removing unused child props (`feedback`/`isCorrect`) | Component API change for `ExerciseTypes/*` | **Resolved**: remove unused logic (only `Exercise.tsx` uses these components; no stories or tests pass those props) |
| 80% coverage for touched files | Many touched files are pages/hooks/utils excluded from Jest coverage; Vitest only runs stories | Add targeted Jest tests for the changed logic; report coverage of the new tests honestly in the PR |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| `POST /sessions/` returns an empty `messages` list | The common case without a greeting | `messages: []`, no crash |
| `POST /sessions/` returns a greeting | React keys must be unique and defined | Each mapped message gets `id` `${sessionId}-${index}`, `session_id`, `created_at` |
| `messages` missing (older backend / mock) | `testSetup.ts` `mockSessionApi.create` returns no `messages` | `(response.messages ?? []).map(...)` keeps working |
| Lock fields missing from the create response | Backend defaults them, but mocks may omit them | Default `is_locked: false`, `locked_at: null`, `locked_by: null` via `??` |
| Unknown exercise `type` from data | Runtime data isn't type-checked | Fallback renders `Unknown exercise type: <type>` |
| `session.feedback` is `undefined` (not `null`) | `!== null` guard would crash | Truthiness narrowing on a local handles both |
| `searchReferences('', '', '')` | Empty filters must not be sent | Only `page`/`per_page` in the query string |
| CI on a docs-only PR | Path filter means the workflow doesn't run | Gateway already treats "no matching runs" as pass |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Removing `setupTests.ts` from the app tsconfig hides future errors in it | Jest setup errors not caught by `tsc -b` | ts-jest compiles it with `tsconfig.jest.json` (Jest/Node types), so errors still surface when Jest runs |
| ts-jest diagnostics on newly tested files (`storybookMocks.tsx`, `useSessions.tsx`, `Exercise.tsx`) | The new Jest tests fail to compile under `tsconfig.jest.json` (`module: commonjs`, `moduleResolution: node`) | Run the new tests locally; keep imports compatible (the `@/` alias is mapped in `jest.config.cjs`) |
| `storybookMocks.tsx` imports `@/types` | Jest needs `moduleNameMapper` for `@/` | Already present (`'^@/(.*)$'`) |
| Gateway name mismatch | New workflow not enforced | Use the exact string `Frontend Type Check` in both places; check the gateway log on the PR |
| `tsc -b` incremental build info is stale locally | False pass/fail locally | Verify with `npx tsc -b --force` |
| Removing `DeckDetailPage` dead block affects Cypress/stories | A test might look for the review-complete block | grep `cypress/` and stories for its test IDs/text before removing |
| TypeScript 6 `ignoreDeprecations` or `baseUrl` warnings | Could appear as errors on a clean run | Re-run `tsc -b --force` in a clean state; CI uses `npm ci` |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | `tsc -b` exits 0 | Yes | All 69 errors have a planned fix (table above) |
| AC2 | Likely bugs fixed/explained + tests | Yes | `mocks/browser.ts` is explained (no importers) rather than tested |
| AC3 | No new escape hatches | Yes | Plan uses no casts except the existing `msg.role as 'user' \| 'assistant'` pattern copied from `SessionDetail.tsx` |
| AC4 | CI type-check enforced via gateway | Yes | New workflow + `expectedWorkflowNames` entry |
| AC5 | Existing suites pass | Yes | Run Jest + Vitest locally; Cypress locally if the stack can start, otherwise rely on CI and say so |
| AC6 | Docs updated | Yes | README.md, frontend/README.md, CLAUDE.md |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- New tests must be discoverable (`*.jest.test.tsx`) per the CLAUDE.md test-discovery gotcha
- No change to `static/`
- `npm run lint` should not get worse on touched files

---

## REASONS Canvas

### Requirements
- `cd frontend && npx tsc -b` exits 0 (all 69 errors fixed in place)
- The five issue-listed bugs fixed or explained, with tests where behaviour changes; plus the `createSession` greeting-message mapping
- No new `any` / `@ts-ignore` / `@ts-expect-error`
- `Frontend Type Check` workflow on PRs touching `frontend/**`, enforced via `status-gateway.yml`
- Jest, Vitest (Storybook) and Cypress still pass
- Docs mention the type-check

### Examples
- `MockSessionsProvider` + a consumer that calls `setCurrentSessionId('abc')` → `currentSessionId` becomes `'abc'` (previously threw `ReferenceError: setCurrentSessionIdState is not defined`)
- `MockSessionsProvider` context exposes `lockSession` / `unlockSession` that resolve
- `createSession('cafe_order')` with a mocked `sessionApi.create` returning `{ id: 7, messages: [{ role: 'assistant', content: 'Bonjour !' }], is_locked: false, ... }` → `sessions[0].messages[0]` is `{ id: '7-0', session_id: '7', role: 'assistant', content: 'Bonjour !', created_at: <response.created_at> }` and `sessions[0].is_locked === false`
- `createSession` with a response lacking `messages` → `sessions[0].messages` is `[]`
- `<Exercise exercise={{ ...fillInTheBlank, type: 'unknown' }} />` (built via an untyped JSON fixture, as API data would be) → renders `Unknown exercise type: unknown`
- `<Exercise>` fill-in-the-blank: type the correct answer → submit → shows `✓ Correct!` and a `Next Question` button; clicking Next clears the answer and hides the feedback; `onAnswerSubmit` called with `(id, answer)`
- `grammarApi.searchReferences(undefined, '', '')` → fetch URL `/grammar/reference/?page=1&per_page=10`; `searchReferences('subj', 'verbs', 'beginner')` → includes `q=subj&category=verbs&difficulty=beginner`
- `npx tsc -b 2>&1 | grep -c "error TS"` → `0`

### Architecture
- `frontend/tsconfig.json` solution → `tsconfig.app.json` (`src/`, strict, `noUnused*`) + `tsconfig.node.json`; `tsconfig.jest.json` extends app config for ts-jest
- Types in `src/types/index.ts`; API client `src/utils/api.ts`; session state `src/hooks/useSessions.tsx` (`SessionsContext`); story mocks `src/utils/storybookMocks.tsx`
- Jest runs `**/*.jest.test.*` + `__tests__/` (jsdom, ts-jest, `setupTests.ts`); Vitest runs Storybook stories only (`vite.config.ts`, `testSetup.ts`)
- CI: path-filtered workflows plus `status-gateway.yml` as the single required check

### Standards
- Strict TS, no new `any` / suppressions; prefer narrowing over casts
- Match existing style (no semicolons in most components; keep each file's existing style)
- 80% coverage target: new Jest tests cover the changed logic in `storybookMocks.tsx`, `useSessions.tsx` `createSession`, `Exercise.tsx` and `api.ts` `searchReferences`
- JSDoc on any new exported type
- Commit `fix(#250): ...`; README/CLAUDE.md updates in the same PR

### Omissions
- ESLint fixes; `static/` rebuild; strictness changes
- Type-checking `*.test.*` / `*.stories.*` files
- `listExercises` `exercise_type` param bug (#255), Exercise Browser search (#256), ExercisePage scoring (#257)
- `jest.config.cjs` coverage exclusions (#254); the test-discovery gap

### Notes
- Reproduce: `cd frontend && npx tsc -b --force 2>&1 | grep -c "error TS"` (use `--force` to avoid stale `.tsbuildinfo`)
- `msw/browser` is the MSW v2 browser entry point (`node_modules/msw/package.json` exports)
- jsPDF public API: `getNumberOfPages(): number` on the doc (`types/index.d.ts:793`)
- `pdfExport.test.ts` and `SessionDetail.test.tsx` / `ChatInterface.test.tsx` aren't run by either runner today; keep them in sync but don't rely on them for verification
- Before removing the `DeckDetailPage` review-stats block, grep `cypress/` and stories for its text/test IDs

### Solutions
- Message transform: mimic `SessionDetail.tsx:74-80`
- Context test pattern: render a consumer inside the provider (see `src/components/ReviewSession.jest.test.tsx` / `ChatInterface.jest.test.tsx` for Jest + RTL conventions)
- Workflow: copy `jest-tests.yml` structure (checkout, setup-node with npm cache, `npm ci`), single Node 20 job, `npm run typecheck`
- Gateway: append `'Frontend Type Check'` to `expectedWorkflowNames`

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
