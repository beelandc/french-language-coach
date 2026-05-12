# SPDD Prompt: SPDD Artifacts Capture Implementation

**GitHub Issue**: N/A (Process improvement task)
**Issue Title**: Implement SPDD artifact capture in spdd/ directory
**Artifact ID**: FLC-001-202605120030
**Created**: 2026-05-12 00:30
**Author**: AI Assistant (Mistral Vibe)
**Related Analysis**: `spdd/analysis/FLC-001-202605120000-[Analysis]-spdd-artifacts-capture.md`

---

## Context

### Current Codebase State

The French Language Coach project has been using Mistral Vibe for AI-assisted development with SPDD methodology:
- SPDD.md documents the workflow
- .vibe/instructions.md provides AI assistant instructions
- README.md has SPDD workflow section
- GitHub issues use REASONS canvas

However, actual prompts used to generate code are NOT being captured in the repository.

### Relevant Files

| File | Purpose | Key Elements |
|------|---------|--------------|
| `SPDD.md` | SPDD methodology | REASONS canvas, 6-phase workflow |
| `.vibe/instructions.md` | AI instructions | Workflow checklist, quality standards |
| `README.md` | Project docs | Architecture, setup, SPDD workflow |
| `GIT-WORKFLOW.md` | Git strategy | Branch naming, PR process |

### Existing Patterns

- Documentation in markdown format at repository root
- Structured approach to development (SPDD)
- Template-based workflows (.vibe/instructions.md)
- Reference to external resources (Martin Fowler article, sample repo)

---

## Goal

**Primary Objective**: Create the infrastructure and process for capturing SPDD artifacts in the repository.

**Secondary Objectives**:
- Create directory structure matching sample repository pattern
- Create templates for artifact creation
- Update existing documentation to reference the new process
- Create example artifacts demonstrating the pattern

---

## Constraints

### Architecture Constraints
- Must follow the pattern from gszhangwei/token-billing sample repository
- Must match the structure described in Martin Fowler's SPDD article
- Must integrate with existing documentation (SPDD.md, README.md, .vibe/instructions.md)

### Code Quality Constraints
- All markdown files must follow existing formatting conventions
- Templates must be practical and easy to use
- Documentation must be clear and comprehensive

### Testing Constraints
- Not applicable (documentation changes)

### Acceptance Criteria

From the analysis document:
1. Directory structure created (spdd/, analysis/, prompt/, template/)
2. Templates available (ANALYSIS-TEMPLATE.md, PROMPT-TEMPLATE.md, TEST-SCENARIOS-TEMPLATE.md)
3. SPDD.md updated with Artifact Capture section
4. README.md updated with SPDD Artifacts subsection
5. .vibe/instructions.md updated to require artifact creation
6. Initial artifacts created (this analysis + this prompt)

---

## Examples

### Reference Materials

1. **Martin Fowler SPDD Article**: https://martinfowler.com/articles/structured-prompt-driven.html
   - Describes the SPDD methodology
   - References the sample repository

2. **Sample Repository**: https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/
   - Contains: analysis/, prompt/, template/ subdirectories
   - Files named: `{CODE}-{SEQ}-{TIMESTAMP}-[TYPE]-{description}.md`
   - Example: `GGQPA-001-202603191105-[Feat]-multi-plan-billing-model-aware-pricing.md`

### Naming Convention Examples

```
FLC-001-202605120000-[Analysis]-spdd-artifacts-capture.md
FLC-001-202605120030-[Feat]-spdd-artifacts-capture.md
FLC-002-202605121430-[Analysis]-session-listing.md
FLC-002-202605121500-[Feat]-session-listing.md
```

### Directory Structure Example

```
spdd/
├── README.md
├── analysis/
│   ├── FLC-001-202605120000-[Analysis]-spdd-artifacts-capture.md
│   └── FLC-002-202605121430-[Analysis]-session-listing.md
├── prompt/
│   ├── FLC-001-202605120030-[Feat]-spdd-artifacts-capture.md
│   └── FLC-002-202605121500-[Feat]-session-listing.md
└── template/
    ├── ANALYSIS-TEMPLATE.md
    ├── PROMPT-TEMPLATE.md
    └── TEST-SCENARIOS-TEMPLATE.md
```

---

## Deliverables

### Directory Structure
- [x] `spdd/` directory created
- [x] `spdd/analysis/` directory created
- [x] `spdd/prompt/` directory created
- [x] `spdd/template/` directory created

### Documentation Files
- [x] `spdd/README.md` - Overview of SPDD artifacts
- [x] `spdd/template/ANALYSIS-TEMPLATE.md` - Analysis document template
- [x] `spdd/template/PROMPT-TEMPLATE.md` - Prompt document template
- [x] `spdd/template/TEST-SCENARIOS-TEMPLATE.md` - Test scenarios template

### Updated Files
- [x] `SPDD.md` - Added Artifact Capture section
- [x] `README.md` - Added SPDD Artifacts subsection
- [x] `.vibe/instructions.md` - Added SPDD Artifact Requirements section

### Artifact Files
- [x] `spdd/analysis/FLC-001-202605120000-[Analysis]-spdd-artifacts-capture.md` (this task's analysis)
- [x] `spdd/prompt/FLC-001-202605120030-[Feat]-spdd-artifacts-capture.md` (this document)

---

## Actual Prompt

[This is the reconstructed prompt that was used to initiate this task.]

```
I just realized that, while we have been following the SPDD process in the sense that 
we are refining the github issues to use the REASONS canvas, we are not yet capturing 
prompts used to actually generate the code in the codebase.

Please review the SPDD article https://martinfowler.com/articles/structured-prompt-driven/ 
and the SPDD directory in this sample repository (which is referred to by the article): 
https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/

Based on your deeper analysis of the process around how analysis and prompts are 
captured as design records within the repository, please update your instructions.md, 
SPDD.md, README.md and any other files necessary to ensure that this portion of 
the process is clear to any viewers of the repository and that you are always 
creating artifacts in the repository (in an spdd/ directory, following the pattern 
defined in the SPDD article) as part of the process of working a github issue

CONTEXT:
- Project: French Language Coach (Python + FastAPI backend)
- Current state: Using Mistral Vibe, following SPDD with REASONS canvas in GitHub issues
- Gap: Not capturing actual prompts in repository
- Reference: Martin Fowler SPDD article and gszhangwei/token-billing spdd/ directory

GOAL:
- Create spdd/ directory structure matching sample repo pattern
- Create templates for artifact creation
- Update SPDD.md with artifact capture process
- Update README.md to reference spdd/ directory
- Update .vibe/instructions.md to require artifact creation
- Create initial artifacts demonstrating the pattern

CONSTRAINTS:
- Must follow pattern from gszhangwei/token-billing sample repo
- Must match structure from Martin Fowler article
- Must integrate with existing documentation
- All changes must be in markdown format
- Templates must be practical and easy to use

EXAMPLES:
- Reference repo structure: spdd/ with analysis/, prompt/, template/ subdirectories
- Reference file naming: {CODE}-{SEQ}-{TIMESTAMP}-[TYPE]-{description}.md
- Reference artifact types: Analysis, Feat, Test, Fix, Refactor

DELIVERABLES:
- spdd/ directory with subdirectories
- spdd/README.md
- Template files (ANALYSIS-TEMPLATE.md, PROMPT-TEMPLATE.md, TEST-SCENARIOS-TEMPLATE.md)
- Updated SPDD.md with Artifact Capture section
- Updated README.md with SPDD Artifacts subsection
- Updated .vibe/instructions.md with artifact requirements
- Initial analysis and prompt artifacts for this task

ACCEPTANCE CRITERIA:
- [ ] Directory structure created
- [ ] Templates available
- [ ] SPDD.md updated
- [ ] README.md updated
- [ ] .vibe/instructions.md updated
- [ ] Initial artifacts created
```

---

## AI Response

[The AI (Mistral Vibe) generated the following responses, which are now captured in the artifact files.]

1. Created directory structure: `spdd/`, `spdd/analysis/`, `spdd/prompt/`, `spdd/template/`
2. Created `spdd/README.md` with comprehensive overview
3. Created three template files in `spdd/template/`
4. Created `spdd/analysis/FLC-001-202605120000-[Analysis]-spdd-artifacts-capture.md`
5. Creating this prompt document: `spdd/prompt/FLC-001-202605120030-[Feat]-spdd-artifacts-capture.md`
6. Updated `SPDD.md` with Artifact Capture section
7. Updated `README.md` with SPDD Artifacts subsection
8. Updated `.vibe/instructions.md` with SPDD Artifact Requirements section

---

## Human Review Notes

[To be completed by human reviewer.]

### Changes Made
- [ ] [Any manual adjustments to AI-generated content]

### Quality Checks
- [ ] Directory structure matches sample repo pattern
- [ ] Templates are practical and follow best practices
- [ ] Documentation updates are clear and accurate
- [ ] All acceptance criteria are met
- [ ] Naming conventions are consistent

### Issues Found
- [ ] [Any issues identified during review]

---

## Verification

- [x] Directory structure created: spdd/, analysis/, prompt/, template/
- [x] Templates created: ANALYSIS-TEMPLATE.md, PROMPT-TEMPLATE.md, TEST-SCENARIOS-TEMPLATE.md
- [x] spdd/README.md created
- [x] SPDD.md updated with Artifact Capture section
- [x] README.md updated with SPDD Artifacts subsection
- [x] .vibe/instructions.md updated with artifact requirements
- [x] Initial analysis artifact created
- [x] Initial prompt artifact created (this document)
- [ ] Human review completed
- [ ] All acceptance criteria verified

---

*Prompt based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
