"""Writes one ``llm_calls`` row per LLM call (issue #228)."""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from models.llm_call import LLMCall
from services.llm.base import LLMResult
from services.llm.pricing import estimate_cost_usd

logger = logging.getLogger(__name__)

MAX_ERROR_MESSAGE_LENGTH = 1000


async def record_call(
    db: AsyncSession,
    *,
    feature: str,
    provider: str,
    model: str,
    latency_ms: int,
    status: str,
    result: Optional[LLMResult] = None,
    session_id: Optional[int] = None,
    error_message: Optional[str] = None,
) -> Optional[LLMCall]:
    """Record one LLM call. Best-effort: never raises.

    The row is added to the caller's session and committed. Call sites invoke the LLM
    before changing anything else in that session, so the commit carries only this row.
    If writing fails, the error is logged, the session is rolled back and ``None`` is
    returned, so a metrics problem never breaks the user's request.
    """
    input_tokens = result.input_tokens if result else 0
    output_tokens = result.output_tokens if result else 0
    cache_read_tokens = result.cache_read_tokens if result else 0
    if error_message is not None:
        error_message = error_message[:MAX_ERROR_MESSAGE_LENGTH]

    try:
        row = LLMCall(
            feature=feature,
            provider=provider,
            model=model,
            session_id=session_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_read_tokens=cache_read_tokens,
            latency_ms=latency_ms,
            estimated_cost_usd=estimate_cost_usd(
                provider, model, input_tokens, output_tokens, cache_read_tokens
            ),
            status=status,
            error_message=error_message,
        )
        db.add(row)
        await db.commit()
        return row
    except Exception:
        logger.exception("Failed to record LLM call (%s/%s, %s)", provider, model, feature)
        try:
            await db.rollback()
        except Exception:
            logger.exception("Rollback after failed LLM call record also failed")
        return None
