"""Tests for issue #228: LLM service routing, call recording and feedback parsing."""

from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from config import Settings
from models.llm_call import LLMCall
from services import mistral as mistral_compat
from services.llm import llm_service
from services.llm.anthropic_provider import AnthropicProvider
from services.llm.base import FEEDBACK_FALLBACK, LLMProviderError, LLMResult
from services.llm.mistral_provider import MistralProvider
from services.llm.recorder import record_call
from services.llm.service import LLMService, build_provider
from tests.llm_fakes import (
    VALID_FEEDBACK_JSON,
    make_claude_client,
    make_claude_response,
    make_mistral_client,
    make_mistral_response,
)

HISTORY = [{"role": "user", "content": "Bonjour"}, {"role": "assistant", "content": "Salut !"}]


def make_settings(**overrides) -> Settings:
    values = {"MISTRAL_API_KEY": "m", "ANTHROPIC_API_KEY": "a"}
    values.update(overrides)
    return Settings(_env_file=None, **values)


async def all_calls(db) -> list[LLMCall]:
    return list((await db.execute(select(LLMCall))).scalars().all())


class TestCompatibilityAlias:
    def test_services_mistral_alias_is_the_llm_service(self):
        # The existing tests patch services.mistral.mistral_client; it must be the same object
        assert mistral_compat.mistral_client is llm_service


class TestRoutingAndProviders:
    def test_route_uses_per_feature_config(self):
        service = LLMService(
            settings=make_settings(FEEDBACK_PROVIDER="anthropic", FEEDBACK_MODEL="claude-sonnet-5-5")
        )
        assert service.route("chat") == ("mistral", "mistral-large-latest")
        assert service.route("feedback") == ("anthropic", "claude-sonnet-5-5")

    def test_route_unknown_feature(self):
        with pytest.raises(ValueError, match="Unknown LLM feature"):
            LLMService(settings=make_settings()).route("translate")

    def test_build_provider_mistral(self):
        with patch("services.llm.mistral_provider.Mistral"):
            assert isinstance(build_provider("mistral", make_settings()), MistralProvider)

    def test_build_provider_anthropic_passes_effort_overrides(self):
        settings = make_settings(CLAUDE_CHAT_EFFORT="medium", CLAUDE_FEEDBACK_EFFORT="high")
        with patch("services.llm.anthropic_provider.anthropic.AsyncAnthropic") as sdk:
            provider = build_provider("anthropic", settings)
        sdk.assert_called_once_with(api_key="a")
        assert isinstance(provider, AnthropicProvider)
        assert (provider.chat_effort, provider.feedback_effort) == ("medium", "high")

    def test_build_provider_unknown(self):
        with pytest.raises(ValueError, match="Unknown LLM provider"):
            build_provider("openai", make_settings())

    def test_providers_are_built_lazily_and_cached(self):
        service = LLMService(settings=make_settings())
        with patch("services.llm.service.build_provider") as builder:
            first = service.get_provider("mistral")
            second = service.get_provider("mistral")
        builder.assert_called_once()
        assert first is second


class TestChat:
    @pytest.mark.asyncio
    async def test_default_chat_records_success_row(self, test_db):
        # Given the default config with a mocked Mistral client
        client = make_mistral_client(
            make_mistral_response("Bonjour !", prompt_tokens=1200, completion_tokens=150, cached_tokens=200)
        )
        service = LLMService(
            settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)}
        )

        # When
        reply = await service.get_chat_response(HISTORY, "SYS", db=test_db, session_id=7)

        # Then
        assert reply == "Bonjour !"
        [row] = await all_calls(test_db)
        assert (row.feature, row.provider, row.model) == ("chat", "mistral", "mistral-large-latest")
        assert (row.input_tokens, row.output_tokens, row.cache_read_tokens) == (1000, 150, 200)
        assert row.estimated_cost_usd == pytest.approx(0.000735)
        assert row.status == "success"
        assert row.error_message is None
        assert row.session_id == 7
        assert row.latency_ms >= 0

    @pytest.mark.asyncio
    async def test_chat_routed_to_claude(self, test_db):
        client = make_claude_client(make_claude_response("Salut", 100, 20))
        service = LLMService(
            settings=make_settings(CHAT_PROVIDER="anthropic", CHAT_MODEL="claude-haiku-5-5"),
            providers={"anthropic": AnthropicProvider("a", client=client)},
        )

        reply = await service.get_chat_response([], "SYS", db=test_db)

        assert reply == "Salut"
        [row] = await all_calls(test_db)
        assert (row.provider, row.model) == ("anthropic", "claude-haiku-5-5")
        assert row.estimated_cost_usd == pytest.approx((100 * 0.10 + 20 * 0.50) / 1e6)

    @pytest.mark.asyncio
    async def test_provider_error_recorded_and_reraised(self, test_db):
        client = make_mistral_client(side_effect=RuntimeError("boom"))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

        with pytest.raises(RuntimeError, match="boom"):
            await service.get_chat_response(HISTORY, "SYS", db=test_db, session_id=3)

        [row] = await all_calls(test_db)
        assert row.status == "error"
        assert row.error_message == "boom"
        assert (row.input_tokens, row.output_tokens, row.cache_read_tokens) == (0, 0, 0)
        assert row.estimated_cost_usd == 0.0

    @pytest.mark.asyncio
    async def test_exception_without_message_uses_type_name(self, test_db):
        client = make_mistral_client(side_effect=TimeoutError())
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

        with pytest.raises(TimeoutError):
            await service.get_chat_response(HISTORY, "SYS", db=test_db)

        [row] = await all_calls(test_db)
        assert row.error_message == "TimeoutError"

    @pytest.mark.asyncio
    async def test_refusal_records_usage_and_cost(self, test_db):
        provider = AsyncMock()
        provider.chat.side_effect = LLMProviderError(
            "refusal: cyber", LLMResult(text="", input_tokens=2000, output_tokens=0)
        )
        service = LLMService(
            settings=make_settings(CHAT_PROVIDER="anthropic", CHAT_MODEL="claude-sonnet-5-5"),
            providers={"anthropic": provider},
        )

        with pytest.raises(LLMProviderError):
            await service.get_chat_response(HISTORY, "SYS", db=test_db)

        [row] = await all_calls(test_db)
        assert row.status == "error"
        assert row.error_message == "refusal: cyber"
        assert row.input_tokens == 2000
        assert row.estimated_cost_usd == pytest.approx(0.004)

    @pytest.mark.asyncio
    async def test_no_db_means_no_row(self, test_db):
        client = make_mistral_client(make_mistral_response("ok"))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

        assert await service.get_chat_response(HISTORY, "SYS") == "ok"
        assert await all_calls(test_db) == []

    @pytest.mark.asyncio
    async def test_error_without_db_still_raises(self):
        client = make_mistral_client(side_effect=RuntimeError("boom"))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})
        with pytest.raises(RuntimeError):
            await service.get_chat_response(HISTORY, "SYS")

    @pytest.mark.asyncio
    async def test_unpriced_model_records_null_cost(self, test_db):
        client = make_claude_client(make_claude_response("ok", 10, 10))
        service = LLMService(
            settings=make_settings(CHAT_PROVIDER="anthropic", CHAT_MODEL="claude-future-9"),
            providers={"anthropic": AnthropicProvider("a", client=client)},
        )

        await service.get_chat_response([], "SYS", db=test_db)

        [row] = await all_calls(test_db)
        assert row.estimated_cost_usd is None
        assert row.status == "success"


class TestFeedback:
    @pytest.mark.asyncio
    async def test_claude_feedback_parsed_and_recorded(self, test_db):
        # Given feedback routed to Claude Haiku 5.5
        client = make_claude_client(make_claude_response(VALID_FEEDBACK_JSON, 2000, 400))
        service = LLMService(
            settings=make_settings(FEEDBACK_PROVIDER="anthropic", FEEDBACK_MODEL="claude-haiku-5-5"),
            providers={"anthropic": AnthropicProvider("a", client=client)},
        )

        # When
        feedback = await service.get_feedback(HISTORY, db=test_db, session_id=11)

        # Then
        assert feedback["overall_score"] == 69
        [row] = await all_calls(test_db)
        assert (row.feature, row.provider, row.model) == ("feedback", "anthropic", "claude-haiku-5-5")
        assert row.estimated_cost_usd == pytest.approx(0.0004)
        assert row.status == "success"

    @pytest.mark.asyncio
    async def test_invalid_json_falls_back_and_records_error(self, test_db):
        client = make_mistral_client(make_mistral_response("pas du JSON", prompt_tokens=50, completion_tokens=5))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

        feedback = await service.get_feedback(HISTORY, db=test_db)

        assert feedback == FEEDBACK_FALLBACK
        assert feedback is not FEEDBACK_FALLBACK
        [row] = await all_calls(test_db)
        assert row.status == "error"
        assert row.error_message.startswith("invalid_json")
        assert row.input_tokens == 50

    @pytest.mark.asyncio
    async def test_non_object_json_falls_back(self, test_db):
        client = make_mistral_client(make_mistral_response("[1, 2, 3]"))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

        feedback = await service.get_feedback(HISTORY, db=test_db)

        assert feedback == FEEDBACK_FALLBACK
        [row] = await all_calls(test_db)
        assert "expected a JSON object" in row.error_message

    @pytest.mark.asyncio
    async def test_no_text_content_raises_and_records_error(self, test_db):
        # Issue #243: a response with no text is a failed call, not fallback feedback
        client = make_mistral_client(make_mistral_response(None, prompt_tokens=80, completion_tokens=10))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

        with pytest.raises(LLMProviderError, match="^empty_response"):
            await service.get_feedback(HISTORY, db=test_db, session_id=5)

        [row] = await all_calls(test_db)
        assert (row.feature, row.status, row.session_id) == ("feedback", "error", 5)
        assert row.error_message == "empty_response: Mistral returned no text content"
        assert (row.input_tokens, row.output_tokens) == (80, 10)

    @pytest.mark.asyncio
    async def test_fallback_copy_is_independent(self):
        client = make_mistral_client(make_mistral_response("bad"))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

        feedback = await service.get_feedback(HISTORY)
        feedback["strengths"].append("modifié")

        assert FEEDBACK_FALLBACK["strengths"] == ["Bonne tentative"]

    @pytest.mark.asyncio
    async def test_feedback_provider_error_recorded_and_reraised(self, test_db):
        client = make_claude_client(side_effect=RuntimeError("overloaded"))
        service = LLMService(
            settings=make_settings(FEEDBACK_PROVIDER="anthropic", FEEDBACK_MODEL="claude-sonnet-5-5"),
            providers={"anthropic": AnthropicProvider("a", client=client)},
        )

        with pytest.raises(RuntimeError):
            await service.get_feedback(HISTORY, db=test_db)

        [row] = await all_calls(test_db)
        assert (row.feature, row.status, row.error_message) == ("feedback", "error", "overloaded")


class TestRecorder:
    @pytest.mark.asyncio
    async def test_truncates_long_error_message(self, test_db):
        row = await record_call(
            test_db,
            feature="chat",
            provider="mistral",
            model="mistral-large-latest",
            latency_ms=5,
            status="error",
            error_message="x" * 5000,
        )
        assert len(row.error_message) == 1000

    @pytest.mark.asyncio
    async def test_write_failure_is_swallowed_and_rolled_back(self):
        db = AsyncMock()
        db.add = lambda row: None
        db.commit.side_effect = RuntimeError("disk full")

        row = await record_call(
            db, feature="chat", provider="mistral", model="m", latency_ms=1, status="success"
        )

        assert row is None
        db.rollback.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_rollback_failure_is_also_swallowed(self):
        db = AsyncMock()
        db.add = lambda row: None
        db.commit.side_effect = RuntimeError("disk full")
        db.rollback.side_effect = RuntimeError("connection lost")

        row = await record_call(
            db, feature="chat", provider="mistral", model="m", latency_ms=1, status="success"
        )

        assert row is None

    @pytest.mark.asyncio
    async def test_service_returns_reply_when_recording_fails(self):
        db = AsyncMock()
        db.add = lambda row: None
        db.commit.side_effect = RuntimeError("disk full")
        client = make_mistral_client(make_mistral_response("Bonjour"))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=client)})

        assert await service.get_chat_response(HISTORY, "SYS", db=db) == "Bonjour"
