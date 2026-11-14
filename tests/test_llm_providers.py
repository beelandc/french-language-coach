"""Tests for issue #228: Mistral and Claude provider implementations (SDKs mocked)."""

from types import SimpleNamespace
from unittest.mock import patch

import pytest

from services.llm.anthropic_provider import (
    CONVERSATION_START,
    MAX_TOKENS,
    AnthropicProvider,
    to_claude_messages,
)
from services.llm.base import (
    FEEDBACK_JSON_SCHEMA,
    FEEDBACK_PROMPT,
    LLMProviderError,
    build_transcript,
)
from services.llm.mistral_provider import MistralProvider
from tests.llm_fakes import (
    VALID_FEEDBACK_JSON,
    make_claude_client,
    make_claude_response,
    make_mistral_client,
    make_mistral_response,
)

HISTORY = [
    {"role": "assistant", "content": "Bonjour ! Que désirez-vous ?"},
    {"role": "user", "content": "Un café, s'il vous plaît."},
]


class TestBuildTranscript:
    def test_renders_role_content_lines(self):
        assert build_transcript(HISTORY) == (
            "assistant: Bonjour ! Que désirez-vous ?\nuser: Un café, s'il vous plaît."
        )


class TestMistralProvider:
    @pytest.mark.asyncio
    async def test_chat_sends_original_payload(self):
        # Given
        client = make_mistral_client(make_mistral_response("Très bien."))
        provider = MistralProvider(api_key="test", client=client)

        # When
        result = await provider.chat(HISTORY, "SYS", "mistral-large-latest")

        # Then: system prompt first, then the history, no extra parameters
        client.chat.complete_async.assert_awaited_once_with(
            model="mistral-large-latest",
            messages=[{"role": "system", "content": "SYS"}] + HISTORY,
        )
        assert result.text == "Très bien."
        assert result.stop_reason == "stop"

    @pytest.mark.asyncio
    async def test_feedback_uses_json_mode_and_shared_prompt(self):
        client = make_mistral_client(make_mistral_response(VALID_FEEDBACK_JSON))
        provider = MistralProvider(api_key="test", client=client)

        result = await provider.feedback(HISTORY, "mistral-large-latest")

        client.chat.complete_async.assert_awaited_once_with(
            model="mistral-large-latest",
            messages=[
                {"role": "system", "content": FEEDBACK_PROMPT},
                {"role": "user", "content": build_transcript(HISTORY)},
            ],
            response_format={"type": "json_object"},
        )
        assert result.text == VALID_FEEDBACK_JSON

    @pytest.mark.asyncio
    async def test_usage_normalises_cached_tokens_from_dict(self):
        client = make_mistral_client(
            make_mistral_response("Bonjour", prompt_tokens=1200, completion_tokens=150, cached_tokens=200)
        )
        provider = MistralProvider(api_key="test", client=client)

        result = await provider.chat([{"role": "user", "content": "Salut"}], "SYS", "m")

        assert (result.input_tokens, result.output_tokens, result.cache_read_tokens) == (1000, 150, 200)

    @pytest.mark.asyncio
    async def test_usage_normalises_cached_tokens_from_object(self):
        client = make_mistral_client(
            make_mistral_response(
                "ok", prompt_tokens=500, completion_tokens=20, cached_tokens=100, details_as_dict=False
            )
        )
        result = await MistralProvider(api_key="t", client=client).chat([], "SYS", "m")
        assert (result.input_tokens, result.cache_read_tokens) == (400, 100)

    @pytest.mark.asyncio
    async def test_usage_without_cache_details(self):
        client = make_mistral_client(make_mistral_response("ok", prompt_tokens=300, completion_tokens=40))
        result = await MistralProvider(api_key="t", client=client).chat([], "SYS", "m")
        assert (result.input_tokens, result.output_tokens, result.cache_read_tokens) == (300, 40, 0)

    @pytest.mark.asyncio
    async def test_missing_usage_defaults_to_zero(self):
        client = make_mistral_client(make_mistral_response("ok", usage=None))
        result = await MistralProvider(api_key="t", client=client).chat([], "SYS", "m")
        assert (result.input_tokens, result.output_tokens, result.cache_read_tokens) == (0, 0, 0)

    @pytest.mark.asyncio
    async def test_sdk_error_propagates(self):
        client = make_mistral_client(side_effect=RuntimeError("boom"))
        with pytest.raises(RuntimeError, match="boom"):
            await MistralProvider(api_key="t", client=client).chat([], "SYS", "m")

    def test_builds_async_sdk_client_when_not_injected(self):
        with patch("services.llm.mistral_provider.Mistral") as sdk:
            MistralProvider(api_key="secret")
        sdk.assert_called_once_with(api_key="secret")


class TestToClaudeMessages:
    def test_empty_history_gets_conversation_start(self):
        assert to_claude_messages([]) == [{"role": "user", "content": CONVERSATION_START}]

    def test_assistant_first_history_gets_conversation_start(self):
        assert to_claude_messages(HISTORY) == [{"role": "user", "content": CONVERSATION_START}] + HISTORY

    def test_user_first_history_unchanged(self):
        history = [{"role": "user", "content": "Bonjour"}]
        assert to_claude_messages(history) == history

    def test_drops_unsupported_roles_and_extra_keys(self):
        history = [
            {"role": "system", "content": "ignored"},
            {"role": "user", "content": "Bonjour", "timestamp": "x"},
        ]
        assert to_claude_messages(history) == [{"role": "user", "content": "Bonjour"}]


class TestAnthropicProvider:
    @pytest.mark.asyncio
    async def test_chat_request_shape_with_default_effort(self):
        # Given
        client = make_claude_client(make_claude_response("Voilà votre café.", 120, 30))
        provider = AnthropicProvider(api_key="test", client=client)

        # When
        result = await provider.chat(HISTORY, "SYS", "claude-haiku-5-5")

        # Then
        client.messages.create.assert_awaited_once_with(
            model="claude-haiku-5-5",
            max_tokens=MAX_TOKENS,
            system="SYS",
            messages=[{"role": "user", "content": CONVERSATION_START}] + HISTORY,
            output_config={"effort": "low"},
        )
        assert result.text == "Voilà votre café."
        assert (result.input_tokens, result.output_tokens, result.cache_read_tokens) == (120, 30, 0)
        assert result.stop_reason == "end_turn"

    @pytest.mark.asyncio
    async def test_chat_effort_override(self):
        client = make_claude_client(make_claude_response("ok"))
        provider = AnthropicProvider(api_key="t", chat_effort="high", client=client)

        await provider.chat([], "SYS", "claude-sonnet-5-5")

        assert client.messages.create.await_args.kwargs["output_config"] == {"effort": "high"}

    @pytest.mark.asyncio
    async def test_feedback_request_uses_structured_output(self):
        client = make_claude_client(make_claude_response(VALID_FEEDBACK_JSON, 2000, 400))
        provider = AnthropicProvider(api_key="t", client=client)

        result = await provider.feedback(HISTORY, "claude-sonnet-5-5")

        client.messages.create.assert_awaited_once_with(
            model="claude-sonnet-5-5",
            max_tokens=MAX_TOKENS,
            system=FEEDBACK_PROMPT,
            messages=[{"role": "user", "content": build_transcript(HISTORY)}],
            output_config={
                "effort": "medium",
                "format": {"type": "json_schema", "schema": FEEDBACK_JSON_SCHEMA},
            },
        )
        assert result.text == VALID_FEEDBACK_JSON

    @pytest.mark.asyncio
    async def test_feedback_effort_override(self):
        client = make_claude_client(make_claude_response(VALID_FEEDBACK_JSON))
        provider = AnthropicProvider(api_key="t", feedback_effort="xhigh", client=client)

        await provider.feedback(HISTORY, "claude-opus-5-5")

        assert client.messages.create.await_args.kwargs["output_config"]["effort"] == "xhigh"

    @pytest.mark.asyncio
    async def test_no_fallbacks_thinking_or_caching_sent(self):
        client = make_claude_client(make_claude_response("ok"))
        await AnthropicProvider(api_key="t", client=client).chat([], "SYS", "claude-sonnet-5-5")
        kwargs = client.messages.create.await_args.kwargs
        for forbidden in ("fallbacks", "betas", "thinking", "cache_control", "temperature"):
            assert forbidden not in kwargs

    @pytest.mark.asyncio
    async def test_only_text_blocks_form_reply(self):
        response = make_claude_response("Bonjour", include_thinking=True)
        response.content.append(SimpleNamespace(type="text", text=" !"))
        client = make_claude_client(response)

        result = await AnthropicProvider(api_key="t", client=client).chat([], "SYS", "m")

        assert result.text == "Bonjour !"

    @pytest.mark.asyncio
    async def test_cache_read_tokens_reported(self):
        client = make_claude_client(make_claude_response("ok", 10, 5, cache_read_input_tokens=300))
        result = await AnthropicProvider(api_key="t", client=client).chat([], "SYS", "m")
        assert result.cache_read_tokens == 300

    @pytest.mark.asyncio
    async def test_refusal_raises_with_category_and_usage(self):
        response = make_claude_response(
            "", 50, 0, stop_reason="refusal", stop_details=SimpleNamespace(category="cyber")
        )
        client = make_claude_client(response)

        with pytest.raises(LLMProviderError, match="refusal: cyber") as excinfo:
            await AnthropicProvider(api_key="t", client=client).feedback(HISTORY, "m")

        assert excinfo.value.result.input_tokens == 50

    @pytest.mark.asyncio
    async def test_refusal_without_details_is_unspecified(self):
        client = make_claude_client(make_claude_response("", stop_reason="refusal"))
        with pytest.raises(LLMProviderError, match="refusal: unspecified"):
            await AnthropicProvider(api_key="t", client=client).chat([], "SYS", "m")

    def test_builds_async_sdk_client_with_explicit_key(self):
        with patch("services.llm.anthropic_provider.anthropic.AsyncAnthropic") as sdk:
            provider = AnthropicProvider(api_key="secret")
        sdk.assert_called_once_with(api_key="secret")
        assert (provider.chat_effort, provider.feedback_effort) == ("low", "medium")
