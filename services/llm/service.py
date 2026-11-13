"""Provider-agnostic LLM service used by the routers (issue #228).

Routes each feature to the provider and model chosen in config, times the call, records
an ``llm_calls`` row and keeps the original feedback JSON fallback.
"""

import copy
import json
import logging
import time
from typing import Any, Awaitable, Callable, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from config import Settings, settings as default_settings
from models.llm_call import STATUS_ERROR, STATUS_SUCCESS
from services.llm.base import (
    FEATURE_CHAT,
    FEATURE_FEEDBACK,
    FEEDBACK_FALLBACK,
    LLMProvider,
    LLMProviderError,
    LLMResult,
)
from services.llm.recorder import record_call

logger = logging.getLogger(__name__)


def build_provider(provider_id: str, config: Settings) -> LLMProvider:
    """Create the provider for ``provider_id`` from settings.

    SDK modules are imported here so an unused provider never builds a client.
    """
    if provider_id == "mistral":
        from services.llm.mistral_provider import MistralProvider

        return MistralProvider(config.MISTRAL_API_KEY)
    if provider_id == "anthropic":
        from services.llm.anthropic_provider import AnthropicProvider

        return AnthropicProvider(
            config.ANTHROPIC_API_KEY,
            chat_effort=config.CLAUDE_CHAT_EFFORT,
            feedback_effort=config.CLAUDE_FEEDBACK_EFFORT,
        )
    raise ValueError(f"Unknown LLM provider: {provider_id!r}")


class LLMService:
    """Entry point for chat and feedback LLM calls."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        providers: Optional[dict[str, LLMProvider]] = None,
    ):
        """Create the service.

        Args:
            settings: Settings to route by; defaults to the application settings.
            providers: Pre-built providers by id (used by tests); others are built lazily.
        """
        self._settings = settings or default_settings
        self._providers: dict[str, LLMProvider] = dict(providers or {})

    def route(self, feature: str) -> tuple[str, str]:
        """Return ``(provider_id, model)`` configured for ``feature``."""
        if feature == FEATURE_CHAT:
            return self._settings.CHAT_PROVIDER, self._settings.CHAT_MODEL
        if feature == FEATURE_FEEDBACK:
            return self._settings.FEEDBACK_PROVIDER, self._settings.FEEDBACK_MODEL
        raise ValueError(f"Unknown LLM feature: {feature!r}")

    def get_provider(self, provider_id: str) -> LLMProvider:
        """Return the provider for ``provider_id``, building it on first use."""
        if provider_id not in self._providers:
            self._providers[provider_id] = build_provider(provider_id, self._settings)
        return self._providers[provider_id]

    async def get_chat_response(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        db: Optional[AsyncSession] = None,
        session_id: Optional[int] = None,
    ) -> str:
        """Return the next assistant reply for a scenario conversation.

        Args:
            messages: Conversation history (``role``/``content`` dicts).
            system_prompt: Scenario system prompt.
            db: Session used to record the call; no row is written when ``None``.
            session_id: Conversation session id stored on the row.

        Raises:
            Exception: Any provider error, after it has been recorded.
        """
        provider_id, model = self.route(FEATURE_CHAT)
        provider = self.get_provider(provider_id)
        result, latency_ms = await self._timed_call(
            lambda: provider.chat(messages, system_prompt, model),
            db=db,
            feature=FEATURE_CHAT,
            provider_id=provider_id,
            model=model,
            session_id=session_id,
        )
        if db is not None:
            await record_call(
                db,
                feature=FEATURE_CHAT,
                provider=provider_id,
                model=model,
                latency_ms=latency_ms,
                status=STATUS_SUCCESS,
                result=result,
                session_id=session_id,
            )
        return result.text

    async def get_feedback(
        self,
        messages: list[dict[str, str]],
        db: Optional[AsyncSession] = None,
        session_id: Optional[int] = None,
    ) -> dict[str, Any]:
        """Return structured feedback for a conversation.

        Unparseable output returns the default fallback feedback (until #229) and is
        recorded with status ``error``.

        Raises:
            Exception: Any provider error, after it has been recorded.
        """
        provider_id, model = self.route(FEATURE_FEEDBACK)
        provider = self.get_provider(provider_id)
        result, latency_ms = await self._timed_call(
            lambda: provider.feedback(messages, model),
            db=db,
            feature=FEATURE_FEEDBACK,
            provider_id=provider_id,
            model=model,
            session_id=session_id,
        )

        status = STATUS_SUCCESS
        error_message = None
        try:
            feedback = json.loads(result.text)
            if not isinstance(feedback, dict):
                raise ValueError(f"expected a JSON object, got {type(feedback).__name__}")
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            logger.warning("Unparseable feedback from %s/%s: %s", provider_id, model, exc)
            feedback = copy.deepcopy(FEEDBACK_FALLBACK)
            status = STATUS_ERROR
            error_message = f"invalid_json: {exc}"

        if db is not None:
            await record_call(
                db,
                feature=FEATURE_FEEDBACK,
                provider=provider_id,
                model=model,
                latency_ms=latency_ms,
                status=status,
                result=result,
                session_id=session_id,
                error_message=error_message,
            )
        return feedback

    async def _timed_call(
        self,
        invoke: Callable[[], Awaitable[LLMResult]],
        *,
        db: Optional[AsyncSession],
        feature: str,
        provider_id: str,
        model: str,
        session_id: Optional[int],
    ) -> tuple[LLMResult, int]:
        """Run a provider call, returning its result and latency in ms.

        On failure, records an error row (with any usage the provider reported) and
        re-raises the original exception.
        """
        start = time.perf_counter()
        try:
            result = await invoke()
        except Exception as exc:
            latency_ms = int(round((time.perf_counter() - start) * 1000))
            if db is not None:
                await record_call(
                    db,
                    feature=feature,
                    provider=provider_id,
                    model=model,
                    latency_ms=latency_ms,
                    status=STATUS_ERROR,
                    result=exc.result if isinstance(exc, LLMProviderError) else None,
                    session_id=session_id,
                    error_message=str(exc) or type(exc).__name__,
                )
            raise
        latency_ms = int(round((time.perf_counter() - start) * 1000))
        return result, latency_ms


llm_service = LLMService()
