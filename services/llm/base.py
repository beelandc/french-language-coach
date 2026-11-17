"""Provider interface and shared types for the LLM layer (issue #228).

Every LLM provider implements two operations:

* ``chat()``: scenario role-play, given the conversation and the scenario system prompt
* ``feedback()``: structured end-of-session feedback, returned as raw JSON text. The
  service validates it against ``FeedbackResponse`` and, on failure, calls ``feedback()``
  once more with a :class:`FeedbackCorrection` (issue #229).

Providers report token usage in a provider-neutral :class:`LLMResult` so the service
layer can log each call and estimate its cost.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

FEATURE_CHAT = "chat"
FEATURE_FEEDBACK = "feedback"
#: Post-session study-coach agent (issue #270). Claude only; one ``llm_calls`` row per run.
FEATURE_STUDY_COACH = "study_coach"


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


@dataclass
class AgentRunResult(LLMResult):
    """Result of one agent run: usage summed over every model call in the run (issue #270).

    Attributes:
        iterations: Number of model calls the run made.
    """

    iterations: int = 0


#: ``AgentRunError.code`` values.
AGENT_ITERATION_CAP = "iteration_cap"
AGENT_NO_PLAN = "no_plan_submitted"


class AgentRunError(LLMProviderError):
    """Raised when an agent run ends without a usable result (issue #270).

    Attributes:
        code: ``iteration_cap`` (the run stopped at its call limit while still calling
            tools) or ``no_plan_submitted`` (the model ended its turn without a valid
            result).
        result: Usage summed over the run, so the failed run can still be logged.
    """

    def __init__(self, code: str, detail: str, result: Optional[LLMResult] = None):
        super().__init__(f"{code}: {detail}", result)
        self.code = code


class FeedbackValidationError(LLMProviderError):
    """Raised when feedback output fails validation on the first attempt and the retry.

    Attributes:
        errors: The validation error recorded for each attempt, in order.
        result: Usage reported for the last attempt.
    """

    def __init__(
        self,
        message: str,
        errors: Optional[list[str]] = None,
        result: Optional[LLMResult] = None,
    ):
        super().__init__(message, result)
        self.errors = list(errors or [])


@dataclass
class FeedbackCorrection:
    """Context for the single corrective feedback retry (issue #229).

    Attributes:
        previous_output: The model's text from the failed attempt.
        error: The validation error for that text (``invalid_json: ...`` or
            ``schema_mismatch: ...``).
    """

    previous_output: str
    error: str


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

# Follow-up instruction sent with the corrective retry (issue #229).
FEEDBACK_CORRECTION_PROMPT = (
    "Ta réponse précédente n'est pas valide : {error}\n"
    "Corrige-la et retourne UNIQUEMENT le JSON complet, avec exactement la structure "
    "demandée (scores entiers de 0 à 100). Ne retourne RIEN d'autre que le JSON."
)

#: Longest validation error quoted back to the model in the correction turn.
MAX_CORRECTION_ERROR_CHARS = 1500

# JSON schema mirroring schemas.session.FeedbackResponse, for providers that support
# schema-constrained output. It carries no numeric bounds (schema-constrained output may
# not support them); the 0-100 score range is enforced by Pydantic validation.
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


def build_feedback_turns(
    messages: list[dict[str, str]], correction: Optional[FeedbackCorrection] = None
) -> list[dict[str, str]]:
    """Build the non-system turns of a feedback request.

    The first turn is the transcript. For the corrective retry, the failed output is
    replayed as an assistant turn (skipped when empty, since Claude rejects empty
    assistant content), followed by a user turn quoting the validation error.
    """
    turns = [{"role": "user", "content": build_transcript(messages)}]
    if correction is not None:
        if correction.previous_output.strip():
            turns.append({"role": "assistant", "content": correction.previous_output})
        turns.append(
            {
                "role": "user",
                "content": FEEDBACK_CORRECTION_PROMPT.format(
                    error=correction.error[:MAX_CORRECTION_ERROR_CHARS]
                ),
            }
        )
    return turns


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
    async def feedback(
        self,
        messages: list[dict[str, str]],
        model: str,
        correction: Optional[FeedbackCorrection] = None,
        system_prompt: str = FEEDBACK_PROMPT,
    ) -> LLMResult:
        """Return end-of-session feedback for a conversation as raw JSON text.

        Args:
            messages: Conversation history (``role``/``content`` dicts).
            model: Model to request.
            correction: Set on the corrective retry: the failed output and its error.
            system_prompt: Feedback system prompt. The service passes the prompt built
                from its settings (``FEEDBACK_PROMPT`` plus the rubric, issue #269);
                it defaults to the bare ``FEEDBACK_PROMPT``.
        """
