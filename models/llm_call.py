"""LLMCall model: one row per LLM provider call (issue #228)."""

from sqlalchemy import Column, Float, Integer, String, Text

from models.base import BaseModel

STATUS_SUCCESS = "success"
STATUS_ERROR = "error"


class LLMCall(BaseModel):
    """Token usage, latency, estimated cost and outcome of one LLM call.

    Attributes:
        feature: Feature the call served (``chat`` or ``feedback``).
        provider: Provider id (``mistral`` or ``anthropic``).
        model: Model requested from the provider.
        session_id: Conversation session the call belongs to, if any. Stored without a
            foreign key so rows survive session deletion.
        input_tokens: Uncached input tokens.
        output_tokens: Output tokens.
        cache_read_tokens: Input tokens served from the provider's prompt cache.
        latency_ms: Wall-clock time of the provider call in milliseconds.
        estimated_cost_usd: Estimated cost from the price table; ``None`` when the model
            has no price entry.
        status: ``success`` or ``error``.
        error_message: Error description when ``status`` is ``error``.
    """

    __tablename__ = "llm_calls"

    feature = Column(String(20), nullable=False, index=True)
    provider = Column(String(20), nullable=False)
    model = Column(String(100), nullable=False, index=True)
    session_id = Column(Integer, nullable=True, index=True)
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    cache_read_tokens = Column(Integer, nullable=False, default=0)
    latency_ms = Column(Integer, nullable=False)
    estimated_cost_usd = Column(Float, nullable=True)
    status = Column(String(10), nullable=False)
    error_message = Column(Text, nullable=True)
