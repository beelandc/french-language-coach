# SPDD Analysis: Session Deletion Endpoint Tests

**GitHub Issue**: #9
**Issue Title**: 1.5.3-T: Test session deletion
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/9
**Artifact ID**: FLC-006-202605152000
**Created**: 2026-05-15 20:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Tests for session deletion endpoint.

## Acceptance Criteria

- [ ] Test 204 response for valid session
- [ ] Test 404 response for non-existent session
- [ ] Test DB record is actually removed
- [ ] Test cannot delete active session

---

## Background

Issue #8 implemented the DELETE /sessions/{id} endpoint with basic functionality (204 on success, 404 on not found, actual DB removal). Issue #9 focuses on creating comprehensive tests for this endpoint. However, upon analysis, one acceptance criterion ("Test cannot delete active session") reveals a missing business rule: the current implementation does not prevent deletion of active (non-ended) sessions.

This analysis covers both:
1. The test requirements from issue #9
2. The implicit code requirement to prevent deletion of active sessions

The Session model has an `ended_at` field (DateTime, nullable=True) where NULL indicates an active/in-progress session.

---

## Business Value

- **Quality Assurance**: Ensures session deletion works correctly in all scenarios
- **Data Integrity**: Prevents accidental deletion of active sessions that users may still be using
- **Test Coverage**: Meets the 80%+ coverage requirement for the sessions router
- **User Protection**: Protects users from losing in-progress conversation data

---

## Scope In

- [ ] Integration tests for DELETE /sessions/{id} endpoint
- [ ] Test: 204 response for valid (ended) session deletion
- [ ] Test: 404 response for non-existent session
- [ ] Test: Verify DB record is actually removed
- [ ] Test: 400/403 response when attempting to delete active session
- [ ] Code: Add check in delete_session endpoint to prevent deletion of active sessions
- [ ] Code: Return appropriate error (400 Bad Request with detail) for active session deletion attempts

## Scope Out

- [ ] Frontend UI changes (separate issue)
- [ ] User authentication/authorization (out of scope for Phase 1.5)
- [ ] Soft delete implementation (not required - actual deletion is specified)
- [ ] Cascade delete for related entities (not needed - messages/feedback stored as JSON)

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session Model** (`models/session.py`): SQLAlchemy model with `id`, `scenario_id`, `difficulty`, `created_at`, `ended_at` (nullable), `messages`, `feedback`
- **Session Router** (`routers/sessions.py`): FastAPI router with DELETE /sessions/{id} endpoint (line 151-169)
- **Session Schema** (`schemas/session.py`): Pydantic schemas for session data
- **Test Client** (`tests/conftest.py`): pytest fixtures for async database and FastAPI test client
- **Existing Tests** (`tests/test_session_deletion.py`): 5 test cases covering basic deletion scenarios

### New Concepts Required

- **Active Session**: A session where `ended_at` is NULL, indicating it is still in progress
- **Active Session Protection**: Business rule preventing deletion of sessions with NULL `ended_at`

### Key Business Rules

- Deleting a session removes it permanently from the database
- DELETE is idempotent - deleting a non-existent session returns 404
- **Active sessions cannot be deleted** - sessions with `ended_at IS NULL` must return an error
- Deletion of ended sessions (where `ended_at IS NOT NULL`) is allowed

---

## Strategic Approach

### Solution Direction

1. **Code Change**: Modify `delete_session` endpoint in `routers/sessions.py` to check if session is active
   - If `session.ended_at is None`, raise HTTPException(400, detail="Cannot delete active session")
   - Otherwise, proceed with deletion

2. **Test Implementation**: Add test case in `tests/test_session_deletion.py`
   - Create a session without setting `ended_at` (active session)
   - Attempt to delete it
   - Verify 400 response with appropriate error message

3. **Verify Existing Tests**: Confirm all acceptance criteria are covered:
   - Test 204 for valid session: EXISTS (`test_delete_session_success`)
   - Test 404 for non-existent: EXISTS (`test_delete_session_not_found`)
   - Test DB removal: EXISTS (verified in multiple tests)
   - Test cannot delete active: NEEDS TO BE ADDED

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Error code for active session | 400 (Bad Request) vs 403 (Forbidden) vs 409 (Conflict) | Use 400 - deleting an active session is a client error (invalid operation) |
| Error message | Generic vs specific | Use specific: "Cannot delete active session" |
| Check placement | Before or after session lookup | After lookup, before deletion |

### Alternatives Considered

- **403 Forbidden**: Rejected - 403 implies authorization issue, but this is a business rule violation
- **409 Conflict**: Rejected - 409 is for concurrent modification conflicts, not business rules
- **Allow deletion with warning**: Rejected - acceptance criteria implies prevention, not warning
- **Soft delete for active sessions**: Rejected - out of scope, actual deletion is required

---

## REASONS Canvas

### Requirements
From GitHub issue #9 acceptance criteria:
- Test 204 response for valid session
- Test 404 response for non-existent session
- Test DB record is actually removed
- Test cannot delete active session

Implicit requirement discovered through analysis:
- Implement business rule: active sessions (ended_at IS NULL) cannot be deleted

### Examples

**Example 1: Successful deletion of ended session**
- Given: Session with ID 1 exists with ended_at = "2026-05-15T18:00:00"
- When: DELETE /sessions/1
- Then: Returns 204, session is removed from database

**Example 2: Attempt to delete active session**
- Given: Session with ID 2 exists with ended_at = NULL
- When: DELETE /sessions/2
- Then: Returns 400 with detail "Cannot delete active session", session remains in database

**Example 3: Non-existent session**
- Given: No session with ID 999 exists
- When: DELETE /sessions/999
- Then: Returns 404 with detail "Session not found"

### Architecture
- **Backend**: FastAPI with SQLAlchemy async
- **Pattern**: Follow existing router structure in `routers/sessions.py`
- **Database**: SQLite with async operations
- **Error handling**: Use HTTPException for validation errors
- **Testing**: pytest with async support, using TestClient

### Standards
- **Coding**: PEP 8, match existing codebase style (snake_case, type hints, docstrings)
- **Testing**: 80%+ coverage, follow existing patterns in `tests/test_session_deletion.py`
- **Documentation**: Docstring for endpoint, update README if API behavior changes
- **Naming**: Use existing patterns (test_delete_session_*, test_*)

### Omissions
- No user authentication check (Phase 1.5 explicitly excludes auth)
- No soft delete implementation (acceptance criteria specifies actual removal)
- No cascade delete handling (not needed, JSON columns)
- No frontend implementation (separate issue)
- No E2E test (not required for backend tests)

### Notes
- The Session model's `ended_at` field is nullable, with NULL indicating active/in-progress
- The existing `test_session_deletion.py` has 5 tests but misses the active session case
- Pattern reference: GET /sessions/{id} in routers/sessions.py (lines 127-139) for session lookup pattern
- Test pattern reference: tests/test_session_deletion.py for existing test structure
- Need to verify test coverage after adding new test

### Solutions
- **Code reference**: DELETE /sessions/{id} endpoint in `routers/sessions.py` (lines 151-169)
- **Pattern to follow**: Add validation check after session lookup, before deletion:
  ```python
  if session.ended_at is None:
      raise HTTPException(status_code=400, detail="Cannot delete active session")
  ```
- **Test pattern**: Follow existing test structure in `tests/test_session_deletion.py`
- **Reference implementation**: Similar validation pattern in POST /sessions/{id}/feedback (checks if session exists)

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | Clarification | Recommendation |
|-----------|---------------|----------------|
| "Active session" definition | What constitutes an active session? | Session where ended_at IS NULL |
| Error code for active session deletion | Which HTTP status to return? | 400 Bad Request (client error) |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Session ID doesn't exist | Should not cause server error | Return 404 |
| Invalid session ID (non-integer) | FastAPI handles validation | Return 422 |
| Active session (ended_at = NULL) | Prevent accidental data loss | Return 400 |
| Ended session (ended_at != NULL) | Normal deletion | Return 204 |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Breaking existing tests | New validation might affect existing tests | Review all existing tests, ensure they create ended sessions |
| Test coverage below 80% | Doesn't meet project requirements | Add comprehensive test for active session case |
| Incorrect error handling | Poor user experience | Follow existing HTTPException patterns |

### Acceptance Criteria Coverage

| AC# | Description | Status | Gaps/Notes |
|-----|-------------|--------|------------|
| AC1 | Test 204 response for valid session | ✅ Covered | EXISTS in test_delete_session_success |
| AC2 | Test 404 response for non-existent session | ✅ Covered | EXISTS in test_delete_session_not_found |
| AC3 | Test DB record is actually removed | ✅ Covered | Verified in test_delete_session_success and test_delete_session_with_messages_and_feedback |
| AC4 | Test cannot delete active session | ❌ Missing | NEEDS: Code change + test case |

**AC Coverage Summary**: 3 of 4 ACs are currently covered. 1 AC requires implementation.

**Implicit Requirements Not in ACs**:
- Must implement business rule preventing active session deletion
- Must return appropriate HTTP error code and message
- Must maintain backward compatibility (existing valid deletions still work)
- Must follow existing code patterns

---

## Dependencies

- **Issue #8**: Session deletion endpoint implementation (COMPLETE - already merged to main)
- **Blockers**: None identified
- **Related**: None identified

---

## Next Steps

1. **Phase 3: Prompt Engineering** - Create prompt artifact for code and test implementation
2. **Phase 4: Iterative Development** - Implement active session check and test
3. **Phase 5: Validation** - Run all tests, verify 80%+ coverage
4. **Phase 6: Documentation** - Update docstrings if needed

---

*Analysis complete. Ready for prompt engineering and implementation.*
