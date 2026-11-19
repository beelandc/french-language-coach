# SPDD Analysis: Bounded LLM Provider Requests

**GitHub Issue**: #267
**Issue Title**: Set explicit request timeouts for LLM provider calls
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/267
**Artifact ID**: FLC-068-202611191629
**Created**: 2026-11-19 16:29 (Asia/Shanghai)
**Author**: OpenAI Codex (GPT-6, AI Assistant)

## Original Business Requirement

The Mistral and Anthropic SDK clients have no application-configured request timeout or explicit retry policy. A Mistral request on an established connection stopped receiving data and was interrupted after about 12 minutes; Anthropic defaults to a 600-second read timeout and retries twice. Configure bounded timeouts and explicit retry behavior for both providers, record descriptive timeout errors, and return clear errors from chat and feedback instead of hanging.

Acceptance criteria:

1. Both providers use an explicit configurable request timeout, documented in `README.md` and `.env.example`.
2. Retry behavior for both SDK clients is explicit.
3. Timeouts create an `llm_calls` error row with a non-empty descriptive `error_message`.
4. Chat and feedback endpoints return a clear timeout error.
5. Mocked provider tests cover timeout handling for Mistral and Anthropic.

## Background and Business Value

A stalled connection ties up a learner's request for minutes and may leave metrics without a useful error. The failure affects both live chat and end-of-session feedback, and also the feedback evaluation path through `LLMService`.

The recent feedback evaluation reports Mistral p50/p95 latency of 39.265/60.039 seconds with rubric and 30.929/43.563 seconds without it; five rubric calls timed out at the SDK's 60-second default. Claude Sonnet's p95 was 5.519 seconds. A shared 120-second timeout gives the slower measured Mistral workload headroom while bounding a stalled request. SDK retries will be disabled for both providers so one configured request timeout cannot be multiplied by hidden retry/backoff attempts; a user can retry after receiving an HTTP error.

## Scope

### In

- Validate and expose `LLM_TIMEOUT_SECONDS`, defaulting to 120.
- Pass the configured timeout and an explicit no-retry policy to both SDK clients.
- Convert SDK timeout exceptions to a typed provider error with the configured timeout and exception type.
- Map timeout errors from chat and feedback to actionable HTTP 502 responses while preserving session state.
- Test client construction, provider error conversion, persisted errors, and both endpoint responses.
- Document the setting and retry policy.

### Out

- Changing provider/model defaults, request payloads, streaming, the feedback evaluation harness, or general network retry policy.
- Adding dependencies or changing database/schema behavior.

## Domain Concepts and Call Path

- `Settings` in `config.py` supplies per-process LLM configuration.
- `build_provider()` in `services/llm/service.py` constructs and caches provider clients for chat and feedback.
- `MistralProvider` and `AnthropicProvider` make async SDK calls. `AnthropicProvider` also serves the study-coach tool runner through the same client.
- `LLMService._timed_call()` records provider failures in `llm_calls` and re-raises them.
- `routers/messages.py` currently lets provider exceptions escape; `routers/feedback.py` maps provider errors to a generic unusable-response message.

## Strategic Approach

1. Set the request timeout at each SDK client, where the transport can stop waiting on the stalled request.
2. Disable SDK retries explicitly: Anthropic `max_retries=0`; Mistral `RetryConfig` strategy `none`.
3. Translate only SDK timeout exceptions into `LLMProviderTimeoutError`; let unrelated failures keep their existing behavior.
4. Map that error to specific 502 messages at chat and feedback boundaries. Keep feedback session mutation after successful generation only.
5. Assert the database error row is descriptive and non-empty for both provider families.

| Decision | Alternative | Recommendation |
|---|---|---|
| Enforce timeout in SDK client | Wrap service call in `asyncio.wait_for` | SDK timeout reaches the HTTP transport and avoids relying on cancellation of an in-flight SDK request. |
| Disable automatic SDK retries | Keep vendor defaults or retry once | No hidden backoff multiplication; users receive a prompt failure and may retry intentionally. |
| Use 120 seconds | Use the existing 60-second Mistral default | Recent Mistral feedback calls reached the 60-second ceiling; 120 seconds allows headroom while bounding stalls. |

## Risks and Edge Cases

| Case | Expected behavior |
|---|---|
| Empty timeout exception message | Persist a message containing timeout category, configured seconds, and exception type. |
| Non-timeout provider error | Preserve existing provider error handling and status mapping. |
| Feedback timeout | Return 502 and leave the session open and feedback unset. |
| Chat timeout | Return 502 without appending an assistant reply or committing a partial exchange. |
| Invalid timeout configuration | Reject zero and negative values during Settings validation. |
| Injected test client | Keep injection behavior; SDK constructor assertions verify production timeout/retry options. |

## REASONS Canvas

### Requirements

Meet all five Issue acceptance criteria without changing provider/model selection.

### Examples

- Given a Mistral or Anthropic SDK timeout with an empty message, the provider raises a descriptive typed error; `llm_calls.error_message` is non-empty.
- Given a chat or feedback timeout, the corresponding endpoint returns HTTP 502 with a timeout-specific message; feedback remains open.
- Given a successful provider response, existing output and persistence behavior is unchanged.

### Architecture

Follow the existing Settings → `build_provider()` → provider → `LLMService._timed_call()` → router path. Use existing `LLMProviderError` inheritance so existing service telemetry remains in place.

### Standards

Follow `.vibe/instructions.md`, SPDD order, Python 3.12+, existing pytest/async fixture style, and the repository's 80% coverage threshold. Do not add a package dependency.

### Omissions

No model/provider default changes, streaming, schema changes, retries at the application layer, or eval harness changes.

### Notes

The issue reports a 12-minute stalled Mistral call and Anthropic's 600-second/two-retry defaults. Eval `feedback_eval_20261117-034654` records Mistral p95 values of 60.039 seconds with rubric and 43.563 seconds without; `docs/decisions/002-feedback-rubric.md` identifies the SDK's 60-second default as the cause of five timed-out rubric calls.

### Solutions

Configure each vendor's supported SDK timeout/retry options, wrap only timeout exceptions, and test at provider and HTTP boundaries with mocked clients.
