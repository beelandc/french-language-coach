# SPDD Prompt: Session Deletion Endpoint Implementation

**GitHub Issue**: #8
**Issue Title**: 1.5.3: Add session deletion endpoint
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/8
**Artifact ID**: FLC-004-202605151515
**Created**: 2026-05-15 15:15
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-004-202605151500-[Analysis]-issue-8-session-deletion.md`

---

## Context

### Current Codebase State
The French Language Coach backend is a FastAPI application with SQLAlchemy async for database operations. Session management currently supports:
- POST /sessions/ - Create a new session
- GET /sessions/ - List all sessions with pagination
- GET /sessions/{id} - Retrieve a specific session

The DELETE endpoint is missing to complete CRUD operations.

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `routers/sessions.py` | Session router with existing endpoints | Lines 127-139: get_session() pattern to follow |
| `models/session.py` | Session SQLAlchemy model | Session class with all fields |
| `database.py` | Database session management | get_db() dependency |
| `schemas/session.py` | Pydantic schemas | SessionResponse, SessionSummary |
| `tests/conftest.py` | Test fixtures | test_db, client fixtures |
| `tests/test_sessions_listing.py` | Existing session tests | Test patterns to follow |

### Existing Patterns

1. **Endpoint pattern**: All endpoints use `async def` with `db: AsyncSession = Depends(get_db)`
2. **Error handling**: Use `HTTPException(status_code=404, detail="...")` for not found
3. **Database operations**: Use `await db.get()`, `db.add()`, `await db.commit()`, `await db.refresh()`
4. **Session retrieval**: `session = await db.get(SessionModel, session_id)` then check if None

---

## Goal

**Primary Objective**: Implement DELETE /sessions/{id} endpoint that:
- Deletes a session from the database
- Returns 204 No Content on success
- Returns 404 if session not found
- Actually removes the record from the database

**Secondary Objectives**:
- Create comprehensive tests (unit + integration)
- Maintain 80%+ test coverage
- Follow existing code patterns
- Update documentation if needed

---

## Constraints

### Architecture Constraints
- Must use FastAPI and SQLAlchemy async
- Must follow existing router structure in `routers/sessions.py`
- Must use the existing `get_db` dependency
- Must use the existing `SessionModel` from `models.session.py`

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must match existing codebase indentation and naming conventions
- Must include docstring for the endpoint
- Must use type hints

### Testing Constraints
- Must create integration tests using `TestClient`
- Must test both success (204) and failure (404) cases
- Must test edge cases (non-existent ID)
- Must achieve 80%+ coverage for modified files

### Acceptance Criteria
From GitHub issue #8:
- [ ] Endpoint: DELETE /sessions/{id}
- [ ] Returns 204 on success
- [ ] Returns 404 if session not found
- [ ] Actually removes record from DB

---

## Examples

### Input/Output Examples

1. **Successful deletion**
   - Input: DELETE /sessions/1 (where session 1 exists)
   - Expected Output: HTTP 204 No Content
   - Side effect: Session 1 is removed from database

2. **Non-existent session**
   - Input: DELETE /sessions/999 (where session 999 doesn't exist)
   - Expected Output: HTTP 404 Not Found with detail "Session not found"
   - Side effect: No changes to database

### Edge Cases
- Invalid session ID (non-integer): FastAPI returns 422 Validation Error (automatic)
- Session with messages and feedback: Should still delete (stored as JSON, no foreign keys)
- Concurrent deletion requests: SQLAlchemy handles transaction isolation

### Test Cases

```python
# Test successful deletion
async def test_delete_session_success(client, test_db):
    # Given: A session exists
    # Create a session first
    session = SessionModel(
        scenario_id="cafe_order",
        difficulty="intermediate",
        created_at=datetime.utcnow(),
        messages="[]",
    )
    test_db.add(session)
    await test_db.commit()
    await test_db.refresh(session)
    session_id = session.id
    
    # When: DELETE /sessions/{id}
    response = client.delete(f"/sessions/{session_id}")
    
    # Then: Returns 204
    assert response.status_code == 204
    
    # And: Session is removed from DB
    deleted = await test_db.get(SessionModel, session_id)
    assert deleted is None

# Test non-existent session
async def test_delete_session_not_found(client, test_db):
    # Given: No session with ID 999
    
    # When: DELETE /sessions/999
    response = client.delete("/sessions/999")
    
    # Then: Returns 404
    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"
```

---

## Deliverables

### Code Changes
- [ ] `routers/sessions.py` - Add DELETE /sessions/{id} endpoint

### Tests
- [ ] `tests/test_session_deletion.py` - Integration tests for DELETE endpoint
  - Test successful deletion (204)
  - Test non-existent session (404)
  - Test invalid ID handling (422)

### Documentation
- [ ] Verify if README.md needs updates (API documentation)

---

## Actual Prompt

```
Implement DELETE /sessions/{id} endpoint for the French Language Coach backend.

CONTEXT:
- FastAPI backend with SQLAlchemy async
- Existing endpoints: POST /sessions/, GET /sessions/, GET /sessions/{id}
- Models: SessionModel in models/session.py with id, scenario_id, difficulty, created_at, ended_at, messages, feedback
- Database: SQLite with async operations via get_db dependency
- Pattern: Use `await db.get(SessionModel, session_id)` for lookup, `db.delete(session)` for deletion, `await db.commit()`

GOAL:
- Add DELETE /sessions/{id} endpoint to routers/sessions.py
- Returns 204 No Content on success
- Returns 404 with detail "Session not found" if session doesn't exist
- Actually removes the record from the database

CONSTRAINTS:
- Follow existing code patterns in routers/sessions.py
- Use async/await for all database operations
- Use HTTPException for 404 errors
- Return Response with status_code=204 for success
- Must import Response from fastapi

EXAMPLES:
Example 1 - Success:
  DELETE /sessions/1 → 204 No Content, session removed from DB

Example 2 - Not found:
  DELETE /sessions/999 → 404 Not Found, { "detail": "Session not found" }

ACCEPTANCE CRITERIA (from issue #8):
- [ ] Endpoint: DELETE /sessions/{id}
- [ ] Returns 204 on success
- [ ] Returns 404 if session not found
- [ ] Actually removes record from DB

DELIVERABLES:
1. Modified routers/sessions.py with DELETE endpoint
2. New test file tests/test_session_deletion.py with:
   - test_delete_session_success
   - test_delete_session_not_found
   - test_delete_session_invalid_id (optional, FastAPI handles)
3. All tests must pass with 80%+ coverage

IMPLEMENTATION GUIDANCE:
Follow the pattern from get_session() endpoint (lines 127-139 in routers/sessions.py):
```python
@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db)
) -> SessionResponse:
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    # ... return session
```

For DELETE, replace with:
```python
@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    await db.commit()
    return Response(status_code=204)
```

Don't forget to import Response from fastapi at the top of the file.
```

---

## AI Response

[To be filled after implementation]

---

## Human Review Notes

[To be filled after human review]

### Changes Made
- [ ] None yet

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [ ] None yet

---

## Verification

- [ ] All acceptance criteria from issue #8 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
