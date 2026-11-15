"""Provider-agnostic LLM service used by the routers (issue #228).

Routes each feature to the provider and model chosen in config, times the call and
records an ``llm_calls`` row per provider call. Feedback output is validated against
``FeedbackResponse`` and retried once on failure; there is no fallback feedback
(issue #229).
"""

import logging
import time
from typing import Any, Awaitable, Callable, Optional

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from config import Settings, settings as default_settings
from models.llm_call import STATUS_ERROR, STATUS_SUCCESS
from schemas.session import FeedbackResponse
from services.llm.base import (
    FEATURE_CHAT,
    FEATURE_FEEDBACK,
    FeedbackCorrection,
    FeedbackValidationError,
    LLMProvider,
    LLMProviderError,
    LLMResult,
)
from services.llm.recorder import record_call

logger = logging.getLogger(__name__)

#: Feedback provider calls per request: the initial attempt plus one corrective retry.
FEEDBACK_MAX_ATTEMPTS = 2

ERROR_INVALID_JSON = "invalid_json"
ERROR_SCHEMA_MISMATCH = "schema_mismatch"


class FeedbackOutputError(ValueError):
    """Feedback text that failed validation.

    Attributes:
        kind: ``invalid_json`` (unparseable) or ``schema_mismatch`` (wrong shape).
        detail: Compact, model-readable description of the problems.
    """

    def __init__(self, kind: str, detail: str):
        super().__init__(f"{kind}: {detail}")
        self.kind = kind
        self.detail = detail


def validate_feedback(text: str) -> FeedbackResponse:
    """Parse and validate feedback text against ``FeedbackResponse`` in strict mode.

    Strict mode rejects coercible values such as ``"72"`` or ``72.0`` for a score, so the
    schema-validity rate reflects the model's real output. Extra keys are ignored.

    Raises:
        FeedbackOutputError: ``invalid_json`` (with the parser's message) when the text
            isn't JSON, otherwise ``schema_mismatch`` with each problem as
            ``<field path>: <message>``.
    """
    try:
        return FeedbackResponse.model_validate_json(text, strict=True)
    except ValidationError as exc:
        errors = exc.errors()
        json_errors = [e for e in errors if e["type"] == "json_invalid"]
        if json_errors:
            raise FeedbackOutputError(ERROR_INVALID_JSON, json_errors[0]["msg"]) from exc
        detail = "; ".join(
            f"{'.'.join(str(part) for part in e['loc']) or '<root>'}: {e['msg']}"
            for e in errors
        )
        raise FeedbackOutputError(ERROR_SCHEMA_MISMATCH, detail) from exc


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
        """Return validated structured feedback for a conversation.

        Each attempt's output is validated with :func:`validate_feedback`. On an
        ``invalid_json`` or ``schema_mismatch`` failure the provider is called exactly once
        more with a :class:`FeedbackCorrection` (the failed output and its error). Every
        attempt is recorded as its own ``llm_calls`` row; failed attempts carry an
        ``invalid_json: ...`` or ``schema_mismatch: ...`` error message.

        Returns:
            The validated feedback as a dict (extra keys dropped).

        Raises:
            FeedbackValidationError: Both attempts failed validation.
            Exception: Any provider error (not retried), after it has been recorded.
        """
        provider_id, model = self.route(FEATURE_FEEDBACK)
        provider = self.get_provider(provider_id)
        correction: Optional[FeedbackCorrection] = None
        errors: list[str] = []
        result: Optional[LLMResult] = None

        for attempt in range(1, FEEDBACK_MAX_ATTEMPTS + 1):
            result, latency_ms = await self._timed_call(
                lambda c=correction: provider.feedback(messages, model, correction=c),
                db=db,
                feature=FEATURE_FEEDBACK,
                provider_id=provider_id,
                model=model,
                session_id=session_id,
            )
            try:
                feedback = validate_feedback(result.text)
            except FeedbackOutputError as exc:
                logger.warning(
                    "Invalid feedback from %s/%s (attempt %d of %d): %s",
                    provider_id, model, attempt, FEEDBACK_MAX_ATTEMPTS, exc,
                )
                errors.append(str(exc))
                await self._record(
                    db, FEATURE_FEEDBACK, provider_id, model, latency_ms,
                    STATUS_ERROR, result, session_id, str(exc),
                )
                correction = FeedbackCorrection(previous_output=result.text, error=str(exc))
                continue

            await self._record(
                db, FEATURE_FEEDBACK, provider_id, model, latency_ms,
                STATUS_SUCCESS, result, session_id,
            )
            return feedback.model_dump()

        raise FeedbackValidationError(
            "invalid_feedback: model output failed validation after retry",
            errors=errors,
            result=result,
        )

    @staticmethod
    async def _record(
        db: Optional[AsyncSession],
        feature: str,
        provider_id: str,
        model: str,
        latency_ms: int,
        status: str,
        result: Optional[LLMResult],
        session_id: Optional[int],
        error_message: Optional[str] = None,
    ) -> None:
        """Record one call when a DB session is available (best-effort)."""
        if db is None:
            return
        await record_call(
            db,
            feature=feature,
            provider=provider_id,
            model=model,
            latency_ms=latency_ms,
            status=status,
            result=result,
            session_id=session_id,
            error_message=error_message,
        )

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
