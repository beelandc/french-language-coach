---
name: spdd-analysis
description: Create the SPDD analysis artifact (REASONS canvas) for a GitHub issue in spdd/analysis/, the mandatory first SPDD step before the prompt artifact and before any code. Use when starting work on a GitHub issue in this repo.
argument-hint: <issue-number>
---

# /spdd-analysis: create the SPDD analysis artifact

You are performing **SPDD step 1 (Context Gathering → Analysis Artifact)** for GitHub issue **#$ARGUMENTS**.

**Hard rule: do not write, edit, or scaffold any application code or tests in this skill.** The output is one markdown file in `spdd/analysis/`. The prompt artifact (`/spdd-prompt`) comes next, and implementation comes after that.

## 1. Validate input

- If `$ARGUMENTS` is empty or not an issue number, ask the user for the issue number. If no issue exists yet, offer to draft one with `gh issue create` (title, context, description, acceptance criteria, out-of-scope) and wait for approval before creating it.
- Fetch the issue: `gh issue view <n> --json number,title,body,labels,milestone,url,state`. If it's closed, confirm with the user before continuing.
- Make sure you're on the issue branch (`{type}/issue-<n>-<desc>`, never `main`). If you aren't, propose the branch name and create it from an up-to-date `main` once the user agrees.

## 2. Work out the artifact file name

Pattern: `spdd/analysis/FLC-{SEQ}-{YYYYMMDDHHMM}-[Analysis]-issue-<n>-<slug>.md`

- **SEQ**: check for existing artifacts for this issue first: `find spdd -name "FLC-*issue-<n>-*"`.
  - If any exist, **reuse their sequence number**. Ask whether to update the existing analysis or create a revision with a new timestamp.
  - If none exist, find the highest `FLC-NNN` anywhere under `spdd/` (recursive; a few files sit at the `spdd/` root), add one, and zero-pad to 3 digits:
    `find spdd -name 'FLC-*' | sed -E 's/.*FLC-([0-9]+).*/\1/' | sort -n | tail -1`
- **Timestamp**: `date +%Y%m%d%H%M` (also use it for the `Created` header as `YYYY-MM-DD HH:MM`).
- **slug**: 2–6 kebab-case words from the issue title.

## 3. Gather context (real research, not guesses)

Before filling in the template:
- Read `.vibe/instructions.md` constraints, the relevant parts of `README.md` (README wins over `VISION.md` when they conflict) and `SPDD.md`.
- Search the codebase for the files, models, schemas, routers, components and tests the issue touches. Cite real paths (`path:line`).
- Read one or two recent analysis artifacts in `spdd/analysis/` for the expected depth and tone.
- Check linked or blocking issues mentioned in the body.

If requirements are ambiguous, list the ambiguities in the artifact **and** ask the user. Don't invent answers to them.

## 4. Write the artifact

Copy `spdd/template/ANALYSIS-TEMPLATE.md` and fill in **every** section:
- Header: Issue number/title/URL, `Artifact ID: FLC-{SEQ}-{TIMESTAMP}`, Created, `Author: Claude Code (<your model name>, AI Assistant)`
- Original Business Requirement (issue body verbatim), Background, Business Value
- Scope In / Scope Out (use `VISION.md` and the issue for omissions)
- Acceptance Criteria in Given/When/Then form, mapped from the issue
- Domain concepts (existing, with paths, and new), business rules
- Strategic approach, key design decisions table, alternatives considered
- Risk & gap analysis, edge cases, technical risks, AC coverage table
- **REASONS canvas**: Requirements, Examples, Architecture, Standards (80% coverage, PEP 8, docstrings, README updates), Omissions, Notes, Solutions

Remove template placeholder text. Don't leave `[brackets]` behind.

## 5. Stop and hand off

Reply with:
1. The artifact path
2. A 5–10 line summary (approach, key decisions, open questions)
3. Any decisions that need the user (architectural choices, ambiguities)
4. The next step: **`/spdd-prompt <n>`** to create the prompt artifact. No code until that exists.

Don't start the prompt artifact or implementation in the same turn unless the user explicitly asked you to run the whole workflow.
