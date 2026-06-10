# SPDD Test Scenarios: Vitest Workflow for CI

**GitHub Issue**: #185
**Issue Title**: feat(CI): Add Vitest workflow to run tests on PR/merge to main
**Artifact ID**: FLC-029-202606101620
**Created**: 2026-06-10 16:20
**Author**: Mistral Vibe
**Related Artifacts**:
- [Analysis: FLC-029-202606101605-[Analysis]-issue-185-vitest-workflow.md](../analysis/FLC-029-202606101605-[Analysis]-issue-185-vitest-workflow.md)
- [Prompt: FLC-029-202606101610-[Feat]-issue-185-vitest-workflow.md](FLC-029-202606101610-[Feat]-issue-185-vitest-workflow.md)

---

## Overview

This document describes the test scenarios for verifying the Vitest workflow implementation for GitHub issue #185. The workflow will be tested by creating a pull request and verifying that all acceptance criteria are met.

---

## Acceptance Criteria to Test

| AC# | Description | Test Scenario | Expected Outcome | Status |
|-----|-------------|---------------|------------------|--------|
| AC-01 | Create .github/workflows/vitest-tests.yml workflow file | File exists in repository | Workflow file exists at correct path with valid YAML | ⏳ |
| AC-02 | Workflow triggers on push/pull_request to main with frontend file changes | Create PR with frontend changes | Workflow is automatically triggered | ⏳ |
| AC-03 | Workflow runs npm run test (Vitest) in the frontend directory | Check workflow logs | Tests execute successfully | ⏳ |
| AC-04 | Workflow runs npm run test:coverage and uploads coverage reports | Check workflow logs | Coverage reports are generated and uploaded | ⏳ |
| AC-05 | Workflow uses Node.js matrix (similar to Jest workflow) | Check workflow logs | Tests run on Node.js 20 and 22 | ⏳ |
| AC-06 | Workflow uploads test results as artifacts | Check workflow artifacts | Test results (junit.xml) are available as downloadable artifacts | ⏳ |
| AC-07 | All existing Vitest tests pass in the workflow | Check workflow logs | All 20+ Vitest tests pass | ⏳ |

---

## Test Scenarios

### Scenario 1: Workflow File Creation
**Test Type**: Manual Verification
**Description**: Verify that the workflow file was created correctly
**Steps**:
1. Check that `.github/workflows/vitest-tests.yml` exists
2. Verify YAML syntax is valid
3. Verify file structure matches jest-tests.yml pattern

**Expected Results**:
- [x] File exists at `.github/workflows/vitest-tests.yml`
- [x] YAML syntax is valid (verified with Python yaml module)
- [x] File structure matches jest-tests.yml

**Status**: ✅ PASSED

---

### Scenario 2: Workflow Trigger on PR Creation
**Test Type**: CI/Integration
**Description**: Verify workflow triggers on PR with frontend changes
**Steps**:
1. Create a pull request from `feat/issue-185-vitest-workflow` to `main`
2. Ensure PR includes frontend file changes (the workflow file itself counts)
3. Monitor GitHub Actions for workflow trigger

**Expected Results**:
- [ ] Workflow `Vitest Unit Tests` appears in GitHub Actions
- [ ] Workflow runs automatically without manual intervention
- [ ] Workflow shows as triggered by the PR

**Status**: ⏳ PENDING (Will be tested when PR is created)

---

### Scenario 3: Node.js Matrix Testing
**Test Type**: CI/Integration
**Description**: Verify workflow runs on multiple Node.js versions
**Steps**:
1. Check workflow logs after trigger
2. Verify separate jobs for Node.js 20 and 22

**Expected Results**:
- [ ] Two jobs run in parallel (vitest-tests for Node 20 and Node 22)
- [ ] Both jobs complete successfully (or fail with test failures, not workflow errors)

**Status**: ⏳ PENDING

---

### Scenario 4: Test Execution
**Test Type**: CI/Integration
**Description**: Verify Vitest tests execute correctly
**Steps**:
1. Check workflow logs for test execution
2. Verify `npm run test -- --reporter=junit --outputFile=junit.xml` command runs
3. Verify tests pass or fail with appropriate output

**Expected Results**:
- [ ] Vitest tests execute without errors
- [ ] Test output shows in workflow logs
- [ ] All existing Vitest test files are discovered and run

**Status**: ⏳ PENDING

---

### Scenario 5: Coverage Generation
**Test Type**: CI/Integration
**Description**: Verify coverage reports are generated
**Steps**:
1. Check workflow logs for coverage execution
2. Verify `npm run test:coverage` runs on Node.js 20
3. Verify coverage directory is created

**Expected Results**:
- [ ] Coverage step executes on Node.js 20 only
- [ ] Coverage reports are generated in frontend/coverage/

**Status**: ⏳ PENDING

---

### Scenario 6: Artifact Upload
**Test Type**: CI/Integration
**Description**: Verify artifacts are uploaded correctly
**Steps**:
1. After workflow completes, check artifacts section
2. Download and inspect `vitest-results` artifact
3. Download and inspect `vitest-coverage` artifact

**Expected Results**:
- [ ] `vitest-results` artifact contains junit.xml
- [ ] `vitest-coverage` artifact contains coverage reports
- [ ] Artifacts are retained for 7 days
- [ ] Artifacts are uploaded even if tests fail (if: always())

**Status**: ⏳ PENDING

---

### Scenario 7: Path Filtering
**Test Type**: CI/Integration
**Description**: Verify workflow only triggers on frontend changes
**Steps**:
1. Create a PR with only backend file changes
2. Verify workflow does NOT trigger
3. Create a PR with frontend file changes
4. Verify workflow DOES trigger

**Expected Results**:
- [ ] Workflow does not trigger for backend-only changes
- [ ] Workflow triggers for frontend changes
- [ ] Workflow triggers when workflow file itself is changed

**Status**: ⏳ PENDING

---

### Scenario 8: All Vitest Tests Pass
**Test Type**: CI/Integration
**Description**: Verify all existing Vitest tests pass in workflow
**Steps**:
1. Check workflow logs for test results
2. Count number of passing tests
3. Verify no unexpected failures

**Expected Results**:
- [ ] All 20+ existing Vitest tests pass
- [ ] No test failures due to environment or configuration issues
- [ ] Test count matches expected number of tests

**Status**: ⏳ PENDING

---

## Test Environment

### Prerequisites
- GitHub repository: beelandc/french-language-coach
- Branch: feat/issue-185-vitest-workflow
- Files changed: .github/workflows/vitest-tests.yml, SPDD artifacts

### Test Data
- Existing Vitest test files in frontend/src/**/*.test.{ts,tsx}
- Node.js versions: 20, 22
- Frontend dependencies: vitest@4.1.6, @vitest/coverage-v8@4.1.6, @vitest/browser-playwright@4.1.6

---

## Test Execution Plan

1. **Manual Tests** (Completed)
   - [x] Verify workflow file creation and syntax
   - [x] Verify SPDD artifacts created
   - [x] Verify commit and push successful

2. **CI Tests** (To be executed via Pull Request)
   - [ ] Create PR and verify workflow triggers
   - [ ] Verify Node.js matrix execution
   - [ ] Verify test execution
   - [ ] Verify coverage generation
   - [ ] Verify artifact upload
   - [ ] Verify path filtering
   - [ ] Verify all tests pass

3. **Post-merge Tests** (After PR merge)
   - [ ] Verify workflow runs on push to main
   - [ ] Verify workflow runs on subsequent PRs with frontend changes

---

## Success Criteria

The implementation will be considered successful when:
- All 7 acceptance criteria from issue #185 are verified
- All test scenarios in this document pass
- SPDD artifacts are properly created and committed
- Workflow follows existing patterns (jest-tests.yml)
- YAML syntax is valid
- Code is merged into main branch

---

## Notes

- The final acceptance criterion (all existing Vitest tests pass) depends on the current state of the test suite and may require test fixes if there are pre-existing failures
- The workflow uses `npm run test -- --reporter=junit --outputFile=junit.xml` which adds JUnit reporter flags to the default test command
- Coverage reports are generated using the existing `npm run test:coverage` script which uses @vitest/coverage-v8

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
