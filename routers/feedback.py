from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.session import Session as SessionModel
from schemas.session import FeedbackResponse
from services.llm import FeedbackValidationError, LLMProviderError, llm_service

router = APIRouter(prefix="/sessions/{session_id}/feedback", tags=["feedback"])

# 502 messages shown to the user when feedback can't be generated (issue #229).
FEEDBACK_INVALID_DETAIL = (
    "Feedback could not be generated: the AI returned invalid feedback twice. "
    "Your session is still open — please try again."
)
FEEDBACK_UNUSABLE_DETAIL = (
    "Feedback could not be generated: the AI service returned an unusable response. "
    "Your session is still open — please try again."
)


@router.post("/", response_model=FeedbackResponse)
async def generate_feedback(
    session_id: int,
    db: AsyncSession = Depends(get_db)
) -> FeedbackResponse:
    """Generate, store and return end-of-session feedback, ending the session.

    Returns 502 when the model's output fails validation after one retry, or when the
    provider returns an unusable response (refusal, no text). The session is only
    changed after valid feedback is obtained, so a failed request leaves it open.
    """
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.ended_at:
        raise HTTPException(status_code=400, detail="Session already has feedback")

    messages = session.messages_list
    if len(messages) < 2:
        raise HTTPException(
            status_code=400,
            detail="Not enough messages for feedback. Have at least one exchange."
        )

    try:
        feedback = await llm_service.get_feedback(messages, db=db, session_id=session.id)
    except FeedbackValidationError:
        raise HTTPException(status_code=502, detail=FEEDBACK_INVALID_DETAIL)
    except LLMProviderError:
        raise HTTPException(status_code=502, detail=FEEDBACK_UNUSABLE_DETAIL)

    session.ended_at = datetime.utcnow()
    session.feedback_dict = feedback
    await db.commit()
    await db.refresh(session)

    return FeedbackResponse(**feedback)
