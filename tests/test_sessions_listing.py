"""
Tests for session listing endpoint schemas (Issue #6: 1.5.2: Add session listing endpoint with pagination).

Schema tests verify the data structures for the session listing endpoint.
Integration tests for the actual endpoint are tracked in Issue #7.

Acceptance Criteria:
- Endpoint: GET /sessions/ returns all user sessions
- Supports pagination via page and per_page query parameters
- Response includes: id, scenario_id, scenario_name, created_at, ended_at, difficulty, overall_score
- Default pagination: page=1, per_page=10
- Returns empty list when no sessions exist
- Response includes pagination metadata: total, page, per_page, total_pages
- overall_score is null if feedback not yet generated
"""
from datetime import datetime, timedelta

import pytest

from schemas.session import SessionSummary, PaginationInfo, SessionListResponse


class TestSessionSummarySchema:
    """Test the SessionSummary schema."""

    def test_session_summary_fields(self):
        """Verify SessionSummary has all required fields."""
        summary = SessionSummary(
            id=1,
            scenario_id="cafe_order",
            scenario_name="Ordering at a Café",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=datetime.utcnow() - timedelta(minutes=30),
            overall_score=85
        )
        
        assert summary.id == 1
        assert summary.scenario_id == "cafe_order"
        assert summary.scenario_name == "Ordering at a Café"
        assert summary.difficulty == "intermediate"
        assert summary.created_at is not None
        assert summary.ended_at is not None
        assert summary.overall_score == 85

    def test_session_summary_optional_fields(self):
        """Verify SessionSummary optional fields can be None."""
        summary = SessionSummary(
            id=1,
            scenario_id="cafe_order",
            scenario_name="Ordering at a Café",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            overall_score=None
        )
        
        assert summary.ended_at is None
        assert summary.overall_score is None


class TestPaginationInfoSchema:
    """Test the PaginationInfo schema."""

    def test_pagination_info_fields(self):
        """Verify PaginationInfo has all required fields."""
        pagination = PaginationInfo(
            total=25,
            page=1,
            per_page=10,
            total_pages=3
        )
        
        assert pagination.total == 25
        assert pagination.page == 1
        assert pagination.per_page == 10
        assert pagination.total_pages == 3

    def test_pagination_info_zero_sessions(self):
        """Verify PaginationInfo handles zero sessions."""
        pagination = PaginationInfo(
            total=0,
            page=1,
            per_page=10,
            total_pages=0
        )
        
        assert pagination.total == 0
        assert pagination.total_pages == 0


class TestSessionListResponseSchema:
    """Test the SessionListResponse schema."""

    def test_session_list_response_structure(self):
        """Verify SessionListResponse has correct structure."""
        response = SessionListResponse(
            sessions=[
                SessionSummary(
                    id=1,
                    scenario_id="cafe_order",
                    scenario_name="Ordering at a Café",
                    difficulty="intermediate",
                    created_at=datetime.utcnow(),
                    ended_at=None,
                    overall_score=None
                )
            ],
            pagination=PaginationInfo(
                total=1,
                page=1,
                per_page=10,
                total_pages=1
            )
        )
        
        assert len(response.sessions) == 1
        assert response.pagination.total == 1
        assert response.pagination.page == 1
        assert response.pagination.per_page == 10
        assert response.pagination.total_pages == 1

    def test_session_list_response_empty(self):
        """Verify SessionListResponse handles empty sessions list."""
        response = SessionListResponse(
            sessions=[],
            pagination=PaginationInfo(
                total=0,
                page=1,
                per_page=10,
                total_pages=0
            )
        )
        
        assert response.sessions == []
        assert response.pagination.total == 0
        assert response.pagination.total_pages == 0

    def test_session_list_response_multiple_sessions(self):
        """Verify SessionListResponse handles multiple sessions."""
        sessions = [
            SessionSummary(
                id=i,
                scenario_id="cafe_order",
                scenario_name="Ordering at a Café",
                difficulty="intermediate",
                created_at=datetime.utcnow(),
                ended_at=None,
                overall_score=None
            )
            for i in range(5)
        ]
        
        response = SessionListResponse(
            sessions=sessions,
            pagination=PaginationInfo(
                total=5,
                page=1,
                per_page=10,
                total_pages=1
            )
        )
        
        assert len(response.sessions) == 5
        assert all(s.id in [0, 1, 2, 3, 4] for s in response.sessions)
