# SPDD Analysis: Schema-validated feedback with retry, no silent fallback

**GitHub Issue**: #229
**Issue Title**: Schema-validated feedback with retry, no silent fallback
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/229
**Artifact ID**: FLC-057-202611150855
**Created**: 2026-11-15 08:55
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Validate end-of-session feedback against the Pydantic `FeedbackResponse` schema for both providers, retry once on failure, and remove the silent fallback. Today a parse error in `get_feedback` returns all-50 scores with "Bonne tentative". The user sees fabricated feedback, and an eval would score that fallback as a real answer.
>
> **Depends on:** #228 (LLM provider layer)
>
> ## Design
> - **Claude:** use structured outputs against the `FeedbackResponse` schema.
> - **Mistral:** keep JSON mode (`response_format={"type": "json_object"}`), validate the parsed result against `FeedbackResponse`, and on failure retry **once**, feeding the validation error back to the model.
> - After a failed retry, return an explicit error the UI can show instead of fabricated scores.
>
> ## Acceptance criteria
> - [ ] Invalid JSON or a schema mismatch triggers exactly one retry that includes the error message
> - [ ] After a failed retry, `POST /sessions/{id}/feedback` returns a 502 with a clear message, and the session stays open for a second attempt
> - [ ] No code path returns fabricated scores (the all-50 / "Bonne tentative" fallback is removed)
> - [ ] `llm_calls` records retries as separate rows, so the eval can report a schema-validity rate per model
> - [ ] The frontend shows the 502 error and lets the user retry feedback generation
>
> ## Notes
> - Related: #223 (constrain `focus_area` to a known value set) changes the same schema and prompt. Coordinate so the two don't conflict, whichever lands first.
> - Related: #123 (feedback language consistency) touches the feedback prompt.

---

## Background

Issue #228 introduced the provider layer (`services/llm/`). It moved the original Mistral fallback into `LLMService.get_feedback` unchanged: when the model's output isn't a JSON object, the service returns a deep copy of `FEEDBACK_FALLBACK` (`services/llm/base.py:71`): every score 50, strengths `["Bonne tentative"]`, focus area `"Pratiquer davantage"`. The router (`routers/feedback.py:32-39`) then stores that as the session's real feedback, sets `ended_at`, and the session can never be re-scored (`Session already has feedback`, `routers/feedback.py:23`).

Two problems follow:

1. **The learner is misled.** They see plausible-looking scores the model never produced, and the session is closed, so they can't get real feedback.
2. **The model evaluation is corrupted.** The eval harness (#231) must report a *schema-validity rate* per model. If invalid output is replaced by valid-looking defaults, a broken model looks healthy.

There's also a gap the issue implies: today the service only checks that the output is a JSON **object**. It never checks it against `FeedbackResponse`. A response missing `focus_area`, or with `"grammar_score": "bien"`, is stored as-is and only fails later when the router builds `FeedbackResponse(**feedback)` (`routers/feedback.py:39`). That raises an unhandled `ValidationError` (500) *after* the session has already been committed as ended with broken feedback.

---

## Business Value

- **Trustworthy feedback**: learners only see scores a model actually produced.
- **Recoverable failures**: a transient bad response no longer burns the session. The learner can try again.
- **Honest eval data**: every attempt is logged as its own `llm_calls` row with a classified error, so #231 can compute a schema-validity rate per model and the #238 report's error rate reflects real reliability.
- **Fewer user-visible failures**: one corrective retry rescues most malformed JSON-mode responses at the cost of one extra call, only when needed.

---

## Scope In

- [ ] Validate every feedback response, from both providers, against `FeedbackResponse` in `LLMService.get_feedback` (`services/llm/service.py:122`).
- [ ] Classify failures as `invalid_json` (unparseable) or `schema_mismatch` (parseable but wrong shape, missing fields, wrong types, out-of-range scores).
- [ ] On the first failure, retry **exactly once**, sending the model its previous output and the validation error and asking for corrected JSON.
- [ ] After a failed retry, raise a dedicated error (`FeedbackValidationError`) instead of returning defaults.
- [ ] Delete `FEEDBACK_FALLBACK` and every code path that returns it.
- [ ] Record each attempt as a separate `llm_calls` row: a failed attempt as `status=error` with an `invalid_json: …` or `schema_mismatch: …` message, and a successful retry as `status=success`.
- [ ] Extend the provider interface so `feedback()` can take a correction context (previous output and error) and build the follow-up turns, for both `MistralProvider` and `AnthropicProvider`.
- [ ] Router: map the feedback failure to **HTTP 502** with a clear message. Leave the session open (`ended_at` stays `NULL`, nothing written to `feedback`).
- [ ] Tighten `FeedbackResponse` so that validating it means something: score range 0–100 and typed corrections (see Design Decisions D2, pending approval).
- [ ] Frontend: show the 502 message once, clearly, in the chat view, with a **Retry feedback** action. The session stays usable. Show the same retry action in `FeedbackView`'s error state, since that page can also trigger the POST.
- [ ] Tests: backend unit and integration tests (pytest), frontend Jest tests (discovered by `npx jest --listTests`), Storybook story for the error state, Cypress E2E for 502 → retry → success.
- [ ] README: replace the "default scores are returned (until #229)" sentence in *Feedback Mode*, and document retry, the 502 and the `llm_calls` error prefixes.

## Scope Out

- [ ] Constraining `focus_area` to a value set (#223). `focus_area` stays a free `str`.
- [ ] Changing the wording or language of `FEEDBACK_PROMPT` (#123). Only a new *correction* message is added.
- [ ] Computing or displaying a schema-validity rate in `/metrics/llm/report` or the dashboard. #231 (eval harness) owns that metric. This issue only makes the data available.
- [ ] Retrying on provider errors that aren't validation failures (refusal, `empty_response`, network or SDK errors). They are still logged and now surface as 502 (see A2), but they aren't retried.
- [ ] Retrying chat calls.
- [ ] A DB schema change to `llm_calls` (e.g. an `attempt` column). See D5.
- [ ] Repairing historic sessions that already store fallback feedback.
- [ ] Changing the default provider or model.
- [ ] Removing the existing frontend feedback cache or the `FeedbackView` re-POST-on-load behaviour (pre-existing).

---

## Acceptance Criteria (ACs)

1. **AC1: One corrective retry on invalid output**
   **Given** the feedback provider returns text that isn't valid JSON, or JSON that fails `FeedbackResponse` validation
   **When** `LLMService.get_feedback` runs
   **Then** it calls the provider exactly once more, and that second request includes the validation error message (and the previous output) so the model can correct it
   **And** if the second response validates, the validated feedback is returned and no third call is made.

2. **AC2: 502 after a failed retry, session stays open**
   **Given** both the first attempt and the retry return invalid output
   **When** the client calls `POST /sessions/{id}/feedback/`
   **Then** the response is `502` with a clear `detail` message
   **And** the session's `ended_at` is still `NULL` and `feedback` is still empty
   **And** a second `POST` to the same endpoint is accepted and can succeed.

3. **AC3: No fabricated scores**
   **Given** any feedback failure (invalid JSON, schema mismatch, provider error)
   **When** feedback is requested
   **Then** no response contains default or invented scores
   **And** `FEEDBACK_FALLBACK` no longer exists in the codebase.

4. **AC4: Retries are separate `llm_calls` rows**
   **Given** a feedback request where the first attempt fails validation
   **When** the request completes (either way)
   **Then** `llm_calls` holds one row per attempt for that session: the failed attempt with `status=error` and `error_message` starting `invalid_json:` or `schema_mismatch:`, and the retry with its own status, tokens, latency and cost
   **So that** schema-validity rate = feedback rows with `status=success` ÷ feedback rows that returned output (success + `invalid_json` + `schema_mismatch`), per model.

5. **AC5: Frontend shows the error and allows a retry**
   **Given** `POST /sessions/{id}/feedback/` returns 502
   **When** the user clicks **End Session** in the chat view
   **Then** the backend's `detail` message is shown once, the user stays on the chat page, the session isn't marked as ended, and a **Retry feedback** control re-sends the request
   **And** on success the user goes to `/feedback/{id}` as before.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **`LLMService.get_feedback`** (`services/llm/service.py:122-171`): calls the provider once, `json.loads`, falls back to `FEEDBACK_FALLBACK` on failure, records one row. This is the main change site.
- **`LLMService._timed_call`** (`services/llm/service.py:173-207`): times one provider call. On an exception it records an error row (with usage from `LLMProviderError.result`) and re-raises. Reused per attempt.
- **`FEEDBACK_FALLBACK`** (`services/llm/base.py:70-79`): to be deleted.
- **`FEEDBACK_PROMPT`** (`services/llm/base.py:50-67`): French system prompt. Unchanged.
- **`FEEDBACK_JSON_SCHEMA`** (`services/llm/base.py:83-117`): JSON schema for Claude structured outputs, mirroring `FeedbackResponse`.
- **`LLMProviderError`** (`services/llm/base.py:36-47`): carries `result` usage so failed calls are still costed. A natural base class for the new error.
- **`build_transcript`** (`services/llm/base.py:120`): renders the conversation for the user turn.
- **`LLMProvider.feedback(messages, model)`** (`services/llm/base.py:135`): abstract interface. Gains an optional correction parameter.
- **`MistralProvider.feedback`** (`services/llm/mistral_provider.py:84-94`): system + user messages, JSON mode.
- **`AnthropicProvider.feedback`** (`services/llm/anthropic_provider.py:90-102`): `system=FEEDBACK_PROMPT`, one user message, `output_config.format` json_schema.
- **`record_call`** (`services/llm/recorder.py:20`): best-effort row write. Truncates `error_message` to 1000 chars and commits the caller's session.
- **`LLMCall`** (`models/llm_call.py`): `status` is `success|error`, `error_message` is Text. No migration tooling (tables come from `create_all`).
- **`FeedbackResponse`** (`schemas/session.py:70-77`): plain `int` scores (no range), `example_corrections: list[dict[str, str]]`.
- **Feedback router** (`routers/feedback.py`): 404/400 guards, calls the service, sets `ended_at`, stores `feedback_dict`, commits.
- **Metrics** (`services/llm/metrics.py:210, 334-348`): error counts and `error_rate` are computed from `status`. Failed attempts will count as errors there, which is correct.
- **Frontend**: `sessionApi.getFeedback` (`frontend/src/utils/api.ts:104`) and `api()` throw `Error(detail)` on non-2xx (`api.ts:72-76`). `useSessions.getFeedback` (`frontend/src/hooks/useSessions.tsx:134-174`) sets the hook's `error` and re-throws. `ChatInterface.handleEndSession` (`frontend/src/components/ChatInterface.tsx:123-136`) sets its local `error` too, so today the same message renders twice (`chat-error` and `sessions-error`). `FeedbackView` (`frontend/src/components/FeedbackView.tsx:20-44, 86-90`) shows a `feedback-error` with no retry.
- **Test helpers**: `tests/llm_fakes.py` (`VALID_FEEDBACK_JSON`, `make_mistral_*`, `make_claude_*`). Existing fallback tests are in `tests/test_llm_service.py:217-263`. Router-level feedback tests are in `tests/test_llm_provider_integration.py:101-140, 182-204`.

### New Concepts Required

- **`FeedbackCorrection`** (dataclass in `services/llm/base.py`): `previous_output: str` and `error: str`, passed to `provider.feedback(..., correction=...)` on the retry.
- **Correction message builder** (shared in `base.py`): builds the follow-up turns. An assistant turn holds the previous output (omitted when empty, because Claude rejects empty assistant content). Then a French user turn names the error and asks for the complete corrected JSON only.
- **`FeedbackValidationError(LLMProviderError)`**: raised by the service after the retry also fails. It carries both attempts' error strings for logging, and the router maps it to 502.
- **`validate_feedback(text) -> FeedbackResponse`** helper (service-level): parses and validates, raising a classified error (`invalid_json` / `schema_mismatch`) with a compact, model-readable message.
- **`ExampleCorrection`** Pydantic model (`schemas/session.py`): `original`, `corrected`, `explanation`. Pending D2.

### Key Business Rules

- **BR1**: Feedback shown to the user or stored on a session must be exactly what a model produced and what passed validation. No defaults, ever.
- **BR2**: At most two feedback provider calls per `POST /feedback` request (initial + one retry).
- **BR3**: Only validation failures (`invalid_json`, `schema_mismatch`) trigger the retry.
- **BR4**: A failed feedback request leaves the session unchanged (not ended, no feedback), so it can be retried.
- **BR5**: Every provider call writes its own `llm_calls` row (best-effort, as today).
- **BR6**: Scores are integers in 0–100 (stated by `FEEDBACK_PROMPT` and the README's documented structure; enforced if D2 is approved).

---

## Strategic Approach

### Solution Direction

1. **Schema**: tighten `FeedbackResponse` (score bounds, `ExampleCorrection`) so validation enforces the documented contract. Keep `FEEDBACK_JSON_SCHEMA` structurally in sync. Claude structured outputs may not accept `minimum`/`maximum`; verify during implementation and leave bounds to Pydantic if they aren't supported.
2. **Provider interface**: add `correction: Optional[FeedbackCorrection] = None` to `LLMProvider.feedback`. Both providers append the shared correction turns when it's set. Mistral keeps JSON mode, and Claude keeps structured outputs on the retry as well.
3. **Service**: rewrite `get_feedback` as a loop of at most two attempts. Each attempt calls `_timed_call` (provider errors are recorded and re-raised as today, with no retry), validates, and records a `success` row or an `error` row with a classified message. A failure on attempt 1 builds a `FeedbackCorrection` and loops. A failure on attempt 2 raises `FeedbackValidationError`. On success it returns `FeedbackResponse.model_dump()` (normalized: extra keys dropped).
4. **Remove the fallback**: delete `FEEDBACK_FALLBACK`, its import, and the tests that assert it. Add a test asserting the symbol is gone and that no response carries the old default values.
5. **Router**: wrap the service call. On `FeedbackValidationError` (and other `LLMProviderError`s, see A2), raise `HTTPException(502, detail=...)` before touching the session. The session commit only happens on success.
6. **Frontend**: in `ChatInterface`, keep a dedicated `feedbackError` state. On failure, render one `feedback-error` alert with a **Retry feedback** button that calls `handleEndSession` again, and suppress the duplicate hook error for this case. Show a loading state while retrying. Add a **Try again** button to `FeedbackView`'s error state that re-runs the load. No change to `api.ts` is needed, because `detail` already reaches `Error.message`.
7. **Tests and docs**: pytest for validation, retry, row recording, 502 and session-stays-open; Jest for `ChatInterface` and `FeedbackView` error and retry; a story for the error state; a Cypress scenario in `conversation-flow.cy.ts`; README update.

### Key Design Decisions

| # | Decision | Trade-offs | Recommendation |
|---|----------|------------|----------------|
| D1 | Validate and retry for **both** providers, or only Mistral? | The issue's design implies Mistral-only retry, because Claude is schema-constrained. But Claude can still fail validation: `max_tokens` truncation yields broken JSON, and score bounds may not be enforceable in its JSON schema. Provider-specific paths add branching. | **Validate and retry uniformly in the service** for both providers. Claude keeps structured outputs, so its retries should be rare. AC1 is phrased provider-agnostically. |
| D2 | Tighten `FeedbackResponse` (scores `ge=0, le=100`, `example_corrections: list[ExampleCorrection]`)? | Without it, "schema validation" accepts `grammar_score: 950` or corrections missing `explanation`. Serialized response shape is unchanged (same keys). It touches the response schema that #223 also changes. Stored historic feedback isn't re-validated (`SessionResponse.feedback` is `dict`). | **Tighten.** It's the contract the prompt and README already promise. Keep `focus_area: str` so #223 can narrow it later. **Needs user confirmation.** |
| D3 | Strict or lax Pydantic validation (e.g. accept `"72"` or `72.0` as `72`)? | Lax mode hides sloppy output and inflates the schema-validity rate. Strict mode rejects coercible values and triggers a retry (extra cost). | **Strict** (`FeedbackResponse.model_validate_json(text, strict=True)`): one call both parses and validates, and the JSON-decode error type maps to `invalid_json`. Extra keys are ignored (dropped), not rejected. |
| D4 | How to feed the error back on retry | (a) Multi-turn: assistant turn with the previous output, then a user correction turn. (b) A single user turn quoting the output. (a) is more natural for both APIs, but Claude rejects empty assistant content. | **(a), skipping the assistant turn when the previous output is empty.** The correction text is in French (consistent with `FEEDBACK_PROMPT`) and includes the compact validation error, capped (around 1,500 chars). |
| D5 | How to mark retries in `llm_calls` | An `attempt` column is precise, but it's a schema change, and with `create_all` and no migrations an existing `french_coach.db` won't get the column. Rows are already per-attempt, with a `session_id` and increasing `id`. | **No schema change.** One row per attempt, with error prefixes `invalid_json:` / `schema_mismatch:`. Schema-validity rate is computable from status and prefix. If #231 needs explicit attempt numbers, raise it there. |
| D6 | Error type for the router | Reusing `LLMProviderError` means the router can't tell a validation failure from a refusal. A subclass lets it do both. | **`FeedbackValidationError(LLMProviderError)`** in `services/llm/base.py`, exported from `services.llm`. |
| D7 | 502 `detail` wording | The UI is English. The message is shown verbatim by the frontend. | `"Feedback could not be generated: the AI returned invalid feedback twice. Your session is still open — please try again."` A provider error (A2) gets a sibling message without "twice". |
| D8 | Frontend retry control | Re-enabling **End Session** already allows a retry, but it's implicit. A dedicated button is clearer and testable. | **Dedicated `Retry feedback` button** inside a `feedback-error` alert in `ChatInterface`. Same pattern (**Try again**) in `FeedbackView`'s error state. |

### Alternatives Considered

- **Keep a fallback but flag it (`is_fallback: true`)**: rejected. AC3 forbids fabricated scores, and consumers would still have to remember to check the flag.
- **Retry N times with backoff**: rejected. The issue says exactly one retry. More retries mainly add cost and latency.
- **Validate in the router instead of the service**: rejected. The eval harness (#231) calls the service directly and needs identical validation, retry and logging.
- **Ask Mistral for `json_schema` response format instead of `json_object`**: rejected for this issue. The issue says keep JSON mode, and changing the request would change the baseline under evaluation.
- **Return 422 or 500 instead of 502**: rejected. The issue specifies 502 (an upstream model produced unusable output), and it separates model failures from client or app bugs.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| # | Ambiguity | What needs clarification | Recommendation |
|---|-----------|-------------------------|----------------|
| A1 | Does the retry apply to Claude too? | The design section describes retry under Mistral only. | Retry both (D1). Same code path, and Claude retries are rare. |
| A2 | What should non-validation provider errors (refusal, `empty_response`, SDK or network exceptions) return from the feedback endpoint? | Today they bubble up as an unhandled 500 (and the UI shows a generic "HTTP error! status: 500"). The issue only specifies 502 after a failed retry. | Map `LLMProviderError` (refusal, empty) to **502** with a generic message, without retrying (BR3). Leave unexpected SDK exceptions as they are, to keep this issue's scope tight. **Ask the user** whether SDK/network errors should also become 502. |
| A3 | Tightening `FeedbackResponse` (D2) | It overlaps #223's area. | Tighten scores and corrections, and keep `focus_area: str`. Whichever of #223 and #229 lands second rebases. |
| A4 | Should the session lock (`is_locked`) be affected by a failed feedback attempt? | Not mentioned. | No. The lock is unrelated to `ended_at`, and the chat page keeps it. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Attempt 1 invalid JSON, attempt 2 valid | The common rescue path | Two rows (error `invalid_json:…`, then success). Feedback returned, session ended. |
| Attempt 1 valid JSON but `grammar_score: "bien"` or missing `focus_area` | Schema mismatch, not a parse error | Row `schema_mismatch: …` with field locations. Retry includes the error. |
| Score out of range (e.g. 120) | Only caught if D2 is approved | `schema_mismatch`, then retry. |
| JSON array or scalar instead of an object | Previously handled by `isinstance` | `schema_mismatch` (strict model validation rejects it). |
| Truncated output (`max_tokens` / `length` finish reason) | Typical source of broken JSON | `invalid_json`, then retry. |
| Empty text from Claude (thinking only, no text block) | Empty assistant content is invalid for Claude | `invalid_json`. The retry omits the assistant turn and keeps the correction turn. |
| Mistral `empty_response` (`LLMProviderError`) | Not a validation failure | Recorded by `_timed_call`, no retry, router returns 502 (A2). |
| Provider exception on the **retry** attempt | Mixed failure | Attempt 1 row (`invalid_json`/`schema_mismatch`) plus attempt 2 error row from `_timed_call`. The original exception propagates. Router: 502 for `LLMProviderError`, otherwise as decided in A2. |
| Extra keys in the model's JSON | Mistral may add fields | Dropped by validation, not an error. The stored feedback is normalized. |
| `llm_calls` write fails | Recording is best-effort | Retry logic unaffected (as today). |
| `db=None` (eval harness or unit use) | No rows written | Validation and retry still apply. |
| User double-clicks Retry | Concurrent POSTs | The button is disabled while a request is in flight. The backend's existing `ended_at` guard handles a race (second call gets 400). |
| Two consecutive failed requests | The user keeps retrying | Each request does its own one retry (at most 2 calls per request). No global cap, which is out of scope. |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Doubled latency on the retry path (two sequential calls, Claude at `medium` effort) | User waits noticeably longer, and the request could approach proxy timeouts | Only on failure. The existing spinner shows while loading. Note it in the README. |
| Claude JSON schema rejects `minimum`/`maximum` keywords | Claude feedback calls fail with a 400 | Don't add bounds to `FEEDBACK_JSON_SCHEMA` unless they're verified as supported. Pydantic enforces the bounds. Provider test asserts the schema keys sent. |
| `FEEDBACK_JSON_SCHEMA` drifts from `FeedbackResponse` | Claude is constrained to a shape Pydantic rejects | Add a unit test comparing the schema's required keys and types with `FeedbackResponse.model_fields`. |
| `record_call` commits the router's DB session between attempts | Could commit pending session changes | The router makes no session changes before the LLM call (already relied on in `recorder.py:30-34`). Keep that order. |
| Strict validation is too strict for Mistral | More retries and 502s | Measured by the new error prefixes. Easy to relax later if the data says so. |
| Frontend tests not discovered (pre-existing gap) | False sense of coverage | Write `*.jest.test.tsx` files and confirm with `npx jest --listTests`. Report how they ran in the PR. |
| Conflict with #223 / #123 | Merge conflicts in `schemas/session.py` and `base.py` | Keep prompt text untouched. Keep `focus_area: str`. Note the coordination in the PR. |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | One retry with the error message | Yes | Service loop plus `FeedbackCorrection`. Tests assert the call count and the error text in the second request, for both providers. |
| AC2 | 502 and the session stays open | Yes | Router maps `FeedbackValidationError` to 502 before any session write. Test asserts `ended_at is None` and that a second POST succeeds. |
| AC3 | No fabricated scores | Yes | `FEEDBACK_FALLBACK` deleted. Grep/import test. |
| AC4 | Retries are separate rows | Yes | One `record_call` per attempt with classified prefixes. No schema change (D5). |
| AC5 | Frontend error and retry | Yes | `ChatInterface` `feedback-error` and Retry button, `FeedbackView` Try again. Jest, story and Cypress coverage. |

**AC Coverage Summary**: All 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Validation must happen *before* the session is committed. This also fixes today's latent 500-after-commit (`routers/feedback.py:39`).
- The feedback error message must render once, not twice (`chat-error` and `sessions-error` today).
- The README must stop describing the fallback.
- `FEEDBACK_JSON_SCHEMA` stays in sync with the tightened `FeedbackResponse`.

---

## REASONS Canvas

### Requirements
- AC1–AC5 above (from issue #229).
- At most 2 provider calls per feedback request. Retry only on `invalid_json` / `schema_mismatch`.
- 502 with a clear `detail`. The session is untouched on failure.
- `FEEDBACK_FALLBACK` removed. One `llm_calls` row per attempt.
- The frontend shows the error once and offers a retry.
- 80% coverage on changed modules.

### Examples
- **Rescue**: attempt 1 returns `'{"grammar_score": 72, ...'` (truncated) → row 1 `error`, `invalid_json: …`. Attempt 2 gets the messages `[system, user(transcript), assistant(<truncated text>), user("Ta réponse précédente n'est pas valide : … Retourne UNIQUEMENT le JSON complet corrigé.")]`, returns `VALID_FEEDBACK_JSON` → row 2 `success`. API 200, session ended.
- **Schema mismatch**: attempt 1 returns `{"grammar_score": "bien", ...}` → row `schema_mismatch: grammar_score: Input should be a valid integer`. The retry request contains that string.
- **Double failure**: both attempts return `"pas du JSON"` → two `error` rows. `POST /sessions/1/feedback/` returns 502 `{"detail": "Feedback could not be generated: the AI returned invalid feedback twice. Your session is still open — please try again."}`. `GET /sessions/1` shows `ended_at: null`, `feedback: null`. The next POST with a valid response returns 200.
- **No retry on valid first response**: one provider call, one `success` row.
- **Provider error**: Claude refusal → one `error` row `refusal: …`, no retry, API 502.
- **Frontend**: 502 → `[data-testid=feedback-error]` shows the detail, `[data-testid=retry-feedback-button]` is enabled, no navigation. Click → second POST 200 → navigates to `/feedback/1`.

### Architecture
- Backend layering: `routers/feedback.py` → `services/llm/service.py` (`LLMService`) → `services/llm/{mistral,anthropic}_provider.py` via the `LLMProvider` interface in `services/llm/base.py`. Recording goes through `services/llm/recorder.py`. All LLM calls stay behind `services/llm/` (CLAUDE.md guardrail).
- Schemas in `schemas/session.py` (Pydantic v2).
- Frontend: `hooks/useSessions.tsx` (context, re-throws errors) → `components/ChatInterface.tsx` and `components/FeedbackView.tsx`. Each component has `.stories.tsx` and Jest tests.
- No new dependencies, no DB schema change, no new directories.

### Standards
- PEP 8, type hints, docstrings on public functions and classes (matching the style in `services/llm/`).
- 80% coverage per changed module: `services/llm/service.py`, `base.py`, both providers, `routers/feedback.py`, `schemas/session.py`, and the changed frontend components.
- Frontend: TypeScript, `data-testid` hooks, story for the new error state. Tests named `*.jest.test.tsx` so Jest discovers them. Confirm with `npx jest --listTests`.
- README updated in the same PR (Feedback Mode section, Cost and latency logging section).
- Commit `fix(#229): …`. PR with `Closes #229`.

### Omissions
- `focus_area` value set (#223). Prompt wording or language (#123).
- Schema-validity metric in the report or dashboard (#231 computes it).
- Retrying non-validation errors. Retrying chat. An `attempt` column. Backfilling old fallback feedback.
- Provider or model defaults unchanged. No Mistral `json_schema` mode.

### Notes
- `record_call` commits the passed session. Keep the router's order (LLM first, then session writes).
- `_timed_call` already records and re-raises provider exceptions. Reuse it per attempt rather than duplicating timing code.
- `LLMProviderError.result` keeps usage on failure, so the new subclass inherits that.
- Claude needs a non-empty assistant content when an assistant turn is included.
- `api.ts` already turns `detail` into `Error.message`. No API client change needed.
- `ChatInterface.test.tsx` is a plain `.test.tsx` and isn't run by any runner (CLAUDE.md gotcha). Add a `ChatInterface.jest.test.tsx` instead.
- Coordinate with #223: if it merges first, rebase and keep its `focus_area` constraint.

### Solutions
- Error-row pattern: `_timed_call` and `record_call` in `services/llm/service.py`.
- Usage-carrying exception: `LLMProviderError` (`services/llm/base.py:36`). Mistral's `EMPTY_RESPONSE_ERROR` prefix style (`mistral_provider.py:15`) for the `invalid_json:` / `schema_mismatch:` prefixes.
- Provider test shape: `tests/test_llm_providers.py` (`TestMistralProvider.test_feedback_uses_json_mode_and_shared_prompt`, `TestAnthropicProvider.test_feedback_request_uses_structured_output`). Fakes in `tests/llm_fakes.py` (use `side_effect=[resp1, resp2]` for multi-attempt).
- Router integration tests: `tests/test_llm_provider_integration.py` (`client`, `test_db` fixtures, provider injection).
- Frontend error UI: `FeedbackView`'s `feedback-error` block. Existing Jest component tests under `frontend/src/components/LLMMetrics/*.jest.test.tsx` show the setup.
- E2E: the `cy.intercept` pattern in `frontend/cypress/e2e/conversation-flow.cy.ts:61`.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
