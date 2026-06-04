# SPDD Prompt: Grammar Lesson JSON Schema Implementation

**GitHub Issue**: #28
**Issue Title**: 2.1: Create grammar lesson JSON schema
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/28
**Artifact ID**: FLC-017-202606021230
**Created**: 2026-06-02 12:30
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-017-202606021200-[Analysis]-issue-28-grammar-lesson-schema.md`

---

## Context

### Current Codebase State

The French Language Coach application is currently in Phase 1 (Conversation Foundation - Complete) and moving to Phase 2 (Grammar Mastery). The existing codebase has:
- **Backend**: FastAPI with Python 3.x, SQLAlchemy ORM, async support
- **Frontend**: React 19 with TypeScript, Vite build tool
- **Schemas**: Pydantic models in `schemas/session.py` for session and feedback data
- **Static Data**: `scenarios.py` with conversation scenarios as Python dictionaries
- **Testing**: pytest for backend, vitest for frontend, 80% coverage requirement

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `schemas/session.py` | Pydantic models for session data | BaseModel classes: Message, SessionCreate, SessionResponse, SessionSummary, FeedbackResponse |
| `schemas/__init__.py` | Schema module exports | Exports from session.py |
| `scenarios.py` | Static conversation scenario data | Dictionary with id, title, system_prompt, difficulty_levels |
| `tests/test_schemas.py` | Tests for Pydantic schemas | Tests for SessionCreate, Message validation |
| `requirements.txt` | Backend dependencies | Currently includes fastapi, pydantic, sqlalchemy, etc. |

### Existing Patterns

1. **Pydantic Model Pattern**: All API schemas use Pydantic BaseModel with type hints and Field descriptors
2. **Naming Convention**: snake_case for Python files and variables, PascalCase for class names
3. **Type Hints**: All function parameters and return types are typed
4. **Docstrings**: Public functions and classes have docstrings
5. **Testing**: Each schema has corresponding tests in tests/ directory

### Current Schema Pattern (from schemas/session.py)

```python
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class SessionCreate(BaseModel):
    scenario_id: str
    difficulty: Optional[str] = Field(
        default="intermediate",
        description="Difficulty level for the scenario: beginner, intermediate, or advanced"
    )


class FeedbackResponse(BaseModel):
    grammar_score: int
    vocabulary_score: int
    fluency_score: int
    overall_score: int
    strengths: list[str]
    focus_area: str
    example_corrections: list[dict[str, str]]
```

---

## Goal

**Primary Objective**: Create a JSON schema definition and Python validation for grammar lesson data structure.

**Secondary Objectives**:
- Create JSON Schema (draft-07) file at `schemas/grammar_lesson.json`
- Create Pydantic model at `schemas/grammar_lesson.py` for Python validation
- Create validation script at `scripts/validate_grammar_lessons.py`
- Create example lesson data file at `data/grammar_lessons/example_lesson.json`
- Create comprehensive tests at `tests/test_grammar_lesson_schema.py`

---

## Constraints

### Architecture Constraints
- [ ] **Follow existing patterns**: Must match existing codebase conventions (Pydantic models, schema structure)
- [ ] **Backward compatible**: Schema should allow for future extensions without breaking existing data
- [ ] **Static data first**: Focus on static JSON file validation, not database models
- [ ] **Consistent with scenarios.py**: Use same difficulty levels (beginner, intermediate, advanced)

### Code Quality Constraints
- [ ] **PEP 8 compliance**: Follow Python style guide
- [ ] **Type hints**: All functions and variables must have type hints
- [ ] **Docstrings**: All public functions and classes must have docstrings
- [ ] **Error handling**: Provide clear, actionable error messages
- [ ] **File organization**: Follow existing directory structure

### Testing Constraints
- [ ] **80% coverage minimum**: All new code must have at least 80% test coverage
- [ ] **pytest**: Use pytest framework for backend tests
- [ ] **Test validation**: Test both valid and invalid lesson data
- [ ] **Edge cases**: Test all edge cases identified in analysis (empty fields, missing fields, invalid types, etc.)

### Acceptance Criteria

From GitHub issue #28:
1. **AC1**: Schema defined for lesson structure with: id, title, topic, difficulty, sections[]
2. **AC2**: Sections include: title, content, examples[]
3. **AC3**: Validation script created

---

## Examples

### Input/Output Examples

**Example 1: Valid Grammar Lesson (JSON)**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "id": "present-tense",
  "title": "The Present Tense in French",
  "topic": "Verbs",
  "difficulty": "beginner",
  "sections": [
    {
      "title": "Regular -ER Verbs",
      "content": "Most French verbs ending in -er follow a regular conjugation pattern. These verbs add specific endings to the verb stem based on the subject pronoun.",
      "examples": [
        "Je mange (I eat)",
        "Tu manges (You eat)",
        "Il/Elle/On mange (He/She/One eats)"
      ]
    },
    {
      "title": "Conjugation Table",
      "content": "Here is the full conjugation for 'manger' (to eat):",
      "examples": []
    }
  ]
}
```

**Example 2: Valid Grammar Lesson (Minimum Required Fields)**
```json
{
  "id": "article-basics",
  "title": "French Articles",
  "topic": "Nouns",
  "difficulty": "beginner",
  "sections": [
    {
      "title": "Definite Articles",
      "content": "The definite articles in French are: le, la, les."
    }
  ]
}
```

**Example 3: Invalid Lesson (Missing Required Fields)**
```json
{
  "id": "present-tense",
  "title": "The Present Tense in French"
}
```
Expected validation errors:
- Missing required fields: topic, difficulty, sections

**Example 4: Invalid Lesson (Invalid Difficulty)**
```json
{
  "id": "present-tense",
  "title": "The Present Tense in French",
  "topic": "Verbs",
  "difficulty": "expert",
  "sections": [{"title": "Test", "content": "Test"}]
}
```
Expected validation errors:
- Invalid difficulty: must be one of ["beginner", "intermediate", "advanced"]

**Example 5: Invalid Lesson (Empty Sections Array)**
```json
{
  "id": "present-tense",
  "title": "The Present Tense in French",
  "topic": "Verbs",
  "difficulty": "beginner",
  "sections": []
}
```
Expected validation errors:
- sections array must have at least one item

**Example 6: Invalid Lesson (Section Missing Title)**
```json
{
  "id": "present-tense",
  "title": "The Present Tense in French",
  "topic": "Verbs",
  "difficulty": "beginner",
  "sections": [
    {
      "content": "This section has no title"
    }
  ]
}
```
Expected validation errors:
- Each section must have a title field

### Test Cases

```python
# tests/test_grammar_lesson_schema.py

import pytest
from pydantic import ValidationError
from schemas.grammar_lesson import GrammarLesson, Section


def test_valid_grammar_lesson():
    """Test that a valid grammar lesson passes validation."""
    lesson_data = {
        "id": "present-tense",
        "title": "The Present Tense in French",
        "topic": "Verbs",
        "difficulty": "beginner",
        "sections": [
            {
                "title": "Regular -ER Verbs",
                "content": "Most French verbs ending in -er follow a regular pattern.",
                "examples": ["Je mange", "Tu manges"]
            }
        ]
    }
    lesson = GrammarLesson(**lesson_data)
    assert lesson.id == "present-tense"
    assert lesson.difficulty == "beginner"
    assert len(lesson.sections) == 1


def test_missing_required_fields():
    """Test that missing required fields raise ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        GrammarLesson(id="test", title="Test")
    
    errors = exc_info.value.errors()
    error_fields = {error['loc'][-1] for error in errors}
    assert "topic" in error_fields
    assert "difficulty" in error_fields
    assert "sections" in error_fields


def test_invalid_difficulty():
    """Test that invalid difficulty raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        GrammarLesson(
            id="test",
            title="Test",
            topic="Test",
            difficulty="expert",
            sections=[{"title": "Test", "content": "Test"}]
        )
    
    errors = exc_info.value.errors()
    assert any("difficulty" in error['loc'] for error in errors)


def test_empty_sections():
    """Test that empty sections array raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        GrammarLesson(
            id="test",
            title="Test",
            topic="Test",
            difficulty="beginner",
            sections=[]
        )
    
    errors = exc_info.value.errors()
    assert any("sections" in error['loc'] for error in errors)


def test_section_missing_title():
    """Test that section without title raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        GrammarLesson(
            id="test",
            title="Test",
            topic="Test",
            difficulty="beginner",
            sections=[{"content": "Test"}]
        )
    
    errors = exc_info.value.errors()
    assert any("sections" in error['loc'] and "title" in error['loc'] for error in errors)


def test_empty_string_fields():
    """Test that empty string fields raise ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        GrammarLesson(
            id="",
            title="",
            topic="",
            difficulty="beginner",
            sections=[{"title": "", "content": ""}]
        )
    
    errors = exc_info.value.errors()
    # All required string fields should have non-empty values
    assert len(errors) > 0
```

---

## Deliverables

### Code Changes

1. **`schemas/grammar_lesson.json`** - JSON Schema (draft-07) definition
   - Define schema with all required fields
   - Include descriptions for each property
   - Use enum for difficulty values
   - Use definitions for reusable section schema
   - Include $schema version field

2. **`schemas/grammar_lesson.py`** - Python Pydantic model and validation
   - GrammarLesson BaseModel with all required fields
   - Section BaseModel for nested section structure
   - DifficultyLevel Enum for valid difficulty values
   - Custom validators for non-empty strings
   - Helper functions for loading and validating lessons

3. **`scripts/validate_grammar_lessons.py`** - Standalone validation script
   - Function to validate a single lesson JSON file
   - Function to validate all lessons in a directory
   - Clear error reporting with file paths and line numbers
   - Return exit code for CI/CD integration

4. **`data/grammar_lessons/example_lesson.json`** - Example lesson data
   - Valid example demonstrating all schema features
   - Used for testing and documentation

5. **`tests/test_grammar_lesson_schema.py`** - Comprehensive test suite
   - Tests for valid lessons
   - Tests for all validation error cases
   - Tests for edge cases
   - 80%+ coverage

### Documentation Updates

- [ ] Update `schemas/__init__.py` to export new models
- [ ] Update `README.md` with new schema information (if significant)

### Files to Modify

- `schemas/__init__.py` - Add exports for new models
- `requirements.txt` - Add jsonschema dependency if needed

### Files to Create

- `schemas/grammar_lesson.json`
- `schemas/grammar_lesson.py`
- `scripts/validate_grammar_lessons.py`
- `data/grammar_lessons/example_lesson.json`
- `tests/test_grammar_lesson_schema.py`

---

## Actual Prompt

```
Please implement the grammar lesson JSON schema as described in GitHub issue #28 and the analysis document.

CONTEXT:
- This is for the French Language Coach project (Phase 2 - Grammar Mastery)
- Existing schemas are in schemas/session.py using Pydantic BaseModel
- Need to create both JSON Schema (draft-07) and Python Pydantic models
- Must follow existing codebase patterns
- Static lesson data will be stored as JSON files

GOAL:
- Create JSON schema definition at schemas/grammar_lesson.json
- Create Pydantic model at schemas/grammar_lesson.py
- Create validation script at scripts/validate_grammar_lessons.py
- Create example lesson at data/grammar_lessons/example_lesson.json
- Create tests at tests/test_grammar_lesson_schema.py

CONSTRAINTS:
- Must follow PEP 8 style
- Must include type hints for all functions
- Must include docstrings for public functions and classes
- Must have 80%+ test coverage
- Must validate all acceptance criteria from issue #28:
  * Schema includes: id, title, topic, difficulty, sections[]
  * Sections include: title, content, examples[]
  * Validation script created
- Difficulty must be one of: "beginner", "intermediate", "advanced"
- All string fields must be non-empty (strip whitespace and check length)
- Sections array must have at least one item
- Each section must have title and content (examples is optional)

EXAMPLES:
Valid lesson:
{
  "id": "present-tense",
  "title": "The Present Tense in French",
  "topic": "Verbs",
  "difficulty": "beginner",
  "sections": [{"title": "ER Verbs", "content": "Content here", "examples": ["example 1"]}]
}

Invalid lesson (missing fields):
{
  "id": "test",
  "title": "Test"
}
// Should fail: missing topic, difficulty, sections

Invalid lesson (invalid difficulty):
{
  "id": "test",
  "title": "Test",
  "topic": "Test",
  "difficulty": "expert",
  "sections": [{"title": "Test", "content": "Test"}]
}
// Should fail: difficulty must be beginner, intermediate, or advanced

Invalid lesson (empty sections):
{
  "id": "test",
  "title": "Test",
  "topic": "Test",
  "difficulty": "beginner",
  "sections": []
}
// Should fail: must have at least one section

DELIVERABLES:
1. schemas/grammar_lesson.json - JSON Schema definition
2. schemas/grammar_lesson.py - Pydantic model with validation
3. scripts/validate_grammar_lessons.py - Validation script
4. data/grammar_lessons/example_lesson.json - Example valid lesson
5. tests/test_grammar_lesson_schema.py - Comprehensive tests
6. Update schemas/__init__.py to export new models
7. Update requirements.txt if jsonschema library needed

Please create all files with proper error handling, documentation, and tests.
```

---

## AI Response

[AI-generated content will be captured here after implementation]

---

## Human Review Notes

[To be filled after implementation]

### Changes Made
- [ ] 

### Quality Checks
- [ ] All acceptance criteria from issue #28 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is complete (docstrings, etc.)
- [ ] No breaking changes introduced
- [ ] Human review completed

### Issues Found
- [ ] 

---

## Verification

- [ ] All acceptance criteria from issue #28 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
