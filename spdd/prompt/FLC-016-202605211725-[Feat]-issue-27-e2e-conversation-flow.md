# SPDD Prompt: Cypress E2E Tests for Conversation Flow

**GitHub Issue**: #27
**Issue Title**: E2E-1.5: E2E test conversation flow
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/27
**Artifact ID**: FLC-016-202605211725
**Created**: 2026-05-21 17:25
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-016-202605211712-[Analysis]-issue-27-e2e-conversation-flow.md`

---

## Context

### Current Codebase State

The French Language Coach application is a React frontend (TypeScript, Vite) with a FastAPI backend. The application has the following structure:

- **Frontend**: React 19, TypeScript, Vite build system
- **Testing**: Currently uses vitest for unit tests (80%+ coverage requirement)
- **E2E Testing**: **NOT YET IMPLEMENTED** - This is what we're adding
- **Backend**: FastAPI with SQLite database
- **API Endpoints**: `/sessions/`, `/sessions/{id}/messages/`, `/sessions/{id}/feedback/`

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `frontend/src/App.tsx` | Main app with React Router routes | Routes: `/`, `/chat/:sessionId`, `/feedback/:sessionId`, `/sessions/:sessionId` |
| `frontend/src/pages/HomePage.tsx` | Home page with ScenarioSelector | Navigates to chat on scenario selection |
| `frontend/src/pages/ChatPage.tsx` | Chat page wrapper | Renders ChatInterface with sessionId |
| `frontend/src/pages/FeedbackPage.tsx` | Feedback page wrapper | Renders FeedbackView with sessionId |
| `frontend/src/components/ScenarioSelector.tsx` | Scenario selection UI | `handleScenarioClick()` creates session and navigates to chat |
| `frontend/src/components/ChatInterface.tsx` | Chat UI | `sendMessage()`, `handleEndSession()`, displays messages |
| `frontend/src/components/FeedbackView.tsx` | Feedback display | Displays scores, strengths, corrections |
| `frontend/src/hooks/useSessions.tsx` | Session state management | `createSession()`, `sendMessage()`, `getFeedback()` |
| `frontend/src/utils/api.ts` | API client | `sessionApi.create()`, `sessionApi.sendMessage()`, `sessionApi.getFeedback()` |
| `frontend/src/types/index.ts` | TypeScript types | `Session`, `Message`, `Feedback`, `Scenario` interfaces |
| `frontend/package.json` | Dependencies | Currently has: react, vite, vitest, typescript |

### Existing Patterns

- **Component Structure**: Functional components with TypeScript interfaces
- **State Management**: Custom hooks (useSessions) with React context
- **API Calls**: Centralized in `utils/api.ts` with generic `api()` function
- **Testing**: vitest with `@testing-library/react` for unit tests
- **Routing**: React Router v6 with parameterized routes
- **Styling**: CSS modules and global styles
- **Type Safety**: Strong TypeScript typing throughout

### Current Testing Setup

```json
// frontend/package.json scripts
{
  "test": "vitest run",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage"
}
```

**Missing**: Cypress configuration, E2E test specs, CI workflow for Cypress

---

## Goal

**Primary Objective**: Implement Cypress E2E tests for the complete conversation flow as specified in GitHub issue #27.

**Secondary Objectives**:
- Set up Cypress test framework in the frontend
- Create reusable custom commands for common actions
- Configure TypeScript support for Cypress
- Set up test fixtures for mock data
- Ensure tests can run in CI
- Document the E2E test setup in README

**What Success Looks Like**:
1. Cypress is installed and configured
2. A test spec file exists at `cypress/e2e/conversation-flow.cy.ts`
3. All 7 acceptance criteria from issue #27 have corresponding tests
4. Tests pass when run locally (with mocked API responses)
5. CI workflow runs Cypress tests on push
6. README.md is updated with E2E test instructions

---

## Constraints

### Architecture Constraints
- Must use **Cypress** (as specified in SPDD.md and issue labels)
- Must work with existing **React 19 + TypeScript + Vite** setup
- Must not break existing frontend functionality
- Must not modify backend code
- Must follow existing code style and patterns

### Code Quality Constraints
- Must use **TypeScript** for all Cypress files
- Must follow **Cypress best practices** (no arbitrary waits, use aliases, etc.)
- Must use **semantic selectors** (prefer data-testid over CSS classes)
- Must include **proper error handling** in tests
- Must be **deterministic** (tests should pass reliably)

### Testing Constraints
- Must cover **all 7 acceptance criteria** from issue #27
- Tests should run in **< 5 minutes** total
- Tests must pass in **CI environment**
- Must use **API mocking** (`cy.intercept()`) for reliability
- Must clean up test data after tests complete

### Acceptance Criteria

From GitHub issue #27:
1. Test scenario selection
2. Test starting a session
3. Test sending multiple messages
4. Test receiving AI responses
5. Test ending session
6. Test feedback display
7. Test runs in CI

---

## Examples

### Input/Output Examples

**Example 1: Scenario Selection and Session Creation**
- Input: User clicks on "Ordering at a Café" scenario card
- Expected Output: 
  - POST request to `/sessions/` with `scenario_id: 'cafe_order'`
  - Response with `id` (session ID)
  - Navigation to `/chat/{sessionId}`
  - ChatInterface component renders with new session

**Example 2: Sending Messages**
- Input: User types "Bonjour" in input field and clicks Send
- Expected Output:
  - POST request to `/sessions/{sessionId}/messages/` with `content: 'Bonjour'`
  - User message appears in chat
  - AI response appears in chat (mocked in tests)
  - Input field is cleared

**Example 3: Ending Session and Viewing Feedback**
- Input: User clicks "End Session" button
- Expected Output:
  - POST request to `/sessions/{sessionId}/feedback/`
  - Response with feedback data (scores, corrections, etc.)
  - Navigation to `/feedback/{sessionId}`
  - FeedbackView component renders with feedback data

### Edge Cases

1. **Empty Message**: User tries to send empty message - should not send (frontend validation)
2. **Network Error**: API call fails - test should handle gracefully (mock error response)
3. **Session Locking**: Another tab has session locked - test navigation still works
4. **Multiple Sessions**: User has multiple sessions in history - test selects correct one
5. **Rapid Messages**: User sends multiple messages quickly - all should appear in order

### Test Cases

```typescript
// Example test case structure
describe('Conversation Flow', () => {
  beforeEach(() => {
    // Setup: intercept API calls, mock responses
    cy.intercept('POST', '/sessions/', { id: 1, scenario_id: 'cafe_order', created_at: '2024-01-01' })
    cy.intercept('POST', '/sessions/1/messages/', (req) => {
      req.reply({ role: 'assistant', content: 'Mock AI response', session_id: 1 })
    })
    cy.intercept('POST', '/sessions/1/feedback/', {
      grammar_score: 85,
      vocabulary_score: 90,
      fluency_score: 80,
      overall_score: 85,
      strengths: ['Good vocabulary'],
      focus_area: 'grammar',
      example_corrections: []
    })
  })

  it('should allow user to select scenario and start session', () => {
    // Given: User is on home page
    cy.visit('/')
    
    // When: User selects a scenario
    cy.get('[data-testid="scenario-cafe_order"]').click()
    
    // Then: User is navigated to chat page with new session
    cy.url().should('include', '/chat/1')
    cy.get('[data-testid="chat-interface"]').should('exist')
  })

  it('should allow user to send messages and receive responses', () => {
    // Given: User is in a chat session
    cy.visit('/chat/1')
    
    // When: User sends a message
    cy.get('[data-testid="message-input"]').type('Bonjour')
    cy.get('[data-testid="send-button"]').click()
    
    // Then: Message appears and AI responds
    cy.get('[data-testid="message-Bonjour"]').should('exist')
    cy.get('[data-testid="message-Mock AI response"]').should('exist')
  })

  it('should allow user to end session and view feedback', () => {
    // Given: User is in a chat session
    cy.visit('/chat/1')
    
    // When: User ends session
    cy.get('[data-testid="end-session-button"]').click()
    
    // Then: User sees feedback
    cy.url().should('include', '/feedback/1')
    cy.get('[data-testid="grammar-score"]').should('contain', '85')
  })
})
```

---

## Deliverables

### Code Changes

- [ ] `frontend/cypress.config.ts` - Cypress configuration file
- [ ] `frontend/cypress/tsconfig.json` - TypeScript configuration for Cypress
- [ ] `frontend/cypress/support/index.ts` - Support file with type definitions
- [ ] `frontend/cypress/support/commands.ts` - Custom commands
- [ ] `frontend/cypress/e2e/conversation-flow.cy.ts` - Main test spec
- [ ] `frontend/cypress/fixtures/test-data.json` - Test data fixtures
- [ ] `.github/workflows/cypress-tests.yml` - CI workflow for Cypress

### Tests

- [ ] Test for AC-1: Scenario selection
- [ ] Test for AC-2: Starting a session
- [ ] Test for AC-3: Sending multiple messages
- [ ] Test for AC-4: Receiving AI responses
- [ ] Test for AC-5: Ending session
- [ ] Test for AC-6: Feedback display
- [ ] Test for AC-7: CI execution (implicit - workflow file)

### Documentation

- [ ] Update `frontend/README.md` with Cypress setup instructions
- [ ] Add data-testid attributes to components if needed
- [ ] Document how to run E2E tests locally
- [ ] Document CI configuration for E2E tests

---

## Actual Prompt

**CRITICAL: This is the exact prompt that will be used to drive implementation. This prompt artifact MUST be created BEFORE any code is written.**

```
IMPLEMENT CYPRESS E2E TESTS FOR ISSUE #27: Complete Conversation Flow

CONTEXT:
You are implementing end-to-end tests for a React + TypeScript + Vite frontend application called French Language Coach. The application allows users to:
1. Select a conversation scenario from the home page
2. Start a chat session with an AI coach
3. Send messages and receive AI responses
4. End the session and view feedback

The application uses React Router for navigation with these routes:
- / (HomePage with ScenarioSelector)
- /chat/:sessionId (ChatPage with ChatInterface)
- /feedback/:sessionId (FeedbackPage with FeedbackView)

API Endpoints (to be mocked in tests):
- POST /sessions/ - Create a new session, returns { id, scenario_id, created_at }
- POST /sessions/:id/messages/ - Send a message, returns { role, content, session_id }
- POST /sessions/:id/feedback/ - Get feedback, returns Feedback object with scores and corrections

RELEVANT FILES:
- frontend/src/App.tsx - Routes definition
- frontend/src/pages/HomePage.tsx - Home page
- frontend/src/pages/ChatPage.tsx - Chat page
- frontend/src/pages/FeedbackPage.tsx - Feedback page
- frontend/src/components/ScenarioSelector.tsx - Scenario selection
- frontend/src/components/ChatInterface.tsx - Chat UI with send/end
- frontend/src/components/FeedbackView.tsx - Feedback display
- frontend/src/hooks/useSessions.tsx - Session state
- frontend/src/utils/api.ts - API client
- frontend/src/types/index.ts - TypeScript types (Session, Message, Feedback)

GOAL:
Implement Cypress E2E tests that cover the complete conversation flow. All 7 acceptance criteria from issue #27 must be tested.

ACCEPTANCE CRITERIA (from issue #27):
1. Test scenario selection
2. Test starting a session
3. Test sending multiple messages
4. Test receiving AI responses
5. Test ending session
6. Test feedback display
7. Test runs in CI

CONSTRAINTS:
- MUST use Cypress
- MUST use TypeScript for all test files
- MUST follow Cypress best practices (no arbitrary waits)
- MUST use cy.intercept() to mock API responses
- MUST NOT modify backend code
- MUST NOT break existing frontend functionality
- MUST add data-testid attributes to components if needed for stable selectors
- Tests MUST pass with mocked API responses
- Tests MUST run successfully in CI

EXAMPLES:

Example 1: Complete Flow
- User visits / (home page)
- User sees scenarios and clicks "Ordering at a Café"
- POST /sessions/ is called with scenario_id: 'cafe_order'
- User is navigated to /chat/1
- User types "Bonjour" and clicks Send
- POST /sessions/1/messages/ is called with content: 'Bonjour'
- User message and AI response appear in chat
- User sends another message
- User clicks "End Session"
- POST /sessions/1/feedback/ is called
- User is navigated to /feedback/1
- Feedback (scores, corrections) is displayed

Example 2: Multiple Messages
- User sends 3 messages in sequence
- Each message appears in chat
- Each triggers AI response
- All visible in correct order

DELIVERABLES:
1. Cypress configuration (cypress.config.ts)
2. TypeScript config for Cypress (cypress/tsconfig.json)
3. Support files (cypress/support/index.ts, cypress/support/commands.ts)
4. Test spec: cypress/e2e/conversation-flow.cy.ts
5. Test fixtures: cypress/fixtures/test-data.json
6. CI workflow: .github/workflows/cypress-tests.yml
7. README.md updates with E2E test instructions

IMPLEMENTATION REQUIREMENTS:
- Install Cypress as dev dependency
- Create all necessary configuration files
- Add data-testid attributes to components for stable selectors
- Mock all API calls using cy.intercept()
- Create custom commands for reusable actions (selectScenario, sendMessage, endSession)
- Write tests covering all 7 acceptance criteria
- Configure CI to run Cypress tests
- Ensure tests are deterministic and reliable

PATTERNS TO FOLLOW:
- Use describe/it for test organization
- Use data-testid for selectors (add to components if missing)
- Use cy.intercept() for API mocking
- Use cy.session() or beforeEach for setup
- Use TypeScript interfaces for test data
- Follow existing code style (2-space indent, etc.)

TEST DATA:
Create mock data matching the TypeScript types:
- Scenario: { id: 'cafe_order', name: 'Ordering at a Café', description: '...' }
- Session: { id: '1', scenario_id: 'cafe_order', created_at: '...', messages: [], feedback: null }
- Message: { id: '1', session_id: '1', role: 'user' | 'assistant', content: '...', created_at: '...' }
- Feedback: { grammar_score: 85, vocabulary_score: 90, fluency_score: 80, overall_score: 85, strengths: ['...'], focus_area: 'grammar', example_corrections: [] }
```

---

## AI Response

[To be filled after implementation - This section will capture the actual output from executing the prompt]

---

## Human Review Notes

[To be filled after implementation - This section will document any changes, refinements, or issues found during human review]

### Changes Made
- [ ] [List any changes made to the AI-generated code]

### Quality Checks
- [ ] Cypress is properly installed and configured
- [ ] All 7 acceptance criteria have corresponding tests
- [ ] Tests pass with mocked API responses
- [ ] TypeScript types are correct
- [ ] CI workflow is configured
- [ ] README.md is updated
- [ ] No breaking changes to existing code

### Issues Found
- [ ] [List any issues found and their resolutions]

---

## Verification

[To be completed after implementation]

- [ ] All acceptance criteria from issue #27 are met
- [ ] Tests pass when run locally
- [ ] Tests run successfully in CI
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
