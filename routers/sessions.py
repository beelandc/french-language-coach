from datetime import datetime, timedelta
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, Header
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.session import Session as SessionModel
from pydantic import BaseModel
from schemas.session import SessionCreate, SessionResponse, SessionListResponse, SessionSummary, PaginationInfo
from scenarios import get_scenario, VALID_DIFFICULTIES, SCENARIOS
from services.mistral import mistral_client

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

    # Get scenario with the validated difficulty level for system prompt
    scenario_with_difficulty = get_scenario(session_create.scenario_id, difficulty=difficulty)

    # Create the session model with empty messages initially
    new_session = SessionModel(
        scenario_id=session_create.scenario_id,
        difficulty=difficulty,
        created_at=datetime.utcnow(),
        messages="[]",
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    # Generate initial AI greeting message
    messages = []
    try:
        # Generate AI greeting using the scenario's system prompt with empty message history
        ai_greeting = mistral_client.get_chat_response(
            messages, scenario_with_difficulty["system_prompt"]
        )
        # Add AI greeting as the first message
        initial_message = {"role": "assistant", "content": ai_greeting}
        messages.append(initial_message)
    except Exception:
        # If AI greeting generation fails, continue without it
        # This ensures session creation doesn't break
        pass

    # Update session with greeting message
    if messages:
        new_session.messages_list = messages
        await db.commit()
        await db.refresh(new_session)

    return SessionResponse(
        id=new_session.id,
        scenario_id=new_session.scenario_id,
        difficulty=new_session.difficulty,
        created_at=new_session.created_at,
        ended_at=new_session.ended_at,
        messages=new_session.messages_list,
        feedback=None,
    )


@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    scenario_id: Optional[str] = Query(None, description="Filter by scenario ID"),
    date_from: Optional[datetime] = Query(None, description="Filter by start date (inclusive)"),
    date_to: Optional[datetime] = Query(None, description="Filter by end date (inclusive)"),
    min_score: Optional[int] = Query(None, description="Filter by minimum overall score (inclusive)"),
    db: AsyncSession = Depends(get_db)
) -> SessionListResponse:
    """
    List all sessions with pagination and optional filtering.
    
    Supports filtering by:
    - scenario_id: Return only sessions for a specific scenario
    - date_from: Return only sessions created on or after this date
    - date_to: Return only sessions created on or before this date
    - min_score: Return only sessions with overall_score >= this value
    
    All filters are optional and can be combined (AND logic).
    Sessions without feedback (null overall_score) are excluded when min_score filter is applied.
    
    Returns a paginated list of session summaries (without full message content).
    Use GET /sessions/{id} to retrieve full session details including messages.
    """
    # Validate date range
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=400,
            detail="date_from must be less than or equal to date_to"
        )
    
    # Build filter conditions for database-level filtering
    db_filters = []
    if scenario_id:
        db_filters.append(SessionModel.scenario_id == scenario_id)
    if date_from:
        db_filters.append(SessionModel.created_at >= date_from)
    if date_to:
        db_filters.append(SessionModel.created_at <= date_to)
    
    # Build base query with database-level filters
    base_query = select(SessionModel)
    if db_filters:
        base_query = base_query.where(*db_filters)
    
    # Query ALL matching sessions (without pagination yet) to apply Python-level filters
    result = await db.execute(
        base_query
        .order_by(SessionModel.created_at.desc())
    )
    all_sessions = result.scalars().all()
    
    # Apply min_score filter in Python (since overall_score is in JSON feedback field)
    if min_score is not None:
        filtered_sessions = []
        for session in all_sessions:
            overall_score = None
            if session.feedback:
                try:
                    feedback_dict = session.feedback_dict
                    if feedback_dict and isinstance(feedback_dict, dict):
                        overall_score = feedback_dict.get("overall_score")
                except Exception:
                    overall_score = None
            
            # Include session if it has a score >= min_score
            if overall_score is not None and overall_score >= min_score:
                filtered_sessions.append(session)
        all_sessions = filtered_sessions
    
    # Count total sessions after ALL filters applied
    total = len(all_sessions)
    
    # Calculate total pages
    total_pages = max(1, ceil(total / per_page)) if total > 0 else 0
    
    # Ensure page is within valid range
    if page > total_pages and total_pages > 0:
        raise HTTPException(status_code=404, detail=f"Page {page} does not exist. Maximum page is {total_pages}.")
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Apply pagination to filtered results
    paginated_sessions = all_sessions[offset:offset + per_page]
    
    # Build scenario lookup for efficiency
    scenario_lookup = {s["id"]: s["name"] for s in SCENARIOS}
    
    # Build session summaries
    session_summaries = []
    for session in paginated_sessions:
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
                overall_score=overall_score,
                is_locked=session.is_locked,
                locked_at=session.locked_at,
                locked_by=session.locked_by,
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
        is_locked=session.is_locked,
        locked_at=session.locked_at,
        locked_by=session.locked_by,
    )


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a session by ID.
    
    Returns 204 on success, 404 if session not found.
    Locked sessions cannot be deleted to prevent accidental deletion of active sessions.
    """
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if session is locked (prevents deletion of sessions in use)
    if session.is_locked:
        raise HTTPException(status_code=400, detail="Cannot delete locked session")
    
    await db.delete(session)
    await db.commit()
    return Response(status_code=204)


# Lock TTL constant (minutes) - locks automatically expire after this duration
LOCK_TTL_MINUTES = 10


class SessionLockResponse(BaseModel):
    """Response for lock/unlock endpoints."""
    id: int
    is_locked: bool
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None


@router.post("/{session_id}/lock", response_model=SessionLockResponse)
async def lock_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    x_client_id: Optional[str] = Header(None, description="Optional client identifier for lock ownership")
) -> SessionLockResponse:
    """
    Lock a session to prevent concurrent access.
    
    This endpoint acquires a lock on a session, preventing it from being deleted
    while in use. Locks automatically expire after LOCK_TTL_MINUTES (10 minutes).
    
    If the session is already locked but the lock has expired (older than TTL),
    the lock will be refreshed for the new client.
    
    Args:
        session_id: The ID of the session to lock
        x_client_id: Optional client identifier (defaults to generated UUID if not provided)
        
    Returns:
        SessionLockResponse with lock status and details
        
    Raises:
        HTTPException 404: If session not found
    """
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Generate client ID if not provided
    client_id = x_client_id or f"client_{session_id}_{datetime.utcnow().isoformat()}"
    
    # Check if we can lock this session (not already locked or lock expired)
    if session.can_be_locked():
        # Set lock fields
        session.is_locked = True
        session.locked_at = datetime.utcnow()
        session.locked_by = client_id
        await db.commit()
        await db.refresh(session)
    
    # Return current lock status
    return SessionLockResponse(
        id=session.id,
        is_locked=session.is_locked,
        locked_at=session.locked_at,
        locked_by=session.locked_by
    )


@router.post("/{session_id}/unlock", response_model=SessionLockResponse)
async def unlock_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    x_client_id: Optional[str] = Header(None, description="Optional client identifier for lock ownership verification")
) -> SessionLockResponse:
    """
    Unlock a session to allow deletion.
    
    This endpoint releases a lock on a session, allowing it to be deleted.
    For safety, only the client that acquired the lock can release it,
    unless the lock has expired.
    
    Args:
        session_id: The ID of the session to unlock
        x_client_id: Optional client identifier for verification
        
    Returns:
        SessionLockResponse with lock status and details
        
    Raises:
        HTTPException 404: If session not found
        HTTPException 403: If trying to unlock a session locked by another client (and lock not expired)
    """
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # If lock has expired, allow unlock regardless of client
    if session.is_lock_expired():
        # Clear the lock
        session.is_locked = False
        session.locked_at = None
        session.locked_by = None
        await db.commit()
        await db.refresh(session)
        return SessionLockResponse(
            id=session.id,
            is_locked=session.is_locked,
            locked_at=session.locked_at,
            locked_by=session.locked_by
        )
    
    # If session is locked and client_id is provided, verify ownership
    if session.is_locked and session.locked_by and x_client_id:
        if session.locked_by != x_client_id:
            raise HTTPException(
                status_code=403,
                detail=f"Cannot unlock session locked by another client: {session.locked_by}"
            )
    
    # Clear the lock
    session.is_locked = False
    session.locked_at = None
    session.locked_by = None
    await db.commit()
    await db.refresh(session)
    
    return SessionLockResponse(
        id=session.id,
        is_locked=session.is_locked,
        locked_at=session.locked_at,
        locked_by=session.locked_by
    )
