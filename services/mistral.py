"""Backward-compatibility alias for the provider-agnostic LLM service (issue #228).

LLM calls now go through :mod:`services.llm`, which routes each feature to the provider
configured in ``CHAT_PROVIDER`` / ``FEEDBACK_PROVIDER`` (Mistral by default). This module
keeps the old ``mistral_client`` name as the *same object* as ``services.llm.llm_service``,
so existing code and tests that patch ``services.mistral.mistral_client`` keep working.

New code should import ``llm_service`` from ``services.llm`` instead.
"""

from services.llm import llm_service as mistral_client

__all__ = ["mistral_client"]
