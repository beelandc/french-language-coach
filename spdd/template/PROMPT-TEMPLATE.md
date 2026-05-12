# SPDD Prompt: [Feature/Task Name]

**GitHub Issue**: #[Number]
**Issue Title**: [Issue Title]
**Issue URL**: [https://github.com/beelandc/french-language-coach/issues/[Number]]
**Artifact ID**: FLC-[SEQUENCE_NUMBER]-[TIMESTAMP]
**Created**: [YYYY-MM-DD HH:MM]
**Author**: [Your Name or AI Assistant]
**Related Analysis**: [Link to analysis document if applicable]

---

## Context

[Provide the AI assistant with the context it needs to generate appropriate code.]

### Current Codebase State
- [Description of current state]
- [Relevant files and their purposes]
- [Existing patterns to follow]

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `path/to/file.py` | [Description] | [Lines 1-50, function_name()] |
| `path/to/another.py` | [Description] | [Key elements] |

### Existing Patterns
- [Pattern 1: Description and example]
- [Pattern 2: Description and example]

---

## Goal

[Clearly state what you want the AI to generate. Be specific.]

**Primary Objective**: [Main thing to implement]

**Secondary Objectives**:
- [Objective 2]
- [Objective 3]

---

## Constraints

[List hard constraints that the AI must follow.]

### Architecture Constraints
- [Must follow existing architecture]
- [Must use specific libraries/frameworks]
- [Must not introduce breaking changes]

### Code Quality Constraints
- [Must maintain 80% test coverage]
- [Must follow PEP 8 style guide]
- [Must include docstrings for public functions]

### Testing Constraints
- [Must create unit tests for all new functions]
- [Must test edge cases]
- [Must achieve 80% coverage]

### Acceptance Criteria
[Copy or reference the acceptance criteria from the GitHub issue.]

---

## Examples

[Provide concrete examples to guide the AI's output.]

### Input/Output Examples
1. **Example 1**: [Description]
   - Input: [Input data]
   - Expected Output: [Expected result]

2. **Example 2**: [Description]
   - Input: [Input data]
   - Expected Output: [Expected result]

### Edge Cases
- [Edge case 1: Description and expected handling]
- [Edge case 2: Description and expected handling]

### Test Cases
```python
# Example test case format
def test_example():
    # Given
    input = ...
    
    # When
    result = function_to_test(input)
    
    # Then
    assert result == expected_output
```

---

## Deliverables

[List what the AI should produce.]

### Code Changes
- [ ] `path/to/new_file.py` - [Description]
- [ ] `path/to/modified_file.py` - [Description of changes]

### Tests
- [ ] Unit tests for `new_function()`
- [ ] Integration tests for endpoint
- [ ] Edge case tests

### Documentation
- [ ] Update README.md with new endpoints
- [ ] Add docstrings to new functions
- [ ] Update API documentation

---

## Actual Prompt

[This section contains the exact prompt text that was/will be sent to the AI assistant.]

```
[EXACT PROMPT TEXT HERE]

CONTEXT:
[Context information]

GOAL:
[Goal statement]

CONSTRAINTS:
[Constraint list]

EXAMPLES:
[Example cases]

ACCEPTANCE CRITERIA:
[AC from issue]

DELIVERABLES:
[What to produce]
```

---

## AI Response

[Optionally capture the AI's response here for reproducibility.]

```
[AI-generated content]
```

---

## Human Review Notes

[Document any changes made by humans after AI generation.]

### Changes Made
- [ ] [Change 1: Description and reason]
- [ ] [Change 2: Description and reason]

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [Issue 1: Description and resolution]
- [Issue 2: Description and resolution]

---

## Verification

[Checklist for verifying the deliverables.]

- [ ] All acceptance criteria from issue #[Number] are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
