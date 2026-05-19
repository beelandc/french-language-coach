# SPDD Prompt: Fix Frontend Test Failures - Router Nesting and Proxy Errors

**GitHub Issue**: #150
**Issue Title**: Fix Frontend Test Failures: Router Nesting and Proxy Errors
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/150
**Artifact ID**: FLC-007-202605161600-[Fix]-frontend-test-failures
**Created**: 2026-05-16 16:00
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-007-202605161545-[Analysis]-fix-frontend-test-failures.md`

---

## Context

### Current Codebase State
Frontend tests are failing with two distinct issues:
1. **Router Nesting Error**: Storybook interaction tests fail with `You cannot render a <Router> inside another <Router>` error
2. **HTTP Proxy Errors**: Tests attempting to connect to `/sessions/*` endpoints fail with `AggregateError` during test execution

Current test results: 4 failed files, 9 failed tests out of 41 total tests.

### Relevant Files
| File | Purpose | Key Issue |
|------|---------|-----------|
| `.storybook/preview.tsx` | Global story decorators | Wraps all stories in MemoryRouter |
| `frontend/src/components/ScenarioSelector.stories.tsx` | Scenario selector story | Has nested MemoryRouter decorator |
| `frontend/src/components/ChatInterface.stories.tsx` | Chat interface story | Has nested MemoryRouter decorator |
| `frontend/src/components/FeedbackView.stories.tsx` | Feedback view story | Has nested MemoryRouter decorator |
| `frontend/src/components/SessionHistory.stories.tsx` | Session history story | Has nested MemoryRouter decorator |
| `frontend/src/hooks/useSessions.tsx` | Sessions context and hook | Exports useSessions() hook, SessionsContext |
| `frontend/src/utils/api.ts` | API client | Exports sessionApi with real HTTP calls |
| `frontend/src/utils/storybookMocks.tsx` | Mock providers | Exports MockSessionsProvider with separate context |
| `frontend/vite.config.ts` | Vite configuration | Contains proxy config for /sessions/* |
| `frontend/src/utils/testSetup.ts` | Test setup | Configures API mocking for tests |

### Existing Patterns
- Storybook preview.tsx wraps all stories in MemoryRouter for React Router context
- Components use useSessions() hook from ../hooks/useSessions
- Some components (SessionHistory) use sessionApi directly from ../utils/api
- MockSessionsProvider provides mock context but uses separate MockSessionsContext

---

## Goal

**Primary Objective**: Fix all frontend test failures to achieve 100% pass rate (41/41 tests)

**Secondary Objectives**:
- Fix Router nesting errors by removing duplicate MemoryRouter decorators
- Configure API mocking to prevent real HTTP requests during tests
- Ensure tests run without requiring backend server
- Maintain existing storybook functionality for documentation

---

## Constraints

### Architecture Constraints
- Must use React Router v6 (single Router rule)
- Must maintain existing component interfaces
- Must not break existing storybook documentation
- Must use Vitest for testing

### Code Quality Constraints
- Follow existing TypeScript patterns
- No breaking changes to component APIs
- Maintain backward compatibility

### Testing Constraints
- Must achieve 100% test pass rate
- Tests must run without backend server
- No real HTTP requests in tests
- Mock API responses must be realistic

### Acceptance Criteria (from issue #150)
1. All frontend tests pass (100% pass rate)
2. Storybook interaction tests work without Router nesting errors
3. API mocking is properly configured for tests that need backend endpoints
4. Tests run without requiring backend server to be running
5. No regression in existing test functionality

---

## Examples

### Router Nesting Error
```
Error: You cannot render a <Router> inside another <Router>.
Location: Storybook interaction tests
Caused by: .storybook/preview.tsx wraps in MemoryRouter + individual stories wrap in MemoryRouter
```

### Proxy Error
```
[vite] http proxy error: /sessions/123
AggregateError: connection errors
Caused by: Backend not running during test execution
```

### Expected Behavior
- All 41 tests pass
- No Router nesting errors
- No proxy/connection errors
- Tests complete in reasonable time

---

## Deliverables

### Code Changes
- [x] `.storybook/preview.tsx` - Keep global MemoryRouter (already correct)
- [x] `frontend/src/components/ScenarioSelector.stories.tsx` - Remove MemoryRouter, add MockSessionsProvider
- [x] `frontend/src/components/ChatInterface.stories.tsx` - Remove MemoryRouter, add MockSessionsProvider to stories
- [x] `frontend/src/components/FeedbackView.stories.tsx` - Remove MemoryRouter, add MockSessionsProvider to stories
- [x] `frontend/src/components/SessionHistory.stories.tsx` - Remove MemoryRouter
- [x] `frontend/src/hooks/useSessions.tsx` - Export SessionsContext for use in mocks
- [x] `frontend/src/utils/storybookMocks.tsx` - Use real SessionsContext instead of MockSessionsContext
- [x] `frontend/vite.config.ts` - Add test setup file configuration
- [x] `frontend/src/testSetup.ts` - Create API mocking setup

### Tests
- [x] Verify all 41 tests pass
- [x] Verify no Router nesting errors
- [x] Verify no proxy errors

### Documentation
- [ ] Update README.md if test setup affects project documentation

---

## Actual Prompt

The following prompt was used to implement the solution:

```
Please implement the fixes for GitHub issue #150: Fix Frontend Test Failures - Router Nesting and Proxy Errors.

CONTEXT:
- Frontend uses React Router v6 with Storybook for component documentation and testing
- Storybook preview.tsx wraps all stories in MemoryRouter for React Router context
- Individual story files (ScenarioSelector, ChatInterface, FeedbackView, SessionHistory) also wrap components in MemoryRouter, causing nesting errors
- Components use either useSessions() hook or sessionApi directly for backend communication
- Tests attempt real HTTP requests to /sessions/* endpoints, causing connection errors when backend isn't running
- MockSessionsProvider exists but uses a separate context that doesn't work with useSessions()

GOAL:
- Fix Router nesting errors by removing duplicate MemoryRouter from story files
- Configure API mocking to prevent real HTTP requests during tests
- Achieve 100% test pass rate (41/41 tests)

CONSTRAINTS:
- Must follow React Router v6 rules (single Router)
- Must maintain existing component interfaces
- Must not break storybook documentation functionality
- Must use Vitest for testing
- Tests must run without backend server

ACCEPTANCE CRITERIA:
- All frontend tests pass (100% pass rate)
- Storybook interaction tests work without Router nesting errors
- API mocking is properly configured for tests that need backend endpoints
- Tests run without requiring backend server to be running
- No regression in existing test functionality

SOLUTION APPROACH:
1. Remove MemoryRouter decorators from individual story files (use global MemoryRouter from preview.tsx)
2. Update MockSessionsProvider to use the real SessionsContext so useSessions() hook works
3. Create test setup file (src/testSetup.ts) with API mocking for sessionApi
4. Add MockSessionsProvider decorators to stories that use useSessions() hook
5. Configure vite.config.ts to use the test setup file

EXAMPLES:
- Before: Story with nested MemoryRouter → Error
- After: Story without MemoryRouter → Works
- Before: Component calling sessionApi.listSessions() → Connection error
- After: Mocked sessionApi returns mock data → Success

DELIVERABLES:
- Updated story files without MemoryRouter decorators
- Updated storybookMocks.tsx using real SessionsContext
- New testSetup.ts with API mocking
- Updated vite.config.ts with setup file configuration
- All 41 tests passing
```

---

## AI Response

[Implementation was done directly by the AI assistant following SPDD methodology]

---

## Human Review Notes

### Changes Made
- Removed MemoryRouter imports and decorators from 4 story files
- Updated MockSessionsProvider to use real SessionsContext from useSessions.tsx
- Exported SessionsContext from useSessions.tsx
- Created testSetup.ts with mock sessionApi implementation
- Updated vite.config.ts to include test setup file
- Added MockSessionsProvider decorators to stories using useSessions()

### Quality Checks
- [x] All 41 tests pass (100% pass rate)
- [x] No Router nesting errors
- [x] No proxy/connection errors
- [x] Tests run without backend server
- [x] No regression in existing functionality
- [x] Storybook documentation still works

### Issues Found and Resolved
1. **Router Nesting**: Individual story files had MemoryRouter decorators in addition to global MemoryRouter in preview.tsx → Removed nested decorators
2. **Context Mismatch**: MockSessionsProvider used MockSessionsContext while components used real SessionsContext → Updated to use real SessionsContext
3. **API Mocking**: Components using sessionApi directly made real HTTP requests → Created mock in testSetup.ts

---

## Verification

- [x] All acceptance criteria from issue #150 are met
- [x] Tests pass with 100% pass rate (41/41)
- [x] Code follows project conventions
- [x] No breaking changes introduced
- [x] Human review completed

---

*Prompt based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
