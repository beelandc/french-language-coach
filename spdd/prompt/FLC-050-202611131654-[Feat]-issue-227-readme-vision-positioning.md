# SPDD Prompt: Refine README and VISION.md Positioning

**GitHub Issue**: #227
**Issue Title**: Refine README and VISION.md positioning: French learning app and AI-assisted development testbed
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/227
**Artifact ID**: FLC-050-202611131654
**Created**: 2026-11-13 16:54
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-050-202611131644-[Analysis]-issue-227-readme-vision-positioning.md`

---

## Context

### Current Codebase State
- `README.md:3` leads with "A comprehensive French language learning platform developed with Mistral Vibe and Claude Code and powered by the Mistral API…", which oversells the app and omits vocabulary flashcards.
- The README body already names both coding agents (`README.md:464`, `README.md:478-484`) but the opening says nothing about the repo's testbed role.
- `README.md:668` (Jest Coverage Note) frames the `collectCoverageFrom` exclusions in `frontend/jest.config.cjs:46-72` as a TypeScript workaround. #184 is closed and no open issue tracks the exclusions.
- `VISION.md` is stale: header "Built with Mistral Vibe" (`:3`), "Last updated: May 2026" (`:4`), "comprehensive…platform" pitch (`:10`), solution (`:22`), Why Mistral (`:35`), "built entirely using Mistral Vibe" (`:42`), Current State lists only conversation practice and 3 endpoints (`:57-79`), Roadmap marks Phase 2 "(Next)" (`:163`) and Phase 3 has no status (`:169`).
- The app's LLM backend today is Mistral only (`services/mistral.py`). #228 (open) adds a provider layer with per-feature Mistral/Claude choice. The milestone "Model evaluation (Claude vs Mistral)" (#228–#232) holds the planned evals.
- CI test workflows are path-filtered on code directories (`models/**`, `routers/**`, `services/**`, `tests/**`, `frontend/**`, etc.); `README.md`, `VISION.md` and `spdd/**` trigger none. `status-gateway.yml` is the single required check.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `README.md` | Canonical project description | `:3` opening; `:464` agent wording; `:535-545` SPDD Artifacts per-issue list; `:668` Jest Coverage Note; `:690` linked-issue style (Issue #190) |
| `VISION.md` | Vision, current state, roadmap | `:3-4` header; `:10` pitch; `:22` solution; `:35`, `:42` Why Mistral; `:57-79` Current State; `:160-173` Roadmap |
| `frontend/jest.config.cjs` | Jest coverage scope (read-only here) | `:43-72` `collectCoverageFrom` |
| `routers/grammar.py` | Grammar endpoints (prefix `/grammar`) | lessons, lesson detail, reference, exercises, exercise detail, recommendations |
| `routers/grammar_progress.py` | Lesson progress (prefix `/grammar/progress`) | POST, GET |
| `routers/vocabulary.py` | Vocabulary (prefix `/vocabulary`) | decks list/detail/create, deck cards list/add, `POST /review/`, `GET /due/` |
| `routers/card_review.py` | Card review with SM-2 (prefix `/card-review`) | `calculate_sm2_for_rating()` `:24` |
| `routers/sessions.py` | Sessions (prefix `/sessions`) | create, list, get, delete, lock, unlock |

### Existing Patterns
- README linked-issue style: `see [Issue #190](https://github.com/beelandc/french-language-coach/issues/190)`.
- README SPDD per-issue entries: `**Issue #225 - Claude Code Configuration**:` followed by `- Analysis: \`…\`` and `- Prompt: \`…\``.
- VISION.md Current State subsections: `### ✅ <Name> (<status>)`, a one-line intro, bold-label bullets, then `**Backend API (…):**` endpoint bullets.
- VISION.md Roadmap: `### Phase N — Name (status)` with an italic summary line.

---

## Goal

**Primary Objective**: Rewrite the README opening and update VISION.md so the repo describes itself modestly and accurately as a French learning app first, and as an AI-assisted development and model-selection testbed second.

**Secondary Objectives**:
- Open a GitHub tracking issue for the Jest coverage exclusions and link it from a reworded README note.
- Remove internal contradictions in VISION.md (agents, "comprehensive platform", stale roadmap status).
- Bring VISION.md "Current State" in line with shipped Phase 1.5, Phase 2 and Phase 3 work.
- Add the #227 SPDD artifacts to the README's per-issue artifact list.

---

## Constraints

### Architecture Constraints
- Docs only: change `README.md`, `VISION.md` and the two SPDD artifacts. No code, tests, config, CI, `frontend/jest.config.cjs`, `.vibe/instructions.md`, `CLAUDE.md` or `SPDD.md` changes.
- Do not claim Claude already runs in the app: Mistral is the default today; Claude support is in progress (#228).
- Do not claim eval results: evals are planned.
- Current State lists only work from closed issues that exists in the code. Open Phase 3 items (#53/#63 extraction, #57, #61 scheduler, #65, #71 CardEditor/ProgressDashboard) are not claimed.

### Code Quality Constraints
- Match existing Markdown style (heading levels, bold labels, VISION.md emoji headings).
- Plain wording: no "comprehensive", "platform", "immersive", "mastery" in the README opening or VISION.md pitch. (Feature names that already exist as section titles elsewhere, such as "Grammar Mastery" in Future Enhancements, are left alone.)
- Keep edits limited to the lines listed in Deliverables. No broader rewrites.

### Testing Constraints
- No automated tests apply (no code). Verification is manual: grep checks, sentence count, link checks, `git diff --stat` shows docs only, and the PR's status-gateway passes with no test workflows triggered.
- 80% coverage requirement unaffected.

### Acceptance Criteria
- [ ] The README opening describes the app as a French learning app without "comprehensive" or similar overstatement, and French learning is still its primary stated purpose
- [ ] The README opening has an added paragraph (3 to 4 sentences) on the testbed role: both coding agents, SPDD and CI as guardrails, and planned (not claimed) model evals
- [ ] "Comprehensive French language learning platform" no longer leads the README or VISION.md
- [ ] The Jest coverage exclusion is described as a known item with a linked tracking issue, not as a TypeScript workaround
- [ ] The VISION.md header reflects both coding agents, and "Current State" reflects the Phase 2 and 3 work that has shipped

---

## Examples

### Input/Output Examples
1. **README opening, paragraph 1**
   - Input: `A comprehensive French language learning platform developed with Mistral Vibe and Claude Code and powered by the Mistral API, combining immersive AI conversation practice with …`
   - Expected Output (shape): "French Language Coach is an app for practising French. It offers AI conversation practice (scenario role-play with end-of-session feedback), grammar lessons, a searchable grammar reference, interactive exercises, and spaced-repetition vocabulary flashcards. Its LLM features run on the Mistral API or Anthropic's Claude API, chosen per feature: Mistral is the default today, and Claude support is being added in #228."

2. **README opening, paragraph 2 (4 sentences)**
   - Expected Output (shape): (1) The repo also doubles as a testbed for AI-assisted development and model selection. (2) It is built with two coding agents, Mistral Vibe and Claude Code, working from the same instructions. (3) Every AI-generated change goes through SPDD (an analysis artifact, then a prompt artifact, then code) and CI (a single status-gateway check, 80% test coverage). (4) Next up is a planned comparison of Mistral and Claude on the app's own feedback workload, measuring accuracy, cost and latency, in the Model evaluation milestone; there are no results yet.

3. **Jest Coverage Note**
   - Input: `Due to TypeScript compilation errors in some source files, Jest coverage collection currently excludes … can be reduced as TypeScript errors are fixed.`
   - Expected Output (shape): "Jest coverage is collected from a limited set of files. `frontend/jest.config.cjs` excludes pages, hooks, utils, types, styles, mocks, `components/ExerciseTypes/`, several components (…) and entry/setup files (…), so the Jest coverage figure does not cover the whole frontend. This is a known gap, tracked in [Issue #NNN](…) (follow-up to #184)."

4. **VISION.md header**
   - Input: `*Built with Mistral Vibe · Powered by Mistral AI API*` / `*Author: Cecil Beeland · Last updated: May 2026*`
   - Expected Output: `*Built with Mistral Vibe and Claude Code · LLM features on the Mistral API, with Claude API support in progress*` / `*Author: Cecil Beeland · Last updated: November 2026*`

5. **VISION.md pitch**
   - Expected Output (shape): "A French learning app for intermediate learners that pairs AI conversation practice and feedback with grammar lessons and spaced-repetition vocabulary, with cultural content planned, developed with Mistral Vibe and Claude Code as a testbed for AI-assisted development."

### Edge Cases
- `grep -n -i comprehensive README.md VISION.md` may still hit the Phase 4 backlog ("Comprehensive cultural context") and Roadmap Phase 4 line; these describe future scope, not the app, and stay.
- `POST /vocabulary/decks/` exists though #65 is open: list it as an endpoint without claiming custom-deck UI.
- Two review endpoints exist (`POST /vocabulary/review/`, `POST /card-review/`); list both.
- The tracking issue must exist before the README note is written so the link resolves.

### Test Cases
```bash
# Given the edited docs
# When
grep -n -i "comprehensive" README.md VISION.md
# Then only Phase 4 future-scope lines in VISION.md match

sed -n '1,8p' README.md          # French first; paragraph 2 has 3-4 sentences
grep -n "Claude Code" VISION.md | head -3   # header names both agents
gh issue view <tracking#>        # tracking issue exists and is linked from README
git diff --stat main             # only README.md, VISION.md, spdd/** changed
```

---

## Deliverables

### Code Changes
- [ ] None (docs-only issue)

### GitHub
- [ ] New issue: "Track and reduce Jest coverage exclusions in frontend/jest.config.cjs", labels `frontend`, `test`, no milestone, referencing #184 and #227

### Documentation
- [ ] `README.md:3`: two-paragraph opening (app description with both LLM backends stated accurately; 3–4 sentence testbed paragraph)
- [ ] `README.md:668`: reworded Jest Coverage Note linking the tracking issue
- [ ] `README.md` SPDD Artifacts list: add `**Issue #227 - README and VISION Positioning**` entry
- [ ] `VISION.md:3-4`: header (both agents, LLM backends, November 2026)
- [ ] `VISION.md:10`: softened pitch
- [ ] `VISION.md:22`, `:35`: drop "comprehensive … platform"
- [ ] `VISION.md:42`: replace "built entirely using Mistral Vibe" with both agents and testbed role
- [ ] `VISION.md:57-79`: Current State with Phase 1.5 line + endpoint list, new Grammar (Phase 2) and Vocabulary & Spaced Repetition (Phase 3) subsections
- [ ] `VISION.md:163`, `:169`: Roadmap status labels for Phase 2 and Phase 3

---

## Actual Prompt

```
Implement GitHub issue #227 (docs-only) in the french-language-coach repo on branch
docs/issue-227-readme-vision-positioning.

CONTEXT:
- README.md:3 is a one-sentence opening calling the app "a comprehensive French language
  learning platform ... powered by the Mistral API". It omits vocabulary flashcards and says
  nothing about the repo's role as an AI-assisted development testbed.
- README.md:464 and :478-484 already describe both coding agents (Mistral Vibe, Claude Code).
- README.md:668 Jest Coverage Note frames frontend/jest.config.cjs:46-72 exclusions as a
  TypeScript workaround. #184 (closed) narrowed coverage scope; no open issue tracks the
  exclusions.
- VISION.md is stale: header "Built with Mistral Vibe" (:3), "Last updated: May 2026" (:4),
  pitch "comprehensive ... platform ... built using Mistral's own AI coding tool" (:10),
  "comprehensive learning platform" (:22), "For a comprehensive French language platform"
  (:35), "built entirely using Mistral Vibe" (:42), Current State (:57-79) lists only
  conversation practice and 3 endpoints, Roadmap Phase 2 "(Next)" (:163), Phase 3 no status.
- Shipped Phase 1.5: difficulty levels, session list/resume (Quick Access), session detail
  view, session delete, session locking. Session endpoints: POST/GET /sessions/,
  GET/DELETE /sessions/{id}, POST /sessions/{id}/lock, POST /sessions/{id}/unlock,
  POST /sessions/{id}/messages/, POST /sessions/{id}/feedback/.
- Shipped Phase 2 (closed #28-#46 build issues, #220): 21 lessons, 50 reference entries,
  5 exercises across 5 types, lesson progress tracking, grammar recommendations from
  conversation feedback shown in the feedback view. Endpoints: GET /grammar/lessons/,
  GET /grammar/lessons/{id}, GET /grammar/reference/, GET /grammar/exercises/,
  GET /grammar/exercises/{id}, GET /grammar/recommendations/, POST/GET /grammar/progress/.
  Still open: validation/test issues and E2E.
- Shipped Phase 3 (closed #49, #51, #55, #59, #67, #69): vocabulary card schema, 11 themed
  decks / 553 cards auto-seeded on startup, deck browsing, flashcards with flip/swipe,
  review sessions with SM-2 interval/ease updates. Endpoints: GET/POST /vocabulary/decks/,
  GET /vocabulary/decks/{id}, GET/POST /vocabulary/decks/{id}/cards/,
  POST /vocabulary/review/, GET /vocabulary/due/, POST /card-review/.
  Still open: vocabulary extraction from conversations (#53, #63), daily review scheduler
  (#61), custom deck creation issue (#65), CardEditor and ProgressDashboard (#71).
- The app's LLM backend is Mistral today (services/mistral.py). Issue #228 (open) adds a
  per-feature provider choice between Mistral and Claude. Milestone "Model evaluation
  (Claude vs Mistral)" (#228-#232) holds planned evals of accuracy, cost and latency.
- CI test workflows are path-filtered on code dirs; docs changes trigger none.
  status-gateway is the single required check.

GOAL:
Describe the repo modestly and accurately: a French learning app first, an AI-assisted
development and model-selection testbed second. Track the Jest coverage exclusions in a
real issue. Make VISION.md consistent with the README and the shipped code.

CONSTRAINTS:
- Edit only README.md and VISION.md (plus SPDD artifacts). No code/test/config/CI changes;
  do not touch frontend/jest.config.cjs, CLAUDE.md, .vibe/instructions.md or SPDD.md.
- README opening paragraph 1: French learning first. List AI conversation practice
  (scenario role-play with end-of-session feedback), grammar lessons, searchable grammar
  reference, interactive exercises, spaced-repetition vocabulary flashcards. Highlight both
  LLM backends (Mistral API and Anthropic's Claude API, chosen per feature) while stating
  accurately that Mistral is the default today and Claude support is being added in #228
  (link it). No "comprehensive", "platform", "immersive" or "mastery".
- README opening paragraph 2: exactly 3-4 sentences. Cover: testbed for AI-assisted
  development and model selection; both Mistral Vibe and Claude Code; SPDD (analysis, then
  prompt, then code; link SPDD.md) and CI (status-gateway, 80% coverage) as guardrails;
  planned comparison of Mistral and Claude on the app's own workload (accuracy, cost,
  latency), linking the Model evaluation milestone, explicitly with no results yet.
- Jest note: first create the tracking issue with
  gh issue create --label frontend --label test (no milestone), describing the current
  collectCoverageFrom exclusions, why they exist (ts-jest compile errors, CSS imports,
  browser APIs), the goal (bring excluded files under Jest coverage or explicitly hand
  them to Vitest coverage, shrinking the exclusion list), and referencing #184 and #227.
  Then reword README.md:668 to describe the exclusions factually as a known, tracked gap
  linking that issue (and #184 for history). Do not say they "can be reduced as TypeScript
  errors are fixed".
- VISION.md: header names both agents and the LLM backends (Claude support in progress),
  Last updated November 2026; soften pitch (:10) the same way; drop "comprehensive ...
  platform" at :22 and :35; replace :42 with both agents and the testbed role; Current
  State gets a Phase 1.5 line and full session endpoint list under Conversation Practice,
  plus new "Grammar (Phase 2 - Mostly Shipped)" and "Vocabulary & Spaced Repetition
  (Phase 3 - Partly Shipped)" subsections with features, counts, endpoints and a one-line
  "still open" note; Roadmap Phase 2 -> "(Mostly shipped)", Phase 3 -> "(In progress)".
  Leave Future Enhancements, Technical Architecture and Success Criteria otherwise as-is.
- Never claim Claude runs in the app yet, never claim eval results, never claim open
  Phase 3 work.
- Add a "**Issue #227 - README and VISION Positioning**" entry with the analysis and prompt
  paths to the README SPDD Artifacts list, after the #225 entry.
- Match existing Markdown style; keep edits to the lines listed.

EXAMPLES:
- Paragraph 1 shape: "French Language Coach is an app for practising French. It offers AI
  conversation practice (scenario role-play with end-of-session feedback), grammar lessons,
  a searchable grammar reference, interactive exercises, and spaced-repetition vocabulary
  flashcards. Its LLM features run on the Mistral API or Anthropic's Claude API, chosen per
  feature: Mistral is the default today, and Claude support is being added in #228."
- Paragraph 2 shape: testbed -> two agents -> SPDD + CI guardrails -> planned evals, no
  results yet.
- VISION header: "*Built with Mistral Vibe and Claude Code · LLM features on the Mistral
  API, with Claude API support in progress*"
- grep -n -i comprehensive README.md VISION.md returns only VISION.md Phase 4 future-scope
  lines.

ACCEPTANCE CRITERIA:
- [ ] README opening describes a French learning app without "comprehensive" or similar
      overstatement; French learning is still its primary stated purpose
- [ ] README opening has an added 3-4 sentence testbed paragraph: both coding agents, SPDD
      and CI as guardrails, planned (not claimed) model evals
- [ ] "Comprehensive French language learning platform" no longer leads README or VISION.md
- [ ] Jest coverage exclusion described as a known item with a linked tracking issue, not
      as a TypeScript workaround
- [ ] VISION.md header reflects both coding agents; Current State reflects shipped Phase 2
      and Phase 3 work

DELIVERABLES:
- New GitHub tracking issue (labels frontend, test)
- README.md: two-paragraph opening, reworded Jest Coverage Note, #227 SPDD artifact entry
- VISION.md: header, pitch, :22, :35, :42, Current State, Roadmap status labels
- Verification: grep checks, sentence count, gh issue view of the tracking issue,
  git diff --stat showing docs only
- Commit "docs(#227): refine README and VISION.md positioning"; push; gh pr create with
  Closes #227, change summary, AC checklist, verification results, SPDD artifact paths
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above:

- **Tracking issue**: opened [#233](https://github.com/beelandc/french-language-coach/issues/233) "Track and reduce Jest coverage exclusions in frontend/jest.config.cjs" (labels `frontend`, `test`, no milestone). It lists the current exclusions and reasons, with ACs for shrinking the list or handing files to Vitest coverage. References #184 and #227.
- **README.md**:
  - The opening is now two paragraphs. Paragraph 1 is a French learning app description with all five features, and says the LLM features run on Mistral or Claude per feature, with Mistral the default today and Claude support in progress (#228). Paragraph 2 is 4 sentences: testbed, both agents, SPDD + CI guardrails, planned evals with no results yet (links SPDD.md and milestone 6).
  - The Jest Coverage Note now lists the exclusions factually and links #233 and #184.
  - Added an "Issue #227" entry to the SPDD Artifacts list.
- **VISION.md**:
  - Header names both agents and both LLM backends; Last updated is November 2026.
  - Softened the pitch.
  - Removed "comprehensive … platform" from The Solution and Why Mistral.
  - Rewrote the "built entirely using Mistral Vibe" line as both agents plus the testbed/eval role.
  - Current State: added a Phase 1.5 line and the full session endpoint list, plus new "Grammar (Phase 2 - Mostly Shipped)" and "Vocabulary & Spaced Repetition (Phase 3 - Partly Shipped)" subsections with features, counts, endpoints and "still open" notes.
  - Roadmap: Phase 2 is now "(Mostly shipped)" and Phase 3 "(In progress)".

---

## Human Review Notes

### Changes Made
- [x] **Before the prompt (user review of the analysis)**: the README opening highlights both Mistral and Claude APIs instead of "powered by the Mistral API". Worded as "designed to run on either … Mistral is the default today, and Claude support is being added in #228", so it doesn't claim Claude has shipped.
- [x] **Before the prompt (user decisions)**: fix VISION.md contradictions (`:22`, `:35`, `:42`, Roadmap labels); add Phase 1.5 to Current State; tracking issue labeled `frontend`, `test`.
- [x] **During implementation**: removed "per-topic difficulty progression" from the Phase 2 "still open" note. Every lesson JSON already has a `difficulty` field, so calling it unshipped would be misleading.
- [x] **During implementation**: The Solution intro now says "four pillars, the first three of which have shipped in some form", which is more accurate than the original "four integrated pillars".

### Quality Checks
- [x] Docs follow existing Markdown patterns (VISION.md emoji subsections, README linked-issue style, SPDD per-issue list)
- [x] Tests: N/A (no code changed; no test workflow is triggered by these paths)
- [x] Documentation updated
- [x] All acceptance criteria met (see Verification)

### Issues Found
- The README Features list and other README sections still use "Phase 2"/"Phase 3" labels and some older wording. That's out of scope for #227 and left unchanged.
- "Grammar Mastery" remains as a Future Enhancements and Roadmap section title. It's the phase's name, not a claim about the app, so it's left as is.

---

## Verification

- [x] **AC1**: `sed -n 1,6p README.md`: paragraph 1 opens with "French Language Coach is an app for practising French" and lists conversation practice, grammar lessons, reference, exercises and SRS flashcards. A grep for comprehensive/platform/immersive/mastery in the opening returns nothing.
- [x] **AC2**: paragraph 2 has 4 sentences: testbed; Mistral Vibe + Claude Code; SPDD + CI (`status-gateway`, 80% coverage); planned Mistral-vs-Claude evals (accuracy, cost, latency), "there are no results yet".
- [x] **AC3**: `grep -n -i comprehensive README.md VISION.md` hits only `VISION.md:150` and `:218`, both Phase 4 future-scope lines.
- [x] **AC4**: the Jest Coverage Note describes the exclusions as "a known gap, tracked in Issue #233"; `gh issue view 233` shows it OPEN with labels `frontend,test`. The TypeScript-workaround wording is gone.
- [x] **AC5**: the VISION.md header reads "Built with Mistral Vibe and Claude Code · LLM features on the Mistral API, with Claude API support in progress". Current State has Phase 2 and Phase 3 subsections; endpoints were checked against `routers/*.py` prefixes and decorators, and counts against `data/` (21 lessons, 50 reference entries, 5 exercises, 11 decks, 553 cards).
- [x] **AC6 (implicit)**: `git status` shows only `README.md`, `VISION.md` and the two SPDD artifacts. None of the CI test-workflow path filters match these paths. status-gateway will be confirmed on the PR.
- [x] No breaking changes (docs only)
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
