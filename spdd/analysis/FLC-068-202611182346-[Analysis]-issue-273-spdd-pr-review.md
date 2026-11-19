# SPDD Analysis: Claude Code PR Review That Checks SPDD Compliance

**GitHub Issue**: #273
**Issue Title**: Claude Code PR review that checks SPDD compliance
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/273
**Artifact ID**: FLC-068-202611182346
**Created**: 2026-11-18 23:46
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> Add a GitHub Actions job that runs Claude Code headless on each PR to check SPDD compliance and post one advisory review comment.
>
> > **Backlog item** (post-MVP, nice to have). Scope, design and acceptance criteria will be refined if and when this is selected for implementation.
>
> ## Proposed checks
> - The analysis and prompt artifacts for the linked issue exist under `spdd/`
> - Those artifacts predate the code changes (the issue #150 lesson)
> - The PR is checked against the linked issue's acceptance criteria
>
> ## Acceptance criteria
> - [ ] A workflow runs Claude Code headless on each PR
> - [ ] It posts a single review comment summarizing SPDD compliance and AC coverage
> - [ ] Advisory only: not part of the required `status-gateway` check
>
> ## Notes
> - Needs an `ANTHROPIC_API_KEY` repository secret, and consideration of fork PRs and spend per run.
> - Can happen any time; no dependency on the other backlog items.

**Dependencies:** none. The issue says it can happen any time. The branch `feature/issue-273-spdd-pr-review` was cut from `main` at `99ee3f1`, after #270 (PR #281) merged.

### Decisions confirmed by the user (2026-11-18)

| Question | Decision |
|----------|----------|
| D1. How Claude Code runs | **The `claude` CLI directly**: a pinned `@anthropic-ai/claude-code` npm install in CI, then `claude -p` with read-only tools. Not `anthropics/claude-code-action`. The user approved the CI-only npm dependency |
| D4. Model | **`claude-sonnet-5-5`**, set in a workflow `env` variable |
| D5. Triggers | **Every push**: `opened, reopened, ready_for_review, synchronize`; drafts skipped; a `concurrency` group cancels the older run on the same PR |

The other recommendations (D2 deterministic comment upsert, D3 facts script, D6 to D10) stand as written below.

---

## Background

SPDD (`SPDD.md`) makes three demands that today only a human reviewer checks:

1. Every issue has an analysis artifact in `spdd/analysis/` and a prompt artifact in `spdd/prompt/`.
2. The prompt artifact exists **before** any code (the issue #150 violation, repeated in capitals in `SPDD.md:21-34` and `.vibe/instructions.md`).
3. The PR meets the issue's acceptance criteria (`SPDD.md` "Quality Gates" item 1).

None of this is automated. CI (`.github/workflows/`) checks tests, coverage, types and lint, and `status-gateway.yml` gathers those into the one required check. A reviewer who misses a missing prompt artifact, or a prompt written after the code, gets no help.

The repo is also a testbed for AI-assisted development (README intro, line 5). Running Claude Code itself as a CI reviewer of the SPDD process fits that purpose: it is one more way the project shows coding agents working inside guardrails.

### What the git history can and can't prove

How artifacts are committed decides how much an automated check can prove about "predates the code":

- **PR #280 (#269)** committed the analysis (`9325359`), then the prompt (`6676549`), then the code (`9f40fb6`) as separate commits. Git **proves** the order.
- **PR #281 (#270)** committed the artifacts and the code together in `9824e3b`. Git **can't** prove the order. Only the timestamps in the artifact filenames (`FLC-067-202611171022`, `FLC-067-202611171038`) say the prompt came first, and those are self-reported.

`CLAUDE.md` ("Commit SPDD artifacts, code, tests and README updates together") allows the second style. So the check has to report the **strength** of its evidence, not only pass/fail: "proven by commit order", "consistent (same commit; filename timestamps in order)", or "violation (code committed before the prompt artifact)".

---

## Business Value

- **Catches process violations early**: a missing or late prompt artifact shows up in a PR comment before review, not after the merge.
- **Lighter reviews**: the reviewer starts from an AC-by-AC coverage summary instead of building one by hand.
- **Testbed value**: a working example of Claude Code running headless in CI with read-only tools, an advisory role and limited spend, which fits the project's AI-assisted development story.
- **No merge risk**: it's advisory, so a model mistake or an API outage never blocks a merge.

---

## Scope In

- [ ] New workflow `.github/workflows/spdd-review.yml` (`SPDD Review`) that runs on PRs to `main`.
- [ ] **Deterministic fact-gathering script** `scripts/spdd_pr_facts.py`. It takes the PR number, base and head refs, PR title, body and branch, and outputs JSON (and a Markdown summary of the same facts):
  - the linked issue number (from `Closes|Fixes|Resolves #N` in the body, then `issue-N` in the branch name, then `(#N)` in the title)
  - the issue's title, body and acceptance-criteria checklist (fetched with `gh issue view`)
  - the matching analysis and prompt artifacts under `spdd/`, matched by `issue-N` in the filename, with a fallback to the `**GitHub Issue**: #N` header for older artifacts that don't carry the issue number in the name
  - the ordering evidence: filename timestamps (analysis ≤ prompt) and, from `git log base..head`, the first commit that added each artifact compared with the first commit that touched non-`spdd/` files, with a verdict of `proven`, `consistent`, `violation` or `unknown`
  - the changed-file list split into artifact files and code files
- [ ] **Reviewer prompt** for Claude, kept in the repo (the location is a design decision below). It tells Claude to use the facts as given, read the diff, judge AC coverage, and write one Markdown comment in a fixed structure.
- [ ] Claude Code runs **headless** with read-only tools (`Read`, `Grep`, `Glob`, and `Bash` limited to `git diff`, `git log` and `git show`). No write, edit, web or `gh` tools.
- [ ] **One comment per PR, updated in place**: a later step finds the comment by a hidden marker (`<!-- spdd-review -->`) and edits it, or creates it the first time. Each push updates the same comment; it never adds a new one.
- [ ] **Advisory**: the workflow name is not added to `expectedWorkflowNames` in `status-gateway.yml`, and the job doesn't fail the PR when Claude or the API fails (`continue-on-error` and a fallback comment or job summary).
- [ ] **Spend and safety controls**: skip fork PRs and Dependabot PRs; skip with a notice when `ANTHROPIC_API_KEY` is missing; skip draft PRs; `--max-turns` cap; job `timeout-minutes`; a `concurrency` group that cancels a superseded run on the same PR; the per-run cost (from Claude Code's JSON output) shown in the comment footer and the job summary.
- [ ] Pytest tests for `scripts/spdd_pr_facts.py`, following `tests/test_check_module_coverage.py` (load the script with `importlib`, use a temporary git repo for the ordering logic, stub out `gh`).
- [ ] Docs: README "GitHub Actions CI/CD" section (new workflow, advisory status, the secret, forks, spend) and the tests list in the project structure; a short note in `SPDD.md` "Quality Gates" that an advisory bot comment helps check items 1 and 6.

## Scope Out

- [ ] Making the review a **required** or blocking check (the AC forbids it).
- [ ] Inline per-line review comments or "request changes" reviews. One summary comment only.
- [ ] Running on **fork PRs** (secrets aren't available on `pull_request` from forks, and `pull_request_target` with untrusted code plus a secret is a known-dangerous pattern).
- [ ] A general code-quality or bug review. `/code-review` and human reviewers cover that. This review is limited to SPDD compliance and AC coverage.
- [ ] Claude editing files, pushing commits, applying fixes or ticking AC checkboxes.
- [ ] Changing the SPDD process itself (for example, requiring artifacts in a separate earlier commit). The comment can *recommend* that, but changing `.vibe/instructions.md` or `SPDD.md` rules needs its own issue.
- [ ] Changes to the app (`services/llm/`, routers, frontend). This is CI only; the app's LLM provider layer isn't involved.
- [ ] Creating the `ANTHROPIC_API_KEY` repository secret. Only the repo owner can do that; the PR description will say how.
- [ ] Backfilling reviews on old or closed PRs.

---

## Acceptance Criteria (ACs)

1. **AC1: A workflow runs Claude Code headless on each PR**
   **Given** a non-draft PR to `main` from a branch in this repo, and the `ANTHROPIC_API_KEY` secret is set
   **When** the PR is opened, reopened, marked ready for review, or gets a new push
   **Then** the `SPDD Review` workflow gathers the SPDD facts with `scripts/spdd_pr_facts.py` and runs Claude Code headless (no interactive session) with read-only tools and a turn cap.

2. **AC2: It posts a single review comment summarizing SPDD compliance and AC coverage**
   **Given** the workflow ran
   **When** it finishes
   **Then** the PR has exactly one comment carrying the `<!-- spdd-review -->` marker, with (a) the linked issue, (b) analysis and prompt artifacts found or missing, (c) the ordering verdict and how strong its evidence is, (d) a table with one row per issue AC (met / partly / not met / can't tell, plus the evidence), and (e) a footer saying it's advisory, with the model and the run's cost.
   **And** a later push edits that comment instead of adding a new one.
   **And** if Claude fails or times out, the comment (or the job summary) still shows the deterministic facts and says the AC review didn't run.

3. **AC3: Advisory only, not part of the required `status-gateway` check**
   **Given** `status-gateway.yml` lists the workflows it waits on in `expectedWorkflowNames`
   **When** the `SPDD Review` workflow is added
   **Then** it isn't in that list, it isn't a required check, and a failure inside it (API error, missing secret, model error) doesn't make the PR's checks fail.

### Implicit ACs (from the issue's notes and project standards)

4. **AC4: Fork PRs, Dependabot PRs and a missing secret are handled safely**
   **Given** a PR from a fork, a PR opened by Dependabot, or a repo with no `ANTHROPIC_API_KEY` secret
   **When** the workflow triggers
   **Then** no Claude call is made, no secret is exposed, and the job ends as skipped, or as success with a notice in the job summary.

5. **AC5: Spend per run is bounded and visible**
   **Given** a PR run
   **Then** the run is limited by `--max-turns`, a job timeout and a concurrency group that cancels a superseded run, and its cost in USD appears in the comment footer and the job summary.

6. **AC6: The deterministic logic is tested**
   **Given** `scripts/spdd_pr_facts.py`
   **Then** pytest tests cover linked-issue detection, artifact discovery (both naming styles), AC extraction, and each ordering verdict (`proven`, `consistent`, `violation`, `unknown`), with ≥80% line coverage of the script, measured explicitly because `.coveragerc` omits `scripts/*`.

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **SPDD artifacts**: `spdd/analysis/FLC-NNN-YYYYMMDDHHMM-[Analysis]-....md` and `spdd/prompt/FLC-NNN-YYYYMMDDHHMM-[Feat|Fix|Refactor|Test]-....md` (naming rules: `SPDD.md:305-313`). Since roughly FLC-002 the descriptions include `issue-N`, but not always (for example `spdd/prompt/FLC-001-202605120030-[Feat]-spdd-artifacts-capture.md`, `spdd/analysis/FLC-007-202605161545-[Analysis]-fix-frontend-test-failures.md`). Every artifact header has `**GitHub Issue**: #N` (`spdd/template/ANALYSIS-TEMPLATE.md:3`).
- **Status gateway**: `.github/workflows/status-gateway.yml`. Its `expectedWorkflowNames` list is the only thing that makes a workflow blocking. A workflow left off the list is advisory.
- **Conditional CI workflows**: `.github/workflows/pytest-tests.yml` and the others. They use `actions/checkout@v4`, `ubuntu-latest` and Python 3.12. `pytest-tests.yml` already triggers on `scripts/**` and `tests/**`, so the new script's tests run in CI.
- **Script plus test pattern**: `scripts/check_module_coverage.py` with `tests/test_check_module_coverage.py` (loads the script with `importlib.util.spec_from_file_location`).
- **Coverage config**: `.coveragerc` omits `scripts/*`, so the 80% gate doesn't measure scripts. The new script's coverage has to be measured explicitly (`--cov=scripts` or `coverage run --include`).
- **Price table**: `data/llm_pricing.json`. Claude Sonnet 5.5 costs $2.00 / $10.00 per MTok in/out; Haiku 5.5 costs $0.10 / $0.50. Used only for the spend estimate below; the workflow takes the actual cost from Claude Code's JSON output.
- **PR conventions**: the body has `Closes #N`; the branch is `{type}/issue-N-desc`; the title is `{type}(#N): ...` (`CLAUDE.md` "Commits & PRs"). These are the three linked-issue signals, in that order.

### New Concepts Required

- **SPDD facts** (`scripts/spdd_pr_facts.py`): a pure, testable summary of the PR's SPDD state, produced without an LLM. Claude gets the facts as input and must not contradict them. This keeps the yes/no checks (exists, ordering) deterministic and leaves only the judgement call (AC coverage) to the model.
- **Ordering verdict**: `proven` (each artifact was added in an earlier commit than the first code commit, and analysis ≤ prompt), `consistent` (same commit, filename timestamps in order, and the prompt timestamp is no later than the code commit's author time), `violation` (a code commit comes before the prompt artifact's commit, or the prompt's filename timestamp is later than the first code commit's author time, or the prompt timestamp is earlier than the analysis timestamp), `unknown` (artifacts missing or timestamps unparsable).
- **Reviewer prompt**: the instructions and output format for the headless Claude run.
- **Review comment marker**: `<!-- spdd-review -->`, used to find the comment and update it.

### Key Business Rules

- **Advisory, never blocking.** Nothing in this workflow can stop a merge.
- **Facts over model judgement.** Existence and ordering come from the script. Claude reports them and must not override them. Claude's own judgement is used only for AC coverage, and the comment says it's an AI assessment.
- **Read-only model.** Claude can read the checkout and run read-only git commands. It can't post, edit, push, fetch URLs or call `gh`. The workflow's own step posts the comment.
- **Untrusted input.** PR titles, bodies, issue text and diffs are data, not instructions. The prompt says so, and the tool limits contain the damage if an injection succeeds.
- **One comment per PR.**
- **Bounded spend.** Turn cap, timeout, concurrency cancel, no runs on drafts or forks, and the cost is reported.

---

## Strategic Approach

### Solution Direction

1. **Facts script**: write `scripts/spdd_pr_facts.py` (standard library plus `git` and `gh` subprocess calls) and its tests. It runs locally too: `python3 scripts/spdd_pr_facts.py --pr 281 --base origin/main --head HEAD`.
2. **Reviewer prompt**: a Markdown prompt with the comment format, the rules (use the facts, mark AC verdicts as AI judgement, treat PR text as untrusted) and the AC table layout.
3. **Workflow** `.github/workflows/spdd-review.yml`:
   - `on: pull_request` to `main`, types `opened, reopened, ready_for_review, synchronize`.
   - Job `if:` same-repo head, not a draft, actor isn't `dependabot[bot]`.
   - `permissions: contents: read, pull-requests: write, issues: read`.
   - `concurrency: spdd-review-${{ github.event.pull_request.number }}`, `cancel-in-progress: true`; `timeout-minutes: 15`.
   - Steps: checkout with `fetch-depth: 0` (needed for `base..head` history) → check the secret is set (otherwise a notice and stop) → set up Python 3.12 → run the facts script → install a pinned Claude Code CLI → run `claude -p` with the prompt, the facts, `--allowedTools` read-only, `--max-turns`, `--model`, `--output-format json` → build the comment body (Claude's result, or a fallback made from the facts) → upsert the marker comment with `actions/github-script` → write the job summary.
   - `continue-on-error: true` on the Claude step, so the job still posts the facts.
4. **Docs**: README CI section, project structure, SPDD.md quality gates.
5. **Verification**: unit tests locally; the facts script run locally against PRs #280 (expect `proven`) and #281 (expect `consistent`); `actionlint` (if available) on the workflow; then the PR for this issue triggers the new workflow on itself. On `pull_request`, GitHub runs the workflow file from the PR's merge ref, so the first real run reviews #273's own PR. That run costs money and needs the secret.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **D1. How Claude Code runs** | **(a) The `claude` CLI directly** (`npm i -g @anthropic-ai/claude-code@<pinned>` then `claude -p`): it's literally Claude Code's headless mode; uses only the `ANTHROPIC_API_KEY` secret and the default `GITHUB_TOKEN`; no GitHub App and no `id-token`; output goes to a file we control; version pinned. We write the comment-upsert step ourselves (about 20 lines of github-script). **(b) `anthropics/claude-code-action@v1`**: the official action, with `use_sticky_comment`, fork handling and `restrict_untrusted_prs` built in. But its examples ask for `id-token: write` and the Claude GitHub App token, the docs don't say whether the default token is enough, Claude posts the comment itself (so it needs `gh pr comment` permission), and `@v1` floats (it shipped a release marked breaking on 16 Nov). | **(a) CLI directly.** It's simpler to reason about, it's read-only for the model, and it needs no GitHub App. **Needs your decision**: it adds a CI-only dependency (the npm package, pinned). |
| **D2. Who posts the comment** | Claude with `gh pr comment` (needs a write tool, risk of several comments, injection could post anything) vs a deterministic workflow step that upserts a marker comment from Claude's output. | **Deterministic step.** It guarantees one comment and keeps Claude read-only. |
| **D3. Facts in a script or in the prompt** | Asking Claude to find artifacts and check commit order is simpler to write, but it's non-deterministic, untestable and costs more tokens. A script is testable (AC6), cheap and repeatable, and still works when the model call fails. | **Script** (`scripts/spdd_pr_facts.py`). Claude gets its JSON output. |
| **D4. Model** | Sonnet 5.5 is the project default and is better at reading a diff against ACs; estimated $0.10–$0.60 per run at $2 / $10 per MTok (50–200k input tokens with tool reads, 2–4k output). Haiku 5.5 costs about 1/20 of that but is weaker at nuanced AC judgement. | **`claude-sonnet-5-5`**, set in a workflow `env` variable so it's a one-line change. **Needs your confirmation** (spend). |
| **D5. Triggers** | Every push (`synchronize`) keeps the comment current but adds up on PRs with many pushes. Only `opened` / `ready_for_review` is cheap but goes stale. A label trigger is manual. | `opened, reopened, ready_for_review, synchronize`, with `concurrency` cancel-in-progress and no drafts. **Needs your confirmation.** Alternative: drop `synchronize` and re-run by hand with `workflow_dispatch` or a label. |
| **D6. Turn cap and timeout** | Too low and the AC review is cut off; too high and spend isn't bounded. | `--max-turns 15`, job `timeout-minutes: 15`. A capped run still posts the facts with an "incomplete" note. |
| **D7. Where the reviewer prompt lives** | `scripts/` (beside the facts script), `.github/` (CI config), or `data/`. The memory rule "app content lives in the app codebase" is about content the *app* reads at runtime. This prompt is CI tooling, not app content, so `data/` would be misleading. | **`.github/spdd-review/prompt.md`** next to the workflow that uses it. A test checks the path exists and that the workflow refers to it. |
| **D8. Fork PRs** | `pull_request` from forks gets no secrets, so the run would fail. `pull_request_target` would get secrets while running on untrusted code: the known "pwn request" risk. | **Skip forks** with a job-level `if:`. The repo has one maintainer; fork PRs aren't the workflow. |
| **D9. Failure behaviour** | A failed Claude step showing a red ✗ on the PR is noise, though it doesn't block. | `continue-on-error: true` on the Claude step. The comment falls back to the facts and says the AI review didn't run. The job itself passes unless the facts script crashes. |
| **D10. Ordering evidence when artifacts and code share a commit** | Calling it a violation would flag PR #281's legitimate style. Calling it proven would overstate what git shows. | Report **`consistent`**, explain that the order comes from the filename timestamps (self-reported), and suggest committing artifacts separately for proof. Advisory only; the process doesn't change. |

### Alternatives Considered

- **A non-LLM linter only** (the facts script as a CI check, no Claude): cheap and deterministic, but AC coverage (the issue's third check) needs reading the diff against free-text ACs, which a script can't do. Rejected as the whole solution; kept as the deterministic layer (D3).
- **A required check that fails when the prompt artifact is missing**: rejected; AC3 says advisory only, and model or API errors mustn't block merges.
- **`pull_request_target` so fork PRs get reviewed**: rejected for security (D8).
- **Claude posts inline review comments with `mcp__github_inline_comment__create_inline_comment`**: rejected; the AC asks for a single comment, and it needs write tools.
- **A `/code-review`-style multi-agent review in CI**: rejected; out of scope and much more expensive.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Review comment" | A PR **review** (`pulls.createReview`, `COMMENT` event) or an issue-style PR **comment**? | An issue-style comment, updated in place. Reviews can't be edited into a single living summary as cleanly, and each push would stack a new review. |
| "Each PR" | Drafts? Every push? | Non-draft PRs; every push, with cancel-in-progress (D5). |
| "Predate the code changes" | Proven by git, or consistent with filename timestamps? | Report both with an evidence strength (D10). |
| What counts as "code" | Are README or `docs/` changes code? | Any changed file outside `spdd/` counts as code for ordering, matching the rule that the prompt comes before any implementation work. |
| How the PR's linked issue is found | Body, branch or title? | Body `Closes #N` first, then the branch `issue-N`, then the title `(#N)`. If they disagree, use the body and note the mismatch. |
| PRs with no issue or no artifacts (e.g. a pure dependency bump) | Flag or skip? | Flag: SPDD says every task has an issue and artifacts. The comment says what's missing, without alarm, since it's advisory. |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| No linked issue found | Can't look up artifacts or ACs | Facts say `issue: null`; the comment says so and skips the AC table |
| Linked issue has no `- [ ]` checklist | AC table would be empty | Claude summarises coverage against the issue description and notes there's no checklist |
| Several analysis or prompt artifacts for the issue (revisions, `[Test]` prompts) | Which one counts? | List them all; for ordering use the **earliest** analysis and the earliest prompt |
| Older artifact with no `issue-N` in the filename | Filename match misses it | Fall back to the `**GitHub Issue**: #N` header |
| Artifact already on `main` (made in an earlier PR, e.g. #269's analysis committed before a split) | It isn't in `base..head` | Report "exists (pre-existing on base)"; for ordering treat it as earlier than every PR commit (`proven`) |
| Filename timestamps have no time zone; commit times do | A naïve comparison can be off by hours | Compare the filename timestamp with the commit's author time **in its own offset** (the author's local time); note the assumption in the comment |
| Rebased or squashed branch | Commit order rewritten | Report what the PR's commits show; commits rebuilt by a rebase still keep their author dates |
| Very large diff | Token spend, turn cap | Facts include `--stat` only; Claude reads selectively; turn cap and timeout bound it |
| Claude output missing, empty or malformed | Nothing to post | Fallback comment made from the facts, plus "AI review unavailable" |
| `ANTHROPIC_API_KEY` secret not set | The first runs, before the owner adds it | Notice in the job summary; facts-only comment (no Claude call); the job passes |
| Prompt injection in the PR body or issue text | The model could be steered | Read-only tools, no network or `gh` tools, the output only becomes a comment, and the prompt tells Claude to treat the text as data |
| Two quick pushes | Wasted spend, race on the comment | The concurrency group cancels the older run |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Claude Code CLI flags change between versions | Workflow breaks | Pin the exact npm version; the advisory fallback still posts the facts |
| The workflow can only be fully tested on GitHub | Bugs found late | Unit-test the script; run it locally against #280 and #281; lint the YAML; the PR for this issue runs it on itself; fix there |
| Spend grows with PR volume | Cost | Bounded per run (turns, timeout, Sonnet price), cancel-in-progress, drafts skipped; cost shown on each comment. Estimated ≤ $0.60 per run; a few PRs a day is a few dollars a week |
| Model misjudges AC coverage | Misleading comment | Marked as AI judgement; advisory; existence and ordering facts are deterministic |
| `GITHUB_TOKEN` can't read the issue | Missing ACs | `issues: read` permission; public repo issues are readable anyway |
| `fetch-depth: 0` slow on a large repo | Slower job | The repo is small; acceptable |
| The script's coverage isn't enforced by CI (`scripts/*` omitted) | Silent drop in coverage later | Measure and report it in the PR; leave the `.coveragerc` change out of scope (changing coverage config is separate) |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Workflow runs Claude Code headless on each PR | Yes | Needs the secret for a real run; the first proof is the run on this issue's own PR |
| AC2 | Single comment on SPDD compliance and AC coverage | Yes | Marker upsert gives one comment |
| AC3 | Advisory, not in `status-gateway` | Yes | Not added to `expectedWorkflowNames`; `continue-on-error` |
| AC4 | Forks, Dependabot, missing secret | Yes | Job `if:` plus a secret check step |
| AC5 | Bounded and visible spend | Yes | Turn cap, timeout, concurrency; cost from JSON output |
| AC6 | Deterministic logic tested | Yes | Measured explicitly, since `.coveragerc` omits `scripts/*` |

**AC Coverage Summary**: 6 of 6 ACs (3 from the issue, 3 implicit) can be met with this approach. The repository secret is a step only the owner can take.

**Implicit Requirements Not in ACs**:
- The facts script runs locally, so a developer can check a branch before opening a PR.
- The comment says plainly that it's advisory and AI-generated, and names the model and the cost.
- README documents the new workflow, the secret and the fork and spend behaviour.

---

## REASONS Canvas

### Requirements
- A workflow runs Claude Code headless on each (same-repo, non-draft) PR to `main` (AC1).
- It keeps exactly one comment, with SPDD compliance (artifacts found, ordering verdict with evidence strength) and AC-by-AC coverage (AC2).
- Advisory: not in `status-gateway.yml`'s `expectedWorkflowNames`; failures don't fail the PR (AC3).
- Fork PRs, Dependabot and a missing secret are skipped safely (AC4). Spend is bounded and reported (AC5). The facts script is tested at ≥80% (AC6).

### Examples
- **PR #280 (#269)**: artifacts in commits `9325359` / `6676549` before code commit `9f40fb6` → facts: issue 269, analysis and prompt found, ordering **`proven`**.
- **PR #281 (#270)**: artifacts and code together in `9824e3b`; filenames `...202611171022-[Analysis]...` and `...202611171038-[Feat]...` → ordering **`consistent`** (same commit, timestamps in order, prompt 10:38 earlier than the commit's author time 16:11 UTC, compared in the commit's own offset).
- **Synthetic violation**: a branch whose first commit changes `routers/x.py` and whose second commit adds the prompt artifact → **`violation`**.
- **No artifacts**: a PR body `Closes #999` with nothing under `spdd/` for #999 → analysis and prompt "missing", ordering **`unknown`**.
- **Linked-issue detection**: body "Closes #273" → 273; empty body with branch `fix/issue-42-x` → 42; only the title `feat(#7): ...` → 7; none → `null`.
- **Older naming**: `spdd/analysis/FLC-007-...-fix-frontend-test-failures.md`, whose header is `**GitHub Issue**: #N`, is found through the header fallback.
- **Comment shape**:
  ```markdown
  <!-- spdd-review -->
  ## SPDD review (advisory)
  **Linked issue:** #273, Claude Code PR review that checks SPDD compliance
  | Check | Result |
  |---|---|
  | Analysis artifact | ✅ spdd/analysis/FLC-068-...md |
  | Prompt artifact | ✅ spdd/prompt/FLC-068-...md |
  | Prompt before code | ✅ proven by commit order |
  ### Acceptance criteria
  | AC | Verdict | Evidence |
  |---|---|---|
  | A workflow runs Claude Code headless on each PR | ✅ Met | `.github/workflows/spdd-review.yml` runs `claude -p` |
  ...
  <sub>Advisory, not a required check. AI-assessed AC verdicts · claude-sonnet-5-5 · $0.21 · 9 turns</sub>
  ```

### Architecture
- CI lives in `.github/workflows/*.yml`. The blocking aggregation is in `status-gateway.yml` (`expectedWorkflowNames`); this workflow stays outside it.
- Repo scripts live in `scripts/` (standard library, `argparse`, `main()` that returns an exit code), with tests in `tests/test_<script>.py` loaded through `importlib`.
- The app's LLM provider layer (`services/llm/`) isn't touched. This is a CI use of Claude Code, not an app LLM call, so the "all app LLM calls go through `services/llm/`" guardrail doesn't apply. The PR description will say so.

### Standards
- PEP 8, docstrings on public functions, type hints matching `scripts/check_module_coverage.py`.
- ≥80% line coverage of `scripts/spdd_pr_facts.py`, measured explicitly (`python3 -m pytest tests/test_spdd_pr_facts.py --cov=scripts --cov-fail-under=0 --cov-report=term-missing`), because `.coveragerc` omits `scripts/*`. The full `python3 -m pytest tests/` suite and `scripts/check_module_coverage.py` must still pass.
- Workflow YAML passes `actionlint` if it's available (or at least parses). Third-party actions pinned to a major version, as the existing workflows do (`actions/checkout@v4`, `actions/github-script@v7`, `actions/setup-python@v5`); the npm CLI pinned to an exact version.
- README updated (CI section, project structure: `scripts/`, `tests/`, `.github/spdd-review/`). SPDD.md quality-gates note.
- No secrets in code; the key comes only from `${{ secrets.ANTHROPIC_API_KEY }}`; `.env` is never touched.

### Omissions
- No blocking check, no inline comments or formal reviews, no fork-PR support, no general code review, no auto-fixes, no SPDD rule changes, no app changes, no backfill, no `.coveragerc` change. Creating the secret is the owner's step.

### Notes
- On `pull_request` the workflow file comes from the PR's merge commit, so the PR adding it runs it. Expect one paid run (≤ about $0.60) on this issue's PR once the secret exists. Without the secret, that run shows the facts-only path, which tests AC4.
- Use `git log --reverse --format=%H%x09%aI --name-only --diff-filter=AM base..head` for the ordering facts. `%aI` keeps the author's offset for the time-zone comparison.
- `claude -p --output-format json` returns `result`, `total_cost_usd`, `num_turns` and `is_error`. Those fields feed the comment and the footer. Check the exact field names against the pinned CLI version during implementation.
- The `GITHUB_TOKEN` in `pull_request` runs for same-repo branches has the `permissions:` the workflow asks for.
- Pass the facts and the prompt to Claude through files or stdin, not shell-interpolated strings, so PR text can't break the quoting.

### Solutions
- `scripts/check_module_coverage.py` and `tests/test_check_module_coverage.py`: script and test structure.
- `.github/workflows/status-gateway.yml`: `actions/github-script@v7` usage, the PR head SHA from `context.payload.pull_request`.
- `.github/workflows/pytest-tests.yml`: Python 3.12 setup and the job-summary style (`$GITHUB_STEP_SUMMARY`).
- Claude Code Action docs (`docs/security.md`), for the security posture this design copies: skip forks, never `pull_request_target` with the head checked out, narrow `--allowedTools`, treat PR content as untrusted.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
