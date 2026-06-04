# SPDD Analysis: Author 20 Core Grammar Lessons

**GitHub Issue**: #30
**Issue Title**: 2.2: Author 20 core grammar lessons
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/30
**Artifact ID**: FLC-017-202606022334
**Created**: 2026-06-02 23:34
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Create 20 grammar lessons covering essential French grammar topics.

### Topics to cover
- Present tense (regular and irregular verbs)
- Past tenses (passé composé, imparfait, plus-que-parfait)
- Future tense (simple and near future)
- Gender and number agreement
- Articles (definite, indefinite, partitive)
- Pronouns (subject, object, relative)
- Negation
- Questions (inversion, est-ce que, question words)
- Subjunctive mood
- Conditional mood
- Imperative
- Prepositions
- Conjunctions
- Adjectives and adverbs

## Acceptance Criteria (ACs)

1. **AC1**: 20 lessons in data/grammar/lessons/
   **Given** the repository structure
   **When** the feature is complete
   **Then** there are 20 lesson files in the data/grammar/lessons/ directory

2. **AC2**: Each lesson has clear explanation
   **Given** a lesson file
   **When** it is loaded
   **Then** it contains a clear explanation of the grammar topic

3. **AC3**: Each lesson has examples
   **Given** a lesson file
   **When** it is loaded
   **Then** it contains practical examples demonstrating the grammar concept

4. **AC4**: All lessons pass schema validation
   **Given** all 20 lesson files
   **When** validated against the lesson schema
   **Then** all lessons pass validation without errors

---

## Background

This task is part of Phase 2 (Grammar Mastery) as outlined in VISION.md. The grammar lessons are a core component of the Grammar Mastery pillar, which aims to provide interactive lessons, reference guides, and contextual practice for French learners.

The lessons will be used by the frontend LessonBrowser component (mentioned in SPDD.md examples) and will be served through future API endpoints like `GET /grammar/lessons/` and `GET /grammar/lessons/{id}`.

Currently, the codebase has:
- A complete Conversation Practice system (Phase 1)
- Schema definitions in schemas/session.py for session-related data
- No existing grammar lesson infrastructure

---

## Business Value

- Enables the Grammar Mastery pillar of the French Language Coach platform
- Provides structured learning content for users to study French grammar
- Creates the foundation for future features like lesson progress tracking and contextual grammar practice
- Allows users to reinforce conversation practice with targeted grammar study
- Supports the vision of a comprehensive, integrated learning platform

---

## Scope In

- [x] Create lesson schema definition for grammar lessons
- [x] Create data/grammar/lessons/ directory structure
- [x] Author 20 JSON lesson files covering the 14 topics listed in the issue
- [x] Each lesson includes: title, topic, difficulty, explanation, examples
- [x] Schema validation for all lessons
- [x] Test to verify all lessons pass validation

## Scope Out

- [ ] Frontend components for displaying lessons (separate issue)
- [ ] Backend API endpoints for serving lessons (separate issue)
- [ ] Lesson progress tracking system (separate issue)
- [ ] Interactive exercises for lessons (separate issue)
- [ ] Integration with conversation feedback (separate issue)
- [ ] User authentication for lesson access (Phase 5)
- [ ] Audio pronunciation guides
- [ ] Video content
- [ ] Quiz/interactive assessment system

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session Schema**: schemas/session.py - Defines data structures for conversation sessions, includes feedback with grammar_score, vocabulary_score, etc.
- **Pydantic Models**: Used throughout for data validation (schemas/session.py uses BaseModel)
- **Feedback Structure**: schemas/session.py:72 defines grammar_score: int and other scoring fields

### New Concepts Required

- **Grammar Lesson**: A structured data object containing grammar instruction content
  - Properties: id, title, topic, category, difficulty, explanation, examples, tags
  - Location: data/grammar/lessons/
- **Lesson Schema**: Pydantic model for validating lesson data structure
  - Location: schemas/lesson.py or schemas/grammar.py

### Key Business Rules

- **Rule 1**: Each lesson must be a valid JSON file
- **Rule 2**: Each lesson must conform to the lesson schema
- **Rule 3**: Each lesson must cover one specific grammar topic
- **Rule 4**: Lessons should be categorized appropriately (tense, mood, agreement, etc.)
- **Rule 5**: Examples must be in French with English translations where helpful
- **Rule 6**: Difficulty levels: beginner, intermediate, advanced

---

## Strategic Approach

### Solution Direction

1. **Define Lesson Schema**: Create a Pydantic model in schemas/lesson.py that defines the structure of grammar lessons
2. **Create Directory Structure**: Set up data/grammar/lessons/ directory
3. **Author Lessons**: Create 20 JSON files, one for each grammar topic
4. **Validate Lessons**: Create a validation script or test to ensure all lessons conform to schema
5. **Test Coverage**: Create tests to verify schema validation and lesson content

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **JSON vs YAML for lessons** | JSON: More standard, easier to validate with Pydantic. YAML: More human-readable | JSON - Better support in Python ecosystem, matches existing patterns |
| **Single file vs multiple files** | Single: Easier to manage. Multiple: Better organization, easier to update individual lessons | Multiple files - One per lesson for better maintainability |
| **Schema strictness** | Strict: Ensures consistency. Lenient: More flexible for content creators | Strict - Ensures data quality and predictable structure |
| **Lesson ID format** | UUID: Unique but hard to read. Simple string: Readable but may have conflicts | Simple string based on topic name - Human-readable and sufficient for this use case |

### Alternatives Considered

- **Alternative 1**: Store lessons in database - Rejected because static content doesn't need database, JSON files are simpler and version-controlled
- **Alternative 2**: Use Markdown for lessons - Rejected because structured data is needed for frontend rendering, JSON provides better validation
- **Alternative 3**: Create a lesson builder tool - Rejected for now, out of scope for this issue

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Lesson file format | Should lessons be JSON, YAML, or Markdown? | Use JSON for structured data validation |
| Lesson structure | What fields are required vs optional? | Define required: id, title, topic, explanation, examples; optional: difficulty, tags, category |
| Example format | How should examples be structured? | Use list of objects with french, english, explanation fields |
| Topic mapping | Some topics have multiple subtopics (e.g., "Present tense (regular and irregular verbs)") - should these be separate lessons or one? | Create separate lessons for subtopics to keep each lesson focused |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Special characters in French | Lessons contain accented characters (é, è, ê, ç, etc.) | Ensure UTF-8 encoding for all files |
| Missing required fields | A lesson file is missing a required field | Schema validation should fail clearly |
| Invalid JSON | A lesson file has syntax errors | Validation script should catch and report |
| Duplicate IDs | Two lessons have the same ID | Validation should detect and fail |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Schema changes later | May require updating all 20 lesson files | Design schema to be flexible and backwards-compatible |
| Content errors | Grammar explanations may contain mistakes | Have human reviewer verify content accuracy |
| Encoding issues | French characters may not display correctly | Use UTF-8 encoding, test with actual French text |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | 20 lessons in data/grammar/lessons/ | Yes | Need to create exactly 20 files |
| AC2 | Each lesson has clear explanation | Yes | Ensure explanation field is present and well-written |
| AC3 | Each lesson has examples | Yes | Include examples array in each lesson |
| AC4 | All lessons pass schema validation | Yes | Create validation mechanism |

**AC Coverage Summary**: 4 of 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Lesson files should be in JSON format
- Schema validation mechanism should exist
- Lessons should be organized in a logical structure
- Content should be accurate and educational

---

## REASONS Canvas

### Requirements
From GitHub issue #30 acceptance criteria:
- 20 lessons in data/grammar/lessons/
- Each lesson has clear explanation
- Each lesson has examples
- All lessons pass schema validation

Topics to cover (14 main categories, needs 20 lessons):
1. Present tense (regular verbs)
2. Present tense (irregular verbs)
3. Passé composé
4. Imparfait
5. Plus-que-parfait
6. Future simple
7. Near future (aller + infinitive)
8. Gender and number agreement
9. Articles (definite, indefinite, partitive)
10. Subject pronouns
11. Object pronouns (direct and indirect)
12. Relative pronouns
13. Negation
14. Questions (inversion)
15. Questions (est-ce que)
16. Questions (question words)
17. Subjunctive mood
18. Conditional mood
19. Imperative
20. Prepositions and conjunctions

### Examples

**Lesson File Structure Example:**
```json
{
  "id": "present-tense-regular",
  "title": "Present Tense: Regular Verbs",
  "topic": "Present tense",
  "category": "Verb tenses",
  "difficulty": "beginner",
  "explanation": "In French, regular verbs in the present tense follow predictable conjugation patterns...",
  "examples": [
    {
      "french": "Je parle français.",
      "english": "I speak French.",
      "explanation": "Parler (to speak) is a regular -er verb."
    }
  ],
  "tags": ["verb", "conjugation", "present"]
}
```

**Validation Example:**
```python
from schemas.lesson import GrammarLesson
import json

with open('data/grammar/lessons/present-tense-regular.json') as f:
    lesson_data = json.load(f)
    lesson = GrammarLesson(**lesson_data)  # Should not raise ValidationError
```

### Architecture

**Existing codebase structure:**
- schemas/ directory for Pydantic models
- models/ directory for SQLAlchemy models
- tests/ directory for tests
- static/ directory for static files
- frontend/ for React frontend

**Pattern to follow:**
- Create new schemas/lesson.py for lesson data model
- Create data/grammar/lessons/ directory for lesson JSON files
- Create tests/test_lessons.py for validation tests

**File organization:**
```
data/
└── grammar/
    └── lessons/
        ├── present-tense-regular.json
        ├── present-tense-irregular.json
        ├── passe-compose.json
        └── ... (20 total)
```

### Standards

- **Coding**: Follow existing PEP 8 patterns, use Pydantic for validation
- **Testing**: 80%+ coverage required, use pytest
- **Documentation**: Docstrings for schema classes, README updates if needed
- **File naming**: kebab-case for JSON files (e.g., present-tense-regular.json)
- **Encoding**: UTF-8 for all files to support French characters
- **JSON format**: Pretty-printed for readability

### Omissions

Explicitly out of scope:
- Frontend lesson viewer components
- Backend API endpoints for lessons
- Lesson progress tracking
- Interactive exercises/quizzes
- User authentication
- Audio/video content
- Translation management system

### Notes

- Lessons should be educational and accurate
- Examples should be practical and useful for intermediate learners
- French text should use proper accents and spelling
- Lessons should build upon each other where appropriate
- Consider the VISION.md target user (B1-B2 level intermediate learners)
- Reference existing patterns in schemas/session.py for Pydantic model structure

### Solutions

Reference implementations to mimic:
- **Schema pattern**: schemas/session.py - Shows how to create Pydantic models for data validation
- **Test pattern**: tests/ directory - Shows existing test structure and patterns
- **File organization**: Follow the existing directory structure patterns

---

*Analysis complete. Next step: Create prompt artifact in spdd/prompt/*
