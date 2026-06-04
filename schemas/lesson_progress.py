from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class LessonProgressCreate(BaseModel):
    """Schema for creating a lesson progress record via POST /grammar/progress/.
    
    Attributes:
        lesson_id: Required. The ID of the grammar lesson (e.g., "articles", "conditional")
        user_id: Optional. User ID (nullable for Phase 1.5 - no authentication)
        completed: Optional. Whether the lesson is completed. Defaults to False.
        score: Optional. User's score (0-100). Defaults to 0.
        time_spent: Optional. Time spent in seconds. Defaults to 0.
    """
    
    lesson_id: str = Field(..., min_length=1, max_length=50, description="ID of the grammar lesson")
    user_id: Optional[int] = Field(None, description="User ID (nullable for Phase 1.5)")
    completed: bool = Field(False, description="Whether the lesson is completed")
    score: int = Field(0, ge=0, le=100, description="Score between 0 and 100")
    time_spent: int = Field(0, ge=0, description="Time spent in seconds")


class LessonProgressResponse(BaseModel):
    """Schema for lesson progress record in API responses.
    
    This schema includes all fields from the database model, including
    auto-generated timestamps.
    
    Attributes:
        id: Database primary key
        user_id: User ID (nullable for Phase 1.5)
        lesson_id: The ID of the grammar lesson
        completed: Whether the lesson is completed
        score: User's score (0-100)
        last_accessed: When the lesson was last accessed
        time_spent: Time spent in seconds
        created_at: When the progress record was created
        updated_at: When the progress record was last updated
    """
    
    id: int
    user_id: Optional[int]
    lesson_id: str
    completed: bool
    score: int
    last_accessed: datetime
    time_spent: int
    created_at: datetime
    updated_at: datetime


class LessonProgressListResponse(BaseModel):
    """Schema for the response from GET /grammar/progress/.
    
    Attributes:
        progress_records: List of LessonProgressResponse objects
    """
    
    progress_records: list[LessonProgressResponse]
