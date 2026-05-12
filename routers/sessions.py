from datetime import datetime
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.session import Session as SessionModel
from schemas.session import SessionCreate, SessionResponse, SessionListResponse, SessionSummary, PaginationInfo
from scenarios import get_scenario, VALID_DIFFICULTIES, SCENARIOS

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("/", response_model=SessionResponse)
async def create_session(
    session_create: SessionCreate,
    db: AsyncSession = Depends(get_db)
) -> SessionResponse:
    # Validate scenario exists
    scenario = get_scenario(session_create.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Validate difficulty if provided
    difficulty = session_create.difficulty or "intermediate"
    if difficulty not in VALID_DIFFICULTIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid difficulty '{difficulty}'. Must be one of: {', '.join(VALID_DIFFICULTIES)}"
        )

    new_session = SessionModel(
        scenario_id=session_create.scenario_id,
        difficulty=difficulty,
        created_at=datetime.utcnow(),
        messages="[]",
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    return SessionResponse(
        id=new_session.id,
        scenario_id=new_session.scenario_id,
        difficulty=new_session.difficulty,
        created_at=new_session.created_at,
        ended_at=new_session.ended_at,
        messages=[],
        feedback=None,
    )


@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    db: AsyncSession = Depends(get_db)
) -> SessionListResponse:
    """
    List all sessions with pagination.
    
    Returns a paginated list of session summaries (without full message content).
    Use GET /sessions/{id} to retrieve full session details including messages.
    """
    # Count total sessions
    total_result = await db.execute(select(func.count()).select_from(SessionModel))
    total: int = total_result.scalar()
    
    # Calculate total pages
    total_pages = max(1, ceil(total / per_page)) if total > 0 else 0
    
    # Ensure page is within valid range
    if page > total_pages and total_pages > 0:
        raise HTTPException(status_code=404, detail=f"Page {page} does not exist. Maximum page is {total_pages}.")
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Query sessions with pagination
    result = await db.execute(
        select(SessionModel)
        .order_by(SessionModel.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    sessions = result.scalars().all()
    
    # Build scenario lookup for efficiency
    scenario_lookup = {s["id"]: s["name"] for s in SCENARIOS}
    
    # Build session summaries
    session_summaries = []
    for session in sessions:
        # Get scenario name
        scenario_name = scenario_lookup.get(session.scenario_id, session.scenario_id)
        
        # Extract overall_score from feedback if available
        overall_score = None
        if session.feedback:
            try:
                feedback_dict = session.feedback_dict
                if feedback_dict and isinstance(feedback_dict, dict):
                    overall_score = feedback_dict.get("overall_score")
            except Exception:
                overall_score = None
        
        session_summaries.append(
            SessionSummary(
                id=session.id,
                scenario_id=session.scenario_id,
                scenario_name=scenario_name,
                difficulty=getattr(session, 'difficulty', None) or "intermediate",
                created_at=session.created_at,
                ended_at=session.ended_at,
                overall_score=overall_score
            )
        )
    
    return SessionListResponse(
        sessions=session_summaries,
        pagination=PaginationInfo(
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
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
        difficulty=getattr(session, 'difficulty', None) or "intermediate",
        created_at=session.created_at,
        ended_at=session.ended_at,
        messages=session.messages_list,
        feedback=session.feedback_dict,
    )
