# SPDD Analysis: Implement All Clear Gateway Job for GitHub Actions Status Checks

**GitHub Issue**: #190
**Issue Title**: Implement All Clear Gateway Job for GitHub Actions Status Checks
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/190
**Artifact ID**: FLC-033-202606152200
**Created**: 2026-06-15 22:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

The repository currently has multiple GitHub Actions workflow files with jobs that are selectively run depending on which files are modified in the target PR. This conditional execution causes complexity in defining a GitHub ruleset to only allow the PR to be merged into main if all relevant GitHub Actions succeed.

When using path-based filtering in workflows (e.g., `paths: ['src/**']`), jobs may be skipped if the relevant files aren't changed. GitHub treats any missing required status check as a failure, which means we cannot simply mark all conditional jobs as required in the ruleset.

**Proposed Solution**: Implement Method 1: The "All Clear" Gateway Job (industry best practice) in all workflows that use conditional job execution.

Instead of marking conditional/filtered jobs as required in the ruleset, each workflow file should include a final gateway job that:
1. Always executes (using `if: always()`)
2. Dynamically checks the status of dependent jobs
3. Serves as the single required check in the GitHub ruleset

---

## Background

The French Language Coach project uses GitHub Actions for CI/CD with multiple workflow files:
- `pytest-tests.yml` - Backend Python tests (pytest + factory-boy)
- `jest-tests.yml` - Frontend Jest unit tests
- `vitest-tests.yml` - Frontend Vitest unit tests
- `cypress-tests.yml` - End-to-end tests

All workflows use path-based filtering to run only when relevant files change. This is efficient but creates a problem for branch protection rules: GitHub requires all required status checks to pass, and missing checks (due to path filtering) are treated as failures.

The "All Clear Gateway Job" pattern solves this by having each workflow expose a single job that always runs and returns success only if all dependent conditional jobs either succeeded or were skipped.

---

## Business Value

- **Simplified Branch Protection**: Only need to require the gateway job in GitHub ruleset, not every conditional job
- **Flexibility**: Can add new conditional jobs without updating branch protection rules
- **Clarity**: Explicitly communicates which jobs are essential vs. optional
- **Industry Standard**: Widely adopted pattern in the GitHub Actions community
- **Maintainability**: Reduces complexity of managing branch protection as the project grows

---

## Scope In

- [ ] Identify all workflows with conditional job execution
- [ ] Add `status-check` gateway job to each workflow file
- [ ] Ensure gateway jobs always execute (`if: always()`)
- [ ] Gateway jobs check status of all dependent conditional jobs
- [ ] Gateway jobs return success if all dependent jobs succeeded or were skipped
- [ ] Update documentation for future workflow authors

## Scope Out

- [ ] Creating or modifying GitHub ruleset file (branch protection rules) - This is a GitHub repository setting, not a file in the repo
- [ ] Modifying existing job logic or behavior
- [ ] Adding new test functionality
- [ ] Changing the path filters on existing workflows
- [ ] Creating a separate workflow file for the gateway pattern

---

## Acceptance Criteria (ACs)

1. **AC1**: All workflows with conditional job execution have a gateway job
   **Given** A workflow file with path-based filtering
   **When** The workflow runs
   **Then** It includes a final `status-check` job that always executes

2. **AC2**: Gateway job checks all dependent jobs
   **Given** A workflow with multiple conditional jobs
   **When** The gateway job runs
   **Then** It checks the result of each dependent job

3. **AC3**: Gateway job returns success for skipped or successful dependent jobs
   **Given** A workflow where some jobs were skipped due to path filtering
   **When** The gateway job runs
   **Then** It returns success (exit 0) if all non-skipped jobs succeeded

4. **AC4**: Gateway job returns failure if any dependent job failed
   **Given** A workflow where at least one conditional job failed
   **When** The gateway job runs
   **Then** It returns failure (exit 1)

5. **AC5**: Pattern is documented for future workflow authors
   **Given** A new workflow author
   **When** They need to add conditional jobs
   **Then** They have clear documentation on implementing the gateway pattern

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Workflow: pytest-tests.yml** - Located at `.github/workflows/pytest-tests.yml`
  - Purpose: Run backend pytest unit tests
  - Path filters: Backend files (models/, routers/, services/, tests/, etc.)
  - Jobs: `pytest` (single job)

- **Workflow: jest-tests.yml** - Located at `.github/workflows/jest-tests.yml`
  - Purpose: Run frontend Jest unit tests
  - Path filters: Frontend files (frontend/)
  - Jobs: `jest-tests` (matrix strategy with Node 20 and 22)

- **Workflow: vitest-tests.yml** - Located at `.github/workflows/vitest-tests.yml`
  - Purpose: Run frontend Vitest unit tests
  - Path filters: Frontend files (frontend/)
  - Jobs: `vitest-tests` (matrix strategy with Node 20 and 22)

- **Workflow: cypress-tests.yml** - Located at `.github/workflows/cypress-tests.yml`
  - Purpose: Run end-to-end Cypress tests
  - Path filters: Frontend files (frontend/)
  - Jobs: `cypress-e2e` (main E2E tests), `cypress-browser-matrix` (cross-browser tests)
  - Note: `cypress-browser-matrix` has `needs: cypress-e2e` dependency

### New Concepts Required

- **Gateway Job Pattern**: A final job in each workflow that:
  - Uses `if: always()` to ensure it always runs
  - Has `needs:` array listing all conditional jobs to monitor
  - Contains logic to check each dependent job's result
  - Returns success if all jobs either succeeded or were skipped
  - Returns failure if any job failed

- **Status Check Logic**: Shell script logic to evaluate job results using `${{ needs.<job>.result }}` expression

### Key Business Rules

- All workflows must maintain their existing path-based filtering
- Gateway jobs must not affect the execution of existing jobs
- The gateway pattern must be consistent across all workflows
- Skipped jobs (due to path filtering) should not cause the gateway to fail
- Only failed jobs should cause the gateway to fail

---

## Strategic Approach

### Solution Direction

1. **Modify each workflow file** to add a `status-check` gateway job
2. **Use consistent naming** across all workflows (`status-check`)
3. **Implement the same logic pattern** in each workflow
4. **Maintain backward compatibility** - existing jobs unchanged
5. **Document the pattern** in a README or comment

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Use `status-check` vs `gateway` job name | `status-check` is more descriptive of purpose | Use `status-check` for consistency |
| Check all jobs individually vs. use matrix | Individual checks provide clearer error messages | Check each job individually in the script |
| Use shell script vs. GitHub Actions expression | Shell script is more readable and maintainable | Use shell script with `if` conditions |
| Include in all workflows vs. only conditional ones | All workflows benefit from consistent pattern | Add to all workflows for consistency |

### Alternatives Considered

- **Alternative 1**: Create a separate workflow that checks all other workflows - Rejected because it would add complexity and dependencies between workflows, and wouldn't work for PRs that only trigger some workflows
- **Alternative 2**: Use a GitHub Actions reusable workflow - Rejected because each workflow needs its own gateway job with its own `needs:` list, making reuse difficult
- **Alternative 3**: Remove path filtering entirely - Rejected because path filtering provides valuable optimization and reduces CI/CD costs

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Update GitHub ruleset" task | Whether this means creating a ruleset file in the repo or updating GitHub settings | Since rulesets are GitHub repository settings (not files), this likely means documenting the required checks. Will document which jobs to require in branch protection. |
| "Test with various PR scenarios" | Whether this needs automated testing or manual verification | Will perform manual verification with test PRs for different file path changes |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| All jobs skipped | Gateway job should still run and succeed | `if: always()` ensures gateway runs; all skipped jobs are acceptable |
| Some jobs skipped, some succeed | Common case - should succeed | Gateway checks each job, accepts skipped or success |
| Some jobs skipped, one fails | Should fail | Gateway detects the failed job and exits with error |
| Job cancelled | Should fail | GitHub Actions treats cancelled as failure, gateway should detect |
| Workflow with matrix strategy | Multiple job instances to check | The `needs:` reference checks the overall job, not individual matrix instances |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Incorrect job references in `needs:` | Gateway job won't have access to job results | Double-check all job names and dependencies |
| Shell script syntax errors | Gateway job fails even if all tests pass | Use simple, well-tested shell logic |
| Matrix jobs not properly checked | Some test failures might be missed | The matrix job as a whole is checked, not individual runs |
| Breaking existing CI/CD | PRs might fail or pass incorrectly | Test changes in a feature branch before merging to main |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | All workflows have gateway job | Yes | Need to add to all 4 workflows |
| AC2 | Gateway job checks all dependent jobs | Yes | Will add appropriate `needs:` and check logic |
| AC3 | Gateway returns success for skipped/success jobs | Yes | Shell logic checks for success OR skipped |
| AC4 | Gateway returns failure for failed jobs | Yes | Shell logic checks for failure |
| AC5 | Pattern documented | Yes | Will add comments/docs in workflow files |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Maintain existing path filtering behavior
- Don't break existing job execution
- Keep workflow files readable and maintainable

---

## REASONS Canvas

This section explicitly maps to the REASONS canvas from SPDD methodology.

### Requirements
From GitHub issue #190:
- Identify all workflows with conditional job execution
- Add `status-check` gateway job to each workflow
- Gateway job must always execute (using `if: always()`)
- Gateway job must dynamically check the status of dependent jobs
- Gateway job serves as the single required check in the GitHub ruleset
- Test with various PR scenarios (changes to different file paths)
- Document the pattern for future workflow authors

### Examples
Concrete test cases from the issue:

**Example 1: Backend file change**
- Input: PR modifies a file in `routers/`
- Expected: `pytest` job runs, `status-check` job runs and succeeds if pytest succeeds

**Example 2: Frontend file change**
- Input: PR modifies a file in `frontend/`
- Expected: `jest-tests`, `vitest-tests`, `cypress-tests` jobs run, all `status-check` jobs run and succeed if their tests succeed

**Example 3: Documentation-only change**
- Input: PR modifies only `README.md`
- Expected: All test jobs are skipped, all `status-check` jobs run and succeed (because all dependent jobs were skipped)

**Example 4: Mixed changes with one failure**
- Input: PR modifies backend and frontend files, backend tests fail
- Expected: `pytest` fails, `status-check` in pytest-tests.yml fails, PR cannot be merged

### Architecture
Existing codebase structure:
- `.github/workflows/` - Contains all GitHub Actions workflow files
- All workflows follow similar structure: triggers → jobs → steps
- All workflows use path-based filtering for both push and pull_request triggers
- `cypress-tests.yml` has job dependencies (cypress-browser-matrix needs cypress-e2e)

Patterns to follow:
- Keep workflow file structure consistent
- Use YAML comments to document the gateway pattern
- Maintain existing job naming conventions

### Standards
Coding standards for GitHub Actions:
- Use consistent indentation (2 spaces)
- Include descriptive job and step names
- Add comments explaining non-obvious logic
- Test workflow changes before merging to main

Quality requirements:
- Gateway job must be reliable and not fail unexpectedly
- All existing functionality must remain intact
- Pattern must be easily understandable by future maintainers

### Omissions
Explicitly out-of-scope:
- Creating or modifying GitHub repository branch protection rules (these are UI settings, not repo files)
- Changing which jobs are conditional or their path filters
- Modifying the actual test logic or job steps
- Creating automated tests for the workflow files themselves
- Implementing alternative methods (Method 2 or 3 from GitHub docs)

### Notes
Implementation hints:
- Use `${{ needs.<job-name>.result }}` to access dependent job results
- Job results can be: 'success', 'failure', 'cancelled', or 'skipped'
- The gateway job should accept 'success' or 'skipped' as pass, reject 'failure' or 'cancelled'
- Use `if: always()` to ensure the gateway job runs regardless of previous job status
- For workflows with matrix strategies, reference the job name (not matrix instance)

References:
- [GitHub Docs: Expressions for GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/expressions)
- [GitHub Docs: jobs.<job_id>.result](https://docs.github.com/en/actions/learn-github-actions/contexts#jobs-context)

### Solutions
Reference implementations:
- The issue provides an example pattern
- Similar patterns used in open-source projects (e.g., https://github.com/actions/toolkit)

Existing code to mimic:
- All workflows already use `if: always()` for artifact upload steps
- Matrix strategy pattern in jest-tests.yml and vitest-tests.yml
- Job dependencies pattern in cypress-tests.yml

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
