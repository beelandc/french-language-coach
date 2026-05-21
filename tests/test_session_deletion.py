"""
Tests for DELETE /sessions/{id} endpoint (Issue #8: 1.5.3: Add session deletion endpoint, Issue #9: 1.5.3-T: Test session deletion).

Acceptance Criteria (Issue #8):
- Endpoint: DELETE /sessions/{id}
- Returns 204 on success
- Returns 404 if session not found
- Actually removes record from DB

Acceptance Criteria (Issue #9):
- Test 204 response for valid session
- Test 404 response for non-existent session
- Test DB record is actually removed
- Test cannot delete active session
"""
from datetime import datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from models.session import Session as SessionModel
from schemas.session import SessionCreate


class TestDeleteSession:
    """Integration tests for DELETE /sessions/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_session_success(self, client, test_db):
        """
        Test successful deletion of an ended session.
        
        Given: An ended session exists in the database
        When: DELETE /sessions/{id} is called
        Then: Returns 204 and session is removed from database
        """
        # Given: An ended session exists (created directly in DB with ended_at set)
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=datetime.utcnow(),  # Session is ended
            messages="[]",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
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
    async def test_delete_session_with_messages_and_feedback(self, client, test_db):
        """
        Test deletion of an ended session that has messages and feedback.
        
        Given: An ended session with messages and feedback exists
        When: DELETE /sessions/{id} is called
        Then: Returns 204 and session is removed (including messages and feedback)
        """
        # Given: An ended session with messages and feedback exists
        session = SessionModel(
            scenario_id="job_interview",
            difficulty="advanced",
            created_at=datetime.utcnow() - timedelta(hours=1),
            ended_at=datetime.utcnow(),  # Session is ended
            messages='[{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Bonjour"}]',
            feedback='{"overall_score": 85, "grammar": 80, "vocabulary": 90, "fluency": 85}'
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
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
    async def test_delete_session_multiple_times(self, client, test_db):
        """
        Test that deleting the same ended session twice returns 404 on second attempt.
        
        Given: An ended session exists
        When: DELETE is called twice on the same session ID
        Then: First returns 204, second returns 404
        """
        # Given: An ended session exists (created directly in DB)
        session = SessionModel(
            scenario_id="train_travel",
            difficulty="beginner",
            created_at=datetime.utcnow() - timedelta(hours=1),
            ended_at=datetime.utcnow(),  # Session is ended
            messages="[]",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: First DELETE /sessions/{id}
        response1 = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 204
        assert response1.status_code == 204
        
        # When: Second DELETE /sessions/{id}
        response2 = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 404 (session already deleted)
        assert response2.status_code == 404
        assert response2.json()["detail"] == "Session not found"

    @pytest.mark.asyncio
    async def test_delete_active_session_fails(self, client, test_db):
        """
        Test that active sessions (ended_at is NULL) CAN be deleted if not locked.
        
        This test has been updated for Issue #160: Session Locking and Continuation.
        Previously, deletion was blocked based on ended_at. Now it's based on is_locked.
        
        Given: An active session exists (ended_at is NULL, is_locked is False)
        When: DELETE /sessions/{id} is called
        Then: Returns 204 and session is removed
        """
        # Given: An active session exists (ended_at is NULL, not locked)
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,  # Active session - not ended
            messages="[]",
            is_locked=False,  # Not locked - can be deleted
            locked_at=None,
            locked_by=None,
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # Verify session is active (ended_at is None) and not locked
        get_response = client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 200
        assert get_response.json()["ended_at"] is None
        assert get_response.json()["is_locked"] == False
        
        # When: Attempt to delete active session
        response = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 204 (now allowed for unlocked sessions)
        assert response.status_code == 204
        
        # And: Session is removed from database
        get_after = client.get(f"/sessions/{session_id}")
        assert get_after.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_locked_session_fails(self, client, test_db):
        """
        Test that locked sessions cannot be deleted.
        
        This is the new behavior for Issue #160: Session Locking and Continuation.
        Deletion is now blocked based on is_locked, not ended_at.
        
        Given: A locked session exists
        When: DELETE /sessions/{id} is called
        Then: Returns 400 with detail "Cannot delete locked session"
              AND session remains in database
        """
        # Given: A locked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,  # Could be incomplete or complete
            messages="[]",
            is_locked=True,  # Locked - cannot be deleted
            locked_at=datetime.utcnow(),
            locked_by="test-client",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # Verify session is locked
        get_response = client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 200
        assert get_response.json()["is_locked"] == True
        
        # When: Attempt to delete locked session
        response = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 400
        assert response.status_code == 400
        assert response.json()["detail"] == "Cannot delete locked session"
        
        # And: Session still exists
        get_after = client.get(f"/sessions/{session_id}")
        assert get_after.status_code == 200
