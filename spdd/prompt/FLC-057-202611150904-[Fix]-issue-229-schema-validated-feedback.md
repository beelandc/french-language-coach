# SPDD Prompt: Schema-validated feedback with retry, no silent fallback

**GitHub Issue**: #229
**Issue Title**: Schema-validated feedback with retry, no silent fallback
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/229
**Artifact ID**: FLC-057-202611150904
**Created**: 2026-11-15 09:04
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [spdd/analysis/FLC-057-202611150855-[Analysis]-issue-229-schema-validated-feedback.md](../analysis/FLC-057-202611150855-[Analysis]-issue-229-schema-validated-feedback.md)

**Decisions confirmed by the user (2026-11-15)**, resolving the analysis's open points:
1. Validate and retry for **both** providers (D1 / A1).
2. Tighten `FeedbackResponse`: scores 0–100, typed `ExampleCorrection` (D2 / A3).
3. **Strict** validation, extra keys ignored (D3).
4. `LLMProviderError` (refusal, `empty_response`) → 502 without retry. Other SDK or network exceptions stay out of scope and keep their current behaviour (A2).

---

## Context

### Current Codebase State
- `LLMService.get_feedback` calls the configured provider once, `json.loads` the text, and on failure returns a copy of `FEEDBACK_FALLBACK` (all-50 scores, "Bonne tentative"), recording an `error` row with `invalid_json: …`. It never validates against `FeedbackResponse`.
- `routers/feedback.py` stores whatever the service returns, sets `ended_at`, commits, then builds `FeedbackResponse(**feedback)`. A schema mismatch therefore 500s *after* the session is closed.
- `MistralProvider.feedback` uses JSON mode. `AnthropicProvider.feedback` uses structured outputs with `FEEDBACK_JSON_SCHEMA`.
- Frontend: `api()` turns a non-2xx `detail` into `Error.message`. `useSessions.getFeedback` sets the hook `error` and re-throws. `ChatInterface.handleEndSession` also sets its local `error`, so the message renders twice. `FeedbackView` shows an error with no retry.
- Pydantic v2 behaviour, verified locally: `Model.model_validate_json(text, strict=True)` rejects `"72"`, `72.0` and `true` for `int` (`int_type`), applies `Field(ge, le)` (`less_than_equal`), rejects arrays (`model_type`), reports bad JSON as `json_invalid`, accepts nested models from JSON objects, and ignores extra keys by default.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `services/llm/base.py` | Provider interface, shared prompt and schema | `LLMProviderError` (36-47), `FEEDBACK_PROMPT` (50-67), `FEEDBACK_FALLBACK` (70-79, **delete**), `FEEDBACK_JSON_SCHEMA` (83-117), `build_transcript` (120), `LLMProvider.feedback` (135) |
| `services/llm/service.py` | Routing, timing, recording | `get_feedback` (122-171), `_timed_call` (173-207) |
| `services/llm/mistral_provider.py` | Mistral provider | `feedback` (84-94) |
| `services/llm/anthropic_provider.py` | Claude provider | `feedback` (90-102), `MAX_TOKENS` |
| `services/llm/__init__.py` | Public exports | `__all__` |
| `services/llm/recorder.py` | `record_call` (best-effort row, truncates `error_message` to 1000) | 20-67 |
| `schemas/session.py` | `FeedbackResponse` | 70-77 |
| `routers/feedback.py` | `POST /sessions/{id}/feedback/` | `generate_feedback` |
| `frontend/src/components/ChatInterface.tsx` | Chat view, End Session | `handleEndSession` (123-136), error render (195-196) |
| `frontend/src/components/FeedbackView.tsx` | Feedback page | `loadFeedback` effect (20-44), error state (86-94) |
| `frontend/src/utils/storybookMocks.tsx` | `MockSessionsProvider` for stories | props (90-98), `getFeedback` (204-) |
| `frontend/src/components/ChatInterface.stories.tsx`, `FeedbackView.stories.tsx` | Stories | add error stories |
| `tests/llm_fakes.py` | SDK fakes, `VALID_FEEDBACK_JSON` | `make_*_client(side_effect=[...])` |
| `tests/test_llm_service.py` | Service tests; fallback tests to replace | `TestFeedback` (196-277) |
| `tests/test_llm_providers.py` | Provider request-shape tests | `test_feedback_uses_json_mode_and_shared_prompt`, `test_feedback_request_uses_structured_output` |
| `tests/test_llm_provider_integration.py` | Router-level tests with injected providers | `make_settings`, `create_session`, `patch("routers.feedback.llm_service", service)` |
| `frontend/cypress/e2e/conversation-flow.cy.ts` | E2E chat → feedback | `cy.intercept` feedback (61) |
| `README.md` | Feedback Mode (≈ line 517) and Cost and latency logging (≈ 526) | replace the "until #229" sentence |

### Existing Patterns
- **Usage-carrying errors**: `LLMProviderError(message, result)`. `_timed_call` records an error row from `exc.result` and re-raises.
- **Error-message prefixes**: `empty_response: …`, `refusal: …`, `invalid_json: …`.
- **Provider injection in tests**: `LLMService(settings=make_settings(...), providers={"mistral": MistralProvider("m", client=mock)})`.
- **Given/When/Then comments** in pytest tests. `@pytest.mark.asyncio`.
- **Frontend Jest**: `*.jest.test.tsx`, `jest.mock('../utils/api', ...)`, React Testing Library, `data-testid` selectors.

---

## Goal

**Primary Objective**: Feedback is returned only when a model's output passes strict `FeedbackResponse` validation, with exactly one corrective retry on `invalid_json` / `schema_mismatch`, and an explicit 502 (session left open) when the retry also fails. The silent fallback is removed.

**Secondary Objectives**:
- One `llm_calls` row per attempt, with classified error prefixes, so a schema-validity rate per model is computable.
- `LLMProviderError`s from the feedback call also return 502 (no retry).
- The frontend shows the 502 message once and offers **Retry feedback** (chat view) and **Try again** (feedback page).
- The README describes the new behaviour.

---

## Constraints

### Architecture Constraints
- All LLM calls stay behind `services/llm/`. No SDK calls from routers.
- No DB schema change (no `attempt` column), no new dependencies, no new directories.
- Do not change `FEEDBACK_PROMPT` text (#123), the default provider or model, Mistral's JSON mode, or Claude's effort settings.
- `focus_area` stays `str` (#223 will narrow it).
- Do not add `minimum`/`maximum` to `FEEDBACK_JSON_SCHEMA` (Claude structured outputs may reject numeric constraints). Pydantic enforces bounds.
- The router must not modify the session before the LLM call succeeds (`record_call` commits the shared DB session).
- Validation and retry live in `LLMService`, so the eval harness (#231) gets identical behaviour when calling the service directly.

### Code Quality Constraints
- PEP 8, type hints, docstrings on new public functions and classes, matching `services/llm/` style.
- Update module and function docstrings that mention the fallback or "until #229".
- TypeScript strict-clean (`npx tsc -b`), `npm run lint` clean for changed files.

### Testing Constraints
- 80%+ coverage on changed backend modules (`pytest --cov`).
- Frontend tests must be `*.jest.test.tsx` so Jest discovers them. Confirm with `npx jest --listTests`. Plain `*.test.tsx` files are not run by any runner.
- Stories are exercised by `npm run test` (Vitest Storybook project). New stories must render.
- Cypress: add a scenario. It requires the backend and dev server running, so report honestly whether it was run.

### Acceptance Criteria
1. Invalid JSON or a schema mismatch triggers exactly one retry that includes the error message.
2. After a failed retry, `POST /sessions/{id}/feedback` returns a 502 with a clear message, and the session stays open for a second attempt.
3. No code path returns fabricated scores (the all-50 / "Bonne tentative" fallback is removed).
4. `llm_calls` records retries as separate rows, so the eval can report a schema-validity rate per model.
5. The frontend shows the 502 error and lets the user retry feedback generation.

---

## Examples

### Input/Output Examples
1. **Rescue after invalid JSON (Mistral)**
   - Attempt 1 text: `{"grammar_score": 72, "vocabulary_score"` (truncated)
   - Row 1: `status=error`, `error_message` starts `invalid_json: Invalid JSON: EOF while parsing`
   - Attempt 2 request `messages`: `[system FEEDBACK_PROMPT, user transcript, assistant <attempt-1 text>, user <correction containing the error>]`, still `response_format={"type": "json_object"}`
   - Attempt 2 text: `VALID_FEEDBACK_JSON` → row 2 `status=success` → returns the dict (`overall_score` 69)

2. **Schema mismatch (Claude)**
   - Attempt 1 text: `VALID_FEEDBACK_JSON` with `"grammar_score": "bien"`
   - Row 1 `error_message`: `schema_mismatch: grammar_score: Input should be a valid integer`
   - Attempt 2 `messages=[user transcript, assistant <attempt-1 text>, user <correction>]`, same `system`, still `output_config.format` json_schema

3. **Double failure → 502**
   - Both attempts return `pas du JSON` → two error rows → `FeedbackValidationError`
   - API: `502 {"detail": "Feedback could not be generated: the AI returned invalid feedback twice. Your session is still open — please try again."}`
   - `GET /sessions/{id}` → `ended_at: null`, `feedback: null`. A following POST with valid output → 200.

4. **Valid on first try** → exactly one provider call, one success row.

5. **Refusal / empty response** → one error row (`refusal: …` / `empty_response: …`), no retry, API 502 `{"detail": "Feedback could not be generated: the AI service returned an unusable response. Your session is still open — please try again."}`.

### Edge Cases
- Score `120` or `-1` → `schema_mismatch` (bound error), then retry.
- JSON array `[1, 2, 3]` → `schema_mismatch` (`Input should be an object`).
- Extra key `"note": "…"` → valid. The returned dict omits it.
- Correction missing `explanation` → `schema_mismatch: example_corrections.0.explanation: Field required`.
- Empty text (Claude, no text block) → `invalid_json`. The retry omits the assistant turn (Claude rejects empty assistant content) and sends only the correction user turn after the transcript.
- A provider exception on the retry → attempt 1 row plus attempt 2 error row (from `_timed_call`). The exception propagates. Router: 502 if it's an `LLMProviderError`, unchanged otherwise.
- `db=None` → validation and retry still happen, no rows.
- Very long validation error → the correction text caps the error at 1,500 chars. `record_call` already caps rows at 1,000.

### Test Cases
```python
@pytest.mark.asyncio
async def test_invalid_json_retried_once_with_error_then_succeeds(self, test_db):
    # Given Mistral returns broken JSON, then valid feedback
    client = make_mistral_client(side_effect=[
        make_mistral_response('{"grammar_score": 72', prompt_tokens=50, completion_tokens=5),
        make_mistral_response(VALID_FEEDBACK_JSON, prompt_tokens=90, completion_tokens=60),
    ])
    service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

    # When
    feedback = await service.get_feedback(HISTORY, db=test_db, session_id=3)

    # Then: exactly two calls, the second includes the error, two rows
    assert feedback["overall_score"] == 69
    assert client.chat.complete_async.await_count == 2
    retry_messages = client.chat.complete_async.await_args_list[1].kwargs["messages"]
    assert retry_messages[2] == {"role": "assistant", "content": '{"grammar_score": 72'}
    assert "invalid_json" in retry_messages[3]["content"]
    rows = await all_calls(test_db)
    assert [(r.status, (r.error_message or "").split(":")[0]) for r in rows] == [
        ("error", "invalid_json"), ("success", ""),
    ]

@pytest.mark.asyncio
async def test_failed_retry_returns_502_and_session_stays_open(self, client, test_db):
    session_id = await create_session(test_db, TWO_MESSAGES)
    mistral = make_mistral_client(side_effect=[
        make_mistral_response("pas du JSON"), make_mistral_response("toujours pas"),
        make_mistral_response(VALID_FEEDBACK_JSON),
    ])
    service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

    with patch("routers.feedback.llm_service", service):
        failed = client.post(f"/sessions/{session_id}/feedback/")
        assert failed.status_code == 502
        assert "try again" in failed.json()["detail"]
        assert client.get(f"/sessions/{session_id}").json()["ended_at"] is None
        retried = client.post(f"/sessions/{session_id}/feedback/")

    assert retried.status_code == 200
```

---

## Deliverables

### Code Changes
- [ ] `schemas/session.py`: add `ExampleCorrection(original, corrected, explanation: str)`. `FeedbackResponse` scores `int = Field(ge=0, le=100)`, `example_corrections: list[ExampleCorrection]`, docstrings.
- [ ] `services/llm/base.py`: delete `FEEDBACK_FALLBACK`. Add `FeedbackCorrection` dataclass, `FEEDBACK_CORRECTION_PROMPT` (French), `build_feedback_turns(messages, correction)`, `FeedbackValidationError(LLMProviderError)`. `LLMProvider.feedback(messages, model, correction=None)`. Update the module docstring.
- [ ] `services/llm/mistral_provider.py`, `anthropic_provider.py`: `feedback()` accepts `correction` and uses `build_feedback_turns`. Keep JSON mode / structured output on every attempt.
- [ ] `services/llm/service.py`: `validate_feedback(text)` helper. `get_feedback` becomes a loop of at most two attempts with per-attempt recording. Returns `FeedbackResponse.model_dump()`. Raises `FeedbackValidationError`. Remove `copy`/`json` imports if unused.
- [ ] `services/llm/__init__.py`: export `FeedbackCorrection`, `FeedbackValidationError`.
- [ ] `routers/feedback.py`: catch `FeedbackValidationError` → 502 (twice message), other `LLMProviderError` → 502 (unusable-response message), before any session write. Return the validated feedback.
- [ ] `frontend/src/components/ChatInterface.tsx`: `feedbackError` state. On End Session failure, show one `feedback-error` alert with a `retry-feedback-button`. Call `clearError()` so `sessions-error` doesn't duplicate it. Disable while retrying.
- [ ] `frontend/src/components/FeedbackView.tsx`: **Try again** (`retry-feedback-button`) in the error state, re-running the load.
- [ ] `frontend/src/utils/storybookMocks.tsx`: optional `feedbackError` prop making `getFeedback` reject with that message.
- [ ] Stories: `ChatInterface.stories.tsx` (`FeedbackError` with a play-free render) and `FeedbackView.stories.tsx` (`FeedbackError`).
- [ ] Minimal CSS for the alert/button row in `frontend/src/styles/global.css` if needed (reuse `.error-message`, `.btn-primary`).

### Tests
- [ ] `tests/test_llm_service.py`: replace the fallback tests. Cover rescue (Mistral and Claude), schema mismatch, out-of-range, non-object, extra keys dropped, double failure raises `FeedbackValidationError` with two rows, valid first try = one call, `empty_response` not retried, provider exception on retry, `db=None`, the long error capped in the correction, `FEEDBACK_FALLBACK` no longer importable.
- [ ] `tests/test_llm_providers.py`: correction turns for Mistral (assistant + user, JSON mode kept) and Claude (assistant + user, schema kept). Empty previous output → no assistant turn. No `correction` → request unchanged.
- [ ] `tests/test_feedback_validation.py` (new): `FeedbackResponse` strict validation cases, `FEEDBACK_JSON_SCHEMA` required keys match `FeedbackResponse.model_fields`, and the correction schema matches `ExampleCorrection`.
- [ ] `tests/test_llm_provider_integration.py`: router 502 + session open + second attempt 200. Refusal → 502. Rows per attempt visible via `/metrics/llm/calls`.
- [ ] `frontend/src/components/ChatInterface.jest.test.tsx` (new): 502 → one error shown, retry button calls `getFeedback` again, success navigates, button disabled in flight.
- [ ] `frontend/src/components/FeedbackView.jest.test.tsx` (new): error state shows Try again, and clicking it re-invokes `getFeedback` and renders feedback.
- [ ] `frontend/cypress/e2e/conversation-flow.cy.ts`: intercept 502 then 200, assert the error and retry, then navigation.

### Documentation
- [ ] README *Feedback Mode*: replace the fallback sentence with validation, one retry, 502 and session stays open, frontend retry.
- [ ] README *Cost and latency logging*: one row per attempt, `invalid_json:` / `schema_mismatch:` prefixes, how to compute the schema-validity rate.
- [ ] Docstrings updated as above.

---

## Actual Prompt

```
Implement GitHub issue #229 "Schema-validated feedback with retry, no silent fallback" in the
french-language-coach repo (branch fix/issue-229-schema-validated-feedback). Follow the analysis
spdd/analysis/FLC-057-202611150855-[Analysis]-issue-229-schema-validated-feedback.md and the
user-confirmed decisions: retry for both providers, tighten FeedbackResponse, strict validation,
LLMProviderError -> 502 without retry, other SDK exceptions unchanged.

CONTEXT:
- Backend: FastAPI + async SQLAlchemy. LLM calls go through services/llm/ (LLMService in
  service.py, providers in mistral_provider.py and anthropic_provider.py, shared types and
  prompts in base.py, rows written by recorder.record_call, which commits the caller's DB session
  and never raises).
- Today LLMService.get_feedback (services/llm/service.py:122) calls the provider once, json.loads,
  and on failure returns a deepcopy of FEEDBACK_FALLBACK (services/llm/base.py:70) and records an
  error row "invalid_json: ...". It never validates against schemas.session.FeedbackResponse.
- routers/feedback.py stores the result, sets ended_at and commits before building
  FeedbackResponse(**feedback).
- _timed_call (service.py:173) times one provider call. On an exception it records an error row
  (using LLMProviderError.result for usage) and re-raises.
- MistralProvider.feedback: messages [system FEEDBACK_PROMPT, user build_transcript(messages)],
  response_format={"type": "json_object"}. AnthropicProvider.feedback: system=FEEDBACK_PROMPT,
  messages [user transcript], output_config={"effort": ..., "format": {"type": "json_schema",
  "schema": FEEDBACK_JSON_SCHEMA}}.
- Pydantic v2 FeedbackResponse.model_validate_json(text, strict=True) reports bad JSON as error
  type "json_invalid", rejects "72"/72.0/true for int, applies Field(ge/le), rejects arrays with
  "model_type", and ignores extra keys.
- Frontend: api() (frontend/src/utils/api.ts) throws Error(detail) on non-2xx.
  useSessions.getFeedback sets the hook error and re-throws. ChatInterface.handleEndSession sets
  its own error, so the message shows twice (chat-error + sessions-error). FeedbackView's error
  state has only "Back to Home".

GOAL:
Return feedback only when the model output passes strict FeedbackResponse validation. Retry
exactly once on invalid_json / schema_mismatch, feeding back the previous output and the error.
After a failed retry, raise FeedbackValidationError, which the router maps to HTTP 502 while
leaving the session open. Remove the fallback. Record every attempt as its own llm_calls row.
Make the frontend show the error once and offer a retry.

IMPLEMENTATION STEPS:
1. schemas/session.py
   - class ExampleCorrection(BaseModel): original: str; corrected: str; explanation: str.
   - FeedbackResponse: grammar_score/vocabulary_score/fluency_score/overall_score:
     int = Field(ge=0, le=100); strengths: list[str]; focus_area: str;
     example_corrections: list[ExampleCorrection]. Add docstrings. Keep the serialized shape
     identical (same keys).
2. services/llm/base.py
   - Delete FEEDBACK_FALLBACK and its comment.
   - @dataclass class FeedbackCorrection: previous_output: str; error: str. Docstring: context
     for the single corrective retry.
   - MAX_CORRECTION_ERROR_CHARS = 1500.
   - FEEDBACK_CORRECTION_PROMPT (French), e.g.:
     "Ta réponse précédente n'est pas valide : {error}\n"
     "Corrige-la et retourne UNIQUEMENT le JSON complet, avec exactement la structure demandée "
     "(scores entiers de 0 à 100). Ne retourne RIEN d'autre que le JSON."
   - def build_feedback_turns(messages, correction=None) -> list[dict[str, str]]: returns
     [{"role": "user", "content": build_transcript(messages)}]. When correction is set, also
     appends {"role": "assistant", "content": correction.previous_output} ONLY if
     previous_output.strip() is non-empty, then {"role": "user", "content":
     FEEDBACK_CORRECTION_PROMPT.format(error=correction.error[:MAX_CORRECTION_ERROR_CHARS])}.
   - class FeedbackValidationError(LLMProviderError): raised when feedback output fails
     validation on the initial attempt and the retry. Attributes: errors: list[str] (one per
     attempt). Message: "invalid_feedback: model output failed validation after retry".
   - LLMProvider.feedback(self, messages, model, correction: Optional[FeedbackCorrection] = None).
     Update the docstrings (module docstring: feedback returns raw JSON text; the service
     validates it).
   - Keep FEEDBACK_JSON_SCHEMA as is (no minimum/maximum). Its comment says Pydantic enforces
     the score bounds.
3. Providers
   - MistralProvider.feedback(messages, model, correction=None): messages =
     [{"role": "system", "content": FEEDBACK_PROMPT}] + build_feedback_turns(messages,
     correction). Keep response_format json_object.
   - AnthropicProvider.feedback(messages, model, correction=None): messages =
     build_feedback_turns(messages, correction). Keep system, effort and the json_schema format.
4. services/llm/service.py
   - FEEDBACK_MAX_ATTEMPTS = 2.
   - def validate_feedback(text: str) -> FeedbackResponse: FeedbackResponse.model_validate_json(
     text, strict=True). On pydantic.ValidationError raise FeedbackOutputError (a small private
     ValueError subclass with .kind in {"invalid_json", "schema_mismatch"} and a message). kind is
     "invalid_json" if any error type == "json_invalid", otherwise "schema_mismatch". The message
     is "; ".join(f"{'.'.join(map(str, e['loc'])) or '<root>'}: {e['msg']}" for e in errors).
     str(exc) == f"{kind}: {message}".
   - get_feedback(messages, db=None, session_id=None) -> dict[str, Any]:
       correction = None; errors = []
       for attempt in 1..FEEDBACK_MAX_ATTEMPTS:
           result, latency_ms = await self._timed_call(lambda: provider.feedback(messages, model,
               correction), ...)   # provider errors are recorded and propagate, no retry
           try: feedback = validate_feedback(result.text)
           except FeedbackOutputError as exc:
               record error row (error_message=str(exc)); errors.append(str(exc));
               logger.warning(...attempt...); correction = FeedbackCorrection(result.text,
               str(exc)); continue
           record success row; return feedback.model_dump()
       raise FeedbackValidationError(..., errors=errors, result=last result)
     Only call the provider with correction=None on the first attempt (so first-attempt requests
     are byte-identical to today). Bind the lambda's correction value correctly per iteration.
     Update the module and method docstrings (no fallback; one retry; raises
     FeedbackValidationError).
   - Remove the now-unused copy/json imports and the FEEDBACK_FALLBACK import.
5. services/llm/__init__.py: export FeedbackCorrection and FeedbackValidationError.
6. routers/feedback.py
   - FEEDBACK_INVALID_DETAIL = "Feedback could not be generated: the AI returned invalid feedback
     twice. Your session is still open — please try again."
   - FEEDBACK_UNUSABLE_DETAIL = "Feedback could not be generated: the AI service returned an
     unusable response. Your session is still open — please try again."
   - try: feedback = await llm_service.get_feedback(...)
     except FeedbackValidationError: raise HTTPException(502, FEEDBACK_INVALID_DETAIL)
     except LLMProviderError: raise HTTPException(502, FEEDBACK_UNUSABLE_DETAIL)
     (order matters: subclass first). Other exceptions propagate unchanged. Only after success:
     set ended_at, feedback_dict, commit, return FeedbackResponse(**feedback).
7. Frontend
   - ChatInterface.tsx: add const [feedbackError, setFeedbackError] = useState<string|null>(null)
     and const [isRequestingFeedback, setIsRequestingFeedback] = useState(false). Get clearError
     from useSessions(). handleEndSession: setFeedbackError(null); setIsRequestingFeedback(true);
     try getFeedback -> navigate; catch -> setFeedbackError(message) and clearError() (so
     sessions-error doesn't duplicate it); finally setIsRequestingFeedback(false). Remove the
     console.log of feedback. Render, when feedbackError:
       <div className="error-message feedback-error" role="alert" data-testid="feedback-error">
         <span>{feedbackError}</span>
         <button className="btn-primary" onClick={handleEndSession}
           disabled={isRequestingFeedback || isLoading} data-testid="retry-feedback-button">
           Retry feedback</button>
       </div>
     Keep chat-error for send-message errors.
   - FeedbackView.tsx: extract loadFeedback into a useCallback. The effect calls it. In the error
     state add <button className="btn-primary" data-testid="retry-feedback-button">Try again
     </button> that clears the error, sets isLoading true and re-runs loadFeedback. Keep "Back to
     Home".
   - storybookMocks.tsx: optional prop feedbackError?: string. When set, getFeedback sets
     isLoading false, sets error and throws new Error(feedbackError) after the simulated delay.
   - Stories: ChatInterface FeedbackError (MockSessionsProvider feedbackError=<502 detail>) and
     FeedbackView FeedbackError. Render-only stories (no play functions needed).
   - CSS: reuse existing classes. If needed, add a small .feedback-error rule (flex, gap,
     align-items center, wrap) in global.css.

CONSTRAINTS:
- No LLM SDK calls outside services/llm/. No DB schema change, no new dependencies, no new
  directories. Don't change FEEDBACK_PROMPT text, the default provider or model, Mistral JSON
  mode, or Claude effort. focus_area stays str. No numeric constraints in FEEDBACK_JSON_SCHEMA.
- Router: no session writes before a successful LLM result.
- At most 2 provider calls per feedback request. Only invalid_json/schema_mismatch retry.
- PEP 8, type hints, docstrings. TypeScript passes npx tsc -b. Lint clean on changed files.
- 80%+ coverage on changed backend modules. Frontend tests named *.jest.test.tsx (verify with
  npx jest --listTests). Stories must render under npm run test.

EXAMPLES:
- Mistral attempt 1 '{"grammar_score": 72' -> row error "invalid_json: ...". Attempt 2 messages
  [system, user transcript, assistant '{"grammar_score": 72', user correction containing
  "invalid_json"] with json_object -> VALID_FEEDBACK_JSON -> row success -> returns dict
  (overall_score 69).
- Claude attempt 1 with "grammar_score": "bien" -> row "schema_mismatch: grammar_score: Input
  should be a valid integer". The retry keeps system, effort and the json_schema format.
- Both attempts "pas du JSON" -> two error rows -> FeedbackValidationError -> API 502
  FEEDBACK_INVALID_DETAIL. GET /sessions/{id} has ended_at null and feedback null. Next POST
  with valid output -> 200.
- Valid first response -> one call, one success row.
- Refusal or empty_response -> one error row, no retry -> 502 FEEDBACK_UNUSABLE_DETAIL.
- Score 120 -> schema_mismatch. [1,2,3] -> schema_mismatch. Extra key dropped. Missing
  explanation -> schema_mismatch "example_corrections.0.explanation: Field required".
- Claude empty text -> invalid_json. The retry has no assistant turn.
- Frontend: 502 -> one [data-testid=feedback-error] with the detail, no sessions-error duplicate,
  no navigation. Click [data-testid=retry-feedback-button] -> getFeedback called again -> on
  success navigate to /feedback/{id}.

ACCEPTANCE CRITERIA (issue #229):
- [ ] Invalid JSON or a schema mismatch triggers exactly one retry that includes the error message
- [ ] After a failed retry, POST /sessions/{id}/feedback returns a 502 with a clear message, and
      the session stays open for a second attempt
- [ ] No code path returns fabricated scores (the all-50 / "Bonne tentative" fallback is removed)
- [ ] llm_calls records retries as separate rows, so the eval can report a schema-validity rate
      per model
- [ ] The frontend shows the 502 error and lets the user retry feedback generation

DELIVERABLES:
- Code: schemas/session.py, services/llm/{base,service,mistral_provider,anthropic_provider,
  __init__}.py, routers/feedback.py, frontend ChatInterface.tsx, FeedbackView.tsx,
  storybookMocks.tsx, ChatInterface.stories.tsx, FeedbackView.stories.tsx, global.css (if needed).
- Tests: tests/test_llm_service.py (replace the fallback tests; retry/validation/rows),
  tests/test_llm_providers.py (correction turns), tests/test_feedback_validation.py (new: schema
  strictness, JSON schema <-> Pydantic sync), tests/test_llm_provider_integration.py (502, session
  open, second attempt, refusal 502), frontend ChatInterface.jest.test.tsx and
  FeedbackView.jest.test.tsx (new), a Cypress scenario in conversation-flow.cy.ts.
- Docs: README Feedback Mode and Cost and latency logging sections. Updated docstrings.
- Verify: python3 -m pytest tests/ -v --tb=short; pytest --cov on the changed modules;
  npx jest --listTests + npm run test:jest; npm run test; npx tsc -b; npm run lint.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, 2026-11-15.

- **Schema** (`schemas/session.py`): `ExampleCorrection`. `FeedbackResponse` scores `Field(ge=0, le=100)`, `example_corrections: list[ExampleCorrection]`. The serialized shape is unchanged (a test asserts `model_dump()` equals the input JSON).
- **`services/llm/base.py`**: `FEEDBACK_FALLBACK` deleted. Added `FeedbackValidationError(LLMProviderError)` (with `.errors`), `FeedbackCorrection`, `FEEDBACK_CORRECTION_PROMPT`, `MAX_CORRECTION_ERROR_CHARS = 1500` and `build_feedback_turns()`. `LLMProvider.feedback(..., correction=None)`. `FEEDBACK_JSON_SCHEMA` unchanged (no numeric bounds), with a comment explaining why.
- **Providers**: both build their turns with `build_feedback_turns`. Mistral keeps JSON mode and Claude keeps system, effort and the json_schema format on the retry. First-attempt requests are unchanged (the existing exact-payload tests still pass).
- **`services/llm/service.py`**: `validate_feedback()` (strict `model_validate_json`) raises `FeedbackOutputError` with kind `invalid_json` or `schema_mismatch`. `get_feedback` loops for at most `FEEDBACK_MAX_ATTEMPTS = 2` attempts, records each one, returns `model_dump()`, and otherwise raises `FeedbackValidationError`. Provider errors are recorded by `_timed_call` and propagate without a retry.
- **`routers/feedback.py`**: `FeedbackValidationError` → 502 `FEEDBACK_INVALID_DETAIL`. Other `LLMProviderError` → 502 `FEEDBACK_UNUSABLE_DETAIL`. The session is only written after success.
- **Frontend**: `ChatInterface` shows one `feedback-error` alert (`role="alert"`) with `retry-feedback-button` and clears the duplicate hook error. `FeedbackView` has a **Try again** button in its error state. `MockSessionsProvider` gained `feedbackError`. There's a `FeedbackError` story for each component and a `.feedback-error` CSS rule.
- **Tests**: `tests/test_feedback_validation.py` (new); retry, validation and row tests in `tests/test_llm_service.py` (fallback tests replaced); correction-turn tests in `tests/test_llm_providers.py`; 502, session-open and refusal tests in `tests/test_llm_provider_integration.py`; `ChatInterface.jest.test.tsx` and `FeedbackView.jest.test.tsx` (new); an Issue #229 scenario in `cypress/e2e/conversation-flow.cy.ts`.
- **Docs**: README API table row, data flow, *Feedback Mode* (validation and retry paragraph replacing the "until #229" sentence), *Cost and latency logging* (one row per attempt, prefixes, schema-validity rate formula), structure tree.

---

## Human Review Notes

### Changes Made
Deviations from the prompt, made during implementation:
- [x] **`invalid_json` message format**: the prompt joined `<loc>: <msg>` for every error. For JSON parse errors that produced the noise `invalid_json: <root>: Invalid JSON: …`, so `invalid_json` now carries only the parser message (`invalid_json: Invalid JSON: EOF while parsing …`). `schema_mismatch` keeps the `<field path>: <message>` format.
- [x] **`LLMService._record` helper**: a small static method wrapping `record_call` with the `db is None` check, to avoid repeating the 9-argument call three times. Behaviour is the same.
- [x] **Retry binding**: the provider lambda binds `correction` through a default argument (`lambda c=correction: …`), so each attempt uses that iteration's value.
- [x] **ChatInterface story uses a play function**: the prompt said render-only, but the error only appears after clicking End Session. The play function clicks it and asserts there's one error, an enabled retry button, and no `sessions-error`.
- [x] **ChatInterface `isLoading` includes the feedback request**, so End Session, the input and the retry button are disabled while a request is in flight (no double POSTs). `handleEndSession` also returns early if a request is already running.
- [x] **FeedbackView**: **Try again** is the primary button and **Back to Home** became `btn-secondary`, so there aren't two primary buttons. Try again is hidden when there is no `sessionId`.
- [x] **Extra Jest tests on pre-existing paths** (sending messages, Back, scenario-name fallback, lock/unlock failures, PDF export, the empty state) bring both components above 80% Jest coverage.

### Quality Checks
- [x] Code follows existing patterns (provider layer, usage-carrying errors, error prefixes, Given/When/Then tests, `data-testid`)
- [x] Tests pass at 80%+ coverage (see Verification)
- [x] Documentation updated (README, docstrings)
- [x] All acceptance criteria met

### Issues Found
- **Async router coverage under-reports (pre-existing).** With the default coverage config, every async router reports around 40% (`routers/sessions.py` 39%, `routers/messages.py` 38%, `routers/feedback.py` 42%), because lines run inside SQLAlchemy's async greenlets aren't traced. With `concurrency = thread,greenlet`, `routers/feedback.py` measures 90% (the only misses are the existing 404/400 guards). The project config was not changed. That fix belongs in its own issue.
- **Pre-existing `tsc -b` and lint errors.** `npx tsc -b` reports 69 errors on `main` (Exercise, SessionDetail, storybookMocks, …). The branch has the identical set (diffed with line numbers removed). ESLint findings on the changed files are also identical to `main` (e.g. `react-hooks/set-state-in-effect` in FeedbackView's load effect, unused `useContext` in storybookMocks). This change introduces no new type or lint errors.
- **Coordination**: `focus_area` stays `str` and `FEEDBACK_PROMPT` is unchanged, so #223 and #123 can build on this. Whichever lands second rebases `schemas/session.py` / `services/llm/base.py`.

---

## Verification

- [x] All acceptance criteria from issue #229 are met
  - [x] AC1: one retry including the error. `test_invalid_json_retried_once_with_error_then_succeeds`, `test_claude_schema_mismatch_retried_with_schema_kept`, `test_schema_mismatches_trigger_retry[...]`, `test_valid_first_response_makes_one_call`
  - [x] AC2: 502 with a clear message, session open, second attempt succeeds. `test_failed_retry_returns_502_and_session_stays_open`, `test_claude_refusal_returns_502_without_retry`
  - [x] AC3: fallback removed. `test_fallback_feedback_is_removed`, and a repo grep finds no `FEEDBACK_FALLBACK` / "Bonne tentative" outside that test
  - [x] AC4: one row per attempt with `invalid_json:` / `schema_mismatch:` prefixes. `test_double_failure_raises_and_records_two_rows`, plus the router test checking `/metrics/llm/calls`
  - [x] AC5: the frontend shows the error once and retries. `ChatInterface.jest.test.tsx`, `FeedbackView.jest.test.tsx`, the `FeedbackError` stories, the Cypress Issue #229 scenario
- [x] Tests pass with 80%+ coverage
  - Backend: `python3 -m pytest tests/ -v --tb=short` → **829 passed, 1 xfailed**. Coverage: `services/llm/service.py`, `base.py`, `mistral_provider.py`, `anthropic_provider.py`, `__init__.py` and `schemas/session.py` are 100%. `routers/feedback.py` is 90% with greenlet tracing (42% with the default config, see Issues Found).
  - Jest: `npx jest --listTests` lists both new files. `npm run test:jest` → **25 suites, 278 tests passed**. `ChatInterface.tsx` 96% statements / 98.6% lines. `FeedbackView.tsx` 95% statements / 96.9% lines.
  - Storybook (Vitest): `npm run test` → **36 files, 170 tests passed**, including the two new `FeedbackError` stories.
  - Cypress: `npx cypress run --spec cypress/e2e/conversation-flow.cy.ts`, against the local dev server and backend → **24 passing, 0 failing**, including the new scenario.
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced (response keys unchanged; first-attempt provider requests unchanged; the only behaviour change is 502 instead of fabricated scores or a 500)
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
