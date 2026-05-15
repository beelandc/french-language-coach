# SPDD Prompt: Session Deletion Endpoint Tests Implementation

**GitHub Issue**: #9
**Issue Title**: 1.5.3-T: Test session deletion
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/9
**Artifact ID**: FLC-006-202605152015
**Created**: 2026-05-15 20:15
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-006-202605152000-[Analysis]-issue-9-session-deletion-tests.md`

---

## Context

### Current Codebase State

The French Language Coach backend is a FastAPI application with async SQLAlchemy for database operations. The session deletion endpoint (DELETE /sessions/{id}) was implemented in issue #8 and is currently on the `main` branch. The endpoint:
- Returns 204 on successful deletion
- Returns 404 if session not found
- Actually removes the record from the database

However, analysis of issue #9 acceptance criteria revealed a gap: the endpoint does not prevent deletion of active sessions (sessions where `ended_at` is NULL).

### Relevant Files

| File | Purpose | Key Lines/Functions | Current State |
|------|---------|---------------------|---------------|
| `routers/sessions.py` | Session router with DELETE endpoint | Lines 151-169: delete_session() | Missing active session check |
| `models/session.py` | Session SQLAlchemy model | ended_at field (nullable DateTime) | Active = NULL, Ended = datetime |
| `tests/test_session_deletion.py` | Existing deletion tests | 5 test cases | Missing active session test |
| `tests/conftest.py` | Test fixtures | test_db, client fixtures | Ready to use |
| `routers/messages.py` | Reference: active session check | Line 23: `if session.ended_at:` | Pattern to follow |
| `routers/feedback.py` | Reference: active session check | Line 22: `if session.ended_at:` | Pattern to follow |

### Existing Patterns

1. **Active session check pattern** (from `messages.py` and `feedback.py`):
   ```python
   if session.ended_at:
       raise HTTPException(status_code=400, detail="Session has ended")
   ```
   Note: `session.ended_at` is truthy when it has a datetime value (ended), falsy when NULL (active)

2. **Session lookup pattern** (from `sessions.py`):
   ```python
   session = await db.get(SessionModel, session_id)
   if not session:
       raise HTTPException(status_code=404, detail="Session not found")
   ```

3. **Test pattern** (from `test_session_deletion.py`):
   - Use `client.post("/sessions/", json=...)` to create sessions
   - Use `client.delete(f"/sessions/{session_id}")` to delete
   - Verify status codes and database state

4. **Test fixture pattern**:
   - `client` fixture provides TestClient with overridden get_db
   - `test_db` fixture provides async database session
   - Each test gets a fresh database

### Codebase Conventions

- **Error handling**: Use `HTTPException(status_code=XXX, detail="message")`
- **Database operations**: Use `await db.get()`, `db.add()`, `await db.delete()`, `await db.commit()`
- **Imports**: Grouped by source (standard lib, third-party, local)
- **Type hints**: All function parameters and return types
- **Docstrings**: Google-style for public functions

---

## Goal

**Primary Objective**: Implement missing functionality and tests for session deletion endpoint to meet all acceptance criteria from issue #9:

1. **Code**: Add check to prevent deletion of active sessions (where `ended_at IS NULL`)
2. **Test**: Add test case verifying active sessions cannot be deleted
3. **Validation**: Ensure all 4 acceptance criteria are met with passing tests

**Secondary Objectives**:
- Maintain 80%+ test coverage for modified files
- Follow existing code patterns and conventions
- Ensure backward compatibility (existing tests still pass)

---

## Constraints

### Architecture Constraints
- Must use FastAPI and SQLAlchemy async
- Must follow existing router structure in `routers/sessions.py`
- Must use existing `SessionModel` from `models.session.py`
- Must use existing `get_db` dependency
- Must not break existing functionality

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must match existing codebase indentation (4 spaces) and naming conventions
- Must use type hints where applicable
- Must include/updated docstrings
- Must follow the pattern from `messages.py` and `feedback.py` for active session checks

### Testing Constraints
- Must use pytest with pytest-asyncio
- Must use existing test fixtures (`client`, `test_db`)
- Must follow existing test patterns in `test_session_deletion.py`
- Must test both success and failure cases
- Must achieve 80%+ coverage for `routers/sessions.py`

### Acceptance Criteria (from GitHub issue #9)
- [ ] Test 204 response for valid session
- [ ] Test 404 response for non-existent session
- [ ] Test DB record is actually removed
- [ ] Test cannot delete active session

---

## Examples

### Business Rule Examples

**Example 1: Deleting an ended session (VALID)**
```python
# Session with ended_at set (ended session)
session = SessionModel(
    scenario_id="cafe_order",
    difficulty="intermediate",
    ended_at=datetime(2026, 5, 15, 18, 0, 0)  # Has ended
)
# DELETE /sessions/{id} should return 204 and delete the session
```

**Example 2: Deleting an active session (INVALID)**
```python
# Session without ended_at (active session)
session = SessionModel(
    scenario_id="cafe_order",
    difficulty="intermediate",
    ended_at=None  # Still active
)
# DELETE /sessions/{id} should return 400 with "Cannot delete active session"
```

**Example 3: How sessions are created via API**
```python
# POST /sessions/ creates a session with ended_at=NULL (active)
response = client.post("/sessions/", json={
    "scenario_id": "cafe_order",
    "difficulty": "intermediate"
})
# This creates an active session (ended_at is NULL by default)

# To end a session, POST /sessions/{id}/feedback
# This sets ended_at to current datetime
```

### Test Case Examples

**Test: Cannot delete active session**
```python
@pytest.mark.asyncio
async def test_delete_active_session_fails(client):
    """
    Test that active sessions (ended_at is NULL) cannot be deleted.
    
    Given: A session exists with ended_at = NULL (active)
    When: DELETE /sessions/{id} is called
    Then: Returns 400 with detail "Cannot delete active session"
          AND session remains in database
    """
    # Given: Create an active session (no feedback, ended_at is NULL)
    session_data = SessionCreate(
        scenario_id="cafe_order",
        difficulty="intermediate"
    )
    create_response = client.post("/sessions/", json=session_data.model_dump())
    assert create_response.status_code == 200
    session_id = create_response.json()["id"]
    
    # Verify session is active (ended_at is None)
    get_response = client.get(f"/sessions/{session_id}")
    assert get_response.status_code == 200
    assert get_response.json()["ended_at"] is None
    
    # When: Attempt to delete active session
    response = client.delete(f"/sessions/{session_id}")
    
    # Then: Returns 400
    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot delete active session"
    
    # And: Session still exists
    get_after = client.get(f"/sessions/{session_id}")
    assert get_after.status_code == 200
```

### Edge Cases to Consider

1. **Session with ended_at explicitly set to NULL**: Should be treated as active
2. **Session with ended_at set to a past datetime**: Should be deletable
3. **Session lookup returns None**: Already handled (returns 404)
4. **Invalid session_id (non-integer)**: FastAPI handles (returns 422)

---

## Deliverables

### Code Changes
1. **File**: `routers/sessions.py`
   **Change**: Add active session check in `delete_session()` endpoint
   **Location**: After session lookup (line ~163), before deletion
   **Code**:
   ```python
   if session.ended_at is None:
       raise HTTPException(status_code=400, detail="Cannot delete active session")
   ```

### Test Changes
1. **File**: `tests/test_session_deletion.py`
   **Change**: Add new test case `test_delete_active_session_fails`
   **Location**: Add to `TestDeleteSession` class
   **Code**: As shown in Examples section above

### Documentation Changes
1. **File**: `routers/sessions.py`
   **Change**: Update docstring for `delete_session()` to mention active session restriction

---

## Verification

### Tests to Run
```bash
# Run all session deletion tests
pytest tests/test_session_deletion.py -v

# Run with coverage
pytest tests/test_session_deletion.py --cov=routers/sessions --cov-report=term-missing

# Verify 80%+ coverage
pytest tests/ --cov=routers/sessions --cov-report=term-missing
```

### Expected Outcomes
- All existing tests continue to pass
- New test `test_delete_active_session_fails` passes
- Coverage for `routers/sessions.py` is >= 80%
- All 4 acceptance criteria from issue #9 are met

---

## Implementation Notes

1. **Import order**: If adding new imports, follow existing order:
   - Standard library imports first
   - Third-party imports next
   - Local imports last

2. **Error message**: Use "Cannot delete active session" to be clear and consistent with other endpoints

3. **HTTP status code**: Use 400 (Bad Request) as this is a client error (attempting an invalid operation)

4. **Check placement**: Place the check AFTER session lookup and BEFORE deletion:
   ```python
   async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
       session = await db.get(SessionModel, session_id)
       if not session:
           raise HTTPException(status_code=404, detail="Session not found")
       
       # NEW: Check if session is active
       if session.ended_at is None:
           raise HTTPException(status_code=400, detail="Cannot delete active session")
       
       await db.delete(session)
       await db.commit()
       return Response(status_code=204)
   ```

5. **Existing tests**: Review existing tests to ensure they create ended sessions or that the new check doesn't break them. Looking at `test_session_deletion.py`, the tests create sessions via POST /sessions/ which by default creates active sessions (ended_at=NULL). This means existing tests might fail with the new check. Need to verify and potentially update test data.

**WAIT - Critical Issue Identified**: The existing tests in `test_session_deletion.py` create sessions via POST /sessions/ which creates ACTIVE sessions (ended_at=NULL). With the new check, these tests will FAIL because they try to delete active sessions.

**Resolution**: The existing tests need to be updated to either:
- Create sessions and then end them (via feedback endpoint), OR
- Create sessions with ended_at explicitly set

This is a breaking change that needs to be addressed.

---

*Prompt ready for execution. Critical issue identified: existing tests create active sessions and will fail with new validation. Need to update existing tests or implementation approach.*
