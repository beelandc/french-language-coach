# SPDD Analysis: Post-Session Study-Coach Agent with Tool Use

**GitHub Issue**: #270
**Issue Title**: Post-session study-coach agent with tool use
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/270
**Artifact ID**: FLC-067-202611171022
**Created**: 2026-11-17 10:22
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> After session feedback, a Claude agent builds a short study plan: it looks up lessons and exercises for the errors found and proposes flashcards from the session's vocabulary. Creating cards needs the learner's approval before anything is written.
>
> > **Backlog item** (post-MVP, presentation-round stretch). Scope, design and acceptance criteria will be refined if and when this is selected for implementation.
>
> **Depends on:** #268 (MCP server tools), #269 (feedback rubric skill), #228 (provider layer and `llm_calls`)
>
> ## Acceptance criteria
> - [ ] Uses the SDK tool runner with 3 to 5 tools; one tool returns a structured error that the agent recovers from, in a test
> - [ ] A task budget or iteration cap bounds each run; cost and latency are logged per run through the `llm_calls` table
> - [ ] Proposed cards appear in the UI with Accept and Reject; nothing is written without Accept
> - [ ] A small eval (about 10 sessions) checks that plans cite real lesson IDs and target the labeled errors
>
> ## Notes
> - Per the CLAUDE.md guardrail, Anthropic calls must go through `services/llm/`. The analysis needs to decide how the tool runner fits behind (or extends) the provider layer, and that's an architectural decision needing approval.

**Dependencies:** all three are closed and merged into `main`: #228 (provider layer, `llm_calls`), #268 (MCP server, PR #276, `63f1a5a`), #269 (feedback rubric, PR #280, `822c573`). This branch (`feature/issue-270-study-coach-agent`) is cut from `main` at `822c573`.

**Selection:** the issue is a backlog item whose scope "will be refined if and when this is selected". The user selected it on 2026-11-17 by asking for it to be worked. This analysis does that refinement and lists the decisions that need approval (see *Decisions needing approval* below). Nothing is implemented until they're answered and the prompt artifact exists.

---

## Background

After a role-play session the learner ends the conversation and gets feedback (`POST /sessions/{id}/feedback/`, `routers/feedback.py:23`). The feedback is a `FeedbackResponse` (`schemas/session.py:79`): four scores, strengths, one `focus_area` and a list of `example_corrections` (`original` / `corrected` / `explanation`). It's stored as JSON in `sessions.feedback` (`models/session.py:19`, `feedback_dict` at `:35`).

The feedback view (`frontend/src/components/FeedbackView.tsx`) then shows `RecommendedLessons` for the single `focus_area` (`FeedbackView.tsx:184`). That's a static keyword mapping (`routers/grammar.py` `get_recommendations()`), not a plan: it ignores every correction except the focus area, never points at exercises, and does nothing with the session's vocabulary.

Three pieces built for this issue are now in place:

- **Tools (#268)**: `mcp_server/server.py` exposes five read-only tools (`search_grammar_reference`, `get_lesson`, `list_exercises`, `recommend_lessons_for_focus_area`, `get_due_cards`) with a structured error shape (`mcp_server/results.py:46`, codes `invalid_arguments`, `lesson_not_found`, `page_out_of_range`, `database_unavailable`). The module docstring says their names, arguments and error codes "are a contract that the study-coach agent (#270) will reuse" (`mcp_server/server.py:13`).
- **Rubric (#269)**: `data/feedback_rubric.md` holds the error taxonomy (`## Error taxonomy`, line 13) that the feedback prompt and the eval labels share. `services/llm/rubric.py:7` says the study coach "is expected to reuse `load_feedback_rubric`".
- **Provider layer (#228)**: `services/llm/service.py` routes each feature to a provider and records one `llm_calls` row per provider call (`services/llm/recorder.py:17`). Claude Sonnet 5.5 is the default for chat and feedback (`config.py:32-35`, decision record 001).

The installed SDK (`anthropic` 2.8.0, `requirements.txt:6` pins `>=2.0.0`) has the beta tool runner (`client.beta.messages.tool_runner`, with `max_iterations`), `beta_async_tool`, `ToolError`, and the MCP conversion helper `anthropic.lib.tools.mcp.async_mcp_tool` (checked: it imports with the already-installed `mcp` package, so no new dependency).

---

## Business Value

- Turns feedback into a next step: specific lessons and exercises for the errors the learner actually made, not just the one focus area.
- Puts session vocabulary into the existing spaced-repetition system with one click, under the learner's control.
- First agentic feature in the app: real tool use over the project's own content, bounded and costed, which is the presentation-round demo the backlog item was written for.
- Reuses #268's tools and #269's taxonomy instead of building parallel versions, which validates both designs.
- Adds a second measured LLM feature to the `llm_calls` dashboard (cost and latency per run).

---

## Scope In

- [ ] **Agent runner inside `services/llm/`**: a study-coach module that runs Claude through the SDK's async tool runner (`client.beta.messages.tool_runner`), reached through `LLMService` like chat and feedback. Anthropic only (see decision D1).
- [ ] **New feature id** `study_coach` with settings: `STUDY_COACH_MODEL` (default `claude-sonnet-5-5`), `CLAUDE_STUDY_COACH_EFFORT` (default `medium`), `STUDY_COACH_MAX_ITERATIONS` (default 8), and an on/off flag.
- [ ] **Five tools** (inside the AC's 3 to 5):
  1. `recommend_lessons_for_focus_area` (MCP, #268)
  2. `get_lesson` (MCP, #268): returns `lesson_not_found` with `did_you_mean`, the structured error the recovery test exercises
  3. `list_exercises` (MCP, #268)
  4. `search_grammar_reference` (MCP, #268)
  5. `submit_study_plan` (new, local): the agent's final answer. It validates the plan (lesson IDs exist, exercise IDs exist, card count and field limits) and returns a structured `invalid_plan` error naming the bad items, so the agent fixes them. It writes nothing.
- [ ] MCP tools are reused through an **in-process MCP client** to `mcp_server.create_server()` and `async_mcp_tool`, so the agent sees the exact #268 contract with no duplicated data access (decision D2).
- [ ] **System prompt** for the coach: input is the transcript, the stored feedback, the learner's difficulty level and the rubric's error taxonomy (via `load_feedback_rubric`); output is a short plan (2 to 4 items, each tied to corrections it addresses) plus up to 5 flashcard proposals drawn from the session's vocabulary.
- [ ] **Run bound**: `max_iterations` caps model calls per run. A run that hits the cap without a valid `submit_study_plan` fails cleanly (logged as an error, 502 to the UI with a retry message).
- [ ] **Per-run logging** to `llm_calls` with `feature="study_coach"`: tokens, cost estimate and latency for the run (decision D5 on row granularity).
- [ ] **Persistence of plans and proposals** (decision D3): plan stored per session; proposals stored with status `pending` / `accepted` / `rejected`. Generating a plan never creates cards.
- [ ] **API** under the existing `/sessions` prefix (already proxied in `frontend/vite.config.ts:24`):
  - `POST /sessions/{id}/study-plan/` generates (or returns the existing) plan
  - `GET /sessions/{id}/study-plan/` returns the stored plan, 404 if none
  - `POST /sessions/{id}/study-plan/cards/{proposal_id}/accept` creates the card and marks the proposal accepted
  - `POST /sessions/{id}/study-plan/cards/{proposal_id}/reject` marks it rejected
- [ ] **Card creation on Accept only**, with the same initial SRS values as `create_card` (`routers/vocabulary.py:526`), in a target deck (decision D4). Proposals whose French side already exists as a card are flagged so they aren't proposed twice.
- [ ] **Frontend**: a `StudyPlan` component under the feedback (`FeedbackView.tsx`), with a "Build my study plan" button (decision D6), plan items that link to lessons (`/grammar/lessons/{id}`) and exercises, and proposed cards with Accept and Reject. Typed API functions in `frontend/src/utils/api.ts`, types in `frontend/src/types/index.ts`, a story and tests.
- [ ] **Tests (backend)**: the agent runs through the real SDK tool runner against a scripted fake HTTP transport (no network), including the AC1 recovery test (`get_lesson` returns `lesson_not_found`, the agent retries with a suggested ID, then submits); iteration-cap test; `submit_study_plan` validation; `llm_calls` row(s); endpoints; Accept writes exactly one card, Reject and generation write none. 80%+ coverage for each new module.
- [ ] **Eval (AC4)**: `evals/run_study_plan_eval.py` over about 10 records from `evals/datasets/feedback_v1.jsonl`, scoring (a) every cited lesson ID is real and (b) the plan targets the labeled errors, via a committed category-to-lesson mapping. Results committed under `evals/results/` with a short write-up. Unit tests for the scoring use fixtures, not the API.
- [ ] **Docs**: README section (what the coach does, settings, endpoints, how to run the eval), `.env.example` entries, docstrings.

## Scope Out

- [ ] **Mistral support** for the study coach. The tool runner is an Anthropic SDK feature; Mistral stays available for chat and feedback only.
- [ ] Changing the default provider or model for chat or feedback.
- [ ] **Write tools for the agent.** The agent can't create cards; only the learner's Accept does. `get_due_cards` isn't given to the agent (not needed for the plan; duplicate detection is done server-side).
- [ ] Editing a proposed card before accepting it, bulk "accept all", or undoing an accept. No new card-delete flow.
- [ ] Regenerating a plan for a session that already has one (one plan per session in this issue).
- [ ] Generating plans automatically for old sessions, or for sessions without feedback.
- [ ] New grammar lessons, reference entries or exercises. Only 5 exercises exist (topics `Verbs`, `Sentence Structure`); the plan must cope with "no exercise for this topic", which `list_exercises` already reports with a hint.
- [ ] Streaming the agent's progress to the UI. The request waits for the finished plan with a loading state.
- [ ] Managed Agents, the Claude Agent SDK, or the API's remote `mcp_servers` connector. The agent runs in-process with the Messages API tool runner, as the AC requires.
- [ ] Server-side refusal fallbacks (`fallbacks` beta). The existing provider layer doesn't use them for chat or feedback; adding them is a cross-feature change for its own issue.
- [ ] Adding a `run_id` or iteration-count column to `llm_calls` (see D5).
- [ ] Wiring the live eval into CI. CI runs the eval's unit tests only.
- [ ] Authentication or multi-user ownership of plans (single-user app until Phase 5, `VISION.md`).

---

## Acceptance Criteria (ACs)

1. **AC1: Tool runner with 3 to 5 tools; recovery from a structured tool error, in a test**
   **Given** the study-coach agent configured with its five tools
   **When** a test drives the real SDK tool runner with a scripted model that first calls `get_lesson` with an unknown ID (e.g. `"subjonctif"`)
   **Then** the tool result sent back to the model is marked `is_error: true` and carries the `lesson_not_found` body with `did_you_mean` (e.g. `["subjunctive"]`); the scripted model's next call uses the suggested ID; the run ends with a valid `submit_study_plan`; and the test asserts all of that from the requests the fake transport received. The tool list has exactly 5 tools.

2. **AC2a: Each run is bounded**
   **Given** `STUDY_COACH_MAX_ITERATIONS = N`
   **When** the model keeps calling tools without submitting a valid plan
   **Then** the runner stops after N model calls, the run fails with an `iteration_cap` error, no plan or proposals are stored, and the endpoint returns 502 with a retry message.

3. **AC2b: Cost and latency logged per run through `llm_calls`**
   **Given** a study-plan run (successful or failed)
   **When** it finishes
   **Then** `llm_calls` holds the run's token usage, estimated cost and wall-clock latency under `feature="study_coach"`, `provider="anthropic"`, the configured model and the session's id, with `status="error"` and an error message for failed runs; and the run appears in the existing metrics dashboard and `GET /metrics` filters without code changes there.

4. **AC3: Proposed cards with Accept and Reject; nothing written without Accept**
   **Given** a session with feedback and a generated plan with card proposals
   **When** the learner views the feedback page
   **Then** each proposal shows its French and English sides (and example, when present) with Accept and Reject buttons;
   **And when** they click Accept, exactly one card is created in the target deck with the standard initial SRS values and the proposal shows as added;
   **And when** they click Reject, no card is created and the proposal shows as dismissed;
   **And** generating the plan, viewing it, rejecting, or a failed run never adds a row to `cards` (asserted by tests counting `cards` rows).

5. **AC4: Small eval of plan quality**
   **Given** about 10 labeled records from `evals/datasets/feedback_v1.jsonl`
   **When** `python3 evals/run_study_plan_eval.py` runs against the live API (with the user's approval for the spend)
   **Then** the report gives, per record and overall, (a) the share of cited lesson IDs that exist in `get_lessons()` and (b) the share of labeled grammar error categories whose expected lessons appear in the plan, plus cost and latency per run; results and a short write-up are committed under `evals/results/`; and the scoring code has unit tests that run in CI without the API.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **LLMService** (`services/llm/service.py:111`): routes `chat` / `feedback` to `(provider, model)` via `route()` (`:127`), builds providers lazily (`get_provider()`, `:135`), times calls (`_timed_call()`, `:262`) and records rows (`_record()`, `:235`). The study coach plugs in here.
- **AnthropicProvider** (`services/llm/anthropic_provider.py:46`): holds the `AsyncAnthropic` client (`:68`, injectable for tests), per-feature effort (`DEFAULT_EFFORT`, `:24`), `MAX_TOKENS = 16000` (`:27`) and refusal handling in `_to_result()` (`:113`).
- **LLMProvider ABC** (`services/llm/base.py:183`): `chat()` and `feedback()` only. `FEATURE_CHAT` / `FEATURE_FEEDBACK` constants at `:19-20`; `LLMResult` (`:23`), `LLMProviderError` (`:42`).
- **record_call** (`services/llm/recorder.py:17`): one best-effort `llm_calls` row, committed on the caller's session; cost via `estimate_cost_usd()` (`services/llm/pricing.py`).
- **LLMCall model** (`models/llm_call.py:11`): `feature` is `String(20)`, so `study_coach` fits; no foreign keys, no run id.
- **Metrics** (`services/llm/metrics.py`, `schemas/llm_metrics.py:41`): group by `(feature, provider, model)` with `feature: str`, so a new feature value shows up without schema changes. The frontend dashboard (`frontend/src/components/LLMMetrics/`) needs a check that it doesn't hardcode `chat` / `feedback` labels.
- **Settings** (`config.py`): `CHAT_PROVIDER` / `FEEDBACK_PROVIDER` / models (`:32-35`), `CLAUDE_*_EFFORT` (`:39-40`), `FEEDBACK_RUBRIC*` (`:48-49`), and the key check that walks the configured providers (`:58-62`).
- **MCP server** (`mcp_server/server.py:167` `create_server(session_factory=None)`): the five tools; `FLCMCPServer.call_tool()` (`:131`) turns argument validation failures into `invalid_arguments`. Results via `tool_result` / `tool_error` (`mcp_server/results.py:35`, `:46`), JSON text plus `structured_content`, `is_error=True` on errors.
- **In-process MCP client** in tests: `tests/test_mcp_server.py:45` `InProcessClient` uses `mcp.Client` against `create_server(...)`. The agent can connect the same way.
- **Rubric loader** (`services/llm/rubric.py`): `load_feedback_rubric` (cached, reads `settings.FEEDBACK_RUBRIC_FILE`); the taxonomy section is what the coach needs.
- **Feedback flow** (`routers/feedback.py:23`): requires ≥2 messages, sets `ended_at`, stores `feedback_dict`. Plans need `feedback` to be present.
- **Session** (`models/session.py:12`): `messages_list`, `feedback_dict`, `difficulty`, `ended_at`.
- **Card / Deck** (`models/card.py:16`, `models/deck.py:82`): card fields `card_id` (unique per deck), `front` (≤500), `back` (≤500), `example` (≤1000), `tags`, `context`, `difficulty`, SRS fields. `create_card` (`routers/vocabulary.py:526`) shows the initial values: `interval=1`, `ease_factor=2.5`, `next_review_date = today + 1`.
- **Grammar lessons**: 22 lessons (`data/grammar_lessons/`), IDs such as `gender-agreement`, `articles`, `passe-compose`, `subjunctive`, `conditional`, `negation`, `direct-object-pronouns`, `prepositions-conjunctions-adverbs`. Loaded by `get_lessons()` in `routers/grammar.py`.
- **Feedback dataset** (`evals/datasets/feedback_v1.jsonl`, schema `evals/schema.py`): 27 conversations with labeled errors by `ErrorCategory` (`evals/schema.py:38`). Category counts: tense_mood 16, agreement 13, preposition 8, anglicism 6, gender 5, pronoun 5, article 5, contraction 4, conjugation 3, word_order 2, auxiliary 2, lexical 1, register 1.
- **Eval harness pieces** (`evals/run_feedback_eval.py`, `evals/report.py`, `evals/README.md`, `evals/METHODOLOGY.md`): patterns for CLI flags, cost estimates, committed JSON + Markdown results.
- **Feedback UI** (`frontend/src/components/FeedbackView.tsx`, `RecommendedLessons.tsx`), API client `frontend/src/utils/api.ts`, types `frontend/src/types/index.ts`.

### New Concepts Required

- **`FEATURE_STUDY_COACH = "study_coach"`**: third feature id, in `services/llm/base.py`.
- **Study-coach runner** (`services/llm/study_coach.py`): builds the system prompt and initial user message, opens the in-process MCP client, builds the five tools, runs the tool runner with `max_iterations`, sums usage across iterations, captures the submitted plan, and raises a typed error on cap / refusal / no plan.
- **`StudyPlanDraft`** (Pydantic, `schemas/study_plan.py`): what `submit_study_plan` accepts: `summary`, `items[]` (`lesson_id`, optional `exercise_ids[]`, `addresses[]` (the corrections it targets), `why`), `cards[]` (`front`, `back`, optional `example`, `source` (the transcript phrase)). Field limits mirror the `cards` columns.
- **`submit_study_plan` tool**: local `beta_async_tool` that validates a `StudyPlanDraft` against real lesson and exercise IDs and returns `invalid_plan` (same `{"error": {code, message, hint, details}}` shape as #268) or an acknowledgement.
- **Persisted plan and proposals** (pending D3): a `study_plans` table (one row per session: plan JSON, model, created_at) and a `card_proposals` table (`study_plan_id`, `front`, `back`, `example`, `status`, `card_id` once accepted).
- **Study-plan router** (`routers/study_plan.py`) and response schemas.
- **Category-to-lesson map** (`evals/study_plan_targets.json`): for each grammar `ErrorCategory`, the lesson IDs that count as targeting it.
- **Frontend `StudyPlan` component** with `StudyPlanItem` and `CardProposal` pieces.

### Key Business Rules

- **No write without Accept**: card rows are created only by the accept endpoint, one per proposal, once. Accepting an already-accepted proposal returns the existing card (idempotent); accepting a rejected one returns 409.
- **Plans need feedback**: `POST /study-plan/` returns 400 when the session has no feedback, 404 for an unknown session.
- **One plan per session**: a second `POST` returns the stored plan without a new LLM call.
- **Cited IDs are real**: a plan is only stored after `submit_study_plan` validated every lesson and exercise ID.
- **Bounded runs**: at most `STUDY_COACH_MAX_ITERATIONS` model calls per run; at most 5 card proposals and 2 to 4 plan items.
- **Every run is logged**, success or failure, under `feature="study_coach"`.
- **Learner-facing text in French**, like the feedback (`why`, `summary`); card `back` is English, matching existing decks.
- **Agent tools are read-only** apart from `submit_study_plan`, which only validates and captures in memory.

---

## Strategic Approach

### Solution Direction

1. **Settings and feature id**: add `study_coach` settings to `config.py` (model, effort, iteration cap, enable flag); validate that the study coach needs `ANTHROPIC_API_KEY` only when enabled.
2. **Runner in `services/llm/study_coach.py`**: `AnthropicProvider` gains a method that runs a tool-runner loop on its own client (`run_tools(...)`, returning a provider-neutral `AgentRunResult` with summed usage, iteration count and stop reason), so the client and effort handling stay in one place. The study-coach module owns the prompt, tools and plan capture, and calls that method. `LLMService.get_study_plan(session, db)` routes, times and records, like `get_feedback`.
3. **Tools**: connect an in-process `mcp.Client` to `create_server()` for the run, convert the four content tools with `async_mcp_tool`, add `submit_study_plan`. Confirm that the MCP `is_error` flag reaches the `tool_result` block (if `async_mcp_tool` doesn't carry it, wrap the call and raise `ToolError` with the same JSON body, which the runner sends as `is_error: true`).
4. **Persistence and endpoints**: new tables (created by `Base.metadata.create_all` at startup, `main.py:76`), new router registered in `main.py`, accept/reject logic reusing the card-creation values from `create_card`.
5. **Frontend**: `StudyPlan` component under `FeedbackView`, API client functions, types, story, Jest test (named `*.jest.test.tsx` so it's discovered).
6. **Tests**: a scripted-transport helper in `tests/llm_fakes.py` that serves canned Messages responses to a real `AsyncAnthropic` (so the real tool runner loop and tool execution run), then the recovery, cap, validation, logging, endpoint and no-write tests.
7. **Eval**: pick 10 dataset records covering the grammar categories; build each run's input from the record's messages and a feedback object synthesized from its labels; score lesson-ID validity and category coverage; write JSON + Markdown results; run live once with the user's approval and commit the results.
8. **Docs**: README, `.env.example`, `evals/README.md`.

### Key Design Decisions

| # | Decision | Trade-offs | Recommendation |
|---|----------|------------|----------------|
| D1 | **How the tool runner fits the provider layer** (architectural, needs approval) | (a) Add an abstract agent method to `LLMProvider`: forces Mistral to implement or stub a feature it can't support. (b) Separate module outside `services/llm/` calling the SDK: breaks the CLAUDE.md guardrail. (c) Anthropic-only capability inside `services/llm/`: `AnthropicProvider.run_tools()` plus `services/llm/study_coach.py`, routed by `LLMService.get_study_plan()`; the study coach's provider is fixed to `anthropic`. Keeps every Anthropic call in the layer and logged, without pretending Mistral supports it. | **(c)**. No `STUDY_COACH_PROVIDER` setting; config rejects nothing because there's nothing to choose. Revisit if a second agent-capable provider is ever added. |
| D2 | **How the agent gets its tools** | (a) In-process MCP client + `async_mcp_tool`: exact #268 contract and error shape, no duplication, schemas come from the server; costs an in-memory MCP session per run (milliseconds) and depends on a beta SDK helper. (b) Hand-written `beta_async_tool` wrappers over `routers/grammar.py`: no MCP hop, but a second copy of every schema and error message that can drift from #268. | **(a)**, with the `ToolError` wrapper as the fallback if `is_error` doesn't propagate. |
| D3 | **Persisting plans and proposals** (schema change, needs approval) | (a) Stateless: endpoint returns the plan, the UI holds it, Accept posts the proposal's content. No schema change, but a reload loses the plan and a new run costs money again; the server can't tell an accepted proposal from a forged one. (b) Two new tables `study_plans` + `card_proposals`: survives reloads, clean accept/reject by id, one run per session. New tables are created by `create_all` on existing databases; a new column on `sessions` wouldn't be (no migrations), so tables are safer than columns. | **(b)**. |
| D4 | **Which deck accepted cards go into** | (a) One app-managed deck, e.g. "Mes mots de session", created on the first Accept: zero clicks, but a new deck appears. (b) Deck picker on each card: more UI, more choices. (c) A deck per session: deck list fills up fast. | **(a)**. Created lazily, so no deck exists until the learner accepts something. |
| D5 | **`llm_calls` row granularity** | (a) One row per run with usage summed across iterations and the run's total latency: matches "logged per run", no schema change, dashboard counts runs. Loses per-iteration detail. (b) One row per model call: matches the table's "one row per provider call" docstring, but per-run cost then needs grouping by `session_id` (works since there's one plan per session) and the dashboard's call count no longer equals run count. (c) Add a `run_id` column: schema change on an existing table, which `create_all` won't apply to existing DBs. | **(a)**, with the iteration count and stop reason logged to the application log; the `LLMCall` docstring is updated to say a `study_coach` row is one agent run. |
| D6 | **When the agent runs** | (a) On demand: a "Build my study plan" button under the feedback. Feedback stays fast; cost only when wanted. (b) Automatically after feedback: matches the issue's wording ("After session feedback, a Claude agent builds...") but adds an agent run's latency and cost to every session end. | **(a)**. The plan is still "after feedback", just learner-triggered. |
| D7 | **How the run is bounded** | Iteration cap (`max_iterations`, hard, testable without the API) vs task budget (`output_config.task_budget`, beta, advisory, minimum 20k tokens). The AC allows either. | Iteration cap (default 8), plus `max_tokens` per call. Task budget out of scope. |
| D8 | **How the final plan comes back** | (a) A `submit_study_plan` tool whose validator returns `invalid_plan` errors: guarantees real IDs before storage, gives a second recoverable-error path, costs one extra short model turn after submission. (b) Structured output (`output_config.format`) on the final turn: no extra turn, but invalid IDs are only caught after the run, with no chance to fix them. | **(a)**. It's the fifth tool. |
| D9 | **Eval input and "targets the labeled errors"** | Input: running real feedback first adds cost and noise; synthesizing the feedback from the labels (corrections = labeled errors, focus area = most frequent grammar category) isolates the agent. Scoring: a committed category-to-lesson map is deterministic and cheap; an LLM judge (`evals/judge.py`) is more flexible but costs more and needs its own validation. | Synthesized feedback + deterministic map. Grammar categories only (spelling/register/anglicism/lexical have no lesson; they count toward card proposals, reported but not scored). Pre-registered thresholds: 100% of cited lesson IDs real; ≥80% of labeled grammar categories covered across the set. |

### Alternatives Considered

- **Managed Agents**: Anthropic hosts the loop and sandbox. Rejected: the AC names the SDK tool runner, the tools need local DB and file access, and session runtime billing is extra.
- **Claude Agent SDK**: a full Claude Code harness. Rejected: overkill (filesystem and bash tools), and the AC names the tool runner.
- **Manual `while stop_reason == "tool_use"` loop**: no beta dependency. Rejected: the AC asks for the tool runner, which also gives `max_iterations` for free.
- **API `mcp_servers` connector**: requires a remotely reachable MCP server over HTTP. Rejected: #268's server is stdio and local by design.
- **Giving the agent a `create_card` tool with a confirmation gate**: rejected: proposals plus explicit Accept in the UI is simpler and makes "nothing written without Accept" structurally true.
- **Extending `RecommendedLessons` with more keyword mapping instead of an agent**: cheaper, but doesn't cover exercises or vocabulary and isn't the feature asked for.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Architecture of the tool runner vs provider layer | Issue says it needs approval | D1 (c); approved 2026-11-17 |
| Schema change for plans and proposals | Needs approval per CLAUDE.md | D3 (b); approved 2026-11-17 |
| "After session feedback": automatic or on demand | Wording suggests automatic | D6 (a) on demand; approved 2026-11-17 |
| Target deck for accepted cards | Not stated | D4 (a); approved 2026-11-17 |
| "Logged per run": one row per run or per call | Table is "one row per provider call" | D5 (a); approved 2026-11-17 |
| "Target the labeled errors": how measured | Not defined | D9: deterministic category-to-lesson map, ≥80% coverage threshold, pre-registered |
| Plan language | Not stated | French learner-facing text, like feedback; English card backs |
| How many cards / plan items | "short study plan" | 2 to 4 items, up to 5 cards |
| Live eval spend | Eval needs real API calls | Estimate first (about 10 runs × up to 8 calls on Sonnet 5.5, expected well under $1); run only with the user's go-ahead, as in #231/#232 |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Session has no feedback yet | No errors to plan from | 400 "Generate feedback first" |
| Feedback has zero corrections (clean session) | Nothing to fix | Plan built from focus area and level; cards still proposed from vocabulary; may have one item |
| Agent cites an unknown lesson in `submit_study_plan` | Must never store invented IDs | `invalid_plan` error with `did_you_mean`; agent resubmits; cap still applies |
| No exercise exists for the error's topic | Only 5 exercises | `list_exercises` returns a hint; plan item has no exercise IDs; that's valid |
| Agent hits the iteration cap | Unbounded cost otherwise | Fail run, log error row with summed usage, 502, nothing stored |
| Claude refusal mid-run | `stop_reason == "refusal"` | Same as failure: log, 502, nothing stored |
| Agent ends without calling `submit_study_plan` | No plan captured | Failure `no_plan_submitted`, logged, 502 |
| Proposed card duplicates an existing card's front | Clutters SRS | Flag `already_known` on the proposal; the UI shows it as already in your cards with Accept disabled (the accept endpoint returns 409) |
| Accept clicked twice / concurrent | Double cards | Idempotent: return the existing card; unique per proposal |
| Accept after Reject | Conflicting states | 409 |
| Generated `card_id` collides in the deck | `card_id` unique per deck | Use `session-{session_id}-{proposal_id}` |
| Front/back longer than column limits | DB error | Validated in `StudyPlanDraft` (≤500/≤500/≤1000); agent gets `invalid_plan` |
| Two plan requests in parallel for the same session | Two runs, double cost | Unique `session_id` on `study_plans`; second insert fails and returns the first plan; accepted as a rare double charge |
| Session deleted | Orphan plan | `ON DELETE CASCADE` from `study_plans.session_id`; accepted cards stay (they're the learner's) |
| `ANTHROPIC_API_KEY` missing while study coach enabled | Startup check | Same key check as other features (`config.py:58`) |
| Feedback provider set to Mistral | Study coach still Claude | Allowed; documented |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| `async_mcp_tool` may not map MCP `is_error` to `tool_result.is_error` | AC1 recovery test would see a success-shaped error | Verify early in implementation; fallback wrapper raises `ToolError` with the JSON body |
| Tool runner is beta; API may shift | Breakage on SDK upgrade | Pin behavior with tests against a scripted transport; keep runner use in one function |
| Mocking the tool runner too shallowly | Tests pass but real loop differs | Use a real `AsyncAnthropic` with a fake HTTP transport (canned Messages JSON), not a mocked `tool_runner` |
| Usage summing across iterations | Wrong cost per run | Sum `usage` from every message the runner yields; test with known per-turn numbers |
| Cache-write tokens aren't in `llm_calls` | Cost slightly under-estimated (pre-existing for all features) | Note in README; out of scope |
| `create_all` doesn't alter existing tables | New columns wouldn't appear in existing DBs | Only new tables (D3 b); no column changes |
| Run latency (several model calls) | Slow button | Loading state; effort `medium`; small tool results (MCP `limit`); measure in the eval |
| Prompt injection from transcript content | Learner text steering the agent | Transcript passed as data in the user turn; tools are read-only; worst case is a bad plan, never a write |
| Eval with 10 records is small | Weak evidence | Report as indicative, list limitations, pre-register thresholds (as in #269) |
| Frontend tests not discovered | Coverage claims wrong | Name tests `*.jest.test.tsx`; verify with `npx jest --listTests` |
| Jest coverage excludes some dirs | Component coverage not counted | Keep `StudyPlan` in `components/` (covered); note in PR |
| Per-module backend coverage gate | New modules below 80% fail CI | Tests for each new module; no `ALLOWLIST` additions |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Tool runner, 3 to 5 tools, recovery test | Yes | Depends on `is_error` propagation (fallback ready) |
| AC2a | Iteration cap bounds runs | Yes | `max_iterations` |
| AC2b | Per-run cost and latency in `llm_calls` | Yes | D5 granularity needs approval |
| AC3 | Accept/Reject UI; no write without Accept | Yes | D3, D4 need approval |
| AC4 | ~10-session eval | Yes | Live run needs spend approval |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach, subject to the approvals listed.

**Implicit Requirements Not in ACs**:
- Anthropic calls only through `services/llm/` (CLAUDE.md guardrail).
- 80% per-module coverage for new backend modules and the new component.
- README and `.env.example` updated for the new settings and endpoints.
- No change to chat or feedback defaults.
- Metrics dashboard shows the new feature correctly (check for hardcoded feature labels).
- Decision record? Not needed unless the eval drives a model or default change; the eval write-up lives in `evals/results/`.

---

## Decisions needing approval

### Decisions confirmed by the user (2026-11-17)

| Question | Decision |
|----------|----------|
| D1: tool runner vs provider layer (architectural) | **Approved**: Claude-only, inside the layer. `AnthropicProvider.run_tools()` plus `services/llm/study_coach.py`, routed and logged by `LLMService.get_study_plan()`. No Mistral path |
| D3: persistence (schema change) | **Approved**: two new tables, `study_plans` and `card_proposals`, created by `create_all` |
| D6: when the agent runs | **On demand**: "Build my study plan" button under the feedback |
| D4: target deck | **One app-managed deck** ("Mes mots de session"), created on the first Accept |
| D5: `llm_calls` granularity | **One row per run**: tokens summed across iterations, total latency, no schema change |

### Still open

- **Eval spend**: one live run of about 10 records on Sonnet 5.5 after implementation. A cost estimate will be shown and the run started only after the user says go.

---

## REASONS Canvas

### Requirements
- Tool runner (`client.beta.messages.tool_runner`, async) with exactly 5 tools; a test proves recovery from `get_lesson`'s `lesson_not_found` structured error.
- Each run capped by `max_iterations` (default 8); cost, tokens and latency logged per run in `llm_calls` (`feature="study_coach"`), including failed runs.
- Proposed cards shown with Accept and Reject; cards are written only on Accept.
- Eval over about 10 labeled sessions: cited lesson IDs real (target 100%) and labeled grammar categories covered (target ≥80%).

### Examples
- **Recovery (AC1)**: turn 1 the scripted model calls `get_lesson({"lesson_id": "subjonctif"})` → tool result `is_error: true`, `{"error": {"code": "lesson_not_found", ..., "details": {"did_you_mean": ["subjunctive"]}}}`; turn 2 calls `get_lesson({"lesson_id": "subjunctive"})` → success; turn 3 calls `submit_study_plan` with `lesson_id: "subjunctive"` → acknowledged; turn 4 `end_turn`. Plan stored with one item citing `subjunctive`.
- **Invalid plan**: `submit_study_plan` with `lesson_id: "passe-compose-2"` → `invalid_plan`, `details.items[0].did_you_mean = ["passe-compose"]`; agent resubmits.
- **Cap (AC2a)**: `STUDY_COACH_MAX_ITERATIONS=3`, scripted model calls `list_exercises` every turn → run fails `iteration_cap`; one `llm_calls` row, `status="error"`, tokens = sum of 3 turns; `study_plans` and `cards` unchanged; endpoint 502.
- **Logging (AC2b)**: three turns with usage (1000 in / 200 out), (1500 / 150), (1800 / 300) → one row with `input_tokens=4300`, `output_tokens=650`, cost from `llm_pricing.json` for `claude-sonnet-5-5`, `latency_ms` > 0, `session_id` set.
- **Accept (AC3)**: proposal `{front: "un croissant", back: "a croissant", example: "Je voudrais un croissant."}` → Accept → `cards` +1 in "Mes mots de session", `next_review_date = today + 1`, `interval=1`, `ease_factor=2.5`, proposal `status="accepted"`, `card_id` set. Reject on another proposal → `cards` unchanged, `status="rejected"`.
- **Eval (AC4)**: record `fb-001` (labels: gender, contraction ×2) → expected lessons `gender-agreement` or `articles` for gender, `articles` or `prepositions-conjunctions-adverbs` for contraction; a plan citing `articles` covers both categories → 2/2.

### Architecture
- Routers stay thin; LLM work in `services/llm/`; ORM in `models/`, Pydantic in `schemas/`; FastAPI DI (`Depends(get_db)`); async SQLAlchemy.
- Flow: `routers/study_plan.py` → `llm_service.get_study_plan()` → `services/llm/study_coach.py` → `AnthropicProvider.run_tools()` → tool runner → tools (in-process MCP client → `mcp_server.create_server()` → `routers/grammar.py` helpers; `submit_study_plan` → `get_lessons()` / `get_exercises()`).
- `record_call` writes the run's row; LLM call happens before any other DB change in the request (recorder commits the session).
- New tables created by `Base.metadata.create_all` (`main.py:76`); register the new models in `models/__init__.py`.
- Frontend: component in `frontend/src/components/` with story and Jest test; API in `utils/api.ts`; types in `types/index.ts`.

### Standards
- PEP 8, docstrings for public functions and classes (Google style as in `services/llm/`).
- 80% coverage per backend module (`scripts/check_module_coverage.py`, no new `ALLOWLIST` entries) and for the new component; frontend lint and `tsc -b` clean.
- Tool descriptions and schemas follow the #268 conventions (what it returns, when to use, limits; structured errors with `code` / `message` / `hint`).
- README updated (feature, settings, endpoints, eval); `.env.example` updated; never read or commit `.env`.
- Commits `{type}(#270): ...`; SPDD artifacts committed with the code.

### Omissions
- No Mistral support for the study coach; no change to chat/feedback defaults.
- No agent write tools; no card editing, bulk accept or undo; no plan regeneration.
- No streaming progress; no Managed Agents, Agent SDK or remote MCP connector.
- No refusal-fallback beta; no task budget; no `llm_calls` schema change.
- No new lesson/exercise content; no live eval in CI; no auth.

### Notes
- `mcp_server/server.py:13` and `services/llm/rubric.py:7` already name #270 as the consumer; keep both contracts unchanged.
- The rubric's taxonomy section (`data/feedback_rubric.md:13`) gives the agent the category names that match the dataset labels.
- `tests/test_mcp_server.py:45` shows how to run `create_server()` in-process with `mcp.Client`; pass the test session factory so `create_server` doesn't touch the dev DB.
- `AnthropicProvider` takes an injected `client` (`anthropic_provider.py:58`); for tests, inject a real `AsyncAnthropic` built with a fake HTTP transport.
- Sonnet 5.5 rejects forced `tool_choice` (`any`/`tool`); steer to `submit_study_plan` from the prompt with `tool_choice` auto. Thinking can't be disabled with `{type: "disabled"}`; use effort.
- `/sessions` is already proxied in `frontend/vite.config.ts:24`; no new proxy entry needed.
- Backend partial coverage runs need `--cov-fail-under=0` (`.coveragerc` gate).

### Solutions
- `LLMService.get_feedback()` (`services/llm/service.py:183`): routing, timing, recording pattern to mirror in `get_study_plan()`.
- `AnthropicProvider._to_result()` (`anthropic_provider.py:113`): usage mapping and refusal handling to reuse per iteration.
- `mcp_server/results.py:46` `tool_error`: error shape for `invalid_plan`.
- `routers/vocabulary.py:526` `create_card`: initial SRS values for accepted cards.
- `evals/run_feedback_eval.py` / `evals/report.py`: CLI, cost estimate, JSON + Markdown result layout for the new eval.
- `tests/llm_fakes.py`: home for the scripted-transport helper.
- `FeedbackView.tsx` / `RecommendedLessons.tsx`: placement and styling for `StudyPlan`.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
