# SPDD Prompt: MCP Server over Grammar, Exercises and Vocabulary

**GitHub Issue**: #268
**Issue Title**: MCP server over grammar, exercises and vocabulary
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/268
**Artifact ID**: FLC-064-202611161641
**Created**: 2026-11-16 16:41
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [spdd/analysis/FLC-064-202611161613-[Analysis]-issue-268-mcp-server.md](../analysis/FLC-064-202611161613-[Analysis]-issue-268-mcp-server.md)

---

## Context

### Current Codebase State
- Grammar lessons, reference entries and exercises are JSON under `data/`, loaded and filtered by pure module-level helpers in `routers/grammar.py`. The HTTP endpoints wrap those helpers.
- Due vocabulary cards live in SQLite (`cards` table). The due-card query is written inline in the `GET /vocabulary/due/` endpoint body (`routers/vocabulary.py:451-508`), so nothing else can reuse it today.
- There is no MCP code in the repo. The user approved (2026-11-16) a new top-level `mcp_server/` package and the dependency `mcp>=2.3,<3`.
- **SDK facts verified against the installed `mcp` 2.3.0** (in a scratch venv; not from memory):
  - `FastMCP` is gone in 2.x (`mcp.server.fastmcp` raises `ModuleNotFoundError`). The high-level server is `from mcp.server import MCPServer` (`MCPServer(name=..., instructions=..., version=...)`).
  - Tools are registered with `@server.tool(name=None, title=None, description=None, annotations=ToolAnnotations(...))` or `server.add_tool(fn, ...)`. The input schema comes from the function signature; `Annotated[T, pydantic.Field(description=..., ge=..., le=...)]` and `Enum` types produce descriptions, bounds and `enum` lists in the JSON schema. The docstring becomes the description when `description` is not passed.
  - `ToolAnnotations` and `CallToolResult`, `TextContent` come from `mcp_types` (field names are snake_case: `read_only_hint`, `destructive_hint`, `idempotent_hint`, `open_world_hint`; `CallToolResult(content=[...], structured_content={...}, is_error=bool)`).
  - A tool may return a `CallToolResult` directly. The return annotation must then be exactly `CallToolResult` (no `Union`/`Optional`).
  - Argument validation failures (bad enum, `limit` out of bounds, missing required field) are raised inside `MCPServer.call_tool` as `ToolError` with `__cause__` a pydantic `ValidationError`. By default the SDK turns that into `is_error=True` with raw pydantic text. Overriding the **public** `async def call_tool(self, name, arguments, context=None)` in an `MCPServer` subclass, catching that case and returning our own `CallToolResult` works (verified by the spike).
  - In-process testing: `from mcp import Client`; `async with Client(server) as client:` then `await client.list_tools()` (`.tools[i].name/.description/.input_schema/.annotations`) and `await client.call_tool(name, args)` → `CallToolResult` (`.is_error`, `.content[0].text`, `.structured_content`). Stdio: `Client(StdioServerParameters(command=..., args=[...], env=..., cwd=...))`.
  - `server.run("stdio")` runs the stdio transport (sync wrapper around `anyio.run`).
  - `pip install --dry-run "mcp>=2.3,<3"` against the project environment adds only new packages (`mcp`, `mcp-types`, `jsonschema`, `sse-starlette`, `PyJWT`, `cryptography`, …) and doesn't change `fastapi` 0.136.1 or `starlette` 1.0.0.
- Importing any router loads `config.settings`, which requires `MISTRAL_API_KEY` (`routers/__init__.py` → `sessions.py` → `database.py` → `config.py:46`). Follow-up issue **#275** will remove that. For #268 the requirement is **documented, not fixed**. CI already sets `MISTRAL_API_KEY: dummy_test_key` (`.github/workflows/pytest-tests.yml:74`).

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `routers/grammar.py` | Grammar content loaders, filters, pagination, recommendations | `get_lessons()` :65, `get_references()` :80, `get_exercises()` :95, `filter_references()` :146, `filter_exercises()` :200, `paginate()` :238 (raises `HTTPException(404)` past the last page), `MAX_RECOMMENDATIONS` :287, `map_focus_area_to_topics()` :372, `get_recommendations()` :405 |
| `routers/vocabulary.py` | Vocabulary endpoints and helpers | `get_today()` :91, `paginate_items()` :100 (raises `HTTPException(404)`), `get_due_cards` endpoint :451-508 (inline query :477-498) |
| `schemas/grammar.py` | `DifficultyLevel`, `LessonSummary` (:23) | enums for tool input schemas |
| `schemas/grammar_reference.py` | `GrammarReferenceCategory` | values: `Adjectives`, `Adverbs`, `Articles`, `Conjunctions`, `Nouns`, `Other`, `Prepositions`, `Pronouns`, `Verbs` |
| `schemas/grammar_exercise.py` | `ExerciseType` | fill-in-the-blank, multiple-choice, translation, conjugation, sentence-transformation |
| `schemas/vocabulary.py` | `DueCardResponse` :206 | id, deck_id, deck_name, card_id, front, back, next_review_date |
| `models/card.py`, `models/deck.py` | ORM models | `Card.next_review_date`, `Card.deck` relationship; `Deck.name` |
| `database.py` | Engine and `async_session_maker` | default session source for the server |
| `tests/conftest.py` | In-memory SQLite fixtures | `test_db` fixture, `AsyncTestingSession` factory |
| `tests/test_vocabulary_simple.py` | Existing due-card endpoint tests | must pass unchanged after the refactor |
| `.github/workflows/pytest-tests.yml` | CI pytest + coverage gate | installs `requirements.txt`; `MISTRAL_API_KEY=dummy_test_key` |
| `README.md` | Project docs | add the new section after "LLM Integration" (:489) and before "Why Mistral" (:568); add `mcp_server/` to "Project Structure" (:231) |

### Existing Patterns
- Router helpers are synchronous, pure functions over loaded Pydantic models; endpoints are thin. The MCP tools must be thin in the same way.
- Docstrings use `Args:` / `Returns:` / `Raises:` sections (see `routers/grammar.py`).
- Tests are classes of `@pytest.mark.asyncio` methods using the `test_db` fixture and ORM models directly (`tests/test_card_review.py`, `tests/test_vocabulary_simple.py`).
- Dependency injection for the DB mirrors `app.dependency_overrides[get_db]` in `tests/conftest.py`; the server takes a `session_factory` argument for the same purpose.

---

## Goal

**Primary Objective**: Add a stdio MCP server in `mcp_server/` exposing five read-only tools (`search_grammar_reference`, `get_lesson`, `list_exercises`, `recommend_lessons_for_focus_area`, `get_due_cards`) that reuse the routers' query logic, return compact JSON results and structured, recoverable errors, and are tested through an MCP client.

**Secondary Objectives**:
- Extract the due-card query into `query_due_cards(db, today)` in `routers/vocabulary.py`, used by both the endpoint and the tool, with the endpoint's behaviour unchanged.
- Document the server in `README.md`: run command, Claude Code and Claude Desktop config, tool table, the API-key requirement (pointing at #275), and a demo transcript built from real tool output.
- Keep tool names, argument names and error codes stable, since #270 will reuse them.

---

## Constraints

### Architecture Constraints
- New package `mcp_server/` at the repo root; routers never import it.
- Official SDK only: `from mcp.server import MCPServer`. Don't use `mcp.server.fastmcp` or the standalone `fastmcp` package. Add `mcp>=2.3,<3` to `requirements.txt` (main dependencies block, after `anthropic`).
- **No duplicated data access (AC1)**: no file paths, JSON loading, glob, or SQL/ORM queries in `mcp_server/`. Use only `routers.grammar` helpers and `routers.vocabulary.query_due_cards` / `paginate_items` / `get_today`. Small presentation logic (shaping dicts, `difflib` over already-loaded IDs, computing `max_page` from a total) is fine.
- **Read-only (AC3)**: register only the five tools; annotate each `ToolAnnotations(title=..., read_only_hint=True, destructive_hint=False, idempotent_hint=True, open_world_hint=False)`. Never call `commit`, `add`, `delete`, `merge` or `flush` on a session, and never write files.
- **No LLM calls** from the server; don't import `services/llm/`.
- **No stdout output** in the server path (stdio transport uses stdout for JSON-RPC). Don't import `main.py` (it prints at startup). Logging, if any, goes to stderr.
- The `routers/vocabulary.py` refactor must not change the endpoint's response, ordering, pagination or error behaviour.
- Don't change `config.py`, `database.py`, `routers/__init__.py`, default providers/models, or any frontend file. Don't run `npm run build`.

### Code Quality Constraints
- PEP 8; module docstrings; `Args`/`Returns`/`Raises` docstrings on public functions, matching `routers/grammar.py`.
- Type hints throughout. Tool functions return `CallToolResult`.
- Tool descriptions follow Anthropic's tool-writing guidance: purpose first; what the result contains (including the IDs to use in follow-up calls); when to use this tool versus another; limits (paging, max `limit`); plain, unambiguous parameter names (`lesson_id`, not `id`).

### Testing Constraints
- New file `tests/test_mcp_server.py` (pytest, `@pytest.mark.asyncio`, run by `python3 -m pytest tests/`). Every tool is called **through `mcp.Client`** connected in-process to a server built with `create_server(session_factory=AsyncTestingSession)`.
- Cover the success path, the empty-result hint, and each error code per tool; the tool list and annotations; the `invalid_arguments` normalisation; and one end-to-end stdio test that launches `mcp_server/__main__.py` as a subprocess and calls one grammar tool.
- `get_due_cards` tests seed `Deck` and `Card` rows in the in-memory DB via the `test_db` fixture, using dates relative to `date.today()`.
- `mcp_server/` at 80%+ per module (`scripts/check_module_coverage.py`), with no additions to its `ALLOWLIST`; `routers/vocabulary.py` coverage must not drop. Run the full suite and the coverage gate exactly as CI does.
- `tests/test_vocabulary_simple.py` and the other vocabulary tests pass unchanged.

### Acceptance Criteria
From issue #268:
- [ ] Tools reuse the routers' query logic, with no duplicated data access
- [ ] Tool descriptions and input schemas follow Anthropic's tool-writing guidance; errors return structured messages the model can recover from
- [ ] Read-only by default
- [ ] A test suite calls each tool through an MCP client
- [ ] README section with a config snippet and a demo transcript

---

## Examples

### Input/Output Examples
1. **Reference search**
   - Input: `search_grammar_reference({"query": "subjonctif"})`
   - Expected Output: `is_error=False`; `structured_content` has `total >= 2`, `page: 1`, `results` containing entries with `id` `subjunctive-present` and `subjunctive-past`, each with `term`, `definition`, `examples`, `common_pitfalls`, `category`, `difficulty`.

2. **Empty search**
   - Input: `search_grammar_reference({"query": "zzzz"})`
   - Expected Output: `is_error=False`, `total: 0`, `results: []`, and a `hint` suggesting a shorter or English/French alternative term or a `category` filter.

3. **Lesson by ID**
   - Input: `get_lesson({"lesson_id": "subjunctive"})`
   - Expected Output: `is_error=False`; `structured_content["lesson"]["id"] == "subjunctive"`, `title == "Subjunctive Mood"`, full sections included.

4. **Unknown lesson ID**
   - Input: `get_lesson({"lesson_id": "subjonctif"})`
   - Expected Output: `is_error=True`; body `{"error": {"code": "lesson_not_found", "message": "No lesson with id 'subjonctif'.", "hint": "...recommend_lessons_for_focus_area...", "details": {"did_you_mean": ["subjunctive", ...]}}}`.

5. **Exercises**
   - Input: `list_exercises({"topic": "Verbs"})` → matching exercises with full fields (including answers).
   - Input: `list_exercises({"topic": "subjunctive"})` → `total: 0`, `hint` listing available exercise topics (computed from loaded exercises, e.g. `["Sentence Structure", "Verbs"]`) and pointing to `search_grammar_reference` / `get_lesson`.
   - Input: `list_exercises({"page": 99})` → `is_error=True`, `code: page_out_of_range`, `details: {"page": 99, "max_page": 1}`.

6. **Recommendations**
   - Input: `recommend_lessons_for_focus_area({"focus_area": "Accord du subjonctif"})` → `matched_topics` includes `Moods`; `lessons` has 1–3 summaries (`id`, `title`, `topic`, `difficulty`); `fallback_used: false`.
   - Input: `recommend_lessons_for_focus_area({"focus_area": "pronunciation"})` → `matched_topics: []`, beginner lessons, `fallback_used: true`, `hint` saying these are general lessons, not targeted.

7. **Due cards** (test DB: card A due 3 days ago, card B due today, card C due tomorrow, all in deck "Food")
   - Input: `get_due_cards({})` → `total: 2`, `cards` = [A, B] in that order, each with `deck_name: "Food"`, `front`, `back`, `next_review_date`; C absent; `today` echoed as ISO date.
   - Input: `get_due_cards({"limit": 1, "page": 2})` → `[B]`, `has_more: false`.
   - Empty DB → `total: 0`, `hint` that nothing is due today.

8. **Invalid arguments** (any tool)
   - Input: `list_exercises({"difficulty": "hard"})`
   - Expected Output: `is_error=True`; body `{"error": {"code": "invalid_arguments", "message": "...", "hint": "Fix the listed arguments and call the tool again.", "details": {"errors": [{"field": "difficulty", "problem": "Input should be 'beginner', 'intermediate' or 'advanced'"}]}}}`.

### Edge Cases
- `limit` outside 1–50 or `page < 1` → `invalid_arguments` (schema bounds).
- Missing required argument (`get_lesson({})`) → `invalid_arguments` with `field: lesson_id`.
- Unknown tool name → SDK's own `is_error` result (`Unknown tool: ...`); not rewritten.
- Database unreachable or tables missing (`sqlalchemy.exc.SQLAlchemyError` from `query_due_cards`) → `database_unavailable` with a hint to start the backend once (`uvicorn main:app` creates tables and seeds decks) or check `DATABASE_URL`. Test it with a session factory bound to an engine with no tables.
- `paginate`/`paginate_items` raising `HTTPException(404)` → caught and turned into `page_out_of_range` with `max_page = ceil(total / limit)`.
- Blank `focus_area` → router fallback, `fallback_used: true` (not an error).

### Test Cases
```python
@pytest.mark.asyncio
class TestGetLesson:
    async def test_unknown_id_returns_structured_error_with_suggestions(self, mcp_client):
        # Given an ID that is close to a real lesson ID
        # When the tool is called through the MCP client
        result = await mcp_client.call_tool("get_lesson", {"lesson_id": "subjonctif"})

        # Then the result is an error the model can recover from
        assert result.is_error is True
        error = json.loads(result.content[0].text)["error"]
        assert error["code"] == "lesson_not_found"
        assert "subjunctive" in error["details"]["did_you_mean"]
        assert "recommend_lessons_for_focus_area" in error["hint"]


@pytest.mark.asyncio
class TestGetDueCards:
    async def test_returns_only_due_cards_oldest_first(self, test_db, mcp_client):
        # Given three cards: due 3 days ago, due today, due tomorrow
        deck = DeckModel(name="Food")
        test_db.add(deck)
        await test_db.flush()
        today = date.today()
        for card_id, offset in [("a", -3), ("b", 0), ("c", 1)]:
            test_db.add(CardModel(deck_id=deck.id, card_id=card_id, front=card_id, back=card_id,
                                  next_review_date=today + timedelta(days=offset)))
        await test_db.commit()

        # When
        result = await mcp_client.call_tool("get_due_cards", {})

        # Then
        body = result.structured_content
        assert result.is_error is False
        assert [c["card_id"] for c in body["cards"]] == ["a", "b"]
        assert body["cards"][0]["deck_name"] == "Food"
```

---

## Deliverables

### Code Changes
- [ ] `requirements.txt`: add `mcp>=2.3,<3` after `anthropic>=2.0.0`.
- [ ] `routers/vocabulary.py`: add `async def query_due_cards(db: AsyncSession, today: date) -> list[DueCardResponse]` containing the existing query and mapping; `get_due_cards` calls it and then `paginate_items`.
- [ ] `mcp_server/__init__.py`: package docstring; export `create_server`.
- [ ] `mcp_server/results.py`: `tool_result(payload: dict) -> CallToolResult` and `tool_error(code, message, hint, details=None) -> CallToolResult` (JSON text content plus the same dict as `structured_content`; `is_error=True` for errors). Error codes as module constants: `INVALID_ARGUMENTS`, `LESSON_NOT_FOUND`, `PAGE_OUT_OF_RANGE`, `DATABASE_UNAVAILABLE`.
- [ ] `mcp_server/server.py`: `FLCMCPServer(MCPServer)` overriding `call_tool` to turn `ToolError` caused by `ValidationError` into `invalid_arguments`; `SERVER_INSTRUCTIONS` string; `create_server(session_factory=None) -> FLCMCPServer` registering the five tools (closures over the session factory; default `database.async_session_maker`, imported lazily inside `create_server`); a private `_paginate_or_error` helper wrapping `paginate`/`paginate_items`.
- [ ] `mcp_server/__main__.py`: `bootstrap()` resolves the repo root from `__file__`, inserts it on `sys.path` and `chdir`s to it (so `.env` and the relative SQLite path resolve whatever cwd the client uses); `main()` calls `bootstrap()`, then `create_server().run("stdio")`; `if __name__ == "__main__": main()`. Works both as `python3 -m mcp_server` and `python3 /abs/path/mcp_server/__main__.py`.

### Tests
- [ ] `tests/test_mcp_server.py`: fixtures `mcp_server` (built with `AsyncTestingSession`) and `mcp_client` (`async with Client(server)`, depending on `test_db` so tables exist).
- [ ] Tool listing: exactly the five names; each has a non-empty description, `read_only_hint is True`, `destructive_hint is False`; input schemas carry descriptions on every property and `enum` values for difficulty/category/exercise type; `limit` has `minimum: 1`, `maximum: 50`.
- [ ] Per tool: success, empty-result hint, and error-code tests as in the Examples.
- [ ] `invalid_arguments` for bad enum, out-of-range `limit`, missing required argument.
- [ ] `database_unavailable` via a session factory on a fresh in-memory engine with no tables.
- [ ] Read-only checks: card rows unchanged (count and `next_review_date`) after `get_due_cards`; a source scan of `mcp_server/*.py` finds no `.commit(`, `.add(`, `.delete(`, `.merge(`, `.flush(`, `open(` or `write_text(`.
- [ ] AC1 check: a source scan of `mcp_server/*.py` finds no `select(`, `json.load`, `Path(`, `glob` or `data/`.
- [ ] `bootstrap()` test: run from a different cwd (`monkeypatch.chdir(tmp_path)`), assert cwd becomes the repo root and the root is on `sys.path`; restore afterwards.
- [ ] Stdio end-to-end: `Client(StdioServerParameters(command=sys.executable, args=[<repo>/mcp_server/__main__.py], cwd=tmp_path, env={**os.environ}))` lists 5 tools and `get_lesson("subjunctive")` succeeds. It reads the real `data/` files and doesn't touch the DB.
- [ ] Existing vocabulary tests unchanged and passing.

### Documentation
- [ ] `README.md`: new `## MCP Server (Claude Code / Claude Desktop)` section between "LLM Integration" and "Why Mistral":
  - what it is and that it's read-only and makes no LLM calls
  - install (`pip install -r requirements.txt`) and run (`python3 -m mcp_server`)
  - Claude Code: `claude mcp add french-coach -- python3 /absolute/path/to/french-language-coach/mcp_server/__main__.py` and the equivalent `.mcp.json` snippet
  - Claude Desktop: `claude_desktop_config.json` snippet with the absolute path
  - a note that `python3` must be the interpreter with the requirements installed (use `.venv/bin/python` if you use a venv)
  - **API-key note**: the server loads the repo's `.env`, and the backend config currently requires `MISTRAL_API_KEY` to be set even though the server never calls an LLM; any value works; tracked in #275
  - the database note: `get_due_cards` reads `DATABASE_URL` (default `./french_coach.db` in the repo root); start the backend once to create and seed it
  - tool table (name, purpose, key arguments)
  - error shape and codes
  - demo transcript for "Quiz me on the subjunctive using my due cards". Tool calls and results are real output from the server against the local dev DB, abbreviated; the assistant's quiz text is clearly marked as illustrative.
- [ ] `README.md` "Project Structure": add `mcp_server/` with a one-line description.
- [ ] Docstrings on all new public functions.

---

## Actual Prompt

```
Implement GitHub issue #268: a read-only stdio MCP server over the app's grammar,
exercise and vocabulary content. Follow this prompt exactly.

CONTEXT:
- Repo: French Language Coach (FastAPI + async SQLAlchemy + SQLite). Branch
  feature/issue-268-mcp-server. Python 3.12, always `python3`.
- Approved (2026-11-16): new top-level package `mcp_server/` and dependency
  `mcp>=2.3,<3` (official SDK). In mcp 2.x, FastMCP is renamed:
  `from mcp.server import MCPServer`. Tool decorator: `@server.tool(name=..., title=...,
  description=..., annotations=ToolAnnotations(...))` or `server.add_tool(fn, ...)`.
  `ToolAnnotations`, `CallToolResult`, `TextContent` import from `mcp_types`
  (snake_case fields: read_only_hint, destructive_hint, idempotent_hint,
  open_world_hint; CallToolResult(content=[...], structured_content={...}, is_error=...)).
  A tool may return CallToolResult directly; then its return annotation must be exactly
  CallToolResult. Argument-validation failures surface in `MCPServer.call_tool` as
  `mcp.server.mcpserver.exceptions.ToolError` whose `__cause__` is a pydantic
  ValidationError. Tests: `from mcp import Client`; `async with Client(server) as c:`
  `await c.list_tools()`, `await c.call_tool(name, args)`. Stdio client:
  `Client(StdioServerParameters(command=..., args=[...], cwd=..., env=...))`
  (StdioServerParameters from `mcp`). Run stdio: `server.run("stdio")`.
- Content helpers to reuse (routers/grammar.py): get_lessons(), get_references(),
  get_exercises(), filter_references(refs, q, category, difficulty),
  filter_exercises(exs, exercise_type, topic, difficulty), paginate(items, page, per_page)
  (raises fastapi.HTTPException 404 past the last page), get_recommendations(focus_area)
  -> (matched_topics, lessons) with beginner fallback when matched_topics is empty.
- routers/vocabulary.py: get_today(), paginate_items(items, page, per_page) (raises
  HTTPException 404), and the GET /vocabulary/due/ endpoint whose query (cards with
  next_review_date <= today, selectinload(Card.deck), ordered by next_review_date asc,
  mapped to DueCardResponse with deck_name or "Unknown Deck") is inline at lines 477-498.
- Enums: schemas.grammar.DifficultyLevel, schemas.grammar_reference.GrammarReferenceCategory,
  schemas.grammar_exercise.ExerciseType. Summary model: schemas.grammar.LessonSummary.
- Importing any router loads config.settings, which requires MISTRAL_API_KEY. Do NOT fix
  that here (it's issue #275); document it. CI sets MISTRAL_API_KEY=dummy_test_key.
- Tests use tests/conftest.py: `test_db` fixture (fresh in-memory schema per test) and
  `AsyncTestingSession` session factory; ORM models models.card.Card, models.deck.Deck.

GOAL:
1. Refactor routers/vocabulary.py: add
   `async def query_due_cards(db: AsyncSession, today: date) -> list[DueCardResponse]`
   containing the existing query + mapping, with a docstring. The endpoint calls
   `query_due_cards(db, get_today())` then `paginate_items(...)`. No behaviour change.
2. Add `mcp>=2.3,<3` to requirements.txt after `anthropic>=2.0.0`.
3. Create mcp_server/ with:
   a. results.py: constants INVALID_ARGUMENTS="invalid_arguments",
      LESSON_NOT_FOUND="lesson_not_found", PAGE_OUT_OF_RANGE="page_out_of_range",
      DATABASE_UNAVAILABLE="database_unavailable";
      `tool_result(payload: dict) -> CallToolResult` (TextContent with
      json.dumps(payload, ensure_ascii=False, default=str), structured_content=payload);
      `tool_error(code, message, hint, details=None) -> CallToolResult` with body
      {"error": {"code", "message", "hint", "details"?}} and is_error=True.
      Payloads must be JSON-safe: use model_dump(mode="json").
   b. server.py:
      - SERVER_INSTRUCTIONS: 3-5 sentences: the server serves the learner's French course
        content and SRS due cards; it's read-only; typical flow: recommend_lessons_for_focus_area
        or search_grammar_reference to find content, get_lesson for depth, list_exercises
        for practice items, get_due_cards for vocabulary to weave in.
      - class FLCMCPServer(MCPServer): override
        `async def call_tool(self, name, arguments, context=None)`: try super(); on
        ToolError whose __cause__ is pydantic.ValidationError, return
        tool_error(INVALID_ARGUMENTS, "Some arguments are invalid.",
        "Fix the listed arguments and call the tool again.",
        {"errors": [{"field": ".".join(loc), "problem": msg}, ...]}) using
        `errors(include_url=False, include_input=False)`; re-raise anything else.
      - `create_server(session_factory=None) -> FLCMCPServer`: name "french-language-coach",
        instructions=SERVER_INSTRUCTIONS. Default session_factory is
        database.async_session_maker, imported inside the function. Register exactly
        five tools as closures, each with
        ToolAnnotations(title=<Title Case>, read_only_hint=True, destructive_hint=False,
        idempotent_hint=True, open_world_hint=False). Every parameter uses
        Annotated[..., Field(description=...)]; `limit: int` Field(ge=1, le=50) default 10;
        `page: int` Field(ge=1) default 1.
      - Private helper `_paginate_or_error(paginate_fn, items, page, limit)` returning
        (page_items, pagination) or a CallToolResult page_out_of_range error with
        details {"page": page, "max_page": max(1, ceil(len(items)/limit))} and a hint to
        call again with page between 1 and max_page. Catch fastapi.HTTPException only.
      - Paged success payloads include: total, page, total_pages, has_more
        (page < total_pages), and the items list.
      Tools:
      1. search_grammar_reference(query: Optional[str]=None,
         category: Optional[GrammarReferenceCategory]=None,
         difficulty: Optional[DifficultyLevel]=None, limit, page).
         get_references() -> filter_references(...) -> _paginate_or_error(paginate, ...).
         Payload {"query", "category", "difficulty", total..., "results": [ref.model_dump(mode="json")]}.
         If total == 0, add "hint": try a shorter term, the English or French name
         (e.g. "subjunctive" / "subjonctif"), or a category filter without a query.
         Description: searches the grammar reference (definitions, examples, common
         pitfalls) by case-insensitive substring over term, definition, examples and
         pitfalls; filters combine with AND; use for quick facts on a grammar point;
         use get_lesson for a full structured lesson; results paged, max 50 per page.
      2. get_lesson(lesson_id: str). get_lessons(); found -> {"lesson": lesson.model_dump(mode="json")}.
         Not found -> tool_error(LESSON_NOT_FOUND, f"No lesson with id '{lesson_id}'.",
         hint "Use one of the suggested ids, or call recommend_lessons_for_focus_area
         or search_grammar_reference to find lesson ids.",
         {"did_you_mean": difflib.get_close_matches(lesson_id.lower(), ids, n=3, cutoff=0.5)}).
         Description: returns one full lesson (explanation sections, examples) by its id;
         ids look like "subjunctive" or "passe-compose"; get ids from
         recommend_lessons_for_focus_area.
      3. list_exercises(topic: Optional[str]=None, exercise_type: Optional[ExerciseType]=None,
         difficulty: Optional[DifficultyLevel]=None, limit, page).
         get_exercises() -> filter_exercises(exs, exercise_type, topic, difficulty) -> page.
         Payload {"topic", "exercise_type", "difficulty", total..., "exercises": [...model_dump(mode="json")]}.
         If total == 0: "hint" naming the available exercise topics
         (sorted set of topics over get_exercises().values()) and suggesting
         search_grammar_reference or get_lesson to build practice when no exercise exists.
         Description: lists practice exercises with their answers; topics are broad
         (e.g. "Verbs", "Sentence Structure") and match by case-insensitive substring;
         leave filters empty to browse; answers are included, so don't reveal them before
         the learner responds.
      4. recommend_lessons_for_focus_area(focus_area: str). get_recommendations(focus_area).
         Payload {"focus_area", "matched_topics", "fallback_used": not matched_topics,
         "lessons": [LessonSummary(id,title,topic,difficulty).model_dump(mode="json")]}.
         If fallback_used, add "hint": no topic matched; these are general beginner
         lessons, not targeted; try a grammar term such as "subjunctive" or "passé composé".
         Description: maps a weakness or feedback focus area (English or French, e.g.
         "accord du participe passé", "subjunctive") to up to 3 relevant lessons; returns
         lesson ids for get_lesson.
      5. get_due_cards(limit, page). `async with session_factory() as db:`
         cards = await vocabulary.query_due_cards(db, vocabulary.get_today())
         (call via the module so get_today can be patched). On sqlalchemy.exc.SQLAlchemyError
         return tool_error(DATABASE_UNAVAILABLE, "The vocabulary database could not be read.",
         "Start the backend once (uvicorn main:app) to create and seed the database, or check
         DATABASE_URL.", {"reason": type(exc).__name__}). Page with paginate_items.
         Payload {"today": iso date, total..., "cards": [...model_dump(mode="json")]}.
         If total == 0: "hint": no cards are due today.
         Description: returns the learner's vocabulary flashcards due for spaced-repetition
         review today (next review date on or before today), oldest first, with front
         (French), back (English) and deck name; use it to quiz due words or weave them
         into other practice; read-only, doesn't record reviews.
   c. __init__.py: docstring; `from mcp_server.server import create_server`; __all__.
      Keep the import light so `python3 -m mcp_server` and the tests work.
   d. __main__.py: `REPO_ROOT = Path(__file__).resolve().parent.parent`;
      `bootstrap() -> Path` inserts str(REPO_ROOT) at sys.path[0] if missing, os.chdir(REPO_ROOT),
      returns REPO_ROOT; `main()` calls bootstrap(), then imports create_server and
      calls create_server().run("stdio"). Imports of project modules happen after bootstrap().
      Nothing prints to stdout.
4. Tests in tests/test_mcp_server.py as listed under DELIVERABLES.
5. README.md updates as listed under DELIVERABLES.

CONSTRAINTS:
- No file paths, JSON loading, glob or SQL/ORM queries inside mcp_server/ (AC1).
- No session commit/add/delete/merge/flush, no file writes, exactly five tools (AC3).
- No LLM calls, no services/llm imports, no import of main.py, no stdout prints.
- Don't modify config.py, database.py, routers/__init__.py, routers/grammar.py, frontend/.
- PEP 8, type hints, module docstrings, Args/Returns/Raises docstrings like routers/grammar.py.
- 80%+ coverage for every mcp_server module; don't add to ALLOWLIST in
  scripts/check_module_coverage.py; routers/vocabulary.py coverage must not drop.
- Existing tests, including tests/test_vocabulary_simple.py, pass unchanged.

EXAMPLES:
- search_grammar_reference {"query":"subjonctif"} -> results include ids subjunctive-present,
  subjunctive-past. {"query":"zzzz"} -> total 0 + hint, is_error False.
- get_lesson {"lesson_id":"subjunctive"} -> lesson.title "Subjunctive Mood".
  {"lesson_id":"subjonctif"} -> is_error, code lesson_not_found, did_you_mean contains "subjunctive".
- list_exercises {"topic":"Verbs"} -> non-empty. {"topic":"subjunctive"} -> total 0, hint
  lists available topics. {"page":99} -> page_out_of_range, max_page 1.
  {"difficulty":"hard"} -> invalid_arguments with field "difficulty".
- recommend_lessons_for_focus_area {"focus_area":"Accord du subjonctif"} -> matched_topics
  contains "Moods", fallback_used False, 1-3 lessons. {"focus_area":"pronunciation"} ->
  fallback_used True + hint.
- get_due_cards with cards due -3d, 0d, +1d in deck "Food" -> 2 cards oldest first,
  deck_name "Food". {"limit":1,"page":2} -> second due card, has_more False.
  Empty DB -> total 0 + hint. Engine without tables -> database_unavailable.
- get_lesson {} -> invalid_arguments, field "lesson_id". {"limit":0} -> invalid_arguments.

ACCEPTANCE CRITERIA (issue #268):
- [ ] Tools reuse the routers' query logic, with no duplicated data access
- [ ] Tool descriptions and input schemas follow Anthropic's tool-writing guidance; errors
      return structured messages the model can recover from
- [ ] Read-only by default
- [ ] A test suite calls each tool through an MCP client
- [ ] README section with a config snippet and a demo transcript

DELIVERABLES:
- requirements.txt (+ mcp>=2.3,<3); routers/vocabulary.py (query_due_cards extract);
  mcp_server/__init__.py, results.py, server.py, __main__.py.
- tests/test_mcp_server.py: in-process Client fixtures over create_server(AsyncTestingSession);
  tool-list/annotation/schema tests; per-tool success, empty-hint and error tests;
  invalid_arguments tests; database_unavailable test; read-only tests (row state unchanged,
  source scan for write calls); AC1 source scan (no select(, json.load, Path(, glob, data/);
  bootstrap() test from another cwd; one stdio end-to-end test launching
  mcp_server/__main__.py with sys.executable from a tmp cwd.
- README.md: "MCP Server (Claude Code / Claude Desktop)" section between "LLM Integration"
  and "Why Mistral" (run command, `claude mcp add` + .mcp.json + claude_desktop_config.json
  snippets with absolute paths, interpreter note, MISTRAL_API_KEY note citing #275, DB note,
  tool table, error shape and codes, demo transcript whose tool calls/results are real
  output against the dev DB and whose assistant text is marked illustrative); add
  mcp_server/ to Project Structure.
- Verify: python3 -m pytest tests/ -v --tb=short; then
  python3 -m pytest tests/ --cov --cov-report=term-missing --cov-report=json and
  python3 scripts/check_module_coverage.py coverage.json.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, 2026-11-16.

- `requirements.txt`: added `mcp>=2.3,<3` (installed 2.3.0; no change to fastapi/starlette versions).
- `routers/vocabulary.py`: new `query_due_cards(db, today)` holds the due-card query and mapping; `GET /vocabulary/due/` now calls it, then `paginate_items`. Behaviour unchanged (existing vocabulary tests pass untouched).
- `mcp_server/results.py`: `tool_result()`, `tool_error()` and the four error-code constants.
- `mcp_server/server.py`: `FLCMCPServer` (overrides `call_tool` to return `invalid_arguments` for schema failures), `SERVER_INSTRUCTIONS`, `create_server(session_factory=None)` registering the five tools with read-only annotations, shared `Limit`/`Page`/`Difficulty` parameter types, `_paginate_or_error()` and `_paging_fields()` helpers.
- `mcp_server/__main__.py`: `bootstrap()` (repo root on `sys.path` + `chdir`) and `main()` → `create_server().run("stdio")`. Both `python3 -m mcp_server` and the absolute-path form verified over stdio.
- `mcp_server/__init__.py`: exports `create_server`.
- `tests/test_mcp_server.py`: 36 tests. Tool listing, annotations, descriptions, enums/bounds and required args; per-tool success, empty-result hints and error codes; `invalid_arguments` (bad enum, `limit` 0 and 51, missing `lesson_id`); unknown tool left to the SDK; `database_unavailable`; read-only checks (card rows unchanged; source scan for write calls); AC1 source scan; `bootstrap()` from another cwd; `main()` runs stdio; one stdio end-to-end test launching `mcp_server/__main__.py` from a temp cwd.
- `README.md`: new "MCP Server (Claude Code / Claude Desktop)" section (run, Claude Code `claude mcp add` + `.mcp.json`, Claude Desktop config, interpreter note, `MISTRAL_API_KEY` note citing #275, database note, tool table, error shape and codes, demo transcript); `mcp_server/` and `tests/test_mcp_server.py` added to Project Structure.

---

## Human Review Notes

### Changes Made
- [x] **Test fixture shape.** The prompt implied a fixture yielding an open `Client`. That fails at teardown with anyio's "Attempted to exit cancel scope in a different task than it was entered in", because pytest-asyncio runs fixture setup and teardown in different tasks. The `mcp_client` fixture now returns a small `InProcessClient` wrapper that opens a real `mcp.Client` inside the test for each call. Every tool is still called through an MCP client.
- [x] **AC1 source-scan patterns.** Dropped `Path(` from the forbidden list: `__main__.py` needs `Path(__file__)` to find the repo root, which isn't data access. Checks for `\.glob\(`, `read_text\(` and `open\(` instead of a bare `glob`.
- [x] **Reference search expectations.** The prompt expected `query="subjonctif"` to return both subjunctive entries. Only `subjunctive-present` matches, because the past entry's term is English ("Subjunctive Past"). The tests check `subjonctif` → `subjunctive-present` and `subjunctive` → `subjunctive-past` separately.
- [x] **Recommendation test input.** Used `focus_area="subjonctif"` (matches only `Moods`) instead of `"Accord du subjonctif"`. "accord" also maps to "Nouns and Adjectives", and the router sorts matches by id and caps them at 3, so the subjunctive lesson drops out of that result. This is existing router behaviour and out of scope (see Issues Found).
- [x] **Extra tests** beyond the prompt list: `test_required_arguments`, `test_unknown_tool_is_left_to_the_sdk`, `test_main_runs_stdio`, and `get_due_cards` page-past-end.
- [x] **Demo transcript.** Uses real tool output captured over stdio against the local dev DB. The assistant turns, including a short follow-up correction, are labelled illustrative.

### Quality Checks
- [x] Code follows existing patterns (thin adapters over router helpers; `Args`/`Returns`/`Raises` docstrings)
- [x] Tests pass at 80%+ coverage
- [x] Documentation updated
- [x] All acceptance criteria met

### Issues Found
- **Recommendation cap can hide the most relevant lesson (existing behaviour, not changed).** `get_recommendations()` sorts matched lessons by id and keeps 3, so a multi-topic focus area like "Accord du subjonctif" returns `articles`, `conditional`, … but not `subjunctive`. Worth a follow-up issue if the study-coach agent (#270) relies on this tool.
- **`paginate()` with zero results and `page > 1`** returns an empty page rather than a 404, because `total_pages` is 0. That's existing router behaviour; the tools inherit it (empty result plus hint).
- **API-key import dependency** documented in the README; fix tracked in #275.
- The 30 warnings in `tests/test_mcp_server.py` all come from existing code: `datetime.utcnow` defaults in `models/base.py`.

---

## Verification

- [x] All acceptance criteria from issue #268 are met
  - [x] AC1: tools call `routers.grammar` helpers and `routers.vocabulary.query_due_cards` / `paginate_items`; the endpoint shares the same query; a source scan guards against file/SQL access in `mcp_server/`
  - [x] AC2: purpose-first descriptions with limits and cross-tool guidance; every parameter described; enums for difficulty/category/exercise type; `limit` bounded 1-50; structured errors (`invalid_arguments`, `lesson_not_found` + `did_you_mean`, `page_out_of_range` + `max_page`, `database_unavailable`) with hints
  - [x] AC3: exactly five tools, all `read_only_hint=True` / `destructive_hint=False`; no session writes (tested by row state and a source scan)
  - [x] AC4: `tests/test_mcp_server.py` calls each tool through `mcp.Client` (in-process and over stdio)
  - [x] AC5: README section with Claude Code and Claude Desktop config snippets and a demo transcript
- [x] Tests pass with 80%+ coverage: `python3 -m pytest tests/ --cov --cov-report=term-missing --cov-report=json` → **1106 passed, 1 xfailed**; total coverage **96.17%**. Per module: `mcp_server/__init__.py` 100%, `__main__.py` 94%, `results.py` 100%, `server.py` 98%, `routers/vocabulary.py` 97%. `python3 scripts/check_module_coverage.py coverage.json` → PASS, with no ALLOWLIST additions.
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced (`GET /vocabulary/due/` behaviour unchanged; existing tests untouched)
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
