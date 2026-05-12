from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.session import Session as SessionModel
from schemas.session import MessageRequest, MessageResponse
from scenarios import get_scenario
from services.mistral import mistral_client

router = APIRouter(prefix="/sessions/{session_id}/messages", tags=["messages"])


@router.post("/", response_model=MessageResponse)
async def send_message(
    session_id: int,
    message_request: MessageRequest,
    db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.ended_at:
        raise HTTPException(status_code=400, detail="Session has ended")

    # Get scenario with the session's difficulty level (default to intermediate for backward compatibility)
    difficulty = getattr(session, 'difficulty', None) or "intermediate"
    scenario = get_scenario(session.scenario_id, difficulty=difficulty)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    messages = session.messages_list
    user_message = {"role": "user", "content": message_request.content}
    messages.append(user_message)

    ai_response = mistral_client.get_chat_response(
        messages, scenario["system_prompt"]
    )

    ai_message = {"role": "assistant", "content": ai_response}
    messages.append(ai_message)

    session.messages_list = messages
    await db.commit()
    await db.refresh(session)

    return MessageResponse(
        role="assistant",
        content=ai_response,
        session_id=session.id,
    )
