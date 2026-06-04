# SPDD Prompt: Author 20 Core Grammar Lessons

**GitHub Issue**: #30
**Issue Title**: 2.2: Author 20 core grammar lessons
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/30
**Artifact ID**: FLC-017-202606022345
**Created**: 2026-06-02 23:45
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: spdd/analysis/FLC-017-202606022334-[Analysis]-issue-30-grammar-lessons.md

---

## Context

### Current Codebase State

The French Language Coach project has completed Phase 1 (Conversation Practice) and is now entering Phase 2 (Grammar Mastery). The codebase currently has:

- **Backend**: FastAPI with async SQLAlchemy, SQLite database
- **Frontend**: React 19 SPA with TypeScript, Vite, React Router
- **Schemas**: Pydantic models in schemas/ directory (currently only session.py)
- **Models**: SQLAlchemy async models in models/ directory
- **Tests**: pytest for backend, jest for frontend
- **No existing grammar lesson infrastructure**

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `schemas/session.py` | Pydantic models for session data | BaseModel usage, FeedbackResponse with grammar_score |
| `schemas/__init__.py` | Schema exports | Empty currently |
| `models/` | SQLAlchemy models | Session, Message, etc. |
| `tests/test_sessions_listing.py` | Session listing tests | Test patterns, fixtures |

### Existing Patterns

- **Pydantic Models**: Used for request/response validation (schemas/session.py)
- **Naming Conventions**: snake_case for Python files, kebab-case for directories
- **File Encoding**: UTF-8 (critical for French characters with accents)
- **Test Structure**: Tests in tests/ directory, using pytest
- **Type Hints**: Extensive use of Python type hints

---

## Goal

**Primary Objective**: Create 20 grammar lesson JSON files in data/grammar/lessons/ directory that pass schema validation, covering the essential French grammar topics listed in issue #30.

**Secondary Objectives**:
- Create a Pydantic schema for lesson validation in schemas/lesson.py
- Create tests to verify all lessons pass validation
- Ensure 80%+ test coverage for new code
- Follow existing codebase patterns and conventions

---

## Constraints

### Architecture Constraints

- Must follow existing project architecture patterns
- Must use Pydantic for schema validation (matching schemas/session.py)
- Must store lessons as JSON files in data/grammar/lessons/
- Must not introduce breaking changes to existing code

### Code Quality Constraints

- Must follow PEP 8 style guide
- Must include docstrings for public classes and functions
- Must use type hints consistently
- Must maintain UTF-8 encoding for French characters

### Testing Constraints

- Must create unit tests for schema validation
- Must test all 20 lessons pass validation
- Must achieve 80%+ test coverage for new code
- Must follow existing test patterns from tests/ directory

### Acceptance Criteria

From GitHub issue #30:
1. 20 lessons in data/grammar/lessons/
2. Each lesson has clear explanation
3. Each lesson has examples
4. All lessons pass schema validation

---

## Examples

### Input/Output Examples

**Example 1: Valid Lesson File**
- Input: JSON file with all required fields
- Expected Output: Passes Pydantic validation

```json
{
  "id": "present-tense-regular",
  "title": "Present Tense: Regular -ER Verbs",
  "topic": "Present tense",
  "category": "Verb tenses",
  "difficulty": "beginner",
  "explanation": "In French, regular -ER verbs follow a predictable conjugation pattern in the present tense. The endings are: -e, -es, -e, -ons, -ez, -ent for je, tu, il/elle/on, nous, vous, ils/elles respectively.",
  "examples": [
    {
      "french": "Je parle français.",
      "english": "I speak French.",
      "explanation": "Parler (to speak) is a regular -ER verb. The je form ends in -e."
    },
    {
      "french": "Tu manges une pomme.",
      "english": "You eat an apple.",
      "explanation": "Manger (to eat) conjugated for tu ends in -es."
    }
  ],
  "tags": ["verb", "conjugation", "present", "er-verb"]
}
```

**Example 2: Schema Validation**
```python
from schemas.lesson import GrammarLesson
import json
import glob

# Test all lessons pass validation
lesson_files = glob.glob('data/grammar/lessons/*.json')
assert len(lesson_files) == 20  # AC1

for file in lesson_files:
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    lesson = GrammarLesson(**data)  # AC4: Should not raise ValidationError
    assert len(lesson.explanation) > 0  # AC2
    assert len(lesson.examples) > 0  # AC3
```

### Edge Cases

1. **French Special Characters**: Lessons contain é, è, ê, ç, à, ù, etc.
   - Expected: UTF-8 encoding handles these correctly

2. **Missing Required Field**: A lesson JSON is missing the "explanation" field
   - Expected: Pydantic raises ValidationError with clear message

3. **Invalid JSON Syntax**: A lesson file has malformed JSON
   - Expected: json.load() raises JSONDecodeError with clear message

4. **Duplicate Lesson IDs**: Two lessons have the same id
   - Expected: Validation test should detect and fail

### Test Cases

```python
# tests/test_grammar_lessons.py
import pytest
import json
import glob
from schemas.lesson import GrammarLesson
from pydantic import ValidationError


def test_lesson_schema_validation():
    """Test that the GrammarLesson schema validates correctly."""
    valid_data = {
        "id": "test-lesson",
        "title": "Test Lesson",
        "topic": "Test Topic",
        "category": "Test Category",
        "difficulty": "beginner",
        "explanation": "This is a test explanation.",
        "examples": [{"french": "Test", "english": "Test", "explanation": "Test"}]
    }
    lesson = GrammarLesson(**valid_data)
    assert lesson.id == "test-lesson"
    assert lesson.title == "Test Lesson"


def test_lesson_missing_required_field():
    """Test that missing required fields raise ValidationError."""
    invalid_data = {
        "id": "test-lesson",
        "title": "Test Lesson"
        # Missing topic, category, difficulty, explanation, examples
    }
    with pytest.raises(ValidationError):
        GrammarLesson(**invalid_data)


def test_all_lessons_exist_and_valid():
    """Test that all 20 lessons exist and pass validation."""
    lesson_files = glob.glob('data/grammar/lessons/*.json')
    assert len(lesson_files) == 20
    
    for file in lesson_files:
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Should not raise
        lesson = GrammarLesson(**data)
        
        # AC2: Each lesson has explanation
        assert len(lesson.explanation) > 0
        
        # AC3: Each lesson has examples
        assert len(lesson.examples) > 0
```

---

## Deliverables

### Code Changes

- [ ] `schemas/lesson.py` - New file with GrammarLesson and Example Pydantic models
- [ ] `schemas/__init__.py` - Update to export new schema classes
- [ ] `data/grammar/lessons/` - New directory containing 20 JSON lesson files
- [ ] `tests/test_grammar_lessons.py` - New test file with validation tests

### Tests

- [ ] Unit tests for GrammarLesson schema
- [ ] Tests for all 20 lessons passing validation
- [ ] Tests for required fields
- [ ] Tests for French character encoding
- [ ] Edge case tests (missing fields, invalid data)

### Documentation

- [ ] Docstrings for GrammarLesson and Example classes
- [ ] Update README.md if grammar lesson structure needs documentation
- [ ] Comments in schema file explaining field purposes

---

## Actual Prompt

This is the exact prompt text that will be used to drive implementation:

```
IMPLEMENT GITHUB ISSUE #30: Author 20 core grammar lessons

CONTEXT:
- French Language Coach project, Phase 2 (Grammar Mastery)
- Current codebase: FastAPI backend, React frontend, Pydantic schemas, SQLite database
- Existing patterns: Pydantic models in schemas/, JSON data files, pytest tests
- Target: B1-B2 level intermediate French learners
- Reference: schemas/session.py for Pydantic model patterns

GOAL:
- Create schemas/lesson.py with GrammarLesson Pydantic model
- Create data/grammar/lessons/ directory with 20 JSON lesson files
- Create tests/test_grammar_lessons.py with validation tests
- Ensure all lessons pass schema validation
- Achieve 80%+ test coverage for new code

CONSTRAINTS:
- Must use Pydantic BaseModel for schema (match existing patterns)
- Must use UTF-8 encoding for French characters
- Must follow PEP 8 style
- Must include docstrings for public classes
- Must use type hints
- Must not break existing code
- 80%+ test coverage required

EXAMPLES:

Lesson Schema (schemas/lesson.py):
```python
from pydantic import BaseModel, Field
from typing import List

class Example(BaseModel):
    """A single example demonstrating a grammar concept."""
    french: str = Field(..., description="French text example")
    english: str = Field(..., description="English translation")
    explanation: str = Field(..., description="Explanation of the example")

class GrammarLesson(BaseModel):
    """A grammar lesson covering a specific French grammar topic."""
    id: str = Field(..., description="Unique identifier for the lesson (kebab-case)")
    title: str = Field(..., description="Human-readable title")
    topic: str = Field(..., description="The grammar topic (e.g., 'Present tense')")
    category: str = Field(..., description="Category (e.g., 'Verb tenses', 'Pronouns', 'Agreement')")
    difficulty: str = Field(..., description="Difficulty level: beginner, intermediate, or advanced")
    explanation: str = Field(..., description="Clear explanation of the grammar concept")
    examples: List[Example] = Field(..., description="List of examples demonstrating the concept", min_length=1)
    tags: List[str] = Field(default_factory=list, description="Tags for filtering and search")
```

Lesson File Example (data/grammar/lessons/present-tense-regular.json):
```json
{
  "id": "present-tense-regular-er",
  "title": "Present Tense: Regular -ER Verbs",
  "topic": "Present tense",
  "category": "Verb tenses",
  "difficulty": "beginner",
  "explanation": "In French, regular -ER verbs follow a predictable conjugation pattern...",
  "examples": [
    {"french": "Je parle.", "english": "I speak.", "explanation": "..."},
    {"french": "Tu manges.", "english": "You eat.", "explanation": "..."}
  ],
  "tags": ["verb", "conjugation", "present", "er-verb"]
}
```

Test File Example (tests/test_grammar_lessons.py):
```python
import pytest
import json
import glob
from schemas.lesson import GrammarLesson
from pydantic import ValidationError

def test_all_lessons_valid():
    lesson_files = glob.glob('data/grammar/lessons/*.json')
    assert len(lesson_files) == 20
    for file in lesson_files:
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        lesson = GrammarLesson(**data)
        assert len(lesson.explanation) > 0
        assert len(lesson.examples) > 0
```

20 Lessons to Create (topics from issue #30):
1. present-tense-regular-er.json - Present tense: Regular -ER verbs
2. present-tense-regular-ir.json - Present tense: Regular -IR verbs
3. present-tense-regular-re.json - Present tense: Regular -RE verbs
4. present-tense-irregular.json - Present tense: Irregular verbs (être, avoir, aller, faire)
5. passe-compose.json - Past tense: Passé composé
6. imparfait.json - Past tense: Imparfait
7. plus-que-parfait.json - Past tense: Plus-que-parfait
8. future-simple.json - Future tense: Simple future
9. future-proche.json - Future tense: Near future (aller + infinitive)
10. gender-agreement.json - Gender and number agreement
11. articles.json - Articles (definite, indefinite, partitive)
12. subject-pronouns.json - Subject pronouns
13. object-pronouns-direct.json - Object pronouns: Direct
14. object-pronouns-indirect.json - Object pronouns: Indirect
15. relative-pronouns.json - Relative pronouns
16. negation.json - Negation
17. questions-inversion.json - Questions: Inversion
18. questions-est-ce-que.json - Questions: Est-ce que
19. questions-words.json - Questions: Question words
20. subjunctive.json - Subjunctive mood

Wait - I need exactly 20 lessons. Let me recount the original topics:
- Present tense (regular and irregular verbs) -> 2 lessons
- Past tenses (passé composé, imparfait, plus-que-parfait) -> 3 lessons
- Future tense (simple and near future) -> 2 lessons
- Gender and number agreement -> 1 lesson
- Articles (definite, indefinite, partitive) -> 1 lesson
- Pronouns (subject, object, relative) -> 3 lessons (subject, object=2, relative)
- Negation -> 1 lesson
- Questions (inversion, est-ce que, question words) -> 3 lessons
- Subjunctive mood -> 1 lesson
- Conditional mood -> 1 lesson
- Imperative -> 1 lesson
- Prepositions -> 1 lesson
- Conjunctions -> 1 lesson
- Adjectives and adverbs -> 1 lesson

That's 2+3+2+1+1+3+1+3+1+1+1+1+1+1 = 21 topics. I need to consolidate to 20.

Revised 20 Lesson Plan:
1. present-tense-regular.json - Present tense: Regular verbs (-ER, -IR, -RE)
2. present-tense-irregular.json - Present tense: Irregular verbs
3. passe-compose.json - Passé composé
4. imparfait.json - Imparfait
5. plus-que-parfait.json - Plus-que-parfait
6. future-simple.json - Future simple
7. future-proche.json - Near future (aller + infinitive)
8. gender-agreement.json - Gender and number agreement
9. articles.json - Articles (definite, indefinite, partitive)
10. subject-pronouns.json - Subject pronouns
11. direct-object-pronouns.json - Direct object pronouns
12. indirect-object-pronouns.json - Indirect object pronouns
13. relative-pronouns.json - Relative pronouns
14. negation.json - Negation (ne...pas, ne...jamais, etc.)
15. questions-inversion.json - Questions with inversion
16. questions-est-ce-que.json - Questions with est-ce que
17. questions-words.json - Questions with question words
18. subjunctive.json - Subjunctive mood
19. conditional.json - Conditional mood
20. imperative-prepositions.json - Imperative, Prepositions, Conjunctions, Adjectives/Adverbs (combined)

Actually, let me make it cleaner and split imperative and prepositions/conjunctions:
Revised 20 Lesson Plan:
1. present-tense-regular-er.json - Present: Regular -ER verbs
2. present-tense-regular-ir.json - Present: Regular -IR verbs  
3. present-tense-irregular.json - Present: Irregular verbs
4. passe-compose.json - Passé composé
5. imparfait.json - Imparfait
6. plus-que-parfait.json - Plus-que-parfait
7. future-simple.json - Future simple
8. future-proche.json - Near future
9. gender-agreement.json - Gender and number agreement
10. articles.json - Definite, indefinite, partitive articles
11. subject-pronouns.json - Subject pronouns
12. direct-object-pronouns.json - Direct object pronouns
13. indirect-object-pronouns.json - Indirect object pronouns
14. negation.json - Negation
15. questions-inversion.json - Inversion questions
16. questions-est-ce-que.json - Est-ce que questions
17. questions-words.json - Question words
18. subjunctive.json - Subjunctive mood
19. conditional.json - Conditional mood
20. imperative.json - Imperative mood

ACCEPTANCE CRITERIA (from issue #30):
- [ ] 20 lessons in data/grammar/lessons/
- [ ] Each lesson has clear explanation
- [ ] Each lesson has examples
- [ ] All lessons pass schema validation

DELIVERABLES:
1. schemas/lesson.py - GrammarLesson and Example Pydantic models
2. data/grammar/lessons/ - Directory with 20 JSON files
3. tests/test_grammar_lessons.py - Validation tests
4. schemas/__init__.py - Export new classes

INSTRUCTION: You are the AI assistant. Implement this feature following SPDD methodology. Use the analysis artifact as your guide. Do not skip any steps. Create the schema first, then the data files, then the tests. Verify all acceptance criteria are met before completing.
```

---

## AI Response

[To be filled after implementation]

---

## Human Review Notes

[To be filled after implementation]

### Changes Made
- [ ] 

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [ ] 

---

## Verification

- [ ] All acceptance criteria from issue #30 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed
