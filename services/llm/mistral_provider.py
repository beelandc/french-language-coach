"""Mistral implementation of the LLM provider interface (async client)."""

from typing import Any, Optional

from mistralai.client import Mistral

from services.llm.base import (
    FEEDBACK_PROMPT,
    LLMProvider,
    LLMProviderError,
    LLMResult,
    build_transcript,
)

#: Error recorded when a response carries no usable text (issue #243).
EMPTY_RESPONSE_ERROR = "empty_response: Mistral returned no text content"


def _get(obj: Any, name: str) -> Any:
    """Read ``name`` from an SDK object or a plain dict (extra fields arrive as dicts)."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(name)
    return getattr(obj, name, None)


def _content_text(content: Any) -> Optional[str]:
    """Return the model's final text from a Mistral ``message.content`` value.

    * ``str``: returned unchanged (including ``""``).
    * list of content chunks (SDK objects or dicts): the text of ``type == "text"``
      chunks, concatenated in order. Reasoning (``thinking``) chunks and every other
      chunk type are skipped, so reasoning is never returned.
    * anything else (``None``, a list without non-empty text): ``None``.
    """
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return None
    parts = [
        text
        for chunk in content
        if _get(chunk, "type") == "text" and isinstance(text := _get(chunk, "text"), str)
    ]
    joined = "".join(parts)
    return joined or None


class MistralProvider(LLMProvider):
    """Calls the Mistral chat completions API with the async SDK client."""

    name = "mistral"

    def __init__(self, api_key: Optional[str], client: Any = None):
        """Create the provider.

        Args:
            api_key: Mistral API key.
            client: Optional pre-built client (used by tests to inject a mock).
        """
        self._client = client if client is not None else Mistral(api_key=api_key)

    async def chat(
        self, messages: list[dict[str, str]], system_prompt: str, model: str
    ) -> LLMResult:
        """Send the system prompt plus conversation history, as the original client did."""
        chat_messages = [{"role": "system", "content": system_prompt}] + messages
        response = await self._client.chat.complete_async(
            model=model,
            messages=chat_messages,
        )
        return self._to_result(response)

    async def feedback(self, messages: list[dict[str, str]], model: str) -> LLMResult:
        """Request feedback in JSON mode with the shared French feedback prompt."""
        response = await self._client.chat.complete_async(
            model=model,
            messages=[
                {"role": "system", "content": FEEDBACK_PROMPT},
                {"role": "user", "content": build_transcript(messages)},
            ],
            response_format={"type": "json_object"},
        )
        return self._to_result(response)

    @staticmethod
    def _to_result(response: Any) -> LLMResult:
        """Map a Mistral response to :class:`LLMResult`, raising when it has no text.

        ``message.content`` may be a string or a list of content chunks (reasoning
        models put a ``thinking`` chunk before the ``text`` chunks); only the text is
        kept (see :func:`_content_text`). A response with no text content raises
        :class:`LLMProviderError` carrying the usage, so the call is recorded as an
        error and still costed.

        Mistral's ``prompt_tokens`` includes cached tokens
        (``prompt_tokens_details.cached_tokens``), so uncached input is the difference.
        """
        choice = response.choices[0]
        usage = _get(response, "usage")
        prompt_tokens = _get(usage, "prompt_tokens") or 0
        completion_tokens = _get(usage, "completion_tokens") or 0
        cached_tokens = _get(_get(usage, "prompt_tokens_details"), "cached_tokens") or 0
        finish_reason = _get(choice, "finish_reason")
        text = _content_text(_get(_get(choice, "message"), "content"))
        result = LLMResult(
            text=text if text is not None else "",
            input_tokens=max(prompt_tokens - cached_tokens, 0),
            output_tokens=completion_tokens,
            cache_read_tokens=cached_tokens,
            stop_reason=str(finish_reason) if finish_reason is not None else None,
        )
        if text is None:
            raise LLMProviderError(EMPTY_RESPONSE_ERROR, result)
        return result
