# SPDD Analysis: Session Detail Component

**GitHub Issue**: #17
**Issue Title**: 1.5.6: Create SessionDetail React component
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/17
**Artifact ID**: FLC-007-202605152100
**Created**: 2026-05-15 21:00
**Author**: Mistral Vibe

---

## Original Business Requirement

Create React component to display full conversation transcript and feedback report.

**Acceptance Criteria from Issue #17:**
- [ ] Displays all messages in conversation
- [ ] Displays full feedback report (scores, strengths, corrections)
- [ ] Read-only view
- [ ] Back button to history list
- [ ] Handles missing data gracefully

---

## Background

The French Language Coach application currently has separate views for active chat sessions (`ChatPage`) and feedback after a session ends (`FeedbackPage`). There is a need for a dedicated "Session Detail" view that displays both the full conversation transcript AND the feedback report together, allowing users to review their completed sessions.

This feature supports the "Session History UI" enhancement mentioned in VISION.md and provides users with a comprehensive view of their past conversation practice sessions.

---

## Business Value

- **User Experience**: Users can review their completed conversations alongside the feedback they received, helping them understand the context of corrections and suggestions
- **Learning Reinforcement**: Viewing the full transcript with feedback in one place helps reinforce learning by connecting feedback to specific conversation moments
- **Session History**: Enables the session history feature mentioned in VISION.md by providing a detailed view for past sessions
- **Traceability**: Users can track their progress over time by reviewing past sessions

---

## Scope In

- [ ] Create `SessionDetail` React component that displays conversation transcript and feedback
- [ ] Create `SessionDetailPage` page component with React Router integration
- [ ] Add route `/session/:sessionId` or `/sessions/:sessionId` in App.tsx
- [ ] Component shows all messages from the session in chronological order
- [ ] Component displays feedback scores (grammar, vocabulary, fluency, overall)
- [ ] Component displays strengths list
- [ ] Component displays focus area
- [ ] Component displays example corrections
- [ ] Component has a "Back" button to return to session history/list
- [ ] Component handles cases where session exists but has no feedback yet
- [ ] Component handles cases where session or feedback data is null/missing
- [ ] Component is read-only (no message input)
- [ ] Unit tests for SessionDetail component
- [ ] Storybook stories for SessionDetail component (optional but recommended)

## Scope Out

- [ ] Editing or deleting sessions from this view (out of scope for this issue)
- [ ] Starting a new session from this view (users go back to home for that)
- [ ] Exporting sessions to PDF (future feature, mentioned in VISION.md)
- [ ] User authentication (single-user app currently)
- [ ] Real-time updates (session data is static once ended)
- [ ] Backend API changes (GET /sessions/{id} already provides needed data)

---

## Acceptance Criteria (ACs)

1. **AC1**: Displays all messages in conversation
   **Given** A session with multiple messages
   **When** User navigates to session detail view
   **Then** All messages are displayed in order with sender identification

2. **AC2**: Displays full feedback report (scores, strengths, corrections)
   **Given** A session with feedback
   **When** User navigates to session detail view
   **Then** Feedback scores, strengths, focus area, and example corrections are all displayed

3. **AC3**: Read-only view
   **Given** Any session detail view
   **When** User is viewing the page
   **Then** There is no input field for sending new messages

4. **AC4**: Back button to history list
   **Given** User is viewing a session detail
   **When** User clicks the Back button
   **Then** User is navigated back to the session history/list page

5. **AC5**: Handles missing data gracefully
   **Given** A session without feedback or with partial data
   **When** User navigates to session detail view
   **Then** The component displays appropriately (loading states, empty states, error messages)

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session**: Domain model representing a conversation session with scenario_id, created_at, ended_at, messages (JSON array), and feedback (JSON). Located in `models/session.py` and `schemas/session.py`
- **Message**: Part of Session with role (user/assistant) and content. Stored as JSON array in Session.messages
- **Feedback**: Structured data with grammar_score, vocabulary_score, fluency_score, overall_score, strengths (array), focus_area (string), and example_corrections (array of objects). Stored as JSON in Session.feedback
- **Session Context**: `useSessions` hook in `frontend/src/hooks/useSessions.tsx` provides session management, including `getFeedback()` method
- **API Client**: `sessionApi` in `frontend/src/utils/api.ts` provides methods for fetching session data
- **Types**: TypeScript interfaces in `frontend/src/types/index.ts` define Session, Message, Feedback, etc.
- **Pages Pattern**: Existing pages (`HomePage`, `ChatPage`, `FeedbackPage`) follow a simple pattern of wrapping a component and extracting route params
- **Component Pattern**: Existing components use TypeScript props, follow consistent styling via `global.css`

### New Concepts Required

- **SessionDetail Component**: A composite component that renders both conversation transcript and feedback report
- **SessionDetailPage**: A page-level component that extracts sessionId from route params and renders SessionDetail
- **Route**: New route in App.tsx for `/sessions/:sessionId` or similar

### Key Business Rules

- Sessions can exist without feedback (if user hasn't ended session or feedback generation failed)
- Messages are stored in chronological order in the database
- Feedback, once generated, is immutable (read-only)
- Session detail should show data as it was when the session ended
- Users should not be able to modify data from this view

---

## Strategic Approach

### Solution Direction

1. Create a new `SessionDetail` component in `frontend/src/components/SessionDetail.tsx`
2. Create a new `SessionDetailPage` in `frontend/src/pages/SessionDetailPage.tsx`
3. Add route in `App.tsx` (e.g., `/sessions/:sessionId`)
4. The component will:
   - Fetch session data using existing `useSessions` hook or `sessionApi`
   - Display messages using existing `MessageBubble` component
   - Display feedback using existing `ScoreCard`, `CorrectionItem` components
   - Include a Back button using existing button styles
5. Handle edge cases:
   - Session not found (404)
   - Session exists but no feedback (show transcript only with message)
   - Loading state
   - Error state

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Where to fetch data** | Use `useSessions` hook (provides state management) vs direct API call (simpler, independent) | Use `useSessions` hook for consistency with existing pages, but extend it with a `getSession` method if needed |
| **Route path** | `/session/:id` vs `/sessions/:id` vs `/history/:id` | Use `/sessions/:sessionId` for consistency with backend API naming |
| **Component composition** | Single large component vs multiple small sub-components | Use component composition: SessionDetail wraps MessageList and FeedbackDisplay sub-components |
| **Handling missing feedback** | Show placeholder vs show error vs show transcript only | Show transcript with message "Feedback not yet available" since this can happen for sessions that were created but not completed |

### Alternatives Considered

- **Alternative 1**: Extend FeedbackPage to show transcript - Rejected because it conflates two concerns (active feedback view vs historical session review)
- **Alternative 2**: Show session detail inline in a history list - Rejected because it would be too cluttered; dedicated page provides better UX
- **Alternative 3**: Use a modal/dialog instead of a page - Rejected because session detail may have a lot of content; full page is more appropriate

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Back button to history list" | Where does back go? There's no history list page yet | Back should go to `/` (home) for now, which has scenario selection. In future, could go to dedicated `/sessions` list page |
| "Handles missing data gracefully" | What constitutes missing data? | Handle: session not found, session without feedback, null values in feedback fields |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Session ID doesn't exist | User might have bad URL or session was deleted | Show error message with link to home |
| Session exists but has no messages | Edge case: empty session | Show empty state for messages |
| Session exists but has no feedback | Session was created but not ended | Show transcript with message "No feedback available" |
| Feedback has null/undefined fields | Partial feedback data | Render what's available, skip null fields |
| Network error when fetching | User has connectivity issues | Show error message with retry option |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Duplicate ID conflict | SessionDetail and existing components might use same class names | Use BEM-like naming or component-scoped styles |
| Performance with large sessions | Many messages could slow down rendering | Virtualize message list if needed (future optimization) |
| Type mismatches | Backend returns different types than frontend expects | Use type assertions and validation |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Displays all messages | Yes | Will use MessageBubble for each message |
| AC2 | Displays full feedback | Yes | Will use ScoreCard, CorrectionItem, etc. |
| AC3 | Read-only view | Yes | No input fields, only display |
| AC4 | Back button | Yes | Will navigate to home (/) |
| AC5 | Handles missing data | Yes | Will implement error/loading/empty states |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Component should be responsive (mobile-friendly)
- Component should follow existing styling patterns
- Component should have proper TypeScript types
- Component should have tests (80% coverage requirement)

---

## REASONS Canvas

### Requirements
From GitHub issue #17 acceptance criteria:
- Displays all messages in conversation
- Displays full feedback report (scores, strengths, corrections)
- Read-only view
- Back button to history list
- Handles missing data gracefully

### Examples

**Example 1: Complete session with feedback**
- Input: Session ID 123 with 5 messages and full feedback
- Expected: Page shows all 5 messages in order, then shows scores (85, 90, 88, 88), 3 strengths, focus area, and 2 example corrections

**Example 2: Session without feedback**
- Input: Session ID 456 with 3 messages but no feedback
- Expected: Page shows all 3 messages with a message "Feedback not yet available for this session"

**Example 3: Non-existent session**
- Input: Session ID 999 (doesn't exist)
- Expected: Page shows error message "Session not found" with button to return home

**Example 4: Session with partial feedback**
- Input: Session ID 789 with messages and feedback missing strengths field
- Expected: Page shows messages, shows scores, skips or shows empty strengths section

### Architecture

**Existing codebase structure:**
```
frontend/src/
├── components/          # Reusable components
│   ├── MessageBubble.tsx     # Displays a single message
│   ├── ScoreCard.tsx        # Displays a score card
│   ├── CorrectionItem.tsx   # Displays a correction
│   └── ...
├── pages/              # Page-level components
│   ├── HomePage.tsx        # Scenario selection
│   ├── ChatPage.tsx        # Active chat interface
│   └── FeedbackPage.tsx    # Feedback view
├── hooks/              # Custom hooks
│   └── useSessions.tsx      # Session state management
├── types/              # TypeScript types
│   └── index.ts
├── utils/              # Utilities
│   └── api.ts             # API client
└── App.tsx              # Routes
```

**Proposed additions:**
```
frontend/src/
├── components/
│   ├── SessionDetail.tsx    # NEW: Combined transcript + feedback view
│   └── ...
├── pages/
│   └── SessionDetailPage.tsx # NEW: Page wrapper
└── App.tsx                 # MODIFY: Add new route
```

**Patterns to follow:**
- Components receive props with TypeScript interfaces from `types/`
- Pages extract route params and pass to components
- API calls go through `sessionApi` in `utils/api.ts`
- State management uses `useSessions` hook where applicable
- Styling uses CSS classes from `global.css`
- Error handling shows user-friendly messages

### Standards

**Coding Standards:**
- TypeScript with strict mode
- React functional components with hooks
- PEP 8 equivalent for TypeScript (consistent with existing code)
- Follow existing naming conventions (PascalCase for components, camelCase for variables)

**Testing Requirements:**
- 80% test coverage minimum per module
- Unit tests for component rendering and logic
- Test edge cases (null data, empty arrays, etc.)
- Use jest and @testing-library/react

**Documentation Requirements:**
- Docstrings for public functions (TypeScript comments)
- Storybook stories for components (recommended)
- Update README.md if adding new routes or public API changes (not needed here - internal component)

**Code Quality:**
- No console.log in production code
- Proper error handling
- Loading and error states
- Accessibility considerations (alt text, semantic HTML)

### Omissions

**Explicitly out of scope:**
- Backend changes (GET /sessions/{id} already exists and returns all needed data)
- User authentication
- Session editing/deletion from this view
- PDF export
- Starting new sessions
- Real-time updates
- Multi-user support

### Notes

**Implementation hints:**
- Reuse existing `MessageBubble` component for displaying messages
- Reuse existing `ScoreCard` component for displaying scores
- Reuse existing `CorrectionItem` component for displaying corrections
- Use existing `useSessions` hook or `sessionApi.getSession()` pattern
- Follow existing error handling patterns from `ChatInterface` and `FeedbackView`
- The backend endpoint `GET /sessions/{id}` already returns all needed data (messages and feedback)
- Need to add a `getSession` method to `sessionApi` or extend `useSessions` hook

**References to similar code:**
- `FeedbackView.tsx` - Shows feedback data (similar pattern for feedback section)
- `ChatInterface.tsx` - Shows messages (similar pattern for message section)
- `ChatPage.tsx` - Simple page wrapper pattern
- `FeedbackPage.tsx` - Simple page wrapper pattern

### Solutions

**Reference implementations to mimic:**
1. `FeedbackView.tsx` - For displaying feedback data structure
2. `ChatInterface.tsx` - For displaying message list
3. `FeedbackPage.tsx` - For page-level structure
4. `sessionApi` in `utils/api.ts` - For API call patterns

**Pattern for new component:**
```tsx
// SessionDetail.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '../types'

export default function SessionDetail({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Fetch session data
  }, [sessionId])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="error-message">{error}</div>
  if (!session) return <div>Session not found</div>

  return (
    <div className="session-detail">
      {/* Messages section */}
      <div className="session-messages">
        {session.messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
      
      {/* Feedback section */}
      {session.feedback && (
        <div className="session-feedback">
          {/* Display scores, strengths, corrections */}
        </div>
      )}
      
      <button className="btn-secondary" onClick={() => navigate('/')}>
        Back to Home
      </button>
    </div>
  )
}
```

---

*Analysis based on SPDD methodology from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
