# SPDD Analysis: Fix Frontend Test Failures - Router Nesting and Proxy Errors

**GitHub Issue**: #150
**Issue Title**: Fix Frontend Test Failures: Router Nesting and Proxy Errors
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/150
**Artifact ID**: FLC-007-202605161545-[Analysis]-fix-frontend-test-failures
**Created**: 2026-05-16 15:45
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Frontend tests are currently failing with two distinct issues:

1. **Router Nesting Error**: Storybook interaction tests fail with `You cannot render a <Router> inside another <Router>` error
2. **HTTP Proxy Errors**: Tests attempting to connect to `/sessions/*` endpoints fail with `AggregateError` during test execution

Current Test Results: Test Files: 4 failed | 7 passed (11), Tests: 9 failed | 32 passed (41)

### Failing Tests (9 total):
- src/components/ScenarioSelector.stories.tsx - 1 failed
- src/components/ChatInterface.stories.tsx - 2 failed  
- src/components/FeedbackView.stories.tsx - 3 failed
- src/components/SessionHistory.stories.tsx - 3 failed

---

## Background

The project recently migrated to React (from vanilla JS) and uses Storybook with Vitest for interaction testing. Issue #149 (Session deletion UI) triggered discovery of these test issues during development. The test failures prevent reliable CI/CD and local development.

---

## Business Value

- **Improved Developer Experience**: Tests must pass for developers to verify changes confidently
- **CI/CD Enablement**: Passing tests are required for automated deployment pipelines
- **Quality Assurance**: Tests validate component behavior before merging to main
- **Regression Prevention**: Tests catch bugs introduced by new changes

---

## Scope In

- [ ] Fix Router nesting errors in Storybook interaction tests
- [ ] Fix HTTP proxy errors for /sessions/* endpoints during test execution
- [ ] Configure proper API mocking for storybook tests
- [ ] Ensure tests run without requiring backend server
- [ ] Verify 100% test pass rate (41/41 tests)

## Scope Out

- [ ] Backend test configuration
- [ ] End-to-end test setup
- [ ] CI/CD pipeline configuration
- [ ] Performance optimization of tests

---

## Acceptance Criteria (ACs)

1. **AC1**: All frontend tests pass (100% pass rate)
   **Given** The test suite is run
   **When** All tests complete
   **Then** 41/41 tests pass

2. **AC2**: Storybook interaction tests work without Router nesting errors
   **Given** Storybook interaction tests are executed
   **When** Components are rendered in test environment
   **Then** No "You cannot render a <Router> inside another <Router>" error occurs

3. **AC3**: API mocking is properly configured for tests that need backend endpoints
   **Given** Tests make API calls to /sessions/*
   **When** Tests run
   **Then** Mocked responses are returned instead of real HTTP requests

4. **AC4**: Tests run without requiring backend server to be running
   **Given** Backend server is not running
   **When** Frontend tests are executed
   **Then** All tests pass

5. **AC5**: No regression in existing test functionality
   **Given** Previously passing tests
   **When** Tests run
   **Then** All previously passing tests still pass

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Storybook Configuration**: `.storybook/main.ts` and `.storybook/preview.tsx` - Configure Storybook with React Vite
- **Storybook Preview Decorators**: `.storybook/preview.tsx` - Wraps all stories in MemoryRouter
- **Individual Story Decorators**: Various `.stories.tsx` files - Some wrap components in additional MemoryRouter
- **MockSessionsProvider**: `src/utils/storybookMocks.tsx` - Mock context provider for sessions data
- **API Client**: `src/utils/api.ts` - Generic API client that makes fetch calls to backend
- **Vite Configuration**: `frontend/vite.config.ts` - Contains proxy configuration for /sessions/*
- **Vitest Configuration**: Inline in vite.config.ts - Storybook test project configuration

### New Concepts Required

- **Centralized Router Configuration**: Single Router at Storybook preview level only
- **API Mocking for Tests**: Mock fetch or sessionApi module for storybook tests
- **Test Setup Files**: Vitest setup files for proper mocking

### Key Business Rules

- React Router v6 explicitly forbids nested Router components
- Storybook addon-vitest wraps stories in a test environment
- Vite proxy only works when backend server is running
- Tests should be isolated and not depend on external services

---

## Strategic Approach

### Solution Direction

Based on root cause analysis:

1. **Router Nesting Fix**: Remove nested MemoryRouter decorators from individual story files. The `.storybook/preview.tsx` already wraps all stories in a MemoryRouter. Individual story files that add their own MemoryRouter create nesting.

2. **Proxy Error Fix**: Configure API mocking for storybook tests. The Vite proxy attempts to forward /sessions/* requests to localhost:8000, but during tests the backend isn't running. Need to mock the API client or fetch calls.

### Implementation Plan

1. **Step 1**: Update `.storybook/preview.tsx` to ensure proper Router configuration
2. **Step 2**: Remove MemoryRouter decorators from all `.stories.tsx` files that have them
3. **Step 3**: Create API mocking configuration for storybook tests
4. **Step 4**: Update vite.config.ts to handle test-specific configuration
5. **Step 5**: Verify all tests pass

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Remove nested Routers vs keep them | Removing: Simpler, follows React Router best practices. Keeping: Might need for special cases | **Remove nested Routers** - Follows React Router v6 guidelines |
| Mock at fetch level vs sessionApi level | Fetch level: More comprehensive, catches all HTTP calls. sessionApi level: More specific, easier to maintain | **Mock at sessionApi level** - More maintainable, matches existing mocking patterns |
| Use vi.mock vs MSW for mocking | vi.mock: Simple, built into Vitest. MSW: More powerful, better for complex scenarios | **Use vi.mock** - Already used in codebase, simpler setup |

### Alternatives Considered

- **Alternative 1**: Use Storybook's Router decorators selectively - Rejected because it's more complex and doesn't solve the nested Router issue
- **Alternative 2**: Create separate test configs for different test types - Rejected because it adds complexity without clear benefit
- **Alternative 3**: Run backend in test mode - Rejected because tests should be isolated and not require external services

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| None identified | All requirements are clear from issue description | Proceed with implementation |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Stories that need custom Router config | Some stories may need specific initial entries | Use per-story decorators sparingly, ensure no nesting |
| API calls in nested components | Child components may make API calls | API mocking should be comprehensive |
| Different HTTP methods (GET, POST, DELETE) | Various endpoints are called | All sessionApi methods should be mocked |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Breaking existing stories | Stories may rely on current Router setup | Test each story after changes |
| Mock data mismatch | Mock responses may not match real API | Use realistic mock data from existing mocks |
| Test environment differences | Tests may behave differently in CI | Use consistent mocking approach |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | All tests pass | Yes | Will verify with test run |
| AC2 | No Router nesting errors | Yes | Remove nested Routers |
| AC3 | API mocking configured | Yes | Mock sessionApi module |
| AC4 | Tests run without backend | Yes | Mocking prevents real HTTP calls |
| AC5 | No regression | Yes | Verify all previously passing tests still pass |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Maintain existing storybook functionality for documentation
- Keep mock data realistic and useful for development

---

## REASONS Canvas

### Requirements
From GitHub issue #150 acceptance criteria:
- All frontend tests pass (100% pass rate)
- Storybook interaction tests work without Router nesting errors
- API mocking is properly configured for tests that need backend endpoints
- Tests run without requiring backend server to be running
- No regression in existing test functionality

### Examples

**Router Nesting Error:**
```
Error: You cannot render a <Router> inside another <Router>.
Location: Storybook interaction tests
Caused by: .storybook/preview.tsx wraps in MemoryRouter + individual stories wrap in MemoryRouter
```

**Proxy Error:**
```
[vite] http proxy error: /sessions/123
AggregateError: connection errors
Caused by: Backend not running during test execution
```

**Expected Behavior:**
- Stories render without Router errors
- API calls return mocked data instead of making real HTTP requests
- All 41 tests pass

### Architecture

**Existing Patterns:**
- Storybook preview.tsx uses MemoryRouter decorator for all stories
- Individual story files also add MemoryRouter decorators (problematic)
- MockSessionsProvider exists for mocking sessions context
- sessionApi in src/utils/api.ts provides typed API client
- Vite proxy configuration in vite.config.ts

**Files to Modify:**
- `.storybook/preview.tsx` - Global story decorators
- `frontend/src/components/*.stories.tsx` - Remove nested MemoryRouter
- `frontend/vite.config.ts` - Test configuration
- `frontend/src/utils/api.ts` or test setup - API mocking

### Standards

**Coding Standards:**
- Follow existing TypeScript patterns
- Use vi.mock for mocking (already in use)
- Maintain 80%+ test coverage
- No breaking changes to existing functionality

**Testing Standards:**
- Mock external dependencies
- Tests should be isolated
- No network calls in unit/integration tests

**Documentation Standards:**
- Update README if test setup changes
- Add comments explaining mocking approach

### Omissions

**Explicitly Out of Scope:**
- Backend test configuration
- End-to-end test setup
- CI/CD pipeline configuration
- Performance optimization of tests
- Backend server configuration

### Notes

**Implementation Hints:**
- React Router v6 has strict single-router requirement
- Storybook addon-vitest creates a test environment that may already include Router context
- The preview.tsx decorator wraps ALL stories, so individual story decorators create nesting
- Components that use useNavigate or useParams need Router context (provided by preview.tsx)
- sessionApi module is the central point for all backend API calls
- Mocking at the module level prevents real HTTP calls

**References:**
- React Router v6 documentation on Router nesting
- Storybook addon-vitest documentation
- Vitest mocking documentation
- Existing MockSessionsProvider in src/utils/storybookMocks.tsx

### Solutions

**Reference Implementations:**
- MockSessionsProvider pattern (existing) - Shows how to mock context
- Other story files that don't use MemoryRouter (ChatHeader, ScenarioCard, MessageBubble, SessionDetail, CorrectionItem, ScoreCard, SessionHistoryItem) - These pass and don't have Router nesting
- vi.mock usage in test files (if any exist)

**Patterns to Follow:**
- Single Router at the top level (preview.tsx)
- Mock API calls at the module level
- Use existing mock data from storybookMocks.tsx

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
