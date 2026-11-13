# SPDD Analysis: Configure Repository for Claude Code Development

**GitHub Issue**: #225
**Issue Title**: Configure repository for Claude Code development (CLAUDE.md, settings, SPDD skills)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/225
**Artifact ID**: FLC-049-202611131000
**Created**: 2026-11-13 10:00
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> So far, I have developed this french-language-coach project using Mistral Vibe. I would like to configure the codebase to be able to be developed using Claude as well. Please review `.vibe/instructions.md` (the equivalent of CLAUDE.md for Mistral Vibe), `README.md`, `SPDD.md`, and `VISION.md` (prioritize `README.md` where it conflicts with `VISION.md`) and generate any files necessary to configure Claude to interact with the repository in a way that is consistent with the vision and configuration of the repository for Mistral Vibe.

Clarifications from the product owner (recorded before any files were written):

| Question | Decision |
|----------|----------|
| Follow SPDD for this task? | **Yes, full SPDD**: GitHub issue (#225), issue branch, analysis + prompt artifacts before implementation |
| How should CLAUDE.md relate to `.vibe/instructions.md`? | **Import + Claude extras**: `.vibe/instructions.md` stays the single source of truth; CLAUDE.md imports it and adds only Claude-specific material |
| Extras beyond CLAUDE.md? | **All three**: committed `.claude/settings.json`, SPDD slash-command skills, gitignore for `.claude/settings.local.json` |
| Documentation updates? | Update **only `README.md`** development-process references to say the codebase is developed with both Mistral Vibe and Claude. Leave `SPDD.md` and `spdd/README.md` unchanged. Do **not** document a future configurable Mistral/Claude LLM backend yet. |

---

## Background

The project's AI-development governance lives in `.vibe/instructions.md`, `SPDD.md`, `GIT-WORKFLOW.md`, and `spdd/`. Mistral Vibe reads `.vibe/instructions.md` automatically; Claude Code reads `CLAUDE.md` (and `.claude/`) automatically. Without a `CLAUDE.md`, a Claude Code session starts with no knowledge of the mandatory SPDD sequence, the issue-based branching rules, the 80% coverage standard, or the `python3` requirement. It would be likely to repeat the issue #150 violation (implementing before the prompt artifact exists).

## Business Value

- Lets the maintainer use either agent on the same codebase with identical process guarantees
- Keeps SPDD traceability intact regardless of which agent produced a change
- Avoids rule drift by keeping a single source of truth for the shared instructions
- Lowers friction (fewer permission prompts for routine commands) while protecting secrets (`.env` holds `MISTRAL_API_KEY`)

---

## Scope In

- [ ] `CLAUDE.md` at repo root that imports `@.vibe/instructions.md`
- [ ] Claude-specific additions in `CLAUDE.md`: guardrails (Mistral API stays the app backend; don't merge own PRs), commands matching CI, architecture map, gotchas, how Claude tools map to the SPDD workflow, artifact author attribution
- [ ] `.claude/settings.json` with allow / ask / deny permission rules
- [ ] `.claude/skills/spdd-analysis/SKILL.md` (`/spdd-analysis <issue>`)
- [ ] `.claude/skills/spdd-prompt/SKILL.md` (`/spdd-prompt <issue> [type]`)
- [ ] `.gitignore` entry for `.claude/settings.local.json`
- [ ] `README.md`: development-process references updated to name both Mistral Vibe and Claude Code; project-structure tree lists the new config files; issue #225 artifacts listed with the other SPDD artifact links
- [ ] SPDD artifacts for this issue (this file + prompt artifact)

## Scope Out

- [ ] Configurable Mistral/Claude LLM backend for the app (future; not to be documented yet)
- [ ] Changes to `.vibe/instructions.md`, `SPDD.md`, `spdd/README.md`, SPDD templates, `GIT-WORKFLOW.md`
- [ ] `VISION.md` updates (stale; the product owner said to prioritize README)
- [ ] CI workflow changes
- [ ] Fixing the pre-existing frontend test-discovery gap (see Risk & Gap Analysis): documented as a gotcha only

---

## Acceptance Criteria (ACs)

1. **AC1: CLAUDE.md imports Vibe instructions**
   **Given** a new Claude Code session in the repo
   **When** CLAUDE.md is loaded
   **Then** the full content of `.vibe/instructions.md` is loaded via `@.vibe/instructions.md`, with no copied rules that could drift

2. **AC2: Mistral backend guardrail**
   **Given** CLAUDE.md
   **Then** it explicitly states that the application's LLM backend remains the Mistral API and must not be replaced with Claude/Anthropic APIs

3. **AC3: Commands match CI**
   **Then** CLAUDE.md documents `python3 -m pytest tests/ -v --tb=short`, `npm run test`, `npm run test:jest`, and the coverage variants

4. **AC4: settings.json**
   **Given** `.claude/settings.json`
   **Then** it is valid JSON, allows routine test and read-only git/gh commands, and denies reading `.env` files

5. **AC5: SPDD skills naming**
   **Given** `/spdd-analysis 123` or `/spdd-prompt 123`
   **Then** the produced file follows `FLC-{SEQ}-{YYYYMMDDHHMM}-[TYPE]-{desc}.md` and is based on the matching template in `spdd/template/`

6. **AC6: Order enforcement**
   **Given** no analysis artifact exists for issue N
   **When** `/spdd-prompt N` runs
   **Then** it stops and directs the user to `/spdd-analysis N` first; the workflow forbids code before the prompt artifact exists

7. **AC7: Local settings ignored**: `.claude/settings.local.json` is in `.gitignore`

8. **AC8: README**: development-process sections mention both Mistral Vibe and Claude Code

9. **AC9: Untouched files**: `.vibe/instructions.md`, `SPDD.md`, `spdd/README.md` have no diff

10. **AC10: Artifacts**: analysis and prompt artifacts for #225 exist, the prompt dated after the analysis and before any config file

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Vibe instructions**: `.vibe/instructions.md`, the agent rulebook (SPDD sequence, git workflow, quality standards, python3)
- **SPDD methodology**: `SPDD.md`, REASONS canvas, 6-phase workflow, artifact capture
- **SPDD artifacts**: `spdd/analysis/`, `spdd/prompt/`, `spdd/template/{ANALYSIS,PROMPT,TEST-SCENARIOS}-TEMPLATE.md`; highest existing sequence is **FLC-048**
- **Git workflow**: `GIT-WORKFLOW.md`, `{type}/issue-{n}-{desc}` branches, `{type}(#{n}): msg` commits, squash merge, PR to `main`
- **CI**: `.github/workflows/` runs pytest (`python3 -m pytest tests/ -v --tb=short`, Python 3.12), vitest (`npm run test`, `npm run test:coverage`, Node 20/22), jest (`npm run test:jest`), cypress, plus `status-gateway.yml`

### New Concepts Required

- **CLAUDE.md**: Claude Code's project memory file; supports `@path` imports
- **`.claude/settings.json`**: shared project settings (permissions); `.claude/settings.local.json` is the personal override
- **Project skills**: `.claude/skills/<name>/SKILL.md`, invocable as `/<name>` with `$ARGUMENTS`

### Key Business Rules

- **Rule**: Analysis → Prompt → Implement order is mandatory (issue #150 lesson)
- **Rule**: Sequence numbers increment per task/issue; analysis and prompt for one issue share the sequence
- **Rule**: Never work on `main`; never merge your own PR without human review
- **Rule**: Never read or commit secrets; `.env` contains `MISTRAL_API_KEY`
- **Rule**: The app's AI features use the Mistral API (`services/mistral.py`, `mistral-large-latest`)

---

## Strategic Approach

### Solution Direction

1. Create the issue (#225) and branch `chore/issue-225-claude-code-config` (done)
2. Write this analysis, then the prompt artifact
3. Write `CLAUDE.md` (import + Claude-specific extras)
4. Write `.claude/settings.json`, the two skills, and the `.gitignore` entry
5. Update `README.md`
6. Validate (JSON parse, untouched-file diff check, import path resolves), update the prompt artifact's review section, commit, push, open PR

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| CLAUDE.md content strategy | Copying is readable standalone but drifts; import keeps one source but Vibe file has a few Vibe-isms | **Import** `.vibe/instructions.md` (owner's choice); add a short note that Vibe-specific wording applies equally to Claude |
| Skills vs legacy `.claude/commands/` | Commands are simpler; skills are the current mechanism and support frontmatter (`argument-hint`, `description`) | **Skills** in `.claude/skills/` |
| Allow vs ask for `gh pr merge` | Deny blocks even approved merges; allow violates "don't merge own PR" | **ask**: human confirmation acts as the review gate |
| Allow `npm run build` | Build empties and overwrites tracked `static/` | **Not allowlisted**; documented as a gotcha |
| `.env` protection | `Read` deny doesn't cover every shell path | Deny `Read` on `.env` variants (not `.env.example`) and document "never cat .env" in CLAUDE.md |
| Force pushes | Rarely needed; destructive | **Deny** `git push --force` / `-f` |
| Skill auto-invocation | `disable-model-invocation` would make the skills user-only | **Allow model invocation** so Claude can follow the mandated workflow itself |

### Alternatives Considered

- **Standalone CLAUDE.md**: rejected by the owner (drift risk)
- **Shared AGENTS.md referenced by both agents**: rejected by the owner (changes the Vibe setup)
- **Hook that blocks code edits until a prompt artifact exists**: rejected for now; too brittle (non-issue edits, docs-only changes) and beyond what Vibe enforces. Could be a follow-up.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "README references that describe the development process" | Which lines count | Intro line 3, "Why Mistral" Vibe paragraph, "Development" section, the open-spdd note. Leave "Why Mistral" app-model arguments intact. |
| Artifact author field | Prior artifacts use `Mistral Vibe (AI Assistant)` | Claude uses `Claude Code (<model>, AI Assistant)` |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Issue already has an analysis artifact | Re-running `/spdd-analysis` must not create a second sequence number | Skill reuses existing sequence and asks whether to update or create a revision |
| No GitHub issue given | Rules forbid working without one | Skills ask for an issue number, or offer to create the issue via `gh issue create` |
| Stray `FLC-024-*` files at `spdd/` root | Sequence scan must include them | Scan `spdd/` recursively |
| Multiple prompt types per issue (`[Feat]` + `[Test]`) | Allowed by SPDD.md | `/spdd-prompt` accepts an optional type argument; same sequence, new timestamp |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Pre-existing gap: 18 `src/components/*.test.tsx` Vitest files are not discovered by `npm run test` (vite.config defines only the Storybook project) nor by Jest (`testMatch` is `*.jest.test.*`) | Claude may think new component tests run in CI when they don't | Document as a gotcha in CLAUDE.md; recommend a follow-up issue; out of scope here |
| Permission rule syntax differences across Claude Code versions | Rules silently not matching | Use the documented `Tool(specifier)` and `:*` prefix forms; add `$schema` for editor validation |
| `@` import path wrong | Rules not loaded | Use repo-relative `@.vibe/instructions.md`; verify the file exists |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Import | Yes | |
| AC2 | Mistral guardrail | Yes | |
| AC3 | CI commands | Yes | Also document the discovery gap |
| AC4 | settings.json | Yes | |
| AC5 | Naming | Yes | |
| AC6 | Order enforcement | Yes | Instruction-level, not hook-enforced |
| AC7 | gitignore | Yes | |
| AC8 | README | Yes | |
| AC9 | Untouched files | Yes | Verify with `git diff --stat` |
| AC10 | Artifacts | Yes | |

**AC Coverage Summary**: 10 of 10 ACs are addressable.

**Implicit Requirements Not in ACs**:
- README project-structure tree should list `CLAUDE.md` and `.claude/` (instructions require README updates for structure changes)
- Commit/PR conventions: `chore(#225): ...`, PR body references `Closes #225`

---

## REASONS Canvas

### Requirements
Issue #225 ACs 1–10 above; owner clarifications table.

### Examples
- `/spdd-analysis 230` with highest existing sequence FLC-049 → `spdd/analysis/FLC-050-<now>-[Analysis]-issue-230-<slug>.md`
- `/spdd-prompt 230` with FLC-050 analysis present → `spdd/prompt/FLC-050-<now>-[Feat]-issue-230-<slug>.md`
- `/spdd-prompt 231` with no analysis for #231 → stops and says "run /spdd-analysis 231 first"
- Claude asked "fix the date filter" without an issue → asks for the issue number (or offers to create one) before branching

### Architecture
Config-only change. Claude Code loads `CLAUDE.md` → `@.vibe/instructions.md`; project settings in `.claude/settings.json`; skills in `.claude/skills/*/SKILL.md`. No application code touched.

### Standards
- Markdown style consistent with existing docs (headings, tables, checklists)
- Artifacts follow templates and naming convention
- Branch/commit/PR conventions from `GIT-WORKFLOW.md`
- No secrets in committed files

### Omissions
See Scope Out. In particular: no LLM backend abstraction and no documentation of one.

### Notes
- `npm run build` writes to `../static` with `emptyOutDir: true`
- Vite dev server proxies `/sessions`, `/grammar`, `/vocabulary/{decks,due,review}`, `/static` to :8000; new API prefixes need a proxy entry (see issue #205 history)
- Tests use in-memory SQLite (`tests/conftest.py`); factories in `tests/factories.py`
- Jest tests are named `*.jest.test.tsx`

### Solutions
- Mirror `.vibe/instructions.md` structure by importing it
- Skills modelled on the manual workflow described in `spdd/README.md` "Workflow" and the FLC-048 artifact pair
