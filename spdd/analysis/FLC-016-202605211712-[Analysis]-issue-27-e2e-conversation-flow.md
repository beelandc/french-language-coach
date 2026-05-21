# SPDD Analysis: E2E Test for Complete Conversation Flow

**GitHub Issue**: #27
**Issue Title**: E2E-1.5: E2E test conversation flow
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/27
**Artifact ID**: FLC-016-202605211712
**Created**: 2026-05-21 17:12
**Author**: Mistral Vibe

---

## Original Business Requirement

Cypress E2E test for complete conversation flow: select scenario -> chat -> feedback.

---

## Background

This issue requires implementing end-to-end tests using Cypress to validate the complete user journey through the French Language Coach application. The conversation flow consists of:
1. User selects a scenario from the home page
2. A new chat session is created
3. User sends multiple messages in the chat
4. User receives AI responses
5. User ends the session
6. User views feedback for the session

Currently, the application has unit tests (vitest) for React components but no E2E tests. This is a critical gap for Phase 1.5, as E2E tests ensure the entire application flow works correctly in a production-like environment.

---

## Business Value

- **Quality Assurance**: Validates the complete user journey works as expected
- **Regression Prevention**: Catches issues that unit tests might miss (integration between components, routing, API calls)
- **CI/CD Readiness**: Enables automated testing in CI pipelines
- **Phase 1.5 Completion**: Meets the milestone requirement for E2E test coverage

---

## Scope In

- [ ] Cypress test suite setup and configuration
- [ ] E2E test for scenario selection flow
- [ ] E2E test for chat session creation
- [ ] E2E test for sending messages and receiving AI responses
- [ ] E2E test for ending session
- [ ] E2E test for feedback display
- [ ] CI configuration to run Cypress tests

## Scope Out

- [ ] Backend API tests (covered by pytest in separate issues)
- [ ] Unit tests for individual components (already exist with vitest)
- [ ] Performance testing
- [ ] Accessibility testing (separate issue)
- [ ] Mobile-specific testing
- [ ] Cross-browser testing (initially focus on Chrome/Chromium)

---

## Acceptance Criteria (ACs)

From GitHub issue #27:

1. **AC-1**: Test scenario selection
   **Given** User is on the home page
   **When** User selects a scenario
   **Then** User is navigated to the chat page with a new session

2. **AC-2**: Test starting a session
   **Given** User has selected a scenario
   **When** User is redirected to chat page
   **Then** A new session is created with the selected scenario

3. **AC-3**: Test sending multiple messages
   **Given** User is in a chat session
   **When** User sends multiple messages
   **Then** Each message appears in the chat and AI responses are received

4. **AC-4**: Test receiving AI responses
   **Given** User has sent a message
   **When** Waiting for AI response
   **Then** AI response appears in the chat interface

5. **AC-5**: Test ending session
   **Given** User is in an active chat session
   **When** User clicks "End Session"
   **Then** Session is ended and user is navigated to feedback page

6. **AC-6**: Test feedback display
   **Given** User has ended a session
   **When** User is on the feedback page
   **Then** Feedback (scores, corrections, strengths) is displayed correctly

7. **AC-7**: Test runs in CI
   **Given** Code is pushed to repository
   **When** CI pipeline runs
   **Then** Cypress tests execute successfully

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **ScenarioSelector Component** (`frontend/src/components/ScenarioSelector.tsx`): Allows users to select from hardcoded scenarios and start a new session
- **ChatInterface Component** (`frontend/src/components/ChatInterface.tsx`): Handles sending messages, displaying chat history, and ending sessions
- **FeedbackView Component** (`frontend/src/components/FeedbackView.tsx`): Displays session feedback including scores and corrections
- **useSessions Hook** (`frontend/src/hooks/useSessions.tsx`): Manages session state, API calls for creating sessions, sending messages, and getting feedback
- **API Client** (`frontend/src/utils/api.ts`): Provides HTTP client for communicating with FastAPI backend
- **React Router** (`frontend/src/App.tsx`): Handles navigation between Home, Chat, and Feedback pages

### New Concepts Required

- **Cypress Test Framework**: E2E testing framework that runs in a real browser
- **Cypress Configuration** (`cypress.config.ts`): Configuration file for Cypress
- **Cypress Fixtures**: Test data (mock scenarios, messages)
- **Cypress Custom Commands**: Reusable commands for common actions (login, select scenario, etc.)
- **Cypress Support Files**: Type definitions and global configurations
- **Test Spec Files**: Actual test files in `cypress/e2e/` directory

### Key Business Rules

- **Session Flow**: Scenario selection -> Chat session creation -> Message exchange -> Session end -> Feedback display
- **Session Locking**: Sessions can be locked to prevent concurrent access from multiple tabs
- **Feedback Generation**: Feedback is generated when a session ends via POST to `/sessions/{id}/feedback/`
- **Message Storage**: Messages are stored in the session and retrieved via the API

---

## Strategic Approach

### Solution Direction

1. **Setup Cypress**: Install Cypress, create configuration files, and set up directory structure
2. **Create Base Test Configuration**: Add support files, custom commands, and fixtures
3. **Implement Conversation Flow Tests**: Write tests for each step of the user journey
4. **Handle API Mocking**: Use Cypress intercept to mock or manage backend API calls
5. **Configure CI Integration**: Add GitHub Actions workflow for running Cypress tests
6. **Verify Test Coverage**: Ensure all acceptance criteria are covered

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Use Cypress vs Playwright | Cypress: Easier setup, built-in assertions, real browser. Playwright: Faster, multi-browser. | **Cypress** - Already mentioned in SPDD.md, better for React apps, easier learning curve |
| Mock API vs Real API | Mock: Faster, deterministic. Real: More realistic, tests actual backend. | **Hybrid** - Use mocks for development, real API for CI (requires backend running) |
| Component Testing vs E2E | Component: Faster, isolated. E2E: Full user journey. | **E2E** - Issue specifically requests E2E tests for complete flow |
| Test Data Strategy | Hardcoded vs Fixtures vs Factories | **Fixtures** - JSON files for test data, easy to maintain |

### Alternatives Considered

- **Playwright**: While Playwright is faster and supports multiple browsers, Cypress is already mentioned in the project's SPDD.md and has excellent React support with `cypress/react` plugin. Additionally, Cypress has built-in retry-ability and a rich ecosystem for testing React applications.
- **Selenium**: Older technology, more verbose, less modern tooling. Not considered seriously.
- **No E2E Tests**: Would leave a critical testing gap. Rejected as it doesn't meet Phase 1.5 requirements.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Backend availability for CI | Can we assume backend is running in CI? | Use mock API responses in tests, but ensure tests can also run against real backend |
| Test environment | Which browser to target? | Chrome/Chromium as default, can expand later |
| Test data cleanup | Should we clean up test sessions after tests run? | Yes, add cleanup step to delete test sessions |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Network errors during API calls | Tests should handle transient failures gracefully | Use Cypress `cy.intercept()` to mock error responses and test error handling |
| Empty scenario list | Though currently hardcoded, future API might return empty | Test that UI handles this gracefully |
| Session locking conflicts | Multiple tabs trying to access same session | Tests should verify session locking works correctly |
| Slow AI responses | AI might take time to respond | Tests should wait for responses with appropriate timeouts |
| Multiple rapid messages | User sends messages quickly | Tests should handle async nature of message sending |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Cypress not compatible with Vite dev server | Tests might not work with current setup | Configure Cypress to work with production build or Vite server |
| Flaky tests due to timing | Tests pass locally but fail in CI | Use `cy.wait()` with appropriate timeouts, use Cypress retry-ability |
| Backend not available in CI | Tests requiring real API will fail | Implement comprehensive API mocking using `cy.intercept()` |
| Cross-origin issues | Cypress might have issues with CORS | Configure `chromeWebSecurity: false` in Cypress config for testing |
| Test data pollution | Test sessions from one run affect another | Use unique session identifiers, cleanup after tests |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-1 | Test scenario selection | Yes | Straightforward - test navigation from home to chat |
| AC-2 | Test starting a session | Yes | Verify session creation via API call |
| AC-3 | Test sending multiple messages | Yes | Send 2-3 messages, verify they appear |
| AC-4 | Test receiving AI responses | Yes | Mock AI responses, verify they display |
| AC-5 | Test ending session | Yes | Click end session, verify navigation to feedback |
| AC-6 | Test feedback display | Yes | Verify feedback components render with data |
| AC-7 | Test runs in CI | Yes | Add GitHub Actions workflow for Cypress |

**AC Coverage Summary**: All 7 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Tests must be reliable and not flaky
- Tests should run in a reasonable time (< 5 minutes)
- Test code should follow project conventions (TypeScript, etc.)
- Test data should be clean (no real user data affected)

---

## REASONS Canvas

### Requirements
From GitHub issue #27 acceptance criteria:
- Test scenario selection
- Test starting a session
- Test sending multiple messages
- Test receiving AI responses
- Test ending session
- Test feedback display
- Test runs in CI

### Examples

**Example 1: Complete Happy Path Flow**
- User opens app at `/`
- User sees scenario list and selects "Ordering at a Café"
- User is navigated to `/chat/{sessionId}`
- User sends "Bonjour, je voudrais un café"
- AI responds with greeting and question
- User sends "Un café noir, s'il vous plaît"
- AI responds appropriately
- User clicks "End Session"
- User is navigated to `/feedback/{sessionId}`
- Feedback page displays scores and corrections

**Example 2: Session with Multiple Messages**
- User sends 3 messages in sequence
- Each message appears in chat history
- Each message triggers AI response
- All messages visible in correct order

**Example 3: Feedback Display**
- Feedback includes: grammar_score, vocabulary_score, fluency_score, overall_score
- Feedback includes: strengths array, focus_area, example_corrections array
- All elements displayed correctly on page

### Architecture

**Existing Codebase Structure:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── ScenarioSelector.tsx  # Scenario selection UI
│   │   ├── ChatInterface.tsx      # Chat UI with message sending
│   │   └── FeedbackView.tsx       # Feedback display
│   ├── hooks/
│   │   └── useSessions.tsx        # Session state management
│   ├── pages/
│   │   ├── HomePage.tsx           # Home page with ScenarioSelector
│   │   ├── ChatPage.tsx           # Chat page wrapper
│   │   └── FeedbackPage.tsx       # Feedback page wrapper
│   ├── utils/
│   │   └── api.ts                 # API client
│   └── App.tsx                    # Routes definition
```

**Patterns to Follow:**
- TypeScript for all test files
- Cypress best practices (custom commands, page objects)
- Separation of concerns (support files, fixtures, specs)
- Consistent naming conventions

**New Structure to Create:**
```
cypress/
├── config/
│   └── cypress.config.ts         # Cypress configuration
├── e2e/
│   └── conversation-flow.cy.ts   # Main test spec
├── fixtures/
│   └── test-data.json            # Test data (scenarios, messages)
├── support/
│   ├── commands.ts               # Custom commands
│   ├── component-index.html      # For component testing
│   └── index.ts                  # Support file
└── tsconfig.json                 # TypeScript config for Cypress
```

### Standards

**Coding Standards:**
- Use TypeScript for all Cypress files
- Follow existing code style (2-space indentation, etc.)
- Use descriptive test names with `should` syntax
- Use Cypress best practices (no arbitrary waits, use aliases, etc.)
- Keep tests independent and isolated

**Testing Standards:**
- 80% coverage is mentioned in SPDD.md but for E2E, focus on critical user journeys
- Each acceptance criterion should have at least one test
- Tests should be deterministic (use mocks where needed)
- Tests should run in CI on every push

**Documentation Standards:**
- Add comments for complex test logic
- Document any test dependencies (backend, specific data)
- Update README.md if setup instructions change

### Omissions

**Explicitly Out of Scope:**
- Backend API implementation testing (pytest handles this)
- Unit testing of individual React components (vitest handles this)
- Performance testing (load testing, stress testing)
- Accessibility testing (a11y compliance)
- Mobile-specific responsive testing
- Cross-browser compatibility testing
- Security testing (penetration testing, etc.)
- Internationalization/localization testing
- Testing of error states that are already covered by unit tests

### Notes

**Implementation Hints:**
- Use `cy.intercept()` to mock API responses for reliability
- Use `cy.session()` or `cy.origin()` if cross-origin issues arise
- Use `cy.get()` with data-testid attributes for stable selectors
- Consider adding `data-testid` attributes to components if needed
- The backend API endpoints are: POST `/sessions/`, POST `/sessions/{id}/messages/`, POST `/sessions/{id}/feedback/`
- Session IDs are returned as integers from backend but treated as strings in frontend

**References:**
- Cypress Documentation: https://docs.cypress.io/
- Cypress + TypeScript: https://docs.cypress.io/guides/tooling/typescript-support
- Cypress + Vite: https://docs.cypress.io/guides/frameworks/vite-dev-server
- Testing Library principles: https://testing-library.com/docs/guiding-principles

**Existing Test Patterns:**
- Frontend uses vitest with `@testing-library/react` for unit tests
- See `frontend/src/components/ChatInterface.test.tsx` for example of component testing
- Backend uses pytest for API and service testing

### Solutions

**Reference Implementations:**
- Cypress Real World App: https://github.com/cypress-io/cypress-realworld-app
- Cypress Example Recipes: https://github.com/cypress-io/cypress-example-recipes
- Vite + React + TypeScript + Cypress starter: Various templates available

**Patterns to Follow:**
- Page Object Pattern for organizing test code
- Custom commands for reusable actions (selectScenario, sendMessage, endSession)
- Fixtures for test data to keep tests clean
- Type-safe assertions using TypeScript

**Existing Code to Mimate:**
- The vitest setup in `frontend/src/testSetup.ts` shows testing patterns
- The useSessions hook shows how API calls are structured
- The component files show the data structures (Session, Message, Feedback types)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
