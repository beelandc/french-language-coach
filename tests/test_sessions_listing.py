"""
Tests for session listing endpoint schemas and integration (Issue #6, Issue #7, and Issue #10).

Schema tests verify the data structures for the session listing endpoint.
Integration tests verify the actual endpoint behavior including pagination, filtering, and schema.

Issue #6 Acceptance Criteria:
- Endpoint: GET /sessions/ returns all user sessions
- Supports pagination via page and per_page query parameters
- Response includes: id, scenario_id, scenario_name, created_at, ended_at, difficulty, overall_score
- Default pagination: page=1, per_page=10
- Returns empty list when no sessions exist
- Response includes pagination metadata: total, page, per_page, total_pages
- overall_score is null if feedback not yet generated

Issue #7 Acceptance Criteria:
- Tests for pagination (page, per_page)
- Tests for filtering by scenario_id
- Tests for filtering by date range
- Tests verify response schema
- 80% coverage for listing logic

Issue #10 Acceptance Criteria:
- Filter by scenario_id
- Filter by date range
- Filter by minimum overall_score
- Filters can be combined
"""
from datetime import datetime, timedelta, date

import pytest

from models.session import Session as SessionModel
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


# ============================================================================
# Integration Tests for Issue #7: Test session listing endpoint
# ============================================================================


@pytest.mark.asyncio
class TestListSessionsEndpoint:
    """Integration tests for GET /sessions/ endpoint with pagination and filtering."""

    # -------------------------------------------------------------------------
    # Pagination Tests (AC-7.1)
    # -------------------------------------------------------------------------

    async def test_pagination_page_1_default(self, client, test_db):
        """Test default pagination returns first page with 10 items."""
        # Create 25 sessions
        for i in range(25):
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, i % 30 + 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 10  # Default per_page=10
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["per_page"] == 10
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["total_pages"] == 3

    async def test_pagination_custom_page_and_per_page(self, client, test_db):
        """Test custom pagination parameters."""
        # Create 25 sessions
        for i in range(25):
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, i % 30 + 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        # Page 2 with 5 per page should return sessions 6-10
        response = client.get("/sessions/?page=2&per_page=5")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 5
        assert data["pagination"]["page"] == 2
        assert data["pagination"]["per_page"] == 5
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["total_pages"] == 5

    async def test_pagination_invalid_page(self, client, test_db):
        """Test requesting page beyond total pages returns 404."""
        # Create 10 sessions (1 page with default per_page=10)
        for i in range(10):
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, i + 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/?page=2&per_page=10")
        assert response.status_code == 404
        assert "Page 2 does not exist" in response.json()["detail"]

    async def test_pagination_empty_database(self, client):
        """Test pagination with empty database returns empty results."""
        response = client.get("/sessions/")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sessions"] == []
        assert data["pagination"]["total"] == 0
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["per_page"] == 10
        assert data["pagination"]["total_pages"] == 0

    async def test_pagination_edge_cases(self, client, test_db):
        """Test pagination edge cases (per_page=1, per_page=100)."""
        # Create 5 sessions
        for i in range(5):
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, i + 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        # per_page=1
        response = client.get("/sessions/?per_page=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["sessions"]) == 1
        assert data["pagination"]["total_pages"] == 5
        
        # per_page=100 (max allowed)
        response = client.get("/sessions/?per_page=100")
        assert response.status_code == 200
        data = response.json()
        assert len(data["sessions"]) == 5
        assert data["pagination"]["total_pages"] == 1

    # -------------------------------------------------------------------------
    # Filtering by scenario_id Tests (AC-7.2)
    # -------------------------------------------------------------------------

    async def test_filter_by_scenario_id(self, client, test_db):
        """Test filtering by scenario_id returns only matching sessions."""
        # Create sessions with different scenario_ids
        scenarios = ["cafe_order", "hotel_checkin", "cafe_order", "hotel_checkin", "cafe_order"]
        for scenario in scenarios:
            session = SessionModel(
                scenario_id=scenario,
                difficulty="intermediate",
                created_at=datetime(2024, 1, 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/?scenario_id=cafe_order")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 3
        assert all(s["scenario_id"] == "cafe_order" for s in data["sessions"])
        assert data["pagination"]["total"] == 3

    async def test_filter_by_scenario_id_no_match(self, client, test_db):
        """Test filtering by non-existent scenario_id returns empty results."""
        # Create sessions
        for scenario in ["cafe_order", "hotel_checkin"]:
            session = SessionModel(
                scenario_id=scenario,
                difficulty="intermediate",
                created_at=datetime(2024, 1, 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/?scenario_id=nonexistent")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sessions"] == []
        assert data["pagination"]["total"] == 0

    # -------------------------------------------------------------------------
    # Filtering by date range Tests (AC-7.3)
    # -------------------------------------------------------------------------

    async def test_filter_by_date_from_only(self, client, test_db):
        """Test filtering by date_from returns sessions on or after that date."""
        dates = [
            datetime(2024, 1, 1, 10, 0, 0),
            datetime(2024, 1, 15, 10, 0, 0),
            datetime(2024, 2, 1, 10, 0, 0),
        ]
        for dt in dates:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=dt
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/?date_from=2024-01-15T10:00:00")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 2
        assert data["pagination"]["total"] == 2

    async def test_filter_by_date_to_only(self, client, test_db):
        """Test filtering by date_to returns sessions on or before that date."""
        dates = [
            datetime(2024, 1, 1, 10, 0, 0),
            datetime(2024, 1, 15, 10, 0, 0),
            datetime(2024, 2, 1, 10, 0, 0),
        ]
        for dt in dates:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=dt
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/?date_to=2024-01-15T10:00:00")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 2
        assert data["pagination"]["total"] == 2

    async def test_filter_by_date_range(self, client, test_db):
        """Test filtering by date range returns sessions within the range."""
        dates = [
            datetime(2024, 1, 1, 10, 0, 0),   # In range
            datetime(2024, 1, 15, 10, 0, 0),  # In range
            datetime(2024, 2, 1, 10, 0, 0),   # Out of range
        ]
        for dt in dates:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=dt
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/?date_from=2024-01-01T10:00:00&date_to=2024-01-31T10:00:00")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 2
        assert data["pagination"]["total"] == 2

    async def test_filter_by_invalid_date_range(self, client, test_db):
        """Test filtering with date_from > date_to returns 400 error."""
        response = client.get("/sessions/?date_from=2024-02-01T10:00:00&date_to=2024-01-01T10:00:00")
        assert response.status_code == 400
        assert "date_from must be less than or equal to date_to" in response.json()["detail"]

    # -------------------------------------------------------------------------
    # Combined Filtering Tests
    # -------------------------------------------------------------------------

    async def test_filter_combined_scenario_and_date(self, client, test_db):
        """Test filtering by both scenario_id and date range (AND logic)."""
        # Create sessions with different scenarios and dates
        sessions_data = [
            ("cafe_order", datetime(2024, 1, 1, 10, 0, 0)),   # Match both
            ("cafe_order", datetime(2024, 2, 1, 10, 0, 0)),   # Match scenario, wrong date
            ("hotel_checkin", datetime(2024, 1, 15, 10, 0, 0)), # Match date, wrong scenario
        ]
        for scenario, dt in sessions_data:
            session = SessionModel(
                scenario_id=scenario,
                difficulty="intermediate",
                created_at=dt
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by cafe_order and January 2024
        response = client.get("/sessions/?scenario_id=cafe_order&date_from=2024-01-01&date_to=2024-01-31")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 1
        assert data["sessions"][0]["scenario_id"] == "cafe_order"
        assert data["pagination"]["total"] == 1

    async def test_filter_combined_with_pagination(self, client, test_db):
        """Test filtering combined with pagination."""
        # Create 15 cafe_order sessions in January
        for i in range(15):
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, i % 28 + 1, 10, 0, 0)
            )
            test_db.add(session)
        
        # Add 10 hotel_checkin sessions (should be filtered out)
        for i in range(10):
            session = SessionModel(
                scenario_id="hotel_checkin",
                difficulty="intermediate",
                created_at=datetime(2024, 1, i % 28 + 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by cafe_order with pagination
        response = client.get("/sessions/?scenario_id=cafe_order&page=2&per_page=5")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 5
        assert all(s["scenario_id"] == "cafe_order" for s in data["sessions"])
        assert data["pagination"]["page"] == 2
        assert data["pagination"]["per_page"] == 5
        assert data["pagination"]["total"] == 15
        assert data["pagination"]["total_pages"] == 3

    # -------------------------------------------------------------------------
    # Response Schema Validation Tests (AC-7.4)
    # -------------------------------------------------------------------------

    async def test_response_schema_validation(self, client, test_db):
        """Test that response matches SessionListResponse schema."""
        # Create a few sessions
        for i in range(3):
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, i + 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/")
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert "sessions" in data
        assert "pagination" in data
        assert isinstance(data["sessions"], list)
        
        # Verify pagination structure
        pagination = data["pagination"]
        assert "total" in pagination
        assert "page" in pagination
        assert "per_page" in pagination
        assert "total_pages" in pagination
        
        # Verify session summary structure
        for session in data["sessions"]:
            assert "id" in session
            assert "scenario_id" in session
            assert "scenario_name" in session
            assert "difficulty" in session
            assert "created_at" in session
            assert "ended_at" in session
            assert "overall_score" in session

    async def test_response_session_fields_types(self, client, test_db):
        """Test that response field types are correct."""
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime(2024, 1, 1, 10, 0, 0)
        )
        test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["sessions"]) == 1
        
        session_data = data["sessions"][0]
        assert isinstance(session_data["id"], int)
        assert isinstance(session_data["scenario_id"], str)
        assert isinstance(session_data["scenario_name"], str)
        assert isinstance(session_data["difficulty"], str)
        assert isinstance(session_data["created_at"], str)  # ISO format string
        # ended_at and overall_score can be null
        assert session_data["ended_at"] is None or isinstance(session_data["ended_at"], str)
        assert session_data["overall_score"] is None or isinstance(session_data["overall_score"], int)

    async def test_response_scenario_name_lookup(self, client, test_db):
        """Test that scenario_name is correctly looked up from scenario_id."""
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime(2024, 1, 1, 10, 0, 0)
        )
        test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["sessions"][0]["scenario_id"] == "cafe_order"
        assert data["sessions"][0]["scenario_name"] == "Ordering at a Café"

    # -------------------------------------------------------------------------
    # Sorting Tests
    # -------------------------------------------------------------------------

    async def test_sessions_sorted_by_created_at_descending(self, client, test_db):
        """Test that sessions are sorted by created_at descending (newest first)."""
        dates = [
            datetime(2024, 1, 1, 10, 0, 0),
            datetime(2024, 1, 3, 10, 0, 0),
            datetime(2024, 1, 2, 10, 0, 0),
        ]
        for dt in dates:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=dt
            )
            test_db.add(session)
        await test_db.commit()
        
        response = client.get("/sessions/")
        assert response.status_code == 200
        
        data = response.json()
        # Should be sorted newest first: Jan 3, Jan 2, Jan 1
        # Check that the dates are in descending order
        assert len(data["sessions"]) == 3
        # Newest date first (Jan 3)
        assert "2024-01-03" in data["sessions"][0]["created_at"]
        # Then Jan 2
        assert "2024-01-02" in data["sessions"][1]["created_at"]
        # Then Jan 1
        assert "2024-01-01" in data["sessions"][2]["created_at"]

    # -------------------------------------------------------------------------
    # Filtering by min_score Tests (Issue #10 - AC3)
    # -------------------------------------------------------------------------

    async def test_filter_by_min_score_only(self, client, test_db):
        """Test filtering by min_score returns only sessions with score >= value."""
        import json
        
        # Create sessions with different scores via feedback
        scores = [75, 85, 65, 90, 70]
        for score in scores:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, 1, 10, 0, 0),
                feedback=json.dumps({"overall_score": score, "grammar_score": score, 
                                   "vocabulary_score": score, "fluency_score": score,
                                   "strengths": [], "focus_area": "test", "example_corrections": []})
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by min_score=80 should return sessions with scores 85 and 90
        response = client.get("/sessions/?min_score=80")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 2
        assert all(s["overall_score"] >= 80 for s in data["sessions"])
        assert data["pagination"]["total"] == 2

    async def test_filter_by_min_score_no_feedback(self, client, test_db):
        """Test filtering by min_score excludes sessions without feedback."""
        import json
        
        # Create sessions: some with feedback, some without
        # Session 1: has score 85
        session1 = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime(2024, 1, 1, 10, 0, 0),
            feedback=json.dumps({"overall_score": 85, "grammar_score": 85,
                               "vocabulary_score": 85, "fluency_score": 85,
                               "strengths": [], "focus_area": "test", "example_corrections": []})
        )
        test_db.add(session1)
        
        # Session 2: no feedback
        session2 = SessionModel(
            scenario_id="hotel_checkin",
            difficulty="intermediate",
            created_at=datetime(2024, 1, 1, 10, 0, 0)
        )
        test_db.add(session2)
        
        await test_db.commit()
        
        # Filter by min_score=80 should return only session1
        response = client.get("/sessions/?min_score=80")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 1
        assert data["sessions"][0]["overall_score"] == 85
        assert data["pagination"]["total"] == 1

    async def test_filter_by_min_score_no_matches(self, client, test_db):
        """Test filtering by min_score with no matches returns empty list."""
        import json
        
        # Create sessions with scores all below 90
        scores = [75, 80, 85]
        for score in scores:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, 1, 10, 0, 0),
                feedback=json.dumps({"overall_score": score, "grammar_score": score,
                                   "vocabulary_score": score, "fluency_score": score,
                                   "strengths": [], "focus_area": "test", "example_corrections": []})
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by min_score=90 should return no sessions
        response = client.get("/sessions/?min_score=90")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sessions"] == []
        assert data["pagination"]["total"] == 0

    async def test_filter_by_min_score_all_sessions_no_feedback(self, client, test_db):
        """Test filtering by min_score when all sessions have no feedback returns empty."""
        # Create sessions without feedback
        for i in range(5):
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, i + 1, 10, 0, 0)
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by any min_score should return empty
        response = client.get("/sessions/?min_score=50")
        assert response.status_code == 200
        data = response.json()
        
        assert data["sessions"] == []
        assert data["pagination"]["total"] == 0

    # -------------------------------------------------------------------------
    # Combined Filtering with min_score Tests (Issue #10 - AC4)
    # -------------------------------------------------------------------------

    async def test_filter_combined_scenario_and_min_score(self, client, test_db):
        """Test filtering by both scenario_id and min_score (AND logic)."""
        import json
        
        # Create sessions with different scenarios and scores
        sessions_data = [
            ("cafe_order", 85, datetime(2024, 1, 1, 10, 0, 0)),   # Match both
            ("cafe_order", 75, datetime(2024, 1, 2, 10, 0, 0)),   # Match scenario, low score
            ("hotel_checkin", 90, datetime(2024, 1, 3, 10, 0, 0)),  # Match score, wrong scenario
        ]
        for scenario, score, dt in sessions_data:
            session = SessionModel(
                scenario_id=scenario,
                difficulty="intermediate",
                created_at=dt,
                feedback=json.dumps({"overall_score": score, "grammar_score": score,
                                   "vocabulary_score": score, "fluency_score": score,
                                   "strengths": [], "focus_area": "test", "example_corrections": []})
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by cafe_order and min_score=80
        response = client.get("/sessions/?scenario_id=cafe_order&min_score=80")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 1
        assert data["sessions"][0]["scenario_id"] == "cafe_order"
        assert data["sessions"][0]["overall_score"] == 85
        assert data["pagination"]["total"] == 1

    async def test_filter_combined_date_and_min_score(self, client, test_db):
        """Test filtering by date range and min_score (AND logic)."""
        import json
        
        # Create sessions with different dates and scores
        sessions_data = [
            (datetime(2024, 1, 1, 10, 0, 0), 85),   # Match both
            (datetime(2024, 1, 2, 10, 0, 0), 75),   # Match date, low score
            (datetime(2024, 2, 1, 10, 0, 0), 90),   # Match score, wrong date
        ]
        for dt, score in sessions_data:
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=dt,
                feedback=json.dumps({"overall_score": score, "grammar_score": score,
                                   "vocabulary_score": score, "fluency_score": score,
                                   "strengths": [], "focus_area": "test", "example_corrections": []})
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by January and min_score=80
        response = client.get("/sessions/?date_from=2024-01-01&date_to=2024-01-31&min_score=80")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 1
        assert data["sessions"][0]["overall_score"] == 85
        assert data["pagination"]["total"] == 1

    async def test_filter_combined_all_filters(self, client, test_db):
        """Test filtering by scenario_id, date range, and min_score (AND logic)."""
        import json
        
        # Create sessions with various attributes
        sessions_data = [
            ("cafe_order", datetime(2024, 1, 15, 10, 0, 0), 85),   # Match all
            ("cafe_order", datetime(2024, 1, 15, 10, 0, 0), 75),   # Match scenario+date, low score
            ("cafe_order", datetime(2024, 2, 1, 10, 0, 0), 90),    # Match scenario+score, wrong date
            ("hotel_checkin", datetime(2024, 1, 15, 10, 0, 0), 90), # Match date+score, wrong scenario
        ]
        for scenario, dt, score in sessions_data:
            session = SessionModel(
                scenario_id=scenario,
                difficulty="intermediate",
                created_at=dt,
                feedback=json.dumps({"overall_score": score, "grammar_score": score,
                                   "vocabulary_score": score, "fluency_score": score,
                                   "strengths": [], "focus_area": "test", "example_corrections": []})
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by cafe_order, January, and min_score=80
        response = client.get("/sessions/?scenario_id=cafe_order&date_from=2024-01-01&date_to=2024-01-31&min_score=80")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 1
        assert data["sessions"][0]["scenario_id"] == "cafe_order"
        assert data["sessions"][0]["overall_score"] == 85
        assert data["pagination"]["total"] == 1

    async def test_filter_combined_with_pagination_and_min_score(self, client, test_db):
        """Test filtering by min_score combined with pagination."""
        import json
        
        # Create 15 sessions with scores
        for i in range(15):
            score = 60 + i  # Scores from 60 to 74
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, 1, 10, 0, 0),
                feedback=json.dumps({"overall_score": score, "grammar_score": score,
                                   "vocabulary_score": score, "fluency_score": score,
                                   "strengths": [], "focus_area": "test", "example_corrections": []})
            )
            test_db.add(session)
        
        # Add 5 sessions with score >= 75
        for i in range(5):
            score = 75 + i  # Scores from 75 to 79
            session = SessionModel(
                scenario_id="cafe_order",
                difficulty="intermediate",
                created_at=datetime(2024, 1, 2, 10, 0, 0),
                feedback=json.dumps({"overall_score": score, "grammar_score": score,
                                   "vocabulary_score": score, "fluency_score": score,
                                   "strengths": [], "focus_area": "test", "example_corrections": []})
            )
            test_db.add(session)
        await test_db.commit()
        
        # Filter by min_score=75 with pagination (5 results, page 1 with per_page=3)
        response = client.get("/sessions/?min_score=75&page=1&per_page=3")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["sessions"]) == 3
        assert all(s["overall_score"] >= 75 for s in data["sessions"])
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["per_page"] == 3
        assert data["pagination"]["total"] == 5
        assert data["pagination"]["total_pages"] == 2
