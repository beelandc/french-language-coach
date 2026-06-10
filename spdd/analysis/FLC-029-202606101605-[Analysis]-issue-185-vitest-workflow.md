# SPDD Analysis: Add Vitest Workflow for CI

**GitHub Issue**: #185
**Issue Title**: feat(CI): Add Vitest workflow to run tests on PR/merge to main
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/185
**Artifact ID**: FLC-029-202606101605
**Created**: 2026-06-10 16:05
**Author**: Mistral Vibe

---

## Original Business Requirement

Vitest tests are currently not being executed automatically during pull requests or merges to the main branch, despite Vitest being installed and having 20+ test files in the frontend.

Currently Vitest v4.1.6 is installed but there is no GitHub Actions workflow to run Vitest tests on PR/merge to main.

Expected: When a pull request is created or updated, or when changes are pushed to main, Vitest tests should run automatically for frontend file changes.

---

## Background

The project has a growing frontend test suite using Vitest (v4.1.6) with 20+ test files covering React components, hooks, and utility functions. Currently, Jest tests run automatically via GitHub Actions, but Vitest tests do not. This creates a gap in CI coverage where frontend Vitest tests are not validated before merging.

This workflow is needed to ensure:
- Vitest tests pass before merging PRs
- Test coverage is maintained for Vitest tests
- Frontend code quality is validated consistently

---

## Business Value

- **Improved CI Coverage**: Ensures all frontend tests (both Jest and Vitest) run automatically
- **Early Bug Detection**: Catches test failures before code reaches main branch
- **Consistency**: Aligns Vitest with existing Jest CI workflow patterns
- **Developer Confidence**: Provides immediate feedback on PR quality

---

## Scope In

- [ ] Create `.github/workflows/vitest-tests.yml` workflow file
- [ ] Configure workflow triggers on push/pull_request to main
- [ ] Configure path filters for frontend file changes
- [ ] Set up Node.js matrix (similar to Jest workflow)
- [ ] Configure npm ci for dependency installation
- [ ] Configure `npm run test` execution
- [ ] Configure `npm run test:coverage` execution with coverage reports
- [ ] Set up artifact upload for test results
- [ ] Set up artifact upload for coverage reports

## Scope Out

- [ ] Modifying existing Vitest test files
- [ ] Adding new Vitest tests
- [ ] Changing Vitest configuration in vite.config.ts
- [ ] Modifying frontend/package.json scripts
- [ ] Backend CI workflows (already handled separately)

---

## Acceptance Criteria (ACs)

1. **AC-01**: Create .github/workflows/vitest-tests.yml workflow file
   **Given** The repository structure
   **When** The workflow file is created
   **Then** It exists at the correct path with proper YAML syntax

2. **AC-02**: Workflow triggers on push/pull_request to main with frontend file changes
   **Given** Changes to frontend files or workflow file
   **When** A push or pull request is made to main
   **Then** The workflow is triggered

3. **AC-03**: Workflow runs npm run test (Vitest) in the frontend directory
   **Given** The workflow runs
   **When** Tests execute
   **Then** Vitest tests run successfully

4. **AC-04**: Workflow runs npm run test:coverage and uploads coverage reports
   **Given** The workflow runs
   **When** Coverage step executes
   **Then** Coverage reports are generated and uploaded

5. **AC-05**: Workflow uses Node.js matrix (similar to Jest workflow)
   **Given** The workflow runs
   **When** Node.js is set up
   **Then** Tests run on multiple Node.js versions (20, 22)

6. **AC-06**: Workflow uploads test results as artifacts
   **Given** Tests complete
   **When** Artifact upload step runs
   **Then** Test results are available as downloadable artifacts

7. **AC-07**: All existing Vitest tests pass in the workflow
   **Given** The workflow runs
   **When** Tests complete
   **Then** All 20+ existing Vitest tests pass

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **GitHub Actions Workflows**: `.github/workflows/` directory contains CI workflows
  - `jest-tests.yml`: Reference workflow for Jest tests with Node.js matrix
  - `cypress-tests.yml`: Reference workflow for E2E tests
- **Frontend Testing Infrastructure**: 
  - `frontend/package.json`: Contains Vitest scripts (`test`, `test:coverage`)
  - `frontend/vite.config.ts`: Contains Vitest configuration with projects
  - `frontend/src/**/*.test.{ts,tsx}`: 20+ existing Vitest test files
- **Vitest Configuration**: Configured in vite.config.ts with browser testing enabled

### New Concepts Required

- **Vitest CI Workflow**: New GitHub Actions workflow specifically for Vitest tests
  - Must integrate with existing Node.js matrix pattern
  - Must handle browser-based Vitest tests (configured in vite.config.ts)

### Key Business Rules

- Workflow must trigger only on frontend file changes (not backend)
- Coverage reporting should run on one Node version to save resources
- Test results and coverage must be uploaded as artifacts
- Workflow must follow the pattern established by jest-tests.yml

---

## Strategic Approach

### Solution Direction

1. Create new workflow file `.github/workflows/vitest-tests.yml`
2. Model the workflow after existing `jest-tests.yml` pattern
3. Configure triggers for push and pull_request to main branch
4. Add path filters for frontend files
5. Set up Node.js matrix with versions 20 and 22
6. Install frontend dependencies using `npm ci`
7. Run Vitest tests using `npm run test`
8. Run coverage tests on one Node version using `npm run test:coverage`
9. Upload test results and coverage as artifacts

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Use Node.js matrix (20, 22) | Runs on 2 versions for compatibility | Follow jest-tests.yml pattern |
| Run coverage on Node 20 only | Saves time/resources | Same as jest-tests.yml approach |
| Use `npm ci` for installation | Ensures clean, reproducible builds | Standard practice for CI |
| Upload artifacts on always() | Preserves results even on failure | Critical for debugging |

### Alternatives Considered

- **Alternative 1**: Run coverage on all Node versions - Rejected because it would significantly increase CI time without proportional benefit
- **Alternative 2**: Use a single Node version - Rejected because we want compatibility testing across versions
- **Alternative 3**: Combine with Jest workflow - Rejected because they serve different test suites and should remain separate for clarity and independent execution

---

## Risk & Gap Analysis

### Requirement Ambiguities

None identified. The issue has clear acceptance criteria and references existing patterns.

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| No frontend changes in PR | Avoids unnecessary test runs | Path filters prevent workflow trigger |
| Tests fail | Provides feedback to developer | Workflow fails, PR cannot merge |
| Coverage generation fails | Still provides test results | Coverage step fails, test results still uploaded |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Browser-based Vitest tests in CI | Tests may need browser environment | Use existing vite.config.ts browser configuration |
| Playwright dependency | Browser tests require Playwright | Already in devDependencies, will be installed |
| Artifact size limits | Coverage reports may be large | Use 7-day retention, standard practice |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-01 | Create workflow file | Yes | Will create vitest-tests.yml |
| AC-02 | Triggers on push/PR with frontend changes | Yes | Configure on: push/pull_request with paths |
| AC-03 | Runs npm run test | Yes | Add step in workflow |
| AC-04 | Runs npm run test:coverage | Yes | Add conditional step for Node 20 |
| AC-05 | Uses Node.js matrix | Yes | Configure matrix with [20, 22] |
| AC-06 | Uploads test results as artifacts | Yes | Use actions/upload-artifact |
| AC-07 | All existing tests pass | Yes | Verify by running workflow |

**AC Coverage Summary**: 7 of 7 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Workflow file must follow YAML syntax
- Workflow must use actions/checkout and actions/setup-node
- Workflow must handle failures gracefully (always() for artifacts)

---

## REASONS Canvas

### Requirements
From GitHub issue #185 acceptance criteria:
- Create .github/workflows/vitest-tests.yml workflow file
- Workflow triggers on push/pull_request to main with frontend file changes
- Workflow runs npm run test (Vitest) in the frontend directory
- Workflow runs npm run test:coverage and uploads coverage reports
- Workflow uses Node.js matrix (similar to Jest workflow)
- Workflow uploads test results as artifacts
- All existing Vitest tests pass in the workflow

### Examples
Reference implementations:
- `.github/workflows/jest-tests.yml`: Existing Jest workflow with Node.js matrix, path filters, artifact upload
- `.github/workflows/cypress-tests.yml`: Existing Cypress workflow with similar patterns

### Architecture
- GitHub Actions workflows in `.github/workflows/`
- Frontend tests in `frontend/` directory
- Node.js matrix pattern for cross-version testing
- Artifact upload using `actions/upload-artifact@v4`
- Path-based triggering to optimize CI runs

### Standards
- Follow existing jest-tests.yml pattern
- Use Node.js 20 and 22 (matching jest-tests.yml)
- Run coverage on Node 20 only (matching jest-tests.yml)
- Upload artifacts with 7-day retention
- Use `npm ci` for clean installs
- Use `if: always()` for artifact uploads

### Omissions
Explicitly out of scope:
- Modifying existing test files
- Changing Vitest configuration
- Modifying package.json
- Backend CI workflows
- Test file creation

### Notes
- Vitest is configured with browser testing in vite.config.ts (using @vitest/browser-playwright)
- 20+ existing Vitest test files in frontend/src/**/*.test.{ts,tsx}
- vite.config.ts has test.projects with Storybook test configuration
- Package.json has `test: "vitest run"` and `test:coverage: "vitest run --coverage"`

### Solutions
Reference implementations to mimic:
- `.github/workflows/jest-tests.yml`: Primary pattern reference
- `.github/workflows/cypress-tests.yml`: Secondary pattern reference

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
