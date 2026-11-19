"""LLM provider layer (issue #228).

Use :data:`llm_service` for all LLM calls. Provider and model are chosen per feature
in config (``CHAT_PROVIDER``/``CHAT_MODEL``, ``FEEDBACK_PROVIDER``/``FEEDBACK_MODEL``).
The study coach (issue #270) is Claude-only (``STUDY_COACH_MODEL``).
"""

from services.llm.base import (
    FEATURE_CHAT,
    FEATURE_FEEDBACK,
    FEATURE_STUDY_COACH,
    AgentRunError,
    AgentRunResult,
    FeedbackCorrection,
    FeedbackValidationError,
    LLMProvider,
    LLMProviderError,
    LLMProviderTimeoutError,
    LLMResult,
)
from services.llm.service import LLMService, StudyCoachUnavailableError, llm_service

__all__ = [
    "FEATURE_CHAT",
    "FEATURE_FEEDBACK",
    "FEATURE_STUDY_COACH",
    "AgentRunError",
    "AgentRunResult",
    "FeedbackCorrection",
    "FeedbackValidationError",
    "LLMProvider",
    "LLMProviderError",
    "LLMProviderTimeoutError",
    "LLMResult",
    "LLMService",
    "StudyCoachUnavailableError",
    "llm_service",
]
