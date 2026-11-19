# SPDD Prompt: Bounded LLM Provider Requests

**GitHub Issue**: #267
**Issue Title**: Set explicit request timeouts for LLM provider calls
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/267
**Artifact ID**: FLC-068-202611191629
**Created**: 2026-11-19 16:29 (Asia/Shanghai)
**Author**: OpenAI Codex (GPT-6, AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-068-202611191629-[Analysis]-issue-267-llm-timeouts.md`

## Context

All app LLM calls go through `services/llm/`. `LLMService._timed_call()` records an error row and re-raises. Chat is handled by `routers/messages.py`; feedback is handled by `routers/feedback.py`. Mistral calls use `timeout_ms` and `retry_config`; Anthropic uses `timeout` and `max_retries`. The Anthropic client is also used by the study-coach runner.

The recent feedback eval measured Mistral p95 latency at 60.039 seconds with the rubric (five calls timed out at the existing SDK default) and 43.563 seconds without the rubric. Claude Sonnet p95 was 5.519 seconds. Use a shared, configurable 120-second SDK timeout to give the slower evaluated path headroom. Disable SDK automatic retries for both clients; otherwise retries/backoff can multiply the request timeout into multi-minute waits.

## Goal

Implement Issue #267 as a minimal complete backend change: bound both SDK clients, make timeout errors useful in metrics, return clear HTTP 502 errors for chat and feedback timeouts, and verify the full path with mocked tests.

## Constraints

- Follow the current dependency APIs installed from `requirements.txt`; do not add dependencies or change the provider/model defaults.
- Add `LLM_TIMEOUT_SECONDS` with a positive-value validation, default `120`, and pass it through `build_provider()`.
- Set Anthropic `max_retries=0` and Mistral retry strategy to `none`; document this explicit behavior.
- Translate only SDK timeout exceptions into a typed `LLMProviderError` subtype whose message includes the configured timeout and exception type. Do not swallow unrelated failures.
- Map timeout errors to clear 502 responses in both routers. Keep failed feedback sessions open and avoid committing a partial chat exchange.
- Preserve client injection for tests and all success-path behavior.
- Update `.env.example` and the README configuration/LLM integration documentation.
- Create tests for both providers, telemetry, and both HTTP endpoints. Keep new/changed module coverage at or above the repository's 80% requirement.
- Do not run paid model calls or change eval data.

## Acceptance Criteria

1. Mistral and Anthropic requests use the explicit configurable timeout, documented in `.env.example` and `README.md`.
2. Both SDK clients explicitly disable automatic retries.
3. Timeout failures are recorded as error rows with descriptive non-empty `error_message` values.
4. Chat and feedback timeout requests return clear HTTP 502 responses; feedback session state remains open.
5. Mocked regression tests cover timeout handling for both provider clients.

## Examples and Test Cases

- Construct each provider through `build_provider()` and assert the SDK receives the timeout; assert Mistral retry strategy is `none` and Anthropic `max_retries` is `0`.
- Raise an empty-message Mistral HTTP timeout and an Anthropic `APITimeoutError`; assert each becomes the typed provider timeout error with seconds and source exception type.
- Send a chat request whose mock provider times out; assert HTTP 502 and a persisted non-empty `llm_calls.error_message`.
- Send a feedback request whose mock provider times out; assert HTTP 502, a persisted non-empty error, and no `ended_at`/feedback mutation.
- Verify a non-timeout provider exception remains distinguishable and successful requests keep existing response behavior.

## Deliverables

- [ ] `config.py`, `services/llm/service.py`, `services/llm/base.py`, both provider modules, and the chat/feedback routers updated as needed.
- [ ] Focused provider/service/router regression tests.
- [ ] `.env.example` and README documentation updated.
- [ ] SPDD artifacts completed with actual implementation and verification notes.

## Actual Prompt

> Implement Issue #267 using the analysis above. First inspect the installed Mistral and Anthropic timeout/retry APIs and preserve compatibility with the repository's existing async provider interfaces. Configure a positive `LLM_TIMEOUT_SECONDS` setting (default 120) in both SDK clients and disable SDK automatic retries explicitly. Wrap only provider timeout exceptions in a descriptive typed provider error, let `LLMService` persist it, and return specific 502 messages from both chat and feedback. Cover both provider families, persisted telemetry, endpoint behavior, and feedback state preservation with mocked tests. Update `.env.example` and README, keep all success behavior and provider/model defaults unchanged, then run the focused and complete Windows project checks. Do not add dependencies or make paid API calls.

## AI Response

Implemented configurable 120-second timeouts for both SDK clients and disabled their
automatic retries. SDK timeouts now become descriptive provider errors; chat and
feedback return clear 502 responses, while failed sessions remain unchanged. The
Anthropic study-coach runner also preserves usage from earlier turns when a later
request times out. No dependency or database changes were needed.

## Human Review Notes

Reviewed the final diff against all five acceptance criteria. The chat router catches
only the typed timeout error, preserving the existing behavior for other provider
failures. The feedback route retains its existing error mappings. Provider/model
defaults and request payloads are unchanged.

## Verification

- [x] All five acceptance criteria are covered by provider, configuration, telemetry,
  and HTTP endpoint tests.
- [x] Focused Windows tests: 138 passed.
- [x] Full backend suite and clean-base comparison recorded: 1,220 passed, 4 failed,
  and 1 xfailed on the candidate; the same four failures occur on the clean base.
- [x] Total coverage was 96.64%, and all non-allowlisted modules met the 80% gate.
- [x] `git diff --check` passed. The repository has no backend-specific formatter,
  linter, or type-check configuration.
- [x] No new type suppressions; timeout exception types, optional accumulated usage,
  and the provider timeout setting match their runtime call paths.
