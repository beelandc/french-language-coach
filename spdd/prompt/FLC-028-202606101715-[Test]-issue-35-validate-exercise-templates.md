# SPDD Prompt: Validate Exercise Templates - Test Implementation

**GitHub Issue**: #35
**Issue Title**: 2.4-T: Validate exercise templates
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/35
**Artifact ID**: FLC-028-202606101715
**Created**: 2026-06-10 17:15
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: [FLC-028-202606101700-[Analysis]-issue-35-validate-exercise-templates.md](../analysis/FLC-028-202606101700-[Analysis]-issue-35-validate-exercise-templates.md)
**Status**: ✅ COMPLETED - All tests passing with 96% coverage

---

## Context

### Current Codebase State

The codebase currently has:
- **Schema definitions** in `schemas/grammar_exercise.py` with Pydantic models for all 5 exercise types
- **Validation functions**: `validate_exercise_data()`, `load_exercise_from_file()`, `load_exercises_from_directory()`
- **Exercise template files** in `data/grammar/exercises/` (5 JSON files, one for each exercise type)
- **Existing tests** in `tests/test_grammar_exercise_schema.py` that test the schema definitions themselves (from issue #34)

This task (issue #35) is to create tests specifically for validating the exercise template files themselves.

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `schemas/grammar_exercise.py` | Exercise schema models and validation | `load_exercise_from_file()`, `load_exercises_from_directory()`, Exercise union type |
| `data/grammar/exercises/fill-in-the-blank-present-tense.json` | Fill-in-the-blank exercise template | Exercise with blank in prompt |
| `data/grammar/exercises/multiple-choice-etre.json` | Multiple choice exercise template | Exercise with options array |
| `data/grammar/exercises/translation-j-aime.json` | Translation exercise template | Exercise with source/target languages |
| `data/grammar/exercises/conjugation-parler-nous.json` | Conjugation exercise template | Exercise with verb, tense, pronoun |
| `data/grammar/exercises/transformation-negative.json` | Sentence transformation exercise template | Exercise with transformation_type |
| `tests/test_grammar_exercise_schema.py` | Existing schema tests | Reference for test patterns |

### Existing Patterns

- Tests use pytest with descriptive function names
- Tests are organized into classes by the component under test
- Fixtures are used for reusable test data
- Both happy path and error cases are tested
- Docstrings are used for all test functions
- Assertions include descriptive messages

---

## Goal

**Primary Objective**: Create a comprehensive test suite that validates all 5 exercise template files against their schemas and verifies that rendering and answer checking work correctly.

**Secondary Objectives**:
- Achieve 80% test coverage for the exercise validation code paths
- Follow existing test patterns in the codebase
- Ensure tests are maintainable and provide clear error messages

---

## Constraints

### Architecture Constraints
- Must use existing validation functions from `schemas/grammar_exercise.py`
- Must not modify the exercise template files or schema definitions
- Must follow the existing test file structure and naming conventions

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must include docstrings for all test functions and classes
- Must match existing code patterns in `tests/test_grammar_exercise_schema.py`

### Testing Constraints
- Must create tests for all 3 acceptance criteria from issue #35
- Must test all 5 exercise template files
- Must include both positive (valid) and negative (invalid) test cases
- Must achieve 80% coverage for the validation code

### Acceptance Criteria

From GitHub issue #35:
- [ ] All templates pass validation
- [ ] Exercise rendering works
- [ ] Answer checking logic works

---

## Examples

### Input/Output Examples

1. **Example 1: Validate all exercises from directory**
   - Input: Path to `data/grammar/exercises/`
   - Expected Output: Dictionary with all 5 exercises, no validation errors

2. **Example 2: Validate individual exercise file**
   - Input: `data/grammar/exercises/fill-in-the-blank-present-tense.json`
   - Expected Output: FillInTheBlankExercise instance with all fields accessible

3. **Example 3: Verify answer checking for multiple choice**
   - Input: Loaded multiple-choice-etre.json
   - Expected Output: Exercise has correct_answer field with value "suis" and options contains "suis"

4. **Example 4: Verify answer checking for conjugation**
   - Input: Loaded conjugation-parler-nous.json
   - Expected Output: Exercise has correct_answers field (list) with value ["parlons"]

### Edge Cases

- Invalid JSON file should raise ValidationError
- Missing required fields should raise ValidationError
- Empty strings for required fields should raise ValueError
- Multiple choice with correct_answer not in options should raise ValueError
- Conjugation exercise with correct_answer (string) instead of correct_answers (list) should raise ValueError

### Test Cases

```python
# Example test case format for AC1: All templates pass validation
class TestExerciseTemplateValidation:
    """Tests for validating exercise template files."""
    
    def test_ac1_all_templates_pass_validation(self):
        """AC1: All templates pass validation."""
        # Given
        exercise_dir = Path(__file__).parent.parent / "data" / "grammar" / "exercises"
        
        # When
        exercises = load_exercises_from_directory(exercise_dir)
        
        # Then
        assert len(exercises) == 5
        assert all(isinstance(e, Exercise) for e in exercises.values())

# Example test case format for AC2: Exercise rendering works
    def test_ac2_fill_in_blank_rendering(self):
        """AC2: Exercise rendering works for fill-in-the-blank."""
        # Given
        file_path = Path(__file__).parent.parent / "data" / "grammar" / "exercises" / "fill-in-the-blank-present-tense.json"
        
        # When
        exercise = load_exercise_from_file(file_path)
        
        # Then
        assert exercise.id == "fill-in-the-blank-present-tense"
        assert exercise.type == ExerciseType.FILL_IN_THE_BLANK
        assert exercise.prompt == "Je ___ français."
        assert exercise.correct_answer == "parle"
        assert exercise.topic == "Verbs"
        assert exercise.difficulty == DifficultyLevel.BEGINNER

# Example test case format for AC3: Answer checking logic works
    def test_ac3_multiple_choice_answer_checking(self):
        """AC3: Answer checking logic works for multiple choice."""
        # Given
        file_path = Path(__file__).parent.parent / "data" / "grammar" / "exercises" / "multiple-choice-etre.json"
        
        # When
        exercise = load_exercise_from_file(file_path)
        
        # Then
        assert exercise.correct_answer is not None
        assert exercise.correct_answer in exercise.options
        assert len(exercise.options) >= 3
```

---

## Deliverables

### Code Changes
- [ ] New test file: `tests/test_exercise_template_validation.py`

### Tests
- [ ] Test for AC1: All 5 templates pass validation when loaded from directory
- [ ] Individual tests for each of the 5 exercise template files
- [ ] Test for AC2: Exercise rendering works (all fields accessible)
- [ ] Test for AC3: Answer checking logic works (correct answers present and valid)
- [ ] Negative tests for invalid exercise data

### Documentation
- [ ] Docstrings for all test classes and functions
- [ ] Clear assertion messages
- [ ] Follow existing test patterns

---

## Actual Prompt

[This section contains the exact prompt text that was/will be sent to the AI assistant.]

```
IMPLEMENTATION TASK: Create tests for exercise template validation (GitHub issue #35)

CONTEXT:
- We are working on GitHub issue #35: "2.4-T: Validate exercise templates"
- The codebase has exercise schema definitions in schemas/grammar_exercise.py (from issue #34)
- There are 5 exercise template JSON files in data/grammar/exercises/
- Existing tests in tests/test_grammar_exercise_schema.py test the schemas themselves
- This task creates tests specifically for the template files

GOAL:
- Create a new test file: tests/test_exercise_template_validation.py
- Implement tests that verify all 3 acceptance criteria from issue #35:
  1. All templates pass validation
  2. Exercise rendering works
  3. Answer checking logic works

CONSTRAINTS:
- MUST use existing validation functions from schemas.grammar_exercise:
  * load_exercise_from_file()
  * load_exercises_from_directory()
- MUST NOT modify exercise templates or schema definitions
- MUST follow existing test patterns from tests/test_grammar_exercise_schema.py
- MUST include docstrings for all test functions and classes
- MUST use pytest
- MUST achieve 80% test coverage for validation code paths
- MUST test all 5 exercise template files individually and as a group

ACCEPTANCE CRITERIA (from issue #35):
- [ ] All templates pass validation
- [ ] Exercise rendering works
- [ ] Answer checking logic works

EXAMPLES:

Test Case 1 - AC1 (All templates pass validation):
```python
def test_ac1_all_templates_pass_validation():
    exercise_dir = Path(__file__).parent.parent / "data" / "grammar" / "exercises"
    exercises = load_exercises_from_directory(exercise_dir)
    assert len(exercises) == 5
    assert all(isinstance(e, Exercise) for e in exercises.values())
```

Test Case 2 - AC2 (Exercise rendering works):
```python
def test_ac2_fill_in_blank_rendering():
    file_path = Path(__file__).parent.parent / "data" / "grammar" / "exercises" / "fill-in-the-blank-present-tense.json"
    exercise = load_exercise_from_file(file_path)
    assert exercise.id == "fill-in-the-blank-present-tense"
    assert exercise.type == ExerciseType.FILL_IN_THE_BLANK
    assert exercise.prompt == "Je ___ français."
    # ... verify all fields are accessible
```

Test Case 3 - AC3 (Answer checking logic works):
```python
def test_ac3_multiple_choice_has_valid_answers():
    file_path = Path(__file__).parent.parent / "data" / "grammar" / "exercises" / "multiple-choice-etre.json"
    exercise = load_exercise_from_file(file_path)
    assert exercise.correct_answer is not None
    assert exercise.correct_answer in exercise.options
    assert len(exercise.options) >= 3
```

TESTS NEEDED:
- Test AC1: All 5 templates validate successfully
- Test each of the 5 exercise types individually (5 tests)
- Test AC2: Rendering works for each exercise type (verify all fields accessible)
- Test AC3: Answer checking works for each exercise type
- Negative tests: Invalid JSON, missing fields, empty strings, etc.

DELIVERABLES:
- File: tests/test_exercise_template_validation.py
- All acceptance criteria from issue #35 verified
- 80%+ test coverage for exercise validation code
```

---

## AI Response

**Implementation Completed Successfully**

All 33 tests in `tests/test_exercise_template_validation.py` are passing.

**Test Results:**
- 33 tests passed
- 0 tests failed
- Coverage for schemas/grammar_exercise.py: 96% (exceeds 80% requirement)
- All 401 existing tests still pass

**Files Created:**
- `tests/test_exercise_template_validation.py` - Comprehensive test suite for exercise template validation

**Acceptance Criteria Status:**
- ✅ AC1: All templates pass validation - Verified by `test_ac1_all_templates_pass_validation`
- ✅ AC2: Exercise rendering works - Verified by `test_ac2_exercise_rendering_works`
- ✅ AC3: Answer checking logic works - Verified by `test_ac3_answer_checking_logic_works`

**Test Coverage Breakdown:**
- Acceptance Criteria tests: 3 tests
- Individual exercise type tests: 15 tests (3 per exercise type x 5 types)
- Negative validation tests: 11 tests
- Integration tests: 4 tests

---

## Human Review Notes

[To be completed after human review - if applicable]

### Changes Made
- [ ] None - Implementation was straightforward and all tests pass

### Quality Checks
- ✅ Code follows existing patterns from tests/test_grammar_exercise_schema.py
- ✅ Tests pass at 96% coverage (exceeds 80% requirement)
- ✅ All acceptance criteria from issue #35 are met
- ✅ No modifications to existing non-test files
- ✅ All 401 existing tests still pass

### Issues Found
- [ ] None - No issues encountered during implementation

---

## Verification

✅ **VERIFICATION COMPLETE**

- ✅ All acceptance criteria from issue #35 are met
  - AC1: All templates pass validation
  - AC2: Exercise rendering works
  - AC3: Answer checking logic works
- ✅ Tests pass with 96% coverage (exceeds 80% requirement)
- ✅ Code follows project conventions (PEP 8, existing patterns)
- ✅ Documentation is updated (docstrings for all test functions)
- ✅ No breaking changes introduced (all 401 existing tests still pass)
- ⏳ Human review pending

**Branch**: test/issue-35-validate-exercise-templates
**Files Changed**:
- `tests/test_exercise_template_validation.py` (new)
- `spdd/analysis/FLC-028-202606101700-[Analysis]-issue-35-validate-exercise-templates.md` (new)
- `spdd/prompt/FLC-028-202606101715-[Test]-issue-35-validate-exercise-templates.md` (new)

**Ready for PR creation and human review**

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
