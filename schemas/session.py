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
    is_locked: bool = False
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None


class SessionSummary(BaseModel):
    """Summary of a session for listing purposes (excludes full messages and feedback)."""
    id: int
    scenario_id: str
    scenario_name: str
    difficulty: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    overall_score: Optional[int] = None
    is_locked: bool = False
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None


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


class ExampleCorrection(BaseModel):
    """One corrected learner sentence in end-of-session feedback."""

    original: str
    corrected: str
    explanation: str


class FeedbackResponse(BaseModel):
    """End-of-session feedback, as produced by the feedback model.

    LLM output is validated against this model in strict mode before it is shown or
    stored (issue #229). Scores are integers from 0 to 100; extra keys are ignored.
    """

    grammar_score: int = Field(ge=0, le=100)
    vocabulary_score: int = Field(ge=0, le=100)
    fluency_score: int = Field(ge=0, le=100)
    overall_score: int = Field(ge=0, le=100)
    strengths: list[str]
    focus_area: str
    example_corrections: list[ExampleCorrection]
