# SPDD Prompt: Grammar Practice Exercise Templates

**GitHub Issue**: #34
**Issue Title**: 2.4: Create exercise templates
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/34
**Artifact ID**: FLC-019-202606031300
**Created**: 2026-06-03 13:00
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-019-202606031230-[Analysis]-issue-34-exercise-templates.md`

---

## Context

This prompt drives the implementation of GitHub issue #34: Define JSON schema for grammar practice exercises.

### Current Codebase State
The French Language Coach project has completed Phase 1 (Conversation Practice) and is in Phase 2 (Grammar Mastery). The following are already implemented:
- Grammar lesson schema with Pydantic validation (`schemas/grammar_lesson.py`)
- Grammar reference schema with Pydantic validation (`schemas/grammar_reference.py`)
- 20+ grammar lessons in `data/grammar_lessons/`
- 50+ grammar reference entries in `data/grammar/reference/`
- Existing pattern: JSON data files with Pydantic validation models
- Existing pattern: Helper functions for loading from files and directories

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `schemas/grammar_lesson.py` | Pydantic models for grammar lessons | DifficultyLevel enum, Section model, GrammarLesson model, load_lesson_from_file(), load_lessons_from_directory() |
| `schemas/grammar_reference.py` | Pydantic models for grammar reference entries | GrammarReferenceCategory enum, GrammarReference model, load_reference_from_file(), load_references_from_directory() |
| `data/grammar_lessons/example_lesson.json` | Example lesson file | Shows JSON structure with $schema, id, title, topic, difficulty, sections |
| `data/grammar/reference/*.json` | Reference entry files | Examples of reference data structure |

### Existing Patterns

1. **Enum for controlled vocabularies**: `DifficultyLevel` enum with BEGINNER, INTERMEDIATE, ADVANCED
2. **BaseModel with Field validators**: Use of Pydantic Field with min_length, patterns, descriptions
3. **Custom validators**: `@field_validator` for validating non-empty strings, list items
4. **Helper functions**: `load_*_from_file()` and `load_*_from_directory()` patterns
5. **JSON structure**: Files include metadata (id, title, topic, difficulty) and content
6. **Directory structure**: Data files in `data/{category}/` subdirectories

---

## Goal

**Primary Objective**: Implement JSON schema for grammar practice exercises with Pydantic validation models

**Secondary Objectives**:
- Create example exercises for all 5 exercise types with answer keys
- Create Pydantic validation models following existing patterns
- Create validation tests achieving 80%+ coverage
- Store examples in appropriate directory structure

---

## Constraints

### Architecture Constraints
- Must follow existing schema patterns from `grammar_lesson.py` and `grammar_reference.py`
- Must use Pydantic v2 for validation
- Must support discriminated union for different exercise types
- Must store data files in `data/grammar/exercises/` directory
- Must use existing `DifficultyLevel` enum for difficulty field

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must include docstrings for all public functions and classes
- Must use type hints throughout
- Must validate non-empty strings and lists
- Must handle edge cases (accents, case sensitivity, etc.)

### Testing Constraints
- Must create unit tests for all new functions
- Must test validation of valid and invalid data
- Must test loading from files and directories
- Must achieve 80%+ test coverage for the new module

### Acceptance Criteria
From GitHub issue #34:
- [ ] Template schema defined
- [ ] Example exercises for each type (fill-in-the-blank, multiple choice, translation, conjugation, sentence transformation)
- [ ] Answer key included

---

## Examples

### Input/Output Examples

**Example 1: Fill-in-the-blank exercise**
- File: `data/grammar/exercises/fill-in-the-blank-present-tense.json`
- Content:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "fill-in-the-blank-present-tense",
  "type": "fill-in-the-blank",
  "prompt": "Je ___ français.",
  "correct_answer": "parle",
  "topic": "Verbs",
  "difficulty": "beginner",
  "hint": "Conjugate 'parler' for 'je'"
}
```

**Example 2: Multiple choice exercise**
- File: `data/grammar/exercises/multiple-choice-etre.json`
- Content:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "multiple-choice-etre-je",
  "type": "multiple-choice",
  "prompt": "Quelle est la forme correcte du verbe 'être' pour 'je'?",
  "correct_answer": "suis",
  "options": ["suis", "es", "est", "sont"],
  "topic": "Verbs",
  "difficulty": "beginner"
}
```

**Example 3: Translation exercise**
- File: `data/grammar/exercises/translation-j'aime.json`
- Content:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "translation-j'aime",
  "type": "translation",
  "prompt": "Translate to English: J'aime le fromage",
  "correct_answer": "I like cheese",
  "source_language": "fr",
  "target_language": "en",
  "topic": "Sentence Structure",
  "difficulty": "beginner"
}
```

**Example 4: Conjugation exercise**
- File: `data/grammar/exercises/conjugation-parler-nous.json`
- Content:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "conjugation-parler-nous",
  "type": "conjugation",
  "prompt": "Conjugate 'parler' for 'nous' in present tense",
  "correct_answers": ["parlons"],
  "verb": "parler",
  "tense": "present",
  "pronoun": "nous",
  "topic": "Verbs",
  "difficulty": "beginner"
}
```

**Example 5: Sentence transformation exercise**
- File: `data/grammar/exercises/transformation-negative.json`
- Content:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "transformation-negative",
  "type": "sentence-transformation",
  "prompt": "Rewrite in negative form: Je parle français.",
  "correct_answer": "Je ne parle pas français.",
  "transformation_type": "negative",
  "topic": "Sentence Structure",
  "difficulty": "beginner"
}
```

### Edge Cases
- Multiple correct answers (conjugation): Use `correct_answers: list[str]`
- Case sensitivity: Answers should be case-sensitive ("Parle" vs "parle")
- Accent marks: Preserve and validate French diacritics
- Empty options: Multiple choice must have at least 3 options
- Minimum string lengths: All text fields should have min_length=1

### Test Cases
```python
# Test valid exercise loading
def test_load_valid_fill_in_blank():
    exercise = load_exercise_from_file("data/grammar/exercises/fill-in-the-blank-present-tense.json")
    assert exercise.type == "fill-in-the-blank"
    assert exercise.correct_answer == "parle"

# Test invalid exercise (missing required field)
def test_load_invalid_exercise_missing_type():
    with pytest.raises(ValidationError):
        validate_exercise_data({"prompt": "test", "correct_answer": "test"})

# Test multiple choice validation
def test_multiple_choice_min_options():
    with pytest.raises(ValidationError):
        validate_exercise_data({
            "type": "multiple-choice",
            "prompt": "test",
            "correct_answer": "a",
            "options": ["a", "b"]  # Only 2 options, need at least 3
        })

# Test difficulty validation
def test_invalid_difficulty():
    with pytest.raises(ValidationError):
        validate_exercise_data({
            "type": "fill-in-the-blank",
            "prompt": "test",
            "correct_answer": "test",
            "difficulty": "expert"  # Not in enum
        })
```

---

## Deliverables

### Code Changes
- [ ] `schemas/grammar_exercise.py` - Pydantic models for exercise validation
  - ExerciseType enum
  - ExerciseBase model (common fields)
  - Exercise model (with discriminated union)
  - Type-specific models or validation
  - Helper functions: load_exercise_from_file(), load_exercises_from_directory()

### Data Files
- [ ] `data/grammar/exercises/fill-in-the-blank-present-tense.json` - Example
- [ ] `data/grammar/exercises/multiple-choice-etre.json` - Example
- [ ] `data/grammar/exercises/translation-j'aime.json` - Example
- [ ] `data/grammar/exercises/conjugation-parler-nous.json` - Example
- [ ] `data/grammar/exercises/transformation-negative.json` - Example

### Tests
- [ ] `tests/test_grammar_exercise_schema.py` - Validation tests
  - Test valid exercises for each type
  - Test invalid exercises (missing fields, wrong types, etc.)
  - Test loading from files
  - Test loading from directory
  - Achieve 80%+ coverage

---

## Actual Prompt

This is the exact prompt text to be used for implementation:

```
IMPLEMENT GitHub issue #34: Create exercise templates for grammar practice exercises.

CONTEXT:
- Project: French Language Coach (Phase 2 - Grammar Mastery)
- Existing schemas: grammar_lesson.py, grammar_reference.py in schemas/ directory
- Existing data: data/grammar_lessons/, data/grammar/reference/
- Pattern: Pydantic models with JSON data files, helper functions for loading
- Follow: All existing patterns from grammar_lesson.py and grammar_reference.py

GOAL:
- Create schemas/grammar_exercise.py with Pydantic validation models
- Create data/grammar/exercises/ directory with 5 example exercise JSON files
- Support 5 exercise types: fill-in-the-blank, multiple-choice, translation, conjugation, sentence-transformation
- Include answer keys for all examples
- Create tests achieving 80%+ coverage

CONSTRAINTS:
- Must use existing DifficultyLevel enum from grammar_lesson.py
- Must follow PEP 8 style
- Must include docstrings for all public functions and classes
- Must use Pydantic v2 with Field validators
- Must validate non-empty strings and lists
- Multiple choice must have minimum 3 options (1 correct + 2 distractors)
- Conjugation exercises must support list[str] for correct_answers
- Must create load_exercise_from_file() and load_exercises_from_directory() functions
- Data files must be valid JSON with $schema field

EXAMPLES:

Example 1 - Fill-in-the-blank:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "fill-in-the-blank-present-tense",
  "type": "fill-in-the-blank",
  "prompt": "Je ___ français.",
  "correct_answer": "parle",
  "topic": "Verbs",
  "difficulty": "beginner",
  "hint": "Conjugate 'parler' for 'je'"
}
```

Example 2 - Multiple choice:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "multiple-choice-etre-je",
  "type": "multiple-choice",
  "prompt": "Quelle est la forme correcte du verbe 'être' pour 'je'?",
  "correct_answer": "suis",
  "options": ["suis", "es", "est", "sont"],
  "topic": "Verbs",
  "difficulty": "beginner"
}
```

Example 3 - Translation:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "translation-j'aime",
  "type": "translation",
  "prompt": "Translate to English: J'aime le fromage",
  "correct_answer": "I like cheese",
  "source_language": "fr",
  "target_language": "en",
  "topic": "Sentence Structure",
  "difficulty": "beginner"
}
```

Example 4 - Conjugation:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "conjugation-parler-nous",
  "type": "conjugation",
  "prompt": "Conjugate 'parler' for 'nous' in present tense",
  "correct_answers": ["parlons"],
  "verb": "parler",
  "tense": "present",
  "pronoun": "nous",
  "topic": "Verbs",
  "difficulty": "beginner"
}
```

Example 5 - Sentence transformation:
```json
{
  "$schema": "https://french-language-coach.github.io/schemas/grammar_exercise.json",
  "id": "transformation-negative",
  "type": "sentence-transformation",
  "prompt": "Rewrite in negative form: Je parle français.",
  "correct_answer": "Je ne parle pas français.",
  "transformation_type": "negative",
  "topic": "Sentence Structure",
  "difficulty": "beginner"
}
```

ACCEPTANCE CRITERIA:
- [ ] Template schema defined (Pydantic models in schemas/grammar_exercise.py)
- [ ] Example exercises for each type (5 JSON files in data/grammar/exercises/)
- [ ] Answer key included (correct_answer/correct_answers field in each example)

DELIVERABLES:
1. schemas/grammar_exercise.py - Pydantic models with validation
2. data/grammar/exercises/*.json - 5 example exercise files
3. tests/test_grammar_exercise_schema.py - Validation tests with 80%+ coverage

STRUCTURE REQUIREMENTS:
- schemas/grammar_exercise.py must include:
  - ExerciseType enum with all 5 types
  - ExerciseBase model with common fields (id, type, prompt, topic, difficulty, etc.)
  - Exercise model extending base with type-specific fields
  - Helper functions: load_exercise_from_file(), load_exercises_from_directory()
  - Custom validators for non-empty strings/lists
  - Import DifficultyLevel from grammar_lesson.py

- data/grammar/exercises/ must contain:
  - fill-in-the-blank-present-tense.json
  - multiple-choice-etre.json
  - translation-j'aime.json
  - conjugation-parler-nous.json
  - transformation-negative.json

- tests/test_grammar_exercise_schema.py must include:
  - Tests for valid exercises of each type
  - Tests for invalid exercises (missing fields, wrong types)
  - Tests for loading functions
  - Tests for edge cases (accents, case sensitivity, etc.)
```

---

## AI Response

Implementation completed successfully. All 71 tests pass with 98% coverage on schemas/grammar_exercise.py.

---

## Human Review Notes

### Changes Made
- [x] Fixed ID pattern in translation-j'aime.json to translation-j-aime.json (apostrophe not allowed in pattern)
- [x] Updated test file to use corrected filename
- [x] All changes committed to feature/issue-34-exercise-templates branch

### Quality Checks
- [x] Code follows existing patterns from grammar_lesson.py and grammar_reference.py
- [x] Tests pass with 98% coverage (exceeds 80% requirement)
- [x] Documentation (docstrings) updated for all public functions and classes
- [x] All acceptance criteria met
  - AC1: Template schema defined in schemas/grammar_exercise.py
  - AC2: Example exercises for each type created in data/grammar/exercises/
  - AC3: Answer key included in all example exercises

### Issues Found
- Issue with apostrophe in filename (translation-j'aime.json) - resolved by renaming to translation-j-aime.json
- All other edge cases covered in comprehensive test suite

---

## Verification

- [x] All acceptance criteria from issue #34 are met
- [x] Template schema defined (schemas/grammar_exercise.py)
- [x] Example exercises for each type created (5 files in data/grammar/exercises/)
- [x] Answer key included in all examples (correct_answer/correct_answers fields)
- [x] Tests pass with 98% coverage (exceeds 80% requirement)
- [x] Code follows project conventions (PEP 8, Pydantic patterns)
- [x] Documentation is complete (docstrings for all public functions/classes)
- [x] All 262 project tests pass (no regressions)

---

*Prompt based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
