from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class SessionCreate(BaseModel):
    scenario_id: str
    difficulty: Optional[str] = Field(
        default="intermediate",
        description="Difficulty level for the scenario: beginner, intermediate, or advanced"
    )


class SessionResponse(BaseModel):
    id: int
    scenario_id: str
    difficulty: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    messages: list[Message]
    feedback: Optional[dict[str, Any]] = None


class SessionSummary(BaseModel):
    """Summary of a session for listing purposes (excludes full messages and feedback)."""
    id: int
    scenario_id: str
    scenario_name: str
    difficulty: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    overall_score: Optional[int] = None


class PaginationInfo(BaseModel):
    """Pagination metadata for list endpoints."""
    total: int
    page: int
    per_page: int
    total_pages: int


class SessionListResponse(BaseModel):
    """Response for GET /sessions/ endpoint with pagination."""
    sessions: list[SessionSummary]
    pagination: PaginationInfo


class MessageRequest(BaseModel):
    content: str


class MessageResponse(BaseModel):
    role: str
    content: str
    session_id: int


class FeedbackResponse(BaseModel):
    grammar_score: int
    vocabulary_score: int
    fluency_score: int
    overall_score: int
    strengths: list[str]
    focus_area: str
    example_corrections: list[dict[str, str]]
