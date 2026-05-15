"""
Tests for DELETE /sessions/{id} endpoint (Issue #8: 1.5.3: Add session deletion endpoint).

Acceptance Criteria:
- Endpoint: DELETE /sessions/{id}
- Returns 204 on success
- Returns 404 if session not found
- Actually removes record from DB
"""
from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from models.session import Session as SessionModel
from schemas.session import SessionCreate


class TestDeleteSession:
    """Integration tests for DELETE /sessions/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_session_success(self, client):
        """
        Test successful deletion of a session.
        
        Given: A session exists in the database
        When: DELETE /sessions/{id} is called
        Then: Returns 204 and session is removed from database
        """
        # Given: A session exists (created via POST)
        session_data = SessionCreate(
            scenario_id="cafe_order",
            difficulty="intermediate"
        )
        create_response = client.post("/sessions/", json=session_data.model_dump())
        assert create_response.status_code == 200
        session_id = create_response.json()["id"]
        
        # Verify session exists via GET
        get_response = client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 200
        
        # When: DELETE /sessions/{id}
        response = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 204
        assert response.status_code == 204
        
        # And: Session is removed from DB (GET returns 404)
        get_after_delete = client.get(f"/sessions/{session_id}")
        assert get_after_delete.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_session_not_found(self, client):
        """
        Test deletion of non-existent session.
        
        Given: No session with ID 999 exists
        When: DELETE /sessions/999 is called
        Then: Returns 404 with detail "Session not found"
        """
        # Given: No session with ID 999
        # (Database is empty for this test)
        
        # When: DELETE /sessions/999
        response = client.delete("/sessions/999")
        
        # Then: Returns 404
        assert response.status_code == 404
        assert response.json()["detail"] == "Session not found"

    @pytest.mark.asyncio
    async def test_delete_session_invalid_id(self, client):
        """
        Test deletion with invalid session ID.
        
        Given: Invalid session ID (non-integer string)
        When: DELETE /sessions/invalid is called
        Then: Returns 422 Validation Error
        """
        # Given: Invalid session ID
        
        # When: DELETE /sessions/invalid
        response = client.delete("/sessions/invalid")
        
        # Then: Returns 422 (FastAPI validation error)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_delete_session_with_messages_and_feedback(self, client):
        """
        Test deletion of a session that has messages and feedback.
        
        Given: A session with messages and feedback exists
        When: DELETE /sessions/{id} is called
        Then: Returns 204 and session is removed (including messages and feedback)
        """
        # Given: A session exists (created via POST)
        session_data = SessionCreate(
            scenario_id="job_interview",
            difficulty="advanced"
        )
        create_response = client.post("/sessions/", json=session_data.model_dump())
        assert create_response.status_code == 200
        session_id = create_response.json()["id"]
        
        # Verify session exists via GET
        get_response = client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 200
        
        # When: DELETE /sessions/{id}
        response = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 204
        assert response.status_code == 204
        
        # And: Session and all its data is removed from DB
        get_after_delete = client.get(f"/sessions/{session_id}")
        assert get_after_delete.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_session_multiple_times(self, client):
        """
        Test that deleting the same session twice returns 404 on second attempt.
        
        Given: A session exists
        When: DELETE is called twice on the same session ID
        Then: First returns 204, second returns 404
        """
        # Given: A session exists (created via POST)
        session_data = SessionCreate(
            scenario_id="train_travel",
            difficulty="beginner"
        )
        create_response = client.post("/sessions/", json=session_data.model_dump())
        assert create_response.status_code == 200
        session_id = create_response.json()["id"]
        
        # When: First DELETE /sessions/{id}
        response1 = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 204
        assert response1.status_code == 204
        
        # When: Second DELETE /sessions/{id}
        response2 = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 404 (session already deleted)
        assert response2.status_code == 404
        assert response2.json()["detail"] == "Session not found"
