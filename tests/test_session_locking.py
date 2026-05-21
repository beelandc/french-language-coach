"""
Tests for Session Locking and Continuation Feature (Issue #160).

This module tests:
- POST /sessions/{id}/lock endpoint
- POST /sessions/{id}/unlock endpoint
- Updated DELETE /sessions/{id} endpoint (lock-based instead of ended_at-based)
- GET /sessions/{id} includes lock fields
- GET /sessions/ includes lock fields in summaries
- TTL-based auto-unlock functionality

Acceptance Criteria Covered:
- Users can delete incomplete sessions (where ended_at === null) when not locked
- Delete button is disabled ONLY when session is locked (in active use)
- Sessions are automatically locked when loaded in ChatInterface
- Sessions are automatically unlocked when user leaves ChatInterface
- Locking works across browser tabs (backend state)
- Abandoned locks auto-unlock after reasonable TTL (e.g., 10 minutes)
"""
from datetime import datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from models.session import Session as SessionModel
from schemas.session import SessionCreate


class TestLockSession:
    """Integration tests for POST /sessions/{id}/lock endpoint."""

    @pytest.mark.asyncio
    async def test_lock_session_success(self, client, test_db):
        """
        Test successful locking of an unlocked session.
        
        Given: An unlocked session exists in the database
        When: POST /sessions/{id}/lock is called
        Then: Returns 200 with is_locked=True and lock details
        """
        # Given: An unlocked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,  # Incomplete session
            messages="[]",
            is_locked=False,
            locked_at=None,
            locked_by=None,
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Lock the session
        response = client.post(f"/sessions/{session_id}/lock")
        
        # Then: Returns 200 with lock details
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["is_locked"] == True
        assert data["locked_at"] is not None
        assert data["locked_by"] is not None  # Auto-generated client ID

    @pytest.mark.asyncio
    async def test_lock_session_not_found(self, client):
        """
        Test locking a non-existent session.
        
        Given: No session with ID 999 exists
        When: POST /sessions/999/lock is called
        Then: Returns 404 with detail "Session not found"
        """
        # Given: No session with ID 999
        
        # When: Try to lock non-existent session
        response = client.post("/sessions/999/lock")
        
        # Then: Returns 404
        assert response.status_code == 404
        assert response.json()["detail"] == "Session not found"

    @pytest.mark.asyncio
    async def test_lock_session_with_client_id(self, client, test_db):
        """
        Test locking a session with a custom client ID.
        
        Given: An unlocked session exists
        When: POST /sessions/{id}/lock is called with X-Client-ID header
        Then: Returns 200 with is_locked=True and custom locked_by value
        """
        # Given: An unlocked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Lock with custom client ID
        response = client.post(
            f"/sessions/{session_id}/lock",
            headers={"X-Client-ID": "my-custom-client"}
        )
        
        # Then: Returns 200 with custom locked_by
        assert response.status_code == 200
        data = response.json()
        assert data["is_locked"] == True
        assert data["locked_by"] == "my-custom-client"

    @pytest.mark.asyncio
    async def test_lock_already_locked_session(self, client, test_db):
        """
        Test locking an already locked session (lock not expired).
        
        Given: A session is already locked
        When: POST /sessions/{id}/lock is called
        Then: Returns 200 with existing lock details (no change)
        """
        # Given: A locked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow(),
            locked_by="existing-client",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Try to lock again
        response = client.post(f"/sessions/{session_id}/lock")
        
        # Then: Returns 200 with existing lock (not acquired)
        assert response.status_code == 200
        data = response.json()
        assert data["is_locked"] == True
        assert data["locked_by"] == "existing-client"  # Original lock preserved

    @pytest.mark.asyncio
    async def test_lock_with_expired_ttl(self, client, test_db):
        """
        Test locking a session with expired TTL (auto-unlock and re-lock).
        
        Given: A session locked more than 10 minutes ago
        When: POST /sessions/{id}/lock is called
        Then: Returns 200 with new lock (TTL expired, old lock ignored)
        """
        # Given: A session locked 15 minutes ago (expired)
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow() - timedelta(minutes=15),  # Expired
            locked_by="old-client",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Try to lock with new client
        response = client.post(
            f"/sessions/{session_id}/lock",
            headers={"X-Client-ID": "new-client"}
        )
        
        # Then: Returns 200 with new lock
        assert response.status_code == 200
        data = response.json()
        assert data["is_locked"] == True
        assert data["locked_by"] == "new-client"  # New client gets the lock


class TestUnlockSession:
    """Integration tests for POST /sessions/{id}/unlock endpoint."""

    @pytest.mark.asyncio
    async def test_unlock_session_success(self, client, test_db):
        """
        Test successful unlocking of a locked session.
        
        Given: A locked session exists
        When: POST /sessions/{id}/unlock is called
        Then: Returns 200 with is_locked=False
        """
        # Given: A locked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow(),
            locked_by="test-client",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Unlock the session
        response = client.post(f"/sessions/{session_id}/unlock")
        
        # Then: Returns 200 with unlocked status
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["is_locked"] == False
        assert data["locked_at"] is None
        assert data["locked_by"] is None

    @pytest.mark.asyncio
    async def test_unlock_session_not_found(self, client):
        """
        Test unlocking a non-existent session.
        
        Given: No session with ID 999 exists
        When: POST /sessions/999/unlock is called
        Then: Returns 404 with detail "Session not found"
        """
        # Given: No session with ID 999
        
        # When: Try to unlock non-existent session
        response = client.post("/sessions/999/unlock")
        
        # Then: Returns 404
        assert response.status_code == 404
        assert response.json()["detail"] == "Session not found"

    @pytest.mark.asyncio
    async def test_unlock_unlocked_session(self, client, test_db):
        """
        Test unlocking an already unlocked session.
        
        Given: An unlocked session exists
        When: POST /sessions/{id}/unlock is called
        Then: Returns 200 with is_locked=False
        """
        # Given: An unlocked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=False,
            locked_at=None,
            locked_by=None,
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Try to unlock
        response = client.post(f"/sessions/{session_id}/unlock")
        
        # Then: Returns 200 with unlocked status
        assert response.status_code == 200
        data = response.json()
        assert data["is_locked"] == False

    @pytest.mark.asyncio
    async def test_unlock_with_client_verification(self, client, test_db):
        """
        Test unlocking with client verification.
        
        Given: A session locked by client A
        When: POST /sessions/{id}/unlock is called with client B's ID
        Then: Returns 403 (forbidden)
        """
        # Given: A session locked by client A
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow(),
            locked_by="client-a",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Try to unlock with client B
        response = client.post(
            f"/sessions/{session_id}/unlock",
            headers={"X-Client-ID": "client-b"}
        )
        
        # Then: Returns 403
        assert response.status_code == 403
        assert "another client" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_unlock_expired_lock_any_client(self, client, test_db):
        """
        Test that any client can unlock an expired lock.
        
        Given: A session locked by client A more than 10 minutes ago
        When: POST /sessions/{id}/unlock is called with client B's ID
        Then: Returns 200 (expired lock can be cleared by anyone)
        """
        # Given: A session locked by client A 15 minutes ago
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow() - timedelta(minutes=15),  # Expired
            locked_by="client-a",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Try to unlock with client B
        response = client.post(
            f"/sessions/{session_id}/unlock",
            headers={"X-Client-ID": "client-b"}
        )
        
        # Then: Returns 200 (expired lock cleared)
        assert response.status_code == 200
        data = response.json()
        assert data["is_locked"] == False


class TestDeleteSessionWithLock:
    """Tests for updated DELETE /sessions/{id} endpoint with lock-based checks."""

    @pytest.mark.asyncio
    async def test_delete_locked_session_fails(self, client, test_db):
        """
        Test that locked sessions cannot be deleted.
        
        Given: A locked session exists
        When: DELETE /sessions/{id} is called
        Then: Returns 400 with detail "Cannot delete locked session"
        """
        # Given: A locked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,  # Incomplete but locked
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow(),
            locked_by="test-client",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # Verify session exists
        get_response = client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 200
        
        # When: Try to delete locked session
        response = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 400
        assert response.status_code == 400
        assert "locked" in response.json()["detail"].lower()
        
        # And: Session still exists
        get_after = client.get(f"/sessions/{session_id}")
        assert get_after.status_code == 200

    @pytest.mark.asyncio
    async def test_delete_incomplete_unlocked_session_succeeds(self, client, test_db):
        """
        Test that incomplete but unlocked sessions CAN be deleted.
        
        This is a NEW capability - previously blocked by ended_at check.
        
        Given: An incomplete (ended_at=null) but unlocked session exists
        When: DELETE /sessions/{id} is called
        Then: Returns 204 and session is removed
        """
        # Given: An incomplete but unlocked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,  # Incomplete
            messages="[]",
            is_locked=False,  # Unlocked - can be deleted
            locked_at=None,
            locked_by=None,
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # Verify session exists
        get_response = client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 200
        
        # When: Delete the session
        response = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 204
        assert response.status_code == 204
        
        # And: Session is removed from DB
        get_after = client.get(f"/sessions/{session_id}")
        assert get_after.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_completed_unlocked_session_succeeds(self, client, test_db):
        """
        Test that completed and unlocked sessions can still be deleted.
        
        Given: A completed (ended_at!=null) and unlocked session exists
        When: DELETE /sessions/{id} is called
        Then: Returns 204 and session is removed
        """
        # Given: A completed and unlocked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow() - timedelta(hours=1),
            ended_at=datetime.utcnow(),  # Completed
            messages="[]",
            is_locked=False,
            locked_at=None,
            locked_by=None,
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # Verify session exists
        get_response = client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 200
        
        # When: Delete the session
        response = client.delete(f"/sessions/{session_id}")
        
        # Then: Returns 204
        assert response.status_code == 204
        
        # And: Session is removed from DB
        get_after = client.get(f"/sessions/{session_id}")
        assert get_after.status_code == 404


class TestGetSessionWithLock:
    """Tests for GET endpoints including lock fields."""

    @pytest.mark.asyncio
    async def test_get_session_includes_lock_fields(self, client, test_db):
        """
        Test that GET /sessions/{id} includes lock fields.
        
        Given: A locked session exists
        When: GET /sessions/{id} is called
        Then: Response includes is_locked, locked_at, locked_by
        """
        # Given: A locked session exists
        session = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages='[{"role": "user", "content": "test"}]',
            is_locked=True,
            locked_at=datetime.utcnow(),
            locked_by="test-client",
        )
        test_db.add(session)
        await test_db.commit()
        await test_db.refresh(session)
        session_id = session.id
        
        # When: Get the session
        response = client.get(f"/sessions/{session_id}")
        
        # Then: Response includes lock fields
        assert response.status_code == 200
        data = response.json()
        assert "is_locked" in data
        assert data["is_locked"] == True
        assert "locked_at" in data
        assert data["locked_at"] is not None
        assert "locked_by" in data
        assert data["locked_by"] == "test-client"

    @pytest.mark.asyncio
    async def test_list_sessions_includes_lock_fields(self, client, test_db):
        """
        Test that GET /sessions/ includes lock fields in summaries.
        
        Given: Multiple sessions exist with different lock statuses
        When: GET /sessions/ is called
        Then: Response includes is_locked, locked_at, locked_by for each session
        """
        # Given: Create sessions with different lock statuses
        session1 = SessionModel(
            scenario_id="cafe_order",
            difficulty="beginner",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow(),
            locked_by="client-1",
        )
        session2 = SessionModel(
            scenario_id="job_interview",
            difficulty="intermediate",
            created_at=datetime.utcnow() - timedelta(hours=1),
            ended_at=datetime.utcnow(),
            messages="[]",
            is_locked=False,
            locked_at=None,
            locked_by=None,
        )
        test_db.add_all([session1, session2])
        await test_db.commit()
        
        # When: List all sessions
        response = client.get("/sessions/")
        
        # Then: Response includes lock fields for each session
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert len(data["sessions"]) >= 2
        
        for session in data["sessions"]:
            assert "is_locked" in session
            assert "locked_at" in session
            assert "locked_by" in session


class TestLockExpiration:
    """Tests for TTL-based lock expiration."""

    @pytest.mark.asyncio
    async def test_session_can_be_locked_method(self, test_db):
        """
        Test the Session.can_be_locked() method.
        
        Given: Various session states
        When: can_be_locked() is called
        Then: Returns appropriate boolean
        """
        # Test unlocked session
        session1 = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=False,
            locked_at=None,
            locked_by=None,
        )
        assert session1.can_be_locked() == True
        
        # Test locked session (recent)
        session2 = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow(),
            locked_by="client",
        )
        assert session2.can_be_locked() == False
        
        # Test locked session (expired)
        session3 = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow() - timedelta(minutes=15),  # Expired
            locked_by="client",
        )
        assert session3.can_be_locked() == True

    @pytest.mark.asyncio
    async def test_session_is_lock_expired_method(self, test_db):
        """
        Test the Session.is_lock_expired() method.
        
        Given: Various session states
        When: is_lock_expired() is called
        Then: Returns appropriate boolean
        """
        # Test unlocked session
        session1 = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=False,
            locked_at=None,
            locked_by=None,
        )
        assert session1.is_lock_expired() == False
        
        # Test locked session (recent)
        session2 = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow(),
            locked_by="client",
        )
        assert session2.is_lock_expired() == False
        
        # Test locked session (expired)
        session3 = SessionModel(
            scenario_id="cafe_order",
            difficulty="intermediate",
            created_at=datetime.utcnow(),
            ended_at=None,
            messages="[]",
            is_locked=True,
            locked_at=datetime.utcnow() - timedelta(minutes=15),  # Expired
            locked_by="client",
        )
        assert session3.is_lock_expired() == True
