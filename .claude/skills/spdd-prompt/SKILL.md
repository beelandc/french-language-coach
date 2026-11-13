---
name: spdd-prompt
description: Create the SPDD prompt artifact for a GitHub issue in spdd/prompt/, the mandatory second SPDD step that must exist BEFORE any implementation code is written. Requires an existing analysis artifact for the issue. Use after /spdd-analysis.
argument-hint: <issue-number> [Feat|Fix|Refactor|Test]
---

# /spdd-prompt: create the SPDD prompt artifact

You are performing **SPDD step 2 (Prompt Engineering → Prompt Artifact)**. Arguments: `$ARGUMENTS` (issue number, then an optional type).

**Hard rule: do not write, edit, or scaffold any application code or tests in this skill.** This artifact is what implementation will be driven by, so it must exist first (the issue #150 lesson).

## 1. Validate input and preconditions

- Parse the issue number `<n>` and the optional type from `$ARGUMENTS`. If the number is missing, ask for it.
- **Require the analysis artifact**: `find spdd/analysis -name "FLC-*-\[Analysis\]-issue-<n>-*"`.
  - If none exists, **stop**. Tell the user that SPDD requires the analysis first and suggest `/spdd-analysis <n>`. Do not continue.
  - If several exist, use the newest timestamp and mention the others.
- Fetch the issue for the current ACs: `gh issue view <n> --json number,title,body,labels,url`.
- **Type**: use the argument if given. Otherwise infer it from the labels (`bug` → `Fix`, `refactor` → `Refactor`, `test`-only → `Test`, otherwise `Feat`) and say which type you inferred.

## 2. Work out the file name

Pattern: `spdd/prompt/FLC-{SEQ}-{YYYYMMDDHHMM}-[{Type}]-issue-<n>-<slug>.md`

- **SEQ**: the **same** sequence number as the analysis artifact (one sequence per issue).
- **Timestamp**: `date +%Y%m%d%H%M`. It must be later than the analysis timestamp.
- **slug**: reuse the analysis slug.
- If a prompt of the same type already exists for this issue, ask whether to update it or create a revision.

## 3. Write the artifact

Read the analysis artifact in full, then copy `spdd/template/PROMPT-TEMPLATE.md` and fill in:
- Header: Issue number/title/URL, `Artifact ID: FLC-{SEQ}-{TIMESTAMP}`, Created, `Author: Claude Code (<your model name>, AI Assistant)`, `Related Analysis: <analysis path>`
- **Context**: current codebase state; *Relevant Files* table with real paths and key lines or functions (verify they exist); existing patterns to follow
- **Goal**: primary and secondary objectives
- **Constraints**: architecture, code quality (PEP 8, docstrings or JSDoc, match existing style), testing (80%+ coverage; for frontend tests, say which runner discovers them; see the test-discovery gotcha in CLAUDE.md), the issue ACs, and files that must not change
- **Examples**: input/output pairs, edge cases, sample test cases in the project's test style
- **Deliverables**: code changes, tests, and documentation (README.md for API, structure or setup changes)
- **Actual Prompt**: the exact, self-contained prompt you will implement from, in the fenced block with `CONTEXT / GOAL / CONSTRAINTS / EXAMPLES / ACCEPTANCE CRITERIA / DELIVERABLES`. It should be specific enough that another agent could implement from it alone.
- Leave **AI Response**, **Human Review Notes** and **Verification** as placeholders. They're completed after implementation.

Remove leftover template placeholder text from the sections you filled in.

## 4. Stop for review

Reply with:
1. The artifact path
2. A short summary of the planned changes (files, tests, docs)
3. Anything the user should decide before implementation

Then **wait for the user's go-ahead** before implementing, unless they already told you to proceed through implementation. Once implementation is done, come back to this artifact and complete *AI Response* (a short summary of what was produced), *Human Review Notes* (deviations from the prompt and why), and the *Verification* checklist, with honest test results.
