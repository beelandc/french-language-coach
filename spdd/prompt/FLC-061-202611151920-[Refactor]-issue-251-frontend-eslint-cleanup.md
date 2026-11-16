# SPDD Prompt: Clean up frontend ESLint findings and enforce lint in CI

**GitHub Issue**: #251
**Issue Title**: Clean up frontend ESLint findings and enforce lint in CI
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/251
**Artifact ID**: FLC-061-202611151920
**Created**: 2026-11-15 19:20
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [spdd/analysis/FLC-061-202611151916-[Analysis]-issue-251-frontend-eslint-cleanup.md](../analysis/FLC-061-202611151916-[Analysis]-issue-251-frontend-eslint-cleanup.md)

---

## Context

### Current Codebase State
- Branch `chore/issue-251-frontend-lint` from `main` at `149c4e0` (#250 and #252 merged).
- `cd frontend && npx eslint .` reports **145 findings** (136 errors, 9 warnings). The full breakdown is in the analysis Background.
- `frontend/eslint.config.js` ignores only `dist`. CI has no lint job. `status-gateway.yml` tracks 5 workflows by name.
- 27 plain `*.test.ts(x)` files are discovered by neither Vitest nor Jest, and `tsconfig.app.json` excludes them, so lint is the only static check on them.
- User decisions (2026-11-15): **D2**: fix `SessionDetail.test.tsx` in place (no rename/conversion) and open a follow-up issue for the test-discovery gap. **D3**: downgrade `react-hooks/set-state-in-effect` to `warn` for the 9 data-fetch sites, tracked by a follow-up issue; fix the 5 straightforward sites.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/eslint.config.js` | ESLint flat config | `globalIgnores(['dist'])`; one `**/*.{ts,tsx}` block |
| `.github/workflows/frontend-typecheck.yml` | Template for the new workflow | whole file |
| `.github/workflows/status-gateway.yml` | Required check | `expectedWorkflowNames` (lines 43-49) |
| `frontend/src/components/DeckSearch.stories.tsx` | `rules-of-hooks` ×3, unused ×2 | `Interactive` story `render` (155-176); `DeckSearchProps` (10), `sortOptions` (38) |
| `frontend/src/components/SessionDetail.test.tsx` | Parse error | line 493: `initialEntries="/sessions/"}` |
| `frontend/src/components/ChatInterface.tsx` | `refs` ×2, `purity`, `preserve-manual-memoization` ×2, `exhaustive-deps` | 23 (`clientId` via `useRef(...).current`), 36 (`messages`), 39-67 (`getScenarioName` `useCallback`) |
| `frontend/src/components/SessionDetail.tsx` | `preserve-manual-memoization` | 166-169 `getScenarioDisplayName`, 172 `handleExportToPDF` |
| `frontend/src/components/DeckBrowser.tsx` | `immutability`, `exhaustive-deps`, unused `err`, `set-state-in-effect` ×2 | `fetchDecks` (≈78-106) uses `fetchCardsForDecks` (108-123) before declaration; 117 `catch (err)`; 126-129 fetch effect; 131-134 reset-page effect on `[tagFilter]`; handlers 246-264 |
| `frontend/src/components/LessonBrowser.tsx` | `set-state-in-effect` ×2 | 114-117 fetch effect; 119-122 reset-page effect on `[topicFilter, difficultyFilter]`; handlers 149-170 |
| `frontend/src/pages/DeckCardsPage.tsx` | `set-state-in-effect` ×2 | 96-104 fetch effect; 106-109 reset-page effect on `[searchQuery, tagFilter, sortBy]`; handlers 133-152 |
| `frontend/src/components/DifficultySelector.tsx` | `set-state-in-effect` | 24-27 sync `selectedDifficulty` from `defaultDifficulty` |
| `frontend/src/components/Flashcard.tsx` | `set-state-in-effect`, `only-export-components` | 18 `RATING_BUTTONS`; 104-109 reset `internalFlipped` on `card.id` |
| `frontend/src/components/ReviewSession.tsx` | Imports/re-exports `RATING_BUTTONS`; fetch effects (warn) | 13, 26, 349, 401; 193-201 |
| `frontend/src/hooks/useSessions.tsx` | `only-export-components` | 283 `useSessions` |
| `frontend/src/utils/storybookMocks.tsx` | `only-export-components` | 293 `StorybookSessionsProvider` |
| `frontend/src/components/SessionHistory.tsx`, `pages/ExercisePage.tsx`, `pages/ExerciseBrowserPage.tsx` | `preserve-caught-error`; unused `fallbackErr` | 89; 50/54; 73/79 |
| `frontend/src/types/index.ts` | `no-empty-object-type` ×6 | 268, 379, 557, 739, 902, 916 |
| `frontend/src/components/LessonViewer.tsx` | unused `node` ×17 | 321-369 (react-markdown `components` overrides) |
| `frontend/src/mocks/handlers.ts` | `no-explicit-any` ×15 | 6, 34, 50, 67, 94, 111, 116, 201-245 |
| `frontend/src/components/RecommendedLessons.test.tsx` | `no-explicit-any` ×16 | `(grammarApi.getRecommendations as any)` |
| `frontend/src/setupTests.ts`, `src/sample.jest.test.tsx`, `src/pages/LessonDetailPage.test.tsx` | `no-require-imports` ×5 | 6; 84, 91, 92; 172 |
| `frontend/src/components/FeedbackView.test.tsx` | `ban-ts-comment` ×2, `any` | 27, 204, 229 |
| `frontend/cypress/support/commands.ts`, `index.ts` | `no-namespace` ×2 | `declare global { namespace Cypress }` (101; 9) |
| `frontend/cypress.config.ts` | unused `on`, `config` | 15 |
| Other unused-var/any files | Mechanical | `ChatInterface.test.tsx`, `DeckBrowser.stories.tsx`, `DeckBrowser.test.tsx`, `DifficultySelector.test.tsx`, `LessonBrowser.stories.tsx`, `LessonCard.stories.tsx`, `LessonCard.test.tsx`, `LessonSearch.stories.tsx`, `LessonSearch.test.tsx`, `LessonViewer.test.tsx`, `SessionDetail.stories.tsx`, `SessionHistory.stories.tsx`, `SessionHistory.test.tsx`, `useSessions.test.tsx`, `DeckCardsPage.test.tsx`, `DeckDetailPage.test.tsx`, `LessonDetailPage.tsx`, `LessonPage.test.tsx`, `pdfExport.test.ts` |
| `README.md` | CI docs | Type-check section ≈735-740; workflows list ≈818; gateway note ≈835 |
| `CLAUDE.md` | Commands | `npm run lint` line in the Frontend block |

### Existing Patterns
- **CI workflow**: `frontend-typecheck.yml` (push/PR to `main`, paths `frontend/**` + its own file, Node 20, npm cache, `npm ci` and the script in `frontend/`).
- **Gateway**: add the workflow's `name:` to `expectedWorkflowNames`, as #250 did with `'Frontend Type Check'`.
- **Frontend style**: single quotes, mostly no semicolons in components (some files use semicolons; match each file).
- **Prop-derived state**: React docs "Adjusting some state when a prop changes": `const [prev, setPrev] = useState(prop); if (prop !== prev) { setPrev(prop); setX(...) }` during render.

---

## Goal

**Primary Objective**: `npm run lint` in `frontend/` exits 0 with zero errors, enforced in CI by a `Frontend Lint` workflow gated through `status-gateway.yml`.

**Secondary Objectives**:
- Fix the real violations (story hooks, lost error `cause`, use-before-declare `useCallback`, unparseable test).
- Fix the straightforward React Compiler findings without changing behaviour.
- Leave exactly the 9 tracked data-fetch `set-state-in-effect` sites as warnings, each listed in a follow-up issue.
- Open two follow-up issues: the set-state-in-effect data-fetch refactor, and the frontend test-discovery gap.

---

## Constraints

### Architecture Constraints
- No new dependencies. No ESLint/plugin upgrades.
- No rule set to `off`; no file-wide `/* eslint-disable */`. Allowed config changes (each justified in a comment and the PR): `set-state-in-effect: 'warn'`; `no-namespace` `allowDeclarations: true` (Cypress files only); `no-unused-vars` `ignoreRestSiblings: true`; `react-refresh/only-export-components` `allowExportNames: ['useSessions', 'StorybookSessionsProvider']` (keep `allowConstantExport: true` from the vite preset).
- Prefer no `eslint-disable-next-line`. If one turns out to be unavoidable, add it with a `-- reason` and list it in the PR.
- Don't run `npm run build` (it overwrites tracked `static/`). Don't touch backend code.
- `npm run typecheck` must still pass.

### Code Quality Constraints
- Lint fixes must not change behaviour. Refactors keep the same observable state transitions.
- Remove unused code rather than prefixing with `_`. Use `catch {}` for unused catch bindings.
- Replace `any` with real types, `vi.mocked()`/`jest.mocked()`, or `unknown` + narrowing. No `as any`, no new `@ts-ignore`/`@ts-expect-error`.
- Keep comments/JSDoc that exist; add a short comment where a pattern is non-obvious (prop-sync during render, the config option changes).

### Testing Constraints
- No new runtime logic beyond refactors, so no new test files are required. Behaviour is protected by the existing suites:
  - Jest (`npm run test:jest`, discovers `*.jest.test.*`): covers `Flashcard`, `ReviewSession`, `ChatInterface`, `FeedbackView`, `useSessions`, `storybookMocks`, `api`, `LLMMetrics/*`.
  - Vitest Storybook (`npm run test`): runs every story, including `DeckSearch` `Interactive`, `DifficultySelector`, `DeckBrowser`, `LessonBrowser`.
- If `RATING_BUTTONS` moves to a new module, it's covered via the `Flashcard`/`ReviewSession` Jest tests. Jest's `collectCoverageFrom` must not lose coverage.
- Edits to undiscovered `*.test.tsx` files stay mechanical (imports, types). Lint parsing them is the check.
- Cypress: run locally if the backend and dev server can be started; otherwise rely on CI and say so in the PR.

### Acceptance Criteria
- [ ] `cd frontend && npm run lint` exits 0 with no errors (remaining warnings listed in the PR with a follow-up issue)
- [ ] Generated directories (`coverage/`, `dist/`) are ignored by ESLint
- [ ] The `rules-of-hooks` and parse-error findings are fixed
- [ ] No rule is disabled outright. Any downgrades to `warn` are justified in the PR
- [ ] A CI lint check runs on PRs touching `frontend/**` and is enforced through `status-gateway.yml`
- [ ] Existing Jest, Vitest (Storybook) and Cypress suites still pass

---

## Examples

### Input/Output Examples
1. **Ignore generated output**
   - Input: `globalIgnores(['dist'])`
   - Output: `globalIgnores(['dist', 'coverage', 'storybook-static'])`. `npx eslint .` shows no `coverage/*.js` findings.

2. **Story hooks → wrapper component** (`DeckSearch.stories.tsx`)
   ```tsx
   function InteractiveDeckSearch(args: DeckSearchProps) {
     const [searchQuery, setSearchQuery] = useState(args.searchQuery)
     const [tagFilter, setTagFilter] = useState(args.tagFilter)
     const [sortBy, setSortBy] = useState<DeckSortOption>(args.sortBy)
     return (
       <DeckSearch {...args} searchQuery={searchQuery} tagFilter={tagFilter} sortBy={sortBy}
         onSearch={setSearchQuery} onTagFilter={setTagFilter} onSort={setSortBy}
         onClearFilters={() => { setSearchQuery(''); setTagFilter(''); setSortBy('name-asc') }} />
     )
   }
   export const Interactive: Story = { render: (args) => <InteractiveDeckSearch {...args} /> }
   ```
   (This also makes `DeckSearchProps` used. Keep the existing `args`.)

3. **Rethrow with cause** (`SessionHistory.tsx:89`)
   - `throw new Error(errorMessage)` → `throw new Error(errorMessage, { cause: err })`
   - `ExercisePage`/`ExerciseBrowserPage`: the flagged `throw new Error(...)` sits inside the inner `try` after a non-OK fetch, with no caught error in scope. Read the code: if the rule wants the outer `err` attached, pass `{ cause: err }`. Drop the unused `fallbackErr` binding (`catch {}`).

4. **Reset page in handlers, not effects** (guard so behaviour matches the effect, which only fired on an actual value change)
   ```tsx
   const handleTagFilter = useCallback((tag: string) => {
     setTagFilter(tag)
     if (tag !== tagFilter) setCurrentPage(1)
   }, [tagFilter])
   ```
   - `DeckBrowser`: reset on `tagFilter` only (not search/sort; match the current effect deps).
   - `LessonBrowser`: reset on `topicFilter` and `difficultyFilter` (not search).
   - `DeckCardsPage`: reset on `searchQuery`, `tagFilter` and `sortBy`.
   - The clear-filters handlers already call `setCurrentPage(1)`. Leave them.
   - Alternative if a handler can't see current state cleanly: the functional form `setTagFilter(prev => { if (prev !== tag) setCurrentPage(1); return tag })` is **not** allowed (side effect in an updater). Use the closure compare.

5. **Prop sync during render** (`DifficultySelector.tsx`)
   ```tsx
   const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(defaultDifficulty)
   // Re-sync when the parent changes defaultDifficulty (React "adjust state when a prop changes")
   const [prevDefault, setPrevDefault] = useState(defaultDifficulty)
   if (defaultDifficulty !== prevDefault) {
     setPrevDefault(defaultDifficulty)
     setSelectedDifficulty(defaultDifficulty)
   }
   ```
   The notify effect (`onDifficultyChange(selectedDifficulty)`) stays as is. `Flashcard.tsx` does the same with `prevCardId`, resetting `internalFlipped` only when `controlledFlipped === undefined`.

6. **ChatInterface**
   - `const clientId = useRef(`chat_${sessionId}_${Date.now()}`).current` → `const [clientId] = useState(() => `chat_${sessionId}_${Date.now()}`)`. If `purity` still flags `Date.now` in the initializer, fall back to a value generated without render-time impurity (e.g. `useId()` combined with `sessionId`) and note it in Human Review Notes.
   - `const messages = useMemo(() => session?.messages ?? [], [session?.messages])` (fixes the `exhaustive-deps` warning).
   - `getScenarioName`: lift `scenarioNames` to a module-level constant, and make the deps exactly what the body reads, or compute `scenarioName` with `useMemo`. Keep call sites' behaviour.

7. **DeckBrowser use-before-declare**: move `fetchCardsForDecks` above `fetchDecks` and add it to `fetchDecks`' deps (`[currentPage, fetchCardsForDecks]`). It's stable (`[]` deps), so there are no extra fetches.

8. **Empty object types** (`types/index.ts`)
   - `export interface LessonResponse extends Lesson {}` → `export type LessonResponse = Lesson`. Same for `ReferenceResponse`, `DeckResponse`.
   - `export interface ReferencePageProps { /* none */ }` → `export type ReferencePageProps = Record<string, never>` (keep the comment). Same for `DeckDetailPageProps`, `DeckCardsPageProps`. Names stay exported (re-exported by `utils/api.ts`).

9. **Mocks without `any`**
   - `(grammarApi.getRecommendations as any).mockResolvedValue(x)` → `vi.mocked(grammarApi.getRecommendations).mockResolvedValue(x)`
   - `// @ts-ignore` + `generateFeedbackPDF.mockRejectedValue(e)` → `vi.mocked(generateFeedbackPDF).mockRejectedValue(e)` (or `jest.mocked` if that file uses Jest globals; check its imports)
   - `mocks/handlers.ts`: `const mockSession: Session = {...}`, `const mockFeedback: Feedback = {...}`; request bodies `await request.json() as { content?: string }`-style typed shapes, not `any`.

10. **require → import**
   - `setupTests.ts`: `import '@testing-library/jest-dom'` (side-effect import registers matchers). Verify Jest still extends `expect`; fall back to `import * as matchers from '@testing-library/jest-dom/matchers'; expect.extend(matchers)` if needed.
   - `sample.jest.test.tsx`: top-level `import * as ReactDOM from 'react-dom/client'`, `import fs from 'fs'`, `import path from 'path'` (Node built-ins under Jest).
   - `LessonDetailPage.test.tsx:172`: `import * as ReactRouterDom from 'react-router-dom'` at top; `vi.spyOn(ReactRouterDom, 'useNavigate')`.

11. **Parse error**: `SessionDetail.test.tsx:493`: `<MemoryRouter initialEntries="/sessions/"}>` → `<MemoryRouter initialEntries={['/sessions/']}>`. Any further findings that surface once the file parses get the same mechanical treatment.

12. **`RATING_BUTTONS`**: move it to `frontend/src/components/ratingButtons.ts` (exported const + JSDoc). `Flashcard.tsx` and `ReviewSession.tsx` import from it. `ReviewSession` keeps its existing re-export, and `Flashcard.tsx` also keeps re-exporting it if any importer uses `from './Flashcard'` (only `ReviewSession` does, so update that import instead).

### Edge Cases
- Re-selecting the same filter value must not reset the page (guarded compare).
- `DifficultySelector` mounted with a default, then parent changes it → selection follows; user clicks a different difficulty → the parent's unchanged default doesn't override it.
- `Flashcard` controlled mode (`isFlipped` prop given) → no internal reset.
- `ChatInterface` `clientId` stays stable across re-renders (lock/unlock use the same ID).
- `coverage/` missing (CI) → ignore pattern is harmless.

### Test Cases
No new tests. Verification commands:
```bash
cd frontend
npx eslint . -f json | jq '[.[].messages[] | select(.severity==2)] | length'   # → 0
npx eslint . -f json | jq -r '[.[].messages[] | select(.severity==1) | .ruleId] | group_by(.) | map("\(length) \(.[0])") | .[]'
# → "9 react-hooks/set-state-in-effect" only
npm run lint                 # exit 0
npm run typecheck            # exit 0
npm run test:jest            # all pass
npm run test                 # Vitest Storybook, all pass
```

---

## Deliverables

### Code Changes
- [ ] `frontend/eslint.config.js`: ignores; `set-state-in-effect: 'warn'` with a comment linking the follow-up issue; `no-unused-vars` `ignoreRestSiblings`; `react-refresh/only-export-components` `allowExportNames`; Cypress override with `no-namespace` `allowDeclarations`
- [ ] `frontend/src/components/ratingButtons.ts` (new) + `Flashcard.tsx`/`ReviewSession.tsx` imports
- [ ] Real-violation fixes: `DeckSearch.stories.tsx`, `SessionHistory.tsx`, `ExercisePage.tsx`, `ExerciseBrowserPage.tsx`, `SessionDetail.test.tsx`, `DeckBrowser.tsx`
- [ ] React Compiler refactors: `ChatInterface.tsx`, `SessionDetail.tsx`, `DeckBrowser.tsx`, `LessonBrowser.tsx`, `DeckCardsPage.tsx`, `DifficultySelector.tsx`, `Flashcard.tsx`
- [ ] Mechanical fixes across the remaining files in the Relevant Files table
- [ ] `.github/workflows/frontend-lint.yml` (new, `name: Frontend Lint`)
- [ ] `.github/workflows/status-gateway.yml`: add `'Frontend Lint'`

### Tests
- [ ] No new test files (refactor only). Existing Jest + Vitest Storybook suites pass. Cypress locally if feasible, else in CI.

### Documentation
- [ ] README.md: "Frontend Lint" note next to the type-check section; `frontend-lint.yml` in the workflows list; gateway list mentions lint
- [ ] CLAUDE.md: mark `npm run lint` as a CI gate in the Commands block
- [ ] Follow-up issues (via `gh issue create`): (a) refactor the 9 data-fetch `set-state-in-effect` sites and restore the rule to `error`; (b) frontend test-discovery gap (27 undiscovered `*.test.*` files)
- [ ] PR body: AC checklist, option changes + downgrade with justification, remaining warnings list, how the test suites ran

---

## Actual Prompt

```
Implement GitHub issue #251 in french-language-coach: clear all frontend ESLint errors and
enforce lint in CI. Branch: chore/issue-251-frontend-lint.

CONTEXT:
- frontend/ uses ESLint 10 flat config (frontend/eslint.config.js): @eslint/js recommended,
  typescript-eslint recommended, eslint-plugin-react-hooks 7 flat.recommended (React Compiler
  rules), eslint-plugin-react-refresh configs.vite. globalIgnores(['dist']) only.
- `npx eslint .` currently reports 145 findings: 52 no-unused-vars, 38 no-explicit-any,
  14 set-state-in-effect, 6 coverage/ unused-directive warnings, 1 parse error
  (SessionDetail.test.tsx:493), 6 no-empty-object-type, 5 no-require-imports, 3 each of
  only-export-components / rules-of-hooks / preserve-manual-memoization / preserve-caught-error,
  2 each of refs / exhaustive-deps / no-namespace / ban-ts-comment, 1 each of purity /
  immutability / prefer-const.
- No CI lint job. .github/workflows/frontend-typecheck.yml is the template;
  status-gateway.yml tracks workflows by name in expectedWorkflowNames.
- 27 plain *.test.ts(x) files run under no test runner and are excluded from tsc; lint is
  their only static check.
- User decisions: (D2) fix SessionDetail.test.tsx's parse error in place, no rename;
  (D3) downgrade react-hooks/set-state-in-effect to 'warn' for the 9 data-fetch-on-mount
  sites (FeedbackView:43, LessonBrowser:116, DeckBrowser:128, RecommendedLessons:34,
  ReviewSession:195 and :200, DeckCardsPage:99, DeckDetailPage:106, LessonDetailPage:66),
  tracked by a follow-up issue; fix the other 5 set-state-in-effect sites.

GOAL:
`cd frontend && npm run lint` exits 0 with 0 errors; the only warnings are the 9 tracked
set-state-in-effect sites; a `Frontend Lint` workflow enforces it through status-gateway.yml.

CONSTRAINTS:
1. Config (frontend/eslint.config.js):
   - globalIgnores(['dist', 'coverage', 'storybook-static']).
   - In the ts/tsx block add rules (each with a one-line justification comment):
     'react-hooks/set-state-in-effect': 'warn' (link the follow-up issue number),
     '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }]
       (react-markdown `({ node, ...props })` idiom in LessonViewer keeps node off the DOM),
     'react-refresh/only-export-components': ['error', { allowConstantExport: true,
       allowExportNames: ['useSessions', 'StorybookSessionsProvider'] }].
   - Add a block for cypress/**/*.ts with
     '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }]
     (Cypress's documented `declare global { namespace Cypress }` augmentation).
   - No rule set to 'off'. No file-wide eslint-disable. Avoid eslint-disable-next-line;
     if one is unavoidable, add `-- reason` and report it.
2. Real violations:
   - DeckSearch.stories.tsx: move the Interactive story's useState calls into a named
     wrapper component `InteractiveDeckSearch(args: DeckSearchProps)`; story becomes
     `render: (args) => <InteractiveDeckSearch {...args} />`. Remove unused `sortOptions`.
   - preserve-caught-error: pass `{ cause: err }` when rethrowing (SessionHistory.tsx:89,
     ExercisePage.tsx:50, ExerciseBrowserPage.tsx:73, reading each to pick the right caught
     error). Unused `fallbackErr` → `catch {}`.
   - SessionDetail.test.tsx:493: `initialEntries="/sessions/"}` → `initialEntries={['/sessions/']}`.
   - DeckBrowser.tsx: declare fetchCardsForDecks before fetchDecks; deps
     [currentPage, fetchCardsForDecks]; unused `err` → `catch {}`.
3. React Compiler refactors (no behaviour change):
   - ChatInterface.tsx: clientId via `useState(() => ...)` lazy initializer instead of
     reading useRef(...).current during render (if purity still flags Date.now, use a pure
     alternative such as useId() with sessionId and record it); `messages` via useMemo on
     session?.messages; getScenarioName: lift the name map to module scope and make the
     memo deps match what the body reads (or replace with a useMemo'd value) so
     preserve-manual-memoization passes.
   - SessionDetail.tsx: make getScenarioDisplayName / handleExportToPDF deps match the
     values actually read (e.g. session?.scenario_id, session?.feedback) or drop needless
     memoization.
   - Reset-page effects → handlers, guarded by a value-change compare so the same value
     doesn't reset the page: DeckBrowser (tagFilter), LessonBrowser (topicFilter,
     difficultyFilter), DeckCardsPage (searchQuery, tagFilter, sortBy). Delete the effects.
     Clear-filters handlers already reset the page.
   - DifficultySelector.tsx and Flashcard.tsx: replace the prop-sync effect with React's
     "adjust state when a prop changes" pattern (store previous prop value in state,
     compare during render). Flashcard only resets internalFlipped when uncontrolled.
4. Mechanical:
   - Unused imports/vars: delete. Unused catch bindings: `catch {}`. cypress.config.ts
     setupNodeEvents: drop unused params.
   - no-explicit-any: real types (Session, Feedback, LessonSummary, DeckSummary, ...),
     vi.mocked()/jest.mocked() for mocks (match each file's runner), unknown + narrowing
     for request bodies in mocks/handlers.ts. Fix mock data rather than cast if types disagree.
   - ban-ts-comment in FeedbackView.test.tsx: type the mock so no comment is needed.
   - no-empty-object-type (types/index.ts): `interface X extends Y {}` → `type X = Y`;
     empty props interfaces → `type XProps = Record<string, never>` (keep names and comments).
   - no-require-imports: ES imports (setupTests.ts: `import '@testing-library/jest-dom'`,
     verifying jest-dom matchers still work; sample.jest.test.tsx: top-level imports of
     react-dom/client, fs, path; LessonDetailPage.test.tsx: `import * as ReactRouterDom`).
   - only-export-components: move RATING_BUTTONS from Flashcard.tsx to new
     src/components/ratingButtons.ts; import it in Flashcard.tsx and ReviewSession.tsx
     (ReviewSession keeps its existing re-export).
   - prefer-const in DifficultySelector.test.tsx.
5. Never run `npm run build`. Don't touch backend code. Match each file's quote/semicolon
   style. No new any / @ts-ignore / @ts-expect-error.
6. `npm run typecheck`, `npm run test:jest` and `npm run test` must pass.

EXAMPLES:
- `npx eslint . -f json | jq '[.[].messages[] | select(.severity==2)] | length'` → 0
- warnings grouped by rule → exactly "9 react-hooks/set-state-in-effect"
- `throw new Error(errorMessage, { cause: err })`
- `export type LessonResponse = Lesson`
- `vi.mocked(grammarApi.getRecommendations).mockResolvedValue(buildResponse(...))`
- handler: `setTagFilter(tag); if (tag !== tagFilter) setCurrentPage(1)`

ACCEPTANCE CRITERIA:
- [ ] npm run lint exits 0 with no errors (remaining warnings listed in PR with follow-up issue)
- [ ] coverage/ and dist/ ignored by ESLint
- [ ] rules-of-hooks and parse-error findings fixed
- [ ] No rule disabled outright; any warn downgrade justified in PR
- [ ] CI lint check on PRs touching frontend/**, enforced via status-gateway.yml
- [ ] Existing Jest, Vitest (Storybook) and Cypress suites still pass

DELIVERABLES:
- Code + config changes above; new src/components/ratingButtons.ts
- .github/workflows/frontend-lint.yml: `name: Frontend Lint`, job name `Frontend Lint`,
  push/PR to main with paths frontend/** and the workflow file, Node 20 with npm cache,
  `npm ci` then `npm run lint` in frontend/ (lint errors fail; warnings don't)
- status-gateway.yml: add 'Frontend Lint' to expectedWorkflowNames
- README.md: Frontend Lint section beside the type-check section; workflows list; gateway list
- CLAUDE.md: note `npm run lint` is a CI gate
- Follow-up issues: (a) refactor 9 data-fetch set-state-in-effect sites + restore 'error';
  (b) frontend test-discovery gap (27 undiscovered *.test.* files, incl. SessionDetail.test.tsx)
- Fill in this artifact's AI Response / Human Review Notes / Verification; open the PR
  (Closes #251) and stop.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, on 2026-11-15.

- **Result**: `npm run lint` goes from 145 findings (136 errors, 9 warnings) to **0 errors, 9 warnings**, exit 0. The 9 warnings are exactly the data-fetch `react-hooks/set-state-in-effect` sites listed in **#262**.
- **Config** (`frontend/eslint.config.js`): ignores `dist`, `coverage`, `storybook-static`. `set-state-in-effect: 'warn'` (#262). `no-unused-vars` `ignoreRestSiblings`. `only-export-components` `allowExportNames: ['useSessions', 'StorybookSessionsProvider']`. Cypress override: `no-namespace` `allowDeclarations`. No rule is `off`; there are no `eslint-disable` comments anywhere.
- **Real violations**: `DeckSearch.stories.tsx` story state moved into an `InteractiveDeckSearch` wrapper component. `{ cause: err }` added in `SessionHistory.tsx`, `ExercisePage.tsx` and `ExerciseBrowserPage.tsx`. `DeckBrowser.tsx` now declares `fetchCardsForDecks` before `fetchDecks` and lists it as a dependency. `SessionDetail.test.tsx:493` syntax fixed.
- **React Compiler refactors**:
  - `ChatInterface.tsx`: `clientId` comes from a `useState` lazy initializer; `messages` is memoised; scenario-name lookup is a pure module-level function.
  - `SessionDetail.tsx`: the PDF callback reads `session?.feedback` once.
  - Reset-page effects moved into the filter handlers, behind a value-change guard: `DeckBrowser` (tag), `LessonBrowser` (topic, difficulty), `DeckCardsPage` (search, tag, sort).
  - Prop-to-state sync done during render, React's "adjust state when a prop changes" pattern: `DifficultySelector`, `Flashcard`.
- **Mechanical fixes**: unused imports/locals/dead mock data removed; `any` replaced with real types, `vi.mocked()`, or inference (`mocks/handlers.ts`); empty interfaces → type aliases / `Record<string, never>`; `require` → ES imports; `@ts-ignore` removed by typing the mock; `prefer-const`.
- **New**: `frontend/src/components/ratingButtons.ts` (`RATING_BUTTONS`, moved out of `Flashcard.tsx`); `.github/workflows/frontend-lint.yml` (`Frontend Lint`); `'Frontend Lint'` added to `status-gateway.yml`.
- **Docs**: README (Lint section, workflows list, gateway list), CLAUDE.md (commands, CI line), `frontend/README.md` (scripts table).
- **Follow-up issues created**: #262 (data-fetch `set-state-in-effect` refactor + restore `error`) and #263 (27 frontend `*.test.*` files that no runner discovers).

---

## Human Review Notes

### Changes Made
- [x] **Deviation, `RATING_BUTTONS` test import**: `Flashcard.jest.test.tsx` imported `RATING_BUTTONS` from `./Flashcard`, so its import now points at `./ratingButtons`. The prompt only named `Flashcard.tsx` and `ReviewSession.tsx` as importers. `ReviewSession` keeps its re-export.
- [x] **Deviation, `mocks/handlers.ts`**: the prompt suggested typing the mocks as `Session` / `Feedback`. Their data follows an older API shape (`items`, `summary`, `estimated_duration`), so real types would mean changing the mock data. I removed the `any` annotations and let TypeScript infer the literal shapes. That keeps the data identical and still gives real types (`tsc -b` passes).
- [x] **Deviation, `ChatInterface` scenario name**: instead of adjusting `useCallback` deps, the scenario map and lookup became a pure module-level `getScenarioName(sessionId, scenarioId, currentScenarioId)`. It was called once per render and is trivially cheap, so manual memoisation added nothing. The React Compiler memoises it anyway.
- [x] **`Date.now()` in the `useState` initializer** passes `react-hooks/purity`, so the `useId()` fallback wasn't needed.
- [x] **`Flashcard` prop sync** also tracks the previous `controlledFlipped`, because the old effect depended on `[card.id, controlledFlipped]`, so switching from controlled to uncontrolled mode also reset the flip state.
- [x] **Side effect of the reset-page refactor (fewer requests)**: in `LessonBrowser`, changing a filter used to fetch twice, first with the stale page and then with page 1 after the reset effect ran. With the reset in the handler, both state updates batch into one render and one fetch for page 1. The end state is the same.
- [x] **Dead code removed in undiscovered tests**: `SessionDetail.test.tsx` and `SessionDetail.stories.tsx` defined mock sessions that nothing used (the tests use inline data), and so did `SessionHistory.stories.tsx` / `SessionHistory.test.tsx`. Removed. `SessionDetail.test.tsx` also mixes `vi.fn()` with `jest.Mock` casts and passes a string to `initialEntries` in a helper. Left as is, for #263.

### Quality Checks
- [x] Code follows existing patterns (per-file quote/semicolon style kept; comments reference #251)
- [x] Tests pass; touched modules keep their coverage (`ratingButtons.ts` 100%, `Flashcard.tsx` 100% lines, `ChatInterface.tsx` 98.6% lines under Jest). No new runtime logic was left untested.
- [x] Documentation updated
- [x] All acceptance criteria met

### Issues Found
- `DifficultySelector` has no discovered unit test (its `DifficultySelector.test.tsx` is in the #263 gap). The Storybook stories still cover it.
- `react-hooks/set-state-in-effect` stays at `warn` until #262 lands.

---

## Verification

Commands run locally on 2026-11-15 (macOS, Node 20+):

| Check | Result |
|---|---|
| `npm run lint` | exit 0: **0 errors, 9 warnings** (all `react-hooks/set-state-in-effect`, the #262 sites) |
| Deliberate `const x: any` in a probe file → `npm run lint` | exit 1 (lint errors fail); probe removed |
| `npx eslint coverage/` | all files ignored |
| `npm run typecheck` (`tsc -b`) | exit 0 |
| `npm run test:jest` | 29 suites, **300 tests passed** |
| `npm run test` (Vitest Storybook, headless Chromium) | 36 files, **170 tests passed** |
| Cypress (`conversation-flow`, `admin-metrics`, `admin-metrics-report`, the CI spec list) against `npm run dev`, Electron | **27/27 passed** (CI uses Chrome) |
| Backend / `static/` | untouched |

- [x] All acceptance criteria from issue #251 are met
  - [x] `npm run lint` exits 0 with no errors; the 9 remaining warnings are listed in #262
  - [x] `coverage/` and `dist/` (plus `storybook-static/`) ignored
  - [x] `rules-of-hooks` and parse-error findings fixed
  - [x] No rule disabled outright; the `warn` downgrade and 3 option changes are justified in config comments and the PR
  - [x] `Frontend Lint` workflow on `frontend/**`, listed in `status-gateway.yml` (first CI run is on this PR)
  - [x] Jest, Vitest (Storybook) and Cypress pass
- [x] Tests pass; coverage of touched modules maintained
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
