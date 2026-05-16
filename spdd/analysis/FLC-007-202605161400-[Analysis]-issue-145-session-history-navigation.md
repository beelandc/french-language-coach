# SPDD Analysis: Session History List with Navigation to Session Detail

**GitHub Issue**: #145
**Issue Title**: Add Session History List with Navigation to Session Detail
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/145
**Artifact ID**: FLC-007-202605161400-[Analysis]-issue-145-session-history-navigation
**Created**: 2026-05-16 14:00
**Author**: Mistral Vibe

---

## Original Business Requirement

Currently, there is no way for users to navigate to the Session Detail screen from the home page. Users need a session history list that displays their past sessions and allows them to click through to view session details.

## Background

The French Language Coach application allows users to conduct conversation practice sessions with AI tutors. Currently, users can:
- Select a scenario from the home page
- Conduct a chat session
- Receive feedback at the end

However, there is no way for users to:
- View their past session history
- Navigate back to previous sessions to review details
- Access feedback from completed sessions

This creates a poor user experience as session data is persisted but not accessible after completion.

## Business Value

- **Improved User Experience**: Users can review their learning history and progress over time
- **Session Data Accessibility**: Makes persisted session data useful and accessible
- **Feedback Review**: Allows users to revisit feedback from past sessions for continued learning
- **Navigation Completeness**: Provides complete navigation flow through the application
- **Part of MVP**: Session History UI is listed in VISION.md as a Phase 1.5 feature

---

## Scope In

- [ ] Display list of past sessions on home page or dedicated history page
- [ ] Each session item shows: scenario name, date, and overall score (if available)
- [ ] Each session item has a link/click handler to navigate to session detail
- [ ] Navigate to Session Detail screen when user clicks a session
- [ ] Handle empty session list gracefully (show appropriate message)
- [ ] Handle loading state while fetching sessions (show loading indicator)
- [ ] Handle error state if session list fails to load (show error message)
- [ ] Use existing GET /sessions/ endpoint with pagination
- [ ] Reuse existing SessionSummary type from backend
- [ ] Integrate with existing useSessions hook or create new useSessionList hook
- [ ] Follow existing styling patterns
- [ ] 80%+ test coverage for new components

## Scope Out

- [ ] Pagination controls in UI (out of scope per issue description - can use defaults)
- [ ] Advanced filtering UI (date range, scenario filter, score filter in UI)
- [ ] Session deletion from history list
- [ ] Session editing
- [ ] User authentication/authorization
- [ ] Multi-user session isolation
- [ ] Real-time updates to session list

---

## Acceptance Criteria (ACs)

1. **AC-145.1**: Display list of past sessions
   **Given** User is on the home page
   **When** They have completed sessions
   **Then** They see a list of their past sessions

2. **AC-145.2**: Each session item shows required fields
   **Given** A session exists in the list
   **When** User views the session history
   **Then** They see scenario name, date, and overall score (if available)

3. **AC-145.3**: Each session item has click handler
   **Given** A session exists in the list
   **When** User views the session history
   **Then** Each session has a clickable element to navigate to detail

4. **AC-145.4**: Navigate to Session Detail on click
   **Given** User clicks a session in the history list
   **When** Click is processed
   **Then** Application navigates to Session Detail screen for that session

5. **AC-145.5**: Handle empty session list
   **Given** User has no sessions
   **When** They view the session history
   **Then** They see a helpful message (e.g., "No sessions yet. Start a new session!")

6. **AC-145.6**: Handle loading state
   **Given** Sessions are being fetched
   **When** User views the session history
   **Then** They see a loading indicator

7. **AC-145.7**: Handle error state
   **Given** Session list fails to load
   **When** User views the session history
   **Then** They see an error message and can retry

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session Model** (`models/session.py`): SQLAlchemy ORM model storing session data including scenario_id, difficulty, created_at, ended_at, messages (JSON), feedback (JSON)
- **SessionSummary Schema** (`schemas/session.py`): Pydantic schema for session listing with id, scenario_id, scenario_name, difficulty, created_at, ended_at, overall_score
- **SessionListResponse Schema** (`schemas/session.py`): Response schema with sessions array and pagination metadata
- **GET /sessions/ Endpoint** (`routers/sessions.py`): Returns paginated list of session summaries with optional filtering
- **useSessions Hook** (`frontend/src/hooks/useSessions.tsx`): React hook managing session state including createSession, sendMessage, getFeedback
- **Session Types** (`frontend/src/types/index.ts`): TypeScript interfaces for Session, Message, Feedback
- **API Client** (`frontend/src/utils/api.ts`): Generic API client with sessionApi methods for create, sendMessage, getFeedback
- **React Router** (`App.tsx`): Routes for /, /chat/:sessionId, /feedback/:sessionId

### New Concepts Required

- **SessionHistory Component**: React component to display list of past sessions
- **SessionDetail Page/Component**: React component/page to display detailed session information
- **SessionHistoryItem Component**: React component for individual session item in the list
- **useSessionList Hook**: Optional - custom hook for fetching and managing session list (or extend useSessions)
- **Session List API Function**: API client function to fetch session list from GET /sessions/
- **Session History Types**: TypeScript interfaces for session list and pagination
- **Session History Styles**: CSS styles for session history UI

### Key Business Rules

- **Rule**: Sessions should be displayed in reverse chronological order (newest first)
- **Rule**: Only ended sessions should appear in history (or all sessions including active ones)
- **Rule**: Overall score is optional and comes from feedback.overall_score
- **Rule**: Session date should be displayed in user-friendly format
- **Rule**: Clicking a session should navigate to its detail view

---

## Strategic Approach

### Solution Direction

1. **Extend API Client**: Add `listSessions` function to `api.ts` to call GET /sessions/
2. **Extend useSessions Hook**: Add `listSessions` method to fetch session list from backend
3. **Create SessionHistory Component**: Component to display session list with loading/error/empty states
4. **Create SessionDetail Page**: New page to display session details (or reuse FeedbackPage)
5. **Update HomePage**: Add SessionHistory component to display past sessions
6. **Add Route**: Add route for /sessions/:sessionId or /session-detail/:sessionId in App.tsx
7. **Add Types**: Add TypeScript types for SessionSummary and pagination
8. **Add Styles**: Add CSS styles for session history list
9. **Write Tests**: Write Vitest tests for new components with 80%+ coverage

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Dedicated history page vs home page section** | Dedicated page: cleaner separation, but extra navigation. Home page section: immediate visibility, but may clutter home page | **Home page section** - simpler implementation, matches issue description "on home page or dedicated history page" |
| **Extend useSessions vs new useSessionList hook** | Extend: keeps session logic together. New hook: better separation of concerns | **Extend useSessions** - simpler, keeps related logic together |
| **Create SessionDetail page vs reuse FeedbackPage** | New page: more flexible for future enhancements. Reuse Feedback: less code duplication | **New SessionDetail page** - more explicit, allows for showing messages + feedback together |
| **Show all sessions vs only ended sessions** | All: shows complete history. Only ended: cleaner, but hides active sessions | **Show all sessions** - users may want to continue active sessions |

### Alternatives Considered

- **Alternative 1**: Use a modal for session detail instead of a new page - Rejected because session detail may contain a lot of information (messages + feedback) that needs its own space
- **Alternative 2**: Add pagination controls to the UI - Rejected because issue explicitly says "Can use existing GET /sessions/ endpoint with pagination" implying pagination is handled at API level, not UI level for now
- **Alternative 3**: Create a separate "History" tab in the app - Rejected because issue allows "on home page or dedicated history page" and simpler to integrate into home page first

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **"Session Detail screen"** | What exactly should be shown on Session Detail? Full messages + feedback, or just feedback? | Show full session details including messages and feedback (complete view) |
| **"Date" field** | Which date field to show? created_at or ended_at? | Show created_at as session start date |
| **"Overall score"** | What if feedback doesn't exist yet? | Show "-" or "No score yet" for sessions without feedback |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **No sessions exist** | First-time users need clear guidance | Show "No sessions yet. Start a new session!" message |
| **Session without feedback** | User ended session before requesting feedback | Show score as "-" or "Pending" |
| **Active session (ended_at is null)** | User may have active session they want to continue | Show in list, allow navigation to chat |
| **API returns empty array** | Backend error or no data | Show empty state message |
| **API request fails** | Network error or server down | Show error message with retry button |
| **Many sessions (beyond pagination)** | Performance and UX | Use default pagination (page=1, per_page=10) from backend |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Backend API changes** | GET /sessions/ endpoint structure may change | Use existing SessionSummary type, verify against existing tests |
| **Type mismatches** | Backend returns id as int, frontend expects string | Coerce types in API client as done in existing code |
| **Feedback parsing** | Feedback is stored as JSON string in database | Use existing feedback_dict property on Session model |
| **Date formatting** | Backend datetime vs frontend display | Use standard Date formatting in frontend |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-145.1 | Display list of past sessions | Yes | Will create SessionHistory component |
| AC-145.2 | Each session shows scenario name, date, overall score | Yes | Will display all three fields |
| AC-145.3 | Each session has click handler | Yes | Will add onClick to each session item |
| AC-145.4 | Navigate to Session Detail on click | Yes | Will use React Router navigate |
| AC-145.5 | Handle empty session list | Yes | Will show helpful message |
| AC-145.6 | Handle loading state | Yes | Will show loading indicator |
| AC-145.7 | Handle error state | Yes | Will show error message |

**AC Coverage Summary**: 7 of 7 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Sessions should be sorted by date (newest first) - this is already handled by backend default sorting
- Session history should be visible on home page
- Navigation should be intuitive and consistent with existing patterns

---

## REASONS Canvas

### Requirements
From GitHub issue #145 acceptance criteria:
- Display list of past sessions on home page or dedicated history page
- Each session item shows: scenario name, date, and overall score (if available)
- Each session item has a link/click handler to navigate to session detail
- Navigate to Session Detail screen when user clicks a session
- Handle empty session list gracefully
- Handle loading state while fetching sessions
- Handle error state if session list fails to load

### Examples

**Test Case 1: Normal session list display**
- Given: User has 3 completed sessions with feedback
- When: User navigates to home page
- Then: User sees 3 session cards with scenario names, dates, and scores
- And: Clicking any session navigates to /sessions/:id

**Test Case 2: Empty session list**
- Given: User has no sessions
- When: User navigates to home page
- Then: User sees "No sessions yet. Start a new session!" message

**Test Case 3: Session without feedback**
- Given: User has a session without feedback (score is null)
- When: User views session history
- Then: Score displays as "-" or "No score yet"

**Test Case 4: Loading state**
- Given: API request is in progress
- When: User navigates to home page
- Then: User sees loading spinner/indicator

**Test Case 5: Error state**
- Given: API request fails
- When: User navigates to home page
- Then: User sees error message and retry button

### Architecture

**Frontend Architecture:**
- React 19 SPA with TypeScript and Vite
- React Router v6 for navigation
- Functional components with hooks
- Custom hooks for API state management (useSessions)
- TypeScript interfaces in types/index.ts
- CSS modules/global CSS for styling
- Vitest for frontend testing

**Backend Architecture:**
- FastAPI with async SQLAlchemy
- SQLite database
- Pydantic schemas for validation
- RESTful API endpoints
- pytest for backend testing

**Existing Patterns to Follow:**
- useSessions hook pattern for state management
- API client pattern in api.ts (generic api function + specific endpoint functions)
- Component structure: components/ for reusable, pages/ for route components
- TypeScript interfaces in types/index.ts
- CSS classes in global.css
- Test files alongside components (component.test.tsx or component.spec.tsx)

### Standards

**Coding Standards:**
- Follow existing code style (indentation, naming conventions)
- Use TypeScript for type safety
- Use React hooks (useState, useEffect, useCallback, useContext)
- Match existing component patterns
- Use async/await for API calls

**Testing Standards:**
- 80% minimum test coverage per component
- Vitest for frontend testing
- Test user interactions with @testing-library/react
- Test API calls with mocking (vi.fn or similar)
- Test all acceptance criteria

**Documentation Standards:**
- Docstrings for public functions
- TypeScript types for all props
- Comments for complex logic
- Update README.md if adding new features or changing API

### Omissions

**Explicitly Out of Scope:**
- Pagination controls in UI (backend handles it, frontend uses defaults)
- Advanced filtering UI (filtering is available in API but not exposed in UI per issue)
- Session deletion from history list
- Session editing
- User authentication/authorization
- Multi-user session isolation
- Real-time updates to session list
- PDF export of session history
- Statistics/charts for session history

### Notes

**Implementation Hints:**
- Use existing GET /sessions/ endpoint with default pagination
- Reuse SessionSummary type from backend (maps to SessionListResponse)
- Extend useSessions hook to add listSessions method
- Create SessionHistory component for displaying the list
- Create SessionDetail page for viewing session details
- Add route in App.tsx for /sessions/:sessionId
- Use existing styling patterns from global.css
- Handle type coercion (backend id is int, frontend expects string)

**References to Similar Code:**
- see ScenarioSelector.tsx for component pattern with loading/error states
- see useSessions.tsx for hook pattern
- see api.ts for API client pattern
- see FeedbackView.tsx for displaying session data
- see ChatPage.tsx for page component pattern

### Solutions

**Reference Implementations:**
- ScenarioSelector.tsx: Shows loading, error, and data states
- useSessions.tsx: Manages session state with useState/useCallback
- api.ts: Generic API client with specific endpoint functions
- App.tsx: Route configuration pattern

**Patterns to Follow:**
1. API client pattern: export const sessionApi = { method1, method2, ... }
2. Hook pattern: useContext + useState + useCallback
3. Component pattern: Functional component with TypeScript props
4. Type pattern: Interface in types/index.ts, imported where needed
5. Testing pattern: Vitest with describe/it blocks, mocking API calls

---

*Analysis document created using SPDD methodology*
*Inspired by [Structured Prompt Driven Development](https://martinfowler.com/articles/structured-prompt-driven.html)*
