# SPDD Prompt: Configure Repository for Claude Code Development

**GitHub Issue**: #225
**Issue Title**: Configure repository for Claude Code development (CLAUDE.md, settings, SPDD skills)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/225
**Artifact ID**: FLC-049-202611131002
**Created**: 2026-11-13 10:02
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-049-202611131000-[Analysis]-issue-225-claude-code-config.md`

---

## Context

### Current Codebase State
- Developed so far exclusively with Mistral Vibe, governed by `.vibe/instructions.md`, `SPDD.md`, `GIT-WORKFLOW.md`, `spdd/`
- No `CLAUDE.md`, no `.claude/` directory
- Highest SPDD sequence: FLC-048 (issue #220)
- Branch `chore/issue-225-claude-code-config` created from up-to-date `main`

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `.vibe/instructions.md` | Vibe agent rulebook, to be imported | Entire file |
| `SPDD.md` | Methodology (REASONS, 6 phases, artifact rules) | Mandatory process order; Phase 3 |
| `spdd/README.md` | Artifact naming and workflow | Naming Convention; Workflow |
| `spdd/template/*.md` | Analysis / Prompt / Test-scenario templates | Header fields, sections |
| `GIT-WORKFLOW.md` | Branch, commit, PR conventions | Steps 2, 3, 6, 7 |
| `.github/workflows/*.yml` | CI commands | pytest L61, vitest L67/72, jest L53/58 |
| `frontend/vite.config.ts` | Dev proxy, build outDir `../static`, Vitest storybook project | `server.proxy`, `build`, `test.projects` |
| `frontend/jest.config.cjs` | Jest `testMatch` = `*.jest.test.*`, `__tests__/` | L14-17 |
| `README.md` | Project docs | L3, L457, L469-475, L537, Project Structure tree, SPDD Artifacts list |
| `.gitignore` | Ignore rules | Append Claude local settings |

### Existing Patterns
- Commit: `{type}(#{n}): description`; PR title same; PR body references `Closes #n`
- Artifact header block: Issue, Title, URL, Artifact ID, Created, Author, Related Analysis
- Docs use headings, tables, checklists; footer `*Last updated / Project*`

---

## Goal

**Primary Objective**: Make Claude Code follow the same SPDD process, git workflow, and quality standards as Mistral Vibe, with `.vibe/instructions.md` as the single source of truth.

**Secondary Objectives**:
- Reduce permission friction for routine commands; protect `.env`
- Provide `/spdd-analysis` and `/spdd-prompt` skills to make the mandated sequence easy
- Update README development-process wording to credit both Mistral Vibe and Claude Code

---

## Constraints

### Architecture Constraints
- Config/docs only; no application code changes
- Do not modify `.vibe/instructions.md`, `SPDD.md`, `spdd/README.md`, `spdd/template/*`, `GIT-WORKFLOW.md`, `VISION.md`, or CI
- Do not mention a future configurable Mistral/Claude LLM backend anywhere

### Code Quality Constraints
- `.claude/settings.json` must be valid JSON and use documented permission rule syntax
- Skills use `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`, `argument-hint`)
- CLAUDE.md stays concise: it is loaded every session

### Testing Constraints
- No runtime code → no unit tests. Verification is: JSON parse, import target exists, `git diff` shows no changes to protected files, artifact timestamps precede config files.

### Acceptance Criteria
Issue #225 AC1–AC10 (see analysis).

---

## Examples

### Input/Output Examples
1. **`/spdd-analysis 230`**, highest sequence FLC-049, no artifacts for #230
   - Output: `spdd/analysis/FLC-050-<YYYYMMDDHHMM>-[Analysis]-issue-230-<slug>.md` filled from ANALYSIS-TEMPLATE, then stop for human review
2. **`/spdd-prompt 230 Fix`**, FLC-050 analysis exists
   - Output: `spdd/prompt/FLC-050-<YYYYMMDDHHMM>-[Fix]-issue-230-<slug>.md`, then stop for review before implementing
3. **`/spdd-prompt 231`**, no analysis for #231
   - Output: refusal directing to `/spdd-analysis 231`

### Edge Cases
- Re-running `/spdd-analysis` for an issue that already has one → reuse sequence; ask update-vs-revision
- No issue number → ask, or offer `gh issue create`
- Type argument missing → infer from issue labels (bug → Fix, refactor → Refactor, else Feat) and state the inference

---

## Deliverables

### Code Changes
- [ ] `CLAUDE.md`: imports `@.vibe/instructions.md`; Claude-specific guardrails, workflow mapping, commands, architecture map, gotchas
- [ ] `.claude/settings.json`: permissions allow/ask/deny
- [ ] `.claude/skills/spdd-analysis/SKILL.md`
- [ ] `.claude/skills/spdd-prompt/SKILL.md`
- [ ] `.gitignore`: `.claude/settings.local.json`

### Tests
- [ ] N/A (configuration). Validation steps listed under Verification.

### Documentation
- [ ] `README.md`: dev-process references (intro, "Why Mistral" Vibe paragraph, Development section, open-spdd note), project-structure tree, SPDD artifact list entry for #225

---

## Actual Prompt

```
Implement GitHub issue #225: configure the repository for Claude Code development.

CONTEXT:
- The repo has been developed with Mistral Vibe using .vibe/instructions.md as the agent rulebook.
  It mandates: GitHub issue first → spdd/analysis artifact → spdd/prompt artifact BEFORE any code →
  implement from the prompt → verify ACs; GitHub Flow branches {type}/issue-{n}-{desc}; 80% coverage;
  python3 not python; README updates with structural/API changes; never merge own PR without review.
- SPDD artifacts: spdd/{analysis,prompt}/FLC-{SEQ}-{YYYYMMDDHHMM}-[TYPE]-{desc}.md, templates in
  spdd/template/. Sequence is per issue (analysis and prompt share it). Highest existing: FLC-048.
  Stray FLC-024 files exist at spdd/ root, so scan recursively.
- CI: python3 -m pytest tests/ -v --tb=short (Py 3.12); frontend npm run test / test:coverage (Vitest,
  Storybook browser project via Playwright), npm run test:jest / test:jest:coverage (Jest matches only
  *.jest.test.* and __tests__/). Plain src/**/*.test.tsx files are currently discovered by neither.
- frontend npm run build outputs to ../static with emptyOutDir (overwrites tracked static/).
- Vite dev proxy forwards /sessions, /grammar, /vocabulary/{decks,due,review}, /static to :8000.
- App LLM features use the Mistral API (services/mistral.py, mistral-large-latest). .env holds MISTRAL_API_KEY.

GOAL:
- Claude Code sessions automatically load the same rules as Vibe and follow the SPDD sequence.

CONSTRAINTS:
- CLAUDE.md must import @.vibe/instructions.md rather than copy it; add only Claude-specific content:
  (1) a note that Vibe-named rules apply equally to Claude, (2) guardrails: app backend stays Mistral API,
  never read/print .env, never merge own PR, never commit to main, (3) how Claude's tools map onto the
  SPDD workflow incl. /spdd-analysis and /spdd-prompt skills and pausing for human review after the
  prompt artifact, (4) commands matching CI, (5) concise architecture map, (6) gotchas (build overwrites
  static/, Vite proxy for new API prefixes, test discovery gap, Jest naming, in-memory SQLite tests),
  (7) artifact Author attribution "Claude Code (<model>, AI Assistant)", (8) commit/PR conventions.
  Keep it concise.
- .claude/settings.json: $schema; allow pytest, npm test scripts, lint, vitest/jest/tsc via npx,
  scripts/validate_*.py, read-only git (status/diff/log/show/branch) and gh (issue/pr view/list,
  pr checks/diff); ask for gh pr merge and git push; deny Read of .env/.env.local/**/.env and
  git push --force / -f. Do NOT allowlist npm run build.
- Skills in .claude/skills/<name>/SKILL.md with frontmatter name, description, argument-hint.
  /spdd-analysis <issue>: fetch issue via gh, compute sequence (reuse if issue already has artifacts,
  else max+1 across spdd/ recursively), timestamp via `date +%Y%m%d%H%M`, kebab slug
  issue-<n>-<short-desc>, fill ANALYSIS-TEMPLATE completely incl. REASONS canvas from real code
  research, save, summarize, stop for review. Never write code.
  /spdd-prompt <issue> [Feat|Fix|Refactor|Test]: require existing analysis for the issue (else stop and
  direct to /spdd-analysis), reuse its sequence, new timestamp, fill PROMPT-TEMPLATE incl. the exact
  "Actual Prompt" block in CONTEXT/GOAL/CONSTRAINTS/EXAMPLES/ACCEPTANCE CRITERIA/DELIVERABLES form,
  leave AI Response / Human Review Notes / Verification to be completed after implementation, stop for
  review. Never write code.
- .gitignore: add .claude/settings.local.json.
- README.md: change development-process wording to say the codebase is developed with both Mistral Vibe
  and Claude Code (intro line, "Why Mistral" Vibe paragraph, Development section, open-spdd note); keep
  the Mistral-API arguments intact; add CLAUDE.md and .claude/ to the project structure tree; add the
  #225 artifacts to the SPDD artifact list. Do not mention a configurable LLM backend.
- Do not touch .vibe/instructions.md, SPDD.md, spdd/README.md, templates, GIT-WORKFLOW.md, VISION.md, CI.

EXAMPLES:
- /spdd-analysis 230 (max FLC-049) → spdd/analysis/FLC-050-<ts>-[Analysis]-issue-230-<slug>.md
- /spdd-prompt 230 → spdd/prompt/FLC-050-<ts>-[Feat]-issue-230-<slug>.md
- /spdd-prompt 231 with no analysis → refuse, point to /spdd-analysis 231

ACCEPTANCE CRITERIA:
- Issue #225 AC1–AC10.

DELIVERABLES:
- CLAUDE.md, .claude/settings.json, .claude/skills/spdd-analysis/SKILL.md,
  .claude/skills/spdd-prompt/SKILL.md, .gitignore update, README.md update; then update this artifact's
  review/verification sections; commit as chore(#225); push; open PR closing #225.
```

---

## AI Response

Implemented exactly the deliverables above:
- `CLAUDE.md`: imports `@.vibe/instructions.md`; sections: Guardrails, SPDD workflow with Claude Code (9-step table + attribution + sequence rule), Commands (mirrors CI), Architecture map, Gotchas, Commits & PRs
- `.claude/settings.json`: 28 allow / 2 ask (`gh pr merge`, `git push`) / 7 deny (`.env` reads, force pushes) rules; `npm run build` intentionally not allowlisted
- `.claude/skills/spdd-analysis/SKILL.md`, `.claude/skills/spdd-prompt/SKILL.md`
- `.gitignore`: `.claude/settings.local.json`
- `README.md`: intro line, "Why Mistral" Vibe paragraph, Development section (+ paragraph on the shared-instructions setup), open-spdd note, project-structure tree, SPDD artifact list

---

## Human Review Notes

### Changes Made
- [x] Type-check command changed from `npx tsc -b --noEmit` to `npx tsc -b` after confirming both `tsconfig.app.json` and `tsconfig.node.json` already set `noEmit` (combining `-b` with `--noEmit` is unnecessary)
- [x] Scenario-duplication gotcha made concrete after verifying the hardcoded IDs live in `ScenarioSelector.tsx`, `ChatInterface.tsx`, `SessionDetail.tsx`
- [x] Also denied `git push --force-with-lease` alongside `--force` / `-f`

### Quality Checks
- [x] Config follows existing doc patterns
- [x] Tests pass at 80%+ coverage (N/A: no runtime code changed)
- [x] Documentation updated
- [x] All acceptance criteria met (see Verification)

### Issues Found
- **Pre-existing, out of scope**: `npx vitest list --filesOnly` shows only Storybook story files, so the 18 plain `frontend/src/components/*.test.tsx` files are not run by `npm run test`, and Jest's `testMatch` (`*.jest.test.*`, `__tests__/`) doesn't pick them up either. Documented as a gotcha in `CLAUDE.md`; a follow-up issue is recommended.
- `VISION.md` still says the project is "built entirely using Mistral Vibe". Left unchanged per the product owner's instruction (README takes priority; VISION.md is stale).
- `spdd/README.md` mentions Mistral Vibe once ("prompts sent to AI assistants (Mistral Vibe)"). Left unchanged per the product owner's instruction.

---

## Verification

- [x] AC1: `CLAUDE.md` line 9 is `@.vibe/instructions.md`; target exists; no rules copied
- [x] AC2: Guardrails section states the app backend stays the Mistral API
- [x] AC3: Commands section lists `python3 -m pytest tests/ -v --tb=short`, `npm run test`, `npm run test:jest` and the coverage variants
- [x] AC4: `python3 -c "import json; json.load(open('.claude/settings.json'))"` passes; `.env` read denies present
- [x] AC5: skills specify `FLC-{SEQ}-{YYYYMMDDHHMM}-[TYPE]-issue-<n>-<slug>.md` and copy from `spdd/template/`; the sequence scan command returns `049` on this branch
- [x] AC6: `/spdd-prompt` stops when `find spdd/analysis -name "FLC-*-\[Analysis\]-issue-<n>-*"` is empty (verified it returns 0 results for a non-existent issue); both skills forbid code
- [x] AC7: `git check-ignore -v .claude/settings.local.json` → `.gitignore:51`
- [x] AC8: README intro, "Why Mistral", Development and open-spdd note mention both agents
- [x] AC9: `git diff --stat -- .vibe/instructions.md SPDD.md spdd/README.md spdd/template GIT-WORKFLOW.md VISION.md .github` is empty
- [x] AC10: file birth times: analysis 10:02:34 → prompt 10:03:18 → `CLAUDE.md` 10:04:05 → settings/skills 10:04:17–10:04:48
- [x] No breaking changes introduced (no runtime code touched)
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
