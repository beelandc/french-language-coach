"""Tests for the study-plan endpoints (issue #270).

The endpoint runs the real study-coach loop: the router's ``llm_service`` is replaced
by one whose Anthropic provider talks to a ``ScriptedClaude`` transport, and the MCP
server is bound to the test database. Card counts prove that nothing is written to
``cards`` without Accept (AC3).
"""

import json
from datetime import timedelta

import pytest
from sqlalchemy import func, select

import routers.study_plan as study_plan_router
import services.llm.study_coach as study_coach
from config import Settings
from mcp_server import create_server
from models.card import Card
from models.deck import Deck
from models.llm_call import LLMCall
from models.session import Session as SessionModel
from models.study_plan import STUDY_DECK_NAME, CardProposal, StudyPlan
from routers.vocabulary import get_today
from services.llm.anthropic_provider import AnthropicProvider
from services.llm.service import LLMService
from tests.conftest import AsyncTestingSession
from tests.llm_fakes import (
    STUDY_FEEDBACK,
    STUDY_MESSAGES,
    ScriptedClaude,
    refusal_turn,
    study_plan_input,
    text_turn,
    tool_use_turn,
)


def plan_url(session_id: int) -> str:
    return f"/sessions/{session_id}/study-plan/"


def card_url(session_id: int, proposal_id: int, action: str) -> str:
    return f"/sessions/{session_id}/study-plan/cards/{proposal_id}/{action}"


async def count(model) -> int:
    async with AsyncTestingSession() as db:
        return (await db.execute(select(func.count(model.id)))).scalar_one()


async def add_session(feedback=STUDY_FEEDBACK, difficulty="intermediate") -> int:
    async with AsyncTestingSession() as db:
        session = SessionModel(scenario_id="cafe_order", difficulty=difficulty)
        session.messages_list = STUDY_MESSAGES
        if feedback is not None:
            session.feedback_dict = feedback
        db.add(session)
        await db.commit()
        return session.id


async def add_card(front: str) -> None:
    async with AsyncTestingSession() as db:
        deck = Deck(name="Existing deck")
        db.add(deck)
        await db.flush()
        db.add(Card(deck_id=deck.id, card_id="c1", front=front, back="x", next_review_date=get_today()))
        await db.commit()


def happy_turns(**plan_overrides) -> list[dict]:
    return [
        tool_use_turn("recommend_lessons_for_focus_area", {"focus_area": "subjonctif"}, usage=(1000, 200)),
        tool_use_turn("submit_study_plan", study_plan_input(**plan_overrides), usage=(1500, 150)),
        text_turn("Plan envoyé.", usage=(1800, 300)),
    ]


@pytest.fixture
def coach(monkeypatch):
    """Install a scripted study coach; returns a function that sets its turns."""
    monkeypatch.setattr(
        study_coach, "create_server", lambda: create_server(session_factory=AsyncTestingSession)
    )

    def install(turns, **settings_overrides) -> ScriptedClaude:
        script = ScriptedClaude(turns)
        values = {"ANTHROPIC_API_KEY": "a", "MISTRAL_API_KEY": "m", **settings_overrides}
        service = LLMService(
            settings=Settings(_env_file=None, **values),
            providers={"anthropic": AnthropicProvider("a", client=script.client())},
        )
        monkeypatch.setattr(study_plan_router, "llm_service", service)
        return script

    return install


class TestCreatePlan:
    @pytest.mark.asyncio
    async def test_builds_and_stores_plan_without_writing_cards(self, client, coach):
        session_id = await add_session()
        coach(happy_turns())
        cards_before = await count(Card)

        response = client.post(plan_url(session_id))

        assert response.status_code == 200
        body = response.json()
        assert body["session_id"] == session_id
        assert body["model"] == "claude-sonnet-5-5"
        assert body["summary"].startswith("Travaillez")
        [item] = body["items"]
        assert item["lesson_id"] == "subjunctive"
        assert item["lesson_title"]
        assert item["lesson_title"] != "subjunctive"
        assert item["addresses"] == ["il faut que tu viens"]
        assert [p["front"] for p in body["proposals"]] == ["un croissant", "le comptoir"]
        assert {p["status"] for p in body["proposals"]} == {"pending"}
        assert all(p["card_id"] is None and not p["already_known"] for p in body["proposals"])
        # AC3: generating writes no card and no deck
        assert await count(Card) == cards_before
        async with AsyncTestingSession() as db:
            decks = (await db.execute(select(Deck).where(Deck.name == STUDY_DECK_NAME))).all()
        assert decks == []
        # AC2: one llm_calls row for the run
        async with AsyncTestingSession() as db:
            [row] = (await db.execute(select(LLMCall))).scalars().all()
        assert (row.feature, row.session_id, row.input_tokens, row.output_tokens) == (
            "study_coach", session_id, 4300, 650
        )

    @pytest.mark.asyncio
    async def test_existing_plan_is_returned_without_new_run(self, client, coach):
        session_id = await add_session()
        coach(happy_turns())
        first = client.post(plan_url(session_id)).json()
        script = coach([])  # any model call would fail: no turns left

        second = client.post(plan_url(session_id))

        assert second.status_code == 200
        assert second.json() == first
        assert script.requests == []
        assert await count(LLMCall) == 1

    @pytest.mark.asyncio
    async def test_already_known_card_is_flagged(self, client, coach):
        await add_card("  Un   Croissant ")
        session_id = await add_session()
        coach(happy_turns())

        body = client.post(plan_url(session_id)).json()

        assert [p["already_known"] for p in body["proposals"]] == [True, False]

    @pytest.mark.asyncio
    async def test_unknown_session(self, client, coach):
        assert client.post(plan_url(999)).status_code == 404
        assert client.get(plan_url(999)).status_code == 404

    @pytest.mark.asyncio
    async def test_session_without_feedback(self, client, coach):
        session_id = await add_session(feedback=None)
        response = client.post(plan_url(session_id))
        assert response.status_code == 400
        assert response.json()["detail"] == study_plan_router.FEEDBACK_REQUIRED

    @pytest.mark.asyncio
    async def test_disabled_study_coach_is_503(self, client, coach):
        session_id = await add_session()
        coach([], STUDY_COACH_ENABLED=False)

        response = client.post(plan_url(session_id))

        assert response.status_code == 503
        assert "turned off" in response.json()["detail"]
        assert await count(LLMCall) == 0

    @pytest.mark.asyncio
    async def test_iteration_cap_is_502_and_stores_nothing(self, client, coach):
        """AC2: a capped run fails cleanly, is logged, and stores nothing."""
        session_id = await add_session()
        coach([tool_use_turn("list_exercises", {}, usage=(400, 10))] * 3, STUDY_COACH_MAX_ITERATIONS=3)

        response = client.post(plan_url(session_id))

        assert response.status_code == 502
        assert response.json()["detail"] == study_plan_router.PLAN_FAILED_DETAIL
        assert await count(StudyPlan) == 0
        assert await count(CardProposal) == 0
        assert await count(Card) == 0
        async with AsyncTestingSession() as db:
            [row] = (await db.execute(select(LLMCall))).scalars().all()
        assert row.status == "error"
        assert row.error_message.startswith("iteration_cap")
        assert row.input_tokens == 1200

    @pytest.mark.asyncio
    async def test_refusal_is_502(self, client, coach):
        session_id = await add_session()
        coach([refusal_turn("cyber", usage=(300, 0))])

        response = client.post(plan_url(session_id))

        assert response.status_code == 502
        assert await count(StudyPlan) == 0


class TestGetPlan:
    @pytest.mark.asyncio
    async def test_get_returns_stored_plan_or_404(self, client, coach):
        session_id = await add_session()
        missing = client.get(plan_url(session_id))
        assert missing.status_code == 404
        assert missing.json()["detail"] == study_plan_router.PLAN_NOT_FOUND

        coach(happy_turns())
        created = client.post(plan_url(session_id)).json()

        fetched = client.get(plan_url(session_id))
        assert fetched.status_code == 200
        assert fetched.json() == created


class TestAcceptReject:
    async def _plan(self, client, coach) -> tuple[int, list[dict]]:
        session_id = await add_session()
        coach(happy_turns())
        return session_id, client.post(plan_url(session_id)).json()["proposals"]

    @pytest.mark.asyncio
    async def test_accept_creates_exactly_one_card(self, client, coach):
        """AC3: Accept writes one card in the app-managed deck; Accept again adds none."""
        session_id, proposals = await self._plan(client, coach)
        first = proposals[0]

        response = client.post(card_url(session_id, first["id"], "accept"))

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "accepted"
        assert body["card_id"] is not None
        async with AsyncTestingSession() as db:
            [deck] = (await db.execute(select(Deck).where(Deck.name == STUDY_DECK_NAME))).scalars().all()
            [card] = (await db.execute(select(Card))).scalars().all()
        assert body["deck_id"] == deck.id
        assert (card.id, card.deck_id) == (body["card_id"], deck.id)
        assert card.card_id == f"session-{session_id}-{first['id']}"
        assert (card.front, card.back, card.example) == (
            "un croissant", "a croissant", "Je voudrais un croissant."
        )
        assert card.context == "une croissant"
        assert card.tags == f"study-plan,session-{session_id}"
        assert (card.interval, card.ease_factor) == (1, 2.5)
        assert card.next_review_date == get_today() + timedelta(days=1)

        again = client.post(card_url(session_id, first["id"], "accept"))
        assert again.status_code == 200
        assert again.json()["card_id"] == body["card_id"]
        assert await count(Card) == 1

        # The second accepted proposal reuses the deck
        client.post(card_url(session_id, proposals[1]["id"], "accept"))
        assert await count(Card) == 2
        assert await count(Deck) == 1

        plan = client.get(plan_url(session_id)).json()
        assert [p["status"] for p in plan["proposals"]] == ["accepted", "accepted"]

    @pytest.mark.asyncio
    async def test_reject_writes_nothing(self, client, coach):
        session_id, proposals = await self._plan(client, coach)

        response = client.post(card_url(session_id, proposals[1]["id"], "reject"))
        again = client.post(card_url(session_id, proposals[1]["id"], "reject"))

        assert response.status_code == again.status_code == 200
        assert again.json()["status"] == "rejected"
        assert await count(Card) == 0
        accept = client.post(card_url(session_id, proposals[1]["id"], "accept"))
        assert accept.status_code == 409
        assert accept.json()["detail"] == study_plan_router.PROPOSAL_REJECTED
        assert await count(Card) == 0

    @pytest.mark.asyncio
    async def test_reject_after_accept_is_409(self, client, coach):
        session_id, proposals = await self._plan(client, coach)
        client.post(card_url(session_id, proposals[0]["id"], "accept"))

        response = client.post(card_url(session_id, proposals[0]["id"], "reject"))

        assert response.status_code == 409
        assert response.json()["detail"] == study_plan_router.PROPOSAL_ACCEPTED

    @pytest.mark.asyncio
    async def test_already_known_cannot_be_accepted(self, client, coach):
        await add_card("un croissant")
        session_id, proposals = await self._plan(client, coach)

        response = client.post(card_url(session_id, proposals[0]["id"], "accept"))

        assert response.status_code == 409
        assert response.json()["detail"] == study_plan_router.PROPOSAL_ALREADY_KNOWN
        assert await count(Card) == 1

    @pytest.mark.asyncio
    async def test_proposal_from_another_session_is_404(self, client, coach):
        session_id, proposals = await self._plan(client, coach)
        other = await add_session()

        assert client.post(card_url(other, proposals[0]["id"], "accept")).status_code == 404
        assert client.post(card_url(other, proposals[0]["id"], "reject")).status_code == 404
        assert client.post(card_url(session_id, 9999, "accept")).status_code == 404


class TestSessionDelete:
    @pytest.mark.asyncio
    async def test_deleting_session_deletes_plan_but_keeps_cards(self, client, coach):
        session_id = await add_session()
        coach(happy_turns())
        proposals = client.post(plan_url(session_id)).json()["proposals"]
        client.post(card_url(session_id, proposals[0]["id"], "accept"))

        assert client.delete(f"/sessions/{session_id}").status_code == 204

        assert await count(StudyPlan) == 0
        assert await count(CardProposal) == 0
        assert await count(Card) == 1


class TestPlanResponse:
    def test_unknown_lesson_falls_back_to_id(self):
        plan = StudyPlan(session_id=1, model="m")
        plan.plan_dict = {
            "summary": "s",
            "items": [{"lesson_id": "gone", "exercise_ids": [], "addresses": ["a"], "why": "w"}],
        }
        plan.proposals = []
        from datetime import datetime

        plan.created_at = datetime(2026, 11, 17)
        response = study_plan_router.plan_response(plan)
        assert response.items[0].lesson_title == "gone"
        assert json.loads(plan.plan)["summary"] == "s"
