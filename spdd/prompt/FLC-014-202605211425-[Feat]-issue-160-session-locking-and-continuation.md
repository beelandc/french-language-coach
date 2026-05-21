# SPDD Prompt: Session Locking and Continuation Feature

**GitHub Issue**: #160
**Issue Title**: Bug: Cannot delete or continue incomplete sessions from Session History
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/160
**Artifact ID**: FLC-014-202605211425
**Created**: 2026-05-21 14:25
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: FLC-014-202605211424-[Analysis]-issue-160-session-locking-and-continuation.md

---

## Context

### Current Codebase State

The French Language Coach application is a full-stack web application with:
- **Backend**: FastAPI with SQLAlchemy async, SQLite database
- **Frontend**: React with TypeScript, functional components with hooks
- **Current Session Management**: 
  - Sessions can be created, listed, retrieved, and deleted
  - Delete is blocked for active sessions (ended_at is NULL)
  - No session continuation capability for incomplete sessions
  - No session locking mechanism

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `models/session.py` | SQLAlchemy Session model | id, scenario_id, difficulty, created_at, ended_at, messages, feedback |
| `routers/sessions.py` | FastAPI session endpoints | POST /, GET /, GET /{id}, DELETE /{id} |
| `schemas/session.py` | Pydantic schemas | SessionCreate, SessionResponse, SessionSummary |
| `frontend/src/types/index.ts` | TypeScript type definitions | Session, Message, Feedback interfaces |
| `frontend/src/components/SessionHistoryItem.tsx` | Session list item component | Delete button disabled when ended_at === null |
| `frontend/src/components/SessionDetail.tsx` | Session detail view | Read-only, delete button only for completed sessions |
| `frontend/src/components/ChatInterface.tsx` | Main chat component | Handles messaging, no lock management |
| `frontend/src/hooks/useSessions.tsx` | React hook for session state | createSession, sendMessage, getFeedback, endSession |
| `tests/test_session_deletion.py` | Backend tests | Tests for delete endpoint with active session check |

### Existing Patterns

- **Backend endpoints**: Async functions with dependency injection (`db: AsyncSession = Depends(get_db)`)
- **Model properties**: Helper properties like `messages_list`, `feedback_dict` for JSON fields
- **Frontend types**: TypeScript interfaces with optional fields for nullable database fields
- **Component patterns**: Functional components with useState, useEffect, useCallback hooks
- **API calls**: Centralized in `utils/api.ts` with axios instance
- **Testing**: pytest for backend with async test fixtures, jest for frontend

---

## Goal

**Primary Objective**: Implement session locking and continuation functionality to allow users to:
1. Delete incomplete sessions (ended_at = null) when not in use
2. Continue incomplete sessions from the SessionDetail view
3. Prevent deletion only when sessions are actively locked (in use by ChatInterface)

**Secondary Objectives**:
- Maintain backward compatibility with existing functionality
- Implement auto-unlock TTL (10 minutes) for abandoned locks
- Ensure locking works across browser tabs via backend state
- Achieve 80%+ test coverage for all new code

---

## Constraints

### Architecture Constraints
- Must follow existing FastAPI + SQLAlchemy async patterns
- Must follow existing React + TypeScript patterns
- Must use existing database setup (SQLite with async SQLAlchemy)
- Must not introduce breaking changes to existing API contracts
- Must maintain existing test patterns

### Code Quality Constraints
- Backend: PEP 8 style guide, type hints, docstrings for public functions
- Frontend: TypeScript, consistent naming (camelCase), proper typing
- Both: 80% minimum test coverage per module
- Both: Match existing code style and patterns

### Testing Constraints
- Must create unit and integration tests for all new endpoints
- Must create tests for new UI behavior
- Must update existing tests that assume old behavior (active session deletion)
- Must test edge cases: TTL expiry, race conditions, network errors

### Acceptance Criteria

All acceptance criteria from issue #160 must be met:
1. Users can delete incomplete sessions (where ended_at === null) when not locked
2. Users can continue incomplete sessions from SessionDetail view
3. Delete button is disabled ONLY when session is locked (in active use)
4. Sessions are automatically locked when loaded in ChatInterface
5. Sessions are automatically unlocked when user leaves ChatInterface
6. Locking works across browser tabs (backend state)
7. Abandoned locks auto-unlock after reasonable TTL (e.g., 10 minutes)
8. Confirmation dialog warns when deleting incomplete sessions
9. "Continue Session" button visible in SessionDetail for incomplete sessions
10. All existing functionality preserved

---

## Examples

### Input/Output Examples

**Example 1: Lock a session**
```
Request: POST /sessions/1/lock
Headers: { client_id: "abc123" }
Response: 200 OK
Body: { "is_locked": true, "locked_at": "2026-05-21T14:25:00Z", "locked_by": "abc123" }
```

**Example 2: Delete incomplete session (not locked)**
```
Request: DELETE /sessions/1
Session state: { ended_at: null, is_locked: false }
Response: 204 No Content
```

**Example 3: Delete incomplete session (locked)**
```
Request: DELETE /sessions/1
Session state: { ended_at: null, is_locked: true }
Response: 400 Bad Request
Body: { "detail": "Cannot delete locked session" }
```

**Example 4: Lock with expired TTL**
```
Request: POST /sessions/1/lock
Session state: { locked_at: "2026-05-21T14:00:00Z" }  # 15+ min old
Response: 200 OK
Body: { "is_locked": true, "locked_at": "2026-05-21T14:25:00Z", "locked_by": "newclient" }
```

### Edge Cases

- **Race condition**: Two simultaneous lock requests for same session - first wins
- **TTL during use**: Lock expires while user is in ChatInterface - should refresh lock
- **Network error on unlock**: Lock remains, auto-unlock via TTL
- **Continue locked session**: User tries to continue their own locked session - show error or auto-unlock
- **Multiple tabs**: Same session open in multiple tabs - first gets lock, others show warning

### Test Cases

```python
# Backend test: Lock endpoint
@pytest.mark.asyncio
async def test_lock_session_success(client, test_db):
    # Given: Session exists
    session = SessionModel(...)
    test_db.add(session)
    await test_db.commit()
    
    # When: POST /sessions/{id}/lock
    response = client.post(f"/sessions/{session.id}/lock")
    
    # Then: Returns 200, session is locked
    assert response.status_code == 200
    assert response.json()["is_locked"] == True

# Backend test: Unlock endpoint
@pytest.mark.asyncio
async def test_unlock_session_success(client, test_db):
    # Given: Locked session exists
    session = SessionModel(is_locked=True, locked_at=datetime.utcnow())
    test_db.add(session)
    await test_db.commit()
    
    # When: POST /sessions/{id}/unlock
    response = client.post(f"/sessions/{session.id}/unlock")
    
    # Then: Returns 200, session is unlocked
    assert response.status_code == 200
    assert response.json()["is_locked"] == False

# Backend test: Delete with lock check
@pytest.mark.asyncio
async def test_delete_locked_session_fails(client, test_db):
    # Given: Locked session exists
    session = SessionModel(ended_at=None, is_locked=True)
    test_db.add(session)
    await test_db.commit()
    
    # When: DELETE /sessions/{id}
    response = client.delete(f"/sessions/{session.id}")
    
    # Then: Returns 400
    assert response.status_code == 400
    assert "locked" in response.json()["detail"].lower()

# Backend test: TTL auto-unlock
@pytest.mark.asyncio
async def test_lock_with_expired_ttl(client, test_db):
    # Given: Session locked 15 minutes ago
    session = SessionModel(
        is_locked=True,
        locked_at=datetime.utcnow() - timedelta(minutes=15)
    )
    test_db.add(session)
    await test_db.commit()
    
    # When: POST /sessions/{id}/lock (new client)
    response = client.post(f"/sessions/{session.id}/lock")
    
    # Then: Returns 200, lock acquired by new client
    assert response.status_code == 200
    assert response.json()["is_locked"] == True
```

---

## Deliverables

### Code Changes

**Backend:**
- [ ] `models/session.py` - Add is_locked (Boolean, default=False), locked_at (DateTime, nullable=True), locked_by (String, nullable=True)
- [ ] `routers/sessions.py` - Add POST /sessions/{id}/lock endpoint
- [ ] `routers/sessions.py` - Add POST /sessions/{id}/unlock endpoint
- [ ] `routers/sessions.py` - Update DELETE /sessions/{id} to check is_locked instead of ended_at
- [ ] `routers/sessions.py` - Update GET /sessions/{id} to include is_locked, locked_at, locked_by in response
- [ ] `routers/sessions.py` - Update GET /sessions/ to include is_locked, locked_at, locked_by in list items
- [ ] `schemas/session.py` - Add is_locked, locked_at, locked_by to SessionResponse and SessionSummary

**Frontend:**
- [ ] `frontend/src/types/index.ts` - Add is_locked, locked_at, locked_by to Session and SessionSummary interfaces
- [ ] `frontend/src/utils/api.ts` - Add lockSession and unlockSession API methods
- [ ] `frontend/src/hooks/useSessions.tsx` - Add lockSession, unlockSession, refreshLock methods
- [ ] `frontend/src/components/ChatInterface.tsx` - Add useEffect to lock on mount, unlock on unmount
- [ ] `frontend/src/components/SessionHistoryItem.tsx` - Update delete button logic to check is_locked, update tooltip
- [ ] `frontend/src/components/SessionDetail.tsx` - Add Continue Session button, update delete button logic
- [ ] `frontend/src/components/ConfirmationModal.tsx` or update usage - Add warning for incomplete session deletion

### Tests

**Backend Tests:**
- [ ] Test lock endpoint success
- [ ] Test lock endpoint on already locked session
- [ ] Test lock endpoint with expired TTL
- [ ] Test unlock endpoint success
- [ ] Test unlock endpoint on unlocked session
- [ ] Test delete with is_locked check (update existing test)
- [ ] Test delete with is_locked=true fails
- [ ] Test TTL auto-unlock behavior

**Frontend Tests:**
- [ ] Test SessionHistoryItem delete button enabled for incomplete, unlocked sessions
- [ ] Test SessionHistoryItem delete button disabled for locked sessions
- [ ] Test SessionDetail Continue Session button visible for incomplete sessions
- [ ] Test SessionDetail Continue Session navigation
- [ ] Test ChatInterface lock on mount
- [ ] Test ChatInterface unlock on unmount
- [ ] Test confirmation modal for incomplete session deletion

### Documentation

- [ ] Update README.md with new endpoints (POST /sessions/{id}/lock, POST /sessions/{id}/unlock)
- [ ] Update Session model docstring with new fields
- [ ] Add docstrings to new functions
- [ ] Update TypeScript interface comments

---

## Actual Prompt

[This section contains the exact prompt text that will be used to drive implementation.]

```
You are Mistral Vibe, an expert full-stack developer working on the French Language Coach project.

CONTEXT:
- Project: French Language Coach (full-stack web app)
- Backend: FastAPI, SQLAlchemy async, SQLite
- Frontend: React, TypeScript
- Issue: #160 - Cannot delete or continue incomplete sessions from Session History
- Analysis: FLC-014-202605211424-[Analysis]-issue-160-session-locking-and-continuation.md

CURRENT STATE:
- Session model: models/session.py with fields: id, scenario_id, difficulty, created_at, ended_at, messages, feedback
- Delete session endpoint: DELETE /sessions/{id} currently blocks deletion if ended_at is None
- SessionHistoryItem: Delete button disabled when ended_at === null
- SessionDetail: Read-only view, no Continue Session button
- ChatInterface: No session locking mechanism

GOAL:
Implement session locking and continuation feature with the following changes:

BACKEND CHANGES:
1. Add fields to Session model:
   - is_locked: Boolean, default=False
   - locked_at: DateTime, nullable=True
   - locked_by: String(255), nullable=True

2. Add new endpoints to routers/sessions.py:
   - POST /sessions/{session_id}/lock
     * Check if session exists (404 if not)
     * If session is already locked AND locked_at > 10 min ago, auto-unlock
     * Set is_locked=True, locked_at=now(), locked_by=client_id from request
     * Return 200 with updated session info
   - POST /sessions/{session_id}/unlock
     * Check if session exists (404 if not)
     * Set is_locked=False, locked_at=None, locked_by=None
     * Return 200 with updated session info

3. Update existing endpoints:
   - DELETE /sessions/{session_id}:
     * Change check from `if session.ended_at is None: raise 400`
     * To: `if session.is_locked: raise 400 with detail "Cannot delete locked session"`
   - GET /sessions/{session_id}:
     * Include is_locked, locked_at, locked_by in response
   - GET /sessions/:
     * Include is_locked, locked_at, locked_by in SessionSummary

4. Update schemas/session.py:
   - Add is_locked: bool, locked_at: Optional[datetime], locked_by: Optional[str] to SessionResponse
   - Add is_locked: bool, locked_at: Optional[datetime], locked_by: Optional[str] to SessionSummary

FRONTEND CHANGES:
1. Update types/index.ts:
   - Add is_locked: boolean, locked_at: string | null, locked_by: string | null to Session interface
   - Add same fields to SessionSummary interface

2. Update utils/api.ts:
   - Add lockSession(sessionId: string): Promise<{ is_locked: boolean, locked_at: string, locked_by: string }>
   - Add unlockSession(sessionId: string): Promise<{ is_locked: boolean, locked_at: string | null, locked_by: string | null }>

3. Update hooks/useSessions.tsx:
   - Add lockSession(sessionId: string): Promise<void>
   - Add unlockSession(sessionId: string): Promise<void>
   - Export these in SessionsContextType

4. Update components/ChatInterface.tsx:
   - Add useEffect to lock session on mount: lockSession(sessionId)
   - Add useEffect cleanup to unlock session on unmount: unlockSession(sessionId)
   - Handle errors gracefully (show warning but don't block)

5. Update components/SessionHistoryItem.tsx:
   - Change delete button disabled check from `isActiveSession` (ended_at === null)
   - To: `session.is_locked === true`
   - Update tooltip: if locked, show "Session is currently in use by another tab"
   - Update confirmation modal message for incomplete sessions:
     * If session.ended_at === null, add: "This is an incomplete session. Deleting it will permanently remove all conversation data."

6. Update components/SessionDetail.tsx:
   - Add "Continue Session" button for sessions where ended_at === null
   - Button should navigate to /chat/{sessionId}
   - Button should be hidden if session.ended_at !== null
   - Update delete button to check is_locked instead of ended_at
   - Update delete button tooltip to mention locked status
   - Update confirmation modal message for incomplete sessions

CONSTRAINTS:
- Follow existing code patterns exactly
- Backend: PEP 8, type hints, async/await, FastAPI patterns
- Frontend: TypeScript, camelCase naming, React hooks
- Tests: 80%+ coverage required
- No breaking changes to existing API
- All acceptance criteria from issue #160 must be met

EXAMPLES:
- Lock: POST /sessions/1/lock -> 200 {is_locked: true, locked_at: "...", locked_by: "..."}
- Unlock: POST /sessions/1/unlock -> 200 {is_locked: false, locked_at: null, locked_by: null}
- Delete unlocked incomplete: DELETE /sessions/1 -> 204 (success)
- Delete locked: DELETE /sessions/1 -> 400 {detail: "Cannot delete locked session"}
- Continue Session: Navigate to /chat/1 when button clicked

ACCEPTANCE CRITERIA (from issue #160):
- [ ] Users can delete incomplete sessions (where ended_at === null) when not locked
- [ ] Users can continue incomplete sessions from SessionDetail view
- [ ] Delete button is disabled ONLY when session is locked (in active use)
- [ ] Sessions are automatically locked when loaded in ChatInterface
- [ ] Sessions are automatically unlocked when user leaves ChatInterface
- [ ] Locking works across browser tabs (backend state)
- [ ] Abandoned locks auto-unlock after reasonable TTL (e.g., 10 minutes)
- [ ] Confirmation dialog warns when deleting incomplete sessions
- [ ] "Continue Session" button visible in SessionDetail for incomplete sessions
- [ ] All existing functionality preserved

DELIVERABLES:
1. Updated backend models, schemas, routers
2. New lock/unlock endpoints
3. Updated frontend types, API client, hooks, components
4. Tests for all new functionality (80%+ coverage)
5. Updated README.md with new endpoints

IMPLEMENTATION ORDER:
1. Backend model changes (add fields)
2. Backend schema changes
3. Backend router changes (new endpoints, update existing)
4. Backend tests
5. Frontend type changes
6. Frontend API client changes
7. Frontend hook changes
8. Frontend component changes (SessionHistoryItem, SessionDetail, ChatInterface)
9. Frontend tests
10. Documentation updates
```

---

## AI Response

[To be filled after implementation]

---

## Human Review Notes

[To be filled after implementation]

### Changes Made
- [ ] List of changes made during/after AI implementation

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [ ] List of issues found and their resolutions

---

## Verification

- [ ] All acceptance criteria from issue #160 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
