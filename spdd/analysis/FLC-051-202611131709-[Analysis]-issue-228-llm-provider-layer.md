# SPDD Analysis: LLM Provider Layer with Claude Support and Per-Call Cost/Latency Logging

**GitHub Issue**: #228
**Issue Title**: LLM provider layer with Claude support and per-call cost and latency logging
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/228
**Artifact ID**: FLC-051-202611131709
**Created**: 2026-11-13 17:09
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Replace the hardcoded Mistral client in `services/mistral.py` with a small provider interface, implement it for both Mistral and Claude, and record every LLM call with token counts, latency and estimated cost. This is the seam the model-evaluation work depends on.
>
> **This issue explicitly authorizes Anthropic API calls from the app** and updates the `CLAUDE.md` guardrail ("Don't replace it with, or add, Anthropic/Claude API calls unless a GitHub issue explicitly asks for it") to match.
>
> ## Architectural changes approved by this issue
> - New dependency: `anthropic` (official Python SDK), added to `requirements.txt`
> - New package: `services/llm/` (provider interface plus Mistral and Claude implementations)
> - New table: `llm_calls` (one row per LLM call)
> - New route prefix: `/metrics/`
>
> ## Design
> - Provider interface with two operations, `chat()` (scenario role-play) and `feedback()` (structured end-of-session feedback), implemented for **Mistral** and **Claude**.
> - Provider and model are chosen **per feature** by config:
>   - `CHAT_PROVIDER`, `CHAT_MODEL`
>   - `FEEDBACK_PROVIDER`, `FEEDBACK_MODEL`
> - Use **async** clients for both providers, so LLM calls stop blocking the FastAPI event loop. Today the sync Mistral client is called inside async routes.
> - Claude runs on the **first-party Anthropic API**, with the key from `ANTHROPIC_API_KEY`. Models in scope for the evaluation: `claude-sonnet-5-5` (quality end) and `claude-haiku-5-5` (low-cost end), with `claude-opus-5-5` as an optional ceiling.
> - Prices (per million input, output and cache-read tokens) live in **one config table** that records the date checked and a source link. No prices in code. Check the values against the Anthropic and Mistral pricing pages when implementing.
>
> ## Acceptance criteria
> - [ ] Default config behaves exactly as today (Mistral, `mistral-large-latest`), and existing tests pass unchanged
> - [ ] Setting the feedback provider to Claude produces feedback through the same `FeedbackResponse` schema
> - [ ] Each call writes one `llm_calls` row: feature, provider, model, input tokens, output tokens, cache-read tokens, latency in ms, estimated cost in USD, and success or error
> - [ ] Prices live in one config table with a date and source link, not in code
> - [ ] `GET /metrics/llm` returns totals and p50/p95 latency by feature and model
> - [ ] `.env.example` and README document the new variables (`ANTHROPIC_API_KEY`, `CHAT_PROVIDER`, `CHAT_MODEL`, `FEEDBACK_PROVIDER`, `FEEDBACK_MODEL`); no key is hardcoded
> - [ ] `CLAUDE.md` guardrail updated to reflect that this issue authorizes Anthropic API calls behind the provider layer
>
> ## Notes
> - `/metrics/` is a new API prefix, so add a `server.proxy` entry in `frontend/vite.config.ts` (see the CLAUDE.md Gotchas).
> - Tests mock both SDKs; no real API calls in CI.
> - The `anthropic` SDK must be added to CI's Python dependencies via `requirements.txt`.
> - Blocks #229 (schema-validated feedback) and #231 (eval harness).

**Milestone**: Model evaluation (Claude vs Mistral). **Labels**: ai, api, backend, database, enhancement, model-eval.

---

## Background

All LLM traffic goes through one hardcoded class, `MistralClient` in `services/mistral.py:9-64`, which builds a **synchronous** `mistralai` client (`services/mistral.py:11`) with the model fixed to `mistral-large-latest` (`services/mistral.py:12`). Three async routes call it directly, so every LLM call blocks the event loop:

- `routers/sessions.py:55`: initial AI greeting on session creation (`get_chat_response` with an empty history; failure is swallowed at `routers/sessions.py:61-64`)
- `routers/messages.py:39`: each chat turn
- `routers/feedback.py:32`: end-of-session feedback (`get_feedback`, JSON mode via `response_format={"type": "json_object"}` at `services/mistral.py:49`, with a silent default-score fallback on unparseable JSON at `services/mistral.py:52-63`)

Nothing records token usage, latency or cost. The Model evaluation milestone (#229 schema-validated feedback, #231 eval harness) needs to swap the model per feature and compare accuracy, cost and latency. That requires a provider seam and per-call measurement first, which is this issue.

The README already announces this direction (`README.md:3`: "Claude support is being added in #228").

---

## Business Value

- Makes the model-evaluation milestone possible: provider/model per feature becomes a config change, not a code change.
- Gives real cost and latency numbers per feature and model (`llm_calls` + `GET /metrics/llm`), so model choices rest on data rather than claims.
- Stops LLM calls blocking the FastAPI event loop (async clients), which improves responsiveness under concurrent use.
- Keeps today's behaviour as the default, so users see no change unless config changes.

---

## Scope In

- [ ] `services/llm/` package: provider interface (`chat()`, `feedback()`), result/usage types, Mistral provider (async), Claude provider (async, first-party API), provider registry/factory, pricing loader + cost estimator, call recorder, and a provider-agnostic `LLMService` facade used by the routers
- [ ] Per-feature config in `config.py`: `CHAT_PROVIDER`, `CHAT_MODEL`, `FEEDBACK_PROVIDER`, `FEEDBACK_MODEL`, `ANTHROPIC_API_KEY`; defaults reproduce today (`mistral`, `mistral-large-latest`)
- [ ] `anthropic` SDK added to `requirements.txt`
- [ ] New ORM model `LLMCall` (table `llm_calls`) registered in `models/__init__.py`; created by the existing `Base.metadata.create_all` at startup (`main.py:72-75`)
- [ ] Price table as a single JSON config file (`data/llm_pricing.json`) with per-model input / output / cache-read prices per million tokens, `checked_on` date and `source` URL; no prices in Python code
- [ ] `GET /metrics/llm` router (`routers/metrics.py`) + Pydantic response schema, registered in `main.py`
- [ ] Vite dev proxy entry for `/metrics` in `frontend/vite.config.ts`
- [ ] Routers (`sessions.py`, `messages.py`, `feedback.py`) switched to `await` the async service and pass the DB session (and session id) for logging
- [ ] `services/mistral.py` kept as a thin backward-compatibility module so the existing test patch target `services.mistral.mistral_client.get_chat_response` keeps working (AC1: existing tests unchanged)
- [ ] New pytest tests with both SDKs mocked (no network): providers, cost estimator, pricing loader, recorder, service routing, metrics endpoint, Claude feedback via `FeedbackResponse`, config validation
- [ ] `.env.example`, `README.md` (config, API table, architecture/project structure, LLM integration section, limitations) and `CLAUDE.md` guardrail updated

## Scope Out

- [ ] Schema validation of feedback with retry and removal of the silent fallback: **#229**. This issue keeps today's fallback behaviour for both providers.
- [ ] Server-side refusal fallbacks to a different model (confirmed out of scope by the user, 2026-11-13)
- [ ] The eval harness, datasets and model comparison: **#231**
- [ ] Prompt caching (`cache_control`) for Claude, and Mistral `prompt_cache_key`: cost optimisation that belongs with the eval. Cache-read tokens are still recorded whenever a provider reports them.
- [ ] Streaming responses to the frontend
- [ ] A frontend metrics UI (only the backend endpoint and dev proxy)
- [ ] Changing prompts (scenario system prompts in `scenarios.py`, the French feedback prompt). The Claude provider reuses the same prompt text.
- [ ] Bedrock / Vertex / Foundry clients: first-party Anthropic API only, as the issue specifies
- [ ] Retention/pruning of `llm_calls` rows, auth on `/metrics/`: no user auth exists until Phase 5 (VISION.md)
- [ ] Migrating `tests/test_initial_greeting.py` patch targets away from `services.mistral` (would violate "existing tests pass unchanged"; can be a follow-up)

---

## Acceptance Criteria (ACs)

1. **AC1: Default config unchanged**
   **Given** no `CHAT_*` / `FEEDBACK_*` variables are set
   **When** the app handles greeting, chat and feedback requests
   **Then** it calls Mistral `mistral-large-latest` with the same messages, system prompt and JSON mode as today, returns the same response shapes, and `python3 -m pytest tests/` passes with no edits to existing test files

2. **AC2: Claude feedback through the same schema**
   **Given** `FEEDBACK_PROVIDER=anthropic`, `FEEDBACK_MODEL=claude-sonnet-5-5` (or `claude-haiku-5-5`) and `ANTHROPIC_API_KEY` set
   **When** `POST /sessions/{id}/feedback/` is called on a session with at least one exchange
   **Then** the feedback is produced by the Claude provider and returned/stored as a valid `FeedbackResponse` (`schemas/session.py:71-78`)

3. **AC3: One `llm_calls` row per call**
   **Given** any configured provider
   **When** a greeting, chat or feedback LLM call completes or fails
   **Then** exactly one `llm_calls` row exists for it with feature, provider, model, input tokens, output tokens, cache-read tokens, latency (ms), estimated cost (USD) and status (`success` / `error`)

4. **AC4: Prices in one config table**
   **Given** `data/llm_pricing.json`
   **When** a cost is estimated
   **Then** the per-million input / output / cache-read prices come only from that file, which records `checked_on` and a `source` link per entry; no price constants exist in Python code

5. **AC5: Metrics endpoint**
   **Given** rows in `llm_calls`
   **When** `GET /metrics/llm` is called
   **Then** it returns overall totals and, per (feature, provider, model), call count, error count, token totals, total estimated cost, and p50/p95 latency in ms

6. **AC6: Config documented, no hardcoded key**
   **Given** `.env.example` and `README.md`
   **When** a developer reads them
   **Then** `ANTHROPIC_API_KEY`, `CHAT_PROVIDER`, `CHAT_MODEL`, `FEEDBACK_PROVIDER`, `FEEDBACK_MODEL` are documented, and no API key appears in code

7. **AC7: CLAUDE.md guardrail**
   **Given** `CLAUDE.md` Guardrails
   **When** it is read after this change
   **Then** it says Anthropic API calls are authorized (by #228) behind the `services/llm/` provider layer, while Mistral stays the default

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **MistralClient / `mistral_client`**: sync Mistral wrapper with `get_chat_response(messages, system_prompt) -> str` and `get_feedback(messages) -> dict` (`services/mistral.py:9-67`). Exported from `services/__init__.py:1`.
- **Settings**: pydantic-settings class with required `MISTRAL_API_KEY` and `DATABASE_URL` (`config.py:4-11`), reading `.env`.
- **Session model**: stores messages as JSON text, `messages_list` / `feedback_dict` properties (`models/session.py:11-47`); `BaseModel` adds `id`, `created_at`, `updated_at` (`models/base.py:16-38`).
- **FeedbackResponse**: `grammar_score`, `vocabulary_score`, `fluency_score`, `overall_score` (int), `strengths` (list[str]), `focus_area` (str), `example_corrections` (list[dict[str,str]]) (`schemas/session.py:71-78`).
- **Scenarios**: system prompts per scenario/difficulty via `get_scenario()` (`scenarios.py`).
- **Startup table creation**: `Base.metadata.create_all` in the startup handler (`main.py:72-75`); no Alembic.
- **Test harness**: in-memory SQLite, `client` fixture overriding `get_db` (`tests/conftest.py:56-71`). CI sets `MISTRAL_API_KEY: dummy_test_key` (`.github/workflows/pytest-tests.yml:59`).
- **Existing patch target**: `tests/test_initial_greeting.py` patches `services.mistral.mistral_client.get_chat_response` nine times (lines 28, 49, 78, 105, 146, 184, 202, 231, 324) and sets `return_value` / `side_effect` on the mock.
- **Vite dev proxy**: `frontend/vite.config.ts:22-34`; no `/metrics` frontend route exists, so a plain `'/metrics'` prefix is safe.

### New Concepts Required

- **Feature**: the use an LLM call serves: `chat` (greeting and turns) or `feedback`. Selects provider + model from config, and is logged.
- **LLMProvider (interface)**: `async chat(messages, system_prompt, model) -> LLMResult`; `async feedback(messages, model) -> LLMResult`. Implementations: `MistralProvider`, `AnthropicProvider`.
- **LLMResult / TokenUsage**: provider-neutral result: `text`, `input_tokens` (uncached input), `output_tokens`, `cache_read_tokens`, optional `stop_reason`.
- **Provider registry**: maps provider id (`mistral`, `anthropic`) to a lazily created provider instance, so an unused provider never needs its key or client.
- **Pricing table**: `data/llm_pricing.json` with `checked_on`, `source`, per (provider, model) `input_per_mtok`, `output_per_mtok`, `cache_read_per_mtok`, and an optional long-context tier (Claude Haiku 5.5 prices prompts over 100K tokens higher).
- **Cost estimator**: `estimate_cost_usd(provider, model, usage) -> Decimal | None`; `None` when the model has no price entry.
- **LLMCall model** (`llm_calls`): `id`, `created_at`, `updated_at`, `feature`, `provider`, `model`, `session_id` (nullable, plain int), `input_tokens`, `output_tokens`, `cache_read_tokens`, `latency_ms`, `estimated_cost_usd` (nullable float), `status` (`success`/`error`), `error_message` (nullable).
- **Call recorder**: writes one `LLMCall` row per call; best-effort (a logging failure is logged with `logging`, never breaks the user request).
- **LLMService**: provider-agnostic facade with `get_chat_response(messages, system_prompt, db=None, session_id=None) -> str` and `get_feedback(messages, db=None, session_id=None) -> dict`. Times the call, records the row, keeps the feedback JSON fallback.
- **Metrics schema + router**: `GET /metrics/llm` → `LLMMetricsResponse { totals, groups[] }`.

### Key Business Rules

- **Defaults reproduce today**: chat and feedback default to provider `mistral`, model `mistral-large-latest`.
- **Exactly one row per provider call**, success or error, including the greeting (feature `chat`).
- **Token normalisation**: `input_tokens` = uncached input. Mistral reports `prompt_tokens` including cached tokens (`usage.prompt_tokens_details.cached_tokens`), so input = prompt − cached. Anthropic's `input_tokens` already excludes `cache_read_input_tokens`.
- **Cost** = (input × input price + output × output price + cache_read × cache-read price) / 1,000,000, using the long-context tier when the total prompt tokens exceed its threshold. Unknown model → `estimated_cost_usd = NULL`, call still succeeds.
- **Feedback fallback kept**: unparseable feedback JSON still returns today's default scores (removal is #229). The row records `status=error` with `error_message` starting `invalid_json`, because the evaluation needs to see these failures.
- **Errors propagate as today**: chat/greeting provider exceptions are re-raised after recording (greeting failure remains swallowed by `routers/sessions.py`; chat turn failure remains a 500).
- **Keys from environment only**; a configured provider without its key fails fast at startup.
- **Percentiles**: nearest-rank p50/p95 over `latency_ms` of all rows in the group (success and error), computed in Python because SQLite has no percentile function.

---

## Strategic Approach

### Solution Direction

1. **Config**: extend `Settings` with per-feature provider/model, `ANTHROPIC_API_KEY`, optional Claude effort per feature, and pricing file path; validate provider ids and that each configured provider has its key. `MISTRAL_API_KEY` becomes optional *in type* but is still required whenever any feature uses Mistral (the default), so default startup behaviour is unchanged.
2. **`services/llm/`**:
   - `base.py`: `LLMProvider` ABC, `LLMResult`, `LLMProviderError`, shared feedback prompt + JSON schema
   - `mistral_provider.py`: `Mistral(...).chat.complete_async(...)`, same messages and `response_format` as today; usage mapping incl. `prompt_tokens_details.cached_tokens`
   - `anthropic_provider.py`: `anthropic.AsyncAnthropic(api_key=...)`; `messages.create` with top-level `system`, `max_tokens`, `output_config={"effort": ...}`; feedback adds `output_config.format` `json_schema` matching `FeedbackResponse`; text taken from `text` blocks only; `stop_reason == "refusal"` raises `LLMProviderError`
   - `pricing.py`: load/validate JSON once (cached), `estimate_cost_usd`
   - `recorder.py`: `record_call(db, ...)`
   - `service.py`: `LLMService` + module singleton `llm_service`; `__init__.py` re-exports
3. **Compatibility**: `services/mistral.py` becomes a documented shim: `mistral_client = llm_service` (same object), so `patch('services.mistral.mistral_client.get_chat_response')` replaces the method the routers call. Because the method becomes `async`, `unittest.mock.patch` creates an `AsyncMock` automatically, so `return_value` and `side_effect` in the existing tests behave the same when awaited.
4. **Routers**: `await llm_service.get_chat_response(..., db=db, session_id=...)` / `await llm_service.get_feedback(...)`.
5. **Metrics**: `LLMCall` model, `schemas/llm_metrics.py`, `routers/metrics.py` (`APIRouter(prefix="/metrics")`, `GET /llm`), register in `main.py`; Vite proxy `'/metrics'`.
6. **Pricing data**: `data/llm_pricing.json` with values checked on 2026-11-13 (below).
7. **Docs**: `.env.example`, README, `CLAUDE.md` guardrail.
8. **Tests** (new files only) to 80%+ on the new modules.

### Prices checked on 2026-11-13

| Provider | Model | Input $/MTok | Output $/MTok | Cache read $/MTok | Source |
|---|---|---|---|---|---|
| mistral | mistral-large-latest | 0.50 | 1.50 | 0.05 (10% of input) | https://mistral.ai/pricing ; https://docs.mistral.ai/inference/conversations/advanced/prompt-caching |
| anthropic | claude-sonnet-5-5 | 2.00 | 10.00 | 0.10 | https://platform.claude.com/docs/en/about-claude/pricing |
| anthropic | claude-haiku-5-5 | 0.10 (≤100K prompt) / 0.50 (>100K) | 0.50 / 2.50 | 0.01 / 0.05 | same |
| anthropic | claude-opus-5-5 | 4.00 | 20.00 | 0.20 | same |

The Mistral pricing page does not name a version for "Mistral Large"; the entry is keyed `mistral-large-latest` and notes that.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| How to keep existing tests unchanged (they patch `services.mistral.mistral_client.get_chat_response`) | (a) keep `services/mistral.py` as an alias of the new service object: zero test edits, slightly odd module name; (b) edit the tests' patch target: cleaner, violates AC1 | **(a)**, with a docstring saying it is a compatibility alias; routers import `llm_service` from `services.llm` |
| Provider ids | `anthropic` matches the SDK, key name and pricing page; `claude` matches the issue's wording | **`mistral` / `anthropic`**, documented as "set to `anthropic` to use Claude"; no aliases |
| Where logging writes | Separate DB session isolates commits but in tests would bypass the overridden `get_db` (in-memory DB); the request's session is already the right DB | **Use the request's `AsyncSession`**: `db.add(row)` + `await db.commit()` inside a try/except. At each call site nothing else is pending (greeting: session already committed; chat/feedback: session not yet modified) |
| `db` optional on the service | Required makes logging impossible to skip; optional lets scripts/evals call without a DB | **Optional**; routers always pass it; no row when `db is None` (documented) |
| Claude feedback JSON | Prompt-only JSON can fail to parse; structured outputs (`output_config.format` json_schema) guarantee valid JSON; prefill is not supported on these models | **Structured outputs** with a schema mirroring `FeedbackResponse`; same French prompt text as Mistral (in `system`) |
| Claude chat history shape | Claude requires the first message to be `user` and at least one message; the greeting call has an empty history, and stored histories begin with the assistant greeting | Prepend a neutral French user turn (e.g. "(Début de la conversation.)") when the history is empty or starts with `assistant`; Mistral path unchanged |
| Claude thinking/effort | Claude Sonnet 5.5 defaults to effort `high`, Haiku 5.5 and Opus 5.5 to `medium`; uneven defaults would confound the comparison and slow chat | Set effort explicitly per feature via config: `CLAUDE_CHAT_EFFORT=low`, `CLAUDE_FEEDBACK_EFFORT=medium` (defaults); leave thinking at the model default (adaptive). Final text = `text` blocks only |
| Claude `max_tokens` | Too low truncates output (thinking counts against it) | `16000` (non-streaming default) |
| Server-side refusal fallbacks (`fallbacks="default"`, beta) for Sonnet/Opus 5.5 | Recommended by default for these models; but a fallback silently serves a *different* model than the one under evaluation, skewing cost/latency/quality per model | **Not enabled** (confirmed by the user, 2026-11-13); a `refusal` stop reason raises `LLMProviderError` and is recorded as `status=error` (`error_message="refusal: <category>"`) |
| Prompt caching | Lowers Claude cost on multi-turn chat, but adds cache-write pricing and changes the cost profile under evaluation | Out of scope; cache-read tokens recorded when reported |
| Price table format/location | Python dict = "prices in code"; DB table = needs seeding/UI; JSON under `data/` matches existing static config | **`data/llm_pricing.json`**, path overridable by `LLM_PRICING_FILE` |
| `llm_calls` columns beyond the AC | `session_id` links calls to sessions for the eval; `error_message` explains failures | Add both (nullable); `session_id` as plain int, no FK (sessions can be deleted) |
| `estimated_cost_usd` type | `Numeric` on SQLite has no native decimal storage and SQLAlchemy emits a warning per Decimal bind; float rounding is negligible for estimates | `Float` column; compute with `Decimal`, round to 8 places, store as float |
| `MISTRAL_API_KEY` | Keep required (Claude-only setups still need a dummy key) vs optional with validation | Optional type + validator requiring it when a feature uses Mistral; default startup behaviour unchanged (**confirmed by user**) |

### Alternatives Considered

- **LiteLLM or another multi-provider library**: rejected; it adds a large dependency the issue did not approve, and hides usage fields we need exactly (cache reads, refusals).
- **OpenAI-compatible endpoint for Claude**: rejected; the issue specifies the first-party Anthropic API, and the official SDK is the supported path.
- **Running the sync Mistral client in a thread (`run_in_threadpool`)**: rejected; the issue asks for async clients, and `mistralai` provides `complete_async`.
- **Middleware/decorator-based logging**: rejected; the recorder needs provider usage data and the request's DB session, which explicit calls in the service give more simply.
- **Computing percentiles in SQL**: rejected; SQLite has no percentile function and data volume is small.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Greeting call's feature name | Issue lists only `chat` and `feedback` | Log the greeting as `chat` (it uses chat config) |
| Feedback parse failure: success or error? | API call succeeded but output unusable | `status=error`, `error_message="invalid_json: …"`, fallback still returned (behaviour unchanged; #229 removes it) |
| Refusal fallbacks | Default recommendation for Sonnet/Opus 5.5 conflicts with eval integrity | Off; refusal recorded as error. **Confirmed by user** |
| Provider id spelling | "Claude" vs "anthropic" | `anthropic` (**confirmed by user**) |
| Metrics filters | AC only asks for totals and percentiles | No query parameters in this issue |
| Effort settings | Not in issue | Two optional settings (`CLAUDE_CHAT_EFFORT`, `CLAUDE_FEEDBACK_EFFORT`) that override the opinionated defaults (chat `low`, feedback `medium`) only when set (**confirmed by user**); documented in README, commented in `.env.example` |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Greeting with empty history on Claude | Anthropic API rejects empty `messages` | Prepend neutral user turn |
| History beginning with assistant greeting on Claude | First message must be `user` | Prepend neutral user turn |
| Model missing from price table | Cost unknown | `estimated_cost_usd = NULL`, warning logged, call proceeds |
| Haiku 5.5 prompt > 100K tokens | Higher price tier | Long-context tier applied by estimator |
| Provider raises (network, 401, 429 after SDK retries) | Must still log | Row with `status=error`, zero tokens, measured latency; exception re-raised |
| Claude `refusal` / `max_tokens` stop on feedback | No/partial JSON | Refusal → `LLMProviderError`, recorded and re-raised (like any provider exception); `max_tokens` truncation → JSON parse fails → fallback returned, `status=error` |
| Recorder DB failure | Must not break the request | Caught, logged via `logging`, rollback, user response unaffected |
| `db=None` (script use) | No session to write to | No row written |
| Mistral usage missing (`usage=None`) | Mocked/edge responses | Tokens default to 0 |
| `GET /metrics/llm` with no rows | Empty table | 200 with zero totals, empty groups, null percentiles |
| Unknown provider id in env | Misconfiguration | Startup `ValidationError` naming allowed values |
| `FEEDBACK_PROVIDER=anthropic` without `ANTHROPIC_API_KEY` | Misconfiguration | Startup `ValidationError` |

Note on feedback errors: today a feedback API exception propagates (500) and only JSON parse failures fall back. Keep that split: provider exceptions (incl. refusal) propagate after recording; parse failures fall back.

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| `patch()` on an async method not producing `AsyncMock` | Existing greeting tests fail | Python 3.8+ `patch` auto-detects coroutine functions → `AsyncMock`; verify by running the suite unchanged |
| Tests that create sessions without mocking now reach the real provider | Network calls in CI (pre-existing behaviour with the sync client) | Unchanged behaviour: the dummy key fails, the greeting failure is swallowed; the failure is now also recorded. New tests always mock SDKs |
| Committing the request session inside the recorder | Could flush unrelated pending changes | Audited call sites have nothing pending; documented in the recorder docstring |
| `anthropic` SDK version drift (2.x) | API shape differences | Pin `anthropic>=2.0.0`; install locally and test against the installed version |
| Pricing goes stale | Wrong cost estimates | `checked_on` + `source` per entry; README tells maintainers to re-check |
| Async `TestClient` + `AsyncMock` interplay | Flaky tests | Unit-test providers/service with `pytest.mark.asyncio`; API tests through the existing `client` fixture |
| Startup validation breaks CI | CI sets only `MISTRAL_API_KEY` | Default providers are Mistral, so CI config remains valid |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Default unchanged, existing tests pass unchanged | Yes | Relies on compat alias + AsyncMock auto-detection |
| AC2 | Claude feedback via `FeedbackResponse` | Yes | Structured outputs + same fallback; tested with mocked SDK |
| AC3 | One `llm_calls` row per call | Yes | Plus `session_id`, `error_message` |
| AC4 | Prices in one config table | Yes | `data/llm_pricing.json` |
| AC5 | `GET /metrics/llm` totals + p50/p95 | Yes | Grouped by feature, provider, model |
| AC6 | `.env.example` + README | Yes | |
| AC7 | `CLAUDE.md` guardrail | Yes | |

**AC Coverage Summary**: 7 of 7 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Event loop no longer blocked (async SDK calls)
- Vite `/metrics` proxy entry
- 80% coverage on new modules; no real API calls in tests
- Unused providers must not require keys or construct clients
- README API table, project structure and LLM integration sections updated

---

## REASONS Canvas

### Requirements
The seven ACs above: default behaviour unchanged with existing tests untouched; Claude feedback through `FeedbackResponse`; one `llm_calls` row per call with the listed fields; prices only in `data/llm_pricing.json` with date and source; `GET /metrics/llm` totals and p50/p95 by feature and model; documented env vars with no hardcoded keys; `CLAUDE.md` guardrail updated.

### Examples
- Default env → `POST /sessions/{id}/messages/` calls `Mistral.chat.complete_async(model="mistral-large-latest", messages=[system, ...history])`; one row `feature=chat, provider=mistral, model=mistral-large-latest, status=success`.
- Mistral usage `prompt_tokens=1200, completion_tokens=150, prompt_tokens_details.cached_tokens=200` → row `input_tokens=1000, output_tokens=150, cache_read_tokens=200`; cost = (1000×0.50 + 150×1.50 + 200×0.05)/1e6 = **$0.000735**.
- `FEEDBACK_PROVIDER=anthropic, FEEDBACK_MODEL=claude-haiku-5-5`, mocked response text `{"grammar_score": 70, …}`, usage `input_tokens=2000, output_tokens=400, cache_read_input_tokens=0` → `FeedbackResponse` returned; cost = (2000×0.10 + 400×0.50)/1e6 = **$0.0004**.
- Same with `claude-sonnet-5-5` → (2000×2 + 400×10)/1e6 = **$0.008**.
- Mocked Claude feedback returning non-JSON → default fallback dict returned; row `status=error`, `error_message` starts with `invalid_json`.
- Mocked Mistral raising `Exception("boom")` on a chat turn → row `status=error, error_message="boom"`, tokens 0; API returns 500 as today.
- Claude response with `stop_reason="refusal"` → `LLMProviderError`, row `status=error`, `error_message` starts with `refusal`.
- Latencies for one group `[100, 200, 300, 400, 1000]` ms → p50 = 300, p95 = 1000 (nearest rank).
- `GET /metrics/llm` on empty table → `{"totals": {"calls": 0, …}, "groups": []}`.
- `CHAT_PROVIDER=openai` → startup `ValidationError`.

### Architecture
- Layering stays `routers/` → `services/` → `models/` + `schemas/` (CLAUDE.md architecture map). New package `services/llm/` (approved), new router `routers/metrics.py` with prefix `/metrics` (approved), new model `models/llm_call.py` → table `llm_calls` (approved), created by `create_all` at startup.
- Async SQLAlchemy sessions via `Depends(get_db)` (`database.py:15-17`).
- Config via pydantic-settings `Settings` (`config.py`).
- Static JSON config under `data/` (like grammar and vocabulary data).

### Standards
- PEP 8, type hints, docstrings on public classes/functions, matching existing style (`models/base.py`, `routers/*.py`).
- 80% coverage minimum per new module; pytest + pytest-asyncio; SDKs mocked; no network.
- Existing tests must pass **without edits**.
- `python3` only; secrets only from env; never read or commit `.env`.
- README updated for new config, endpoint, structure; `.env.example` updated; commit `feat(#228): …`.

### Omissions
Schema-validated feedback / fallback removal (#229); eval harness (#231); prompt caching; streaming; frontend metrics UI; prompt changes; Bedrock/Vertex/Foundry; refusal fallbacks (pending confirmation); `llm_calls` retention; auth on `/metrics/`; migrating existing test patch targets.

### Notes
- `mistralai` 2.4.4 is installed: `from mistralai.client import Mistral`; `chat.complete_async` exists; `UsageInfo` has `prompt_tokens`, `completion_tokens`, and allows extra fields where `prompt_tokens_details.cached_tokens` arrives.
- `anthropic` (latest 2.8.0) is not yet installed locally; add `anthropic>=2.0.0` to `requirements.txt` and `pip install`.
- Anthropic usage: `usage.input_tokens` (uncached), `usage.output_tokens`, `usage.cache_read_input_tokens` (may be `None`), `usage.cache_creation_input_tokens` (0 without `cache_control`).
- Claude 5.5 models: no assistant prefill; thinking cannot be disabled on Opus 5.5 (and `disabled` 400s on Sonnet 5.5), so control cost/latency with `output_config.effort`; response content may include `thinking` blocks, so read only `text` blocks.
- Pass `api_key=settings.ANTHROPIC_API_KEY` explicitly: pydantic-settings reads `.env` but does not export to `os.environ`, so the SDK would not see it otherwise.
- `time.perf_counter()` around the SDK call for latency (includes SDK retries).
- Gotcha: new API prefix → Vite proxy entry (CLAUDE.md Gotchas).

### Solutions
- Router structure: `routers/feedback.py` / `routers/grammar.py` (APIRouter with prefix, `Depends(get_db)`, response_model).
- Model style: `models/session.py` on top of `models/base.py`.
- Schema style: `schemas/session.py` Pydantic models.
- Test style: `tests/test_sessions_listing.py` and `tests/test_initial_greeting.py` (`client` / `test_db` fixtures, `unittest.mock.patch`).
- Existing feedback prompt and fallback dict: `services/mistral.py:25-63`, moved verbatim into `services/llm/base.py` and shared by both providers.
- Claude SDK usage: official `anthropic` Python SDK (`AsyncAnthropic().messages.create`, `output_config` json_schema), per the Claude API reference.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
