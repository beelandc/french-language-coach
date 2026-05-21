# SPDD Prompt: Loading States and Disabled Buttons (Issue #19)

**GitHub Issue**: #19
**Issue Title**: 1.5.7: Add loading states and disabled buttons
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/19
**Artifact ID**: FLC-013-202605211235
**Created**: 2026-05-21 12:35
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-013-202605211229-[Analysis]-issue-19-loading-states.md`

---

## Context

### Current Codebase State
The French Language Coach is a React + TypeScript frontend application with a FastAPI backend. The chat interface currently has partial loading state support:

- **useSessions Hook** (`frontend/src/hooks/useSessions.tsx`): Manages `isLoading` state and correctly sets it during API calls to `sendMessage` and `getFeedback`
- **ChatInterface Component** (`frontend/src/components/ChatInterface.tsx`): Computes `isLoading = isSessionsLoading || isSending` and disables the Send button when loading
- **ChatHeader Component** (`frontend/src/components/ChatHeader.tsx`): Has a `disabled` prop but it only receives `!sessionId || sessionEnded` (missing `isLoading`)
- **Global CSS** (`frontend/src/styles/global.css`): Has button styles and loading-state class but no spinner animation

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/src/components/ChatInterface.tsx` | Main chat UI, handles message input | Lines 13, 46, 128-129: isLoading computation, ChatHeader props, Send button disabled |
| `frontend/src/components/ChatHeader.tsx` | Header with Back/End Session buttons | Lines 6-11: End Session button with disabled prop |
| `frontend/src/styles/global.css` | Global styles | Lines 1-724: Existing button, chat, and loading styles |
| `frontend/src/hooks/useSessions.tsx` | Session state management | Lines 44-104: isLoading state management in sendMessage |

### Existing Patterns
- **State Management**: Loading state managed in useSessions context, consumed by components
- **Button Disabling**: `disabled={isLoading}` pattern used on Send button
- **Conditional Rendering**: `{condition && <Component />}` pattern for empty/error states
- **Styling**: Global CSS with BEM-like class naming
- **Accessibility**: Existing error messages use semantic HTML

---

## Goal

**Primary Objective**: Implement visible loading spinner and ensure all relevant buttons are disabled during AI response processing.

**Secondary Objectives**:
- Add CSS spinner animation
- Pass loading state to ChatHeader for End Session button
- Ensure spinner is accessible (ARIA attributes)
- Maintain existing functionality

---

## Constraints

### Architecture Constraints
- Must follow existing React + TypeScript patterns
- Must use existing `isLoading` state from useSessions hook
- Must not modify backend code
- Must maintain component composition (ChatInterface -> ChatHeader)
- Must not break existing functionality

### Code Quality Constraints
- Must follow TypeScript type safety
- Must match existing code style (2-space indentation, semicolons)
- Must include proper ARIA attributes for accessibility
- Must be responsive (work on mobile and desktop)

### Testing Constraints
- Must create tests achieving 80%+ coverage for new code
- Must use vitest and @testing-library/react
- Must test loading state display
- Must test button disabled states
- Must test loading state cleanup

### Acceptance Criteria
From GitHub issue #19:
- [ ] Spinner visible during AI response
- [ ] Send button disabled during loading
- [ ] End session button disabled during loading
- [ ] Loading state clears on response or error
- [ ] Visual feedback is clear

**Note**: AC2 and AC4 are already implemented in the codebase.

---

## Examples

### Input/Output Examples

1. **User sends a message**
   - Input: User types "Bonjour" and clicks Send
   - Current behavior: Send button disabled (✓), but no spinner visible (✗), End Session button enabled (✗)
   - Expected behavior: Send button disabled (✓), spinner visible (✓), End Session button disabled (✓)
   - Output: After AI responds (1-2 seconds), spinner disappears, both buttons re-enabled

2. **Network error during message send**
   - Input: User sends message, network fails
   - Expected: Spinner visible, buttons disabled, error message shown, spinner disappears, buttons re-enabled

3. **Rapid button clicks**
   - Input: User clicks Send button 5 times quickly
   - Expected: First click triggers request, subsequent 4 clicks ignored (button disabled)

### Edge Cases
- Session ends while loading (loading state should still clear)
- Component unmounts during loading (no errors should occur)
- Multiple sessions open in different tabs (state should be isolated per session)
- Screen reader users (spinner should have proper ARIA labels)

### Test Cases
```typescript
// Test 1: Spinner appears when loading
describe('ChatInterface loading state', () => {
  it('displays spinner when isLoading is true', () => {
    // Given: isLoading = true
    // When: Component renders
    // Then: Spinner is visible
  })

// Test 2: Buttons disabled when loading
  it('disables Send and End Session buttons when loading', () => {
    // Given: isLoading = true
    // When: Component renders
    // Then: Send button has disabled attribute
    // And: End Session button has disabled attribute
  })

// Test 3: Loading state clears on success
  it('hides spinner and enables buttons after successful response', () => {
    // Given: isLoading = true, then API responds
    // When: Response received
    // Then: isLoading = false, spinner hidden, buttons enabled
  })

// Test 4: Loading state clears on error
  it('hides spinner and enables buttons after error', () => {
    // Given: isLoading = true, then API errors
    // When: Error caught
    // Then: isLoading = false, spinner hidden, buttons enabled, error shown
  })
})
```

---

## Deliverables

### Code Changes
- [ ] `frontend/src/styles/global.css` - Add spinner animation CSS
- [ ] `frontend/src/components/ChatInterface.tsx` - Add spinner display, update ChatHeader disabled prop
- [ ] `frontend/src/components/ChatHeader.tsx` - No changes needed (already accepts disabled prop)

### Tests
- [ ] `frontend/src/components/ChatInterface.test.tsx` - Tests for spinner display and button states
- [ ] Update existing tests if needed

### Documentation
- [ ] No README.md update needed (no API changes)
- [ ] No new docstrings needed (changes are self-explanatory)

---

## Actual Prompt

**EXACT PROMPT TO BE USED FOR IMPLEMENTATION:**

```
Implement loading states and disabled buttons for issue #19.

CONTEXT:
- Project: French Language Coach (React + TypeScript frontend)
- Current codebase: frontend/src/components/ChatInterface.tsx already has isLoading state
- useSessions hook (frontend/src/hooks/useSessions.tsx) already manages isLoading during API calls
- Send button is already disabled when isLoading (AC2 done)
- Loading state already clears on response/error (AC4 done)
- Missing: Visible spinner, End Session button disabled during loading

RELEVANT CODE:

File: frontend/src/components/ChatInterface.tsx
- Line 13: const isLoading = isSessionsLoading || isSending
- Line 46-50: <ChatHeader disabled={!sessionId || sessionEnded} ... />
- Line 128-129: <button disabled={isLoading}>Send</button>
- Lines 105-110: Conditional rendering pattern for empty state

File: frontend/src/components/ChatHeader.tsx
- Lines 6-11: <button className="btn-danger" onClick={onEndSession} disabled={disabled}>

File: frontend/src/styles/global.css
- Has .loading-state class (line ~560) but no spinner animation
- Has button styles (.btn-primary, .btn-danger)

GOAL:
- Add visible spinner during AI response (AC1)
- Disable End Session button during loading (AC3)
- Ensure visual feedback is clear (AC5)

CONSTRAINTS:
- Use existing isLoading state from useSessions hook
- Do not modify backend
- Maintain TypeScript type safety
- Add ARIA attributes for accessibility
- Follow existing code patterns
- 80% test coverage required

EXAMPLES:
1. User sends message → Spinner appears in chat area, Send button disabled, End Session button disabled
2. AI responds → Spinner disappears, buttons re-enabled
3. Error occurs → Spinner disappears, buttons re-enabled, error shown

ACCEPTANCE CRITERIA (from issue #19):
- [ ] Spinner visible during AI response
- [ ] Send button disabled during loading (ALREADY DONE)
- [ ] End session button disabled during loading
- [ ] Loading state clears on response or error (ALREADY DONE)
- [ ] Visual feedback is clear

IMPLEMENTATION REQUIREMENTS:

1. CSS (global.css):
   - Add @keyframes for spinner animation
   - Add .spinner or .loading-spinner class with animation
   - Use brand colors (#4a90e2 primary blue)

2. ChatInterface.tsx:
   - Add spinner display: {isLoading && <div className="spinner" aria-label="Loading..." />}
   - Update ChatHeader disabled prop: disabled={!sessionId || sessionEnded || isLoading}
   - Position spinner appropriately in chat-messages area

3. ChatHeader.tsx:
   - NO CHANGES NEEDED (already uses disabled prop correctly)

DELIVERABLES:
- Modified: frontend/src/styles/global.css (add spinner styles)
- Modified: frontend/src/components/ChatInterface.tsx (add spinner, update disabled prop)
- New: frontend/src/components/ChatInterface.test.tsx (if doesn't exist) or update existing tests

TESTS NEEDED:
- Test spinner appears when isLoading=true
- Test spinner hidden when isLoading=false
- Test End Session button disabled when isLoading=true
- Test End Session button enabled when isLoading=false && sessionId exists && !sessionEnded
- Test Send button already disabled (existing behavior)
- Test loading state clears on success (existing behavior)
- Test loading state clears on error (existing behavior)

ADDITIONAL NOTES:
- The Back button should remain enabled (users can navigate away while loading)
- Spinner should appear in the chat-messages div, near the bottom
- Use CSS-only solution (no new dependencies)
- Spinner size: ~30-40px diameter
```

---

## Human Review Notes

### Changes Made
- [ ] Spinner CSS animation added to global.css
- [ ] Spinner element added to ChatInterface.tsx with ARIA label
- [ ] ChatHeader disabled prop updated to include isLoading

### Quality Checks
- [ ] Code follows existing TypeScript/React patterns
- [ ] All acceptance criteria from issue #19 are met
- [ ] No breaking changes to existing functionality
- [ ] Buttons properly disabled during loading
- [ ] Spinner visible and appropriately positioned
- [ ] ARIA attributes added for accessibility
- [ ] Responsive design maintained

### Issues Found
- [ ] None anticipated - implementation is straightforward

### Verification Plan
1. Manual test: Send message, verify spinner appears and buttons disabled
2. Manual test: Receive response, verify spinner disappears and buttons enabled
3. Manual test: Trigger error, verify spinner disappears and buttons enabled
4. Automated tests: All new tests pass with 80%+ coverage
5. Accessibility: Screen reader announces loading state
6. Responsive: Spinner visible on mobile and desktop

---

## Verification Checklist

- [ ] All acceptance criteria from issue #19 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions (TypeScript, React hooks, existing patterns)
- [ ] No sensitive data or API keys in code
- [ ] Documentation is complete (no README update needed)
- [ ] Backward compatibility maintained
- [ ] Human review completed
- [ ] Accessibility requirements met (ARIA labels)
- [ ] Responsive design verified
