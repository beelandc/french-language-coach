# SPDD Analysis: Loading States and Disabled Buttons (Issue #19)

**GitHub Issue**: #19
**Issue Title**: 1.5.7: Add loading states and disabled buttons
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/19
**Artifact ID**: FLC-013-202605211229
**Created**: 2026-05-21 12:29
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Add loading spinners during AI response and disable send button while waiting.

---

## Background

This feature improves the user experience by providing clear visual feedback when the AI is processing a response. Currently, when a user sends a message, there is no visual indication that the system is waiting for an AI response, which can lead to confusion and potentially multiple submissions.

---

## Business Value

- **Improved UX**: Users understand the system is processing their request
- **Prevents duplicate submissions**: Disabled buttons prevent users from sending multiple messages while waiting
- **Clear state management**: Visual feedback reduces uncertainty
- **Professional appearance**: Loading indicators are standard in modern applications

---

## Scope In

- [ ] Add loading spinner component visible during AI response
- [ ] Disable Send button during loading state
- [ ] Disable End Session button during loading state
- [ ] Clear loading state on successful response
- [ ] Clear loading state on error
- [ ] Ensure visual feedback is clear and accessible

## Scope Out

- [ ] Backend changes (loading state is purely frontend)
- [ ] Authentication/authorization loading states
- [ ] Session creation loading (already handled by useSessions)
- [ ] Feedback retrieval loading (already handled by useSessions)
- [ ] Complex animations beyond basic spinner
- [ ] Progress indicators for upload/download

---

## Acceptance Criteria (ACs)

1. **AC1: Spinner visible during AI response**
   **Given** User sends a message
   **When** AI is processing the response
   **Then** A loading spinner is visible in the chat interface

2. **AC2: Send button disabled during loading**
   **Given** User sends a message
   **When** AI is processing the response
   **Then** The Send button is disabled

3. **AC3: End session button disabled during loading**
   **Given** User sends a message
   **When** AI is processing the response
   **Then** The End Session button is disabled

4. **AC4: Loading state clears on response or error**
   **Given** AI is processing a response
   **When** Response is received OR an error occurs
   **Then** Loading spinner is hidden, buttons are re-enabled

5. **AC5: Visual feedback is clear**
   **Given** Loading state is active
   **When** User looks at the interface
   **Then** The loading state is visually obvious and unmistakable

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **ChatInterface Component** (`frontend/src/components/ChatInterface.tsx`): Main chat UI component that handles message input and display
  - Already has `isSending` state for send button
  - Uses `isLoading` from `useSessions` hook
  - Has `handleSubmit` that manages loading state
  - Send button disabled prop: `disabled={isLoading}`

- **ChatHeader Component** (`frontend/src/components/ChatHeader.tsx`): Header with Back and End Session buttons
  - Has `disabled` prop passed from parent
  - End Session button uses this disabled prop

- **useSessions Hook** (`frontend/src/hooks/useSessions.tsx`): Manages session state
  - Has `isLoading` state at context level
  - `sendMessage` function sets `isLoading(true)` during API call
  - `getFeedback` function sets `isLoading(true)` during API call

- **Message Form** (in ChatInterface.tsx): Input and Send button
  - Input disabled: `disabled={sessionEnded || isLoading}`
  - Button disabled: `disabled={isLoading}`

### New Concepts Required

- **Spinner Component**: New UI component to display loading animation
  - Should be visually distinct and accessible
  - Should appear in appropriate location in chat interface

- **Loading State Management**: Enhanced state coordination between components
  - Need to ensure loading state is properly propagated to all relevant components

### Key Business Rules

- Loading state should be visible from the moment a request is sent until a response is received or an error occurs
- Disabled buttons should be visually distinct (already handled by CSS)
- Loading state should not block navigation (Back button should remain functional)
- Error state should clear loading state and show error message

---

## Strategic Approach

### Solution Direction

1. **Create Spinner Component**: Create a reusable spinner component or add spinner styles
2. **Update ChatInterface**: Add spinner display when `isLoading` is true
3. **Update ChatHeader**: Pass `isLoading` as disabled prop for End Session button
4. **Update CSS**: Add styles for spinner animation
5. **Ensure state cleanup**: Verify loading state clears on both success and error paths

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Spinner location | In message area vs near send button vs fixed overlay | Add spinner in chat-messages area (near where AI response will appear) |
| Spinner type | CSS-only animation vs image vs library | Use CSS-only animation for simplicity and no dependencies |
| Loading state source | Local component state vs global state | Use existing `isLoading` from useSessions hook (already tracks API calls) |
| Button disabled state | Pass isLoading prop vs derive from context | Pass `isLoading` prop to ChatHeader for End Session button |

### Alternatives Considered

- **Alternative 1**: Use a loading library like `react-spinners` - Rejected because adds dependency for simple feature
- **Alternative 2**: Show loading text instead of spinner - Rejected because spinner provides clearer visual feedback
- **Alternative 3**: Overlay spinner blocking entire UI - Rejected because Back button should remain functional

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Spinner location | Where exactly should spinner appear? | In the chat messages area, at the bottom before new message appears |
| Spinner style | What should the spinner look like? | Simple CSS-based spinning circle with brand colors |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Multiple rapid clicks | Could trigger multiple requests | Buttons disabled prevents this |
| Network timeout | Loading state should clear on error | Already handled by try/catch in useSessions |
| Component unmount during loading | Could cause state update on unmounted component | useSessions hook uses useCallback, should be safe |
| Session ended during loading | Should still show spinner until request completes | Loading state independent of sessionEnded |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| State synchronization issues | Buttons not properly disabled/enabled | Use single source of truth (isLoading from useSessions) |
| CSS conflicts | Spinner styles conflict with existing styles | Use specific class names and test on multiple screen sizes |
| Accessibility issues | Spinner not accessible to screen readers | Add ARIA attributes to spinner |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Spinner visible during AI response | Yes | Need to add spinner component and display logic |
| AC2 | Send button disabled during loading | **Already implemented** | ChatInterface already has `disabled={isLoading}` |
| AC3 | End session button disabled during loading | Partially | Need to pass isLoading to ChatHeader disabled prop |
| AC4 | Loading state clears on response or error | **Already implemented** | useSessions has finally blocks that set isLoading(false) |
| AC5 | Visual feedback is clear | Yes | Need to ensure spinner is visible and styled appropriately |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach. AC2 and AC4 are already implemented in the codebase.

**Implicit Requirements Not in ACs**:
- Spinner should be accessible (ARIA attributes)
- Loading state should work on all screen sizes (responsive)
- Existing functionality should not be broken

---

## REASONS Canvas

### Requirements
From GitHub issue #19 acceptance criteria:
- Spinner visible during AI response
- Send button disabled during loading
- End session button disabled during loading
- Loading state clears on response or error
- Visual feedback is clear

### Examples
1. User sends message "Bonjour"
   - Input: User types "Bonjour" and clicks Send
   - Expected: Spinner appears, Send button disabled, End Session button disabled
   - Output: After AI responds, spinner disappears, buttons re-enabled

2. User sends message and network error occurs
   - Input: User sends message, network fails
   - Expected: Spinner appears, buttons disabled, then error message shown, spinner disappears, buttons re-enabled

3. User clicks Send multiple times quickly
   - Input: Rapid clicks on Send button
   - Expected: First click works, subsequent clicks ignored (button disabled)

### Architecture
**Existing patterns to follow:**
- React hooks for state management (useSessions)
- TypeScript for type safety
- CSS modules/global CSS for styling
- Component composition (ChatInterface contains ChatHeader)
- State lifted to appropriate level (isLoading in useSessions context)

**Files to modify:**
- `frontend/src/components/ChatInterface.tsx` - Add spinner, pass isLoading to ChatHeader
- `frontend/src/components/ChatHeader.tsx` - Use disabled prop for End Session button
- `frontend/src/styles/global.css` - Add spinner animation styles

### Standards
- **Coding**: TypeScript, React hooks, PEP 8 equivalent for TypeScript
- **Testing**: 80% coverage minimum, vitest, @testing-library/react
- **Accessibility**: ARIA attributes, keyboard navigation, screen reader support
- **Documentation**: Docstrings for components, comments for complex logic
- **Code Review**: All PRs require approval, tests must pass

### Omissions
- Backend changes (frontend-only feature)
- Complex loading animations
- Progress percentage indicators
- Multiple spinner types for different contexts
- Loading state persistence across page refreshes

### Notes
**Implementation hints:**
- The `useSessions` hook already manages `isLoading` state correctly
- `sendMessage` and `getFeedback` both set `isLoading` appropriately
- ChatInterface already computes `isLoading = isSessionsLoading || isSending`
- Send button is already disabled when `isLoading` is true (AC2 already done)
- Input field is also disabled during loading
- Need to add spinner display in ChatInterface
- Need to pass `isLoading` to ChatHeader for End Session button (AC3)
- CSS needs spinner animation styles

**References:**
- Similar pattern in useSessions hook for loading state management
- Existing button disabled styles in global.css
- Existing error message display pattern in ChatInterface

### Solutions
**Reference implementations to mimic:**
- Loading state management in useSessions.tsx (lines 44-45, 67-68, 93-94, 119-120)
- Button disabled pattern in ChatInterface.tsx (line 129: `disabled={isLoading}`)
- Conditional rendering pattern in ChatInterface.tsx (lines 105-110 for empty state)

**Pattern to follow:**
```typescript
// Conditional spinner display (similar to empty state)
{isLoading && <div className="loading-spinner">...</div>}
```

---

## Current Codebase Analysis

### ChatInterface.tsx Current State
```typescript
// Line 13: isLoading computed
const isLoading = isSessionsLoading || isSending

// Line 128-129: Send button (AC2 already implemented)
<button type="submit" className="btn-primary" disabled={isLoading}>
  Send
</button>

// Line 46: ChatHeader with disabled prop
<ChatHeader
  scenarioName={scenarioName}
  onBack={handleBack}
  onEndSession={handleEndSession}
  disabled={!sessionId || sessionEnded}  // ← Missing isLoading here!
/>
```

**Gap**: ChatHeader disabled prop does NOT include `isLoading`. Need to add it.

### useSessions.tsx Current State
```typescript
// sendMessage function (lines 67-104)
const sendMessage = useCallback(async (sessionId: string, content: string): Promise<Message> => {
  if (sessionEnded) throw new Error('This session has ended. Please start a new session.')
  
  setIsLoading(true)  // ← Loading starts
  setError(null)
  
  try {
    const response = await sessionApi.sendMessage(sessionId, content)
    // ... handle response
    setIsLoading(false)  // ← Loading ends on success
    return message
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
    setError(errorMessage)
    setIsLoading(false)  // ← Loading ends on error
    throw err
  }
}, [sessionEnded])
```

**Status**: Loading state management is correct (AC4 already implemented).

### global.css Current State
- Has button styles (btn-primary, btn-danger, etc.)
- Has loading-state class but no spinner animation
- Need to add spinner animation

---

## Conclusion

**Primary Implementation Tasks:**
1. Create spinner CSS animation in global.css
2. Add spinner display in ChatInterface.tsx when isLoading
3. Update ChatHeader disabled prop to include isLoading

**Already Implemented:**
- Send button disabled state (AC2)
- Loading state cleanup (AC4)

**Minimal Changes Required:** This feature requires changes to only 3 files with ~20 lines of code total.
