# SPDD Prompt: Add Vitest Workflow for CI

**GitHub Issue**: #185
**Issue Title**: feat(CI): Add Vitest workflow to run tests on PR/merge to main
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/185
**Artifact ID**: FLC-029-202606101610
**Created**: 2026-06-10 16:10
**Author**: Mistral Vibe
**Related Analysis**: [FLC-029-202606101605-[Analysis]-issue-185-vitest-workflow.md](../analysis/FLC-029-202606101605-[Analysis]-issue-185-vitest-workflow.md)

---

## Context

The French Language Coach project needs a GitHub Actions workflow to run Vitest tests automatically on PR and merge to main. Currently, Jest tests run via CI, but Vitest tests (20+ test files) do not, creating a gap in frontend test coverage validation.

### Current Codebase State
- Vitest v4.1.6 is installed and configured
- 20+ Vitest test files exist in `frontend/src/**/*.test.{ts,tsx}`
- Existing GitHub Actions workflows:
  - `.github/workflows/jest-tests.yml` - Jest tests with Node.js matrix (20, 22)
  - `.github/workflows/cypress-tests.yml` - Cypress E2E tests
- Frontend package.json has scripts: `test: "vitest run"` and `test:coverage: "vitest run --coverage"`
- vite.config.ts configures Vitest with browser testing via @vitest/browser-playwright

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `.github/workflows/jest-tests.yml` | Reference Jest workflow | Uses Node.js matrix [20, 22], path filters for frontend/, artifact uploads |
| `.github/workflows/cypress-tests.yml` | Reference Cypress workflow | Similar structure with browser testing |
| `frontend/package.json` | Frontend dependencies and scripts | Contains `test`, `test:coverage` scripts, vitest@4.1.6 |
| `frontend/vite.config.ts` | Vite and Vitest configuration | Configures test.projects with browser: { enabled: true, headless: true } |

### Existing Patterns
- **Node.js Matrix**: Use matrix strategy with node-version: [20, 22]
- **Path Filters**: Trigger on `frontend/**` and workflow file changes
- **Artifact Uploads**: Use `actions/upload-artifact@v4` with `if: always()` and 7-day retention
- **Dependency Installation**: Use `npm ci` in frontend directory
- **Coverage Strategy**: Run coverage on one Node version only (Node 20) to save time
- **Action Versions**: Use v4 of actions/checkout, actions/setup-node, actions/upload-artifact

---

## Goal

**Primary Objective**: Create a GitHub Actions workflow file `.github/workflows/vitest-tests.yml` that automatically runs Vitest tests on push and pull_request events to main branch with frontend file changes.

**Secondary Objectives**:
- Follow the exact pattern established by jest-tests.yml
- Run tests on Node.js 20 and 22
- Run coverage on Node.js 20 only
- Upload test results and coverage reports as artifacts
- Ensure all existing Vitest tests pass in the workflow

---

## Constraints

### Architecture Constraints
- Must follow existing GitHub Actions workflow patterns
- Must use Node.js matrix with versions 20 and 22
- Must trigger only on frontend file changes
- Must use existing Vitest configuration from vite.config.ts
- Must work with browser-based Vitest tests

### Code Quality Constraints
- Workflow file must have valid YAML syntax
- Must use latest action versions (v4)
- Must follow the structure of jest-tests.yml

### Testing Constraints
- All 20+ existing Vitest tests must pass
- Coverage reports must be generated and uploaded
- Test results must be uploaded as artifacts

### Acceptance Criteria
From GitHub issue #185:
1. Create .github/workflows/vitest-tests.yml workflow file
2. Workflow triggers on push/pull_request to main with frontend file changes
3. Workflow runs npm run test (Vitest) in the frontend directory
4. Workflow runs npm run test:coverage and uploads coverage reports
5. Workflow uses Node.js matrix (similar to Jest workflow)
6. Workflow uploads test results as artifacts
7. All existing Vitest tests pass in the workflow

---

## Examples

### Reference Implementation (jest-tests.yml)
```yaml
name: Jest Unit Tests

on:
  push:
    branches:
      - main
    paths:
      - 'frontend/**'
      - '.github/workflows/jest-tests.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'frontend/**'
      - '.github/workflows/jest-tests.yml'

jobs:
  jest-tests:
    name: Jest Unit Tests
    runs-on: ubuntu-latest
    
    strategy:
      fail-fast: false
      matrix:
        node-version: [20, 22]
    
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: '**/package-lock.json'
      
      - name: Install Frontend Dependencies
        working-directory: frontend
        run: |
          npm ci
      
      - name: Run Jest Tests
        working-directory: frontend
        run: |
          npm run test:jest
      
      - name: Run Jest Tests with Coverage
        working-directory: frontend
        run: |
          npm run test:jest:coverage
        if: matrix.node-version == 20
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: jest-results
          path: |
            frontend/junit.xml
            frontend/test-results/
          retention-days: 7
      
      - name: Upload Coverage Report
        if: always() && matrix.node-version == 20
        uses: actions/upload-artifact@v4
        with:
          name: jest-coverage
          path: |
            frontend/coverage/
          retention-days: 7
```

### Expected Vitest Workflow Structure
```yaml
name: Vitest Unit Tests

on:
  push:
    branches:
      - main
    paths:
      - 'frontend/**'
      - '.github/workflows/vitest-tests.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'frontend/**'
      - '.github/workflows/vitest-tests.yml'

jobs:
  vitest-tests:
    name: Vitest Unit Tests
    runs-on: ubuntu-latest
    
    strategy:
      fail-fast: false
      matrix:
        node-version: [20, 22]
    
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: '**/package-lock.json'
      
      - name: Install Frontend Dependencies
        working-directory: frontend
        run: |
          npm ci
      
      - name: Run Vitest Tests
        working-directory: frontend
        run: |
          npm run test
      
      - name: Run Vitest Tests with Coverage
        working-directory: frontend
        run: |
          npm run test:coverage
        if: matrix.node-version == 20
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: vitest-results
          path: |
            # Need to identify Vitest test result paths
          retention-days: 7
      
      - name: Upload Coverage Report
        if: always() && matrix.node-version == 20
        uses: actions/upload-artifact@v4
        with:
          name: vitest-coverage
          path: |
            frontend/coverage/
          retention-days: 7
```

### Edge Cases
- No frontend changes in PR: Path filters prevent workflow trigger
- Tests fail: Workflow fails, artifacts still uploaded (always())
- Coverage generation fails: Coverage step fails, test results still uploaded

### Test Cases
The workflow itself will be tested by:
1. Creating a PR with frontend changes
2. Verifying workflow triggers
3. Verifying all Vitest tests pass
4. Verifying coverage reports are generated
5. Verifying artifacts are uploaded

---

## Deliverables

### Code Changes
- [ ] `.github/workflows/vitest-tests.yml` - New GitHub Actions workflow for Vitest

### Tests
- [ ] Workflow itself is tested by PR validation
- [ ] All existing 20+ Vitest tests must pass when workflow runs

### Documentation
- [ ] No README.md update needed (workflow is infrastructure, not user-facing)

---

## Actual Prompt

```
Please create the GitHub Actions workflow file `.github/workflows/vitest-tests.yml` for running Vitest tests in the French Language Coach project.

CONTEXT:
- Project has Vitest v4.1.6 installed with 20+ test files in frontend/src/**/*.test.{ts,tsx}
- Existing reference workflow: .github/workflows/jest-tests.yml with Node.js matrix [20, 22]
- Frontend package.json has: test: "vitest run", test:coverage: "vitest run --coverage"
- vite.config.ts configures Vitest with browser testing enabled
- Need to follow the exact pattern from jest-tests.yml

GOAL:
Create .github/workflows/vitest-tests.yml that:
1. Triggers on push/pull_request to main with frontend file changes
2. Uses Node.js matrix [20, 22]
3. Runs npm ci in frontend directory
4. Runs npm run test (Vitest)
5. Runs npm run test:coverage on Node 20 only
6. Uploads test results as artifacts (if: always())
7. Uploads coverage reports as artifacts on Node 20 (if: always())

CONSTRAINTS:
- Must match the structure and style of jest-tests.yml exactly
- Must use actions/checkout@v4, actions/setup-node@v4, actions/upload-artifact@v4
- Must use fetch-depth: 0 for checkout
- Must use cache: 'npm' and cache-dependency-path: '**/package-lock.json' for setup-node
- Must use fail-fast: false for strategy
- Must use 7-day retention for artifacts
- Must use working-directory: frontend for npm commands
- Must use if: always() for artifact uploads
- Must use if: matrix.node-version == 20 for coverage step

EXAMPLES:
Reference the jest-tests.yml file structure and adapt it for Vitest:
- Change "Jest" to "Vitest" in name and artifact names
- Change npm run test:jest to npm run test
- Change npm run test:jest:coverage to npm run test:coverage
- Update artifact paths if Vitest uses different paths than Jest
- Keep everything else the same

REQUIREMENTS:
- Vitest tests use @vitest/browser-playwright (from vite.config.ts)
- Playwright will be installed via npm ci automatically
- Vitest coverage uses @vitest/coverage-v8 (from package.json)

ACCEPTANCE CRITERIA:
- [ ] .github/workflows/vitest-tests.yml exists with valid YAML
- [ ] Triggers on push/pull_request to main with frontend/** and workflow file paths
- [ ] Uses Node.js matrix [20, 22]
- [ ] Runs npm run test in frontend directory
- [ ] Runs npm run test:coverage on Node 20 only
- [ ] Uploads vitest-results artifact
- [ ] Uploads vitest-coverage artifact on Node 20

DELIVERABLES:
- Single file: .github/workflows/vitest-tests.yml
```

---

## AI Response

[To be filled after implementation]

```
[AI-generated workflow file content]
```

---

## Human Review Notes

[To be filled after implementation and verification]

### Changes Made
- [ ] [List any manual changes made after AI generation]

### Quality Checks
- [ ] YAML syntax is valid
- [ ] Workflow follows jest-tests.yml pattern exactly
- [ ] All acceptance criteria from issue #185 are addressed
- [ ] Workflow file has correct name and location

### Issues Found
- [ ] [List any issues found and their resolutions]

---

## Verification

- [ ] All acceptance criteria from issue #185 are met
- [ ] Workflow file exists at .github/workflows/vitest-tests.yml
- [ ] Workflow YAML syntax is valid
- [ ] Workflow triggers are correctly configured
- [ ] Node.js matrix is [20, 22]
- [ ] Test and coverage commands are correct
- [ ] Artifact uploads are configured with always()
- [ ] Workflow follows existing patterns

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-binding](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
