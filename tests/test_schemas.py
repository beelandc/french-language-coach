"""
Tests for Pydantic schemas with difficulty field (Issue #4).

Acceptance Criteria from Issue #4:
- API accepts optional difficulty parameter when creating a session
- If no difficulty specified, uses intermediate (default)
"""
import pytest

from schemas.session import SessionCreate, SessionResponse
from datetime import datetime


class TestSessionCreateSchema:
    """Test SessionCreate schema with difficulty field."""

    def test_session_create_with_default_difficulty(self):
        """Test SessionCreate with default difficulty (intermediate)."""
        session_data = {"scenario_id": "cafe_order"}
        session = SessionCreate(**session_data)
        
        assert session.scenario_id == "cafe_order"
        assert session.difficulty == "intermediate"

    def test_session_create_with_explicit_difficulty(self):
        """Test SessionCreate with explicit difficulty."""
        for difficulty in ["beginner", "intermediate", "advanced"]:
            session_data = {
                "scenario_id": "cafe_order",
                "difficulty": difficulty
            }
            session = SessionCreate(**session_data)
            
            assert session.scenario_id == "cafe_order"
            assert session.difficulty == difficulty

    def test_session_create_with_none_difficulty(self):
        """Test SessionCreate with None difficulty - stays None (router handles default)."""
        session_data = {"scenario_id": "cafe_order", "difficulty": None}
        session = SessionCreate(**session_data)
        
        # Note: When explicitly set to None, it stays None. The router handles the default.
        assert session.difficulty is None


class TestSessionResponseSchema:
    """Test SessionResponse schema with difficulty field."""

    def test_session_response_with_difficulty(self):
        """Test SessionResponse includes difficulty field."""
        response_data = {
            "id": 1,
            "scenario_id": "cafe_order",
            "difficulty": "beginner",
            "created_at": datetime.utcnow(),
            "ended_at": None,
            "messages": [],
            "feedback": None
        }
        response = SessionResponse(**response_data)
        
        assert response.id == 1
        assert response.scenario_id == "cafe_order"
        assert response.difficulty == "beginner"
        assert response.created_at is not None
