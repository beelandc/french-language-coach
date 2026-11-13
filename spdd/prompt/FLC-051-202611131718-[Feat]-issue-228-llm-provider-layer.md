# SPDD Prompt: LLM Provider Layer with Claude Support and Per-Call Cost/Latency Logging

**GitHub Issue**: #228
**Issue Title**: LLM provider layer with Claude support and per-call cost and latency logging
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/228
**Artifact ID**: FLC-051-202611131718
**Created**: 2026-11-13 17:18
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [spdd/analysis/FLC-051-202611131709-[Analysis]-issue-228-llm-provider-layer.md](../analysis/FLC-051-202611131709-[Analysis]-issue-228-llm-provider-layer.md)

---

## Context

### Current Codebase State
- All LLM traffic goes through `MistralClient` in `services/mistral.py`, a **synchronous** `mistralai` client with the model hardcoded to `mistral-large-latest`. Three async routes call it, blocking the event loop.
- No token, latency or cost data is recorded anywhere.
- Tables are created by `Base.metadata.create_all` in the startup handler (`main.py:72-75`); there is no migration tool.
- The existing greeting tests patch `services.mistral.mistral_client.get_chat_response` and must keep passing **without edits** (AC1).
- `mistralai` 2.4.4 is installed (`from mistralai.client import Mistral`, `chat.complete_async` available). `anthropic` is not installed yet (latest on PyPI: 2.8.0).

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `services/mistral.py` | Current sync Mistral wrapper | `MistralClient.get_chat_response()` L14-22, `get_feedback()` L24-63 (French feedback prompt L25-41, JSON mode L49, fallback dict L54-63), `mistral_client` L67 |
| `services/__init__.py` | Exports `MistralClient` | L1-3 |
| `config.py` | pydantic-settings `Settings` (`MISTRAL_API_KEY` required, `DATABASE_URL`) | L4-11 |
| `routers/sessions.py` | Session creation + AI greeting | import L14; `get_chat_response` L55-57; failure swallowed L61-64 |
| `routers/messages.py` | Chat turn | import L8; `get_chat_response` L39-41 |
| `routers/feedback.py` | End-of-session feedback | import L8; `get_feedback` L32; `FeedbackResponse(**feedback)` L39 |
| `routers/__init__.py` | Router exports used by `main.py` | L1-9 |
| `main.py` | App, router registration, startup `create_all` | imports L8-16; startup L72-75; `include_router` L82-88 |
| `models/base.py` | `BaseModel` (id, created_at, updated_at) | L16-38 |
| `models/session.py` | Example model style | L11-47 |
| `models/__init__.py` | Model registry (ensures tables are created) | L1-8 |
| `schemas/session.py` | `FeedbackResponse` | L71-78 |
| `tests/conftest.py` | In-memory SQLite `test_db`, `client` fixture overriding `get_db` | L16-71 |
| `tests/test_initial_greeting.py` | Patches `services.mistral.mistral_client.get_chat_response` (L28, 49, 78, 105, 146, 184, 202, 231, 324) | must not change |
| `frontend/vite.config.ts` | Dev proxy | `server.proxy` L22-34 |
| `.env.example` | Env template | `MISTRAL_API_KEY=`, `DATABASE_URL=` |
| `README.md` | Docs | intro L3; setup L111-119; tech stack L163; architecture L166-208; project structure L210-345 (config L215, services L231, `.env.example` L341); API table L352-379; data flow L400-405; "Mistral LLM Integration" L423-460; limitations L566-570 |
| `CLAUDE.md` | Claude guardrails + architecture map | Guardrails "The app's LLM backend is the Mistral API…" and `.env` line; Architecture map `services/mistral.py` |
| `.github/workflows/pytest-tests.yml` | CI installs `requirements.txt`, sets `MISTRAL_API_KEY: dummy_test_key` | L51-59 |

### Existing Patterns
- **Routers**: `APIRouter(prefix=..., tags=[...])`, `db: AsyncSession = Depends(get_db)`, `response_model=` (see `routers/feedback.py`).
- **Models**: subclass `models.base.BaseModel`, `__tablename__`, SQLAlchemy `Column(...)` (see `models/session.py`), register in `models/__init__.py`.
- **Schemas**: Pydantic v2 `BaseModel` classes in `schemas/`.
- **Tests**: pytest + pytest-asyncio, `@pytest.mark.asyncio`, `client` / `test_db` fixtures, `unittest.mock.patch` / `AsyncMock`, Given/When/Then comments, module docstring naming the issue.
- **Static config**: JSON files under `data/`.

---

## Goal

**Primary Objective**: Introduce a provider-agnostic LLM layer in `services/llm/` with async Mistral and Claude providers selected per feature by config, record one `llm_calls` row per LLM call (tokens, latency, estimated cost, status), and expose `GET /metrics/llm`, while the default config behaves exactly as today.

**Secondary Objectives**:
- Stop blocking the event loop (async SDK clients).
- Keep prices in one dated, sourced JSON table.
- Document the new configuration (`.env.example`, README) and update the `CLAUDE.md` guardrail.

---

## Constraints

### Architecture Constraints
- Approved by the issue: `anthropic` dependency, `services/llm/` package, `llm_calls` table, `/metrics/` prefix. No other new dependencies, tables, or top-level directories.
- Routers must not import either SDK; only `services/llm/` does.
- Claude via the **first-party Anthropic API** using the official `anthropic` SDK (`AsyncAnthropic`), key passed explicitly from `settings.ANTHROPIC_API_KEY`.
- **No server-side refusal fallbacks** (user decision): no `fallbacks` parameter, no beta headers.
- **No prompt caching** (`cache_control`) in this issue.
- Prompts unchanged: scenario system prompts from `scenarios.py`; feedback prompt text moved verbatim from `services/mistral.py`.
- Keep today's feedback JSON fallback (removal is #229).
- Provider clients are created lazily, so an unused provider needs no key and builds no client.
- `services/mistral.py` remains as a compatibility alias so the existing patch target keeps working.

### Code Quality Constraints
- PEP 8, type hints, module and public function/class docstrings, consistent with existing code.
- No API keys or prices in Python code.
- Use `logging` (module loggers), not `print`.

### Testing Constraints
- **Do not edit any existing test file.** The full suite `python3 -m pytest tests/ -v --tb=short` must pass.
- New tests in new files only; mock both SDKs; no network calls.
- ≥80% line coverage for each new module (`services/llm/*`, `models/llm_call.py`, `routers/metrics.py`, `schemas/llm_metrics.py`) and for `config.py`.
- No frontend tests needed (only a Vite proxy entry changes).

### Acceptance Criteria
1. Default config behaves exactly as today (Mistral, `mistral-large-latest`), and existing tests pass unchanged
2. Setting the feedback provider to Claude produces feedback through the same `FeedbackResponse` schema
3. Each call writes one `llm_calls` row: feature, provider, model, input tokens, output tokens, cache-read tokens, latency in ms, estimated cost in USD, and success or error
4. Prices live in one config table with a date and source link, not in code
5. `GET /metrics/llm` returns totals and p50/p95 latency by feature and model
6. `.env.example` and README document the new variables (`ANTHROPIC_API_KEY`, `CHAT_PROVIDER`, `CHAT_MODEL`, `FEEDBACK_PROVIDER`, `FEEDBACK_MODEL`); no key is hardcoded
7. `CLAUDE.md` guardrail updated to reflect that this issue authorizes Anthropic API calls behind the provider layer

---

## Examples

### Input/Output Examples
1. **Default chat turn**
   - Input: default env; `POST /sessions/{id}/messages/` `{"content": "Bonjour"}`
   - Expected: `Mistral.chat.complete_async(model="mistral-large-latest", messages=[{"role": "system", "content": <scenario prompt>}, ...history, {"role": "user", "content": "Bonjour"}])`; one row `feature=chat, provider=mistral, model=mistral-large-latest, status=success`.
2. **Mistral usage normalisation + cost**
   - Input: usage `prompt_tokens=1200, completion_tokens=150, prompt_tokens_details={"cached_tokens": 200}`
   - Expected: `input_tokens=1000, output_tokens=150, cache_read_tokens=200`; cost `(1000*0.50 + 150*1.50 + 200*0.05) / 1e6 = 0.000735`.
3. **Claude feedback (Haiku 5.5)**
   - Input: `FEEDBACK_PROVIDER=anthropic, FEEDBACK_MODEL=claude-haiku-5-5`; mocked response with a `thinking` block then a `text` block containing valid feedback JSON; usage `input_tokens=2000, output_tokens=400, cache_read_input_tokens=None`
   - Expected: valid `FeedbackResponse`; request has `system=FEEDBACK_PROMPT`, one user message with the transcript, `output_config={"effort": "medium", "format": {"type": "json_schema", "schema": FEEDBACK_JSON_SCHEMA}}`, `max_tokens=16000`; row cost `(2000*0.10 + 400*0.50)/1e6 = 0.0004`, `cache_read_tokens=0`.
4. **Claude Sonnet 5.5 cost**: same usage → `(2000*2 + 400*10)/1e6 = 0.008`.
5. **Haiku long-context tier**: `input_tokens=150000, output_tokens=1000, cache_read=0` → `(150000*0.50 + 1000*2.50)/1e6 = 0.0775`.
6. **Effort override**: `CLAUDE_CHAT_EFFORT=high` → chat request `output_config={"effort": "high"}`; unset → `"low"`.
7. **Percentiles**: latencies `[100, 200, 300, 400, 1000]` → p50 `300`, p95 `1000` (nearest rank: `rank = ceil(p/100 * n)`).

### Edge Cases
- Claude greeting with empty history → messages `[{"role": "user", "content": "(Début de la conversation.)"}]`.
- Claude history starting with an assistant greeting → the same user turn prepended.
- Claude `stop_reason == "refusal"` → `LLMProviderError("refusal: <category or 'unspecified'>")` carrying usage; row `status=error` with those tokens and cost; exception re-raised.
- Provider exception (no usage) → row `status=error`, tokens 0, cost 0.0, measured latency, `error_message=str(exc)` truncated to 1000 chars; exception re-raised.
- Feedback text that is not JSON (or a non-object JSON value) → today's fallback dict returned; row `status=error`, `error_message` starting `invalid_json`.
- Model missing from the price table → `estimated_cost_usd=None`, warning logged, call proceeds.
- Recorder fails to write → exception logged, session rolled back, request still succeeds.
- `db=None` → no row written.
- Mistral `usage=None` or no `prompt_tokens_details` → tokens default to 0 / cached 0.
- Empty `llm_calls` → `GET /metrics/llm` returns zero totals, `null` percentiles, `groups: []`.
- `CHAT_PROVIDER=openai` → `ValidationError`; `FEEDBACK_PROVIDER=anthropic` with empty/missing `ANTHROPIC_API_KEY` → `ValidationError`; both features on `anthropic` and no `MISTRAL_API_KEY` → valid.

### Test Cases
```python
@pytest.mark.asyncio
async def test_mistral_usage_normalises_cached_tokens():
    # Given a mocked Mistral client returning cached-token usage
    client = MagicMock()
    client.chat.complete_async = AsyncMock(return_value=make_mistral_response(
        "Bonjour", prompt_tokens=1200, completion_tokens=150, cached_tokens=200))
    provider = MistralProvider(api_key="test", client=client)

    # When
    result = await provider.chat([{"role": "user", "content": "Salut"}], "SYS", "mistral-large-latest")

    # Then
    assert (result.text, result.input_tokens, result.output_tokens, result.cache_read_tokens) == ("Bonjour", 1000, 150, 200)


@pytest.mark.asyncio
async def test_feedback_endpoint_with_claude_returns_feedback_response(client, test_db):
    # Given a session with one exchange and a service routed to a mocked Claude client
    ...
    with patch("routers.feedback.llm_service", service):
        response = client.post(f"/sessions/{session_id}/feedback/")

    # Then
    assert response.status_code == 200
    FeedbackResponse(**response.json())
    metrics = client.get("/metrics/llm").json()
    assert metrics["groups"][0]["provider"] == "anthropic"
```

---

## Deliverables

### Code Changes
- [ ] `requirements.txt`: add `anthropic>=2.0.0`
- [ ] `config.py`: new settings + validator
- [ ] `services/llm/__init__.py`, `base.py`, `mistral_provider.py`, `anthropic_provider.py`, `pricing.py`, `recorder.py`, `service.py`
- [ ] `services/mistral.py`: compatibility alias; `services/__init__.py`: export the new service
- [ ] `models/llm_call.py` + register in `models/__init__.py`
- [ ] `schemas/llm_metrics.py`, `routers/metrics.py`, `routers/__init__.py`, `main.py`
- [ ] `routers/sessions.py`, `routers/messages.py`, `routers/feedback.py`: await the service, pass `db` and `session_id`
- [ ] `data/llm_pricing.json`
- [ ] `frontend/vite.config.ts`: `'/metrics'` proxy

### Tests
- [ ] `tests/test_llm_config.py`
- [ ] `tests/test_llm_pricing.py`
- [ ] `tests/test_llm_providers.py`
- [ ] `tests/test_llm_service.py`
- [ ] `tests/test_metrics_router.py`
- [ ] `tests/test_llm_provider_integration.py` (API-level: default Mistral chat path, Claude feedback path)

### Documentation
- [ ] `.env.example`
- [ ] `README.md` (intro, setup, tech stack, architecture, project structure, API table, data flow, LLM integration, limitations)
- [ ] `CLAUDE.md` guardrail, `.env` guardrail and architecture map
- [ ] Docstrings on all new public classes and functions

---

## Actual Prompt

```
Implement GitHub issue #228 in the French Language Coach repo (FastAPI + async SQLAlchemy +
SQLite, Python 3.12, use `python3`). Branch: feature/issue-228-llm-provider-layer.
Analysis: spdd/analysis/FLC-051-202611131709-[Analysis]-issue-228-llm-provider-layer.md

CONTEXT:
- services/mistral.py holds a SYNC Mistral client (`mistralai` 2.4.4,
  `from mistralai.client import Mistral`), model hardcoded "mistral-large-latest", with
  get_chat_response(messages, system_prompt) -> str and get_feedback(messages) -> dict
  (French feedback prompt, response_format={"type": "json_object"}, default-score fallback on
  bad JSON). Async routes call it: routers/sessions.py:55 (greeting, empty history, failure
  swallowed), routers/messages.py:39 (chat turn), routers/feedback.py:32 (feedback).
- config.py: pydantic-settings Settings (MISTRAL_API_KEY required, DATABASE_URL), env_file .env.
- Tables are created by Base.metadata.create_all at startup (main.py); models must be imported
  via models/__init__.py.
- tests/test_initial_greeting.py patches 'services.mistral.mistral_client.get_chat_response'
  (sync-style mocks with return_value / side_effect). Existing tests MUST pass unedited.
- tests/conftest.py: in-memory SQLite; `client` fixture overrides get_db; `test_db` yields an
  AsyncSession. CI sets only MISTRAL_API_KEY=dummy_test_key.
- `anthropic` SDK not installed yet; install it (pip3 install "anthropic>=2.0.0").

GOAL:
Provider-agnostic LLM layer with async Mistral and Claude providers chosen per feature by
config; one llm_calls row per call; GET /metrics/llm; defaults identical to today.

CONSTRAINTS / DESIGN (implement exactly):

1. requirements.txt: add `anthropic>=2.0.0` next to mistralai.

2. config.py Settings:
   - MISTRAL_API_KEY: Optional[str] = None
   - ANTHROPIC_API_KEY: Optional[str] = None
   - DATABASE_URL unchanged
   - CHAT_PROVIDER: Literal["mistral", "anthropic"] = "mistral"; CHAT_MODEL: str = "mistral-large-latest"
   - FEEDBACK_PROVIDER: same Literal = "mistral"; FEEDBACK_MODEL: str = "mistral-large-latest"
   - CLAUDE_CHAT_EFFORT / CLAUDE_FEEDBACK_EFFORT: Optional[Literal["low","medium","high","xhigh","max"]] = None
     (override opinionated defaults only when set)
   - LLM_PRICING_FILE: str = "data/llm_pricing.json"
   - model_validator(mode="after"): for each provider used by CHAT_PROVIDER/FEEDBACK_PROVIDER,
     the matching key must be non-empty (treat "" as missing), else raise ValueError naming the
     variable. So default config still requires MISTRAL_API_KEY (unchanged startup behaviour),
     and Claude-only config does not.
   - Keep `settings = Settings()` module singleton.

3. services/llm/base.py:
   - FEATURE_CHAT = "chat", FEATURE_FEEDBACK = "feedback"
   - @dataclass LLMResult(text: str, input_tokens: int = 0, output_tokens: int = 0,
     cache_read_tokens: int = 0, stop_reason: str | None = None). input_tokens means UNCACHED input.
   - class LLMProviderError(Exception): __init__(message, result: LLMResult | None = None).
   - FEEDBACK_PROMPT: the exact French prompt text from services/mistral.py.
   - FEEDBACK_FALLBACK: the exact fallback dict from services/mistral.py (return a copy when used).
   - FEEDBACK_JSON_SCHEMA: object schema with required grammar_score, vocabulary_score,
     fluency_score, overall_score (integer), strengths (array of string), focus_area (string),
     example_corrections (array of objects with required string original, corrected, explanation,
     additionalProperties false); additionalProperties false at top level. No min/max keywords.
   - build_transcript(messages) -> "\n".join(f"{role}: {content}") exactly as today.
   - abstract class LLMProvider(ABC): name: str; async chat(messages, system_prompt, model) ->
     LLMResult; async feedback(messages, model) -> LLMResult (raw JSON text in .text).

4. services/llm/mistral_provider.py: MistralProvider(api_key, client=None) using
   `Mistral(api_key=...)` unless a client is injected.
   - chat: await client.chat.complete_async(model=model, messages=[{"role": "system",
     "content": system_prompt}] + messages)  (same payload as today)
   - feedback: await client.chat.complete_async(model=model, messages=[{"role": "system",
     "content": FEEDBACK_PROMPT}, {"role": "user", "content": build_transcript(messages)}],
     response_format={"type": "json_object"})
   - text = response.choices[0].message.content; usage mapping: prompt = usage.prompt_tokens or 0,
     completion = usage.completion_tokens or 0, cached = prompt_tokens_details.cached_tokens
     (details may be a dict or an object, or absent/None; usage may be None) ->
     LLMResult(input_tokens=max(prompt - cached, 0), output_tokens=completion, cache_read_tokens=cached,
     stop_reason=choices[0].finish_reason if present).

5. services/llm/anthropic_provider.py: AnthropicProvider(api_key, chat_effort=None,
   feedback_effort=None, client=None) using anthropic.AsyncAnthropic(api_key=api_key) unless injected.
   - DEFAULT_EFFORT = {"chat": "low", "feedback": "medium"}; MAX_TOKENS = 16000;
     CONVERSATION_START = "(Début de la conversation.)"
   - to_claude_messages(messages): keep only {"role","content"} for user/assistant items; if the
     list is empty or the first role is not "user", prepend {"role": "user", "content": CONVERSATION_START}.
   - chat: await client.messages.create(model=model, max_tokens=MAX_TOKENS, system=system_prompt,
     messages=to_claude_messages(messages), output_config={"effort": chat_effort or DEFAULT})
   - feedback: await client.messages.create(model=model, max_tokens=MAX_TOKENS, system=FEEDBACK_PROMPT,
     messages=[{"role": "user", "content": build_transcript(messages)}],
     output_config={"effort": feedback_effort or DEFAULT, "format": {"type": "json_schema",
     "schema": FEEDBACK_JSON_SCHEMA}})
   - Do NOT send thinking, temperature, fallbacks, betas or cache_control.
   - Result: text = "".join(block.text for blocks with type == "text") (skip thinking blocks);
     input_tokens = usage.input_tokens or 0; output_tokens = usage.output_tokens or 0;
     cache_read_tokens = usage.cache_read_input_tokens or 0; stop_reason = response.stop_reason.
     If stop_reason == "refusal": raise LLMProviderError(f"refusal: {category}", result) where
     category = response.stop_details.category if available else "unspecified".

6. services/llm/pricing.py:
   - Pydantic models PriceTier(input_per_mtok, output_per_mtok, cache_read_per_mtok: float >= 0),
     LongContextTier(PriceTier + threshold_tokens: int > 0), PriceEntry(provider, model, prices
     as PriceTier fields, long_context: LongContextTier | None, checked_on: date, source: HttpUrl
     or str starting with https, notes: str | None), PriceTable(currency="USD", unit, models: list).
   - load_price_table(path: str | None = None) -> dict[(provider, model), PriceEntry]; relative
     paths resolve against the repo root (Path(__file__).resolve().parents[2]); cached per path
     (functools.lru_cache); duplicates -> ValueError.
   - estimate_cost_usd(provider, model, input_tokens, output_tokens, cache_read_tokens,
     table=None) -> float | None: None (and logger.warning) when no entry; use long_context tier
     when input_tokens + cache_read_tokens > threshold_tokens; compute with Decimal(str(price)),
     divide by 1_000_000, round to 8 decimal places, return float.

7. data/llm_pricing.json (checked_on "2026-11-13"):
   - mistral / mistral-large-latest: 0.50 / 1.50 / 0.05; source https://mistral.ai/pricing;
     notes: cache read = 10% of input per https://docs.mistral.ai/inference/conversations/advanced/prompt-caching;
     pricing page lists "Mistral Large" without a version.
   - anthropic / claude-sonnet-5-5: 2.00 / 10.00 / 0.10
   - anthropic / claude-haiku-5-5: 0.10 / 0.50 / 0.01, long_context {threshold_tokens 100000,
     0.50 / 2.50 / 0.05}
   - anthropic / claude-opus-5-5: 4.00 / 20.00 / 0.20
   - Anthropic source: https://platform.claude.com/docs/en/about-claude/pricing
   - Top level: "currency": "USD", "unit": "per_million_tokens", "description" telling maintainers
     to re-check prices and update checked_on.

8. models/llm_call.py: LLMCall(BaseModel), __tablename__ "llm_calls": feature String(20) not null
   index; provider String(20) not null; model String(100) not null index; session_id Integer
   nullable index (no FK); input_tokens, output_tokens, cache_read_tokens Integer not null default 0;
   latency_ms Integer not null; estimated_cost_usd Float nullable; status String(10) not null
   ("success"|"error"); error_message Text nullable. Docstring. Register in models/__init__.py.

9. services/llm/recorder.py: async record_call(db, *, feature, provider, model, latency_ms, status,
   result=None, session_id=None, error_message=None) -> LLMCall | None. Computes cost via
   estimate_cost_usd from result tokens (zeros when result is None). db.add + await db.commit();
   on any exception: logger.exception, await db.rollback() (guarded), return None. Truncate
   error_message to 1000 chars. Docstring notes it commits the caller's session and that call
   sites have nothing else pending.

10. services/llm/service.py: class LLMService(settings=None, providers=None).
    - _route(feature) -> (provider_id, model) from settings.
    - _get_provider(provider_id): injected or lazily built and cached via build_provider():
      "mistral" -> MistralProvider(settings.MISTRAL_API_KEY); "anthropic" ->
      AnthropicProvider(settings.ANTHROPIC_API_KEY, settings.CLAUDE_CHAT_EFFORT,
      settings.CLAUDE_FEEDBACK_EFFORT); unknown -> ValueError.
    - async get_chat_response(messages, system_prompt, db=None, session_id=None) -> str
    - async get_feedback(messages, db=None, session_id=None) -> dict: json.loads(result.text);
      if parsing fails or the value is not a dict -> FEEDBACK_FALLBACK copy and the row gets
      status "error", error_message "invalid_json: <reason>".
    - Timing: time.perf_counter() around the provider call; latency_ms = int(round(ms)).
    - On exception: record status "error" (with exc.result if LLMProviderError) then re-raise.
    - Record only when db is not None. Exactly one row per provider call.
    - Module singleton: llm_service = LLMService().
    services/llm/__init__.py re-exports LLMService, llm_service, LLMResult, LLMProviderError,
    LLMProvider, FEATURE_CHAT, FEATURE_FEEDBACK.

11. services/mistral.py: replace with a documented compatibility alias:
    `from services.llm import llm_service as mistral_client` (+ __all__), explaining it exists so
    the existing test patch target keeps working and pointing new code at services.llm.
    services/__init__.py: export LLMService and llm_service (drop MistralClient).

12. Routers: import `from services.llm import llm_service` and await it:
    - sessions.py: `await llm_service.get_chat_response(messages, scenario_with_difficulty["system_prompt"], db=db, session_id=new_session.id)`
    - messages.py: `await llm_service.get_chat_response(messages, scenario["system_prompt"], db=db, session_id=session.id)`
    - feedback.py: `await llm_service.get_feedback(messages, db=db, session_id=session.id)`
    Nothing else changes in their behaviour. (services.mistral.mistral_client IS llm_service, so
    the existing patch replaces the method on the shared instance; patch() auto-creates an
    AsyncMock because the method is async.)

13. schemas/llm_metrics.py: LLMMetricsStats(calls, errors, input_tokens, output_tokens,
    cache_read_tokens: int; estimated_cost_usd: float; unpriced_calls: int;
    latency_p50_ms, latency_p95_ms: int | None); LLMMetricsGroup(LLMMetricsStats + feature,
    provider, model); LLMMetricsResponse(totals: LLMMetricsStats, groups: list[LLMMetricsGroup]).

14. routers/metrics.py: APIRouter(prefix="/metrics", tags=["metrics"]); GET "/llm" ->
    LLMMetricsResponse. Select the needed LLMCall columns, group in Python by
    (feature, provider, model), sorted; nearest-rank percentile helper
    percentile(values, p) -> int | None. Cost sum ignores NULLs (counted in unpriced_calls),
    rounded to 8 places. Export from routers/__init__.py and include in main.py.

15. frontend/vite.config.ts: add `'/metrics': 'http://localhost:8000'` to server.proxy with a comment.

EXAMPLES:
- Mistral usage prompt 1200 / completion 150 / cached 200 -> input 1000, output 150, cache 200,
  cost 0.000735.
- Claude Haiku 5.5 2000 in / 400 out -> 0.0004; Sonnet 5.5 -> 0.008; Haiku 150000 in / 1000 out
  -> 0.0775 (long-context tier).
- Claude empty history -> [{"role": "user", "content": "(Début de la conversation.)"}].
- Claude refusal -> LLMProviderError("refusal: cyber"), error row with tokens, re-raised.
- Feedback "not json" -> fallback dict, error row "invalid_json: ...".
- Latencies [100,200,300,400,1000] -> p50 300, p95 1000. Empty table -> zero totals, null
  percentiles, groups [].
- CHAT_PROVIDER=openai -> ValidationError; FEEDBACK_PROVIDER=anthropic without key ->
  ValidationError; both anthropic + ANTHROPIC_API_KEY, no MISTRAL_API_KEY -> valid.

ACCEPTANCE CRITERIA:
1. Default config behaves exactly as today (Mistral, mistral-large-latest); existing tests pass unchanged
2. FEEDBACK_PROVIDER=anthropic produces feedback through FeedbackResponse
3. One llm_calls row per call with feature, provider, model, input/output/cache-read tokens,
   latency ms, estimated cost USD, success/error
4. Prices in one config table with date and source link, not in code
5. GET /metrics/llm returns totals and p50/p95 latency by feature and model
6. .env.example and README document ANTHROPIC_API_KEY, CHAT_PROVIDER, CHAT_MODEL,
   FEEDBACK_PROVIDER, FEEDBACK_MODEL; no hardcoded key
7. CLAUDE.md guardrail updated: Anthropic calls authorized by #228 behind services/llm/

DELIVERABLES:
- Code per items 1-15.
- New tests (no edits to existing tests; SDKs mocked; no network): tests/test_llm_config.py,
  tests/test_llm_pricing.py, tests/test_llm_providers.py, tests/test_llm_service.py,
  tests/test_metrics_router.py, tests/test_llm_provider_integration.py (default Mistral chat via
  API asserts model/payload + llm_calls row; Claude feedback via API returns valid
  FeedbackResponse and appears in /metrics/llm). >=80% coverage per new module.
- .env.example: add ANTHROPIC_API_KEY=, CHAT_PROVIDER=mistral, CHAT_MODEL=mistral-large-latest,
  FEEDBACK_PROVIDER=mistral, FEEDBACK_MODEL=mistral-large-latest, commented optional
  CLAUDE_CHAT_EFFORT / CLAUDE_FEEDBACK_EFFORT / LLM_PRICING_FILE, with short comments.
- README.md: intro (Claude support available), setup (env vars table), tech stack, architecture
  and project structure (services/llm/, models/llm_call.py, routers/metrics.py,
  schemas/llm_metrics.py, data/llm_pricing.json, services/mistral.py alias), API table
  (GET /metrics/llm), data flow, rename "Mistral LLM Integration" to "LLM Integration" with
  provider config, Claude specifics, cost/latency logging and price-table maintenance; limitations.
- CLAUDE.md: guardrail says LLM calls go through services/llm/ (Mistral default); #228
  authorizes Anthropic API calls only behind that layer; .env holds MISTRAL_API_KEY and
  ANTHROPIC_API_KEY; architecture map points at services/llm/.
- Run python3 -m pytest tests/ -v --tb=short and coverage; report results honestly.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the Actual Prompt above, after the user's go-ahead on 2026-11-13.

- **Provider layer** `services/llm/`: `base.py` (interface, `LLMResult`, `LLMProviderError`, verbatim feedback prompt and fallback, `FEEDBACK_JSON_SCHEMA`), `mistral_provider.py` (`chat.complete_async`, same payloads as before, cached-token normalisation), `anthropic_provider.py` (`AsyncAnthropic().messages.create`, explicit effort, structured-output feedback, neutral first user turn, refusal → `LLMProviderError`), `pricing.py`, `recorder.py`, `service.py` (`LLMService`, `llm_service`).
- **Config** (`config.py`): `ANTHROPIC_API_KEY`, `CHAT_PROVIDER`/`CHAT_MODEL`, `FEEDBACK_PROVIDER`/`FEEDBACK_MODEL`, optional `CLAUDE_CHAT_EFFORT`/`CLAUDE_FEEDBACK_EFFORT`/`LLM_PRICING_FILE`; validator requires a key for each configured provider (empty string = missing).
- **Data/metrics**: `models/llm_call.py` (`llm_calls`), `data/llm_pricing.json` (checked 2026-11-13), `schemas/llm_metrics.py`, `routers/metrics.py` (`GET /metrics/llm`), registered in `routers/__init__.py` and `main.py`; Vite `/metrics` proxy.
- **Routers** await `llm_service` and pass `db` + `session_id`; `services/mistral.py` is now a compatibility alias (`mistral_client is llm_service`).
- **Dependency**: `anthropic>=2.0.0` (2.8.0 installed locally).
- **Tests** (new files only; SDKs mocked): `tests/llm_fakes.py` (helpers), `test_llm_config.py`, `test_llm_pricing.py`, `test_llm_providers.py`, `test_llm_service.py`, `test_metrics_router.py`, `test_llm_provider_integration.py` (94 tests).
- **Docs**: `.env.example`, `README.md` (intro, setup + env var table, tech stack, architecture, project structure, API table, data flow, "LLM Integration" section, limitations), `CLAUDE.md` (guardrail, `.env` line, architecture map).

---

## Human Review Notes

### Changes Made
- [x] Added `tests/llm_fakes.py`, a shared helper module for fake SDK responses, not listed in the prompt's deliverables. Reason: the provider, service and integration tests all need the same fakes.
- [x] Fixed a wrong expectation in my own new test (`test_rounds_to_eight_decimals` expected `0.0`; correct value is `0.00000012`). No production code change.
- [x] Feedback fallback copy uses `copy.deepcopy(FEEDBACK_FALLBACK)` so callers can't mutate the shared default (covered by `test_fallback_copy_is_independent`).
- [x] Otherwise implemented as specified; no deviations in behaviour from the Actual Prompt.

### Quality Checks
- [x] Code follows existing patterns (router/model/schema style, Given/When/Then tests)
- [x] Tests pass at 80%+ coverage on every new module
- [x] Documentation updated
- [x] All acceptance criteria met (see Verification)

### Issues Found
- `routers/metrics.py` shows 81% line coverage although every line runs in the endpoint tests: coverage.py doesn't trace code after an `await` on async SQLAlchemy inside the TestClient thread (no `concurrency = greenlet` setting in the repo's coverage config). Left as is; changing coverage config is outside this issue.
- Pre-existing: tests that create sessions without mocking the LLM reach the real provider client (as before with the sync client); the dummy CI key makes the greeting fail and it is swallowed. Those failed greetings are now also logged as `llm_calls` error rows in the test database. Behaviour unchanged otherwise.
- Pre-existing and unrelated: `npx tsc -b` reports 69 errors in `frontend/src/**` both before and after this change; none in `vite.config.ts`.
- `.vibe/instructions.md` still says "Backend: FastAPI, SQLAlchemy async, Mistral API". Per CLAUDE.md, that shared file is edited in its own issue, so it was left unchanged.

---

## Verification

Test runs on 2026-11-13 (local, Python 3.12.8, `anthropic` 2.8.0, `mistralai` 2.4.4):

- `python3 -m pytest tests/ -v --tb=short` → **669 passed, 1 xfailed** (baseline on `main`: 575 passed, 1 xfailed; same 575 existing tests pass with no edits to existing test files)
- Coverage (`--cov=.`): overall 94%; `config.py` 100%, `services/llm/*` 100%, `models/llm_call.py` 100%, `schemas/llm_metrics.py` 100%, `routers/metrics.py` 81%
- Manual smoke test: `uvicorn main:app` with default config on a scratch SQLite DB → startup OK, `llm_calls` table created, `GET /metrics/llm` → 200 with zero totals

- [x] AC1: default config is Mistral `mistral-large-latest` with the same payloads (`test_chat_sends_original_payload`, `test_feedback_uses_json_mode_and_shared_prompt`, `test_chat_turn_uses_mistral_large_and_logs_call`); existing tests pass unedited
- [x] AC2: `FEEDBACK_PROVIDER=anthropic` returns a valid `FeedbackResponse` (`test_feedback_with_claude_returns_feedback_response`)
- [x] AC3: one `llm_calls` row per call with all listed fields, on success and on error (`TestChat`, `TestFeedback`, `test_greeting_logged_with_session_id`, `test_failed_chat_turn_logged_as_error`)
- [x] AC4: prices only in `data/llm_pricing.json` with `checked_on` + https `source` (`TestShippedPriceTable`)
- [x] AC5: `GET /metrics/llm` totals + p50/p95 by feature/provider/model (`TestMetricsEndpoint`)
- [x] AC6: `.env.example` and README document the variables; keys only from env
- [x] AC7: `CLAUDE.md` guardrail updated
- [x] Code follows project conventions
- [x] No breaking changes introduced (default behaviour and response shapes unchanged)
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
