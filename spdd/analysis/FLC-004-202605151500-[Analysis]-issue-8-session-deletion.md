# SPDD Analysis: Session Deletion Endpoint

**GitHub Issue**: #8
**Issue Title**: 1.5.3: Add session deletion endpoint
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/8
**Artifact ID**: FLC-004-202605151500
**Created**: 2026-05-15 15:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Implement DELETE /sessions/{id} to remove a session from the database.

## Acceptance Criteria

- [ ] Endpoint: DELETE /sessions/{id}
- [ ] Returns 204 on success
- [ ] Returns 404 if session not found
- [ ] Actually removes record from DB

---

## Background

This feature enables users to delete their conversation sessions. This is a Phase 1.5 feature that completes the basic CRUD operations for the sessions resource. Currently, the application supports creating (POST), listing (GET /sessions/), and retrieving (GET /sessions/{id}) sessions. Deletion is the missing operation.

---

## Business Value

- **Data Management**: Users can remove unwanted or test sessions
- **Privacy**: Users have control over their data
- **Cleanup**: Removes clutter from the session list
- **CRUD Completion**: Completes the basic CRUD operations for sessions

---

## Scope In

- [ ] DELETE endpoint at /sessions/{id}
- [ ] Database record deletion
- [ ] Proper HTTP status codes (204, 404)
- [ ] Unit and integration tests
- [ ] Documentation updates if needed

## Scope Out

- [ ] Cascade deletion of related messages/feedback (handled by DB constraints)
- [ ] Soft delete functionality (using deleted_at timestamp) - not required
- [ ] User authentication/authorization (out of scope for Phase 1.5)
- [ ] Frontend UI for deletion (separate issue)

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session Model** (`models/session.py`): SQLAlchemy model with id, scenario_id, difficulty, created_at, ended_at, messages, feedback
- **Session Router** (`routers/sessions.py`): FastAPI router with POST /, GET /, GET /{id} endpoints
- **Database Session** (`database.py`): Async SQLAlchemy session management
- **HTTPException**: Used for error handling (404, 400 status codes)

### New Concepts Required

- **DELETE /sessions/{id}**: New endpoint for session deletion

### Key Business Rules

- Deleting a session removes it permanently from the database
- DELETE is idempotent - deleting a non-existent session should return 404
- No cascade delete needed (messages and feedback are stored as JSON in the session model)

---

## Strategic Approach

### Solution Direction

1. Add DELETE endpoint to `routers/sessions.py`
2. Query for the session by ID
3. If not found, return 404
4. If found, delete and commit
5. Return 204 No Content on success
6. Create integration tests for the endpoint
7. Verify 80%+ test coverage

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Return 204 vs 200 | 204 is standard for DELETE with no response body; 200 would allow returning deleted data | Use 204 (matches acceptance criteria) |
| Use db.delete() vs db.remove() | Both work; delete() is more explicit | Use db.delete(session) for clarity |
| Async deletion | All DB operations are async in this project | Follow existing async pattern |

### Alternatives Considered

- **Soft delete with deleted_at timestamp**: Rejected because acceptance criteria specifies "actually removes record from DB"
- **Return 200 with deleted data**: Rejected because acceptance criteria specifies 204
- **Cascade delete for related entities**: Not needed as messages/feedback are stored as JSON columns

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| None identified | All requirements are clear from acceptance criteria | Proceed as specified |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Session ID doesn't exist | Should not cause server error | Return 404 |
| Invalid session ID (non-integer) | FastAPI handles this automatically | Return 422 validation error |
| Session with related data | Messages/feedback stored as JSON, no foreign keys | Delete succeeds |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Async transaction issues | Deletion might not commit properly | Use existing pattern from POST /sessions/ |
| Test coverage below 80% | Doesn't meet project requirements | Write comprehensive tests |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Endpoint: DELETE /sessions/{id} | Yes | Will implement in routers/sessions.py |
| AC2 | Returns 204 on success | Yes | Standard DELETE response |
| AC3 | Returns 404 if session not found | Yes | Use HTTPException(status_code=404) |
| AC4 | Actually removes record from DB | Yes | Use db.delete() and await db.commit() |

**AC Coverage Summary**: 4 of 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Must follow existing code patterns in routers/sessions.py
- Must use async/await for database operations
- Must handle database errors gracefully
- Must maintain 80% test coverage

---

## REASONS Canvas

### Requirements
From GitHub issue #8 acceptance criteria:
- Endpoint: DELETE /sessions/{id}
- Returns 204 on success
- Returns 404 if session not found
- Actually removes record from DB

### Examples

**Example 1: Successful deletion**
- Given: Session with ID 1 exists
- When: DELETE /sessions/1
- Then: Returns 204, session is removed from database

**Example 2: Non-existent session**
- Given: No session with ID 999 exists
- When: DELETE /sessions/999
- Then: Returns 404 with detail "Session not found"

### Architecture
- **Backend**: FastAPI with SQLAlchemy async
- **Pattern**: Follow existing router structure (POST, GET patterns in routers/sessions.py)
- **Database**: SQLite with async operations
- **Error handling**: Use HTTPException for 404

### Standards
- **Coding**: PEP 8, match existing codebase style
- **Testing**: 80%+ coverage, pytest with async support
- **Documentation**: Docstrings for endpoint, update README if API changes
- **Naming**: Use snake_case for variables, PascalCase for classes

### Omissions
- No user authentication/authorization (Phase 1.5)
- No soft delete (acceptance criteria specifies actual removal)
- No cascade delete (not needed, JSON columns)
- No frontend implementation (separate issue)

### Notes
- Follow the pattern from GET /sessions/{id} for session lookup
- Use same database session management as other endpoints
- Pattern reference: routers/sessions.py lines 127-139 (get_session endpoint)
- See routers/messages.py for similar DELETE patterns if they exist

### Solutions
- **Reference implementation**: GET /sessions/{id} in routers/sessions.py (lines 127-139)
- **Pattern to follow**: 
  1. Get session by ID using `await db.get(SessionModel, session_id)`
  2. Check if session exists, raise HTTPException(404) if not
  3. Delete with `db.delete(session)`
  4. Commit with `await db.commit()`
  5. Return Response(status_code=204)
- **Test pattern**: Follow test_sessions_listing.py patterns

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
