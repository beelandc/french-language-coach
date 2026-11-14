# SPDD Analysis: Mistral provider handles content-chunk responses (ThinkChunk)

**GitHub Issue**: #243
**Issue Title**: Mistral provider: handle content-chunk responses (ThinkChunk) instead of passing them through as text
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/243
**Artifact ID**: FLC-055-202611140939
**Created**: 2026-11-14 09:39
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
> Starting a new practice conversation fails with the default Mistral provider. `POST /sessions/` returns **500 Internal Server Error**, and in the UI clicking the start button appears to do nothing.
>
> The Mistral SDK can return `message.content` as a **list of content chunks**, including a reasoning `ThinkChunk`, instead of a plain string. `MistralProvider._to_result` passes that list through unchanged as `LLMResult.text`, and saving the session fails when it tries to JSON-serialise the `ThinkChunk`.
>
> ## Observed behaviour
> - **Steps:** with `CHAT_PROVIDER` unset (Mistral, `mistral-large-latest`), open `/scenarios`, pick a scenario and click start.
> - **UI:** nothing happens and no navigation to `/chat/:id`.
> - **API log** (repeated for each click; relevant frames only):
>
> ```
> INFO:     127.0.0.1:56933 - "POST /sessions/ HTTP/1.1" 500 Internal Server Error
> ERROR:    Exception in ASGI application
> Traceback (most recent call last):
>   ...
>   File "routers/sessions.py", line 71, in create_session
>     new_session.messages_list = messages
>   File "models/session.py", line 32, in messages_list
>     self.messages = json.dumps(value)
>   File ".../json/encoder.py", line 180, in default
>     raise TypeError(f'Object of type {o.__class__.__name__} '
> TypeError: Object of type ThinkChunk is not JSON serializable
> ```
>
> ## Root cause
> 1. `services/llm/mistral_provider.py`, `_to_result()` (around line 75) returns `text=choice.message.content` unchanged.
> 2. In the installed `mistralai` SDK (2.4.4), `AssistantMessage.content` is typed `OptionalNullable[AssistantMessageContent]`: either a `str`, a list of content chunks, or `None`. A `ThinkChunk` (`type: "thinking"`, fields `thinking: List[...]`, `signature`, `closed`) carries the model's reasoning. Text arrives in separate chunks (`type: "text"`).
> 3. `LLMResult.text` is declared `str` (`services/llm/base.py:32`), but nothing enforces it, so the list flows on through `LLMService.get_chat_response()`, which returns `result.text` (`services/llm/service.py:120`).
> 4. The router stores it as message content, and `Session.messages_list`'s setter calls `json.dumps`, which raises on the SDK object.
>
> The code before #228 also read `message.content` directly, so the likely trigger is that the model behind `mistral-large-latest` now returns reasoning chunks. This hasn't been confirmed against the live API.
>
> ## Impact
> | Path | File | Effect |
> |---|---|---|
> | Session creation (opening greeting) | `routers/sessions.py:55-73` | **500.** The `try/except` around the greeting only wraps the LLM call, not the `messages_list` assignment at line 71, so the `TypeError` escapes. |
> | Sending a chat message | `routers/messages.py:36-44` | Expected to **500** the same way at `session.messages_list = messages`. Not separately reproduced, since sessions can't be created. |
> | End-of-session feedback | `services/llm/service.py:148-156` | **Silent degradation.** `json.loads(list)` raises `TypeError`, which is caught, so the user gets the default fallback feedback and the call is logged with status `error` and `invalid_json: ...`. |
> | LLM metrics (`llm_calls`) | `services/llm/service.py:109-119` | Chat calls are logged as **`success`** even though the response was unusable, which skews error rates in `/metrics/llm` and the #237 dashboard. |
> | Claude provider | `services/llm/anthropic_provider.py:111` | Not affected: it already joins only `type == "text"` blocks. |
>
> **Workaround:** set `CHAT_PROVIDER=anthropic` (and `FEEDBACK_PROVIDER=anthropic`) in `.env`.
>
> ## Proposed fix
> In `MistralProvider._to_result` (or a small helper such as `_content_text(content)` in `mistral_provider.py`), turn `message.content` into the model's final text:
> - `str`: return it as is.
> - list of chunks: concatenate the text of `type == "text"` chunks in order, and skip `thinking` chunks and any other non-text types. Chunks may be SDK objects or plain dicts, so read them with the existing `_get()` helper.
> - `None` or no text chunks: raise an error so the call is recorded as a failure (status `error`) instead of storing empty or invalid content. A reasonable message would be `"empty_response: Mistral returned no text content"`; check how `_timed_call` records provider exceptions and keep that behaviour.
>
> This mirrors what the Anthropic provider already does with content blocks.
>
> ## Acceptance criteria
> - [ ] With Mistral as the chat provider, `POST /sessions/` succeeds and stores a plain-string greeting when the SDK returns text plus reasoning chunks
> - [ ] `POST /sessions/{id}/messages/` stores and returns a plain-string reply in the same situation
> - [ ] Feedback parses correctly when the JSON arrives in text chunks alongside reasoning chunks; no fallback feedback and no `invalid_json` error row
> - [ ] Reasoning (`thinking`) content is never saved to session messages or shown to the learner
> - [ ] A response with no text content is recorded in `llm_calls` with status `error`, not `success`
> - [ ] Plain-string responses behave exactly as before (no regression)
> - [ ] Unit tests in `tests/test_llm_providers.py` with mocked responses cover: plain string; text + thinking chunks (SDK objects and dicts); multiple text chunks; thinking only; `None` content
> - [ ] An integration-level test (e.g. in `tests/test_llm_provider_integration.py` or the sessions router tests) shows session creation succeeds with a chunked mock response
> - [ ] Backend coverage stays at or above 80% for the touched modules; `python3 -m pytest tests/` passes
>
> ## Out of scope
> - Storing or showing model reasoning (could become a separate feature)
> - Changing the default provider or model
> - Hardening `routers/sessions.py` so a greeting failure never 500s session creation (worth a follow-up)
> - Frontend error display: `ScenarioSelector.tsx` sets an `error` state rendered at `data-testid="scenario-error"` on failure, yet nothing visible appeared. Check during this issue whether the message renders where the user can see it, and open a separate issue if it doesn't.
>
> ## Notes
> - Related: #228 (provider layer), #236 / #237 (metrics API and dashboard, affected by the mislabelled `success` rows)
> - Never read or print `.env`; reproduce with mocked SDK responses in tests
> - SDK models to reference: `mistralai.client.models.assistantmessage.AssistantMessage`, `mistralai.client.models.thinkchunk.ThinkChunk`

---

## Background

Issue #228 added the provider layer (`services/llm/`), with Mistral (`mistral-large-latest`) as the default for both chat and feedback. Its `MistralProvider._to_result` (`services/llm/mistral_provider.py:61-80`) assumes `choice.message.content` is a string. The Mistral SDK (`mistralai` 2.4.4) types it as `str | list[ContentChunk] | None`, and reasoning-capable models put a `ThinkChunk` (`type="thinking"`) in front of one or more `TextChunk`s (`type="text"`). The list reaches `Session.messages_list` (`models/session.py:30-32`), where `json.dumps` raises `TypeError`, so `POST /sessions/` returns 500. This blocks the app's core flow, starting a conversation, on the default configuration.

The Anthropic provider already deals with the same shape: `AnthropicProvider._to_result` (`services/llm/anthropic_provider.py:101-122`) joins only `type == "text"` blocks and raises `LLMProviderError(msg, result)` when there's no usable output (a refusal). The service's `_timed_call` (`services/llm/service.py:173-207`) records any provider exception as an `llm_calls` row with status `error`, keeping the usage from `LLMProviderError.result` so the failed call can still be costed.

## Business Value

- Restores the default learner flow (start a scenario, chat, get feedback) without the `CHAT_PROVIDER=anthropic` workaround.
- Learners never see the model's internal reasoning, only the in-character French reply.
- Keeps the model-evaluation metrics (#236/#237) honest: unusable responses count as errors, and feedback stops silently falling back to the default 50/50/50 scores.
- Makes the provider layer robust to Mistral models that return reasoning chunks, which matters for the Claude-vs-Mistral comparison milestone.

---

## Scope In

- [ ] A helper in `services/llm/mistral_provider.py` (`_content_text(content)`) that turns `message.content` into the final text: `str` unchanged, a chunk list reduced to its concatenated `type == "text"` chunks, everything else skipped.
- [ ] `MistralProvider._to_result` uses the helper and raises `LLMProviderError("empty_response: Mistral returned no text content", result)` when content is `None` or contains no text chunks, carrying the usage so the failed call is costed.
- [ ] Unit tests in `tests/test_llm_providers.py`: plain string; text + thinking (real SDK `TextChunk`/`ThinkChunk` objects and plain dicts); multiple text chunks; thinking only; `None` content; non-text chunk types skipped; usage kept on the raised error.
- [ ] A test-fake extension in `tests/llm_fakes.py` so `make_mistral_response` accepts chunk-list or `None` content.
- [ ] Integration tests in `tests/test_llm_provider_integration.py`: session creation with chunked content stores a string greeting; a chat message with chunked content stores and returns a string; feedback with chunked JSON parses (no fallback, `success` row); a thinking-only response is logged as `error`.
- [ ] Check the frontend `scenario-error` visibility (manual or code review), and open a follow-up issue if it isn't visible.

## Scope Out

- [ ] Storing, logging or displaying model reasoning (`thinking` content).
- [ ] Changing the default provider (`mistral`) or model (`mistral-large-latest`), or adding request parameters (e.g. turning reasoning off) to the Mistral call.
- [ ] Hardening `routers/sessions.py` against non-LLM errors at the `messages_list` assignment (follow-up).
- [ ] Changing `routers/messages.py` error handling. A provider error still propagates as it does today.
- [ ] Frontend code changes. Any visibility problem becomes a separate issue.
- [ ] Changes to the Anthropic provider or `LLMService`.

---

## Acceptance Criteria (ACs)

1. **AC1: Session creation with chunked content**
   **Given** Mistral is the chat provider and the SDK returns `content=[ThinkChunk, TextChunk("Bienvenue !")]`
   **When** the client calls `POST /sessions/`
   **Then** the response is 200, `messages[0]` is `{"role": "assistant", "content": "Bienvenue !"}` (a plain string), and one `chat` row with status `success` is recorded.

2. **AC2: Chat message with chunked content**
   **Given** an active session and a chunked Mistral response
   **When** the client calls `POST /sessions/{id}/messages/`
   **Then** the response `content` is the plain-string text, and the stored session messages contain that string.

3. **AC3: Feedback with chunked JSON**
   **Given** Mistral is the feedback provider and the SDK returns `[ThinkChunk, TextChunk(<valid feedback JSON>)]`
   **When** the client calls `POST /sessions/{id}/feedback/`
   **Then** the parsed feedback matches the JSON (not the fallback), and the `feedback` row has status `success` with no `invalid_json` error.

4. **AC4: Reasoning never stored**
   **Given** any chunked response that includes thinking text (e.g. "Je réfléchis…")
   **When** it's processed for chat or feedback
   **Then** the thinking text appears in neither `LLMResult.text`, the stored session messages nor the API response.

5. **AC5: No text content becomes an error**
   **Given** the SDK returns `content=None` or only `ThinkChunk`s
   **When** a chat call is made
   **Then** `LLMProviderError("empty_response: Mistral returned no text content")` is raised, and `llm_calls` gets one row with status `error`, that error message, and the reported token usage. No `success` row is written.

6. **AC6: Plain strings unchanged**
   **Given** the SDK returns `content="Très bien."`
   **When** chat or feedback is called
   **Then** `LLMResult.text == "Très bien."`, and all existing provider and integration tests pass unchanged.

7. **AC7: Unit tests** cover plain string; text + thinking (SDK objects and dicts); multiple text chunks; thinking only; `None`.

8. **AC8: Integration test** shows session creation succeeds with a chunked mock response.

9. **AC9: Quality gates.** `python3 -m pytest tests/` passes, and coverage for `services/llm/mistral_provider.py` stays at or above 80% (target 100%).

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **`MistralProvider` / `_to_result`**: `services/llm/mistral_provider.py:24-80`. Maps the SDK response to `LLMResult`. This is the defect site (`text=choice.message.content`, line 75).
- **`_get(obj, name)`**: `services/llm/mistral_provider.py:15-21`. Reads a field from an SDK object or a dict. Reused for chunks.
- **`LLMResult`**: `services/llm/base.py:20-36`. Provider-neutral result. `text: str` isn't enforced at runtime.
- **`LLMProviderError(message, result)`**: `services/llm/base.py:39-49`. Signals a call that finished without usable output, and carries usage for logging.
- **`LLMService._timed_call`**: `services/llm/service.py:173-207`. Records an `error` row on any exception (using `exc.result` for `LLMProviderError`) and re-raises.
- **`LLMService.get_chat_response` / `get_feedback`**: `services/llm/service.py:81-171`. Record the `success` row and return text, or parse the feedback JSON.
- **`AnthropicProvider._to_result`**: `services/llm/anthropic_provider.py:101-122`. Reference pattern: joins text blocks and raises `LLMProviderError` with usage.
- **SDK chunk models**: `mistralai.client.models.textchunk.TextChunk` (`text`, `type="text"`) and `mistralai.client.models.thinkchunk.ThinkChunk` (`thinking: List[TextChunk | ReferenceChunk | ToolReferenceChunk]`, `type="thinking"`, `signature`, `closed`). Other chunk types (`ImageURLChunk`, `ReferenceChunk`, `DocumentURLChunk`, …) can also appear in the union.
- **Routers**: `routers/sessions.py:51-73` (greeting; `try/except Exception: pass` around the LLM call), `routers/messages.py:36-49` (chat turn; errors propagate), `routers/feedback.py:32` (feedback).
- **`Session.messages_list` setter**: `models/session.py:30-32` (`json.dumps`).
- **Test fakes**: `tests/llm_fakes.py` (`make_mistral_response`, `make_mistral_client`). `make_mistral_response(text, ...)` already places `text` into `message.content` unchanged, so passing a list or `None` works without changing its signature.

### New Concepts Required

- **`_content_text(content) -> Optional[str]`** (module-level helper in `mistral_provider.py`): returns the final text, or `None` when there's no text content.
- **Error constant `EMPTY_RESPONSE_ERROR = "empty_response: Mistral returned no text content"`** in `mistral_provider.py`, so tests and code share the string.

### Key Business Rules

- **Only final text reaches the learner.** `thinking` chunks and any non-`text` chunk are discarded.
- **Text chunks are concatenated in order** with no separator, matching how Mistral streams text across chunks and how the Anthropic provider joins blocks.
- **No usable text means a failed call.** It's recorded with status `error` and usage kept, never as `success` with empty or invalid content.
- **Plain-string content is returned exactly as before.**

---

## Strategic Approach

### Solution Direction

1. Add `_content_text(content)` to `mistral_provider.py`:
   - `isinstance(content, str)` → return `content`.
   - `isinstance(content, list)` → collect `_get(chunk, "text")` for chunks where `_get(chunk, "type") == "text"` and the text is a `str`. Return `"".join(parts)` if there are any parts, else `None`.
   - anything else (`None`, unexpected type) → `None`.
2. In `_to_result`, build `LLMResult` with usage as today. If `_content_text` returns `None`, set `text=""` on the result and `raise LLMProviderError(EMPTY_RESPONSE_ERROR, result)`. Otherwise return the result with the text.
3. Extend the unit tests (`tests/test_llm_providers.py`) using real SDK `TextChunk`/`ThinkChunk` instances plus dict-shaped chunks.
4. Add integration tests (`tests/test_llm_provider_integration.py`) for sessions, messages, feedback and the error row.
5. Run the full suite and coverage, check the frontend error visibility, and fill in the prompt artifact's review sections.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Where to normalize content | In the provider (local, mirrors Anthropic) vs. in `LLMService` (generic, but leaks a Mistral detail into the shared layer) | **Provider**, as the issue proposes. Each provider owns its SDK shape. |
| Error type for no text | `LLMProviderError` (keeps usage via `.result`; `_timed_call` already logs it) vs. `ValueError` (usage lost) | **`LLMProviderError(msg, result)`**, the same pattern as the Anthropic refusal. |
| Empty plain string `""` | Raise (stricter) vs. return as-is (identical to today) | **Return as-is.** AC6 requires plain strings to behave exactly as before. Flagged below as an ambiguity. |
| Text join separator | `""` vs. `"\n"` | **`""`**. Chunks are fragments of one message, and the Anthropic provider uses `""` too. |
| Test chunk objects | Real SDK classes (`TextChunk`, `ThinkChunk`) vs. `SimpleNamespace` | **Real SDK classes** for the object case (they prove compatibility with the actual types, and the SDK is already a dependency) plus **plain dicts** for the dict case. |
| Changing `make_mistral_response` | New parameter vs. reuse `text` positional (already passes through) | **Reuse**: pass a list/`None` as `text`. Optionally rename the param to `content` with a docstring note. Keep the signature backward compatible. |

### Alternatives Considered

- **Make `Session.messages_list` coerce or serialize SDK objects.** Rejected: it hides the bug, could store reasoning, and doesn't fix feedback or metrics.
- **Disable reasoning in the Mistral request** (e.g. a `prompt_mode` parameter). Rejected: it changes the request payload and model behaviour, which is out of scope. It also doesn't guard against other chunk-shaped responses.
- **Validate `LLMResult.text` in `LLMService`** (raise if not `str`). Rejected as the primary fix because it would turn the bug into an error instead of extracting the text. Could be a future defensive check, but isn't needed here.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Empty plain string (`content=""`) | The issue says "`str`: return it as is" and "no regression", but also "no text content → error". | Return `""` unchanged (today's behaviour). Treat only `None` and chunk lists without text as errors. Mention in the PR as a possible follow-up. |
| Chunk lists whose text chunks are all `""` | Is `[TextChunk("")]` "no text content"? | Treat as no text (joined result is empty, so raise `empty_response`). An empty reply from chunks is unusable, and this matches "no text chunks" in spirit. |
| Frontend error visibility | The issue asks to check it during this issue. | Check by reading code and, if feasible, manually. The error `<div>` renders at the top of `ScenarioSelector` (`frontend/src/components/ScenarioSelector.tsx:63`), above the difficulty selector and grid, so it may be off-screen when a card lower down is clicked. If confirmed, open a follow-up issue (no frontend changes here). |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| `[ThinkChunk, TextChunk]` (SDK objects) | The reported production shape | Return the text only |
| Same shape as dicts (`{"type": "thinking", ...}`, `{"type": "text", "text": ...}`) | SDK may surface untyped extras as dicts | Same, via `_get` |
| Multiple text chunks (`"Bon"`, `"jour"`) | Text may be split | `"Bonjour"`, in order |
| Text chunks interleaved with thinking | Ordering | Concatenate the text chunks in their original order |
| Thinking only | Model produced no answer | `LLMProviderError(empty_response)` with usage |
| `content=None` | SDK allows null | `LLMProviderError(empty_response)` with usage |
| Other chunk types (e.g. `ReferenceChunk`, `{"type": "image_url"}`) | Union includes them | Skipped |
| Text chunk with non-str `text` (malformed dict) | Defensive | Skipped |
| Empty list `[]` | No content | `LLMProviderError(empty_response)` |
| Plain string `""` | Regression guard | Returned as-is (see ambiguity) |
| Greeting raises `empty_response` | Session router swallows LLM errors | Session created without greeting (existing behaviour), `error` row recorded |
| Chat turn raises `empty_response` | Messages router doesn't catch | Propagates as today (500 via the app), `error` row recorded, user message not persisted |
| Feedback raises `empty_response` | `get_feedback` re-raises provider errors | Same as any provider failure today, `error` row recorded |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| SDK `TextChunk`/`ThinkChunk` constructor or import path differs across versions | Tests fail on upgrade | Import from `mistralai.client.models` (verified in the installed 2.4.4). Dict-based tests cover the shape independent of the SDK. |
| `getattr(chunk, "type")` on SDK objects returns a non-str or enum | Text chunks missed | Verified: `TextChunk.type` defaults to the literal `"text"`. Covered by SDK-object tests. |
| Raising in `_to_result` changes session-creation behaviour when there's no text | Session created without greeting | Acceptable and consistent with the existing `try/except`. Asserted in a test. |
| Hidden coupling: other code reads `LLMResult.text` assuming a non-empty str | — | After the fix, `text` is always a `str` on success. |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Session creation stores a string greeting | Yes | Integration test with a chunked mock |
| AC2 | Chat message stores and returns a string | Yes | Integration test |
| AC3 | Feedback parses chunked JSON, `success` row | Yes | Integration test with the feedback router |
| AC4 | Thinking never stored or shown | Yes | Assert the thinking text is absent in unit and integration tests |
| AC5 | No text → `error` row | Yes | Unit (raises, keeps usage) and integration (`llm_calls` row) |
| AC6 | Plain strings unchanged | Yes | Existing tests plus an explicit test |
| AC7 | Unit test matrix | Yes | `tests/test_llm_providers.py` |
| AC8 | Integration test for session creation | Yes | `tests/test_llm_provider_integration.py` |
| AC9 | Suite passes, ≥80% coverage | Yes | `pytest --cov=services/llm` |

**AC Coverage Summary**: 9 of 9 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Usage (tokens) of an empty-response call is still logged so cost metrics stay accurate.
- The frontend error-visibility check and a possible follow-up issue (from the issue's out-of-scope notes).
- README: no API, config or setup change is expected. Confirm during verification and leave README untouched unless the LLM-provider section describes content handling.

---

## REASONS Canvas

### Requirements
Fix `MistralProvider._to_result` so `LLMResult.text` is always the final plain-string text. Thinking and other non-text chunks are dropped, and no text at all raises `LLMProviderError("empty_response: Mistral returned no text content", result)`. Session creation, chat turns and feedback work with chunked responses. Empty responses are logged as `error`. Plain strings are unchanged. Unit and integration tests are listed in AC7/AC8. The suite passes with ≥80% coverage.

### Examples
- `content="Très bien."` → `text="Très bien."`
- `content=[ThinkChunk(thinking=[TextChunk(text="Je réfléchis…")]), TextChunk(text="Bienvenue !")]` → `text="Bienvenue !"`
- `content=[{"type": "thinking", "thinking": [{"type": "text", "text": "…"}]}, {"type": "text", "text": "Bonjour"}]` → `text="Bonjour"`
- `content=[TextChunk(text="Bon"), TextChunk(text="jour")]` → `text="Bonjour"`
- `content=[ThinkChunk(...)]` → raises `LLMProviderError("empty_response: Mistral returned no text content")`, with `.result.input_tokens` as reported
- `content=None` → same error
- `POST /sessions/` with a chunked greeting → 200, `messages[0]["content"] == "Bienvenue !"`, one `success` row
- `POST /sessions/{id}/feedback/` with `[ThinkChunk, TextChunk(VALID_FEEDBACK_JSON)]` → `overall_score == 69`, row status `success`, `error_message is None`
- `POST /sessions/` with a thinking-only greeting → 200 with `messages == []`, one `error` row with the `empty_response` message

### Architecture
FastAPI routers → `services/llm/service.py` (`LLMService`: routing, timing, `llm_calls` recording) → provider (`services/llm/mistral_provider.py`, `anthropic_provider.py`) → SDK. Providers normalize SDK responses into `LLMResult` and signal unusable output with `LLMProviderError`. The fix stays inside the Mistral provider. No schema, dependency or router changes.

### Standards
PEP 8 and the existing module style (type hints, short docstrings on public and module-level helpers). Given/When/Then comments in tests where helpful, as in the existing tests. Pytest async tests use `@pytest.mark.asyncio`. Coverage ≥80% per touched module (aim for 100% on `mistral_provider.py`). Never read `.env`; all SDK calls are mocked. Commit `fix(#243): …`. README updated only if API, config or setup changes (none expected).

### Omissions
No storage or display of reasoning. No default provider/model change or request-parameter changes. No session-router hardening. No messages-router error-handling changes. No frontend changes (follow-up issue if the error isn't visible). No Anthropic provider or `LLMService` changes.

### Notes
- `_timed_call` records `str(exc)` as `error_message` and `exc.result` as usage for `LLMProviderError` (`services/llm/service.py:191-205`), so raising from the provider is enough. No service change is needed.
- `make_mistral_response(text, ...)` passes `text` straight into `message.content`, so tests can pass lists or `None`.
- Real chunk classes: `from mistralai.client.models import TextChunk, ThinkChunk` (verified importable; `ThinkChunk(thinking=[TextChunk(text=...)])`).
- The session router swallows greeting errors (`routers/sessions.py:64-67`), so a thinking-only greeting yields a session with no messages plus an `error` row.

### Solutions
Mirror `AnthropicProvider._to_result` (`services/llm/anthropic_provider.py:101-122`): build the `LLMResult` with usage first, then raise `LLMProviderError(message, result)` on unusable output. Reuse `_get()` for dict/object chunk access. Follow the test structure in `tests/test_llm_providers.py::TestMistralProvider` and `tests/test_llm_provider_integration.py::TestDefaultMistralPath`.
