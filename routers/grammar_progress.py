"""FastAPI router for grammar progress tracking endpoints.

This module provides RESTful endpoints for tracking user progress through grammar lessons:
- GET /grammar/progress/ - List progress records with optional filtering
- POST /grammar/progress/ - Record a new progress entry

The router uses SQLAlchemy async ORM for database operations and Pydantic models
for request/response validation.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.lesson_progress import LessonProgress as LessonProgressModel
from schemas.lesson_progress import (
    LessonProgressCreate,
    LessonProgressListResponse,
    LessonProgressResponse,
)

router = APIRouter(prefix="/grammar/progress", tags=["grammar", "progress"])


@router.post("/", response_model=LessonProgressResponse, status_code=201)
async def create_progress(
    progress_data: LessonProgressCreate,
    db: AsyncSession = Depends(get_db),
) -> LessonProgressResponse:
    """Record a new lesson progress entry.
    
    Creates a new progress record for tracking user completion, scores, and time
    spent on grammar lessons. The lesson_id should match an existing grammar
    lesson JSON file (e.g., "articles", "conditional").
    
    Args:
        progress_data: LessonProgressCreate schema with lesson_id (required),
            user_id (optional), completed (default False), score (default 0, 0-100),
            and time_spent (default 0, >=0).
        db: Async database session.
    
    Returns:
        LessonProgressResponse: The created progress record with all fields
            including auto-generated timestamps.
    
    Raises:
        HTTPException 400: If validation fails (score not 0-100, time_spent < 0).
        HTTPException 404: Should not occur as lesson_id is not validated against
            file system (future enhancement).
    """
    # Create the new progress record
    new_progress = LessonProgressModel(
        user_id=progress_data.user_id,
        lesson_id=progress_data.lesson_id,
        completed=progress_data.completed,
        score=progress_data.score,
        last_accessed=datetime.utcnow(),
        time_spent=progress_data.time_spent,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(new_progress)
    await db.commit()
    await db.refresh(new_progress)
    
    # Return the created record
    return LessonProgressResponse(
        id=new_progress.id,
        user_id=new_progress.user_id,
        lesson_id=new_progress.lesson_id,
        completed=new_progress.completed,
        score=new_progress.score,
        last_accessed=new_progress.last_accessed,
        time_spent=new_progress.time_spent,
        created_at=new_progress.created_at,
        updated_at=new_progress.updated_at,
    )


@router.get("/", response_model=LessonProgressListResponse)
async def list_progress(
    lesson_id: Optional[str] = Query(None, description="Filter by lesson ID"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    db: AsyncSession = Depends(get_db),
) -> LessonProgressListResponse:
    """List lesson progress records with optional filtering.
    
    Returns all progress records matching the provided filters. All filters
    are optional and use AND logic (a record must match all provided filters).
    
    Args:
        lesson_id: Optional lesson ID filter (exact match).
        user_id: Optional user ID filter (exact match).
        completed: Optional completion status filter.
        db: Async database session.
    
    Returns:
        LessonProgressListResponse: List of progress records matching the filters.
    
    Raises:
        HTTPException: Not raised - returns empty list if no matches.
    """
    # Build filter conditions
    filters = []
    
    if lesson_id is not None:
        filters.append(LessonProgressModel.lesson_id == lesson_id)
    
    if user_id is not None:
        filters.append(LessonProgressModel.user_id == user_id)
    
    if completed is not None:
        filters.append(LessonProgressModel.completed == completed)
    
    # Build and execute query
    query = select(LessonProgressModel)
    if filters:
        query = query.where(*filters)
    
    query = query.order_by(LessonProgressModel.created_at.desc())
    
    result = await db.execute(query)
    progress_records = result.scalars().all()
    
    # Convert to response format
    response_records = [
        LessonProgressResponse(
            id=record.id,
            user_id=record.user_id,
            lesson_id=record.lesson_id,
            completed=record.completed,
            score=record.score,
            last_accessed=record.last_accessed,
            time_spent=record.time_spent,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )
        for record in progress_records
    ]
    
    return LessonProgressListResponse(progress_records=response_records)
