"""LLM provider layer (issue #228).

Use :data:`llm_service` for all LLM calls. Provider and model are chosen per feature
in config (``CHAT_PROVIDER``/``CHAT_MODEL``, ``FEEDBACK_PROVIDER``/``FEEDBACK_MODEL``).
"""

from services.llm.base import (
    FEATURE_CHAT,
    FEATURE_FEEDBACK,
    LLMProvider,
    LLMProviderError,
    LLMResult,
)
from services.llm.service import LLMService, llm_service

__all__ = [
    "FEATURE_CHAT",
    "FEATURE_FEEDBACK",
    "LLMProvider",
    "LLMProviderError",
    "LLMResult",
    "LLMService",
    "llm_service",
]
