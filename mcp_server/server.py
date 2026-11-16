"""MCP server exposing French Language Coach content as read-only tools (issue #268).

The five tools are thin adapters over the routers' own query logic: grammar
content comes from the helpers in ``routers/grammar.py`` and due cards from
``routers.vocabulary.query_due_cards``. Nothing in this package loads files or
queries the database itself, and nothing writes.

Every tool returns a ``CallToolResult`` from ``mcp_server.results``. Domain
problems (unknown lesson, page past the end, unreadable database) and argument
validation failures all use the same structured error shape, so a model can
recover from them.

The tool names, argument names and error codes are a contract that the
study-coach agent (#270) will reuse.
"""

import difflib
from math import ceil
from typing import Annotated, Any, Callable, Optional, Union

from fastapi import HTTPException
from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp_types import CallToolResult, ToolAnnotations
from pydantic import Field, ValidationError
from sqlalchemy.exc import SQLAlchemyError

from routers import grammar, vocabulary
from schemas.grammar import LessonSummary
from schemas.grammar_exercise import ExerciseType
from schemas.grammar_lesson import DifficultyLevel
from schemas.grammar_reference import GrammarReferenceCategory
from mcp_server.results import (
    DATABASE_UNAVAILABLE,
    INVALID_ARGUMENTS,
    LESSON_NOT_FOUND,
    PAGE_OUT_OF_RANGE,
    tool_error,
    tool_result,
)

SERVER_NAME = "french-language-coach"

SERVER_INSTRUCTIONS = (
    "Serves the learner's French course content (grammar lessons, a grammar "
    "reference, practice exercises) and their spaced-repetition vocabulary cards "
    "that are due today. All tools are read-only. A typical flow: find content "
    "with recommend_lessons_for_focus_area or search_grammar_reference, read a "
    "full lesson with get_lesson, fetch practice items with list_exercises, and "
    "call get_due_cards for vocabulary to weave into the practice."
)

# Upper bound on items per page, to keep tool results small.
MAX_LIMIT = 50
DEFAULT_LIMIT = 10

# Shared parameter types, so every paged tool describes paging the same way.
Limit = Annotated[
    int,
    Field(
        ge=1,
        le=MAX_LIMIT,
        description=f"Maximum number of items to return (1-{MAX_LIMIT}).",
    ),
]
Page = Annotated[
    int,
    Field(ge=1, description="Page number, starting at 1. Use with has_more to page."),
]
Difficulty = Annotated[
    Optional[DifficultyLevel],
    Field(description="Only return items at this level. Omit for all levels."),
]


def _annotations(title: str) -> ToolAnnotations:
    """Annotations shared by every tool: read-only, idempotent, closed world."""
    return ToolAnnotations(
        title=title,
        read_only_hint=True,
        destructive_hint=False,
        idempotent_hint=True,
        open_world_hint=False,
    )


def _paginate_or_error(
    paginate_fn: Callable[[list, int, int], tuple[list, Any]],
    items: list,
    page: int,
    limit: int,
) -> Union[tuple[list, Any], CallToolResult]:
    """Page ``items`` with a router pagination helper.

    The router helpers raise ``HTTPException(404)`` past the last page; that is
    turned into a structured ``page_out_of_range`` error here.

    Args:
        paginate_fn: ``grammar.paginate`` or ``vocabulary.paginate_items``.
        items: All matching items.
        page: Requested page (1-indexed).
        limit: Items per page.

    Returns:
        ``(page_items, pagination_info)`` on success, or an error CallToolResult.
    """
    try:
        return paginate_fn(items, page, limit)
    except HTTPException:
        max_page = max(1, ceil(len(items) / limit))
        return tool_error(
            PAGE_OUT_OF_RANGE,
            f"Page {page} does not exist; there are {max_page} page(s).",
            f"Call again with page between 1 and {max_page}.",
            {"page": page, "max_page": max_page},
        )


def _paging_fields(pagination: Any) -> dict[str, Any]:
    """Paging fields included in every paged success payload."""
    return {
        "total": pagination.total,
        "page": pagination.page,
        "total_pages": pagination.total_pages,
        "has_more": pagination.page < pagination.total_pages,
    }


class FLCMCPServer(MCPServer):
    """MCPServer that reports argument validation failures as structured errors.

    By default the SDK returns raw pydantic text when arguments fail the input
    schema. This override returns an ``invalid_arguments`` error listing each
    bad field instead, matching the shape of the tools' own errors.
    """

    async def call_tool(self, name, arguments, context=None):
        """Call a tool, turning argument validation failures into structured errors.

        Args:
            name: Tool name.
            arguments: Tool arguments from the client.
            context: Optional request context, passed through to the SDK.

        Returns:
            The tool's CallToolResult, or an ``invalid_arguments`` error.

        Raises:
            ToolError: For failures other than argument validation (for example
                an unknown tool name), which the SDK reports itself.
        """
        try:
            return await super().call_tool(name, arguments, context)
        except ToolError as exc:
            cause = exc.__cause__
            if not isinstance(cause, ValidationError):
                raise
            errors = [
                {
                    "field": ".".join(str(part) for part in err["loc"]),
                    "problem": err["msg"],
                }
                for err in cause.errors(include_url=False, include_input=False)
            ]
            return tool_error(
                INVALID_ARGUMENTS,
                "Some arguments are invalid.",
                "Fix the listed arguments and call the tool again.",
                {"errors": errors},
            )


def create_server(session_factory: Optional[Callable[[], Any]] = None) -> FLCMCPServer:
    """Build the MCP server and register its five read-only tools.

    Args:
        session_factory: Callable returning an async session context manager,
            used by ``get_due_cards``. Defaults to ``database.async_session_maker``.
            Tests pass the in-memory test session factory.

    Returns:
        A configured FLCMCPServer, ready for ``run("stdio")`` or an in-process Client.
    """
    if session_factory is None:
        from database import async_session_maker

        session_factory = async_session_maker

    server = FLCMCPServer(name=SERVER_NAME, instructions=SERVER_INSTRUCTIONS)

    @server.tool(annotations=_annotations("Search Grammar Reference"))
    def search_grammar_reference(
        query: Annotated[
            Optional[str],
            Field(
                description=(
                    "Text to look for, e.g. 'subjonctif' or 'subjunctive'. Matches "
                    "case-insensitive substrings of the term, definition, examples "
                    "and common pitfalls. Omit to browse by filters only."
                ),
            ),
        ] = None,
        category: Annotated[
            Optional[GrammarReferenceCategory],
            Field(description="Only return entries in this grammatical category."),
        ] = None,
        difficulty: Difficulty = None,
        limit: Limit = DEFAULT_LIMIT,
        page: Page = 1,
    ) -> CallToolResult:
        """Search the grammar reference for short entries on a grammar point.

        Each result has an id, term, definition, examples, common pitfalls,
        category and difficulty. Filters combine with AND. Use this for quick
        facts and examples; use get_lesson for a full structured lesson.
        Results are paged (has_more, total_pages), at most 50 per page.
        """
        matches = grammar.filter_references(
            grammar.get_references(), query, category, difficulty
        )
        paged = _paginate_or_error(grammar.paginate, matches, page, limit)
        if isinstance(paged, CallToolResult):
            return paged
        items, pagination = paged
        payload: dict[str, Any] = {
            "query": query,
            "category": category.value if category else None,
            "difficulty": difficulty.value if difficulty else None,
            **_paging_fields(pagination),
            "results": [item.model_dump(mode="json") for item in items],
        }
        if pagination.total == 0:
            payload["hint"] = (
                "No entries matched. Try a shorter term, the English or French name "
                "(e.g. 'subjunctive' / 'subjonctif'), or a category filter without a query."
            )
        return tool_result(payload)

    @server.tool(annotations=_annotations("Get Grammar Lesson"))
    def get_lesson(
        lesson_id: Annotated[
            str,
            Field(
                description=(
                    "The lesson's id, e.g. 'subjunctive' or 'passe-compose'. Get ids "
                    "from recommend_lessons_for_focus_area."
                ),
            ),
        ],
    ) -> CallToolResult:
        """Get one full grammar lesson by its id.

        Returns the lesson's title, topic, difficulty, explanation sections and
        examples. Use recommend_lessons_for_focus_area (or the ids suggested in
        a lesson_not_found error) to find a valid id.
        """
        lessons = grammar.get_lessons()
        lesson = lessons.get(lesson_id)
        if lesson is None:
            suggestions = difflib.get_close_matches(
                lesson_id.lower(), list(lessons), n=3, cutoff=0.5
            )
            return tool_error(
                LESSON_NOT_FOUND,
                f"No lesson with id '{lesson_id}'.",
                "Use one of the suggested ids, or call recommend_lessons_for_focus_area "
                "or search_grammar_reference to find lesson ids.",
                {"did_you_mean": suggestions},
            )
        return tool_result({"lesson": lesson.model_dump(mode="json")})

    @server.tool(annotations=_annotations("List Exercises"))
    def list_exercises(
        topic: Annotated[
            Optional[str],
            Field(
                description=(
                    "Only return exercises whose topic contains this text "
                    "(case-insensitive). Topics are broad, e.g. 'Verbs' or "
                    "'Sentence Structure'. Omit to browse."
                ),
            ),
        ] = None,
        exercise_type: Annotated[
            Optional[ExerciseType],
            Field(description="Only return exercises of this type."),
        ] = None,
        difficulty: Difficulty = None,
        limit: Limit = DEFAULT_LIMIT,
        page: Page = 1,
    ) -> CallToolResult:
        """List practice exercises, with their answers, filtered by topic, type or level.

        Each exercise includes its prompt and the correct answer, so don't reveal
        the answer before the learner responds. Filters combine with AND. If no
        exercise exists for a grammar point, the result says which topics do
        exist; build practice from search_grammar_reference or get_lesson instead.
        Results are paged, at most 50 per page.
        """
        exercises = grammar.get_exercises()
        matches = grammar.filter_exercises(exercises, exercise_type, topic, difficulty)
        paged = _paginate_or_error(grammar.paginate, matches, page, limit)
        if isinstance(paged, CallToolResult):
            return paged
        items, pagination = paged
        payload: dict[str, Any] = {
            "topic": topic,
            "exercise_type": exercise_type.value if exercise_type else None,
            "difficulty": difficulty.value if difficulty else None,
            **_paging_fields(pagination),
            "exercises": [item.model_dump(mode="json") for item in items],
        }
        if pagination.total == 0:
            topics = sorted({exercise.topic for exercise in exercises.values()})
            payload["hint"] = (
                f"No exercises matched. Available exercise topics: {topics}. To practise "
                "a grammar point without exercises, use search_grammar_reference or "
                "get_lesson and write practice items from their examples."
            )
        return tool_result(payload)

    @server.tool(annotations=_annotations("Recommend Lessons for a Focus Area"))
    def recommend_lessons_for_focus_area(
        focus_area: Annotated[
            str,
            Field(
                description=(
                    "A weakness or feedback focus area in English or French, e.g. "
                    "'subjunctive', 'accord du participe passé', 'object pronouns'."
                ),
            ),
        ],
    ) -> CallToolResult:
        """Recommend up to 3 grammar lessons for a weakness or feedback focus area.

        Returns lesson summaries (id, title, topic, difficulty) to pass to
        get_lesson, plus the matched topics. When nothing matches, it returns
        general beginner lessons and sets fallback_used to true.
        """
        matched_topics, lessons = grammar.get_recommendations(focus_area)
        fallback_used = not matched_topics
        payload: dict[str, Any] = {
            "focus_area": focus_area,
            "matched_topics": matched_topics,
            "fallback_used": fallback_used,
            "lessons": [
                LessonSummary(
                    id=lesson.id,
                    title=lesson.title,
                    topic=lesson.topic,
                    difficulty=lesson.difficulty,
                ).model_dump(mode="json")
                for lesson in lessons
            ],
        }
        if fallback_used:
            payload["hint"] = (
                "No topic matched, so these are general beginner lessons, not targeted "
                "ones. Try a grammar term such as 'subjunctive' or 'passé composé'."
            )
        return tool_result(payload)

    @server.tool(annotations=_annotations("Get Due Vocabulary Cards"))
    async def get_due_cards(
        limit: Limit = DEFAULT_LIMIT,
        page: Page = 1,
    ) -> CallToolResult:
        """Get the learner's vocabulary flashcards due for review today.

        A card is due when its next review date is on or before today. Cards come
        oldest first, each with front (French), back (English), deck name and
        next review date. Use them to quiz due words or weave them into other
        practice. Read-only: this doesn't record reviews. Paged, at most 50 per page.
        """
        today = vocabulary.get_today()
        try:
            async with session_factory() as db:
                cards = await vocabulary.query_due_cards(db, today)
        except SQLAlchemyError as exc:
            return tool_error(
                DATABASE_UNAVAILABLE,
                "The vocabulary database could not be read.",
                "Start the backend once (uvicorn main:app) to create and seed the "
                "database, or check DATABASE_URL.",
                {"reason": type(exc).__name__},
            )
        paged = _paginate_or_error(vocabulary.paginate_items, cards, page, limit)
        if isinstance(paged, CallToolResult):
            return paged
        items, pagination = paged
        payload: dict[str, Any] = {
            "today": today.isoformat(),
            **_paging_fields(pagination),
            "cards": [card.model_dump(mode="json") for card in items],
        }
        if pagination.total == 0:
            payload["hint"] = "No cards are due today."
        return tool_result(payload)

    return server
