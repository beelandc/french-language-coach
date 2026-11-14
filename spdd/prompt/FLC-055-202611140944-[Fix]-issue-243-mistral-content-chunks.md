# SPDD Prompt: Mistral provider handles content-chunk responses (ThinkChunk)

**GitHub Issue**: #243
**Issue Title**: Mistral provider: handle content-chunk responses (ThinkChunk) instead of passing them through as text
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/243
**Artifact ID**: FLC-055-202611140944
**Created**: 2026-11-14 09:44
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-055-202611140939-[Analysis]-issue-243-mistral-content-chunks.md`

---

## Context

### Current Codebase State
- The LLM provider layer (#228) routes chat and feedback through `LLMService` (`services/llm/service.py`) to a provider. Mistral (`mistral-large-latest`) is the default for both.
- `MistralProvider._to_result` (`services/llm/mistral_provider.py:61-80`) sets `LLMResult.text = choice.message.content` unchanged. In `mistralai` 2.4.4 that content can be a `str`, a list of content chunks (`ThinkChunk` with `type="thinking"`, `TextChunk` with `type="text"`, and other chunk types), or `None`.
- When the content is a list, it flows to `Session.messages_list` (`models/session.py:30-32`), where `json.dumps` raises `TypeError: Object of type ThinkChunk is not JSON serializable`, so `POST /sessions/` returns 500. Feedback silently falls back to the default scores, and chat calls are mislogged as `success`.
- `AnthropicProvider._to_result` already joins only `type == "text"` blocks and raises `LLMProviderError(message, result)` on unusable output. `LLMService._timed_call` records any provider exception as an `error` row, using `exc.result` for usage when it's an `LLMProviderError`.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `services/llm/mistral_provider.py` | Mistral provider (**the file to change**) | `_get()` 15-21; `MistralProvider.chat()` 38-47; `feedback()` 49-59; `_to_result()` 61-80 |
| `services/llm/base.py` | Shared types | `LLMResult` 20-36; `LLMProviderError(message, result)` 39-49 |
| `services/llm/service.py` | Routing, timing, call recording (no change) | `get_chat_response()` 81-120; `get_feedback()` 122-171; `_timed_call()` 173-207 |
| `services/llm/anthropic_provider.py` | Reference pattern (no change) | `_to_result()` 101-122 |
| `routers/sessions.py` | Greeting on session creation (no change) | 51-73 (`try/except Exception: pass` around the LLM call) |
| `routers/messages.py` | Chat turn (no change) | 36-49 |
| `routers/feedback.py` | Feedback endpoint (no change) | 32 |
| `tests/llm_fakes.py` | Fake SDK responses/clients | `make_mistral_response(text, ...)` puts `text` into `message.content` unchanged; `make_mistral_client()` |
| `tests/test_llm_providers.py` | Provider unit tests | `TestMistralProvider` 42-120 |
| `tests/test_llm_provider_integration.py` | API-level tests with mocked SDKs | `make_settings()`, `create_session()`, `TestDefaultMistralPath` |
| `mistralai.client.models` | SDK chunk classes (installed 2.4.4) | `TextChunk(text=...)`, `ThinkChunk(thinking=[TextChunk(...)])` |

### Existing Patterns
- **Provider-owned normalization**: each provider maps its SDK response to `LLMResult` in a static `_to_result`.
- **Unusable output → `LLMProviderError(msg, result)`**: build the `LLMResult` with usage first, then raise with it attached (Anthropic refusal, `anthropic_provider.py:109-122`).
- **Object-or-dict access** via `_get(obj, name)` in `mistral_provider.py`.
- **Tests**: `@pytest.mark.asyncio` async tests, an injected mock client via `MistralProvider(api_key="t", client=make_mistral_client(...))`, Given/When/Then comments; integration tests patch `routers.<module>.llm_service` with an `LLMService(settings=make_settings(...), providers={...})`.

---

## Goal

**Primary Objective**: Make `MistralProvider` return only the model's final text as a plain `str`. Concatenate `type == "text"` chunks in order, skip `thinking` and all other chunk types, and raise `LLMProviderError("empty_response: Mistral returned no text content", result)` when there's no text content (`None`, an empty list, or no non-empty text chunks).

**Secondary Objectives**:
- Prove with integration tests that session creation, chat turns and feedback work with chunked responses, and that a text-less response is recorded as an `error` row with usage.
- Check whether the frontend `scenario-error` message is visible to the user on session-creation failure, and open a follow-up issue if it isn't (no frontend code changes in this issue).

---

## Constraints

### Architecture Constraints
- Change only `services/llm/mistral_provider.py` in application code. Don't modify `services/llm/service.py`, `services/llm/base.py`, `services/llm/anthropic_provider.py`, any router, model or schema, or the frontend.
- Don't change the Mistral request payload (`chat()`/`feedback()` arguments) or the default provider/model.
- No new dependencies.
- Plain-string content (including `""`) is returned exactly as before, as agreed in the analysis review.

### Code Quality Constraints
- PEP 8, type hints, matching the existing module style.
- Docstring on the new helper and an updated `_to_result` docstring describing chunk handling.
- Define the error message once as a module-level constant `EMPTY_RESPONSE_ERROR`.

### Testing Constraints
- Backend only (pytest). All SDK calls mocked; never read `.env`.
- Unit tests in `tests/test_llm_providers.py::TestMistralProvider`, using the real SDK classes `TextChunk`/`ThinkChunk` for the "SDK object" cases and plain dicts for the "dict" cases.
- Integration tests in `tests/test_llm_provider_integration.py`.
- `tests/llm_fakes.py` may get a docstring/param note that `text` may be a `str`, a chunk list or `None`. Its signature stays backward compatible.
- `python3 -m pytest tests/ -v --tb=short` passes. Coverage of `services/llm/mistral_provider.py` ≥80% (target 100%).

### Acceptance Criteria
From issue #243:
- [ ] With Mistral as the chat provider, `POST /sessions/` succeeds and stores a plain-string greeting when the SDK returns text plus reasoning chunks
- [ ] `POST /sessions/{id}/messages/` stores and returns a plain-string reply in the same situation
- [ ] Feedback parses correctly when the JSON arrives in text chunks alongside reasoning chunks; no fallback feedback and no `invalid_json` error row
- [ ] Reasoning (`thinking`) content is never saved to session messages or shown to the learner
- [ ] A response with no text content is recorded in `llm_calls` with status `error`, not `success`
- [ ] Plain-string responses behave exactly as before (no regression)
- [ ] Unit tests in `tests/test_llm_providers.py` with mocked responses cover: plain string; text + thinking chunks (SDK objects and dicts); multiple text chunks; thinking only; `None` content
- [ ] An integration-level test shows session creation succeeds with a chunked mock response
- [ ] Backend coverage stays at or above 80% for the touched modules; `python3 -m pytest tests/` passes

---

## Examples

### Input/Output Examples
1. **Plain string**: `content="Très bien."` → `LLMResult.text == "Très bien."`
2. **Thinking + text (SDK objects)**: `content=[ThinkChunk(thinking=[TextChunk(text="Je réfléchis…")]), TextChunk(text="Bienvenue !")]` → `text == "Bienvenue !"`
3. **Thinking + text (dicts)**: `content=[{"type": "thinking", "thinking": [{"type": "text", "text": "Je réfléchis…"}]}, {"type": "text", "text": "Bonjour"}]` → `text == "Bonjour"`
4. **Multiple text chunks, interleaved**: `[TextChunk("Bon"), ThinkChunk(...), TextChunk("jour")]` → `"Bonjour"`
5. **Thinking only**: `[ThinkChunk(...)]` with `prompt_tokens=300, completion_tokens=50` → raises `LLMProviderError`, `str(exc) == "empty_response: Mistral returned no text content"`, `exc.result.input_tokens == 300`, `exc.result.output_tokens == 50`
6. **`None`**: `content=None` → same `LLMProviderError`

### Edge Cases
- `[]` → `LLMProviderError` (no text).
- `[TextChunk(text="")]` → `LLMProviderError` (joined text is empty).
- Other chunk types (`{"type": "image_url", ...}`, `{"type": "reference", ...}`) → skipped.
- Malformed dict text chunk (`{"type": "text", "text": None}` or missing `text`) → skipped.
- Unexpected non-str, non-list content (e.g. an int) → treated as no text and raises.
- `""` plain string → returned as `""` (unchanged behaviour).

### Test Cases
```python
from mistralai.client.models import TextChunk, ThinkChunk

THINKING = "Je réfléchis à la réponse…"

@pytest.mark.asyncio
async def test_text_and_thinking_sdk_chunks_return_text_only(self):
    # Given a reasoning response made of real SDK chunk objects
    content = [ThinkChunk(thinking=[TextChunk(text=THINKING)]), TextChunk(text="Bienvenue !")]
    client = make_mistral_client(make_mistral_response(content))

    # When
    result = await MistralProvider(api_key="t", client=client).chat([], "SYS", "m")

    # Then only the final text is returned, as a plain str
    assert result.text == "Bienvenue !"
    assert THINKING not in result.text

@pytest.mark.asyncio
async def test_thinking_only_raises_empty_response_with_usage(self):
    content = [ThinkChunk(thinking=[TextChunk(text=THINKING)])]
    client = make_mistral_client(make_mistral_response(content, prompt_tokens=300, completion_tokens=50))

    with pytest.raises(LLMProviderError, match="empty_response") as exc_info:
        await MistralProvider(api_key="t", client=client).chat([], "SYS", "m")

    assert str(exc_info.value) == EMPTY_RESPONSE_ERROR
    assert (exc_info.value.result.input_tokens, exc_info.value.result.output_tokens) == (300, 50)

# Integration
@pytest.mark.asyncio
async def test_session_creation_with_chunked_greeting(self, client, test_db):
    mistral = make_mistral_client(make_mistral_response(
        [ThinkChunk(thinking=[TextChunk(text=THINKING)]), TextChunk(text="Bienvenue !")]
    ))
    service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

    with patch("routers.sessions.llm_service", service):
        response = client.post("/sessions/", json={"scenario_id": "cafe_order"})

    assert response.status_code == 200
    assert response.json()["messages"] == [{"role": "assistant", "content": "Bienvenue !"}]
    stored = client.get(f"/sessions/{response.json()['id']}").json()
    assert THINKING not in str(stored)
```

---

## Deliverables

### Code Changes
- [ ] `services/llm/mistral_provider.py`: add `EMPTY_RESPONSE_ERROR`, add `_content_text(content) -> Optional[str]`, update `_to_result` to use it and raise `LLMProviderError(EMPTY_RESPONSE_ERROR, result)` when it returns `None`; import `LLMProviderError`.

### Tests
- [ ] `tests/test_llm_providers.py::TestMistralProvider`: plain string (explicit, chat + empty string); text + thinking with SDK objects; text + thinking with dicts; multiple/interleaved text chunks; other chunk types and malformed text chunks skipped; thinking only → error with usage; `None` → error; empty list → error; feedback JSON in chunks returns the JSON string.
- [ ] `tests/test_llm_provider_integration.py`: new `TestMistralContentChunks` class:
  - session creation with chunked greeting → 200, string greeting, `success` row, no thinking text stored
  - chat message with chunked reply → 200, string reply returned and stored, no thinking text
  - feedback with chunked JSON → parsed feedback (not fallback), `feedback` row `success`, `error_message is None`
  - thinking-only greeting → session created with `messages == []`, one `chat` row with status `error` and `error_message == EMPTY_RESPONSE_ERROR`, tokens recorded
- [ ] `tests/llm_fakes.py`: docstring note that `make_mistral_response`'s `text` may be a string, chunk list or `None`.

### Documentation
- [ ] Docstrings on `_content_text` and `_to_result`.
- [ ] README.md: no change expected (no API/config/setup change). Confirm during verification.
- [ ] Frontend error-visibility check: record the result here and open a follow-up issue if needed.

---

## Actual Prompt

```
Implement issue #243 in the French Language Coach repo: make the Mistral provider handle content-chunk
responses (ThinkChunk) instead of passing them through as text.

CONTEXT:
- Backend: FastAPI + async SQLAlchemy. LLM calls go through services/llm/ (issue #228):
  routers -> LLMService (services/llm/service.py) -> provider (services/llm/mistral_provider.py,
  services/llm/anthropic_provider.py) -> SDK.
- services/llm/mistral_provider.py: MistralProvider._to_result(response) (lines 61-80) builds
  LLMResult(text=choice.message.content, ...) with usage normalised from response.usage via the
  module helper _get(obj, name), which reads SDK objects or dicts.
- In mistralai 2.4.4, AssistantMessage.content is str | list[ContentChunk] | None. Reasoning models
  return [ThinkChunk(type="thinking", thinking=[TextChunk...], signature, closed), TextChunk(type="text",
  text=...)] and possibly other chunk types. Chunks may be SDK objects or plain dicts.
- Today the list ends up in Session.messages_list (models/session.py:30-32) -> json.dumps TypeError ->
  POST /sessions/ 500; feedback json.loads(list) -> silent fallback; chat calls logged as success.
- services/llm/base.py: LLMResult(text: str, input_tokens, output_tokens, cache_read_tokens,
  stop_reason); LLMProviderError(message, result=None) carries usage of a failed call.
- services/llm/service.py: _timed_call() catches any provider exception, records an llm_calls row with
  status "error", error_message=str(exc), and usage from exc.result when exc is LLMProviderError, then
  re-raises. No change needed there.
- Reference pattern: AnthropicProvider._to_result (services/llm/anthropic_provider.py:101-122) joins
  only type == "text" blocks with "" and raises LLMProviderError(msg, result) on refusal after
  building the result with usage.
- Router behaviour (unchanged): routers/sessions.py swallows greeting exceptions (session created with
  no messages); routers/messages.py lets them propagate; routers/feedback.py calls get_feedback.
- Tests: tests/llm_fakes.py make_mistral_response(text, prompt_tokens, completion_tokens, ...) places
  `text` into choices[0].message.content as-is (so a list or None can be passed); make_mistral_client
  (response). Unit tests: tests/test_llm_providers.py::TestMistralProvider. API tests:
  tests/test_llm_provider_integration.py (make_settings(), create_session(db, messages_json),
  patch("routers.<module>.llm_service", LLMService(settings=..., providers={"mistral":
  MistralProvider("m", client=mock)})), fixtures `client`, `test_db`).
- SDK classes for tests: from mistralai.client.models import TextChunk, ThinkChunk;
  ThinkChunk(thinking=[TextChunk(text="...")]).

GOAL:
1. In services/llm/mistral_provider.py:
   - Add module constant EMPTY_RESPONSE_ERROR = "empty_response: Mistral returned no text content".
   - Add module function _content_text(content: Any) -> Optional[str]:
       * str -> return unchanged (including "").
       * list -> concatenate, in order and with "" as separator, _get(chunk, "text") for every chunk
         where _get(chunk, "type") == "text" and the text is a str; skip thinking and every other
         chunk type; return the joined text if it is non-empty, else None.
       * anything else (None, other types) -> None.
     Give it a docstring explaining the three cases and that reasoning is never returned.
   - In _to_result: compute usage exactly as today, call _content_text(choice.message.content), build
     LLMResult(text=text if text is not None else "", ...). If text is None, raise
     LLMProviderError(EMPTY_RESPONSE_ERROR, result). Otherwise return the result. Update its
     docstring. Import LLMProviderError from services.llm.base.
2. Add tests (see DELIVERABLES) and run the full backend suite with coverage.
3. Check whether frontend ScenarioSelector's error (data-testid="scenario-error", rendered at the top
   of the component above the difficulty selector and grid) is visible when session creation fails;
   if not, open a follow-up GitHub issue. No frontend code changes.

CONSTRAINTS:
- Application code changes ONLY in services/llm/mistral_provider.py. Do not modify service.py, base.py,
  anthropic_provider.py, routers, models, schemas or frontend. Do not change the Mistral request
  payload, default provider or model. No new dependencies.
- Plain-string content behaves exactly as before; existing tests must pass unchanged.
- PEP 8, type hints, docstrings, match the module's style.
- All SDK calls mocked; never read .env.
- python3 -m pytest tests/ -v --tb=short passes; coverage of services/llm/mistral_provider.py >= 80%
  (aim 100%).

EXAMPLES:
- "Très bien." -> text "Très bien."
- [ThinkChunk(thinking=[TextChunk(text="Je réfléchis…")]), TextChunk(text="Bienvenue !")] -> "Bienvenue !"
- [{"type": "thinking", "thinking": [{"type": "text", "text": "…"}]}, {"type": "text", "text": "Bonjour"}]
  -> "Bonjour"
- [TextChunk("Bon"), ThinkChunk(...), TextChunk("jour")] -> "Bonjour"
- [{"type": "image_url", ...}, {"type": "text", "text": None}, {"type": "text", "text": "ok"}] -> "ok"
- [ThinkChunk(...)] with prompt_tokens=300, completion_tokens=50 -> LLMProviderError, str ==
  EMPTY_RESPONSE_ERROR, exc.result.input_tokens == 300, output_tokens == 50
- None, [], [TextChunk(text="")] -> LLMProviderError(EMPTY_RESPONSE_ERROR)
- "" -> "" (unchanged)
- POST /sessions/ with chunked greeting -> 200, messages == [{"role": "assistant", "content":
  "Bienvenue !"}], one chat llm_calls row status "success"
- POST /sessions/ with thinking-only greeting -> 200, messages == [], one chat row status "error",
  error_message == EMPTY_RESPONSE_ERROR, input_tokens recorded

ACCEPTANCE CRITERIA:
- POST /sessions/ succeeds and stores a plain-string greeting with text + reasoning chunks
- POST /sessions/{id}/messages/ stores and returns a plain-string reply with chunked content
- Feedback parses JSON delivered in text chunks alongside reasoning chunks; no fallback, no
  invalid_json error row
- Thinking content never saved to session messages or returned to the learner
- No text content -> llm_calls row status "error", not "success"
- Plain strings unchanged
- Unit tests: plain string; text + thinking (SDK objects and dicts); multiple text chunks; thinking
  only; None
- Integration test: session creation succeeds with chunked mock response
- Coverage >= 80% for touched modules; python3 -m pytest tests/ passes

DELIVERABLES:
- services/llm/mistral_provider.py: EMPTY_RESPONSE_ERROR, _content_text(), updated _to_result().
- tests/test_llm_providers.py (TestMistralProvider additions): explicit plain string + empty
  string; SDK-object thinking+text; dict thinking+text; multiple/interleaved text chunks; other chunk
  types and malformed text chunks skipped; thinking only -> error with usage; None -> error; [] ->
  error; [TextChunk("")] -> error; feedback() with chunked JSON returns the JSON string.
- tests/test_llm_provider_integration.py: class TestMistralContentChunks with session-creation,
  chat-message, feedback and thinking-only-greeting tests (assert thinking text never appears in
  responses or stored session data; assert llm_calls statuses and error_message).
- tests/llm_fakes.py: docstring note on make_mistral_response accepting str / chunk list / None.
- No README change unless API/config/setup changes (none expected).
- Frontend visibility check result recorded in this artifact; follow-up issue opened if needed.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above.

- `services/llm/mistral_provider.py`: added `EMPTY_RESPONSE_ERROR`, added `_content_text(content)` (str unchanged; chunk list → concatenated `type == "text"` chunk text in order, skipping thinking, other types and malformed chunks; otherwise `None`), and updated `_to_result` to build the `LLMResult` with usage first and raise `LLMProviderError(EMPTY_RESPONSE_ERROR, result)` when there's no text. `message.content` is now read with `_get()`, like the other response fields.
- `tests/test_llm_providers.py`: new `TestMistralContentChunks` (13 test cases). Covers plain string, empty plain string, SDK-object and dict thinking+text, multiple/interleaved text chunks, skipped other/malformed chunks, thinking only (error with usage, cache-adjusted), and `None`/`[]`/empty text chunk/empty text dict/unexpected type (error). Also feedback JSON split across chunks. Uses the real SDK `TextChunk`/`ThinkChunk` classes.
- `tests/test_llm_provider_integration.py`: new `TestMistralContentChunks` with 4 API-level tests:
  - session creation with a chunked greeting
  - chat message with a chunked reply
  - feedback with chunked JSON (no fallback, `success` row, `error_message` null)
  - thinking-only greeting (session created with no messages, one `error` row with `empty_response` and tokens)
  
  Each asserts the thinking text never appears in responses or stored session data.
- `tests/test_llm_service.py`: `test_none_content_falls_back` replaced by `test_no_text_content_raises_and_records_error` (see Human Review Notes).
- `tests/llm_fakes.py`: docstring note that `make_mistral_response`'s `text` may be a str, chunk list or `None`.
- `README.md`: one paragraph in the LLM provider section describing Mistral chunk handling and the `empty_response` error.

---

## Human Review Notes

### Changes Made
- [x] **Deviation from "existing tests must pass unchanged"**: `tests/test_llm_service.py::TestFeedback::test_none_content_falls_back` (from #228) encoded that Mistral feedback with `content=None` returns the all-50 fallback. With the provider now raising `empty_response` for no-text content, `get_feedback` re-raises the provider error (as it does for any provider failure), so the feedback endpoint returns 500, the session stays open, and the call is logged as `error` with usage. The user was asked and chose **"raise for both chat and feedback"** (consistent with the issue's proposed fix and with #229, which removes the fabricated fallback). The test was replaced by `test_no_text_content_raises_and_records_error`, which asserts the raise and the `error` row (message, session id, tokens).
- [x] **README updated** (the prompt expected no change): the README's LLM provider section already documents per-provider reply handling ("thinking blocks are ignored" for Claude, the feedback fallback). Mistral's behaviour changed, so a short paragraph was added.
- [x] `_to_result` reads `message.content` via `_get()` instead of attribute access. A harmless robustness tweak consistent with the rest of the method.

### Quality Checks
- [x] Code follows existing patterns (mirrors `AnthropicProvider._to_result`: result with usage first, then `LLMProviderError(msg, result)`)
- [x] Tests pass at 80%+ coverage (`services/llm/mistral_provider.py` 100%; all `services/llm` modules 99–100%)
- [x] Documentation updated (docstrings, README paragraph)
- [x] All acceptance criteria met

### Issues Found
- **Frontend error visibility (issue out-of-scope item)**: checked in a real browser (Playwright/Chromium against the Vite dev server, all `/sessions` requests intercepted in the browser so nothing reached the backend), with `POST /sessions/` returning 500 at 1280×800 and 390×844. `scenario-error` renders `HTTP error! status: 500`, but after clicking a card below the first row it's off-screen (scrollY 572px desktop / 1672px mobile). It's plain red text with no alert role, focus or pending state. Opened **#244** "Scenario page: session-start errors are not visible to the learner". No frontend changes in this issue.
- `python3 -m pytest --cov=.` reports low coverage for `routers/sessions.py`, `routers/messages.py` and `routers/feedback.py` (38–46%) even though they're exercised by these tests. That's a pre-existing measurement artifact of the TestClient running the app in another thread, and those files aren't changed by this issue.

---

## Verification

- [x] All acceptance criteria from issue #243 are met
  - [x] `POST /sessions/` stores a plain-string greeting with text + reasoning chunks (`test_session_creation_with_chunked_greeting`)
  - [x] `POST /sessions/{id}/messages/` stores and returns a plain-string reply (`test_chat_message_with_chunked_reply`)
  - [x] Feedback parses chunked JSON; no fallback, no `invalid_json` row (`test_feedback_with_chunked_json`)
  - [x] Thinking content never saved or returned (asserted in all integration tests and the SDK-object unit test)
  - [x] No text content → `llm_calls` status `error` (`test_thinking_only_greeting_logged_as_error`, `test_no_text_content_raises_and_records_error`)
  - [x] Plain strings unchanged (`test_plain_string_unchanged`, `test_empty_plain_string_unchanged`; all pre-existing provider and integration tests pass unchanged)
  - [x] Unit test matrix in `tests/test_llm_providers.py`
  - [x] Integration test for session creation with a chunked mock
  - [x] Coverage ≥80% for touched modules; full suite passes
- [x] Tests pass with 80%+ coverage: `python3 -m pytest tests/`: **774 passed, 1 xfailed** (the xfail is pre-existing); `services/llm/mistral_provider.py` 100%
- [x] Code follows project conventions (PEP 8, type hints, docstrings)
- [x] Documentation is updated (README LLM provider section)
- [x] No breaking changes introduced, except the agreed feedback behaviour for no-text responses (500 + `error` row instead of fabricated fallback scores)
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
