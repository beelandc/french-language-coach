# SPDD Artifacts Directory

This directory contains **Structured Prompt Driven Development (SPDD) artifacts** that document the AI-assisted development process for the French Language Coach project.

## Purpose

Following the SPDD methodology as described in [Martin Fowler's article](https://martinfowler.com/articles/structured-prompt-driven.html), this directory captures:

1. **Analysis Documents** (`analysis/`): Structured analysis using the REASONS canvas for each development task
2. **Prompt Documents** (`prompt/`): The actual prompts sent to AI assistants (Mistral Vibe) to generate code
3. **Templates** (`template/`): Reusable templates for analysis, prompts, and test scenarios

These artifacts ensure:
- **Traceability**: Every AI-generated change can be traced back to its prompt
- **Reproducibility**: Prompts can be re-run to verify or regenerate outputs
- **Transparency**: The development process is visible and auditable
- **Knowledge Capture**: Design decisions and context are preserved for future developers

## Directory Structure

```
spdd/
├── README.md                    # This file - overview of SPDD artifacts
├── analysis/
│   └── {ID}-{TIMESTAMP}-[Analysis]-{description}.md
├── prompt/
│   └── {ID}-{TIMESTAMP}-[Feat|Test|Fix|Refactor]-{description}.md
└── template/
    ├── ANALYSIS-TEMPLATE.md     # Template for REASONS canvas analysis
    ├── PROMPT-TEMPLATE.md       # Template for code generation prompts
    └── TEST-SCENARIOS-TEMPLATE.md # Template for test scenarios
```

## Naming Convention

Files follow this pattern:
```
{PROJECT_CODE}-{SEQUENCE_NUMBER}-{TIMESTAMP}-[TYPE]-{description}.md
```

- **PROJECT_CODE**: `FLC` (French Language Coach)
- **SEQUENCE_NUMBER**: Incremental identifier per task (e.g., 001, 002)
- **TIMESTAMP**: `YYYYMMDDHHMM` format (24-hour time)
- **TYPE**: `[Analysis]`, `[Feat]`, `[Test]`, `[Fix]`, `[Refactor]`, etc.
- **description**: Brief kebab-case description of the task

### Examples
- `FLC-001-202605121430-[Analysis]-session-listing.md`
- `FLC-001-202605121500-[Feat]-session-listing.md`
- `FLC-001-202605121530-[Test]-session-listing.md`

## Artifact Types

### 1. Analysis Documents (`analysis/`)

Structured using the **REASONS canvas**:
- **Requirements**: What needs to be built
- **Examples**: Concrete test cases and expected behaviors
- **Architecture**: Existing codebase structure and design patterns
- **Standards**: Coding conventions and quality requirements
- **Omissions**: Explicitly out-of-scope items
- **Notes**: Implementation hints and context
- **Solutions**: Reference implementations and patterns

These documents are created **before** prompt engineering to ensure clarity of requirements.

### 2. Prompt Documents (`prompt/`)

The actual prompts sent to Mistral Vibe or other AI assistants. Each prompt document includes:
- **Context**: Current codebase state, relevant files
- **Goal**: Clear, specific objective with GitHub issue reference
- **Constraints**: Architecture, testing, quality requirements
- **Examples**: Concrete test cases and edge cases
- **Deliverables**: Code changes, tests, documentation updates
- **Actual Prompt**: The exact prompt text sent to the AI
- **AI Response**: The AI's generated output (optionally captured)
- **Human Review Notes**: Any refinements or corrections made

These documents are created **during** the AI-assisted development process.

### 3. Templates (`template/`)

Reusable templates to standardize artifact creation:
- **ANALYSIS-TEMPLATE.md**: For creating analysis documents
- **PROMPT-TEMPLATE.md**: For creating prompt documents
- **TEST-SCENARIOS-TEMPLATE.md**: For creating test scenarios

## Workflow

For each GitHub issue worked with AI assistance:

```
1. Create Analysis Document
   ├── Use ANALYSIS-TEMPLATE.md
   ├── Save to analysis/{ID}-{TIMESTAMP}-[Analysis]-{description}.md
   └── Commit to repository

2. Create Prompt Document(s)
   ├── Use PROMPT-TEMPLATE.md
   ├── Save to prompt/{ID}-{TIMESTAMP}-[Type]-{description}.md
   └── Commit to repository

3. Generate Code
   ├── Execute prompt with AI assistant
   ├── Capture actual prompt and response in document
   └── Update document with human review notes

4. Create Tests
   ├── Use TEST-SCENARIOS-TEMPLATE.md
   ├── Save test prompts to prompt/{ID}-{TIMESTAMP}-[Test]-{description}.md
   └── Commit tests with code changes
```

## Relationship to GitHub Issues

Each artifact should reference the GitHub issue it relates to:
- Include issue number in the file name or description
- Link to the issue in the document header
- Reference acceptance criteria from the issue

Example header:
```markdown
# SPDD Analysis: Session Listing Endpoint

**GitHub Issue**: #6
**Issue Title**: Add session listing endpoint with pagination
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/6
```

## Current SPDD Artifacts

### Session Listing (Issue #6)
- Analysis: `spdd/analysis/FLC-001-202605120000-[Analysis]-spdd-artifacts-capture.md`
- Prompt: `spdd/prompt/FLC-001-202605120030-[Feat]-spdd-artifacts-capture.md`

### React Migration (Issue #121)
- Analysis: `spdd/analysis/FLC-002-202605121600-[Analysis]-issue-121-react-migration.md`
- Prompt: `spdd/prompt/FLC-002-202605121630-[Feat]-issue-121-react-migration.md`
- Issue Comment Template: `spdd/issue-121-comment.md` (copy to GitHub issue)

## Reference

This structure is based on the SPDD practice demonstrated in:
- [Structured Prompt Driven Development (Martin Fowler)](https://martinfowler.com/articles/structured-prompt-driven.html)
- [token-billing/spdd/ (gszhangwei)](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)

## Maintenance

- Keep this directory organized and up-to-date
- Archive old artifacts by moving to `spdd/archive/` if the directory becomes too large
- Regularly review and clean up duplicate or superseded artifacts
- Ensure all artifacts reference their corresponding GitHub issue

---

*Last updated: May 2026*
*Project: French Language Coach*
