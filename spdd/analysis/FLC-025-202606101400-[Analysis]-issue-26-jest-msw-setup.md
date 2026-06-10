# SPDD Analysis: Set up jest + MSW for frontend

**GitHub Issue**: #26
**Issue Title**: 1.5-INFRA-2: Set up jest + @testing-library/react and MSW for API mocking
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/26
**Artifact ID**: FLC-025-202606101400-[Analysis]-issue-26-jest-msw-setup
**Created**: 2026-06-10 14:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Set up jest with @testing-library/react and MSW for API mocking.

## Acceptance Criteria

- [ ] jest configured in package.json
- [ ] @testing-library/react installed
- [ ] MSW set up for API mocking
- [ ] jest.config.js created
- [ ] Sample test file works
- [ ] CI runs tests on PR

---

## Background

The French Language Coach project currently uses **vitest** as its test runner for frontend tests. However, the project needs **jest** to be set up alongside (or as an alternative to) vitest, with proper configuration for:
- @testing-library/react - for React component testing
- MSW (Mock Service Worker) - for mocking API calls during tests

This setup will enable proper unit testing of React components with mocked API dependencies, following industry best practices for React application testing.

---

## Business Value

- **Standardization**: Jest is the industry-standard test runner for JavaScript/TypeScript projects
- **Better Ecosystem**: Jest has richer plugin ecosystem and community support
- **API Mocking**: MSW provides seamless API mocking for frontend tests without modifying component code
- **CI/CD Integration**: Proper test setup enables automated testing in CI/CD pipelines
- **Developer Experience**: Standard tooling makes it easier for new developers to contribute

---

## Scope In

- Install and configure jest as a test runner
- Install @testing-library/react as an explicit dependency
- Install and configure MSW (Mock Service Worker)
- Create jest.config.js with appropriate configuration for TypeScript and React
- Create or update a sample test file demonstrating the setup works
- Configure CI workflow to run jest tests on PR
- Ensure jest tests can run alongside existing vitest tests (or migrate to jest)

## Scope Out

- Migrating all existing tests from vitest to jest (unless explicitly required)
- Backend testing setup (this is frontend-specific)
- E2E test migration (Cypress tests remain separate)
- Test coverage threshold enforcement (not mentioned in ACs)

---

## Acceptance Criteria (ACs)

1. **AC1: jest configured in package.json**
   **Given** the package.json file
   **When** examining the scripts section
   **Then** there should be a "test:jest" or "test" script that runs jest

2. **AC2: @testing-library/react installed**
   **Given** the package.json dependencies
   **When** checking devDependencies
   **Then** @testing-library/react should be listed as a devDependency

3. **AC3: MSW set up for API mocking**
   **Given** the frontend test setup
   **When** examining the test configuration
   **Then** MSW should be installed and configured with proper handlers

4. **AC4: jest.config.js created**
   **Given** the frontend directory
   **When** looking for jest configuration
   **Then** a jest.config.js (or jest.config.ts) file should exist with proper configuration

5. **AC5: Sample test file works**
   **Given** a sample test file
   **When** running npm run test or npm run test:jest
   **Then** the tests should pass successfully

6. **AC6: CI runs tests on PR**
   **Given** the GitHub Actions workflow
   **When** a PR is created or updated
   **Then** the jest tests should run automatically

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Test Runner**: Currently using vitest (configured in package.json with scripts: test, test:ui, test:coverage)
- **Testing Utilities**: @testing-library/dom is available as transitive dependency through Storybook
- **API Client**: `src/utils/api.ts` contains API functions that need to be mocked during tests
- **React Components**: Components in `src/components/` need to be tested
- **TypeScript**: Project uses TypeScript, so jest needs TypeScript support
- **Vite**: Project uses Vite as the bundler

### New Concepts Required

- **jest**: Test runner that needs to be installed and configured
- **@testing-library/react**: React-specific testing utilities for rendering components
- **MSW (Mock Service Worker)**: Library for mocking HTTP requests in tests
- **jest.config.js**: Configuration file for jest to handle TypeScript, React, and module resolution
- **CI Workflow**: GitHub Actions workflow to run jest tests

### Key Business Rules

- Tests must be able to mock API calls without hitting real endpoints
- Test configuration must support TypeScript
- Test configuration must work with React 19
- The setup should not break existing vitest tests (if keeping both)

---

## Strategic Approach

### Solution Direction

1. **Install Dependencies**: Add jest, @testing-library/react, @types/jest, ts-jest, and msw as devDependencies
2. **Create Configuration**: Set up jest.config.js with proper TypeScript and React support
3. **Set Up MSW**: Create MSW mock handlers and setup files
4. **Create Sample Test**: Write a sample test file using jest and @testing-library/react with MSW
5. **Configure CI**: Update or create GitHub Actions workflow to run jest tests
6. **Verify Setup**: Run tests to ensure everything works

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Use jest alongside vitest | Pros: Gradual migration, both can coexist. Cons: Two test runners to maintain | Run both test runners in CI, but focus new tests on jest |
| Use ts-jest vs babel-jest | Pros of ts-jest: Native TypeScript support. Pros of babel-jest: Faster | Use ts-jest for better TypeScript integration |
| MSW setup location | Can be in test setup file or per-test file | Create a central setup file (src/mocks/server.ts) for common API mocks |
| Jest config format | JavaScript vs TypeScript | Use JavaScript (jest.config.js) for compatibility |

### Alternatives Considered

- **Alternative 1**: Replace vitest completely with jest - Rejected because existing tests use vitest and migration is out of scope
- **Alternative 2**: Use jest only for new tests, keep vitest for existing - Accepted approach
- **Alternative 3**: Use only @testing-library without MSW - Rejected because MSW is explicitly required in ACs

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Test runner replacement | Should jest replace vitest or coexist? | Coexist - run both in CI |
| MSW scope | Which API endpoints should be mocked? | Create handlers for main endpoints (sessions, grammar, feedback) |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| TypeScript path aliases | Jest needs to resolve imports like @/components | Configure moduleNameMapper in jest.config.js |
| ESM modules | Vite uses ESM, jest traditionally uses CommonJS | Use ESM support in jest via transform config |
| API base URL | MSW needs to intercept fetch calls to the correct URL | Configure MSW to intercept relative URLs |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Jest ESM support issues | Jest may not handle ESM modules properly | Use jest-experimental-esm or configure transform |
| TypeScript version compatibility | ts-jest may not support TypeScript 6.x | Check compatibility, may need specific ts-jest version |
| Conflicts with vitest | Both test runners may interfere | Use separate configs and scripts |
| MSW cleanup issues | Mock handlers may leak between tests | Ensure proper setup/teardown in test files |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | jest configured in package.json | Yes | Need to add test scripts |
| AC2 | @testing-library/react installed | Yes | Add to devDependencies |
| AC3 | MSW set up for API mocking | Yes | Install msw, create handlers |
| AC4 | jest.config.js created | Yes | Create with proper config |
| AC5 | Sample test file works | Yes | Create a test file, verify it passes |
| AC6 | CI runs tests on PR | Yes | Update workflow to include jest |

**AC Coverage Summary**: All 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- TypeScript support in jest configuration
- React 19 support
- ESM module support
- Proper path alias resolution

---

## REASONS Canvas

### Requirements
From GitHub issue #26:
- jest configured in package.json
- @testing-library/react installed
- MSW set up for API mocking
- jest.config.js created
- Sample test file works
- CI runs tests on PR

### Examples
- Sample test file should demonstrate: rendering a React component, making mocked API calls, asserting on rendered output
- CI workflow should run on pull_request and push events for main branch

### Architecture
- **Current**: Vite + React 19 + TypeScript + vitest
- **Target**: Vite + React 19 + TypeScript + vitest + jest + @testing-library/react + MSW
- **Patterns**: 
  - Jest configuration in root or frontend directory
  - MSW handlers in src/mocks/ directory
  - Test files with .test.ts or .spec.ts extension
  - GitHub Actions workflow in .github/workflows/

### Standards
- Follow existing project patterns (React, TypeScript, Vite)
- 80% test coverage requirement (from instructions.md)
- Use ESM modules where possible
- Proper TypeScript typing
- Clean separation of concerns

### Omissions
- Not migrating existing vitest tests to jest (out of scope)
- Not setting up test coverage reporting (not in ACs)
- Not configuring pre-commit hooks (not in ACs)
- Not setting up backend testing (frontend-only)

### Notes
- The project currently uses vitest for frontend tests
- @testing-library/dom is available as transitive dependency but @testing-library/react is NOT explicitly installed
- API client in src/utils/api.ts uses fetch and needs mocking
- Existing tests use vitest's vi mocking utilities
- Need to handle ESM module resolution for jest

### Solutions
- Reference: Standard React + jest + testing-library + MSW setup patterns
- Example MSW configuration from: https://mswjs.io/docs/getting-started/install
- Example jest configuration for Vite + TypeScript: Use ts-jest with proper transform config
- Similar setup in many React projects using the same stack

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
