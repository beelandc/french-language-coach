# SPDD Analysis: Session Locking and Continuation Feature

**GitHub Issue**: #160
**Issue Title**: Bug: Cannot delete or continue incomplete sessions from Session History
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/160
**Artifact ID**: FLC-014-202605211424
**Created**: 2026-05-21 14:24
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Currently, when a user starts a conversation but leaves the conversation screen before pressing the "End Session" button, they encounter the following issues:

1. The Delete button for the session in Session History is greyed-out and un-clickable
2. Selecting "Click to view details" button brings user to a read-only Session Detail view
3. There is NO way to "End Session" and generate the Feedback Report from the Session Detail view
4. There is NO way to continue the conversation from the Session Detail view
5. Users are unable to delete these abandoned session records

This creates a poor user experience where incomplete sessions accumulate and cannot be managed.

## Background

The current implementation prevents deletion of sessions where `ended_at === null` (incomplete sessions) as a safety measure to prevent accidental deletion of active sessions. However, this approach is too restrictive because:

- It doesn't distinguish between "currently in use" vs "abandoned but incomplete"
- It prevents users from managing their own abandoned sessions
- It provides no way to continue incomplete sessions

The proposed solution introduces a session locking mechanism that:
- Allows deletion of incomplete sessions when not in active use
- Prevents deletion only when a session is currently locked (in use by a ChatInterface)
- Enables users to continue incomplete sessions from the SessionDetail view
- Works across browser tabs via backend state

## Business Value

- **Improved UX**: Users can now manage their incomplete sessions (delete or continue)
- **Safety**: Prevents accidental deletion of sessions currently in use
- **Cross-tab Support**: Locking works across multiple browser tabs via backend state
- **Clean Session Management**: Users can clean up abandoned session records
- **Session Recovery**: Users can resume conversations they accidentally left

## Scope In

### Backend Changes
- [ ] Add `is_locked` boolean field to Session model (default: false)
- [ ] Add `locked_at` timestamp field to Session model (for auto-unlock TTL)
- [ ] Add `locked_by` field to track which client/user has the lock (optional but recommended)
- [ ] Create new endpoint: `POST /sessions/{session_id}/lock`
- [ ] Create new endpoint: `POST /sessions/{session_id}/unlock`
- [ ] Update `DELETE /sessions/{session_id}` to check `is_locked` instead of `ended_at`
- [ ] Add auto-unlock TTL logic (10 minutes)
- [ ] Update Session schemas to include new fields

### Frontend Changes
- [ ] Update Session model/types to include `is_locked` and `locked_at` fields
- [ ] Update SessionHistoryItem to check `is_locked` instead of `ended_at` for delete button
- [ ] Add "Continue Session" button in SessionDetail component for incomplete sessions
- [ ] Update ChatInterface to lock session on mount, unlock on unmount
- [ ] Add lock/unlock API calls
- [ ] Add confirmation modal for deleting incomplete sessions with warning
- [ ] Update delete button tooltip to show "Session is currently in use by another tab" when locked

### UI/UX Changes
- [ ] Delete button enabled for incomplete sessions when not locked
- [ ] Delete button disabled ONLY when session.is_locked === true
- [ ] "Continue Session" button visible in SessionDetail for incomplete sessions
- [ ] Confirmation dialog warns when deleting incomplete sessions
- [ ] Tooltip on disabled delete: "Session is currently in use by another tab"

## Scope Out

- [ ] User authentication/authorization (out of scope for current phase)
- [ ] Session sharing between users (not applicable to single-user app)
- [ ] Automatic session cleanup/archival (separate feature)
- [ ] Real-time lock status updates via WebSockets (polling is sufficient for now)
- [ ] Mobile-specific UI adjustments (will inherit from responsive design)

---

## Acceptance Criteria (ACs)

1. **AC-1**: Users can delete incomplete sessions (where ended_at === null) when not locked
   - **Given** A session exists with ended_at = null and is_locked = false
   - **When** User clicks delete button in SessionHistoryItem
   - **Then** Session is deleted successfully

2. **AC-2**: Users can continue incomplete sessions from SessionDetail view
   - **Given** A session exists with ended_at = null
   - **When** User views session in SessionDetail and clicks "Continue Session"
   - **Then** User is navigated to /chat/{sessionId}

3. **AC-3**: Delete button is disabled ONLY when session is locked (in active use)
   - **Given** A session exists with is_locked = true
   - **When** User views session in SessionHistoryItem
   - **Then** Delete button is disabled

4. **AC-4**: Sessions are automatically locked when loaded in ChatInterface
   - **Given** User navigates to /chat/{sessionId}
   - **When** ChatInterface component mounts
   - **Then** Session is locked via backend API

5. **AC-5**: Sessions are automatically unlocked when user leaves ChatInterface
   - **Given** A locked session
   - **When** User navigates away from /chat/{sessionId} or component unmounts
   - **Then** Session is unlocked via backend API

6. **AC-6**: Locking works across browser tabs (backend state)
   - **Given** Session is locked in Tab A
   - **When** User opens SessionHistory in Tab B
   - **Then** Delete button is disabled in Tab B

7. **AC-7**: Abandoned locks auto-unlock after reasonable TTL (e.g., 10 minutes)
   - **Given** Session was locked more than 10 minutes ago
   - **When** User attempts to lock it again
   - **Then** Previous lock is ignored and new lock is created

8. **AC-8**: Confirmation dialog warns when deleting incomplete sessions
   - **Given** User clicks delete on incomplete session (ended_at = null)
   - **When** Confirmation modal is shown
   - **Then** Warning message indicates this is an incomplete session

9. **AC-9**: "Continue Session" button visible in SessionDetail for incomplete sessions
   - **Given** Session with ended_at = null
   - **When** User views SessionDetail
   - **Then** "Continue Session" button is displayed and clickable

10. **AC-10**: All existing functionality preserved
    - **Given** All existing features
    - **When** Changes are deployed
    - **Then** No regressions in existing behavior

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session Model** (`models/session.py`): Database model for conversation sessions with fields: id, scenario_id, difficulty, created_at, ended_at, messages, feedback
- **Sessions Router** (`routers/sessions.py`): FastAPI router with endpoints: POST /, GET /, GET /{id}, DELETE /{id}
- **SessionHistoryItem** (`frontend/src/components/SessionHistoryItem.tsx`): React component displaying individual session in history with delete button disabled when ended_at === null
- **SessionDetail** (`frontend/src/components/SessionDetail.tsx`): Read-only view of session details with delete button only for completed sessions
- **ChatInterface** (`frontend/src/components/ChatInterface.tsx`): Main chat component for conversing with AI
- **useSessions Hook** (`frontend/src/hooks/useSessions.tsx`): React hook managing session state

### New Concepts Required

- **Session Lock**: A boolean flag indicating whether a session is currently in use by a ChatInterface
- **Lock Timestamp**: When the session was locked, used for TTL-based auto-unlock
- **Lock Owner**: Identifier for which client/user has the lock (optional, for debugging)
- **Lock API**: Endpoints for acquiring and releasing session locks
- **Continue Session Action**: Ability to resume an incomplete session from SessionDetail

### Key Business Rules

1. **Locking Rule**: A session can only be locked by one client at a time
2. **TTL Rule**: Locks automatically expire after 10 minutes to prevent deadlocks
3. **Deletion Safety Rule**: Sessions can only be deleted when not locked
4. **Continuation Rule**: Only incomplete sessions (ended_at = null) can be continued
5. **Display Rule**: "Continue Session" button only shown for incomplete sessions
6. **Warning Rule**: Deleting incomplete sessions requires explicit confirmation

---

## Strategic Approach

### Solution Direction

The implementation will follow a **backend-driven locking mechanism** with frontend integration:

1. **Backend First**: Add locking fields to Session model and create lock/unlock endpoints
2. **Frontend Integration**: Update ChatInterface to manage locks, update UI components to respect locks
3. **Auto-Unlock**: Implement TTL-based auto-unlock in backend
4. **UI Updates**: Add Continue Session button and update delete logic

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Backend vs Frontend Locking** | Backend: Works across tabs, reliable. Frontend: Simpler, but doesn't work across tabs | **Backend locking** - essential for cross-tab support |
| **TTL Duration** | Too short: Locks expire too quickly. Too long: Abandoned sessions remain locked | **10 minutes** - reasonable balance |
| **Lock Owner Tracking** | Adds complexity, but helps with debugging and potential multi-user scenarios | **Include locked_by field** - optional string field for client identifier |
| **Auto-unlock on TTL** | Can be implemented via database query or application logic | **Application logic** - check locked_at on lock request, auto-unlock if expired |
| **Lock Check Frequency** | Polling vs WebSockets for real-time updates | **Polling** - simpler, sufficient for current needs |

### Alternatives Considered

**Alternative 1: Simple - Just Allow Deletion of Incomplete Sessions**
- Remove ended_at check from frontend and backend
- **Rejected**: Loses protection against accidental deletion of active sessions

**Alternative 2: Frontend-Only Lock**
- Track isInUse only in frontend state
- **Rejected**: Won't work across tabs, lock lost on refresh

**Alternative 3: Session Status Enum**
- Add status field: 'active', 'completed', 'abandoned'
- **Rejected**: More complex, still needs locking for in-use detection

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **Lock owner identifier** | What to use as locked_by value? | Use a random client ID or session storage ID |
| **TTL exact value** | What is the "reasonable TTL"? | Use 10 minutes as specified |
| **Lock check in SessionDetail** | Should SessionDetail also check lock status? | Yes, for consistency |
| **Navigation behavior** | What happens if user clicks Continue Session on a locked session? | Show error or unlock first? |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **Session locked, user tries to continue** | User might want to resume their own session | Unlock first, then navigate, or show error |
| **Lock TTL expires during session** | Session could be unlocked while user is still using it | Refresh lock periodically in ChatInterface |
| **Network error during lock/unlock** | Could leave session in inconsistent state | Implement retry logic, show warning to user |
| **Multiple tabs on same session** | User has same chat open in multiple tabs | First tab to mount gets lock, others show error |
| **Browser refresh in ChatInterface** | Lock should be refreshed on page reload | Re-lock on ChatInterface mount |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Race condition on lock** | Two requests could both acquire lock simultaneously | Use atomic database operations with proper isolation |
| **Dead locks** | Abandoned sessions remain locked forever | Auto-unlock TTL (10 minutes) |
| **State inconsistency** | Frontend thinks session is locked but backend doesn't | Always trust backend state, refresh on focus |
| **Performance impact** | Additional lock checks on every session operation | Minimal - simple boolean check |
| **Breaking existing tests** | Tests assume old behavior (cannot delete active sessions) | Update tests to match new behavior |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-1 | Delete incomplete when not locked | Yes | Requires backend lock check |
| AC-2 | Continue from SessionDetail | Yes | Add button and navigation |
| AC-3 | Delete disabled only when locked | Yes | Update SessionHistoryItem logic |
| AC-4 | Auto-lock on ChatInterface mount | Yes | Add useEffect hook |
| AC-5 | Auto-unlock on ChatInterface unmount | Yes | Add useEffect cleanup |
| AC-6 | Cross-tab locking | Yes | Backend state ensures this |
| AC-7 | Auto-unlock TTL | Yes | Check locked_at on lock attempt |
| AC-8 | Confirmation for incomplete deletion | Yes | Update confirmation modal message |
| AC-9 | Continue button visible | Yes | Add conditional rendering |
| AC-10 | No regressions | Yes | Maintain existing behavior |

**AC Coverage Summary**: 10 of 10 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Lock refresh on periodic basis in ChatInterface to prevent TTL expiry
- Error handling for lock/unlock API failures
- Visual feedback when lock is acquired/released
- Type safety for new fields across backend and frontend

---

## REASONS Canvas

### Requirements
From GitHub issue #160 acceptance criteria:
- Users can delete incomplete sessions (where ended_at === null) when not locked
- Users can continue incomplete sessions from SessionDetail view
- Delete button is disabled ONLY when session is locked (in active use)
- Sessions are automatically locked when loaded in ChatInterface
- Sessions are automatically unlocked when user leaves ChatInterface
- Locking works across browser tabs (backend state)
- Abandoned locks auto-unlock after reasonable TTL (e.g., 10 minutes)
- Confirmation dialog warns when deleting incomplete sessions
- "Continue Session" button visible in SessionDetail for incomplete sessions
- All existing functionality preserved

### Examples

**Example 1: Delete incomplete session**
- Input: User has incomplete session (ended_at = null, is_locked = false), clicks delete
- Expected: Confirmation modal appears with warning, on confirm session is deleted

**Example 2: Continue incomplete session**
- Input: User views incomplete session in SessionDetail, clicks "Continue Session"
- Expected: Navigated to /chat/{sessionId}, session is locked

**Example 3: Locked session in another tab**
- Input: Session locked in Tab A, user views SessionHistory in Tab B
- Expected: Delete button disabled with tooltip "Session is currently in use by another tab"

**Example 4: TTL expiry**
- Input: Session locked 15 minutes ago, user attempts to lock again
- Expected: Previous lock is ignored, new lock is acquired

### Architecture

**Existing codebase structure:**
- Backend: FastAPI with SQLAlchemy async
- Frontend: React with TypeScript
- Database: SQLite (async)
- State management: React hooks and context

**Patterns to follow:**
- Backend: FastAPI routers with dependency injection (routers/sessions.py pattern)
- Models: SQLAlchemy Base subclasses (models/session.py pattern)
- Schemas: Pydantic BaseModel (schemas/session.py pattern)
- Frontend: TypeScript interfaces in types/index.ts
- Components: Functional components with hooks
- Tests: pytest for backend, jest for frontend

**New endpoints needed:**
- POST /sessions/{session_id}/lock - Acquire lock on session
- POST /sessions/{session_id}/unlock - Release lock on session

**Modified endpoints:**
- DELETE /sessions/{session_id} - Change check from ended_at to is_locked
- GET /sessions/{session_id} - Include is_locked, locked_at, locked_by in response
- GET /sessions/ - Include is_locked, locked_at, locked_by in list items

### Standards

**Coding Standards:**
- Backend: PEP 8 style guide, type hints, async/await
- Frontend: TypeScript, consistent with existing codebase patterns
- Naming: snake_case for Python, camelCase for TypeScript
- Tests: 80% coverage minimum per module

**Test Coverage:**
- Unit tests for lock/unlock logic
- Integration tests for new endpoints
- Frontend tests for new UI components and behavior
- Edge case tests for race conditions, TTL expiry

**Documentation:**
- Docstrings for new functions
- Update README.md if new endpoints affect API usage
- Type annotations for TypeScript interfaces

### Omissions

**Explicitly out-of-scope:**
- User authentication/authorization (locked_by field is advisory only)
- Real-time lock status via WebSockets (polling is sufficient)
- Session archival/cleanup automation
- Multi-user session sharing
- Mobile-specific implementations

### Notes

**Implementation hints:**
- Session locking: Add nullable locked_at timestamp, check if locked_at is recent (< 10 min)
- Lock API: Simple POST endpoints that set/clear is_locked and locked_at
- TTL check: In lock endpoint, if locked_at > 10 min ago, treat as unlocked
- Frontend lock management: useEffect in ChatInterface for mount/unmount
- Cross-tab sync: Consider adding visibilitychange event listener
- Lock identifier: Use navigator.userAgent or crypto.randomUUID() for locked_by

**References:**
- Similar patterns in codebase: See routers/sessions.py for existing session endpoints
- TypeScript types: See frontend/src/types/index.ts for existing Session interface
- Database: See database.py for async SQLAlchemy setup
- Testing: See tests/test_session_deletion.py for endpoint test patterns

### Solutions

**Reference implementations to mimic:**
- Backend endpoint pattern: routers/sessions.py (create_session, delete_session)
- Model field addition: models/session.py (existing fields)
- Schema updates: schemas/session.py (SessionResponse)
- Frontend component patterns: SessionHistoryItem.tsx, SessionDetail.tsx
- Hook pattern: useSessions.tsx
- Test pattern: tests/test_session_deletion.py

**Libraries to use:**
- Backend: FastAPI, SQLAlchemy async, datetime
- Frontend: React hooks (useEffect, useCallback), axios for API calls
- Testing: pytest, httpx for backend; jest, @testing-library/react for frontend

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
