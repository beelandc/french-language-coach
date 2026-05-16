# SPDD Prompt: Session Deletion UI Implementation

**GitHub Issue**: #149
**Issue Title**: Add ability to delete sessions from history list and detail view
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/149
**Artifact ID**: FLC-008-202605160030
**Created**: 2026-05-16 00:30
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-008-202605160000-[Analysis]-issue-149-session-deletion-ui.md`

---

## Context

### Current Codebase State

The French Language Coach project has:
- Backend: FastAPI with DELETE /sessions/{id} endpoint (issue #8) that returns 204 (success), 400 (active session), or 404 (not found)
- Frontend: React + TypeScript with SessionHistory and SessionDetail components (issue #145, #17)
- SessionHistory lists past sessions using SessionHistoryItem components
- SessionDetail shows full session details with messages and feedback
- API client in utils/api.ts with existing methods for session operations

### Relevant Files

| File | Purpose | Key Elements |
|------|---------|--------------|
| `frontend/src/utils/api.ts` | API client | sessionApi object with create, sendMessage, getFeedback, getSession, listSessions |
| `frontend/src/components/SessionHistory.tsx` | Session list container | Manages sessions state, loading, error states |
| `frontend/src/components/SessionHistoryItem.tsx` | Single session display | Shows scenario name, date, score, handles click |
| `frontend/src/components/SessionDetail.tsx` | Session detail view | Shows messages, feedback, has Back button |
| `frontend/src/types/index.ts` | TypeScript types | SessionSummary, Session interfaces |
| `frontend/src/styles/global.css` | Global styles | btn-primary, btn-secondary, btn-danger classes |
| `routers/sessions.py` | Backend endpoint | DELETE /sessions/{id} returns 204, 400, 404 |

### Existing Patterns

- **API calls**: Use sessionApi methods that wrap the generic api() function with proper error handling
- **Error handling**: try/catch blocks with user-friendly error messages stored in state
- **Loading states**: useState boolean flags (isLoading) with conditional rendering
- **Styling**: CSS classes like btn-primary, btn-secondary, btn-danger in global.css
- **Component structure**: Functional components with TypeScript interfaces, JSDoc comments
- **Testing**: vitest with @testing-library/react, mock functions, describe/it blocks
- **Navigation**: useNavigate from react-router-dom for redirects

---

## Goal

**Primary Objective**: Implement session deletion functionality in the frontend, allowing users to delete sessions from both the Session History list and the Session Detail view.

**Secondary Objectives**:
- Create reusable ConfirmationModal component
- Add deleteSession API function
- Update SessionHistoryItem to include delete button
- Update SessionDetail to include delete button with redirect
- Update SessionHistory to handle session removal from list
- Add necessary styles for delete buttons and modal
- Create comprehensive tests (80%+ coverage)

---

## Constraints

### Architecture Constraints
- Must use existing DELETE /sessions/{id} endpoint
- Must follow existing React + TypeScript patterns
- Must use existing styling patterns from global.css
- Must integrate with existing component hierarchy

### Code Quality Constraints
- Must follow existing code style (2-space indent, semicolons)
- Must include JSDoc comments for all components
- Must use TypeScript interfaces for all props
- Must handle all error cases gracefully
- Must match existing patterns exactly

### Testing Constraints
- Must create tests for all new functionality
- Must achieve 80%+ coverage per new/modified component
- Must test all acceptance criteria from issue #149
- Must use existing test patterns (vitest, @testing-library/react)

### Acceptance Criteria (from Issue #149)

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

---

## Examples

### User Flow Examples

1. **Delete from Session History**:
   - User sees list of sessions
   - User clicks delete button on "Ordering at a Café" session
   - Modal appears: "Delete Session: Ordering at a Café (May 15, 2026)? This cannot be undone."
   - Modal has Cancel (btn-secondary) and Delete (btn-danger) buttons
   - User clicks Delete → DELETE /sessions/123 called
   - On 204 → Session removed from list instantly, success message "Session deleted successfully" shown

2. **Delete from Session Detail**:
   - User views /sessions/123 (Ordering at a Café)
   - Delete button visible in session-actions area
   - User clicks Delete → Same modal as above
   - User confirms → DELETE /sessions/123 called
   - On 204 → Redirect to / (home page)

3. **Active Session**:
   - User views session with ended_at: null
   - Delete button is disabled (opacity: 0.5, cursor: not-allowed)
   - Tooltip on hover: "Cannot delete active session"

4. **Error Handling**:
   - DELETE /sessions/999 (not found) → Modal closes, error "Session not found" shown
   - DELETE /sessions/1 (active) → Modal closes, error "Cannot delete active session" shown
   - Network error → Modal closes, error "Failed to delete session" shown

### Edge Cases

- Clicking delete multiple times quickly → Only first click triggers (button disabled after first click)
- Session deleted while detail view loading → Handle 404 gracefully
- Deleting last session from history → Show empty state "No sessions yet"
- Modal keyboard navigation → Escape closes, Enter on Delete confirms, Tab navigates

### Test Cases

```typescript
// SessionHistoryItem.test.tsx additions
describe('Delete functionality', () => {
  it('renders delete button for completed session', () => {
    // Given: completed session
    // When: rendered
    // Then: delete button visible
  })

  it('disables delete button for active session', () => {
    // Given: active session (ended_at null)
    // When: rendered
    // Then: delete button disabled
  })

  it('opens confirmation modal on delete click', () => {
    // Given: completed session
    // When: delete button clicked
    // Then: modal visible with correct info
  })
})

// SessionDetail.test.tsx additions
describe('Delete functionality', () => {
  it('renders delete button for completed session', () => {
    // Given: completed session
    // When: rendered
    // Then: delete button visible
  })

  it('redirects to home on successful delete', () => {
    // Given: completed session
    // When: delete confirmed
    // Then: navigate('/') called
  })
})

// ConfirmationModal.test.tsx
describe('ConfirmationModal', () => {
  it('renders with correct message', () => {
    // Given: props
    // When: rendered
    // Then: displays message
  })

  it('calls onConfirm when Delete clicked', () => {
    // Given: onConfirm mock
    // When: Delete button clicked
    // Then: onConfirm called
  })

  it('calls onCancel when Cancel clicked', () => {
    // Given: onCancel mock
    // When: Cancel button clicked
    // Then: onCancel called
  })
})
```

---

## Deliverables

### Code Changes

- [ ] `frontend/src/utils/api.ts` - Add deleteSession function to sessionApi
- [ ] `frontend/src/components/ConfirmationModal.tsx` - New reusable component
- [ ] `frontend/src/components/ConfirmationModal.test.tsx` - Tests for modal
- [ ] `frontend/src/components/SessionHistoryItem.tsx` - Add delete button and modal trigger
- [ ] `frontend/src/components/SessionHistoryItem.test.tsx` - Add delete tests
- [ ] `frontend/src/components/SessionDetail.tsx` - Add delete button and redirect
- [ ] `frontend/src/components/SessionDetail.test.tsx` - Add delete tests
- [ ] `frontend/src/components/SessionHistory.tsx` - Handle session removal from list
- [ ] `frontend/src/components/SessionHistory.test.tsx` - Add delete tests
- [ ] `frontend/src/styles/global.css` - Add modal and delete button styles
- [ ] `frontend/src/types/index.ts` - Add modal-related types if needed
- [ ] `frontend/src/components/index.ts` - Export ConfirmationModal

### Tests

- [ ] Unit tests for ConfirmationModal
- [ ] Unit tests for deleteSession API function
- [ ] Integration tests for delete in SessionHistoryItem
- [ ] Integration tests for delete in SessionDetail
- [ ] Edge case tests (active session, not found, network error)
- [ ] Coverage >= 80% for all new/modified files

### Documentation

- [ ] JSDoc comments for all new components/functions
- [ ] Update this prompt document with actual implementation
- [ ] Verify all acceptance criteria met

---

## Actual Prompt

```
Implement session deletion UI for French Language Coach (GitHub Issue #149).

CONTEXT:
- Backend DELETE /sessions/{id} endpoint exists (204 success, 400 active, 404 not found)
- Frontend has SessionHistory, SessionHistoryItem, SessionDetail components
- API client in utils/api.ts with existing sessionApi methods
- Styling in global.css with btn-primary, btn-secondary, btn-danger
- Need reusable ConfirmationModal component

GOAL:
- Allow users to delete sessions from SessionHistory list and SessionDetail view
- Show confirmation modal with session info before delete
- Handle success/error states properly
- Disable for active sessions
- Meet all acceptance criteria from issue #149

CONSTRAINTS:
- Must use existing patterns (React + TypeScript, hooks, JSDoc)
- Must use existing styling classes where possible
- Must handle all error cases (400, 404, network errors)
- Must achieve 80%+ test coverage for all new/modified files
- Must follow existing code style exactly

ACCEPTANCE CRITERIA (Issue #149):
1. Delete button on each SessionHistoryItem (visible for completed sessions)
2. Delete button on SessionDetail view (visible for completed sessions)
3. Confirmation modal with scenario name, date, "cannot be undone" warning
4. Delete calls DELETE /sessions/{id} endpoint
5. On success in history list: remove from UI + show success message
6. On success in detail view: redirect to home page
7. Handle errors with appropriate messages
8. Disable delete for active sessions (ended_at is null)
9. Loading state while delete in progress

EXAMPLES:
- Delete from history: Modal shows "Delete Session: Ordering at a Café (May 15)? This cannot be undone." → Confirm → Remove from list → "Session deleted successfully"
- Delete from detail: Same modal → Confirm → Redirect to /
- Active session: Delete button disabled with tooltip
- Error: Modal closes, show error message, session stays in UI

DELIVERABLES:
1. ConfirmationModal component (reusable, TypeScript)
2. deleteSession in sessionApi (utils/api.ts)
3. Updated SessionHistoryItem with delete button
4. Updated SessionDetail with delete button + redirect
5. Updated SessionHistory to remove deleted sessions from list
6. Modal and button styles in global.css
7. Comprehensive tests for all new functionality (80%+ coverage)
8. All JSDoc comments

IMPLEMENTATION ORDER:
1. Add deleteSession to api.ts
2. Create ConfirmationModal component + tests
3. Update SessionHistoryItem + tests
4. Update SessionDetail + tests  
5. Update SessionHistory to handle removal
6. Add styles
7. Verify all tests pass
```

---

## AI Response

[To be filled after implementation]

---

## Human Review Notes

[To be filled after human review]

### Changes Made
- [ ] [Change description and reason]

### Quality Checks
- [ ] All acceptance criteria met
- [ ] Tests pass at 80%+ coverage
- [ ] Code follows existing patterns
- [ ] Documentation complete

### Issues Found
- [ ] [Issue description and resolution]

---

## Verification

- [ ] All acceptance criteria from issue #149 are met
- [ ] Tests pass with 80%+ coverage for all new/modified files
- [ ] Code follows project conventions
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
