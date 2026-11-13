"""Provider interface and shared types for the LLM layer (issue #228).

Every LLM provider implements two operations:

* ``chat()``: scenario role-play, given the conversation and the scenario system prompt
* ``feedback()``: structured end-of-session feedback, returned as raw JSON text

Providers report token usage in a provider-neutral :class:`LLMResult` so the service
layer can log each call and estimate its cost.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

FEATURE_CHAT = "chat"
FEATURE_FEEDBACK = "feedback"


@dataclass
class LLMResult:
    """Provider-neutral result of one LLM call.

    Attributes:
        text: The model's final text (for feedback, the raw JSON string).
        input_tokens: Uncached input tokens. Cache reads are counted separately.
        output_tokens: Output tokens billed for the call.
        cache_read_tokens: Input tokens served from the provider's prompt cache.
        stop_reason: The provider's stop/finish reason, when it reports one.
    """

    text: str
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    stop_reason: Optional[str] = None


class LLMProviderError(Exception):
    """Raised when a provider call completes without usable output (e.g. a refusal).

    Attributes:
        result: Usage reported for the failed call, if any, so it can still be logged
            and costed.
    """

    def __init__(self, message: str, result: Optional[LLMResult] = None):
        super().__init__(message)
        self.result = result


# Feedback prompt moved verbatim from the original services/mistral.py.
FEEDBACK_PROMPT = """Analyse cette conversation en français entre un apprenant et un natif.
        Évalue uniquement en français. Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
        {
            "grammar_score": <int 0-100>,
            "vocabulary_score": <int 0-100>,
            "fluency_score": <int 0-100>,
            "overall_score": <int 0-100>,
            "strengths": ["<str>", ...],
            "focus_area": "<str>",
            "example_corrections": [
                {"original": "<str>", "corrected": "<str>", "explanation": "<str>"},
                ...
            ]
        }
        Ne retourne RIEN d'autre que le JSON. Sois strict sur la grammaire, le vocabulaire et la fluidité.
        focus_area doit être la SEULE chose la plus impactante à améliorer."""

# Default feedback returned when the model's output cannot be parsed (kept until #229).
FEEDBACK_FALLBACK: dict[str, Any] = {
    "grammar_score": 50,
    "vocabulary_score": 50,
    "fluency_score": 50,
    "overall_score": 50,
    "strengths": ["Bonne tentative"],
    "focus_area": "Pratiquer davantage",
    "example_corrections": [],
}

# JSON schema mirroring schemas.session.FeedbackResponse, for providers that support
# schema-constrained output.
FEEDBACK_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "grammar_score": {"type": "integer"},
        "vocabulary_score": {"type": "integer"},
        "fluency_score": {"type": "integer"},
        "overall_score": {"type": "integer"},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "focus_area": {"type": "string"},
        "example_corrections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "original": {"type": "string"},
                    "corrected": {"type": "string"},
                    "explanation": {"type": "string"},
                },
                "required": ["original", "corrected", "explanation"],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "grammar_score",
        "vocabulary_score",
        "fluency_score",
        "overall_score",
        "strengths",
        "focus_area",
        "example_corrections",
    ],
    "additionalProperties": False,
}


def build_transcript(messages: list[dict[str, str]]) -> str:
    """Render a conversation as ``role: content`` lines for the feedback request."""
    return "\n".join([f"{m['role']}: {m['content']}" for m in messages])


class LLMProvider(ABC):
    """Interface implemented by each LLM provider."""

    #: Provider id used in config and in ``llm_calls.provider``.
    name: str

    @abstractmethod
    async def chat(
        self, messages: list[dict[str, str]], system_prompt: str, model: str
    ) -> LLMResult:
        """Return the next assistant reply for a scenario conversation."""

    @abstractmethod
    async def feedback(self, messages: list[dict[str, str]], model: str) -> LLMResult:
        """Return end-of-session feedback for a conversation as raw JSON text."""
