# SPDD Analysis: [Feature/Task Name]

**GitHub Issue**: #[Number]
**Issue Title**: [Issue Title]
**Issue URL**: [https://github.com/beelandc/french-language-coach/issues/[Number]]
**Artifact ID**: FLC-[SEQUENCE_NUMBER]-[TIMESTAMP]
**Created**: [YYYY-MM-DD HH:MM]
**Author**: [Your Name or AI Assistant]

---

## Original Business Requirement

[Copy the issue description here. If the issue is unclear, ask for clarification before proceeding.]

---

## Background

[Provide context: Why is this feature needed? What problem does it solve? What business value does it provide?]

---

## Business Value

[List the specific business benefits this feature provides, e.g.:
- Improved user experience for X
- Enables Y functionality
- Supports Z business goal]

---

## Scope In

[List what IS included in this task. Be specific and exhaustive.]

- [ ] [Specific capability or feature]
- [ ] [Another capability]

## Scope Out

[List what is NOT included. This is critical for managing expectations and avoiding scope creep.]

- [ ] [Explicitly out of scope item]
- [ ] [Another out of scope item]

---

## Acceptance Criteria (ACs)

[Copy or elaborate on the acceptance criteria from the GitHub issue. Use Gherkin (Given/When/Then) format where appropriate.]

1. **[AC Number]**: [Description]
   **Given** [condition]
   **When** [action]
   **Then** [expected outcome]

2. **[AC Number]**: [Description]
   **Given** [condition]
   **When** [action]
   **Then** [expected outcome]

---

## Domain Concept Identification

### Existing Concepts (from codebase)

[List existing domain concepts, entities, or components that this feature will interact with or modify.]

- **Concept/Entity Name**: [Description and location in codebase]
- **Concept/Entity Name**: [Description and location in codebase]

### New Concepts Required

[List new domain concepts, entities, or components that need to be created.]

- **Concept/Entity Name**: [Description and purpose]
- **Concept/Entity Name**: [Description and purpose]

### Key Business Rules

[List the business rules that govern this feature.]

- **Rule**: [Description]
- **Rule**: [Description]

---

## Strategic Approach

### Solution Direction

[Describe the high-level approach to implementing this feature.]

1. [First step]
2. [Second step]
3. [Third step]

### Key Design Decisions

[Create a table of design decisions with trade-offs and recommendations.]

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| [Decision point] | [Pros/Cons analysis] | [Recommended approach] |

### Alternatives Considered

[List alternative approaches that were considered and why they were rejected.]

- **Alternative 1**: [Description] - Rejected because [reason]
- **Alternative 2**: [Description] - Rejected because [reason]

---

## Risk & Gap Analysis

### Requirement Ambiguities

[List any ambiguities in the requirements that need clarification.]

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| [Ambiguous point] | [What's unclear] | [Suggested resolution] |

### Edge Cases

[List edge cases that need to be handled.]

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| [Edge case] | [Impact] | [How to handle] |

### Technical Risks

[List technical risks and their mitigations.]

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| [Risk description] | [Impact if realized] | [Mitigation strategy] |

### Acceptance Criteria Coverage

[Verify that all ACs are covered by the proposed solution.]

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | [Description] | Yes/No | [Notes] |

**AC Coverage Summary**: [X of Y ACs are addressable with the proposed approach.]

**Implicit Requirements Not in ACs**:
- [Requirement that's implied but not explicitly stated]

---

## REASONS Canvas

This section explicitly maps to the REASONS canvas from SPDD methodology.

### Requirements
[From GitHub issue acceptance criteria]

### Examples
[Concrete test cases and expected behaviors]

### Architecture
[Existing codebase structure, design patterns, and conventions to follow]

### Standards
[Coding standards, test coverage requirements, documentation requirements]

### Omissions
[Explicitly out-of-scope items]

### Notes
[Implementation hints, references to similar code, context]

### Solutions
[Reference implementations, patterns to follow, existing code to mimic]

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
