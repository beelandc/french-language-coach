# SPDD Analysis: Refine README and VISION.md Positioning

**GitHub Issue**: #227
**Issue Title**: Refine README and VISION.md positioning: French learning app and AI-assisted development testbed
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/227
**Artifact ID**: FLC-050-202611131644
**Created**: 2026-11-13 16:44
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Refresh how the repo describes itself. French language learning stays the app's main purpose, but the current wording oversells it ("comprehensive French language learning platform"). The repo is also a working testbed for AI-assisted development and model selection, and the README should say so.
>
> This is a docs-only change to `README.md` and `VISION.md`.
>
> ## Scope
>
> ### 1. README opening: tone down the platform claims
> - Remove "comprehensive" and similar overstatements from the opening description.
> - Describe the app modestly and accurately: a French learning app with AI conversation practice (scenario role-play with end-of-session feedback), grammar lessons, a searchable reference, interactive exercises, and spaced-repetition vocabulary flashcards.
> - French learning stays the **first** thing a reader learns about the repo.
>
> ### 2. README opening: add a testbed paragraph
> Add a second paragraph to the opening (3 to 4 sentences) that covers:
> - the repo doubles as a testbed for AI-assisted development and model selection
> - both coding agents are used (Mistral Vibe and Claude Code)
> - SPDD (analysis, then prompt, then code) and CI (status-gateway, 80% coverage) are the guardrails on AI-generated changes
> - where the evals are headed: comparing Mistral and Claude on this app's own workload (accuracy, cost, latency). Describe this as **planned**; don't claim results.
>
> ### 3. Jest coverage note
> Reword the README's "Jest Coverage Note" so the exclusions in `frontend/jest.config.cjs` read as a known, tracked item with a linked issue, not as a TypeScript workaround. #184 (closed) only narrowed the coverage scope and the exclusions are still there, so link a follow-up tracking issue (open one if none exists).
>
> ### 4. VISION.md header and Current State
> - Update the header line (it still says "Built with Mistral Vibe") to reflect both coding agents.
> - Apply the same softer positioning to "The One-Sentence Pitch".
> - Update "Current State" to reflect the Phase 2 (grammar) and Phase 3 (vocabulary/SRS) work that has shipped.
>
> ## Acceptance criteria
> - [ ] The README opening describes the app as a French learning app without "comprehensive" or similar overstatement, and French learning is still its primary stated purpose
> - [ ] The README opening has an added paragraph (3 to 4 sentences) on the testbed role: both coding agents, SPDD and CI as guardrails, and planned (not claimed) model evals
> - [ ] "Comprehensive French language learning platform" no longer leads the README or VISION.md
> - [ ] The Jest coverage exclusion is described as a known item with a linked tracking issue, not as a TypeScript workaround
> - [ ] The VISION.md header reflects both coding agents, and "Current State" reflects the Phase 2 and 3 work that has shipped
>
> ## Notes
> - No code changes. CI's status-gateway should pass with no test workflows triggered.
> - No dependencies on other issues.

---

## Background

The README and VISION.md were written early in Phase 1, when the project was built only with Mistral Vibe and the roadmap was mostly aspirational. Since then:

- Phase 2 (grammar) and part of Phase 3 (vocabulary/SRS) have shipped, but VISION.md's "Current State" still lists only conversation practice and three session endpoints (`VISION.md:57-79`), and its roadmap still marks Phase 2 as "Next" (`VISION.md:166`).
- Claude Code was added as a second coding agent (#225, merged in PR #226). The README body already says so (`README.md:464`, `README.md:478-484`), but VISION.md's header still reads "Built with Mistral Vibe" (`VISION.md:3`) and its "Why Mistral" section says the project is "built entirely using Mistral Vibe" (`VISION.md:42`).
- A new milestone, "Model evaluation (Claude vs Mistral)", holds #228–#232 (provider layer, schema-validated feedback, labeled dataset, eval harness, published results). The repo is now an AI-assisted development and model-selection testbed as well as a French app, and the README opening doesn't say so.
- The README's lead sentence (`README.md:3`) calls the app "a comprehensive French language learning platform". That oversells a single-user app with 21 lessons, 50 reference entries, 5 exercises and 11 decks.
- The README's Jest Coverage Note (`README.md:668`) presents the `collectCoverageFrom` exclusions in `frontend/jest.config.cjs:46-72` as a temporary TypeScript workaround. #184 is closed and only narrowed coverage scope. No open issue tracks removing the exclusions (searched open issues for "coverage exclusion", "jest.config", "jest coverage": only #16, unrelated).

## Business Value

- **Accurate first impression**: readers (reviewers, potential contributors, hiring managers) get a modest, true description of the app instead of marketing copy.
- **Communicates the second purpose**: the testbed role, guardrails and planned evals become visible, which frames the model-eval milestone (#228–#232).
- **Honest tech-debt signalling**: the Jest exclusions become a tracked item rather than an open-ended "will be fixed" note.
- **Doc consistency**: VISION.md stops contradicting the README and the codebase about agents and shipped features.

---

## Scope In

- [ ] Rewrite the README opening paragraph (`README.md:3`): French learning app first; list conversation practice (scenario role-play with end-of-session feedback), grammar lessons, searchable reference, interactive exercises, spaced-repetition vocabulary flashcards; describe the LLM backend as **both** the Mistral API and Anthropic's Claude API (per-feature choice), stating accurately that Mistral is the default today and Claude support is being added in #228; no "comprehensive" or similar.
- [ ] Add a second README opening paragraph (3–4 sentences): testbed for AI-assisted development and model selection; Mistral Vibe and Claude Code; SPDD (analysis → prompt → code) and CI (status-gateway, 80% coverage) as guardrails; planned Mistral-vs-Claude evals on accuracy, cost, latency (planned, no results claimed).
- [ ] Open a GitHub tracking issue for reducing/removing the Jest `collectCoverageFrom` exclusions (none exists), and reword the README Jest Coverage Note (`README.md:668`) to link it.
- [ ] VISION.md header (`VISION.md:3-4`): reflect both coding agents; bump "Last updated" to November 2026.
- [ ] VISION.md "The One-Sentence Pitch" (`VISION.md:10`): same softer positioning, drop "comprehensive" and the "built using Mistral's own AI coding tool" claim.
- [ ] VISION.md "Current State" (`VISION.md:57-79`): add shipped Phase 2 (grammar) and Phase 3 (vocabulary/SRS) work; update the stale "Backend API (3 endpoints)" list.
- [ ] Consistency fixes that would otherwise contradict the changes above (see Key Design Decisions): "The Solution" (`VISION.md:22`), "Why Mistral" (`VISION.md:35`, `VISION.md:42`), and Roadmap phase status labels (`VISION.md:166`, `VISION.md:172`).

## Scope Out

- [ ] Any code, test, config or CI change (including `frontend/jest.config.cjs` itself; removing exclusions is the follow-up issue's job).
- [ ] Rewriting the rest of README.md (Features, Usage, API Endpoints, etc.) or VISION.md's Future Enhancements, Technical Architecture and Success Criteria beyond the consistency fixes listed.
- [ ] Implementing or describing results of model evals (#228–#232). Evals are mentioned as planned only.
- [ ] Changing `.vibe/instructions.md`, `CLAUDE.md` or `SPDD.md`.
- [ ] Moving Phase 2/3 backlog items out of "Future Enhancements": they still contain unshipped items (contextual practice, vocabulary extraction, custom deck UI, multi-format practice, progress tracking).

---

## Acceptance Criteria (ACs)

1. **AC1**: README opening is a modest French learning app description
   **Given** a reader opens README.md
   **When** they read the first paragraph
   **Then** it describes a French learning app (conversation practice with end-of-session feedback, grammar lessons, searchable reference, interactive exercises, SRS vocabulary flashcards), French learning is the first and primary purpose, and "comprehensive" or similar overstatement ("platform", "immersive", "mastery") is absent.

2. **AC2**: README opening has a 3–4 sentence testbed paragraph
   **Given** the README opening
   **When** the reader reaches the second paragraph
   **Then** it has 3–4 sentences covering: testbed for AI-assisted development and model selection; both Mistral Vibe and Claude Code; SPDD and CI (status-gateway, 80% coverage) as guardrails; Mistral-vs-Claude evals on accuracy, cost, latency described as planned with no results claimed.

3. **AC3**: "Comprehensive French language learning platform" no longer leads either doc
   **Given** README.md and VISION.md
   **When** `grep -n -i "comprehensive" README.md VISION.md` runs
   **Then** neither the README opening nor the VISION.md header/pitch contains it (the only remaining hit may be the Phase 4 "Comprehensive cultural context" backlog line, which describes future scope, not the app).

4. **AC4**: Jest coverage exclusion is a known, tracked item
   **Given** the README "Running Tests → Jest" section
   **When** the reader reads the coverage note
   **Then** it describes the exclusions in `frontend/jest.config.cjs` as a known, tracked limitation linking the new tracking issue, and does not frame them as a TypeScript-error workaround that "can be reduced as errors are fixed".

5. **AC5**: VISION.md header and Current State are up to date
   **Given** VISION.md
   **When** the reader reads the header and "Current State (Implemented)"
   **Then** the header names both Mistral Vibe and Claude Code (and still says powered by the Mistral API), and Current State lists the shipped Phase 2 grammar features and shipped Phase 3 vocabulary/SRS features with their endpoints.

6. **AC6 (implicit, from issue Notes)**: docs-only
   **Given** the PR diff
   **When** CI runs
   **Then** only `README.md`, `VISION.md` and SPDD artifacts change, no path-filtered test workflow triggers, and status-gateway passes.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **README opening**: `README.md:1-3`. Single sentence, leads with "A comprehensive French language learning platform", omits vocabulary flashcards.
- **README Why Mistral / Development sections**: `README.md:460-484`. Already describe both agents; the new opening paragraph must agree with them.
- **README Jest Coverage Note**: `README.md:668`.
- **Jest coverage config**: `frontend/jest.config.cjs:43-72`. `collectCoverageFrom` excludes `styles`, `mocks`, `hooks`, `pages`, `components/ExerciseTypes`, `types`, `utils`, plus `main.tsx`, `App.tsx`, `setupTests.ts`, `testSetup.ts`, `Exercise.tsx`, `QuickAccessSession.tsx`, `SessionHistoryItem.tsx`, `LessonViewer.tsx`, `SessionDetail.tsx`, `utils/storybookMocks.tsx`. The README note currently omits the individual component files.
- **CI guardrails**: `.github/workflows/status-gateway.yml` (the single required check, README `README.md:688-700`); path-filtered pytest/vitest/jest/cypress workflows.
- **SPDD**: `SPDD.md`, `spdd/`; README `README.md:486-550`.
- **VISION.md**: header `:1-4`, pitch `:8-10`, solution `:20-29`, Why Mistral `:33-42`, Current State `:57-79`, Future Enhancements `:83-126`, Roadmap `:160-189`.
- **Shipped Phase 2 (grammar)**, from closed issues #28, #30, #32, #34, #36, #38, #40, #42, #44, #46 and PR #224 (#220):
  - 21 lessons in `data/grammar_lessons/` (excluding `example_lesson.json`), 50 reference entries in `data/grammar/reference/`, 5 exercises in `data/grammar/exercises/` (5 exercise types)
  - `routers/grammar.py`: `GET /grammar/lessons/`, `GET /grammar/lessons/{id}`, `GET /grammar/reference/`, `GET /grammar/exercises/`, `GET /grammar/exercises/{id}`, `GET /grammar/recommendations/`
  - `routers/grammar_progress.py`: lesson progress tracking (POST/GET)
  - Frontend: `LessonPage`, `LessonDetailPage`, `ReferencePage`, `ExerciseBrowserPage`, `ExercisePage`; `RecommendedLessons` component in the feedback view
- **Shipped Phase 3 (vocabulary/SRS)**, from closed issues #49, #51, #55, #59, #67, #69:
  - 11 themed decks (`data/deck_definitions.json`), 553 cards (`data/vocabulary_cards/`), auto-seeded on startup (`main.py`)
  - `routers/vocabulary.py`: decks list/detail/create, deck cards list/add, `POST /vocabulary/review/`, `GET /vocabulary/due/`
  - `routers/card_review.py`: card review endpoint with SM-2 interval/ease updates (`calculate_sm2_for_rating`, `routers/card_review.py:24`)
  - Frontend: `VocabularyPage`, `DeckDetailPage`, `DeckCardsPage`, `DeckBrowser`, `Flashcard`, `ReviewSession`
- **Still open in Phase 3** (must not be claimed): #53/#63 vocabulary extraction from conversations, #57 standalone SM-2 module issue, #61 daily review scheduler, #65 custom deck creation endpoint (note: a `POST /vocabulary/decks/` route exists, but the issue is open), #71 CardEditor and ProgressDashboard.
- **Model evaluation milestone**: #228–#232 (open).

### New Concepts Required

- **Jest coverage exclusions tracking issue**: new GitHub issue (labels `frontend`, `test`; no milestone, or Phase 1.5) describing the current `collectCoverageFrom` exclusions, why they exist (ts-jest compile errors, CSS imports, browser APIs), and the goal of bringing excluded pages/hooks/utils/components back into Jest coverage or explicitly moving them to Vitest coverage. References #184.

### Key Business Rules

- **French first**: the first sentence a reader sees is about learning French.
- **No claimed eval results**: evals are "planned" until #232 publishes them.
- **Don't claim open work**: Current State lists only work from closed issues that exists in the codebase.
- **README wins over VISION.md** when they conflict; VISION.md must not contradict README after this change.
- **Two LLM backends, stated accurately**: per user review, the README opening highlights both the Mistral API and the Claude API as LLM backends, since #228 adds a per-feature provider choice. Until #228 merges, the wording must say Mistral is the current default and Claude support is in progress (linked to #228), never that Claude already runs in the app.

---

## Strategic Approach

### Solution Direction

1. Open the Jest coverage tracking issue with `gh issue create` (the issue explicitly authorizes this) and note its number.
2. Rewrite `README.md:3` as two paragraphs: (a) modest app description; (b) 3–4 sentence testbed paragraph linking SPDD.md and the model-evaluation milestone/issues.
3. Rewrite `README.md:668` Jest Coverage Note to name the exclusions as a known, tracked limitation with a link to the new issue (and #184 for history).
4. Update VISION.md header, pitch, solution/Why-Mistral consistency lines, Current State (Phase 2 and Phase 3 subsections, endpoint list) and Roadmap status labels.
5. Verify with grep (no "comprehensive" in openings; both agents in VISION header), count sentences in the testbed paragraph, and confirm the diff touches only docs.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| How much of VISION.md to touch beyond header/pitch/Current State | Minimal edit leaves contradictions ("built entirely using Mistral Vibe" at `:42`, "comprehensive learning platform" at `:22`, Phase 2 "(Next)" at `:166`); broader edit risks scope creep | Fix only the lines that would contradict the in-scope changes: `:22`, `:35`, `:42`, and the Phase 2/3 roadmap status labels. Leave Future Enhancements, Architecture and Success Criteria alone. |
| Where to put the eval reference in the README | Linking the milestone gives a single stable pointer; listing issues adds clutter to a 3–4 sentence paragraph | Link the "Model evaluation (Claude vs Mistral)" milestone once. |
| Current State structure | Rewriting the whole section vs adding subsections | Keep the existing Conversation Practice and Technical Foundation subsections; add "Grammar (Phase 2, mostly shipped)" and "Vocabulary & Spaced Repetition (Phase 3, partly shipped)" subsections; replace the 3-endpoint list with a short grouped endpoint summary. Note what is still open in each phase in one line. |
| Phase 1.5 additions (difficulty levels, session history, session locking, delete) | Not named in the issue, but Current State's Conversation Practice section is stale without them | Add one short bullet line for them under Conversation Practice and update its endpoint list, since it is the same "Current State" section. Keep it to a line or two. Flagged below as an ambiguity. |
| Jest note framing | Saying "TypeScript errors" is partly true (config comment cites ts-jest compile errors, CSS imports, browser APIs) | Describe the scope factually ("coverage is collected only from components and files that compile under ts-jest; pages, hooks, utils, types and some components are excluded") and point to the tracking issue for the plan, rather than promising it shrinks "as errors are fixed". |
| Avoiding "platform" | "Platform" is part of the overstatement in the issue's own quote | Use "app" in openings and pitch. |

### Alternatives Considered

- **Put the testbed role in a new "About this repo" section further down** - Rejected because the issue requires it in the opening.
- **Edit `jest.config.cjs` to shrink the exclusions now** - Rejected: code change, out of scope (issue is docs-only), and belongs to the new tracking issue.
- **Reopen #184 instead of opening a new issue** - Rejected: the issue asks for a follow-up issue; #184's ACs were met.
- **Leave VISION.md `:42` ("built entirely using Mistral Vibe")** - Rejected: it directly contradicts the updated header.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Consistency edits outside the three named VISION.md sections | Whether to also fix `VISION.md:22`, `:35`, `:42` and Roadmap status labels | **Resolved (user, 2026-11-13)**: fix all of them with one-line edits. |
| Phase 1.5 features in Current State | Issue only names Phase 2 and 3 | **Resolved (user, 2026-11-13)**: add a brief line for difficulty levels, session history/resume and locking, and update the endpoint list. |
| Tracking issue milestone/labels | Issue doesn't say | **Resolved (user, 2026-11-13)**: labels `frontend`, `test`; no milestone. |
| LLM backend wording in README opening | Original plan kept "powered by the Mistral API" | **Resolved (user, 2026-11-13)**: highlight both Mistral and Claude APIs; say accurately that Claude support is in progress (#228). |
| "Planned" evals wording | How specific to be | Name the three dimensions (accuracy, cost, latency) and "this app's own workload" (feedback generation), and link the milestone; no numbers. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Phase 3 partially shipped (#57, #61, #63, #65, #71 open) | Claiming them would be inaccurate | Current State labels Phase 3 as partly shipped and lists only closed-issue work. |
| `POST /vocabulary/decks/` exists while #65 is open | Endpoint exists but issue is open | List the endpoint (it exists in `routers/vocabulary.py`) without claiming custom-deck UI; avoid citing #65 as done. |
| Phase 4 backlog line "Comprehensive cultural context" | grep for "comprehensive" will still hit | Leave it; it describes future scope, not the app's lead. Note this in verification. |
| Sentence count of testbed paragraph | AC requires 3–4 | Count sentences explicitly during verification. |
| Docs touching `README.md` | Some workflows may path-filter on README | Confirm in the PR that status-gateway passes; workflows are path-filtered on code dirs. |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Stale or wrong content counts in Current State | Docs mislead again | Counts taken from the data directories (21 lessons, 50 reference entries, 5 exercises, 11 decks, 553 cards); re-check before commit. |
| Broken links (milestone, new issue) | Readers hit 404 | Use full GitHub URLs; verify with `gh` after creating the issue. |
| Scope creep into a full README rewrite | Bigger review, more risk | Restrict edits to the lines listed in Scope In. |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Modest README opening, French first | Yes | — |
| AC2 | 3–4 sentence testbed paragraph | Yes | Sentence count verified manually |
| AC3 | "Comprehensive…platform" no longer leads either doc | Yes | Phase 4 backlog "Comprehensive cultural context" remains intentionally |
| AC4 | Jest exclusion as tracked item with link | Yes | Requires creating the tracking issue first |
| AC5 | VISION header both agents; Current State Phase 2 & 3 | Yes | — |
| AC6 | Docs-only, status-gateway passes | Yes | Verified on the PR |

**AC Coverage Summary**: 6 of 6 ACs (5 explicit + 1 implicit) are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- VISION.md must not contradict itself after the header change (`:42`).
- "Last updated" in VISION.md header bumped to November 2026.
- README opening names both LLM backends (Mistral API, Claude API) without claiming Claude support has shipped.
- README "SPDD Artifacts" list (`README.md:535-545`) gains an entry for #227, following the existing per-issue pattern.
- The new tracking issue is referenced from the README note and the PR body.

---

## REASONS Canvas

This section explicitly maps to the REASONS canvas from SPDD methodology.

### Requirements
- README opening: modest French learning app description, French first, no "comprehensive"/"platform" overstatement, includes SRS flashcards.
- README opening: second paragraph, 3–4 sentences, testbed role, both agents, SPDD + CI (status-gateway, 80% coverage) guardrails, planned Mistral-vs-Claude evals (accuracy, cost, latency).
- README Jest Coverage Note: known, tracked item linked to a new tracking issue.
- VISION.md: header lists both agents; pitch softened; Current State reflects shipped Phase 2 and Phase 3 work.
- Docs-only; status-gateway passes.

### Examples
- Opening paragraph shape: "French Language Coach is an app for practising French: AI conversation practice (scenario role-play with end-of-session feedback), grammar lessons, a searchable grammar reference, interactive exercises, and spaced-repetition vocabulary flashcards. Its LLM features can run on either the Mistral API or Anthropic's Claude API, chosen per feature; Mistral is the default today, and Claude support is being added in #228."
- Testbed paragraph shape (4 sentences): testbed for AI-assisted development and model selection → built with Mistral Vibe and Claude Code → guarded by SPDD (analysis, prompt, then code) and CI (status-gateway, 80% coverage) → next step is a planned comparison of Mistral and Claude on the app's own feedback workload (accuracy, cost, latency), with no results yet.
- Jest note shape: "Jest coverage is collected from a limited set of files. `frontend/jest.config.cjs` excludes … This is a known gap, tracked in #NNN (follow-up to #184)."
- VISION header shape: "*Built with Mistral Vibe and Claude Code · LLM features on the Mistral API, with Claude API support in progress*" / "*Author: Cecil Beeland · Last updated: November 2026*".
- Verification: `grep -n -i "comprehensive" README.md VISION.md` returns only the Phase 4 backlog line.

### Architecture
- Docs live at the repo root (`README.md`, `VISION.md`); the README is the canonical description and wins over VISION.md in conflicts.
- CI: path-filtered test workflows + `status-gateway.yml` as the one required check.
- SPDD artifacts in `spdd/analysis/` and `spdd/prompt/`, committed with the change.

### Standards
- Markdown style consistent with existing docs (bold labels, bullet lists, existing heading levels and emoji in VISION.md).
- Plain, non-marketing language; no overstatement.
- 80% coverage: not applicable (no code); no tests are added or changed.
- Commit format `docs(#227): …`; PR links `Closes #227` with AC checklist and artifact paths.

### Omissions
- No code, test, config, CI or `jest.config.cjs` changes.
- No eval implementation or results.
- No broader README/VISION restructuring beyond listed consistency lines.
- No changes to agent instruction files.

### Notes
- README already describes both agents at `README.md:464` and `:478-484`; reuse its wording for consistency.
- Model evaluation milestone: issues #228–#232.
- Content counts: 21 lessons, 50 reference entries, 5 exercises (5 types), 11 decks, 553 cards.
- Shipped Phase 2 issues: #28, #30, #32, #34, #36, #38, #40, #42, #44, #46, #220. Shipped Phase 3 issues: #49, #51, #55, #59, #67, #69.
- Tracking issue must be created before the README note is written so the link is real.

### Solutions
- Follow the README's existing "Why Mistral" agent paragraph (`README.md:464`) for agent naming.
- Follow VISION.md's existing "✅ Conversation Practice (Core - Complete)" subsection format for the new Phase 2/3 subsections.
- Follow the README's existing linked-issue style (e.g. "see [Issue #190](https://github.com/beelandc/french-language-coach/issues/190)") for the Jest tracking link.
