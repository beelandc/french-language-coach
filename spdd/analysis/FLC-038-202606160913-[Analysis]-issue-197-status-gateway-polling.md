# SPDD Analysis: Status Gateway Polling Implementation

**GitHub Issue**: #197
**Issue Title**: Status Gateway workflow completes without waiting for all workflows to finish
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/197
**Artifact ID**: FLC-038-202606160913
**Created**: 2026-06-16 09:13
**Author**: Mistral Vibe

---

## Original Business Requirement

The Status Gateway GitHub Action (status-gateway.yml) currently completes without actively waiting for all other scheduled workflows to finish. When it detects workflows are still in progress (queued or in_progress), it sets its status to 'pending' and exits. However, GitHub treats the workflow itself as completed, which can cause false successes when branch protection only requires this gateway check.

---

## Background

The Status Gateway workflow was originally implemented in issue #190 as an "All Clear Gateway Job" following industry best practices. Its purpose is to solve the problem where path-based workflow filtering causes workflows to be skipped, and GitHub treats missing required checks as failures.

The current implementation queries the GitHub API for workflow runs matching the PR's head SHA. If any expected workflows are still queued or in_progress, it logs them, sets output status to 'pending', and exits. However, GitHub marks the Status Gateway workflow as completed (with success), which means:

1. Branch protection rules that only require the gateway check will pass the PR
2. Later, if a previously in-progress workflow fails, the PR incorrectly shows as passing
3. This creates a race condition where the gateway completes before dependent workflows finish

---

## Business Value

- **Correctness**: Ensures PR status accurately reflects the state of all required workflows
- **Reliability**: Prevents false successes in branch protection
- **Safety**: Maintains CI/CD integrity by ensuring all tests pass before allowing merges
- **Developer Confidence**: Developers can trust that a passing gateway means all workflows passed

---

## Scope In

- [ ] Modify the 'Get workflow runs for this PR' step in status-gateway.yml
- [ ] Implement a polling loop that queries GitHub API repeatedly
- [ ] Wait for ALL expected workflows to complete (success, failure, or cancelled)
- [ ] Use reasonable polling interval (30-60 seconds)
- [ ] Add maximum timeout to prevent infinite waiting
- [ ] Handle edge cases (workflows not yet triggered, API rate limits)
- [ ] Maintain backward compatibility with existing workflow names

## Scope Out

- [ ] Modifying the test workflows themselves (pytest-tests.yml, jest-tests.yml, vitest-tests.yml, cypress-tests.yml)
- [ ] Changing branch protection rules in GitHub
- [ ] Adding new workflow types to track
- [ ] Implementing a separate status dashboard
- [ ] Modifying other workflow files

---

## Acceptance Criteria (ACs)

1. **AC1**: Status Gateway workflow actively polls for workflow run statuses
   **Given** a PR is created with changes that trigger multiple workflows
   **When** some workflows are still in progress
   **Then** the gateway workflow continues polling instead of exiting

2. **AC2**: Gateway waits for ALL expected workflows to complete
   **Given** workflows are in queued or in_progress state
   **When** polling continues
   **Then** gateway only proceeds when all workflows reach completed state (success, failure, or cancelled)

3. **AC3**: Gateway correctly identifies and reports final status
   **Given** all workflows have completed
   **When** evaluating final status
   **Then** gateway reports success only if all workflows passed, failure if any failed

4. **AC4**: Polling has reasonable interval and timeout
   **Given** default configuration
   **When** polling is active
   **Then** interval is 30-60 seconds and has a maximum timeout (e.g., 30 minutes)

5. **AC5**: Gateway handles edge cases gracefully
   **Given** scenarios like workflows not yet triggered, API errors, rate limits
   **When** these scenarios occur
   **Then** gateway handles them appropriately without infinite loops

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Status Gateway Workflow** (`/github/workflows/status-gateway.yml`): The workflow that needs modification. Currently implements a single query to GitHub API.
- **Expected Workflow Names**: Currently tracked workflows are:
  - 'Pytest Backend Unit Tests'
  - 'Jest Unit Tests'
  - 'Vitest Unit Tests'
  - 'Cypress E2E Tests'
- **GitHub Actions API**: Used via `actions/github-script@v7` to query workflow runs
- **Workflow Run Statuses**: GitHub API returns statuses like 'queued', 'in_progress', 'completed' with conclusions like 'success', 'failure', 'cancelled'

### New Concepts Required

- **Polling Loop**: A while loop that repeatedly queries the GitHub API until all workflows complete
- **Timeout Mechanism**: Maximum duration to wait before giving up
- **Polling Interval**: Time between API queries (30-60 seconds)
- **State Tracking**: Tracking which workflows are still in progress across polling iterations

### Key Business Rules

- **Rule 1**: Gateway must not complete until all tracked workflows have finished
- **Rule 2**: Polling interval must balance responsiveness with API rate limit concerns
- **Rule 3**: A timeout must exist to prevent infinite waiting
- **Rule 4**: If any tracked workflow fails, gateway must report failure
- **Rule 5**: If no tracked workflows were triggered, gateway should succeed (documentation-only changes)

---

## Strategic Approach

### Solution Direction

1. Replace the single API query with a polling loop in the 'Get workflow runs for this PR' step
2. Implement the loop in JavaScript within the `actions/github-script@v7` action
3. Use async/await with setTimeout for delays between polls
4. Track elapsed time to implement timeout
5. Maintain the same output format (status, message, failed_workflows) for compatibility

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Polling interval (30s vs 60s) | 30s: More responsive, higher API usage. 60s: Lower API usage, slower response | Use 30 seconds for faster feedback |
| Maximum timeout duration | Too short: Might timeout before slow workflows complete. Too long: Wastes resources on stuck workflows | 30 minutes (1800 seconds) |
| Continue on API errors | Retry: Might recover from transient errors. Fail: Prevents infinite retries on persistent issues | Retry up to 3 times, then fail |
| Workflows not yet triggered | Wait: Might be newly created PR. Fail: Fast feedback but might be premature | Wait and retry (they should appear soon) |

### Alternatives Considered

- **Alternative 1**: Use GitHub's `workflow_run` trigger - Rejected because it only triggers after a specific workflow completes, not for checking multiple workflows
- **Alternative 2**: Use a separate action that handles polling natively - Rejected because we want to keep the solution simple and within the existing workflow
- **Alternative 3**: Use GitHub CLI instead of API - Rejected because the JavaScript API client is already available and more flexible

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Which workflows to track | Issue mentions test workflows but doesn't specify if others should be included | Keep the existing list from current implementation |
| Timeout value | Issue suggests 30-60 second polling but doesn't specify maximum timeout | Use 30 minute timeout as a reasonable default |
| Handling of non-triggered workflows | Should gateway wait indefinitely if a workflow was never triggered? | Add a maximum number of polling attempts (e.g., 60) |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| PR with no test workflows triggered | Documentation-only changes shouldn't block | Gateway succeeds with 'No test workflows triggered' message |
| New PR where workflows haven't started yet | Workflows might not appear in first query | Continue polling until they appear or timeout |
| API rate limit exceeded | Too many requests can block the workflow | Implement retry with exponential backoff |
| GitHub API temporarily unavailable | Transient network issues | Retry a few times before failing |
| Workflow gets cancelled manually | Valid end state | Treat as completed, check conclusion |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Polling loop never exits | Workflow hangs indefinitely | Implement both timeout and maximum attempt count |
| GitHub API rate limits | Workflow gets blocked | Use reasonable interval, implement backoff on 403 errors |
| Polling too frequently | Wastes API quota and resources | Use 30 second minimum interval |
| Missing workflow runs | Gateway doesn't see all workflows | Query by head SHA which should capture all runs for that commit |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Polling implementation | Yes | Will implement in JavaScript within github-script step |
| AC2 | Wait for ALL workflows | Yes | Loop continues until all have status === 'completed' |
| AC3 | Correct final status | Yes | Same logic as current implementation, after polling completes |
| AC4 | Reasonable interval and timeout | Yes | 30s interval, 30min timeout, 60 max attempts |
| AC5 | Edge case handling | Yes | Handle API errors, rate limits, non-triggered workflows |

**AC Coverage Summary**: 5 of 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Maintain backward compatibility with existing output format
- Don't break existing workflow behavior for non-PR events
- Log progress during polling for debugging

---

## REASONS Canvas

### Requirements
From GitHub issue #197 acceptance criteria:
- Status Gateway workflow must actively poll for workflow run statuses
- Must continue polling until ALL expected workflows have completed
- Must only then evaluate the final status and complete itself
- Must implement polling loop with delays between queries

### Examples

**Example 1: Normal case with fast workflows**
- Input: PR triggers pytest (2min), jest (3min), vitest (4min), cypress (5min)
- Expected: Gateway polls every 30s, all complete within 6 minutes, gateway reports success

**Example 2: One workflow fails**
- Input: pytest success, jest success, vitest failure, cypress pending
- Expected: Gateway polls until cypress completes, then reports failure with vitest and possibly cypress if it failed

**Example 3: Documentation-only PR**
- Input: PR only modifies README.md
- Expected: No test workflows triggered, gateway reports success immediately

**Example 4: Slow workflows**
- Input: All workflows take 25 minutes
- Expected: Gateway polls for up to 30 minutes, then times out with appropriate message

### Architecture
- **File to modify**: `.github/workflows/status-gateway.yml`
- **Step to modify**: 'Get workflow runs for this PR' (line 29)
- **Language**: JavaScript (within actions/github-script@v7)
- **Pattern**: Async polling loop with timeout
- **Dependencies**: actions/github-script@v7, @actions/core

### Standards
- Follow existing workflow YAML structure
- Use the same GitHub API methods already in use
- Maintain the same output variables (status, message, failed_workflows)
- Error handling should fail the workflow on unrecoverable errors
- Logging should be informative for debugging

### Omissions
- No changes to other workflow files
- No changes to branch protection rules
- No new workflow types added to tracking
- No dashboard or UI changes
- No changes to test files (this is infrastructure, not application code)

### Notes
- The current implementation already has all the necessary GitHub API calls
- The polling loop only needs to wrap the existing logic
- The workflow names to track are already defined in the code
- The output format is already compatible with the reporting step
- Consider adding a maximum polling attempt count as an additional safety measure

### Solutions
- Reference implementation: Current status-gateway.yml already queries workflow runs correctly
- Pattern to follow: Use setTimeout with async/await for polling delays
- Similar implementations: Many GitHub Actions use polling patterns (e.g., waiting for builds, deployments)
- GitHub API documentation: https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
