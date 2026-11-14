"""API-level tests for issue #228: routers use the provider layer and log each call.

Both SDKs are mocked; no network calls.
"""

from unittest.mock import patch

import pytest
from sqlalchemy import select

from config import Settings
from models.llm_call import LLMCall
from models.session import Session as SessionModel
from schemas.session import FeedbackResponse
from services.llm.anthropic_provider import AnthropicProvider
from services.llm.mistral_provider import MistralProvider
from services.llm.service import LLMService
from tests.llm_fakes import (
    VALID_FEEDBACK_JSON,
    make_claude_client,
    make_claude_response,
    make_mistral_client,
    make_mistral_response,
)


def make_settings(**overrides) -> Settings:
    values = {"MISTRAL_API_KEY": "m", "ANTHROPIC_API_KEY": "a"}
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
