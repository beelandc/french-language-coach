from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class Message(BaseModel):
    role: str
    content: str


class SessionCreate(BaseModel):
    scenario_id: str


class SessionResponse(BaseModel):
    id: int
    scenario_id: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    messages: list[Message]
    feedback: Optional[dict[str, Any]] = None


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]


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
