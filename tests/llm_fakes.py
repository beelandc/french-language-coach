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
    """Build an object shaped like a Mistral chat completion response."""
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
