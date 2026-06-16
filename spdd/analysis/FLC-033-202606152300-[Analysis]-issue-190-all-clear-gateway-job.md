# SPDD Analysis: Implement All Clear Gateway Job for GitHub Actions Status Checks

**GitHub Issue**: #190
**Issue Title**: Implement All Clear Gateway Job for GitHub Actions Status Checks
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/190
**Artifact ID**: FLC-033-202606152300
**Created**: 2026-06-15 23:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

The repository currently has multiple GitHub Actions workflow files with jobs that are selectively run depending on which files are modified in the target PR. This conditional execution causes complexity in defining a GitHub ruleset to only allow the PR to be merged into main if all relevant GitHub Actions succeed.

When using path-based filtering in workflows (e.g., `paths: ['src/**']`), **the entire workflow is skipped** if the relevant files aren't changed. GitHub treats any missing required status check as a failure, which means we cannot simply mark all conditional workflows as required in the ruleset.

**Proposed Solution**: Implement **Method 1: The "All Clear" Gateway Job** pattern.

**CRITICAL INSIGHT**: The initial implementation approach (adding gateway jobs inside each workflow) is INCORRECT because:
- When a workflow's path filter doesn't match the PR changes, the **entire workflow is skipped**
- A `status-check` job inside a skipped workflow will never execute
- Therefore, we need a **separate workflow** that always runs and checks the status of all other workflows

---

## Background

The French Language Coach project uses GitHub Actions for CI/CD with multiple workflow files:
- `pytest-tests.yml` - Backend Python tests (runs when backend files change)
- `jest-tests.yml` - Frontend Jest unit tests (runs when frontend files change)
- `vitest-tests.yml` - Frontend Vitest unit tests (runs when frontend files change)
- `cypress-tests.yml` - End-to-end Cypress tests (runs when frontend files change)

All workflows use path-based filtering at the **workflow trigger level** (`on: pull_request: paths:`). This means:
- If a PR modifies only `README.md`, NONE of the test workflows will run
- If a PR modifies backend files, only `pytest-tests.yml` will run
- If a PR modifies frontend files, `jest-tests.yml`, `vitest-tests.yml`, and `cypress-tests.yml` will run

The problem: GitHub branch protection rules require specific status checks to pass. If we mark all four workflows as required, but a PR only triggers two of them (because of path filtering), GitHub will see the other two as "missing" and treat them as failures.

---

## Corrected Solution Approach

**We need a separate workflow file** (e.g., `status-gateway.yml`) that:

1. **Always runs** on all PRs (no path filtering)
2. **Checks the status of all test workflows** that were triggered by the PR
3. **Uses the GitHub API** to query workflow runs for the current PR
4. **Determines which workflows should have run** based on the files changed
5. **Checks if any required workflows failed**
6. **Serves as the single required check** in branch protection rules

This is different from the initial approach of adding gateway jobs inside each workflow.

---

## Business Value

- **Simplified Branch Protection**: Only need to require the `status-gateway` workflow in GitHub ruleset
- **Flexibility**: Can add new conditional workflows without updating branch protection rules
- **Correctness**: Actually solves the problem of skipped workflows being treated as failures
- **Maintainability**: Centralizes the logic for checking all CI/CD results

---

## Scope In

- [ ] Create a new workflow file: `.github/workflows/status-gateway.yml`
- [ ] This workflow runs on all PRs to main (no path filtering)
- [ ] This workflow queries GitHub API for workflow runs triggered by the current PR
- [ ] This workflow determines which test workflows should have run based on file paths
- [ ] This workflow checks if all triggered workflows passed or were skipped
- [ ] This workflow fails if any triggered workflow failed
- [ ] Document the pattern in README.md

## Scope Out

- [ ] Modifying existing workflow files (pytest-tests.yml, jest-tests.yml, etc.)
- [ ] Removing path filters from existing workflows
- [ ] Creating or modifying GitHub branch protection rules (UI setting)
- [ ] Adding job-level gateway checks (the initial incorrect approach)

---

## Acceptance Criteria (ACs)

1. **AC1**: A separate gateway workflow file exists
   **Given** A PR is created
   **When** The PR targets main
   **Then** A `status-gateway` workflow always runs

2. **AC2**: Gateway workflow checks all relevant workflow runs
   **Given** A PR triggers some test workflows
   **When** The gateway workflow runs
   **Then** It checks the status of all workflows triggered by that PR

3. **AC3**: Gateway workflow handles skipped workflows correctly
   **Given** A PR that doesn't modify files for certain workflows
   **When** The gateway workflow runs
   **Then** It recognizes those workflows weren't triggered and doesn't fail for them

4. **AC4**: Gateway workflow returns failure if any triggered workflow failed
   **Given** A PR where at least one triggered workflow failed
   **When** The gateway workflow runs
   **Then** It returns failure

5. **AC5**: Pattern is documented for future maintainers
   **Given** A developer wants to understand the CI/CD setup
   **When** They read the documentation
   **Then** They understand how the gateway pattern works

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Workflow: pytest-tests.yml** - Backend test workflow with path filters
- **Workflow: jest-tests.yml** - Frontend Jest test workflow with path filters
- **Workflow: vitest-tests.yml** - Frontend Vitest test workflow with path filters
- **Workflow: cypress-tests.yml** - E2E test workflow with path filters

### New Concepts Required

- **Gateway Workflow**: A separate workflow file that:
  - Has no path filters (always runs on PRs to main)
  - Uses GitHub API to list workflow runs for the current PR
  - Filters workflow runs by the current PR
  - Determines expected workflows based on file changes
  - Checks status of each triggered workflow
  - Returns success only if all triggered workflows succeeded or were skipped
  
- **GitHub API Integration**: 
  - Uses `github.token` for authentication
  - Calls `GET /repos/{owner}/{repo}/actions/runs` to list workflow runs
  - Filters by `head_sha` or `run_attempt` to get current PR runs
  - Checks `status` and `conclusion` fields of workflow runs

### Key Business Rules

- The gateway workflow must run AFTER all other workflows complete
- The gateway workflow must handle the case where workflows are still in progress
- The gateway workflow must use proper GitHub API authentication
- The gateway workflow must be efficient (not poll indefinitely)

---

## Strategic Approach

### Solution Direction

1. Create `.github/workflows/status-gateway.yml` with the following structure:
   ```yaml
   name: Status Gateway
   on:
     pull_request:
       branches: [main]
       # NO paths filter - always runs
   
   jobs:
     status-check:
       runs-on: ubuntu-latest
       steps:
         - name: Get PR workflow runs
           uses: actions/github-script@v7
           with:
             script: |
               // Use GitHub API to list workflow runs for this PR
               // Filter by head_sha
               // Check which workflows ran and their status
         - name: Check results
           run: |
             # Check if all triggered workflows passed
             # Fail if any failed
   ```

2. Use GitHub API to query workflow runs
3. Determine which workflows should have run based on file paths
4. Check status of each and report results

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Separate workflow vs. job in each workflow | Separate workflow always runs; job in workflow doesn't run if workflow is skipped | Use separate workflow |
| GitHub API vs. workflow artifacts | API gives complete picture; artifacts require coordination | Use GitHub API |
| JavaScript (github-script) vs. shell | JavaScript easier for API calls; shell simpler for logic | Use github-script for API, shell for logic |
| Check all workflows vs. only test workflows | Check all for completeness; check only tests for simplicity | Check all workflows that should run |

### Alternatives Considered

- **Alternative 1**: Add gateway jobs inside each workflow - REJECTED because entire workflow is skipped if paths don't match
- **Alternative 2**: Remove all path filters from workflows - REJECTED because it would run all tests on every PR, wasting CI minutes
- **Alternative 3**: Use workflow_run event - CONSIDERED but more complex, triggers on workflow completion not PR creation

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Timing of gateway execution | Should it wait for other workflows? | Use workflow_run event or poll in gateway |
| Handling in-progress workflows | What if workflows are still running? | Gateway should wait or timeout |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| All workflows skipped | PR with no test-relevant changes | Gateway should succeed (no workflows to check) |
| Some workflows in progress | Workflows still running | Gateway should wait or report as pending |
| Workflow cancelled | Manual cancellation | Gateway should treat as failure |
| API rate limits | Too many API calls | Use pagination, handle rate limits |
| Multiple PRs simultaneously | Concurrent gateway runs | Each gateway checks its own PR's workflows |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| GitHub API token permissions | Can't read workflow runs | Use `github.token` with proper permissions |
| API rate limiting | Gateway fails due to rate limits | Use pagination, retry on 429 |
| Workflow run not yet visible | Race condition | Add delay or use workflow_run trigger |
| Complex file path analysis | Logic errors in determining expected workflows | Use simple path matching |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Separate gateway workflow exists | Yes | Need to create status-gateway.yml |
| AC2 | Gateway checks all relevant workflows | Yes | Use GitHub API to list workflow runs |
| AC3 | Handles skipped workflows | Yes | Filter by which workflows should run for the PR |
| AC4 | Returns failure for failed workflows | Yes | Check conclusion field of workflow runs |
| AC5 | Pattern documented | Yes | Update README.md |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the corrected approach.

---

## REASONS Canvas

This section explicitly maps to the REASONS canvas from SPDD methodology.

### Requirements
From GitHub issue #190:
- Implement All Clear Gateway Job pattern
- Handle conditional workflow execution (path-based filtering)
- Simplify GitHub ruleset configuration
- Test with various PR scenarios
- Document the pattern

### Examples

**Example 1: Backend-only PR**
- Input: PR modifies `routers/sessions.py`
- Expected: `pytest-tests.yml` runs, gateway workflow runs and checks its status

**Example 2: Frontend-only PR**
- Input: PR modifies `frontend/src/App.tsx`
- Expected: `jest-tests.yml`, `vitest-tests.yml`, `cypress-tests.yml` run, gateway checks all three

**Example 3: Documentation-only PR**
- Input: PR modifies only `README.md`
- Expected: No test workflows run, gateway recognizes this and succeeds (no workflows to check)

**Example 4: Backend PR with test failure**
- Input: PR modifies `routers/sessions.py` with breaking changes
- Expected: `pytest-tests.yml` fails, gateway detects this and fails

### Architecture
Existing codebase structure:
- `.github/workflows/` - Contains all GitHub Actions workflow files
- All workflows use path-based filtering at trigger level
- No existing workflow checks other workflows

Patterns to follow:
- Use GitHub Actions best practices
- Use `actions/github-script` for GitHub API calls
- Handle errors gracefully
- Use proper authentication

### Standards
Coding standards for GitHub Actions:
- Use consistent indentation (2 spaces)
- Include descriptive comments
- Handle API errors properly
- Don't expose secrets in logs

Quality requirements:
- Gateway must be reliable
- Must handle all edge cases
- Must be maintainable

### Omissions
Explicitly out-of-scope:
- Modifying existing workflow files' triggers or logic
- Creating branch protection rules (GitHub UI setting)
- Automated testing of the gateway workflow itself

### Notes
Implementation hints:
- Use `context.payload.pull_request.head.sha` to get PR head SHA
- Use `github.rest.actions.listWorkflowRunsForRepo()` to list workflow runs
- Filter by `head_sha` to get runs for this PR
- Check `status` and `conclusion` fields
- Use `workflow_id` to identify specific workflows

References:
- [GitHub Actions API Docs](https://docs.github.com/en/rest/actions/workflow-runs)
- [actions/github-script](https://github.com/actions/github-script)
- [GitHub Contexts](https://docs.github.com/en/actions/learn-github-actions/contexts)

### Solutions
Reference implementations:
- Similar patterns in open-source projects
- GitHub's own workflows use this approach

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
