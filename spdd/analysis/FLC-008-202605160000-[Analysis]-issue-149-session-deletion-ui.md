# SPDD Analysis: Session Deletion UI

**GitHub Issue**: #149
**Issue Title**: Add ability to delete sessions from history list and detail view
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/149
**Artifact ID**: FLC-008-202605160000
**Created**: 2026-05-16 00:00
**Author**: Mistral Vibe

---

## Original Business Requirement

Currently, users can view their past sessions in the Session History list and navigate to Session Detail view, but there is no way to delete unwanted sessions. Users need the ability to delete sessions they no longer want to keep, both from the history list and from the session detail view.

---

## Background

This feature extends the Session History feature (issue #145) and uses the existing DELETE /sessions/{id} endpoint (issue #8). It provides users with the ability to manage their session history by removing sessions they no longer need.

**Business Value**:
- Improved user experience: Users can clean up their session history
- Data management: Users can remove old or unwanted sessions
- Completeness: Fills a gap in the session management feature set

---

## Scope In

- [ ] Add delete button to each session item in the Session History list
- [ ] Add delete button to the Session Detail view
- [ ] Clicking delete button shows a confirmation dialog/modal
- [ ] Confirmation dialog includes: session scenario name, date, and warning that action cannot be undone
- [ ] Delete action calls DELETE /sessions/{id} endpoint
- [ ] On successful deletion, remove session from UI immediately
- [ ] On successful deletion from history list, show success message
- [ ] On successful deletion from detail view, redirect to home page
- [ ] Handle errors (e.g., cannot delete active session) with appropriate error messages
- [ ] Disable delete button for active sessions (ended_at is null)
- [ ] Loading state while delete request is in progress

## Scope Out

- [ ] Bulk delete functionality
- [ ] Undo/redo for deletions
- [ ] Soft delete / archive functionality
- [ ] User authentication/authorization checks (handled by backend)

---

## Acceptance Criteria (ACs)

1. **AC-149.1**: Delete button on Session History list items
   **Given** User is viewing session history
   **When** User sees a completed session
   **Then** A delete button is visible on each session item

2. **AC-149.2**: Delete button on Session Detail view
   **Given** User is viewing a session detail page
   **When** The session is completed
   **Then** A delete button is visible

3. **AC-149.3**: Confirmation dialog
   **Given** User clicks delete button
   **When** Delete is clicked
   **Then** A confirmation modal appears showing scenario name, date, and warning

4. **AC-149.4**: Delete calls endpoint
   **Given** User confirms deletion
   **When** Confirm is clicked
   **Then** DELETE /sessions/{id} is called

5. **AC-149.5**: Remove from UI on success (history list)
   **Given** User deletes from history list
   **When** Delete succeeds with 204
   **Then** Session is removed from the list immediately AND success message is shown

6. **AC-149.6**: Redirect on success (detail view)
   **Given** User deletes from detail view
   **When** Delete succeeds with 204
   **Then** User is redirected to home page

7. **AC-149.7**: Error handling
   **Given** Delete fails (e.g., 400 active session, 404 not found)
   **When** Error occurs
   **Then** Appropriate error message is displayed AND session remains in UI

8. **AC-149.8**: Disable for active sessions
   **Given** A session is active (ended_at is null)
   **When** User views the session
   **Then** Delete button is disabled AND shows tooltip/explanation

9. **AC-149.9**: Loading state
   **Given** Delete request is in progress
   **When** Request is pending
   **Then** Delete button shows loading indicator AND is disabled

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **DELETE /sessions/{id} endpoint**: `routers/sessions.py:206-225` - Returns 204 on success, 404 if not found, 400 if active
- **SessionHistory component**: `frontend/src/components/SessionHistory.tsx` - Lists sessions, handles loading/error/empty states
- **SessionHistoryItem component**: `frontend/src/components/SessionHistoryItem.tsx` - Displays single session, handles click
- **SessionDetail component**: `frontend/src/components/SessionDetail.tsx` - Shows full session with messages and feedback
- **sessionApi**: `frontend/src/utils/api.ts` - API client with listSessions, getSession methods
- **Session types**: `frontend/src/types/index.ts` - SessionSummary, Session interfaces
- **Styles**: `frontend/src/styles/global.css` - btn-danger, modal patterns available

### New Concepts Required

- **ConfirmationModal component**: New reusable component for delete confirmation
- **deleteSession API function**: Add to sessionApi in api.ts
- **Delete button styling**: Extend existing styles for delete buttons in session items

### Key Business Rules

- **Rule**: Active sessions (ended_at is NULL) cannot be deleted
- **Rule**: Delete is permanent and cannot be undone
- **Rule**: Only completed sessions (ended_at is not NULL) can be deleted
- **Rule**: Backend validates and prevents deletion of active sessions

---

## Strategic Approach

### Solution Direction

1. Create a reusable ConfirmationModal component
2. Add deleteSession function to sessionApi
3. Modify SessionHistoryItem to include delete button with confirmation
4. Modify SessionDetail to include delete button with confirmation and redirect
5. Update SessionHistory to handle session removal from list
6. Add necessary styles for delete buttons and modal
7. Create comprehensive tests for all new functionality

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Modal vs Inline confirmation | Modal: Better UX, interrupts flow. Inline: Less intrusive, harder to notice | Use modal - matches AC requirement for confirmation dialog |
| Redirect vs Show message on detail delete | Redirect: Cleaner, prevents 404 on refresh. Show message: User stays in context | Redirect to home - matches AC requirement |
| Optimistic vs Pessimistic updates | Optimistic: Faster UI, risk of rollback. Pessimistic: Slower, always accurate | Use optimistic for history list (instant removal), pessimistic for detail (redirect on success) |
| Custom modal vs Library modal | Custom: Full control, more work. Library: Faster, less customizable | Create custom modal to match existing styling |

### Alternatives Considered

- **Alternative**: Use toast notifications instead of modal - Rejected because AC explicitly requires confirmation dialog
- **Alternative**: Soft delete (archive) instead of hard delete - Rejected because out of scope and backend already implements hard delete
- **Alternative**: Bulk delete functionality - Rejected because explicitly out of scope

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Success message content | What should the success message say? | "Session deleted successfully" |
| Confirmation dialog styling | Should it match existing patterns? | Yes, use existing btn-danger style |
| Error message format | How should errors be displayed? | Use existing error-message class |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Deleting from detail view of non-existent session | Prevents 404 errors | Show error message, don't redirect |
| Network error during delete | User needs feedback | Show error message, keep session in UI |
| Clicking delete multiple times quickly | Prevents duplicate requests | Disable button during loading state |
| Session becomes active after page load | Race condition | Disable based on initial data, backend will reject anyway |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Backend endpoint changes | Delete functionality breaks | Use existing endpoint, verify contract |
| Modal doesn't close on error | Poor UX | Ensure error handling closes modal |
| Memory leaks in event handlers | Performance issues | Clean up event listeners, use useCallback |
| State inconsistency | UI shows wrong state | Use proper React state management |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-149.1 | Delete button on history list | Yes | Need to add to SessionHistoryItem |
| AC-149.2 | Delete button on detail view | Yes | Need to add to SessionDetail |
| AC-149.3 | Confirmation dialog | Yes | Create ConfirmationModal component |
| AC-149.4 | Delete calls endpoint | Yes | Add deleteSession to api.ts |
| AC-149.5 | Remove from UI (history) | Yes | Update SessionHistory state |
| AC-149.6 | Redirect on success (detail) | Yes | Use useNavigate |
| AC-149.7 | Error handling | Yes | Handle 400, 404 responses |
| AC-149.8 | Disable for active | Yes | Check ended_at field |
| AC-149.9 | Loading state | Yes | Add isDeleting state |

**AC Coverage Summary**: 9 of 9 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Confirmation dialog should have Cancel button
- Success/error messages should be user-friendly
- Modal should be accessible (focus management, keyboard navigation)

---

## REASONS Canvas

### Requirements
From GitHub issue #149 acceptance criteria:
- Add delete button to Session History list items
- Add delete button to Session Detail view
- Confirmation dialog with session info and warning
- Call DELETE /sessions/{id} endpoint
- Remove from UI on success
- Success messages/error handling
- Disable for active sessions
- Loading state

### Examples

1. **Delete from history list**:
   - User clicks delete on session "Ordering at a Café" (May 15, 88%)
   - Modal shows: "Delete Session: Ordering at a Café (May 15)? This cannot be undone."
   - User confirms → DELETE /sessions/123 called
   - On 204 → Session removed from list, "Session deleted successfully" shown

2. **Delete from detail view**:
   - User on /sessions/123 (Ordering at a Café)
   - Clicks Delete → Modal with same info
   - User confirms → DELETE /sessions/123 called
   - On 204 → Redirect to /

3. **Active session**:
   - User tries to delete active session
   - Delete button is disabled with tooltip "Cannot delete active session"

4. **Error handling**:
   - DELETE /sessions/999 (not found) → Show "Session not found"
   - DELETE /sessions/1 (active) → Show "Cannot delete active session"
   - Network error → Show "Failed to delete session"

### Architecture

**Existing patterns to follow**:
- API calls via sessionApi in utils/api.ts
- Error handling: try/catch with user-friendly messages
- Styling: global.css with btn-primary, btn-secondary, btn-danger classes
- Component structure: Reusable components in /components
- State management: useState, useEffect hooks
- Navigation: useNavigate from react-router-dom
- Types: TypeScript interfaces in /types

**Component hierarchy**:
```
HomePage → SessionHistory → SessionHistoryItem (with delete button)
SessionDetailPage → SessionDetail (with delete button)
ConfirmationModal (new, reusable)
```

### Standards

- **Coding**: TypeScript, React functional components with hooks
- **Testing**: vitest, @testing-library/react, 80%+ coverage
- **Documentation**: JSDoc comments for components and functions
- **Code Style**: Match existing patterns (2-space indent, semicolons)
- **Naming**: PascalCase for components, camelCase for variables/functions
- **Test Coverage**: Minimum 80% per component

### Omissions

- Bulk delete functionality
- Undo/redo for deletions
- Soft delete / archive functionality
- User authentication/authorization (backend handles)

### Notes

- Reuse existing DELETE /sessions/{id} endpoint (issue #8)
- Endpoint returns: 204 (success), 400 (active session), 404 (not found)
- Follow existing styling patterns for buttons and modals
- Follow existing error handling patterns
- Integrate with existing SessionHistory and SessionDetail components
- SessionHistory already has patterns for loading/error/empty states

### Solutions

**Reference implementations**:
- Error handling pattern: SessionDetail.tsx lines 47-56 (try/catch with error state)
- API call pattern: sessionApi in utils/api.ts (async/await with error handling)
- Styling pattern: btn-danger class in global.css
- Modal pattern: No existing modal, but styling patterns exist

**Patterns to mimic**:
- Button styling: .btn-danger for delete buttons
- Loading state: Similar to SessionHistory isLoading state
- Component props: TypeScript interfaces in types/index.ts

---

*Based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
