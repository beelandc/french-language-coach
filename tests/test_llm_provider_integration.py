"""API-level tests for issue #228: routers use the provider layer and log each call.

Both SDKs are mocked; no network calls.
"""

from unittest.mock import patch

import anthropic
import httpx2
import pytest
from mistralai.client.models import TextChunk, ThinkChunk
from sqlalchemy import select

from config import Settings
from models.llm_call import LLMCall
from models.session import Session as SessionModel
from schemas.session import FeedbackResponse
from services.llm.anthropic_provider import AnthropicProvider
from services.llm.mistral_provider import EMPTY_RESPONSE_ERROR, MistralProvider
from routers.feedback import (
    FEEDBACK_INVALID_DETAIL,
    FEEDBACK_TIMEOUT_DETAIL,
    FEEDBACK_UNUSABLE_DETAIL,
)
from routers.messages import CHAT_TIMEOUT_DETAIL
from services.llm.service import LLMService
from tests.llm_fakes import (
    VALID_FEEDBACK_JSON,
    make_claude_client,
    make_claude_response,
    make_mistral_client,
    make_mistral_response,
)


def make_settings(**overrides) -> Settings:
    """Settings that route both features to Mistral Large unless overridden.

    The app defaults to Claude Sonnet 5.5 (issue #232); these tests are about Mistral
    behaviour by default, so the routing is pinned explicitly.
    """
    values = {
        "MISTRAL_API_KEY": "m",
        "ANTHROPIC_API_KEY": "a",
        "CHAT_PROVIDER": "mistral",
        "CHAT_MODEL": "mistral-large-latest",
        "FEEDBACK_PROVIDER": "mistral",
        "FEEDBACK_MODEL": "mistral-large-latest",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


async def create_session(db, messages: str) -> int:
    session = SessionModel(scenario_id="cafe_order", difficulty="intermediate", messages=messages)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session.id


class TestDefaultMistralPath:
    @pytest.mark.asyncio
    async def test_chat_turn_uses_mistral_large_and_logs_call(self, client, test_db):
        # Given a session and the default config with a mocked Mistral client
        session_id = await create_session(test_db, '[{"role": "assistant", "content": "Bonjour !"}]')
        mistral = make_mistral_client(
            make_mistral_response("Qu'est-ce que vous voulez ?", prompt_tokens=300, completion_tokens=12)
        )
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        # When
        with patch("routers.messages.llm_service", service):
            response = client.post(f"/sessions/{session_id}/messages/", json={"content": "Bonjour"})

        # Then: same response as before, same Mistral payload, one llm_calls row
        assert response.status_code == 200
        assert response.json()["content"] == "Qu'est-ce que vous voulez ?"
        kwargs = mistral.chat.complete_async.await_args.kwargs
        assert kwargs["model"] == "mistral-large-latest"
        assert kwargs["messages"][0]["role"] == "system"
        assert kwargs["messages"][1:] == [
            {"role": "assistant", "content": "Bonjour !"},
            {"role": "user", "content": "Bonjour"},
        ]

        metrics = client.get("/metrics/llm").json()
        [group] = metrics["groups"]
        assert (group["feature"], group["provider"], group["model"]) == ("chat", "mistral", "mistral-large-latest")
        assert group["calls"] == 1
        assert group["input_tokens"] == 300

    @pytest.mark.asyncio
    async def test_greeting_logged_with_session_id(self, client, test_db):
        mistral = make_mistral_client(make_mistral_response("Bienvenue !", prompt_tokens=200, completion_tokens=8))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        with patch("routers.sessions.llm_service", service):
            response = client.post("/sessions/", json={"scenario_id": "cafe_order"})

        assert response.status_code == 200
        session_id = response.json()["id"]
        assert response.json()["messages"][0]["content"] == "Bienvenue !"
        rows = (await test_db.execute(select(LLMCall))).scalars().all()
        assert [(r.feature, r.session_id, r.status) for r in rows] == [("chat", session_id, "success")]

    @pytest.mark.asyncio
    async def test_failed_chat_turn_logged_as_error(self, client, test_db):
        session_id = await create_session(test_db, '[{"role": "assistant", "content": "Bonjour !"}]')
        mistral = make_mistral_client(side_effect=RuntimeError("Mistral unavailable"))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        with patch("routers.messages.llm_service", service):
            with pytest.raises(RuntimeError):
                client.post(f"/sessions/{session_id}/messages/", json={"content": "Bonjour"})

        metrics = client.get("/metrics/llm").json()
        assert metrics["totals"]["errors"] == 1


class TestClaudeFeedbackPath:
    @pytest.mark.asyncio
    async def test_feedback_with_claude_returns_feedback_response(self, client, test_db):
        # Given FEEDBACK_PROVIDER=anthropic and a mocked Claude client
        session_id = await create_session(
            test_db,
            '[{"role": "assistant", "content": "Bonjour !"}, {"role": "user", "content": "Un café"}]',
        )
        claude = make_claude_client(make_claude_response(VALID_FEEDBACK_JSON, 2000, 400))
        service = LLMService(
            settings=make_settings(FEEDBACK_PROVIDER="anthropic", FEEDBACK_MODEL="claude-sonnet-5-5"),
            providers={"anthropic": AnthropicProvider("a", client=claude)},
        )

        # When
        with patch("routers.feedback.llm_service", service):
            response = client.post(f"/sessions/{session_id}/feedback/")

        # Then: valid FeedbackResponse, stored on the session, logged with cost
        assert response.status_code == 200
        feedback = FeedbackResponse(**response.json())
        assert feedback.focus_area == "Accord du participe passé"
        assert claude.messages.create.await_args.kwargs["model"] == "claude-sonnet-5-5"

        session = client.get(f"/sessions/{session_id}").json()
        assert session["feedback"]["overall_score"] == 69

        [group] = client.get("/metrics/llm").json()["groups"]
        assert (group["feature"], group["provider"], group["model"]) == ("feedback", "anthropic", "claude-sonnet-5-5")
        assert group["estimated_cost_usd"] == pytest.approx(0.008)


THINKING = "Je réfléchis à la réponse…"


def reasoning_content(text: str) -> list:
    """Chunked ``message.content`` as a reasoning model returns it: thinking, then text."""
    return [ThinkChunk(thinking=[TextChunk(text=THINKING)]), TextChunk(text=text)]


class TestMistralContentChunks:
    """Issue #243: chunked Mistral responses (ThinkChunk + TextChunk) work end to end."""

    @pytest.mark.asyncio
    async def test_session_creation_with_chunked_greeting(self, client, test_db):
        # Given the default Mistral chat provider returning reasoning + text chunks
        mistral = make_mistral_client(
            make_mistral_response(reasoning_content("Bienvenue !"), prompt_tokens=200, completion_tokens=40)
        )
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        # When a session is started
        with patch("routers.sessions.llm_service", service):
            response = client.post("/sessions/", json={"scenario_id": "cafe_order"})

        # Then it succeeds with a plain-string greeting and no reasoning anywhere
        assert response.status_code == 200
        session_id = response.json()["id"]
        assert response.json()["messages"] == [{"role": "assistant", "content": "Bienvenue !"}]
        stored = client.get(f"/sessions/{session_id}").json()
        assert stored["messages"] == [{"role": "assistant", "content": "Bienvenue !"}]
        assert THINKING not in response.text + str(stored)
        rows = (await test_db.execute(select(LLMCall))).scalars().all()
        assert [(r.feature, r.session_id, r.status) for r in rows] == [("chat", session_id, "success")]

    @pytest.mark.asyncio
    async def test_chat_message_with_chunked_reply(self, client, test_db):
        session_id = await create_session(test_db, '[{"role": "assistant", "content": "Bonjour !"}]')
        mistral = make_mistral_client(make_mistral_response(reasoning_content("Un café, très bien.")))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        with patch("routers.messages.llm_service", service):
            response = client.post(f"/sessions/{session_id}/messages/", json={"content": "Un café"})

        assert response.status_code == 200
        assert response.json()["content"] == "Un café, très bien."
        stored = client.get(f"/sessions/{session_id}").json()
        assert stored["messages"][-1] == {"role": "assistant", "content": "Un café, très bien."}
        assert THINKING not in response.text + str(stored)

    @pytest.mark.asyncio
    async def test_feedback_with_chunked_json(self, client, test_db):
        # Given the default Mistral feedback provider returning JSON in text chunks after reasoning
        session_id = await create_session(
            test_db,
            '[{"role": "assistant", "content": "Bonjour !"}, {"role": "user", "content": "Un café"}]',
        )
        mistral = make_mistral_client(make_mistral_response(reasoning_content(VALID_FEEDBACK_JSON)))
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        # When
        with patch("routers.feedback.llm_service", service):
            response = client.post(f"/sessions/{session_id}/feedback/")

        # Then the real feedback is validated and the call is a success
        assert response.status_code == 200
        feedback = FeedbackResponse(**response.json())
        assert feedback.overall_score == 69
        assert feedback.focus_area == "Accord du participe passé"
        assert THINKING not in response.text
        [row] = (await test_db.execute(select(LLMCall))).scalars().all()
        assert (row.feature, row.status, row.error_message) == ("feedback", "success", None)

    @pytest.mark.asyncio
    async def test_thinking_only_greeting_logged_as_error(self, client, test_db):
        # Given a greeting response with reasoning but no text
        mistral = make_mistral_client(
            make_mistral_response(
                [ThinkChunk(thinking=[TextChunk(text=THINKING)])], prompt_tokens=200, completion_tokens=40
            )
        )
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        # When a session is started
        with patch("routers.sessions.llm_service", service):
            response = client.post("/sessions/", json={"scenario_id": "cafe_order"})

        # Then the session is created without a greeting (existing behaviour on greeting failure)
        assert response.status_code == 200
        assert response.json()["messages"] == []
        # and the call is recorded as an error with its usage, never as a success
        [row] = (await test_db.execute(select(LLMCall))).scalars().all()
        assert (row.feature, row.status, row.error_message) == ("chat", "error", EMPTY_RESPONSE_ERROR)
        assert (row.input_tokens, row.output_tokens) == (200, 40)


TWO_MESSAGES = '[{"role": "assistant", "content": "Bonjour !"}, {"role": "user", "content": "Un café"}]'


def timeout_provider(provider_id):
    if provider_id == "mistral":
        request = httpx2.Request("POST", "https://api.mistral.ai/v1/chat/completions")
        timeout = httpx2.ReadTimeout("", request=request)
        client = make_mistral_client(side_effect=timeout)
        return MistralProvider("m", client=client), client, "mistral-large-latest"

    request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
    timeout = anthropic.APITimeoutError(request)
    client = make_claude_client(side_effect=timeout)
    return AnthropicProvider("a", client=client), client, "claude-sonnet-5-5"


class TestFeedbackFailures:
    """Issue #229: 502 instead of fabricated feedback; the session stays open."""

    @pytest.mark.asyncio
    async def test_failed_retry_returns_502_and_session_stays_open(self, client, test_db):
        # Given Mistral returns invalid output twice, then valid feedback
        session_id = await create_session(test_db, TWO_MESSAGES)
        mistral = make_mistral_client(side_effect=[
            make_mistral_response("pas du JSON"),
            make_mistral_response('{"grammar_score": "bien"}'),
            make_mistral_response(VALID_FEEDBACK_JSON),
        ])
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        with patch("routers.feedback.llm_service", service):
            # When the first request fails validation twice
            failed = client.post(f"/sessions/{session_id}/feedback/")

            # Then 502 with a clear message, and the session is untouched
            assert failed.status_code == 502
            assert failed.json() == {"detail": FEEDBACK_INVALID_DETAIL}
            session = client.get(f"/sessions/{session_id}").json()
            assert session["ended_at"] is None
            assert session["feedback"] is None

            # And a second attempt is accepted and succeeds
            retried = client.post(f"/sessions/{session_id}/feedback/")

        assert retried.status_code == 200
        assert retried.json()["overall_score"] == 69
        assert client.get(f"/sessions/{session_id}").json()["ended_at"] is not None

        # Each attempt is its own llm_calls row
        calls = client.get("/metrics/llm/calls").json()["calls"]
        assert sorted((c["status"], (c["error_message"] or "").split(":")[0]) for c in calls) == [
            ("error", "invalid_json"), ("error", "schema_mismatch"), ("success", ""),
        ]
        assert {c["session_id"] for c in calls} == {session_id}

    @pytest.mark.asyncio
    @pytest.mark.parametrize("provider_id", ["mistral", "anthropic"])
    async def test_timeout_returns_clear_502_and_keeps_session_open(
        self, provider_id, client, test_db
    ):
        session_id = await create_session(test_db, TWO_MESSAGES)
        provider, sdk_client, model = timeout_provider(provider_id)
        service = LLMService(
            settings=make_settings(
                FEEDBACK_PROVIDER=provider_id,
                FEEDBACK_MODEL=model,
            ),
            providers={provider_id: provider},
        )

        with patch("routers.feedback.llm_service", service):
            response = client.post(f"/sessions/{session_id}/feedback/")

        assert response.status_code == 502
        assert response.json() == {"detail": FEEDBACK_TIMEOUT_DETAIL}
        session = await test_db.get(SessionModel, session_id)
        assert session.ended_at is None
        assert session.feedback_dict is None
        [call] = (await test_db.execute(select(LLMCall))).scalars().all()
        assert call.status == "error"
        assert call.error_message == (
            f"timeout: {provider_id} request exceeded configured 120s limit "
            f"({'ReadTimeout' if provider_id == 'mistral' else 'APITimeoutError'})"
        )
        if provider_id == "anthropic":
            sdk_client.messages.create.assert_awaited_once()
        else:
            sdk_client.chat.complete_async.assert_awaited_once()


class TestChatTimeouts:
    @pytest.mark.parametrize("provider_id", ["mistral", "anthropic"])
    @pytest.mark.asyncio
    async def test_timeout_returns_clear_502_and_does_not_commit_partial_exchange(
        self, provider_id, client, test_db
    ):
        initial_messages = '[{"role": "assistant", "content": "Bonjour !"}]'
        session_id = await create_session(test_db, initial_messages)
        provider, sdk_client, model = timeout_provider(provider_id)
        service = LLMService(
            settings=make_settings(CHAT_PROVIDER=provider_id, CHAT_MODEL=model),
            providers={provider_id: provider},
        )

        with patch("routers.messages.llm_service", service):
            response = client.post(
                f"/sessions/{session_id}/messages/",
                json={"content": "Un café"},
            )

        assert response.status_code == 502
        assert response.json() == {"detail": CHAT_TIMEOUT_DETAIL}
        session = await test_db.get(SessionModel, session_id)
        assert session.messages_list == [{"role": "assistant", "content": "Bonjour !"}]
        [call] = (await test_db.execute(select(LLMCall))).scalars().all()
        assert call.status == "error"
        assert call.error_message.startswith(f"timeout: {provider_id} request exceeded configured 120s")
        if provider_id == "anthropic":
            sdk_client.messages.create.assert_awaited_once()
        else:
            sdk_client.chat.complete_async.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_claude_refusal_returns_502_without_retry(self, client, test_db):
        session_id = await create_session(test_db, TWO_MESSAGES)
        claude = make_claude_client(make_claude_response("", stop_reason="refusal"))
        service = LLMService(
            settings=make_settings(FEEDBACK_PROVIDER="anthropic", FEEDBACK_MODEL="claude-sonnet-5-5"),
            providers={"anthropic": AnthropicProvider("a", client=claude)},
        )

        with patch("routers.feedback.llm_service", service):
            response = client.post(f"/sessions/{session_id}/feedback/")

        assert response.status_code == 502
        assert response.json() == {"detail": FEEDBACK_UNUSABLE_DETAIL}
        assert claude.messages.create.await_count == 1
        assert client.get(f"/sessions/{session_id}").json()["ended_at"] is None

    @pytest.mark.asyncio
    async def test_rescued_feedback_is_stored_once(self, client, test_db):
        session_id = await create_session(test_db, TWO_MESSAGES)
        mistral = make_mistral_client(side_effect=[
            make_mistral_response('{"grammar_score": 72'),
            make_mistral_response(VALID_FEEDBACK_JSON[:-1] + ', "note": "x"}'),
        ])
        service = LLMService(settings=make_settings(), providers={"mistral": MistralProvider("m", client=mistral)})

        with patch("routers.feedback.llm_service", service):
            response = client.post(f"/sessions/{session_id}/feedback/")

        assert response.status_code == 200
        stored = client.get(f"/sessions/{session_id}").json()["feedback"]
        assert stored == FeedbackResponse.model_validate_json(VALID_FEEDBACK_JSON).model_dump()
        assert "note" not in stored
