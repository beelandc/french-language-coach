"""Tests for the read-only MCP server (issue #268).

Every tool is called through an MCP ``Client``: in-process against a server
built with the in-memory test database, plus one end-to-end run that launches
``mcp_server/__main__.py`` over stdio.
"""

import json
import os
import re
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest
from mcp import Client, StdioServerParameters
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

import mcp_server.__main__ as entry
from mcp_server import create_server
from mcp_server.results import (
    DATABASE_UNAVAILABLE,
    INVALID_ARGUMENTS,
    LESSON_NOT_FOUND,
    PAGE_OUT_OF_RANGE,
)
from models.card import Card as CardModel
from models.deck import Deck as DeckModel
from tests.conftest import AsyncTestingSession

REPO_ROOT = Path(__file__).resolve().parent.parent
PACKAGE_DIR = REPO_ROOT / "mcp_server"

EXPECTED_TOOLS = {
    "search_grammar_reference",
    "get_lesson",
    "list_exercises",
    "recommend_lessons_for_focus_area",
    "get_due_cards",
}


class InProcessClient:
    """Calls the server through a real MCP ``Client``, one connection per call.

    The connection is opened and closed inside the test's own task. A yielding
    async fixture would close the Client's anyio task group from a different
    task than the one that opened it, which anyio rejects.
    """

    def __init__(self, server):
        self.server = server

    async def list_tools(self):
        async with Client(self.server) as client:
            return await client.list_tools()

    async def call_tool(self, name: str, arguments: dict):
        async with Client(self.server) as client:
            return await client.call_tool(name, arguments)


@pytest.fixture
def mcp_client(test_db):
    """MCP client for a server on the in-memory test DB (tables created by test_db)."""
    return InProcessClient(create_server(session_factory=AsyncTestingSession))


def error_of(result) -> dict:
    """Return the structured error body of an error result."""
    assert result.is_error is True
    body = json.loads(result.content[0].text)
    assert body == result.structured_content
    return body["error"]


def body_of(result) -> dict:
    """Return the payload of a successful result."""
    assert result.is_error is False, result.content[0].text
    body = json.loads(result.content[0].text)
    assert body == result.structured_content
    return body


async def seed_cards(db, offsets: dict[str, int], deck_name: str = "Food") -> None:
    """Add one deck and a card per entry, due ``today + offset`` days."""
    deck = DeckModel(name=deck_name)
    db.add(deck)
    await db.flush()
    today = date.today()
    for card_id, offset in offsets.items():
        db.add(
            CardModel(
                deck_id=deck.id,
                card_id=card_id,
                front=f"fr-{card_id}",
                back=f"en-{card_id}",
                next_review_date=today + timedelta(days=offset),
            )
        )
    await db.commit()


# ============================================================================
# Tool listing, descriptions, schemas, annotations
# ============================================================================

@pytest.mark.asyncio
class TestToolListing:
    async def test_exactly_the_five_tools(self, mcp_client):
        tools = (await mcp_client.list_tools()).tools
        assert {tool.name for tool in tools} == EXPECTED_TOOLS

    async def test_every_tool_is_annotated_read_only(self, mcp_client):
        for tool in (await mcp_client.list_tools()).tools:
            assert tool.annotations.read_only_hint is True, tool.name
            assert tool.annotations.destructive_hint is False, tool.name
            assert tool.annotations.idempotent_hint is True, tool.name
            assert tool.annotations.title, tool.name

    async def test_every_tool_and_parameter_is_described(self, mcp_client):
        for tool in (await mcp_client.list_tools()).tools:
            assert len(tool.description) > 80, tool.name
            for name, prop in tool.input_schema["properties"].items():
                assert prop.get("description"), f"{tool.name}.{name}"

    async def test_closed_domains_are_enums_and_limit_is_bounded(self, mcp_client):
        tools = {tool.name: tool for tool in (await mcp_client.list_tools()).tools}
        schema = tools["list_exercises"].input_schema
        enum_values = {
            name: definition["enum"] for name, definition in schema["$defs"].items()
        }
        assert set(enum_values["DifficultyLevel"]) == {"beginner", "intermediate", "advanced"}
        assert "fill-in-the-blank" in enum_values["ExerciseType"]
        reference_defs = tools["search_grammar_reference"].input_schema["$defs"]
        assert "Verbs" in reference_defs["GrammarReferenceCategory"]["enum"]
        for name in ("search_grammar_reference", "list_exercises", "get_due_cards"):
            limit = tools[name].input_schema["properties"]["limit"]
            assert (limit["minimum"], limit["maximum"], limit["default"]) == (1, 50, 10)

    async def test_required_arguments(self, mcp_client):
        tools = {tool.name: tool for tool in (await mcp_client.list_tools()).tools}
        assert tools["get_lesson"].input_schema["required"] == ["lesson_id"]
        assert tools["recommend_lessons_for_focus_area"].input_schema["required"] == ["focus_area"]
        assert "required" not in tools["get_due_cards"].input_schema


# ============================================================================
# search_grammar_reference
# ============================================================================

@pytest.mark.asyncio
class TestSearchGrammarReference:
    async def test_french_query_finds_subjunctive_entry(self, mcp_client):
        result = await mcp_client.call_tool("search_grammar_reference", {"query": "subjonctif"})
        body = body_of(result)
        ids = [entry["id"] for entry in body["results"]]
        assert "subjunctive-present" in ids
        first = body["results"][0]
        for field in ("term", "definition", "examples", "common_pitfalls", "category", "difficulty"):
            assert field in first
        assert "hint" not in body

    async def test_english_query_finds_subjunctive_entry(self, mcp_client):
        body = body_of(await mcp_client.call_tool("search_grammar_reference", {"query": "subjunctive"}))
        assert "subjunctive-past" in [entry["id"] for entry in body["results"]]

    async def test_category_filter_and_paging(self, mcp_client):
        body = body_of(
            await mcp_client.call_tool(
                "search_grammar_reference", {"category": "Verbs", "limit": 2}
            )
        )
        assert body["category"] == "Verbs"
        assert len(body["results"]) == 2
        assert all(entry["category"] == "Verbs" for entry in body["results"])
        assert body["has_more"] is True
        assert body["total_pages"] == -(-body["total"] // 2)

    async def test_no_match_is_success_with_hint(self, mcp_client):
        body = body_of(await mcp_client.call_tool("search_grammar_reference", {"query": "zzzz"}))
        assert body["total"] == 0
        assert body["results"] == []
        assert "subjonctif" in body["hint"]

    async def test_page_past_end(self, mcp_client):
        error = error_of(
            await mcp_client.call_tool("search_grammar_reference", {"query": "subjonctif", "page": 5})
        )
        assert error["code"] == PAGE_OUT_OF_RANGE
        assert error["details"] == {"page": 5, "max_page": 1}


# ============================================================================
# get_lesson
# ============================================================================

@pytest.mark.asyncio
class TestGetLesson:
    async def test_returns_full_lesson(self, mcp_client):
        body = body_of(await mcp_client.call_tool("get_lesson", {"lesson_id": "subjunctive"}))
        lesson = body["lesson"]
        assert lesson["id"] == "subjunctive"
        assert lesson["title"] == "Subjunctive Mood"
        assert lesson["sections"]

    async def test_unknown_id_returns_structured_error_with_suggestions(self, mcp_client):
        error = error_of(await mcp_client.call_tool("get_lesson", {"lesson_id": "subjonctif"}))
        assert error["code"] == LESSON_NOT_FOUND
        assert "subjonctif" in error["message"]
        assert "subjunctive" in error["details"]["did_you_mean"]
        assert "recommend_lessons_for_focus_area" in error["hint"]

    async def test_unknown_id_with_no_close_match(self, mcp_client):
        error = error_of(await mcp_client.call_tool("get_lesson", {"lesson_id": "zzzzzzzz"}))
        assert error["code"] == LESSON_NOT_FOUND
        assert error["details"]["did_you_mean"] == []


# ============================================================================
# list_exercises
# ============================================================================

@pytest.mark.asyncio
class TestListExercises:
    async def test_topic_filter(self, mcp_client):
        body = body_of(await mcp_client.call_tool("list_exercises", {"topic": "verbs"}))
        assert body["total"] >= 1
        assert all("Verbs" in exercise["topic"] for exercise in body["exercises"])

    async def test_type_and_difficulty_filters(self, mcp_client):
        body = body_of(
            await mcp_client.call_tool(
                "list_exercises",
                {"exercise_type": "conjugation", "difficulty": "beginner"},
            )
        )
        assert body["exercise_type"] == "conjugation"
        assert body["difficulty"] == "beginner"
        assert body["total"] >= 1
        assert all(exercise["type"] == "conjugation" for exercise in body["exercises"])

    async def test_no_exercises_for_topic_lists_available_topics(self, mcp_client):
        body = body_of(await mcp_client.call_tool("list_exercises", {"topic": "subjunctive"}))
        assert body["total"] == 0
        assert "Verbs" in body["hint"]
        assert "search_grammar_reference" in body["hint"]

    async def test_page_past_end(self, mcp_client):
        error = error_of(await mcp_client.call_tool("list_exercises", {"page": 99}))
        assert error["code"] == PAGE_OUT_OF_RANGE
        assert error["details"] == {"page": 99, "max_page": 1}
        assert "between 1 and 1" in error["hint"]


# ============================================================================
# recommend_lessons_for_focus_area
# ============================================================================

@pytest.mark.asyncio
class TestRecommendLessons:
    async def test_matching_focus_area(self, mcp_client):
        body = body_of(
            await mcp_client.call_tool(
                "recommend_lessons_for_focus_area", {"focus_area": "subjonctif"}
            )
        )
        assert body["matched_topics"] == ["Moods"]
        assert body["fallback_used"] is False
        assert 1 <= len(body["lessons"]) <= 3
        assert set(body["lessons"][0]) == {"id", "title", "topic", "difficulty"}
        assert all(lesson["topic"] == "Moods" for lesson in body["lessons"])
        assert "hint" not in body

    async def test_unknown_focus_area_falls_back_with_hint(self, mcp_client):
        body = body_of(
            await mcp_client.call_tool(
                "recommend_lessons_for_focus_area", {"focus_area": "pronunciation"}
            )
        )
        assert body["matched_topics"] == []
        assert body["fallback_used"] is True
        assert all(lesson["difficulty"] == "beginner" for lesson in body["lessons"])
        assert "not targeted" in body["hint"]


# ============================================================================
# get_due_cards
# ============================================================================

@pytest.mark.asyncio
class TestGetDueCards:
    async def test_returns_only_due_cards_oldest_first(self, test_db, mcp_client):
        await seed_cards(test_db, {"a": -3, "b": 0, "c": 1})

        body = body_of(await mcp_client.call_tool("get_due_cards", {}))

        assert body["today"] == date.today().isoformat()
        assert body["total"] == 2
        assert [card["card_id"] for card in body["cards"]] == ["a", "b"]
        first = body["cards"][0]
        assert first["deck_name"] == "Food"
        assert (first["front"], first["back"]) == ("fr-a", "en-a")
        assert first["next_review_date"] == (date.today() - timedelta(days=3)).isoformat()
        assert "hint" not in body

    async def test_paging(self, test_db, mcp_client):
        await seed_cards(test_db, {"a": -3, "b": 0, "c": 1})

        body = body_of(await mcp_client.call_tool("get_due_cards", {"limit": 1, "page": 2}))

        assert [card["card_id"] for card in body["cards"]] == ["b"]
        assert body["has_more"] is False
        assert body["total_pages"] == 2

    async def test_page_past_end(self, test_db, mcp_client):
        await seed_cards(test_db, {"a": -1})

        error = error_of(await mcp_client.call_tool("get_due_cards", {"page": 3}))

        assert error["code"] == PAGE_OUT_OF_RANGE
        assert error["details"]["max_page"] == 1

    async def test_nothing_due(self, test_db, mcp_client):
        await seed_cards(test_db, {"later": 5})

        body = body_of(await mcp_client.call_tool("get_due_cards", {}))

        assert body["total"] == 0
        assert body["cards"] == []
        assert body["hint"] == "No cards are due today."

    async def test_does_not_change_cards(self, test_db, mcp_client):
        await seed_cards(test_db, {"a": -3, "b": 0})
        before = (
            await test_db.execute(select(CardModel.card_id, CardModel.next_review_date))
        ).all()

        await mcp_client.call_tool("get_due_cards", {})

        test_db.expire_all()
        after = (
            await test_db.execute(select(CardModel.card_id, CardModel.next_review_date))
        ).all()
        count = (await test_db.execute(select(func.count(CardModel.id)))).scalar_one()
        assert sorted(after) == sorted(before)
        assert count == 2

    async def test_database_without_tables_returns_structured_error(self):
        empty_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        empty_sessions = sessionmaker(empty_engine, expire_on_commit=False, class_=AsyncSession)
        server = create_server(session_factory=empty_sessions)
        try:
            async with Client(server) as client:
                error = error_of(await client.call_tool("get_due_cards", {}))
        finally:
            await empty_engine.dispose()

        assert error["code"] == DATABASE_UNAVAILABLE
        assert "uvicorn main:app" in error["hint"]
        assert error["details"]["reason"] == "OperationalError"


# ============================================================================
# Argument validation
# ============================================================================

@pytest.mark.asyncio
class TestInvalidArguments:
    async def test_bad_enum_value(self, mcp_client):
        error = error_of(await mcp_client.call_tool("list_exercises", {"difficulty": "hard"}))
        assert error["code"] == INVALID_ARGUMENTS
        assert error["details"]["errors"][0]["field"] == "difficulty"
        assert "beginner" in error["details"]["errors"][0]["problem"]
        assert "call the tool again" in error["hint"]

    @pytest.mark.parametrize("limit", [0, 51])
    async def test_limit_out_of_bounds(self, mcp_client, limit):
        error = error_of(await mcp_client.call_tool("get_due_cards", {"limit": limit}))
        assert error["code"] == INVALID_ARGUMENTS
        assert [err["field"] for err in error["details"]["errors"]] == ["limit"]

    async def test_missing_required_argument(self, mcp_client):
        error = error_of(await mcp_client.call_tool("get_lesson", {}))
        assert error["code"] == INVALID_ARGUMENTS
        assert error["details"]["errors"][0]["field"] == "lesson_id"

    async def test_unknown_tool_is_left_to_the_sdk(self, mcp_client):
        result = await mcp_client.call_tool("delete_everything", {})
        assert result.is_error is True
        assert "Unknown tool" in result.content[0].text


# ============================================================================
# AC1 (no duplicated data access) and AC3 (read-only) source checks
# ============================================================================

def _package_sources() -> dict[str, str]:
    return {path.name: path.read_text() for path in PACKAGE_DIR.glob("*.py")}


class TestSourceGuards:
    def test_no_data_access_of_its_own(self):
        forbidden = [r"\bselect\(", r"json\.load", r"\.glob\(", r"data/", r"read_text\(", r"\bopen\("]
        for name, source in _package_sources().items():
            for pattern in forbidden:
                assert not re.search(pattern, source), f"{name} matches {pattern}"

    def test_no_writes(self):
        forbidden = [r"\.commit\(", r"\.add\(", r"\.delete\(", r"\.merge\(", r"\.flush\(", r"write_text\("]
        for name, source in _package_sources().items():
            for pattern in forbidden:
                assert not re.search(pattern, source), f"{name} matches {pattern}"

    def test_no_llm_or_app_imports(self):
        for name, source in _package_sources().items():
            assert "services.llm" not in source, name
            assert not re.search(r"^\s*(from main|import main)\b", source, re.M), name


# ============================================================================
# Entry point
# ============================================================================

class TestEntryPoint:
    def test_bootstrap_from_another_directory(self, tmp_path, monkeypatch):
        root = str(REPO_ROOT)
        monkeypatch.chdir(tmp_path)
        monkeypatch.setattr(sys, "path", [p for p in sys.path if p != root])

        assert entry.bootstrap() == REPO_ROOT
        assert Path.cwd() == REPO_ROOT
        assert sys.path[0] == root

    def test_main_runs_stdio(self, monkeypatch):
        calls = []

        class FakeServer:
            def run(self, transport):
                calls.append(transport)

        monkeypatch.setattr(entry, "bootstrap", lambda: REPO_ROOT)
        monkeypatch.setattr("mcp_server.server.create_server", lambda: FakeServer())

        entry.main()

        assert calls == ["stdio"]


@pytest.mark.asyncio
async def test_stdio_end_to_end_from_another_directory(tmp_path):
    """Launch the server the way an MCP client does and call a tool over stdio."""
    params = StdioServerParameters(
        command=sys.executable,
        args=[str(PACKAGE_DIR / "__main__.py")],
        cwd=str(tmp_path),
        env=dict(os.environ),
    )
    async with Client(params, read_timeout_seconds=30) as client:
        tools = (await client.list_tools()).tools
        result = await client.call_tool("get_lesson", {"lesson_id": "subjunctive"})

    assert {tool.name for tool in tools} == EXPECTED_TOOLS
    assert body_of(result)["lesson"]["title"] == "Subjunctive Mood"
