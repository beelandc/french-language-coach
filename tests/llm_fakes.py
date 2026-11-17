"""Fake SDK responses and clients for LLM provider tests (issue #228).

Both SDKs are mocked; no test makes a network call.
"""

from types import SimpleNamespace
from typing import Any, Optional
from unittest.mock import AsyncMock, MagicMock

VALID_FEEDBACK_JSON = (
    '{"grammar_score": 72, "vocabulary_score": 65, "fluency_score": 70, '
    '"overall_score": 69, "strengths": ["Bonne prononciation"], '
    '"focus_area": "Accord du participe passé", "example_corrections": '
    '[{"original": "je suis allé hier au le café", "corrected": "je suis allé hier au café", '
    '"explanation": "au = à + le"}]}'
)


def make_mistral_response(
    text: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    cached_tokens: Optional[int] = None,
    details_as_dict: bool = True,
    usage: Any = "default",
) -> SimpleNamespace:
    """Build an object shaped like a Mistral chat completion response.

    ``text`` becomes ``message.content`` unchanged, so it may be a string, a list of
    content chunks (SDK ``TextChunk``/``ThinkChunk`` objects or dicts) or ``None``.
    """
    if usage == "default":
        details = None
        if cached_tokens is not None:
            details = (
                {"cached_tokens": cached_tokens}
                if details_as_dict
                else SimpleNamespace(cached_tokens=cached_tokens)
            )
        usage = SimpleNamespace(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            prompt_tokens_details=details,
        )
    choice = SimpleNamespace(message=SimpleNamespace(content=text), finish_reason="stop")
    return SimpleNamespace(choices=[choice], usage=usage)


def make_mistral_client(response: Any = None, side_effect: Any = None) -> MagicMock:
    """Build a mock Mistral client whose ``chat.complete_async`` returns ``response``."""
    client = MagicMock()
    client.chat.complete_async = AsyncMock(return_value=response, side_effect=side_effect)
    return client


def make_claude_response(
    text: str = "",
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_read_input_tokens: Optional[int] = None,
    stop_reason: str = "end_turn",
    stop_details: Any = None,
    include_thinking: bool = True,
) -> SimpleNamespace:
    """Build an object shaped like a Claude Messages API response."""
    content = []
    if include_thinking:
        content.append(SimpleNamespace(type="thinking", thinking=""))
    if text:
        content.append(SimpleNamespace(type="text", text=text))
    usage = SimpleNamespace(
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cache_read_input_tokens=cache_read_input_tokens,
        cache_creation_input_tokens=0,
    )
    return SimpleNamespace(
        content=content, usage=usage, stop_reason=stop_reason, stop_details=stop_details
    )


def make_claude_client(response: Any = None, side_effect: Any = None) -> MagicMock:
    """Build a mock Anthropic client whose ``messages.create`` returns ``response``."""
    client = MagicMock()
    client.messages.create = AsyncMock(return_value=response, side_effect=side_effect)
    return client


# ---------------------------------------------------------------------------
# Scripted Claude API for agent tests (issue #270)
# ---------------------------------------------------------------------------
#
# The study coach runs on the SDK's real tool runner. Instead of mocking the runner,
# these helpers give a real ``AsyncAnthropic`` client an ``httpx2.MockTransport`` that
# answers each Messages API request with the next scripted response and records the
# request bodies, so tests can check exactly what the runner sent back (tool results,
# ``is_error`` flags) without any network call.

import itertools
import json as _json

import anthropic
import httpx2

_ids = itertools.count(1)


def _usage(usage: tuple[int, int]) -> dict[str, int]:
    return {"input_tokens": usage[0], "output_tokens": usage[1]}


def tool_use_turn(
    name: str, tool_input: dict, usage: tuple[int, int] = (0, 0)
) -> dict[str, Any]:
    """A scripted assistant turn that calls one tool."""
    n = next(_ids)
    return {
        "id": f"msg_{n}",
        "type": "message",
        "role": "assistant",
        "model": "claude-sonnet-5-5",
        "content": [{"type": "tool_use", "id": f"toolu_{n}", "name": name, "input": tool_input}],
        "stop_reason": "tool_use",
        "stop_sequence": None,
        "usage": _usage(usage),
    }


def text_turn(text: str, usage: tuple[int, int] = (0, 0)) -> dict[str, Any]:
    """A scripted assistant turn that ends with text (``end_turn``)."""
    return {
        "id": f"msg_{next(_ids)}",
        "type": "message",
        "role": "assistant",
        "model": "claude-sonnet-5-5",
        "content": [{"type": "text", "text": text}],
        "stop_reason": "end_turn",
        "stop_sequence": None,
        "usage": _usage(usage),
    }


def refusal_turn(category: str = "cyber", usage: tuple[int, int] = (0, 0)) -> dict[str, Any]:
    """A scripted refused turn (``stop_reason: refusal``)."""
    turn = text_turn("", usage)
    turn["content"] = []
    turn["stop_reason"] = "refusal"
    turn["stop_details"] = {"type": "refusal", "category": category, "explanation": None}
    return turn


def error_turn(status: int = 500) -> dict[str, Any]:
    """A scripted HTTP error response."""
    return {"__status__": status}


class ScriptedClaude:
    """Serves scripted Messages API responses to a real ``AsyncAnthropic`` client.

    Attributes:
        turns: Responses still to serve, in order.
        requests: JSON body of every request received.
    """

    def __init__(self, turns: list[dict[str, Any]]):
        self.turns = list(turns)
        self.requests: list[dict[str, Any]] = []

    def _handle(self, request: "httpx2.Request") -> "httpx2.Response":
        self.requests.append(_json.loads(request.content))
        if not self.turns:
            raise AssertionError("ScriptedClaude ran out of scripted turns")
        turn = self.turns.pop(0)
        if "__status__" in turn:
            return httpx2.Response(
                turn["__status__"],
                json={"type": "error", "error": {"type": "api_error", "message": "boom"}},
            )
        return httpx2.Response(200, json=turn)

    def client(self) -> anthropic.AsyncAnthropic:
        """A real async client whose HTTP calls go to this script (no retries)."""
        return anthropic.AsyncAnthropic(
            api_key="test",
            max_retries=0,
            http_client=anthropic.DefaultAsyncHttpxClient(
                transport=httpx2.MockTransport(self._handle)
            ),
        )

    def tool_results(self, request_index: int) -> list[dict[str, Any]]:
        """The ``tool_result`` blocks in the last user turn of request ``request_index``."""
        last = self.requests[request_index]["messages"][-1]
        content = last["content"] if isinstance(last["content"], list) else []
        return [block for block in content if block.get("type") == "tool_result"]

    @staticmethod
    def result_json(block: dict[str, Any]) -> dict[str, Any]:
        """Parse a tool_result block's text content as JSON."""
        content = block["content"]
        text = content if isinstance(content, str) else "".join(
            part.get("text", "") for part in content if part.get("type") == "text"
        )
        return _json.loads(text)


# Sample study-coach inputs shared by the study-coach, service and router tests (#270).

STUDY_MESSAGES = [
    {"role": "assistant", "content": "Bonjour ! Qu'est-ce que vous voulez boire ?"},
    {"role": "user", "content": "Je voudrais une croissant. Il faut que tu viens avec moi."},
]

STUDY_FEEDBACK = {
    "grammar_score": 70,
    "vocabulary_score": 75,
    "fluency_score": 72,
    "overall_score": 72,
    "strengths": ["Bonne politesse"],
    "focus_area": "le subjonctif",
    "example_corrections": [
        {"original": "une croissant", "corrected": "un croissant", "explanation": "masculin"},
        {
            "original": "il faut que tu viens",
            "corrected": "il faut que tu viennes",
            "explanation": "subjonctif après il faut que",
        },
    ],
}


def study_plan_input(lesson_id: str = "subjunctive", **overrides: Any) -> dict[str, Any]:
    """Arguments for a valid ``submit_study_plan`` call citing ``lesson_id``."""
    plan = {
        "summary": "Travaillez le subjonctif et le genre des noms.",
        "items": [
            {
                "lesson_id": lesson_id,
                "exercise_ids": [],
                "addresses": ["il faut que tu viens"],
                "why": "Après « il faut que », on emploie le subjonctif.",
            }
        ],
        "cards": [
            {
                "front": "un croissant",
                "back": "a croissant",
                "example": "Je voudrais un croissant.",
                "source": "une croissant",
            },
            {"front": "le comptoir", "back": "the counter"},
        ],
    }
    plan.update(overrides)
    return plan
