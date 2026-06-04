"""
Tests for lesson progress model and tracking endpoints (Issue #38).

This module contains tests for:
- LessonProgress SQLAlchemy model
- LessonProgressCreate, LessonProgressResponse, LessonProgressListResponse schemas
- POST /grammar/progress/ endpoint
- GET /grammar/progress/ endpoint with filtering

Issue #38 Acceptance Criteria:
- [ ] Model created and migrated
- [ ] Progress tracking works
- [ ] Score recording works
"""

import asyncio

import pytest
from datetime import datetime
from fastapi import status

from models.lesson_progress import LessonProgress as LessonProgressModel
from schemas.lesson_progress import (
    LessonProgressCreate,
    LessonProgressResponse,
    LessonProgressListResponse,
)


# ============================================================================
# Schema Tests
# ============================================================================


class TestLessonProgressSchemas:
    """Test the lesson progress Pydantic schemas."""

    def test_lesson_progress_create_valid(self):
        """Verify LessonProgressCreate accepts valid data."""
        data = {
            "lesson_id": "articles",
            "user_id": None,
            "completed": True,
            "score": 85,
            "time_spent": 300,
        }
        schema = LessonProgressCreate(**data)
        
        assert schema.lesson_id == "articles"
        assert schema.user_id is None
        assert schema.completed is True
        assert schema.score == 85
        assert schema.time_spent == 300

    def test_lesson_progress_create_defaults(self):
        """Verify LessonProgressCreate uses correct defaults."""
        data = {
            "lesson_id": "conditional",
        }
        schema = LessonProgressCreate(**data)
        
        assert schema.lesson_id == "conditional"
        assert schema.user_id is None
        assert schema.completed is False
        assert schema.score == 0
        assert schema.time_spent == 0

    def test_lesson_progress_create_with_user_id(self):
        """Verify LessonProgressCreate accepts user_id."""
        data = {
            "lesson_id": "negation",
            "user_id": 42,
            "completed": True,
            "score": 95,
            "time_spent": 600,
        }
        schema = LessonProgressCreate(**data)
        
        assert schema.user_id == 42
        assert schema.lesson_id == "negation"
        assert schema.score == 95

    def test_lesson_progress_create_score_validation_too_high(self):
        """Verify LessonProgressCreate rejects score > 100."""
        data = {
            "lesson_id": "articles",
            "score": 150,
        }
        
        with pytest.raises(ValueError, match="less than or equal to 100"):
            LessonProgressCreate(**data)

    def test_lesson_progress_create_score_validation_too_low(self):
        """Verify LessonProgressCreate rejects score < 0."""
        data = {
            "lesson_id": "articles",
            "score": -10,
        }
        
        with pytest.raises(ValueError, match="greater than or equal to 0"):
            LessonProgressCreate(**data)

    def test_lesson_progress_create_time_spent_validation_negative(self):
        """Verify LessonProgressCreate rejects negative time_spent."""
        data = {
            "lesson_id": "articles",
            "time_spent": -100,
        }
        
        with pytest.raises(ValueError, match="greater than or equal to 0"):
            LessonProgressCreate(**data)

    def test_lesson_progress_create_time_spent_zero(self):
        """Verify LessonProgressCreate accepts time_spent = 0."""
        data = {
            "lesson_id": "articles",
            "time_spent": 0,
        }
        schema = LessonProgressCreate(**data)
        assert schema.time_spent == 0

    def test_lesson_progress_create_score_boundaries(self):
        """Verify LessonProgressCreate accepts score at boundaries."""
        # Test score = 0
        data0 = {"lesson_id": "test", "score": 0}
        schema0 = LessonProgressCreate(**data0)
        assert schema0.score == 0
        
        # Test score = 100
        data100 = {"lesson_id": "test", "score": 100}
        schema100 = LessonProgressCreate(**data100)
        assert schema100.score == 100

    def test_lesson_progress_response(self):
        """Verify LessonProgressResponse schema."""
        now = datetime.utcnow()
        response = LessonProgressResponse(
            id=1,
            user_id=None,
            lesson_id="articles",
            completed=True,
            score=85,
            last_accessed=now,
            time_spent=300,
            created_at=now,
            updated_at=now,
        )
        
        assert response.id == 1
        assert response.lesson_id == "articles"
        assert response.completed is True
        assert response.score == 85

    def test_lesson_progress_list_response(self):
        """Verify LessonProgressListResponse schema."""
        now = datetime.utcnow()
        record = LessonProgressResponse(
            id=1,
            user_id=None,
            lesson_id="articles",
            completed=True,
            score=85,
            last_accessed=now,
            time_spent=300,
            created_at=now,
            updated_at=now,
        )
        
        list_response = LessonProgressListResponse(
            progress_records=[record]
        )
        
        assert len(list_response.progress_records) == 1
        assert list_response.progress_records[0].lesson_id == "articles"

    def test_lesson_progress_list_response_empty(self):
        """Verify LessonProgressListResponse handles empty list."""
        list_response = LessonProgressListResponse(
            progress_records=[]
        )
        
        assert len(list_response.progress_records) == 0


# ============================================================================
# Model Tests
# ============================================================================


class TestLessonProgressModel:
    """Test the LessonProgress SQLAlchemy model."""

    def test_model_fields(self):
        """Verify LessonProgress model has all required fields."""
        fields = LessonProgressModel.__table__.columns.keys()
        
        expected_fields = {
            'id', 'user_id', 'lesson_id', 'completed',
            'score', 'last_accessed', 'time_spent',
            'created_at', 'updated_at'
        }
        
        assert expected_fields.issubset(set(fields))

    def test_model_indexes(self):
        """Verify LessonProgress model has indexes on id, user_id, and lesson_id."""
        # Check that the columns have index=True
        assert LessonProgressModel.__table__.c.id.index is True
        assert LessonProgressModel.__table__.c.user_id.index is True
        assert LessonProgressModel.__table__.c.lesson_id.index is True


# ============================================================================
# Endpoint Tests
# ============================================================================


@pytest.mark.asyncio
class TestLessonProgressEndpoints:
    """Test the /grammar/progress/ endpoints."""

    async def test_create_progress(self, client):
        """Test POST /grammar/progress/ with valid data (AC2, AC3)."""
        # Given
        progress_data = {
            "lesson_id": "articles",
            "completed": True,
            "score": 85,
            "time_spent": 300,
        }
        
        # When
        response = client.post("/grammar/progress/", json=progress_data)
        
        # Then
        assert response.status_code == status.HTTP_201_CREATED
        
        data = response.json()
        assert "id" in data
        assert data["lesson_id"] == "articles"
        assert data["completed"] is True
        assert data["score"] == 85
        assert data["time_spent"] == 300
        assert data["user_id"] is None
        assert "last_accessed" in data
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_progress_with_user_id(self, client):
        """Test POST /grammar/progress/ with user_id."""
        # Given
        progress_data = {
            "lesson_id": "conditional",
            "user_id": 42,
            "completed": True,
            "score": 95,
            "time_spent": 600,
        }
        
        # When
        response = client.post("/grammar/progress/", json=progress_data)
        
        # Then
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_id"] == 42
        assert data["lesson_id"] == "conditional"
        assert data["score"] == 95

    async def test_create_progress_defaults(self, client):
        """Test POST /grammar/progress/ with minimal data."""
        # Given
        progress_data = {
            "lesson_id": "negation",
        }
        
        # When
        response = client.post("/grammar/progress/", json=progress_data)
        
        # Then
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["completed"] is False
        assert data["score"] == 0
        assert data["time_spent"] == 0

    async def test_create_progress_invalid_score_high(self, client):
        """Test POST /grammar/progress/ with score > 100."""
        # Given
        progress_data = {
            "lesson_id": "articles",
            "score": 150,
        }
        
        # When
        response = client.post("/grammar/progress/", json=progress_data)
        
        # Then
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "less than or equal to 100" in response.text

    async def test_create_progress_invalid_score_low(self, client):
        """Test POST /grammar/progress/ with score < 0."""
        # Given
        progress_data = {
            "lesson_id": "articles",
            "score": -10,
        }
        
        # When
        response = client.post("/grammar/progress/", json=progress_data)
        
        # Then
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "greater than or equal to 0" in response.text

    async def test_create_progress_invalid_time_spent(self, client):
        """Test POST /grammar/progress/ with negative time_spent."""
        # Given
        progress_data = {
            "lesson_id": "articles",
            "time_spent": -100,
        }
        
        # When
        response = client.post("/grammar/progress/", json=progress_data)
        
        # Then
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "greater than or equal to 0" in response.text

    async def test_create_progress_missing_lesson_id(self, client):
        """Test POST /grammar/progress/ without lesson_id."""
        # Given
        progress_data = {
            "completed": True,
            "score": 85,
        }
        
        # When
        response = client.post("/grammar/progress/", json=progress_data)
        
        # Then
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    async def test_list_progress_empty(self, client):
        """Test GET /grammar/progress/ with no records."""
        # When
        response = client.get("/grammar/progress/")
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "progress_records" in data
        assert isinstance(data["progress_records"], list)
        assert len(data["progress_records"]) == 0

    async def test_list_progress_with_records(self, client):
        """Test GET /grammar/progress/ returns existing records (AC2, AC3)."""
        # Given: Create a progress record
        progress_data = {
            "lesson_id": "articles",
            "completed": True,
            "score": 85,
            "time_spent": 300,
        }
        create_response = client.post("/grammar/progress/", json=progress_data)
        assert create_response.status_code == status.HTTP_201_CREATED
        
        # When
        response = client.get("/grammar/progress/")
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["progress_records"]) >= 1
        
        # Find our record
        articles_records = [r for r in data["progress_records"] if r["lesson_id"] == "articles"]
        assert len(articles_records) >= 1
        assert articles_records[0]["score"] == 85
        assert articles_records[0]["completed"] is True

    async def test_list_progress_filter_by_lesson_id(self, client):
        """Test GET /grammar/progress/ with lesson_id filter."""
        # Given: Create progress records for different lessons
        client.post("/grammar/progress/", json={
            "lesson_id": "articles",
            "completed": True,
            "score": 85,
        })
        client.post("/grammar/progress/", json={
            "lesson_id": "conditional",
            "completed": True,
            "score": 90,
        })
        
        # When
        response = client.get("/grammar/progress/?lesson_id=articles")
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["progress_records"]) >= 1
        for record in data["progress_records"]:
            assert record["lesson_id"] == "articles"

    async def test_list_progress_filter_by_user_id(self, client):
        """Test GET /grammar/progress/ with user_id filter."""
        # Given: Create progress records for different users
        client.post("/grammar/progress/", json={
            "lesson_id": "articles",
            "user_id": 1,
            "completed": True,
        })
        client.post("/grammar/progress/", json={
            "lesson_id": "conditional",
            "user_id": 2,
            "completed": True,
        })
        
        # When
        response = client.get("/grammar/progress/?user_id=1")
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["progress_records"]) >= 1
        for record in data["progress_records"]:
            assert record["user_id"] == 1

    async def test_list_progress_filter_by_completed(self, client):
        """Test GET /grammar/progress/ with completed filter."""
        # Given: Create completed and incomplete progress records
        client.post("/grammar/progress/", json={
            "lesson_id": "articles",
            "completed": True,
            "score": 85,
        })
        client.post("/grammar/progress/", json={
            "lesson_id": "conditional",
            "completed": False,
            "score": 0,
        })
        
        # When: Filter for completed
        response = client.get("/grammar/progress/?completed=true")
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for record in data["progress_records"]:
            assert record["completed"] is True
        
        # When: Filter for not completed
        response = client.get("/grammar/progress/?completed=false")
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for record in data["progress_records"]:
            assert record["completed"] is False

    async def test_list_progress_multiple_filters(self, client):
        """Test GET /grammar/progress/ with multiple filters combined."""
        # Given: Create progress records with different attributes
        client.post("/grammar/progress/", json={
            "lesson_id": "articles",
            "user_id": 1,
            "completed": True,
            "score": 85,
        })
        client.post("/grammar/progress/", json={
            "lesson_id": "articles",
            "user_id": 2,
            "completed": False,
            "score": 0,
        })
        client.post("/grammar/progress/", json={
            "lesson_id": "conditional",
            "user_id": 1,
            "completed": True,
            "score": 90,
        })
        
        # When: Filter by lesson_id AND user_id
        response = client.get("/grammar/progress/?lesson_id=articles&user_id=1")
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["progress_records"]) >= 1
        for record in data["progress_records"]:
            assert record["lesson_id"] == "articles"
            assert record["user_id"] == 1

    async def test_list_progress_order_by_created_at_desc(self, client):
        """Test GET /grammar/progress/ returns records ordered by created_at desc."""
        # Given: Create multiple progress records
        client.post("/grammar/progress/", json={
            "lesson_id": "first",
            "completed": True,
        })
        await asyncio.sleep(0.01)  # Small delay to ensure different timestamps
        client.post("/grammar/progress/", json={
            "lesson_id": "second",
            "completed": True,
        })
        
        # When
        response = client.get("/grammar/progress/")
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        records = data["progress_records"]
        
        # Records should be ordered by created_at descending
        # So "second" should appear before "first" in the list
        if len(records) >= 2:
            # Find indices of our test records
            first_idx = next((i for i, r in enumerate(records) if r["lesson_id"] == "first"), -1)
            second_idx = next((i for i, r in enumerate(records) if r["lesson_id"] == "second"), -1)
            
            if first_idx >= 0 and second_idx >= 0:
                assert second_idx < first_idx

    async def test_create_and_list_score_recording(self, client):
        """Test that score is recorded and can be retrieved (AC3)."""
        # Given
        progress_data = {
            "lesson_id": "score_test",
            "completed": True,
            "score": 75,
            "time_spent": 450,
        }
        
        # When: Create record
        create_response = client.post("/grammar/progress/", json=progress_data)
        assert create_response.status_code == status.HTTP_201_CREATED
        created_score = create_response.json()["score"]
        
        # When: List records
        list_response = client.get("/grammar/progress/?lesson_id=score_test")
        
        # Then
        assert list_response.status_code == status.HTTP_200_OK
        records = list_response.json()["progress_records"]
        assert len(records) >= 1
        assert records[0]["score"] == 75
        assert records[0]["score"] == created_score


# ============================================================================
# Integration Tests
# ============================================================================


@pytest.mark.asyncio
class TestLessonProgressIntegration:
    """Integration tests for the lesson progress feature."""

    async def test_full_workflow(self, client):
        """Test complete workflow: create, list, filter."""
        # Create multiple progress records
        lessons = ["articles", "conditional", "negation"]
        for lesson in lessons:
            response = client.post("/grammar/progress/", json={
                "lesson_id": lesson,
                "completed": True,
                "score": 80 + lessons.index(lesson) * 5,
                "time_spent": 300 * (lessons.index(lesson) + 1),
            })
            assert response.status_code == status.HTTP_201_CREATED
        
        # List all
        response = client.get("/grammar/progress/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["progress_records"]) >= 3
        
        # Verify all lessons are present
        lesson_ids = {r["lesson_id"] for r in data["progress_records"]}
        assert set(lessons).issubset(lesson_ids)
        
        # Filter by each lesson and verify
        for lesson in lessons:
            response = client.get(f"/grammar/progress/?lesson_id={lesson}")
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert len(data["progress_records"]) >= 1
            assert data["progress_records"][0]["lesson_id"] == lesson

    async def test_score_validation_integration(self, client):
        """Test that score validation works end-to-end."""
        # Valid scores
        for score in [0, 50, 100]:
            response = client.post("/grammar/progress/", json={
                "lesson_id": "validation_test",
                "score": score,
            })
            assert response.status_code == status.HTTP_201_CREATED, f"Score {score} should be valid"
        
        # Invalid scores
        for score in [-1, 101, 200]:
            response = client.post("/grammar/progress/", json={
                "lesson_id": "validation_test",
                "score": score,
            })
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY, f"Score {score} should be invalid"

    async def test_time_spent_validation_integration(self, client):
        """Test that time_spent validation works end-to-end."""
        # Valid time_spent
        for time_spent in [0, 100, 10000]:
            response = client.post("/grammar/progress/", json={
                "lesson_id": "time_test",
                "time_spent": time_spent,
            })
            assert response.status_code == status.HTTP_201_CREATED, f"time_spent {time_spent} should be valid"
        
        # Invalid time_spent
        for time_spent in [-1, -100]:
            response = client.post("/grammar/progress/", json={
                "lesson_id": "time_test",
                "time_spent": time_spent,
            })
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY, f"time_spent {time_spent} should be invalid"


# ============================================================================
# Model Creation and Migration Tests
# ============================================================================


@pytest.mark.asyncio
class TestModelCreation:
    """Test that the model can be created and tables exist (AC1)."""

    async def test_model_table_exists(self, test_db):
        """Test that the lesson_progress table exists in the database."""
        # This test verifies AC1: Model created and migrated
        # The table should be created by the Base.metadata.create_all() in conftest
        
        # Try to query the table
        from sqlalchemy import select
        
        result = await test_db.execute(select(LessonProgressModel))
        # This will fail if the table doesn't exist
        assert result is not None

    async def test_model_can_be_inserted(self, test_db):
        """Test that a LessonProgress record can be inserted and retrieved."""
        # Create and insert a record
        record = LessonProgressModel(
            user_id=None,
            lesson_id="test_lesson",
            completed=True,
            score=90,
            time_spent=500,
        )
        
        test_db.add(record)
        await test_db.commit()
        await test_db.refresh(record)
        
        # Verify the record was inserted
        assert record.id is not None
        assert record.lesson_id == "test_lesson"
        assert record.completed is True
        assert record.score == 90
        assert record.time_spent == 500
        assert record.created_at is not None
        assert record.updated_at is not None



