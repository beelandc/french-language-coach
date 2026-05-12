# SPDD Analysis: SPDD Artifacts Capture Implementation

**GitHub Issue**: N/A (Process improvement task)
**Issue Title**: Implement SPDD artifact capture in spdd/ directory
**Artifact ID**: FLC-001-202605120000
**Created**: 2026-05-12 00:00
**Author**: AI Assistant (Mistral Vibe)

---

## Original Business Requirement

The user requested that we review the SPDD article from Martin Fowler and the SPDD directory in the sample repository (gszhangwei/token-billing), and update our documentation to ensure that prompts used to generate code are captured as design records within the repository in an `spdd/` directory.

**Key Requirement**: We are following the REASONS canvas in GitHub issues but NOT capturing the actual prompts used to generate code in the repository.

---

## Background

We have been using Mistral Vibe for AI-assisted development following the SPDD methodology, including:
- Using GitHub issues with acceptance criteria
- Following the REASONS canvas for context gathering
- Maintaining 80% test coverage
- Following structured workflow

However, we have NOT been:
- Creating analysis documents in a standardized location
- Capturing the actual prompts sent to the AI
- Documenting the AI's responses
- Tracking human review changes

This means we lack:
- **Traceability**: Cannot trace code back to the prompt that generated it
- **Reproducibility**: Cannot re-run prompts to verify outputs
- **Transparency**: The development process is not visible in the repository
- **Knowledge Preservation**: Design decisions are not captured for future developers

---

## Business Value

1. **Audit Trail**: Complete record of AI-assisted development for compliance and review
2. **Knowledge Retention**: Future developers can understand why decisions were made
3. **Quality Assurance**: Can verify that prompts followed SPDD methodology
4. **Process Improvement**: Can analyze prompt effectiveness over time
5. **Onboarding**: New team members can see examples of how to work with AI assistants

---

## Scope In

- [ ] Create `spdd/` directory structure with subdirectories (analysis/, prompt/, template/)
- [ ] Create `spdd/README.md` explaining purpose and structure
- [ ] Create template files for analysis, prompt, and test scenario documents
- [ ] Update `SPDD.md` to clarify artifact capture process
- [ ] Update `README.md` to reference the spdd/ directory
- [ ] Update `.vibe/instructions.md` to require artifact creation
- [ ] Create initial analysis and prompt artifacts for this task (demonstrating the pattern)

## Scope Out

- [ ] Retroactively creating artifacts for past issues (not required for initial implementation)
- [ ] Creating an automated system for artifact generation (manual process for now)
- [ ] Adopting open-spdd utility (not currently used)

---

## Acceptance Criteria (ACs)

1. **Directory Structure Created**
   **Given** the repository
   **When** looking at the spdd/ directory
   **Then** it contains: README.md, analysis/, prompt/, template/ subdirectories

2. **Templates Available**
   **Given** the spdd/template/ directory
   **When** viewing its contents
   **Then** it contains: ANALYSIS-TEMPLATE.md, PROMPT-TEMPLATE.md, TEST-SCENARIOS-TEMPLATE.md

3. **Documentation Updated**
   **Given** the updated SPDD.md
   **When** reading the Artifact Capture section
   **Then** it clearly explains the spdd/ directory purpose, structure, and naming conventions

4. **README.md Updated**
   **Given** the updated README.md
   **When** reading the AI-Assisted Development Workflow section
   **Then** it references the spdd/ directory and its purpose

5. **Vibe Instructions Updated**
   **Given** the updated .vibe/instructions.md
   **When** reading the workflow checklist
   **Then** it includes a requirement to create SPDD artifacts

6. **Initial Artifacts Created**
   **Given** this analysis document
   **When** committed to the repository
   **Then** there is also a corresponding prompt document for this task

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **SPDD.md**: Current SPDD methodology documentation
- **.vibe/instructions.md**: AI assistant instructions
- **README.md**: Project documentation with SPDD workflow section
- **GIT-WORKFLOW.md**: Git workflow documentation
- **GitHub Issues**: Structured with acceptance criteria and REASONS canvas

### New Concepts Required

- **spdd/ directory**: Root directory for SPDD artifacts
- **spdd/analysis/**: Directory for REASONS canvas analysis documents
- **spdd/prompt/**: Directory for actual prompts sent to AI
- **spdd/template/**: Directory for reusable artifact templates
- **Artifact Naming Convention**: Standardized format for artifact files
- **Workflow Integration**: Steps for creating artifacts in the development process

### Key Business Rules

- **Rule 1**: Every AI-assisted development task MUST have at least one analysis document
- **Rule 2**: Every prompt sent to AI MUST be captured in a prompt document
- **Rule 3**: Artifacts MUST reference their corresponding GitHub issue
- **Rule 4**: Artifacts MUST follow the naming convention: `FLC-{SEQUENCE}-{TIMESTAMP}-[TYPE]-{description}.md`
- **Rule 5**: Artifacts MUST be committed to the repository with the code changes

---

## Strategic Approach

### Solution Direction

1. **Create Directory Structure**: Establish the spdd/ directory with all necessary subdirectories
2. **Create Documentation**: Write spdd/README.md explaining the purpose and usage
3. **Create Templates**: Provide reusable templates for each artifact type
4. **Update Existing Docs**: Modify SPDD.md, README.md, and .vibe/instructions.md to reference the new process
5. **Create Example Artifacts**: Demonstrate the pattern by creating artifacts for this task itself

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Directory name** | `spdd/` vs `docs/spdd/` vs `.spdd/` | Use `spdd/` - top-level, matches sample repo |
| **Artifact format** | Markdown vs JSON vs YAML | Use Markdown - human-readable, standard in repo |
| **Naming convention** | Various formats possible | Use `FLC-{SEQ}-{TIMESTAMP}-[TYPE]-{desc}.md` - matches sample repo pattern |
| **Template location** | In spdd/ vs separate templates/ dir | In `spdd/template/` - keeps all SPDD artifacts together |
| **Required vs optional** | Make artifacts mandatory vs recommended | Make analysis and prompt artifacts **required** |

### Alternatives Considered

- **Alternative 1**: Use a separate repository for artifacts - Rejected because artifacts should be versioned with the code they describe
- **Alternative 2**: Store artifacts in a database - Rejected because we want them in git history
- **Alternative 3**: Use a different naming convention - Rejected because we want to match the sample repo pattern for consistency
- **Alternative 4**: Make artifact creation optional - Rejected because traceability is critical

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **Retroactive artifacts** | Should we create artifacts for past issues? | No - only for new work going forward |
| **AI response capture** | Should we capture the full AI response? | Optional - can be useful but may be verbose |
| **Artifact review** | Should artifacts be code-reviewed? | Yes - as part of PR review |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **Non-AI work** | What if work is done without AI? | Still create analysis if significant; skip prompt |
| **Multiple prompts per issue** | One issue may need multiple prompts | Create multiple prompt documents with sequence numbers |
| **Prompt refinements** | Prompts may be refined during development | Update prompt document with iterations |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Artifact drift** | Artifacts may become outdated | Review artifacts as part of code review |
| **Storage bloat** | Many artifacts may accumulate | Archive old artifacts periodically |
| **Inconsistent quality** | Artifacts may vary in quality | Provide clear templates and examples |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Directory structure created | Yes | Will create all required directories |
| AC2 | Templates available | Yes | Will create all three templates |
| AC3 | SPDD.md updated | Yes | Will add Artifact Capture section |
| AC4 | README.md updated | Yes | Will add SPDD Artifacts subsection |
| AC5 | Vibe instructions updated | Yes | Will add SPDD artifact requirements |
| AC6 | Initial artifacts created | Yes | This document + corresponding prompt |

**AC Coverage Summary**: All 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Artifacts should be in markdown format
- Artifacts should follow the naming convention
- Artifacts should reference GitHub issues

---

## REASONS Canvas

### Requirements
- Create spdd/ directory with subdirectories
- Create spdd/README.md
- Create template files
- Update SPDD.md, README.md, .vibe/instructions.md
- Create initial artifacts

### Examples
- Sample repository: https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/
- SPDD article: https://martinfowler.com/articles/structured-prompt-driven.html

### Architecture
- Existing documentation structure in repo
- Top-level directories for project documentation (README.md, SPDD.md, etc.)
- Template-based approach for consistency

### Standards
- Markdown format for all artifacts
- Naming convention: `FLC-{SEQUENCE}-{TIMESTAMP}-[TYPE]-{description}.md`
- Templates in spdd/template/
- Analysis in spdd/analysis/
- Prompts in spdd/prompt/

### Omissions
- No automated artifact generation (manual process)
- No retroactive artifacts for past issues
- No open-spdd utility adoption

### Notes
- Follow the pattern from gszhangwei/token-billing sample repo
- Project code: FLC (French Language Coach)
- Sequence numbers: Start from 001 for this task
- Timestamps: YYYYMMDDHHMM format (24-hour time)

### Solutions
- Reference: spdd/ directory in token-billing repo
- Reference: SPDD.md for REASONS canvas
- Reference: Existing markdown documentation patterns

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
