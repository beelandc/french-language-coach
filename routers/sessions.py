from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.session import Session as SessionModel
from schemas.session import SessionCreate, SessionResponse
from scenarios import get_scenario

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=SessionResponse)
async def create_session(
    session_create: SessionCreate,
    db: AsyncSession = Depends(get_db)
) -> SessionResponse:
    scenario = get_scenario(session_create.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    new_session = SessionModel(
        scenario_id=session_create.scenario_id,
        created_at=datetime.utcnow(),
        messages="[]",
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    return SessionResponse(
        id=new_session.id,
        scenario_id=new_session.scenario_id,
        created_at=new_session.created_at,
        ended_at=new_session.ended_at,
        messages=[],
        feedback=None,
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db)
) -> SessionResponse:
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(
        id=session.id,
        scenario_id=session.scenario_id,
        created_at=session.created_at,
        ended_at=session.ended_at,
        messages=session.messages_list,
        feedback=session.feedback_dict,
    )
