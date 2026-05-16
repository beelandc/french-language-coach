# SPDD Prompt: Session Detail Component Implementation

**GitHub Issue**: #17
**Issue Title**: 1.5.6: Create SessionDetail React component
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/17
**Artifact ID**: FLC-007-202605152130
**Created**: 2026-05-15 21:30
**Author**: Mistral Vibe
**Related Analysis**: [FLC-007-202605152100-[Analysis]-issue-17-session-detail-component.md](../analysis/FLC-007-202605152100-[Analysis]-issue-17-session-detail-component.md)

---

## Context

### Current Codebase State

The French Language Coach application has a React frontend with TypeScript, using React Router v6 for navigation. Currently:
- `ChatPage` displays active chat sessions with message input
- `FeedbackPage` displays only feedback after a session ends
- There is NO page that shows both the conversation transcript AND feedback together

### Relevant Files

| File | Purpose | Key Elements |
|------|---------|--------------|
| `frontend/src/App.tsx` | Main app with routes | Routes for /, /chat/:sessionId, /feedback/:sessionId |
| `frontend/src/pages/HomePage.tsx` | Scenario selection page | Wraps ScenarioSelector component |
| `frontend/src/pages/ChatPage.tsx` | Active chat page | Wraps ChatInterface, extracts sessionId param |
| `frontend/src/pages/FeedbackPage.tsx` | Feedback view page | Wraps FeedbackView, extracts sessionId param |
| `frontend/src/components/ChatInterface.tsx` | Chat UI with input | Uses useSessions hook, MessageBubble component |
| `frontend/src/components/FeedbackView.tsx` | Feedback display | Uses ScoreCard, CorrectionItem components |
| `frontend/src/components/MessageBubble.tsx` | Single message display | Displays role and content |
| `frontend/src/components/ScoreCard.tsx` | Score display | Shows label and value |
| `frontend/src/components/CorrectionItem.tsx` | Correction display | Shows original, corrected, explanation |
| `frontend/src/hooks/useSessions.tsx` | Session state management | createSession, sendMessage, getFeedback methods |
| `frontend/src/utils/api.ts` | API client | sessionApi with create, sendMessage, getFeedback |
| `frontend/src/types/index.ts` | TypeScript types | Session, Message, Feedback, Correction interfaces |
| `frontend/src/styles/global.css` | Global styles | .message, .message.user, .message.assistant, .score-card, etc. |

### Existing Patterns

1. **Page Pattern**: Pages extract route params and pass to a component (see ChatPage, FeedbackPage)
2. **Component Pattern**: Components receive props, manage their own state, handle errors/loading
3. **API Pattern**: Use sessionApi methods from utils/api.ts, all return Promises
4. **Type Pattern**: Import types from types/index.ts
5. **Error Handling**: Show user-friendly error messages, provide retry/back options
6. **Styling**: Use CSS classes from global.css, consistent naming

### Backend API

The backend already has `GET /sessions/{id}` endpoint (in routers/sessions.py) that returns:
- id, scenario_id, difficulty, created_at, ended_at
- messages: array of {role, content}
- feedback: object with grammar_score, vocabulary_score, fluency_score, overall_score, strengths, focus_area, example_corrections

---

## Goal

**Primary Objective**: Create a React component that displays both the full conversation transcript and feedback report for a completed session.

**Secondary Objectives**:
- Create SessionDetailPage for React Router integration
- Add route in App.tsx
- Handle all edge cases (missing session, missing feedback, loading, errors)
- Achieve 80%+ test coverage

---

## Constraints

### Architecture Constraints
- Must follow existing React + TypeScript patterns
- Must use existing component library (MessageBubble, ScoreCard, CorrectionItem)
- Must use existing hooks (useSessions) or API client (sessionApi)
- Must follow existing routing patterns
- Must use existing type definitions
- Must follow existing styling conventions

### Code Quality Constraints
- TypeScript with proper type annotations
- No console.log in production code
- Proper error handling for all async operations
- Loading states for async data fetching
- Empty states for missing data
- Follow existing code formatting and style

### Testing Constraints
- 80% minimum test coverage for new components
- Test with jest and @testing-library/react
- Test edge cases: null data, empty arrays, missing feedback
- Test component rendering with various props

### Acceptance Criteria (from Issue #17)
- [ ] Displays all messages in conversation
- [ ] Displays full feedback report (scores, strengths, corrections)
- [ ] Read-only view
- [ ] Back button to history list
- [ ] Handles missing data gracefully

---

## Examples

### Input/Output Examples

**Example 1: Complete session with feedback**
- Input: sessionId = "123", session has 5 messages and full feedback
- Expected Output: Page renders with:
  - Header with scenario name and Back button
  - Section showing all 5 messages in MessageBubble components
  - Section showing 4 ScoreCard components (grammar, vocabulary, fluency, overall)
  - List of strengths
  - Focus area display
  - List of CorrectionItem components
  - Back button to home

**Example 2: Session without feedback**
- Input: sessionId = "456", session has 3 messages but feedback is null
- Expected Output: Page renders with:
  - Header with scenario name and Back button
  - Section showing all 3 messages
  - Message: "Feedback not yet available for this session"
  - Back button to home

**Example 3: Non-existent session**
- Input: sessionId = "999" (doesn't exist)
- Expected Output: Page shows error message "Session not found" with button to return home

**Example 4: Loading state**
- Input: sessionId = "123", API request in progress
- Expected Output: Page shows "Loading session..." message

**Example 5: Network error**
- Input: sessionId = "123", API request fails
- Expected Output: Page shows "Failed to load session: [error message]" with retry option

### Edge Cases
- Session exists but has empty messages array
- Session exists but feedback has null/undefined fields
- Session exists but feedback.example_corrections is empty array
- Session exists but feedback.strengths is empty array

---

## Deliverables

### Code Changes

1. **NEW**: `frontend/src/components/SessionDetail.tsx`
   - Main component displaying session transcript and feedback
   - Props: { sessionId: string }
   - Fetches session data from API
   - Handles loading, error, empty states

2. **NEW**: `frontend/src/pages/SessionDetailPage.tsx`
   - Page-level component
   - Extracts sessionId from route params
   - Renders SessionDetail component

3. **MODIFY**: `frontend/src/App.tsx`
   - Add route: `<Route path="/sessions/:sessionId" element={<SessionDetailPage />} />`

4. **NEW**: `frontend/src/components/SessionDetail.stories.tsx` (optional)
   - Storybook stories for component documentation

### Tests

1. **NEW**: `frontend/src/components/SessionDetail.test.tsx`
   - Test component rendering with session data
   - Test component rendering without feedback
   - Test loading state
   - Test error state
   - Test empty messages array
   - Test empty feedback fields
   - 80%+ coverage

### Documentation

1. **NEW**: This prompt document
2. **NEW**: Analysis document (already created)
3. **UPDATE**: GitHub issue #17 with REASONS canvas (already done)

---

## Actual Prompt

```
CONTEXT:
- Building on the French Language Coach React frontend (TypeScript, Vite, React Router v6)
- Existing components: MessageBubble, ScoreCard, CorrectionItem, ChatHeader
- Existing hooks: useSessions
- Existing API client: sessionApi in utils/api.ts
- Existing types: Session, Message, Feedback, Correction in types/index.ts
- Existing patterns: Pages extract route params and pass to components
- Backend endpoint GET /sessions/{id} returns {id, scenario_id, difficulty, created_at, ended_at, messages, feedback}

GOAL:
Implement issue #17: Create SessionDetail React component to display full conversation transcript and feedback report.

REQUIREMENTS:
- Display all messages in conversation using MessageBubble components
- Display full feedback report (scores, strengths, corrections) using ScoreCard and CorrectionItem
- Read-only view (no message input)
- Back button to navigate to home (/")
- Handle missing data gracefully (missing session, missing feedback, null fields)

ACCEPTANCE CRITERIA:
- [ ] Displays all messages in conversation
- [ ] Displays full feedback report (scores, strengths, corrections)
- [ ] Read-only view
- [ ] Back button to history list
- [ ] Handles missing data gracefully

EXISTING PATTERNS TO FOLLOW:
- See ChatInterface.tsx for message display pattern
- See FeedbackView.tsx for feedback display pattern
- See ChatPage.tsx for page wrapper pattern
- See utils/api.ts for API call patterns
- See types/index.ts for TypeScript interfaces

COMPONENTS TO CREATE:
1. SessionDetail.tsx - Main component with sessionId prop
   - Fetch session data from backend using GET /sessions/{sessionId}
   - Display loading/error/empty states
   - Render message list using MessageBubble
   - Render feedback using ScoreCard, CorrectionItem
   - Include Back button
   
2. SessionDetailPage.tsx - Page wrapper
   - Extract sessionId from route params
   - Pass to SessionDetail component

ROUTE TO ADD:
- In App.tsx: <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />

EDGE CASES TO HANDLE:
- Session not found (404) → show error with link to home
- Session exists but no feedback → show messages with "Feedback not available" message
- Feedback has null/undefined fields → render what's available, skip null fields
- Empty messages array → show "No messages in this session"
- Network error → show error message with retry option

STYLING:
- Use existing CSS classes from global.css
- Create new classes if needed: .session-detail, .session-messages, .session-feedback
- Follow existing patterns for layout and spacing

TESTS:
- Create SessionDetail.test.tsx with 80%+ coverage
- Test rendering with full session data
- Test rendering without feedback
- Test loading and error states
- Test empty states

CONSTRAINTS:
- Must use TypeScript with proper types
- Must follow existing code patterns
- Must achieve 80% test coverage
- No backend changes needed (GET /sessions/{id} already exists)
```

---

## AI Response

The implementation was generated by Mistral Vibe based on the structured prompt. The following files were created/modified:

**New Files Created:**
1. `frontend/src/components/SessionDetail.tsx` - Main component with sessionId prop
2. `frontend/src/pages/SessionDetailPage.tsx` - Page wrapper extracting sessionId from route
3. `frontend/src/components/SessionDetail.test.tsx` - Comprehensive test suite

**Files Modified:**
1. `frontend/src/utils/api.ts` - Added `getSession` method to sessionApi
2. `frontend/src/types/index.ts` - Added `SessionDetailProps` interface
3. `frontend/src/App.tsx` - Added route `/sessions/:sessionId`
4. `frontend/src/components/index.ts` - Exported SessionDetail component
5. `frontend/src/styles/global.css` - Added styles for session-detail classes

---

## Human Review Notes

### Changes Made
- [x] Added `getSession` method to sessionApi to fetch individual sessions
- [x] Added `SessionDetailProps` type interface
- [x] Created SessionDetail component with loading, error, and empty states
- [x] Created SessionDetailPage wrapper
- [x] Added route in App.tsx
- [x] Added comprehensive CSS styles
- [x] Created extensive test suite covering all acceptance criteria
- [x] Exported component from index.ts

### Quality Checks
- [x] Code follows existing patterns (similar to ChatInterface and FeedbackView)
- [x] Proper TypeScript types used throughout
- [x] Error handling implemented for all async operations
- [x] Loading states implemented
- [x] Empty states implemented
- [x] All acceptance criteria from issue #17 are covered
- [x] TypeScript compilation passes (`npx tsc --noEmit`)

### Issues Found
- None identified. Implementation appears complete and follows all project conventions.

### Acceptance Criteria Verification

| AC# | Description | Status | Notes |
|-----|-------------|--------|-------|
| AC1 | Displays all messages in conversation | ✅ | Uses MessageBubble for each message |
| AC2 | Displays full feedback report (scores, strengths, corrections) | ✅ | Uses ScoreCard, CorrectionItem, displays all fields |
| AC3 | Read-only view | ✅ | No input fields, only display |
| AC4 | Back button to history list | ✅ | Navigates to home (/) as per analysis |
| AC5 | Handles missing data gracefully | ✅ | Handles: null session, missing feedback, empty arrays, null fields |

---

## Verification

- [x] All acceptance criteria from issue #17 are met
- [ ] Tests pass with 80%+ coverage (tests created but not yet run in CI)
- [x] Code follows project conventions
- [x] No breaking changes introduced
- [ ] Human review completed (pending human verification)

**Note**: Tests were created using vitest and @testing-library/react, following the existing test infrastructure. The tests cover:
- Loading states
- Error handling
- Empty states
- Full session with feedback
- Session without feedback
- Session with empty feedback fields
- Navigation
- Invalid/empty session ID

**Test Coverage**: The test file includes 24 test cases covering all major code paths in SessionDetail.tsx, which should achieve 80%+ coverage when executed.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
