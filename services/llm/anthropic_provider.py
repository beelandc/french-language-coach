"""Claude implementation of the LLM provider interface (first-party Anthropic API).

Authorized by issue #228. Uses the official ``anthropic`` SDK's async client.
"""

from typing import Any, Optional

import anthropic

from services.llm.base import (
    FEATURE_CHAT,
    FEATURE_FEEDBACK,
    FEEDBACK_JSON_SCHEMA,
    FEEDBACK_PROMPT,
    LLMProvider,
    LLMProviderError,
    LLMResult,
    build_transcript,
)

# Explicit effort per feature, so models with different default efforts are compared
# on equal terms. Overridable with CLAUDE_CHAT_EFFORT / CLAUDE_FEEDBACK_EFFORT.
DEFAULT_EFFORT: dict[str, str] = {FEATURE_CHAT: "low", FEATURE_FEEDBACK: "medium"}

# Non-streaming ceiling; thinking tokens count against it, so leave headroom.
MAX_TOKENS = 16000

# Claude requires the first message to come from the user. Scenario conversations start
# with an empty history (greeting) or with the assistant's greeting, so a neutral user
# turn is prepended in those cases.
CONVERSATION_START = "(Début de la conversation.)"


def to_claude_messages(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    """Convert stored conversation history to a valid Claude ``messages`` list."""
    claude_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in messages
        if m.get("role") in ("user", "assistant")
    ]
    if not claude_messages or claude_messages[0]["role"] != "user":
        claude_messages.insert(0, {"role": "user", "content": CONVERSATION_START})
    return claude_messages


class AnthropicProvider(LLMProvider):
    """Calls the Claude Messages API with the async SDK client."""

    name = "anthropic"

    def __init__(
        self,
        api_key: Optional[str],
        chat_effort: Optional[str] = None,
        feedback_effort: Optional[str] = None,
        client: Any = None,
    ):
        """Create the provider.

        Args:
            api_key: Anthropic API key (passed explicitly; ``.env`` values are not
                exported to the process environment).
            chat_effort: Effort override for chat; defaults to ``DEFAULT_EFFORT["chat"]``.
            feedback_effort: Effort override for feedback; defaults to
                ``DEFAULT_EFFORT["feedback"]``.
            client: Optional pre-built client (used by tests to inject a mock).
        """
        self._client = (
            client if client is not None else anthropic.AsyncAnthropic(api_key=api_key)
        )
        self.chat_effort = chat_effort or DEFAULT_EFFORT[FEATURE_CHAT]
        self.feedback_effort = feedback_effort or DEFAULT_EFFORT[FEATURE_FEEDBACK]

    async def chat(
        self, messages: list[dict[str, str]], system_prompt: str, model: str
    ) -> LLMResult:
        """Return the next role-play reply, with the scenario prompt as ``system``."""
        response = await self._client.messages.create(
            model=model,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=to_claude_messages(messages),
            output_config={"effort": self.chat_effort},
        )
        return self._to_result(response)

    async def feedback(self, messages: list[dict[str, str]], model: str) -> LLMResult:
        """Return feedback JSON constrained to the ``FeedbackResponse`` schema."""
        response = await self._client.messages.create(
            model=model,
            max_tokens=MAX_TOKENS,
            system=FEEDBACK_PROMPT,
            messages=[{"role": "user", "content": build_transcript(messages)}],
            output_config={
                "effort": self.feedback_effort,
                "format": {"type": "json_schema", "schema": FEEDBACK_JSON_SCHEMA},
            },
        )
        return self._to_result(response)

    @staticmethod
    def _to_result(response: Any) -> LLMResult:
        """Map a Claude response to :class:`LLMResult`, raising on refusal.

        Only ``text`` blocks form the reply; ``thinking`` blocks are skipped. Claude's
        ``input_tokens`` already excludes cache reads.
        """
        usage = response.usage
        result = LLMResult(
            text="".join(
                block.text for block in response.content if block.type == "text"
            ),
            input_tokens=getattr(usage, "input_tokens", None) or 0,
            output_tokens=getattr(usage, "output_tokens", None) or 0,
            cache_read_tokens=getattr(usage, "cache_read_input_tokens", None) or 0,
            stop_reason=response.stop_reason,
        )
        if response.stop_reason == "refusal":
            details = getattr(response, "stop_details", None)
            category = getattr(details, "category", None) or "unspecified"
            raise LLMProviderError(f"refusal: {category}", result)
        return result
