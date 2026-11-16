# SPDD Analysis: MCP Server over Grammar, Exercises and Vocabulary

**GitHub Issue**: #268
**Issue Title**: MCP server over grammar, exercises and vocabulary
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/268
**Artifact ID**: FLC-064-202611161613
**Created**: 2026-11-16 16:13
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Add a Python MCP server (stdio) that exposes the app's existing grammar, exercise and vocabulary content as tools, so Claude Code or Claude Desktop can work from the app's own data. Demo prompt: "quiz me on the subjunctive using my due cards".
>
> > **Backlog item** (post-MVP, presentation-round stretch). Scope, design and acceptance criteria will be refined if and when this is selected for implementation.
>
> **Needs approval (architectural):** new top-level `mcp_server/` directory and a new `mcp` dependency.
>
> ## Proposed tools
> - `search_grammar_reference`
> - `get_lesson`
> - `list_exercises`
> - `recommend_lessons_for_focus_area`
> - `get_due_cards`
>
> ## Acceptance criteria
> - [ ] Tools reuse the routers' query logic, with no duplicated data access
> - [ ] Tool descriptions and input schemas follow Anthropic's tool-writing guidance; errors return structured messages the model can recover from
> - [ ] Read-only by default
> - [ ] A test suite calls each tool through an MCP client
> - [ ] README section with a config snippet and a demo transcript
>
> ## Notes
> - These tools are intended to become the study-coach agent's tools (#270).

**Dependencies:** none blocking. #270 (study-coach agent) depends on this issue, not the other way round. #231 (PR #266) is merged; this branch is cut from `main` at `be4efaf`.

### Decisions confirmed by the user (2026-11-16)

| Question | Decision |
|----------|----------|
| Architectural approval | **Approved**: new top-level `mcp_server/` directory and the official `mcp` SDK, pinned `mcp>=2.3,<3` in `requirements.txt` |
| Demo transcript source | **Real tool outputs**: call the tools through an MCP client against the dev DB and write the README transcript from those results, labelled as such |
| `get_due_cards` filters | **No new filter**: endpoint semantics (all due cards, oldest first) plus `limit`/`page` |
| Read-only enforcement | **Baseline only**: no write tools, `readOnlyHint=True`, never commit, plus a test that checks the tool list and annotations. No `mode=ro` connection |

---

## Background

The app already has three bodies of study content behind HTTP endpoints:

- **Grammar lessons** (22 JSON files in `data/grammar_lessons/`), loaded by `get_lessons()` (`routers/grammar.py:65`) and served by `GET /grammar/lessons/{id}` (`routers/grammar.py:500`).
- **Grammar reference** (50 entries in `data/grammar/reference/`), loaded by `get_references()` (`routers/grammar.py:80`) and searched by `filter_references()` (`routers/grammar.py:146`), which matches `q` against term, definition, examples and pitfalls.
- **Exercises** (5 entries in `data/grammar/exercises/`), loaded by `get_exercises()` (`routers/grammar.py:95`) and filtered by `filter_exercises()` (`routers/grammar.py:200`).
- **Focus-area recommendations**: `map_focus_area_to_topics()` and `get_recommendations()` (`routers/grammar.py:372`, `:405`) map free-form feedback focus areas (English or French) to lesson topics, falling back to beginner lessons.
- **Vocabulary due cards**: `GET /vocabulary/due/` (`routers/vocabulary.py:451`) queries the `cards` table for `next_review_date <= today`, ordered oldest first, with the deck name joined in.

All of this is reachable only through the React UI or raw HTTP. An MCP server lets Claude Code or Claude Desktop use the same data as tools, so a learner can say "quiz me on the subjunctive using my due cards" and the model can pull the subjunctive reference entries and lesson, plus the learner's actual due cards, without copy-paste. The same tools are planned as the toolset for the #270 study-coach agent, so their names, schemas and error shapes become a contract that #270 builds on.

---

## Business Value

- Claude Code and Claude Desktop can tutor from the app's own curated content and the learner's own SRS state, instead of generic knowledge.
- Gives #270 a ready, tested toolset (it needs 3 to 5 tools, one of which must return a recoverable structured error).
- Presentation-round demo of agentic tool use over real project data, with no new LLM spend inside the app.
- Moves the due-card query out of the endpoint body into a reusable function, which the app and the MCP server then share.

---

## Scope In

- [ ] New top-level package `mcp_server/` (approved) containing a stdio MCP server built on the official `mcp` Python SDK (approved as a new dependency, `mcp>=2.3,<3`, in `requirements.txt`).
- [ ] Five read-only tools: `search_grammar_reference`, `get_lesson`, `list_exercises`, `recommend_lessons_for_focus_area`, `get_due_cards`.
- [ ] Small refactor of `routers/vocabulary.py`: extract the due-card query from `get_due_cards` (`routers/vocabulary.py:451-508`) into a module-level async function that takes an `AsyncSession` and a date, which the endpoint and the MCP tool both call. The endpoint's behaviour and response stay the same.
- [ ] Tool descriptions, typed input schemas (with enums for difficulty, category, exercise type), bounded result sizes, and a shared structured-error shape.
- [ ] Every tool annotated `readOnlyHint=True`; no write tools registered.
- [ ] An entry point runnable as `python3 -m mcp_server` from the repo root, plus an absolute-path form for client configs.
- [ ] pytest suite that starts the server and calls each tool through an MCP client session (in-memory transport), covering success and error paths, at 80%+ coverage for `mcp_server/`.
- [ ] README section: what the server is, how to register it with Claude Code (`claude mcp add` / `.mcp.json`) and Claude Desktop (`claude_desktop_config.json`), tool table, and a demo transcript.

## Scope Out

- [ ] Write tools of any kind (create cards, submit reviews, record lesson progress). #270 needs card creation behind learner approval; that's #270's design, not this issue's.
- [ ] Any LLM calls from the server. It serves data only, so the `services/llm/` guardrail isn't touched.
- [ ] HTTP/SSE or streamable-HTTP transport, remote hosting, authentication.
- [ ] MCP resources and prompts (tools only, as the issue lists).
- [ ] New grammar, exercise or vocabulary content. Only 5 exercises exist and none covers the subjunctive; adding content is separate work.
- [ ] Tools beyond the five listed (e.g. `list_lessons`, `get_exercise`, deck browsing). Can be follow-ups.
- [ ] Wiring the server into the FastAPI app or CI's required checks beyond the normal pytest job.
- [ ] Frontend changes.

---

## Acceptance Criteria (ACs)

1. **AC1: Tools reuse the routers' query logic, with no duplicated data access**
   **Given** the MCP server's five tools
   **When** each tool runs
   **Then** grammar tools call `get_lessons` / `get_references` / `get_exercises`, `filter_references` / `filter_exercises`, and `get_recommendations` from `routers/grammar.py`; `get_due_cards` calls the new extracted due-card query function in `routers/vocabulary.py`, which `GET /vocabulary/due/` also calls; and no file path, JSON loading or SQL query is reimplemented in `mcp_server/`.

2. **AC2a: Tool descriptions and schemas follow Anthropic's tool-writing guidance**
   **Given** a client lists the server's tools
   **When** it reads each tool's description and input schema
   **Then** each description says what the tool returns, when to use it (and which other tool to use instead when relevant), and its limits; each parameter has a type, a description, and enums or bounds where the domain is closed (difficulty, category, exercise type, `limit`); names are namespaced-consistent snake_case; responses are compact and carry the IDs needed for follow-up calls.

3. **AC2b: Errors return structured messages the model can recover from**
   **Given** an invalid call (unknown lesson ID, out-of-range page, invalid enum value, empty result)
   **When** the tool runs
   **Then** the result is marked as an error (`isError: true`) with a JSON body containing a machine-readable `code`, a human-readable `message`, and a `hint` naming the next action (e.g. close-match lesson IDs, the valid range, the valid values, or another tool to try). An empty search is a successful result with zero items and a hint, not an error.

4. **AC3: Read-only by default**
   **Given** the server as shipped
   **When** a client lists tools
   **Then** only the five read tools exist, each annotated `readOnlyHint=True`, and no code path in `mcp_server/` adds, updates, deletes or commits to the database or writes to `data/`.

5. **AC4: A test suite calls each tool through an MCP client**
   **Given** `tests/test_mcp_server.py`
   **When** `python3 -m pytest tests/ -v` runs (as in CI)
   **Then** each of the five tools is called through an MCP `ClientSession` connected to the server, success and error paths are asserted, `get_due_cards` runs against the in-memory test database with seeded cards, and `mcp_server/` reaches at least 80% coverage.

6. **AC5: README section with a config snippet and a demo transcript**
   **Given** `README.md`
   **When** a developer reads the new MCP section
   **Then** it has the run command, a Claude Code config snippet, a Claude Desktop config snippet, the tool list, read-only and environment notes, and a demo transcript for "quiz me on the subjunctive using my due cards".

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **GrammarLesson**: lesson model with `id`, `title`, `topic`, `difficulty`, sections and examples; loaded from `data/grammar_lessons/` by `get_lessons()` (`routers/grammar.py:65`).
- **GrammarReference**: reference entry with `term`, `definition`, `examples`, `common_pitfalls`, `category`, `difficulty`; searched by `filter_references()` (`routers/grammar.py:146`). Contains `subjunctive-present` and `subjunctive-past`.
- **Exercise**: typed exercise (`ExerciseType`: fill-in-the-blank, multiple-choice, translation, conjugation, sentence-transformation); filtered by `filter_exercises()` (`routers/grammar.py:200`). Topics in data today: `Verbs`, `Sentence Structure`.
- **Focus-area recommendations**: `FOCUS_AREA_TO_TOPIC`, `map_focus_area_to_topics()`, `get_recommendations()` (`routers/grammar.py:291-447`), capped at `MAX_RECOMMENDATIONS = 3`.
- **Pagination**: `paginate()` (`routers/grammar.py:238`) and `paginate_items()` (`routers/vocabulary.py:100`) both raise `HTTPException(404)` for an out-of-range page.
- **Card / Deck**: ORM models (`models/card.py`, `models/deck.py`) with SM-2 fields; `DueCardResponse` schema (`schemas/vocabulary.py:206`).
- **Due-card query**: inline in the `get_due_cards` endpoint (`routers/vocabulary.py:477-498`), using `get_today()` (`routers/vocabulary.py:91`).
- **Database**: `engine` / `async_session_maker` from `database.py`, built from `settings.DATABASE_URL` (`config.py:28`, default `sqlite+aiosqlite:///./french_coach.db`, relative to the working directory).
- **Settings validation**: `Settings.check_provider_keys` (`config.py:46`) raises if the configured chat/feedback provider has no API key. Importing `database.py` imports `config.settings`.
- **Test DB**: in-memory SQLite fixtures in `tests/conftest.py` (`test_db`, `AsyncTestingSession`); factories in `tests/factories.py`.

### New Concepts Required

- **`mcp_server/` package**: `server.py` (server instance and tool registrations), `__main__.py` (stdio entry point), possibly `errors.py` (structured error helper) and `formatting.py` (compact result shaping).
- **Structured tool error**: one shape, e.g. `{"error": {"code": "lesson_not_found", "message": "...", "hint": "...", "details": {...}}}`, returned with `isError: true`.
- **Session provider for `get_due_cards`**: the server needs an `AsyncSession` source that defaults to `database.async_session_maker` and that tests can swap for the in-memory test session (dependency injection, mirroring `app.dependency_overrides[get_db]`).
- **Extracted due-card query**: e.g. `async def query_due_cards(db: AsyncSession, today: date) -> list[DueCardResponse]` in `routers/vocabulary.py`.

### Key Business Rules

- **Read-only**: the server never writes. No write tool is registered and the DB session is never committed.
- **Due means `next_review_date <= today`**, oldest first, exactly as the endpoint defines it.
- **Recommendations** keep the router's semantics: whole-word bilingual keyword match, at most 3 lessons, beginner fallback when nothing matches (the tool reports that a fallback was used, since `matched_topics` is empty).
- **Reference search** keeps the router's semantics: AND across filters, case-insensitive substring on term/definition/examples/pitfalls.
- **No LLM calls** from the server (the `services/llm/` guardrail only applies to app LLM calls, and this adds none).
- **No secrets in output**: tools return content only, never settings.

---

## Strategic Approach

### Solution Direction

1. Extract the due-card query from the endpoint into `query_due_cards(db, today)` in `routers/vocabulary.py`; the endpoint calls it and then paginates. Existing vocabulary tests must still pass unchanged.
2. Add the `mcp` dependency and create `mcp_server/` with a server instance that registers five tools. Each tool is a thin adapter: validate/convert inputs → call the router function → shape a compact result → or return a structured error.
3. Make the DB session source injectable so tests can point `get_due_cards` at the in-memory test database.
4. Add `python3 -m mcp_server` stdio entry point. Resolve the repo root from `__file__` so the server works when a client launches it from any working directory (imports and the relative SQLite path both depend on it).
5. Write `tests/test_mcp_server.py` using the SDK's in-memory client/server session helper, one test class per tool, success and error paths.
6. Add the README section with config snippets and a demo transcript; run the full suite and the coverage gate.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Package location: new top-level `mcp_server/` (issue's proposal) vs `services/mcp/` or `scripts/` | Top-level matches the issue and keeps it separate from the HTTP app; it's a new top-level dir, which CLAUDE.md says needs approval. `scripts/` is omitted from coverage and isn't importable as a package. | **`mcp_server/`** (approved 2026-11-16). |
| SDK: official `mcp` package (latest on PyPI is 2.3.0) vs standalone `fastmcp` | Official SDK is maintained alongside the spec and is what Anthropic docs reference; standalone adds another dependency layer. | **Official `mcp`**, pinned `mcp>=2.3,<3` (approved 2026-11-16). The prompt step confirms the exact 2.x API (server class, decorator, annotations, in-memory test helper) against the installed version rather than from memory. |
| Reuse strategy for due cards | Calling the endpoint function directly drags in FastAPI `Query`/`Depends` defaults; reimplementing the query violates AC1. | **Extract `query_due_cards(db, today)`** in `routers/vocabulary.py`; both the endpoint and the tool call it. |
| Reuse strategy for grammar | Endpoint functions return HTTP response models and raise `HTTPException`. The module-level helpers are already pure. | **Call the module-level helpers** (`get_*`, `filter_*`, `get_recommendations`, `paginate`), not the endpoint coroutines. |
| Pagination in tools | Page/per_page mirrors the API; Anthropic guidance favours a bounded `limit` with sensible defaults and a note when truncated. | **`limit` (default 10, max 50) plus `page` (default 1)**, reusing `paginate()`; catch its `HTTPException(404)` and convert to a `page_out_of_range` structured error with the max page. Response includes `total` and `has_more`. |
| Error mechanism | Raising an exception gives a generic error string; returning a structured payload with `isError` lets the model recover. | **Shared helper** that returns an error result with `code`/`message`/`hint` and `isError: true`. Unknown lesson IDs include `did_you_mean` from `difflib.get_close_matches` over the loaded IDs (no new data access). |
| Response verbosity | Full lessons and references are long; agents waste context. | `search_grammar_reference` and `list_exercises` return full entries but bounded by `limit`; `get_lesson` returns the full lesson (that's its job); `recommend_lessons_for_focus_area` returns summaries (id, title, topic, difficulty) plus `matched_topics` and a `fallback_used` flag. A `response_format: concise|detailed` switch is not needed at this size. |
| Read-only enforcement | Tool annotations are advisory; opening SQLite with `mode=ro` is a hard guarantee but complicates `DATABASE_URL` handling (only works for file SQLite). | **No write tools + `readOnlyHint=True` + never commit**, plus a test asserting the tool list and annotations. No `mode=ro` connection (user decision). |
| Settings validation on import | `database.py` → `config.settings` raises if `MISTRAL_API_KEY` is missing, even though the server makes no LLM calls. | Document that the server loads the repo's `.env` like the app does (repo root resolved from `__file__`, so `.env` is found). Don't change `config.py` in this issue. If the user wants the server to start without any API key, that's a separate change. |
| Demo transcript | A real transcript needs a live Claude Code or Claude Desktop session against a seeded DB; an authored one risks looking fabricated. | **Decided: real tool outputs.** Call the tools through the MCP client against the dev DB and write the transcript from those results, labelled as such. |

### Alternatives Considered

- **Wrap the HTTP API (MCP tools call `localhost:8000`)**: no import coupling, but requires the API server running, adds `httpx` at runtime, and duplicates parameter handling. Rejected: AC1 asks to reuse the routers' query logic, and stdio servers shouldn't depend on another process.
- **Auto-generate MCP tools from the FastAPI OpenAPI spec** (e.g. a FastAPI-to-MCP bridge): fast, but descriptions and schemas would be the HTTP ones, not written for agents (AC2), and it would expose write endpoints unless filtered. Rejected.
- **Put the tools inside the FastAPI app (mounted MCP endpoint)**: requires HTTP transport and the app running; the issue asks for stdio. Rejected.
- **Duplicate the due-card SQL in the server**: simplest, but violates AC1. Rejected.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Architectural approval | The issue says `mcp_server/` and the `mcp` dependency need approval. | Resolved: approved by the user. |
| "Read-only by default" | "By default" implies a possible opt-in write mode later. Should this issue add a disabled-by-default write flag? | No write tools and no flag now; #270 owns card creation with approval. Note the extension point in the README. |
| Demo transcript source | Live session vs transcript built from real tool outputs. | Resolved: real tool outputs. |
| `get_due_cards` filters | The demo says "subjunctive using my due cards", but cards have no grammar topic (tags are thematic, e.g. `subject`, `beginner`). Should the tool filter by deck or tag? | Resolved: no new filter. Endpoint semantics (all due cards, oldest first) plus `limit`/`page`; the model combines due vocabulary with subjunctive reference content. |
| Empty exercise coverage | No exercises exist for the subjunctive (only 5 exercises in total). | `list_exercises` returns zero items with a hint to use `search_grammar_reference` / `get_lesson` instead. Content gaps are out of scope. |
| Pin style for `mcp` | Existing requirements use `>=` floors only. | Resolved: `mcp>=2.3,<3` approved. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Unknown `lesson_id` (e.g. `subjonctif`) | Model guesses IDs | Error `lesson_not_found` with `did_you_mean: ["subjunctive", ...]` and a hint to call `recommend_lessons_for_focus_area` |
| Invalid enum (e.g. `difficulty="hard"`) | Model passes free text | Schema enum rejects it at validation; the result is an error listing valid values |
| `page` past the last page | `paginate()` raises `HTTPException` | Error `page_out_of_range` with `max_page` |
| Search with no matches | Common for broad or French-only queries | Success, `total: 0`, hint suggesting a broader query or other fields |
| `focus_area` blank or unknown | Router falls back to beginner lessons | Success with `fallback_used: true` so the model doesn't present fallbacks as targeted |
| No cards due | Fresh DB or caught-up learner | Success, empty list, hint that nothing is due today |
| DB missing tables / file not found | Server launched outside the repo or before the app ever ran | Structured error `database_unavailable` with a hint to start the app once (it creates tables and seeds decks) or check `DATABASE_URL` |
| Client launches the server from another cwd | Imports and the relative SQLite URL break | Resolve repo root from `__file__`, add to `sys.path`, `chdir` before importing `config` |
| `limit` above max or below 1 | Protects context size | Schema bounds (1–50) reject it |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| `mcp` 2.x API differs from what I remember (1.x `FastMCP`) | Wrong imports, broken tests | Install first, inspect the package's actual API and in-memory test helper, record the versions and APIs in the prompt artifact before coding |
| stdout pollution breaks stdio JSON-RPC | Server unusable in clients | No `print` in the server path; log to stderr only. Router modules don't print at import time (`main.py` does, but the server doesn't import `main`). |
| Settings validator raises without `MISTRAL_API_KEY` | Server fails to start in a client | Load `.env` from repo root (via `chdir`); document in README; error message explains it |
| SDK's anyio event loop vs `tests/conftest.py` session-scoped `event_loop` fixture | Flaky or hanging tests | Use `pytest.mark.asyncio` consistent with existing async tests; verify locally; the in-memory transport avoids subprocesses |
| Refactoring `get_due_cards` changes endpoint behaviour | Regression in vocabulary UI | Pure extract; existing tests in `tests/test_vocabulary_simple.py` and related files must pass unchanged |
| New module below 80% coverage | CI per-module gate fails (`scripts/check_module_coverage.py`) | Exercise every tool's success and error path; `__main__.py` kept tiny (and covered by a test that imports and checks the entry function, or measured and justified) |
| Dependency conflicts (`mcp` pulls `starlette`, `pydantic`, `httpx`, `anyio` versions) | Breaks FastAPI install | Install into the current environment and run the full backend suite before committing |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Reuse router query logic | Yes | Requires the small due-card extract in `routers/vocabulary.py` |
| AC2a | Descriptions and schemas per Anthropic guidance | Yes | Descriptions drafted in the prompt artifact for review |
| AC2b | Structured, recoverable errors | Yes | Shared error helper; `did_you_mean`, `max_page`, valid values |
| AC3 | Read-only by default | Yes | No write tools, annotations, test asserts tool list |
| AC4 | Tests call each tool through an MCP client | Yes | In-memory client session; test DB injected for due cards |
| AC5 | README with config snippet and demo transcript | Yes | Transcript source needs a user decision |

**AC Coverage Summary**: 6 of 6 ACs (5 issue ACs, with AC2 split in two) are addressable; architectural approval was given.

**Implicit Requirements Not in ACs**:
- Endpoint `GET /vocabulary/due/` behaviour must not change.
- The server must start from any working directory and must not write to stdout outside the protocol.
- Tool names, input schemas and error codes should stay stable, since #270 will reuse them.
- `requirements.txt` updated; CI's pytest job must install and pass with the new dependency.

---

## REASONS Canvas

### Requirements
Five read-only MCP tools over stdio (`search_grammar_reference`, `get_lesson`, `list_exercises`, `recommend_lessons_for_focus_area`, `get_due_cards`) that reuse router query logic, have agent-oriented descriptions and schemas, return structured recoverable errors, are tested through an MCP client, and are documented in the README with config snippets and a demo transcript.

### Examples
- `search_grammar_reference(query="subjonctif")` → entries including `subjunctive-present` and `subjunctive-past`, each with term, definition, examples, pitfalls; `total`, `has_more`.
- `search_grammar_reference(query="zzz")` → success, `total: 0`, hint to broaden the query.
- `get_lesson(lesson_id="subjunctive")` → full "Subjunctive Mood" lesson.
- `get_lesson(lesson_id="subjonctif")` → `isError`, `code: lesson_not_found`, `did_you_mean` includes `subjunctive`.
- `list_exercises(topic="Verbs", difficulty="beginner")` → matching exercises; `list_exercises(topic="subjunctive")` → zero items with a hint.
- `list_exercises(page=99)` → `isError`, `code: page_out_of_range`, `max_page: 1`.
- `recommend_lessons_for_focus_area(focus_area="Accord du subjonctif")` → `matched_topics` includes `Moods`; up to 3 lesson summaries; `fallback_used: false`.
- `recommend_lessons_for_focus_area(focus_area="pronunciation")` → beginner lessons, `fallback_used: true`.
- `get_due_cards(limit=5)` with 3 cards due yesterday/today and 1 due tomorrow (test DB) → the 3 due cards oldest first with `deck_name`; tomorrow's card absent.
- Demo: "Quiz me on the subjunctive using my due cards" → model calls `search_grammar_reference("subjunctive")`, `get_lesson("subjunctive")`, `get_due_cards()`, then writes subjunctive prompts using the due vocabulary.

### Architecture
- Backend is FastAPI + async SQLAlchemy + SQLite. Routers hold the query helpers (`routers/grammar.py`, `routers/vocabulary.py`); schemas in `schemas/`; models in `models/`; DB session factory in `database.py`.
- New `mcp_server/` package sits beside `routers/` and imports from it (one-way dependency; routers never import the server).
- stdio transport; the server process is launched by the MCP client.
- DB access via an injectable session factory, defaulting to `database.async_session_maker`.

### Standards
- PEP 8; module and public-function docstrings matching existing style (`Args`/`Returns`/`Raises`).
- 80% coverage for `mcp_server/` and no drop for `routers/vocabulary.py`; total and per-module gate via `scripts/check_module_coverage.py` (no ALLOWLIST additions).
- Tests in `tests/test_mcp_server.py`, async via pytest-asyncio, in-memory SQLite, factories from `tests/factories.py` where they fit.
- README updated in the same PR (new top-level directory, new dependency, new run mode).
- Commit `feat(#268): ...` on `feature/issue-268-mcp-server`; PR with `Closes #268`.

### Omissions
No write tools, no LLM calls, no HTTP transport, no MCP resources/prompts, no new content, no extra tools beyond the five, no frontend work, no change to `config.py` validation or to the default LLM provider.

### Notes
- `paginate()` raises `HTTPException`; tools must catch it and convert to a structured error rather than leak a FastAPI exception.
- Exercise topics in data are coarse (`Verbs`, `Sentence Structure`), so topic filtering is a substring match on those; the description should say so and suggest leaving `topic` empty to browse.
- `FOCUS_AREA_TO_TOPIC` is bilingual; mention in the tool description that French or English focus areas both work.
- `main.py` prints during startup; the server must not import `main`.
- Card `tags` are stored comma-separated in SQLite but `DueCardResponse` doesn't include them; keep the endpoint schema as is.

### Solutions
- Reuse: `routers/grammar.py` helpers (`get_lessons`, `get_references`, `get_exercises`, `filter_references`, `filter_exercises`, `paginate`, `get_recommendations`) and the new `query_due_cards` in `routers/vocabulary.py`.
- Mimic dependency injection from `tests/conftest.py` (`app.dependency_overrides[get_db]`) with a module-level session-factory setter or a server factory function `create_server(session_factory=...)`.
- Follow Anthropic's "Writing tools for agents" guidance: clear purpose-first descriptions, unambiguous parameter names (`lesson_id`, not `id`), bounded and paginated responses, meaningful IDs in results, and actionable error messages.
- Test with the SDK's in-memory client/server session helper (exact import confirmed against the installed `mcp` version in the prompt step).
