# SPDD Analysis: Clean up frontend ESLint findings and enforce lint in CI

**GitHub Issue**: #251
**Issue Title**: Clean up frontend ESLint findings and enforce lint in CI
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/251
**Artifact ID**: FLC-061-202611151916
**Created**: 2026-11-15 19:16
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> `npm run lint` (`eslint .` in `frontend/`) reports **162 errors and 8 warnings across 66 files** on `main`. CI doesn't run lint, so findings pile up and a PR's lint impact can only be judged by diffing against `main`. Some findings are real problems (hooks called outside components, a test file that doesn't parse). Some come from linting generated files.
>
> Found while working on #229 (PR #248, which adds no new findings). Related: #250 (TypeScript errors). Suggested order: #250 first, since some unused-variable fixes overlap.
>
> ## Breakdown (`main`, Nov 2026)
>
> | Rule | Count | Notes |
> |---|---|---|
> | `@typescript-eslint/no-unused-vars` | 77 | Mostly mechanical. Overlaps the unused-declaration errors in #250 |
> | `@typescript-eslint/no-explicit-any` | 38 | Replace with real types or `unknown` |
> | `react-hooks/set-state-in-effect` | 14 | React 19 hook rules. Needs refactoring (derive state, or set state in callbacks) |
> | *(no rule: unused `eslint-disable`)* | 6 | Generated files in `frontend/coverage/`, which ESLint shouldn't scan |
> | `@typescript-eslint/no-empty-object-type` | 6 | |
> | `@typescript-eslint/no-require-imports` | 5 | Test setup files |
> | `react-hooks/rules-of-hooks` | 3 | `DeckSearch.stories.tsx:156-158`: `useState` inside a story `render` function. **Real violation** |
> | `react-hooks/preserve-manual-memoization` | 3 | e.g. `ChatInterface.tsx` `getScenarioName` |
> | `react-refresh/only-export-components` | 3 | e.g. `storybookMocks.tsx` |
> | `preserve-caught-error` | 3 | `SessionHistory.tsx`, `ExerciseBrowserPage.tsx`, `ExercisePage.tsx`: rethrown errors lose `cause` |
> | Others (`no-namespace`, `refs`, `exhaustive-deps`, `ban-ts-comment`, `purity`) | 8 | |
> | Parse error | 1 | `SessionDetail.test.tsx:493`: the file doesn't parse. No runner executes it today (see the test-discovery gotcha in CLAUDE.md), so it went unnoticed |
>
> Reproduce: `cd frontend && npx eslint . -f json | jq '[.[].messages[]] | length'`
>
> ## Proposed approach
> 1. **Config**: add `coverage` (and any other generated output) to `globalIgnores` in `frontend/eslint.config.js`.
> 2. **Mechanical fixes**: `eslint --fix` where safe, then the remaining unused variables, `any` types, empty object types and require imports.
> 3. **Real violations**: fix the `rules-of-hooks` violations (move story state into a small wrapper component) and `preserve-caught-error` (pass `{ cause }`). Fix or delete the unparseable `SessionDetail.test.tsx` (if kept, rename it so a runner discovers it).
> 4. **React 19 hook rules** (`set-state-in-effect`, `preserve-manual-memoization`, `refs`, `purity`): refactor where straightforward. If the rest is too large for one PR, set those rules to `warn` with a tracking note and a follow-up issue, rather than disabling them.
> 5. **CI**: add a `Frontend Lint` workflow (path-filtered to `frontend/**`, `npm ci && npm run lint`), or a step in an existing frontend workflow. Add its name to `expectedWorkflowNames` in `.github/workflows/status-gateway.yml`. Lint errors fail the check; warnings don't.
>
> ## Acceptance criteria
> - [ ] `cd frontend && npm run lint` exits 0 with no errors (any remaining warnings are listed in the PR with a follow-up issue)
> - [ ] Generated directories (`coverage/`, `dist/`) are ignored by ESLint
> - [ ] The `rules-of-hooks` and parse-error findings are fixed
> - [ ] No rule is disabled outright. Any downgrades to `warn` are justified in the PR
> - [ ] A CI lint check runs on PRs touching `frontend/**` and is enforced through `status-gateway.yml`
> - [ ] Existing Jest, Vitest (Storybook) and Cypress suites still pass
>
> ## Out of scope
> - TypeScript compiler errors (#250)
> - Adding Prettier / formatting (#134)
> - Behaviour changes beyond what a lint fix requires

---

## Background

`frontend/eslint.config.js` uses the Vite template's flat config: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-react-hooks` 7.x `flat.recommended` (which includes the React Compiler rules: `set-state-in-effect`, `preserve-manual-memoization`, `refs`, `purity`, `immutability`) and `eslint-plugin-react-refresh` `configs.vite`. The only global ignore is `dist`. No CI workflow runs `npm run lint`, so findings have built up.

#250 (PR #258, merged) made `tsc -b` pass, which removed some unused-declaration findings. **Re-measured on `main` at `149c4e0` (2026-11-15): 145 findings** (the issue counted 170):

| Rule | Count | Severity |
|---|---|---|
| `@typescript-eslint/no-unused-vars` | 52 | error |
| `@typescript-eslint/no-explicit-any` | 38 | error |
| `react-hooks/set-state-in-effect` | 14 | error |
| *(no rule)*: 6 unused `eslint-disable` in `coverage/` + 1 parse error | 7 | 6 warn, 1 error |
| `@typescript-eslint/no-empty-object-type` | 6 | error |
| `@typescript-eslint/no-require-imports` | 5 | error |
| `react-refresh/only-export-components` | 3 | error |
| `react-hooks/rules-of-hooks` | 3 | error |
| `react-hooks/preserve-manual-memoization` | 3 | error |
| `preserve-caught-error` | 3 | error |
| `react-hooks/refs` | 2 | error |
| `react-hooks/exhaustive-deps` | 2 | warn |
| `@typescript-eslint/no-namespace` | 2 | error |
| `@typescript-eslint/ban-ts-comment` | 2 | error |
| `react-hooks/purity`, `react-hooks/immutability`, `prefer-const` | 1 each | error |

The frontend has a known test-discovery gap (CLAUDE.md): Vitest runs only the Storybook project, and Jest only matches `*.jest.test.*` / `__tests__/`. **27 plain `*.test.ts(x)` files run under neither runner**, and `tsconfig.app.json` excludes `src/**/*.test.*`, so nothing type-checks them either. Many lint findings sit in those files (`RecommendedLessons.test.tsx`, `DeckCardsPage.test.tsx`, `SessionDetail.test.tsx`, ...). Lint is currently the only tool that looks at them at all.

---

## Business Value

- **Merge gating**: a `Frontend Lint` check stops new findings landing, the same way #250 did for `tsc` and #252 did for backend coverage.
- **Real bug fixes**: the `rules-of-hooks` violation in a story, errors rethrown without `cause` (lost stack context), a use-before-declare `useCallback` in `DeckBrowser`, and a test file that doesn't parse.
- **Reviewer time**: reviewers no longer need to diff lint output against `main`.
- **Groundwork for React Compiler-friendly code**: the `preserve-manual-memoization`/`refs`/`purity` fixes remove places where the compiler would skip optimising a component.

---

## Scope In

- [ ] Add `coverage` to `globalIgnores` in `frontend/eslint.config.js` (alongside `dist`). Also ignore `storybook-static` (Storybook build output, if generated) so the ignore list covers all generated output
- [ ] Fix all `no-unused-vars` (52): remove unused imports/locals, use `_`-free patterns (omit unused callback params; drop unused `catch` bindings with `catch {}`, which ES2019+ allows)
- [ ] Fix all `no-explicit-any` (38): real types (`Session`, `Feedback`, `vi.Mock`/`jest.Mock`, `vi.mocked(...)`), or `unknown` + narrowing
- [ ] Fix `no-empty-object-type` (6) in `src/types/index.ts`: `interface X extends Y {}` → `type X = Y`; empty props interfaces → `type XProps = Record<string, never>`, keeping the exported names used by `utils/api.ts` re-exports
- [ ] Fix `no-require-imports` (5): ES `import` in `setupTests.ts`, `sample.jest.test.tsx`, `LessonDetailPage.test.tsx`
- [ ] Fix `ban-ts-comment` (2) in `FeedbackView.test.tsx` by typing the mock (`vi.mocked(generateFeedbackPDF)`) so no comment is needed
- [ ] Fix `prefer-const` (1)
- [ ] Fix `no-namespace` (2) in `cypress/support/*.ts`: these are `declare global { namespace Cypress { ... } }` type augmentations, Cypress's documented pattern (see Design Decision D4)
- [ ] Fix `rules-of-hooks` (3) in `DeckSearch.stories.tsx` by moving story state into a small wrapper component
- [ ] Fix `preserve-caught-error` (3) by passing `{ cause: err }` when rethrowing
- [ ] Fix the `SessionDetail.test.tsx:493` parse error (`initialEntries="/sessions/"}` → `initialEntries={['/sessions/']}`). Discovery/rename is Design Decision D2 (needs user input)
- [ ] Fix `react-refresh/only-export-components` (3) (Design Decision D5)
- [ ] Fix the React Compiler findings that are straightforward:
  - `ChatInterface.tsx:23` `refs` ×2 + `purity`: `useRef(...).current` read during render → `useState(() => ...)` lazy initializer (computed once, like now)
  - `ChatInterface.tsx:39,67` + `SessionDetail.tsx:172` `preserve-manual-memoization`: make the `useCallback`/`useMemo` deps match what the compiler infers (e.g. `session?.scenario_id` vs `session`), or replace a trivially cheap `useCallback` with a plain computed value
  - `ChatInterface.tsx:36` `exhaustive-deps` warning: `session?.messages || []` creates a new array each render → `useMemo`
  - `DeckBrowser.tsx:90` `immutability` + `:105` `exhaustive-deps`: `fetchCardsForDecks` is used before it's declared and missing from deps → declare it first, add it to deps (stable, `[]` deps, so no extra fetches)
  - `set-state-in-effect` "reset page when filters change" (`DeckBrowser.tsx:133`, `LessonBrowser.tsx:121`, `DeckCardsPage.tsx:108`): reset the page in the filter-change handlers instead of in an effect
  - `set-state-in-effect` "sync state from props" (`DifficultySelector.tsx:26`, `Flashcard.tsx:108`): React's "adjust state when a prop changes" pattern (compare with previous value during render), no effect
- [ ] The remaining `set-state-in-effect` findings are data-fetch-on-mount effects (Design Decision D3: refactor vs downgrade)
- [ ] New `.github/workflows/frontend-lint.yml` (`Frontend Lint`), modelled on `frontend-typecheck.yml`; add `'Frontend Lint'` to `expectedWorkflowNames` in `status-gateway.yml`
- [ ] README.md (CI workflows list, frontend lint section next to the type-check section) and CLAUDE.md commands (`npm run lint` is a CI gate)

## Scope Out

- [ ] TypeScript compiler errors (#250, done)
- [ ] Prettier / formatting (#134)
- [ ] Behaviour changes beyond what a lint fix requires
- [ ] Closing the frontend test-discovery gap for all 27 undiscovered `*.test.*` files (beyond `SessionDetail.test.tsx`, if D2 picks that)
- [ ] Shrinking Jest coverage exclusions (#233 / #254)
- [ ] Upgrading ESLint or its plugins
- [ ] Making warnings fail CI (`--max-warnings`): the issue says warnings don't fail

---

## Acceptance Criteria (ACs)

1. **AC1: Lint passes**
   **Given** the branch checked out with `npm ci` in `frontend/`
   **When** `npm run lint` runs
   **Then** it exits 0 with 0 errors. Any warnings left are listed in the PR and tracked by a follow-up issue

2. **AC2: Generated output ignored**
   **Given** `frontend/coverage/` (Jest/Vitest HTML reports) and `frontend/dist/` exist
   **When** ESLint runs
   **Then** no file under them is linted (the 6 unused-directive warnings in `coverage/` disappear)

3. **AC3: Real violations fixed**
   **Given** `DeckSearch.stories.tsx` and `SessionDetail.test.tsx`
   **When** ESLint runs
   **Then** there are no `rules-of-hooks` findings and no parse errors, and the `Interactive` story still behaves the same (search/tag/sort/clear update the component)

4. **AC4: No rule disabled outright**
   **Given** `frontend/eslint.config.js` and the source tree
   **When** reviewed
   **Then** no rule is set to `off`, no file-wide `eslint-disable` exists, and any `warn` downgrade (or option change) is justified in the PR with a follow-up issue

5. **AC5: CI lint gate**
   **Given** a PR touching `frontend/**`
   **When** CI runs
   **Then** a `Frontend Lint` workflow runs `npm ci && npm run lint`, fails on lint errors, passes with only warnings, and `status-gateway.yml` waits for it

6. **AC6: No regressions**
   **Given** the changes
   **When** `npm run test:jest`, `npm run test` (Vitest/Storybook), `npm run typecheck` and Cypress run
   **Then** they pass as on `main`

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **ESLint flat config**: `frontend/eslint.config.js` (`globalIgnores(['dist'])`, one `**/*.{ts,tsx}` block)
- **Frontend Type Check workflow**: `.github/workflows/frontend-typecheck.yml`, the template for the new lint workflow (Node 20, `npm ci` in `frontend/`, path filter `frontend/**` + the workflow file)
- **Status gateway**: `.github/workflows/status-gateway.yml:43-49` `expectedWorkflowNames`, the single required check that waits for the listed workflows
- **Story with hooks in `render`**: `frontend/src/components/DeckSearch.stories.tsx:155-176` (`Interactive`)
- **Unparseable test**: `frontend/src/components/SessionDetail.test.tsx:493`, an 828-line Vitest-style file (`vi.mock`, `vi.fn`, `vi.importActual`) that no runner discovers
- **`useSessions` module**: `frontend/src/hooks/useSessions.tsx:283` exports both `SessionsProvider` and the `useSessions` hook (imported from 9 files)
- **`RATING_BUTTONS`**: `frontend/src/components/Flashcard.tsx:18`, imported by `ReviewSession.tsx:13` (which re-exports it at `:401`)
- **`StorybookSessionsProvider`**: `frontend/src/utils/storybookMocks.tsx:293`, an object of preset wrapper components used by `storybookMocks.jest.test.tsx`
- **Empty types**: `frontend/src/types/index.ts:268,379,557,739,902,916`. `ReferencePageProps`, `DeckDetailPageProps` and `DeckCardsPageProps` are re-exported from `utils/api.ts:391,432-433`
- **Data-fetch effects**: `FeedbackView.tsx:43`, `LessonBrowser.tsx:116`, `DeckBrowser.tsx:128`, `RecommendedLessons.tsx:34`, `ReviewSession.tsx:195,200`, `DeckCardsPage.tsx:99`, `DeckDetailPage.tsx:106`, `LessonDetailPage.tsx:66`: `useEffect(() => { fetchX() }, [fetchX])` where `fetchX` calls `setIsLoading(true)` / `setError(null)` before its first `await`

### New Concepts Required

- **`Frontend Lint` workflow**: `.github/workflows/frontend-lint.yml`
- **Story wrapper component**: e.g. `InteractiveDeckSearch` in `DeckSearch.stories.tsx` that owns the `useState`s
- **Possibly a constants module** for `RATING_BUTTONS` (D5)

### Key Business Rules

- **Lint errors fail CI, warnings don't** (issue step 5).
- **No rule is disabled outright**; downgrades need justification and a follow-up issue (AC4).
- **Lint fixes must not change behaviour** (Scope Out). Where a fix restructures state (handlers instead of effects), observable behaviour stays the same.

---

## Strategic Approach

### Solution Direction

1. **Config**: `globalIgnores(['dist', 'coverage', 'storybook-static'])`.
2. **`eslint --fix`** for the auto-fixable subset (`prefer-const`, some unused directives), then review the diff.
3. **Mechanical fixes** by file: unused vars, `any`, empty object types, require imports, ts-comments, namespaces.
4. **Real violations**: story wrapper component, `{ cause }`, parse error.
5. **React Compiler rules**: the straightforward refactors listed in Scope In; then the data-fetch effects per D3.
6. **CI**: `frontend-lint.yml` + gateway entry.
7. **Verify**: `npm run lint` (0 errors), `npm run typecheck`, `npm run test:jest`, `npm run test`, Cypress if a local backend is available (otherwise CI), backend untouched.
8. **Docs**: README CI section + frontend lint note; CLAUDE.md command comment.

### Key Design Decisions

| # | Decision | Trade-offs | Recommendation |
|---|----------|------------|----------------|
| D1 | CI: new workflow or step in `frontend-typecheck.yml` | Separate workflow: clear check name, the gateway already tracks by workflow name, and it matches the issue's wording. Step: one fewer `npm ci`, but a lint failure would show as "Type Check" failing | **New `Frontend Lint` workflow**, mirroring `frontend-typecheck.yml` |
| D2 | `SessionDetail.test.tsx`: fix in place, or fix + rename/convert so a runner executes it | Fix only (1 line): satisfies "parse error fixed"; the file stays undiscovered like the other 26. Convert to Jest (`SessionDetail.jest.test.tsx`, `vi.*` → `jest.*`): it actually runs, but 828 lines of never-run tests may fail on real behaviour, which pulls in debugging beyond lint scope. Delete: loses test intent | **Decided (user): fix the parse error in place**, and file a follow-up issue for the 27-file discovery gap (none exists today), since converting one file out of 27 is arbitrary. The issue's "if kept, rename it" suggests the author may prefer conversion |
| D3 | Data-fetch `set-state-in-effect` (9 sites in 8 files): refactor or downgrade to `warn` | Refactor: initial `isLoading: true`, no synchronous `setState` before the first `await`, and refetch triggers set loading in handlers. Touches loading/error flow in 8 components, some of whose tests never run, so there's real behaviour-regression risk. Downgrade: the issue explicitly allows "set those rules to `warn` with a tracking note and a follow-up issue"; new violations show as warnings but don't fail CI | **Decided (user): downgrade `react-hooks/set-state-in-effect` to `warn`** with a config comment pointing at a new follow-up issue that lists the 9 data-fetch sites. Still fix the 5 straightforward sites (reset-page ×3, prop sync ×2) so the warning count is the 9 tracked sites only |
| D4 | `no-namespace` in Cypress `declare global { namespace Cypress {...} }` | This is Cypress's documented augmentation pattern and there's no module-syntax equivalent for augmenting the global `Cypress` namespace. typescript-eslint's `no-namespace` has `allowDeclarations: true` for exactly this case (an option change, not a disable). Alternative: per-line `eslint-disable-next-line` with a reason | **Configure `allowDeclarations: true`** in a `cypress/**` override, justified in the PR. `cypress/support/index.ts` is the configured `supportFile` (`cypress.config.ts:12`) and imports `./commands`; both declare overlapping `Chainable` members (merged by TS). Leave the duplication alone (out of scope) |
| D5 | `react-refresh/only-export-components` (3) | `Flashcard.tsx` `RATING_BUTTONS`: move it to `Flashcard.constants.ts` (or `ratingButtons.ts`) and import it in `Flashcard`/`ReviewSession`; it keeps HMR working. `useSessions.tsx`: moving the hook or provider changes 9 import sites. `allowExportNames: ['useSessions']` is a targeted option change. `storybookMocks.tsx` `StorybookSessionsProvider`: turn the object into named wrapper components, or set `allowExportNames` | **Move `RATING_BUTTONS`** to its own module. For `useSessions.tsx` and `storybookMocks.tsx`, use **`allowExportNames: ['useSessions', 'StorybookSessionsProvider']`** in the `react-refresh/only-export-components` options (it keeps the rule `error` everywhere; justified in the PR: context+hook modules are the accepted exception, and a story-only utility doesn't need HMR granularity) |
| D6 | `no-unused-vars` for `catch (err)` with unused `err` | `catch {}` (optional catch binding) is valid TS/ES2019 and expresses intent. Configuring `caughtErrors: 'none'` loosens the rule | **`catch {}`** |
| D7 | `no-explicit-any` in tests (`(grammarApi.getRecommendations as any).mockResolvedValue`) | `vi.mocked(fn)` / `jest.mocked(fn)` are type-safe and idiomatic. `as unknown as Mock` is noisier | **`vi.mocked(...)`** in Vitest files, `jest.mocked(...)` in Jest files. In `mocks/handlers.ts`, use the real `Session`/`Feedback` types where the mock data matches; `unknown` for request bodies, narrowed to a typed shape |
| D8 | `LessonViewer.tsx:321-369` unused `node` in react-markdown `components` overrides (`({ node, ...props }) => <h1 {...props} />`) | `node` is destructured to keep it out of `props` (so it isn't spread onto the DOM element). Removing the destructure would spread `node` as a DOM attribute, which is a behaviour change and a React warning. Options: `argsIgnorePattern` config, or `const { node: _node, ...props }` (still flagged without config), or omit via a small helper | Use a shared helper `withoutNode(props)` that drops `node`, or rename the pattern with `ignoreRestSiblings: true`, a typescript-eslint option made for exactly this ("ignore vars that are siblings of a rest property"). **Recommend `ignoreRestSiblings: true`** (option change, justified in the PR, and it applies project-wide to this idiom) |

### Alternatives Considered

- **Downgrade every React Compiler rule to `warn`**: rejected. Most findings are straightforward, and the issue asks to refactor where that's easy.
- **Per-line `eslint-disable-next-line` for every hard case**: rejected as the default. It's effectively disabling the rule per site and hides the debt. Reserved for one-off cases with a written reason, if any remain.
- **Exclude test/story files from lint**: rejected. It hides real findings (the `rules-of-hooks` violation is in a story), and the issue includes them.
- **`--max-warnings <n>` ratchet in CI**: rejected for this issue, which says warnings don't fail. A possible follow-up.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| `SessionDetail.test.tsx` (D2) | Fix the parse error only, or also convert to Jest so it runs (which may surface failing tests) | **Resolved (user, 2026-11-15): fix in place** + follow-up issue for the 27-file discovery gap |
| Data-fetch `set-state-in-effect` (D3) | Refactor all 9 sites now, or downgrade the rule to `warn` with a follow-up issue | **Resolved (user, 2026-11-15): downgrade to `warn`** + follow-up issue listing the 9 sites; fix the 5 straightforward sites |
| Rule option changes (`allowDeclarations`, `allowExportNames`, `ignoreRestSiblings`) | Does "no rule is disabled outright" allow targeted option changes? | Yes: rules stay `error`. Justify each in the PR |
| Follow-up issue creation | The issue requires follow-up issues for any warnings; creating issues is outward-facing | Draft the text in the prompt artifact; create with `gh issue create` during implementation (pre-approved by the issue's AC) and link it in the config comment and PR |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Reset-page moved from effect to handler, but filter changes come from props or URL rather than a handler | The effect also caught non-handler changes | Check each site: in `DeckBrowser`/`LessonBrowser`/`DeckCardsPage`, the filters are local state set by handlers passed to `DeckSearch`/`LessonSearch`. If any filter comes from props, use the "adjust state on prop change" pattern instead |
| `DifficultySelector` prop sync: parent changes `defaultDifficulty` | Current effect resets the selection; the notify effect then calls `onDifficultyChange` | Previous-value pattern during render keeps both behaviours; the notify effect is unchanged |
| `Flashcard` reset on `card.id` change when uncontrolled | Current: effect resets after paint (one flipped frame); new: resets during render (no flicker) | Strictly better; same end state. Jest tests in `Flashcard.jest.test.tsx` and `ReviewSession.jest.test.tsx` cover it |
| `ChatInterface` `clientId` via `useState` initializer | Must stay stable for the component's lifetime (lock/unlock use it) | Lazy initializer runs once per mount, same as `useRef` initial value |
| `DeckBrowser` reorder of `fetchCardsForDecks` | Adding it to `fetchDecks` deps could cause refetch loops if unstable | It has `[]` deps, so it's stable and causes no extra fetches |
| `catch {}` in TS target | Optional catch binding requires ES2019 | `tsconfig.app.json` targets `es2023` (verified); Jest uses ts-jest + babel preset-env |
| Changing undiscovered `*.test.tsx` files | No runner verifies them | Keep edits type-level/mechanical; the file must still parse (lint proves it) |
| `coverage/` absent in CI | Ignore must not error | `globalIgnores` patterns are tolerant of missing dirs |
| `useState` initializer with `Date.now()` still flagged by `purity` | Then the fix doesn't satisfy lint | Verify during implementation; fallback: `useId()`-based ID (React 19, pure) or generating the ID in an effect/ref callback |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Refactoring state flow changes behaviour | UI regressions in browse/review pages | Limit refactors to the straightforward sites; run Jest + Storybook tests; Cypress in CI |
| Removing "unused" imports that have side effects | Broken stories/tests | Only type imports and named bindings are removed; side-effect imports (`import './x.css'`) never trigger `no-unused-vars` |
| `mocks/handlers.ts` real types reveal mock-data drift | Type errors in a file `tsc -b` does check (it's under `src/`, not excluded) | Fix mock data to match the types, or narrow to `Partial<>`; run `npm run typecheck` |
| Lint workflow runs slowly or flakes | Gateway waits | `npm ci` with cache, the same as the type-check job; lint takes seconds |
| Moving `RATING_BUTTONS` breaks the `ReviewSession` re-export used by tests | Jest failures | Keep `ReviewSession`'s re-export (it imports from the new module) |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | `npm run lint` exits 0, no errors | Yes | Depends on D3; with the downgrade, 9 warnings remain, tracked by a follow-up |
| AC2 | `coverage/`, `dist/` ignored | Yes | One config line |
| AC3 | `rules-of-hooks` + parse error fixed | Yes | D2 decides rename/convert |
| AC4 | No rule disabled outright | Yes | Option changes (D4, D5, D8) and a possible downgrade (D3) justified in the PR |
| AC5 | CI lint gate via `status-gateway.yml` | Yes | New workflow + gateway entry |
| AC6 | Jest, Vitest, Cypress pass | Yes | Run locally; Cypress needs backend + dev server (run locally if feasible, else rely on CI) |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- `npm run typecheck` must keep passing (the #250 gate)
- README.md and CLAUDE.md mention the new lint gate
- Follow-up issues: the D3 warnings (if downgraded) and the frontend test-discovery gap (if D2 is fix-in-place)

---

## REASONS Canvas

### Requirements
- `npm run lint` → 0 errors; any warnings tracked by a follow-up issue
- `coverage/` and `dist/` ignored
- `rules-of-hooks` and parse error fixed
- No rule `off`; downgrades/option changes justified
- `Frontend Lint` workflow, path-filtered to `frontend/**`, in the gateway
- Jest/Vitest/Cypress (and `tsc -b`) still pass

### Examples
- `cd frontend && npx eslint . -f json | jq '[.[].messages[] | select(.severity==2)] | length'` → `0`
- `npx eslint coverage/` → "all files ignored" (no findings)
- `DeckSearch.stories.tsx` `Interactive` story: typing in search updates `searchQuery`; Clear resets all three values (Storybook test passes)
- `throw new Error(errorMessage, { cause: err })` in `SessionHistory.tsx:89`
- `export type LessonResponse = Lesson` (was `export interface LessonResponse extends Lesson {}`)
- `vi.mocked(grammarApi.getRecommendations).mockResolvedValue(...)` (was `(... as any).mockResolvedValue`)
- PR touching only `frontend/src/**` → `Frontend Lint` runs; a deliberate `const x: any = 1` makes it fail

### Architecture
- Frontend: React 19 + TS + Vite; ESLint 10 flat config with `typescript-eslint` 8, `react-hooks` 7 (React Compiler rules), `react-refresh` 0.5
- CI: one workflow per check, path-filtered; `status-gateway.yml` is the single required check and tracks workflows by `name`
- Tests: Jest (`*.jest.test.*`), Vitest Storybook project (`*.stories.tsx`), Cypress E2E

### Standards
- Match existing style (no semicolons in most components, single quotes); keep diffs minimal per file
- No new `any`, `@ts-ignore`, or file-wide `eslint-disable`
- 80% coverage: no new runtime modules except possibly a constants file (covered through `Flashcard`/`ReviewSession` Jest tests); existing coverage must not drop
- README.md updated (CI workflows list + lint section); CLAUDE.md commands comment updated
- Commit `chore(#251): ...`

### Omissions
- TypeScript errors (#250), Prettier (#134), behaviour changes, test-discovery gap for the other 26 files, Jest coverage exclusions (#233/#254), plugin upgrades, failing CI on warnings

### Notes
- Count is 145 on current `main` (not 170); the breakdown is in Background
- `tsconfig.app.json` excludes `*.test.*`/`*.stories.*`, so lint is the only static check on those files
- `frontend/coverage/` exists locally but is gitignored, so CI wouldn't hit it anyway; the ignore is for local runs
- Don't run `npm run build` (it overwrites the tracked `static/`)
- `LessonViewer.tsx` `node` destructure is deliberate (keeps react-markdown's `node` off DOM elements)

### Solutions
- `.github/workflows/frontend-typecheck.yml` as the workflow template; the #250/#258 gateway change as the pattern for `expectedWorkflowNames`
- React docs, "You Might Not Need an Effect": "Adjusting some state when a prop changes" (prev-value comparison during render) and "Resetting state on prop change" for D3-easy sites
- Storybook docs: stateful stories via a wrapper component rendered from `render: (args) => <Wrapper {...args} />`
- typescript-eslint options: `no-namespace.allowDeclarations`, `no-unused-vars.ignoreRestSiblings`; react-refresh `allowExportNames`
