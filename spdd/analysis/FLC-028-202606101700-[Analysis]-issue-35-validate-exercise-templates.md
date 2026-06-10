# SPDD Analysis: Validate Exercise Templates

**GitHub Issue**: #35
**Issue Title**: 2.4-T: Validate exercise templates
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/35
**Artifact ID**: FLC-028-202606101700
**Created**: 2026-06-10 17:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Tests for exercise template validation.

## Acceptance Criteria (from GitHub Issue #35)

- [ ] All templates pass validation
- [ ] Exercise rendering works
- [ ] Answer checking logic works

---

## Background

This task is part of Phase 2, Milestone 2.4 (Testing). Issue #34 created the grammar exercise schema definitions and example exercise templates for all 5 exercise types. Issue #35 is the corresponding test task to validate that:

1. All exercise template files conform to their respective schemas
2. The exercises can be properly loaded and rendered
3. The answer checking logic is correctly configured

This ensures that the exercise templates created in issue #34 are valid and functional before they are used in production.

---

## Business Value

- Ensures data quality for exercise templates
- Validates that the schema definitions correctly enforce business rules
- Provides regression protection for exercise template changes
- Supports 80% test coverage requirement for the project

---

## Scope In

- [ ] Create tests to validate all 5 exercise template JSON files against their schemas
- [ ] Create tests to verify exercise rendering functionality
- [ ] Create tests to verify answer checking logic
- [ ] Ensure tests achieve 80% coverage for the exercise validation code path

## Scope Out

- [ ] Modifying the exercise templates themselves (they were created in issue #34)
- [ ] Modifying the schema definitions (they were created in issue #34)
- [ ] Testing the grammar router endpoints (that's issue #36)
- [ ] Frontend rendering of exercises (that's a separate frontend task)

---

## Acceptance Criteria (ACs)

1. **AC1: All templates pass validation**
   **Given** All 5 exercise template files in data/grammar/exercises/
   **When** Loaded through the validation functions
   **Then** All templates validate successfully without errors

2. **AC2: Exercise rendering works**
   **Given** Validated exercise data
   **When** Accessing exercise fields (id, type, prompt, etc.)
   **Then** All required fields are present and accessible

3. **AC3: Answer checking logic works**
   **Given** Validated exercise data
   **When** Checking for correct_answer or correct_answers fields
   **Then** At least one answer field is present and contains valid data

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Exercise Schema Models** (`schemas/grammar_exercise.py`): Pydantic models defining the structure for all 5 exercise types (FillInTheBlankExercise, MultipleChoiceExercise, TranslationExerciseModel, ConjugationExerciseModel, SentenceTransformationExerciseModel)
  - Location: `schemas/grammar_exercise.py`
  - Key Functions: `validate_exercise_data()`, `load_exercise_from_file()`, `load_exercises_from_directory()`

- **Exercise Type Enum** (`ExerciseType`): Defines the 5 supported exercise types as string literals
  - Values: `FILL_IN_THE_BLANK`, `MULTIPLE_CHOICE`, `TRANSLATION`, `CONJUGATION`, `SENTENCE_TRANSFORMATION`

- **Exercise Template Files**: JSON files in `data/grammar/exercises/` that contain the actual exercise content
  - fill-in-the-blank-present-tense.json
  - multiple-choice-etre.json
  - translation-j-aime.json
  - conjugation-parler-nous.json
  - transformation-negative.json

- **Exercise Base Model** (`ExerciseBase`): Contains common fields for all exercise types
  - Fields: id, type, prompt, correct_answer, correct_answers, topic, difficulty, hint
  - Validators: Ensures at least one answer field is provided, strings are non-empty

### New Concepts Required

- **Test Suite for Template Validation**: A comprehensive test file that validates all exercise templates

### Key Business Rules

- All exercise templates must conform to their respective Pydantic schemas
- Every exercise must have at least one answer field (correct_answer or correct_answers)
- String fields must contain non-whitespace characters
- Exercise IDs must be lowercase alphanumeric with hyphens only
- Multiple choice exercises must have at least 3 options
- Conjugation exercises must use correct_answers (list) not correct_answer (string)
- The correct_answer for multiple choice must be in the options list

---

## Strategic Approach

### Solution Direction

1. **Leverage existing validation functions**: Use the `load_exercise_from_file()` and `load_exercises_from_directory()` functions from `schemas/grammar_exercise.py` to validate the template files
2. **Test all 5 exercise types**: Create tests that specifically target each of the 5 exercise template files
3. **Verify answer checking**: Test that each exercise has the appropriate answer field(s) configured correctly
4. **Test rendering**: Verify that all required fields can be accessed after validation

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Use existing validation functions vs. custom validation | Using existing functions ensures consistency with production code; custom validation would be redundant | Use existing validation functions from schemas/grammar_exercise.py |
| Test each file individually vs. test all at once | Individual tests provide better error isolation; batch testing is more efficient | Test both: individual tests for each file, plus a batch test for the directory |
| Test only valid cases vs. include invalid cases | Invalid cases help verify validation logic; but AC only requires validating existing templates | Include both: validate existing templates (AC requirement) and add negative tests for validation logic |

### Alternatives Considered

- **Alternative 1**: Create a single monolithic test function - Rejected because individual test functions provide better error messages and isolation
- **Alternative 2**: Only test the happy path - Rejected because we should also verify that invalid data is properly rejected
- **Alternative 3**: Test frontend rendering - Rejected because this is a backend test task (labeled with "backend" and "test")

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Exercise rendering works" | Does this mean backend model rendering or frontend display? | For this backend test, interpret as "exercise data can be properly loaded and all fields are accessible" |
| "Answer checking logic works" | Does this mean testing the checking algorithm or just that answers are present? | Interpret as "each exercise has valid answer fields configured" |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Missing type field in template | Validation should fail with clear error | pydantic.ValidationError with message about missing 'type' field |
| Invalid exercise type | Validation should fail with list of valid types | ValueError with valid types listed |
| Empty string for required fields | Validation should fail | ValueError about non-empty strings |
| Multiple choice with correct_answer not in options | Validation should fail | ValueError about correct answer not in options |
| Conjugation exercise with correct_answer instead of correct_answers | Validation should fail | ValueError about conjugation requiring correct_answers |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Tests may not cover all validation paths | Insufficient test coverage | Review coverage report and add tests for any missing paths |
| Schema changes could break tests | Test fragility | Use the actual validation functions, not hardcoded expectations |
| Exercise template files might change | Test fragility | Tests validate against schema, not specific file content |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | All templates pass validation | Yes | Will use load_exercises_from_directory to validate all files |
| AC2 | Exercise rendering works | Yes | Will verify all fields are accessible after validation |
| AC3 | Answer checking logic works | Yes | Will verify correct_answer/correct_answers fields are present and valid |

**AC Coverage Summary**: All 3 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Tests should follow existing pytest patterns in the codebase
- Tests should achieve 80% coverage for the exercise validation code
- Tests should be maintainable and not brittle

---

## REASONS Canvas

### Requirements
From GitHub issue #35 acceptance criteria:
- All templates pass validation
- Exercise rendering works
- Answer checking logic works

### Examples
Concrete test cases:
1. Load fill-in-the-blank-present-tense.json → Should validate as FillInTheBlankExercise
2. Load multiple-choice-etre.json → Should validate as MultipleChoiceExercise with options containing correct_answer
3. Load translation-j-aime.json → Should validate as TranslationExerciseModel with source/target languages
4. Load conjugation-parler-nous.json → Should validate as ConjugationExerciseModel with verb, tense, pronoun
5. Load transformation-negative.json → Should validate as SentenceTransformationExerciseModel with transformation_type
6. Load all exercises from directory → Should return dict with all 5 exercises
7. Try to load invalid JSON → Should raise ValidationError

### Architecture
Existing codebase structure:
- **schemas/grammar_exercise.py**: Contains all Pydantic models and validation functions
- **data/grammar/exercises/**: Contains the 5 exercise template JSON files
- **tests/**: Contains existing test files following pytest conventions

Patterns to follow:
- Use pytest fixtures for test data
- Test both happy path and error cases
- Organize tests by class/method under test
- Use descriptive test names
- Include docstrings for test functions

### Standards
- **Coding**: PEP 8, match existing test patterns in codebase
- **Testing**: 80% coverage minimum, use pytest, test edge cases
- **Documentation**: Docstrings for test functions, clear assertion messages
- **Code Review**: Follow SPDD methodology (this analysis and prompt artifacts)

### Omissions
Explicitly out-of-scope:
- Modifying exercise templates
- Modifying schema definitions
- Testing frontend rendering
- Testing router endpoints
- Creating new exercise types

### Notes
Implementation hints:
- The `load_exercises_from_directory()` function already exists and can validate all files at once
- Each exercise type has its own Pydantic model with custom validators
- The Exercise union type handles dispatching to the correct model based on 'type' field
- Existing test file `tests/test_grammar_exercise_schema.py` has similar tests for issue #34

### Solutions
Reference implementations to mimic:
- `tests/test_grammar_exercise_schema.py`: Has tests for schema validation
- `tests/test_grammar_lesson_schema.py`: Has similar structure for lesson validation
- `schemas/grammar_exercise.py`: Has the validation functions to use

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
