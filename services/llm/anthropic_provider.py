"""Claude implementation of the LLM provider interface (first-party Anthropic API).

Authorized by issue #228. Uses the official ``anthropic`` SDK's async client. The
study-coach agent (issue #270) runs here too, through the SDK's beta tool runner
(:meth:`AnthropicProvider.run_tools`).
"""

from typing import Any, Optional

import anthropic

from services.llm.base import (
    FEATURE_CHAT,
    FEATURE_FEEDBACK,
    FEATURE_STUDY_COACH,
    AgentRunResult,
    FEEDBACK_JSON_SCHEMA,
    FEEDBACK_PROMPT,
    FeedbackCorrection,
    LLMProvider,
    LLMProviderError,
    LLMResult,
    build_feedback_turns,
)

# Explicit effort per feature, so models with different default efforts are compared
# on equal terms. Overridable with CLAUDE_CHAT_EFFORT / CLAUDE_FEEDBACK_EFFORT.
DEFAULT_EFFORT: dict[str, str] = {
    FEATURE_CHAT: "low",
    FEATURE_FEEDBACK: "medium",
    FEATURE_STUDY_COACH: "medium",
}

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
        study_coach_effort: Optional[str] = None,
    ):
        """Create the provider.

        Args:
            api_key: Anthropic API key (passed explicitly; ``.env`` values are not
                exported to the process environment).
            chat_effort: Effort override for chat; defaults to ``DEFAULT_EFFORT["chat"]``.
            feedback_effort: Effort override for feedback; defaults to
                ``DEFAULT_EFFORT["feedback"]``.
            client: Optional pre-built client (used by tests to inject a mock).
            study_coach_effort: Effort override for the study coach; defaults to
                ``DEFAULT_EFFORT["study_coach"]``.
        """
        self._client = (
            client if client is not None else anthropic.AsyncAnthropic(api_key=api_key)
        )
        self.chat_effort = chat_effort or DEFAULT_EFFORT[FEATURE_CHAT]
        self.feedback_effort = feedback_effort or DEFAULT_EFFORT[FEATURE_FEEDBACK]
        self.study_coach_effort = study_coach_effort or DEFAULT_EFFORT[FEATURE_STUDY_COACH]

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

    async def feedback(
        self,
        messages: list[dict[str, str]],
        model: str,
        correction: Optional[FeedbackCorrection] = None,
        system_prompt: str = FEEDBACK_PROMPT,
    ) -> LLMResult:
        """Return feedback JSON constrained to the ``FeedbackResponse`` schema.

        ``system_prompt`` is sent as ``system``. On the corrective retry, the failed
        output and the correction turn follow the transcript (see
        :func:`build_feedback_turns`); the schema is kept.
        """
        response = await self._client.messages.create(
            model=model,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=build_feedback_turns(messages, correction),
            output_config={
                "effort": self.feedback_effort,
                "format": {"type": "json_schema", "schema": FEEDBACK_JSON_SCHEMA},
            },
        )
        return self._to_result(response)

    async def run_tools(
        self,
        *,
        system_prompt: str,
        messages: list[dict[str, Any]],
        tools: list[Any],
        model: str,
        max_iterations: int,
    ) -> AgentRunResult:
        """Run an agent loop with the SDK's beta tool runner (issue #270).

        The runner calls the model, runs the tools it asks for, sends their results back
        and repeats until the model ends its turn or ``max_iterations`` model calls have
        been made. ``tool_choice`` and ``thinking`` are left unset (Claude Sonnet 5.5
        rejects forced tool choice and disabled thinking); depth is set with effort.
        ``thread=False`` turns off the runner's default message thread (a beta feature
        that keeps the conversation server-side between calls), so every call is a plain
        Messages request carrying the full history, like the rest of this layer.

        Args:
            system_prompt: System prompt for every call in the run.
            messages: Initial conversation (normally one user turn).
            tools: Runnable tools (``beta_async_tool`` / ``async_mcp_tool`` objects).
            model: Model to request.
            max_iterations: Most model calls the run may make.

        Returns:
            Usage summed over every call, the iteration count, the last message's text
            and its stop reason (``tool_use`` when the run stopped at the cap).

        Raises:
            LLMProviderError: ``refusal: <category>`` when the last call was refused, or
                ``api_error: <exception>`` when an API call failed. Both carry the usage
                summed so far.
        """
        runner = self._client.beta.messages.tool_runner(
            model=model,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=messages,
            tools=tools,
            max_iterations=max_iterations,
            output_config={"effort": self.study_coach_effort},
            thread=False,
        )
        result = AgentRunResult(text="")
        last: Any = None
        try:
            async for message in runner:
                usage = message.usage
                result.input_tokens += getattr(usage, "input_tokens", None) or 0
                result.output_tokens += getattr(usage, "output_tokens", None) or 0
                result.cache_read_tokens += (
                    getattr(usage, "cache_read_input_tokens", None) or 0
                )
                result.iterations += 1
                last = message
        except anthropic.APIError as exc:
            raise LLMProviderError(f"api_error: {type(exc).__name__}", result) from exc

        if last is not None:
            result.text = "".join(
                block.text for block in last.content if block.type == "text"
            )
            result.stop_reason = last.stop_reason
            if last.stop_reason == "refusal":
                details = getattr(last, "stop_details", None)
                category = getattr(details, "category", None) or "unspecified"
                raise LLMProviderError(f"refusal: {category}", result)
        return result

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
