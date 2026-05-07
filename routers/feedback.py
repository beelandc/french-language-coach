from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.session import Session as SessionModel
from schemas.session import FeedbackResponse
from services.mistral import mistral_client

router = APIRouter(prefix="/sessions/{session_id}/feedback", tags=["feedback"])


@router.post("/", response_model=FeedbackResponse)
async def generate_feedback(
    session_id: int,
    db: AsyncSession = Depends(get_db)
) -> FeedbackResponse:
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

    feedback = mistral_client.get_feedback(messages)

    session.ended_at = datetime.utcnow()
    session.feedback_dict = feedback
    await db.commit()
    await db.refresh(session)

    return FeedbackResponse(**feedback)
