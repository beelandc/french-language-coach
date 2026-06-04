# SPDD Analysis: Grammar Practice Exercise Templates

**GitHub Issue**: #34
**Issue Title**: 2.4: Create exercise templates
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/34
**Artifact ID**: FLC-019-202606031230
**Created**: 2026-06-03 12:30
**Author**: Mistral Vibe

---

## Original Business Requirement

From GitHub Issue #34:

Define JSON schema for grammar practice exercises.

## Exercise Types
- Fill-in-the-blank
- Multiple choice
- Translation (French to English)
- Conjugation
- Sentence transformation

## Acceptance Criteria
- [ ] Template schema defined
- [ ] Example exercises for each type
- [ ] Answer key included

---

## Background

This feature is part of Phase 2 (Grammar Mastery) of the French Language Coach project. The grammar lessons (Issue #30) and grammar reference entries (Issue #32) have been completed. Exercise templates are needed to provide interactive practice for users to apply the grammar concepts they learn.

The exercises will complement the existing grammar lessons by providing hands-on practice opportunities. Users will be able to test their understanding of French grammar through various exercise types, receiving immediate feedback via answer keys.

---

## Business Value

- **Enhanced Learning**: Interactive exercises reinforce grammar concepts through active practice
- **Variety of Practice**: Multiple exercise types cater to different learning styles
- **Self-Assessment**: Answer keys allow users to check their understanding
- **Integration Ready**: Schema can be used by frontend components for rendering exercises
- **Extensible**: Template-based approach allows for easy addition of new exercises

---

## Scope In

- [ ] Define a comprehensive JSON schema for grammar practice exercises
- [ ] Create example exercises for all 5 exercise types:
  - Fill-in-the-blank
  - Multiple choice
  - Translation (French to English)
  - Conjugation
  - Sentence transformation
- [ ] Include answer keys for all example exercises
- [ ] Create Pydantic validation models for the schema
- [ ] Create validation tests for the schema
- [ ] Store exercise templates in appropriate directory structure

## Scope Out

- [ ] Backend API endpoints for serving exercises (future issue)
- [ ] Frontend components for rendering exercises (future issue)
- [ ] User progress tracking for exercises (future issue)
- [ ] Random exercise generation (future issue)
- [ ] Integration with session feedback to recommend exercises (future issue)
- [ ] English to French translation exercises (only French to English specified)

---

## Acceptance Criteria (ACs)

1. **AC1: Template schema defined**
   **Given** the project requirements
   **When** the schema is created
   **Then** it should define all fields necessary for grammar practice exercises including type, question, options (for multiple choice), correct answer, and metadata

2. **AC2: Example exercises for each type**
   **Given** 5 exercise types (fill-in-the-blank, multiple choice, translation, conjugation, sentence transformation)
   **When** examples are created
   **Then** there should be at least one valid example for each exercise type

3. **AC3: Answer key included**
   **Given** exercise examples
   **When** reviewed
   **Then** each example should have a correct answer/answer key defined

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Grammar Lessons**: Structured lessons with sections, stored in `data/grammar_lessons/` (Issue #30)
  - Location: `schemas/grammar_lesson.py`, `data/grammar_lessons/`
  - Pattern: JSON files with Pydantic validation models
- **Grammar Reference Entries**: Concise grammar definitions, stored in `data/grammar/reference/` (Issue #32)
  - Location: `schemas/grammar_reference.py`, `data/grammar/reference/`
  - Pattern: JSON files with Pydantic validation models
- **Pydantic Validation**: Existing pattern for schema validation in `schemas/` directory
  - Location: `schemas/`
  - Pattern: BaseModel subclasses with Field validators
- **Difficulty Levels**: Enum used across scenarios and grammar content
  - Location: `schemas/grammar_lesson.py` (DifficultyLevel enum)
  - Values: beginner, intermediate, advanced

### New Concepts Required

- **Exercise**: A practice item with a question/prompt and correct answer
- **Exercise Type**: Categorization of exercise (fill-in-the-blank, multiple-choice, etc.)
- **Answer Key**: Correct answer(s) for an exercise
- **Exercise Metadata**: Difficulty, topic, related lesson IDs
- **Distractors**: Incorrect answer options for multiple choice exercises

### Key Business Rules

- **Rule 1**: All exercises must have exactly one correct answer (or set of correct answers for conjugations)
- **Rule 2**: Multiple choice exercises must have at least 3 options (1 correct, 2+ incorrect)
- **Rule 3**: Exercises should be associated with grammar topics for filtering
- **Rule 4**: Difficulty levels should match the existing enum (beginner, intermediate, advanced)
- **Rule 5**: Exercise templates should be reusable and not tied to specific user sessions

---

## Strategic Approach

### Solution Direction

1. **Analyze existing schemas**: Review `grammar_lesson.py` and `grammar_reference.py` for patterns
2. **Design JSON schema**: Create a flexible schema that supports all 5 exercise types
3. **Create exercise directory**: Establish `data/grammar/exercises/` directory structure
4. **Implement Pydantic models**: Create validation models in `schemas/grammar_exercise.py`
5. **Create examples**: Generate example exercises for each type with answer keys
6. **Create tests**: Write validation tests for the schema and examples

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Single schema vs. type-specific schemas | Single schema is simpler but may have many optional fields; type-specific schemas are more precise but harder to maintain | Single schema with discriminated union based on exercise_type |
| Answer format | Could be string, list of strings, or structured object | Use union type: str or list[str] to support both single and multiple correct answers |
| Storage location | Could be in data/grammar/exercises/ or data/exercises/ | Use data/grammar/exercises/ to match existing pattern |
| File naming | Could use lesson-like naming or exercise-specific | Use descriptive IDs like "fill-in-the-blank-present-tense.json" |

### Alternatives Considered

- **Alternative 1: Separate schemas per exercise type** - Rejected because it would create too many similar schemas and complicate the codebase
- **Alternative 2: Store all exercises in a single JSON file** - Rejected because it would be harder to maintain and extend
- **Alternative 3: Use JSON Schema standard instead of Pydantic** - Rejected because existing codebase uses Pydantic for validation

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Answer key format | How should answer keys be structured for different exercise types? | For conjugation: list of correct forms. For others: string or list of strings. Use union type. |
| Translation direction | Should we support both French→English and English→French? | Issue specifies "Translation (French to English)" only, so only implement French to English |
| Exercise grouping | Should exercises be grouped by lesson or topic? | Include optional `lesson_id` and `topic` fields for flexibility |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Multiple correct answers | Some exercises may have multiple valid answers | Support list[str] for correct_answer field |
| Case sensitivity | French is case-sensitive (e.g., proper nouns) | Store answers as-is, validate case-sensitively |
| Accent marks | French uses diacritics (é, è, ê, ç, etc.) | Preserve and validate accent marks |
| Conjugation variations | Some verbs have multiple valid conjugations | Support list[str] for conjugation answers |
| Empty distractors | Multiple choice with no incorrect options | Validate minimum 2 distractors for multiple choice |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Schema too rigid | May not accommodate future exercise types | Use extensible design with optional fields |
| Schema too loose | May allow invalid exercise data | Use Pydantic validators and constraints |
| Performance with many exercises | Loading all exercises at once could be slow | Implement lazy loading if needed in future |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Template schema defined | Yes | Will create JSON schema and Pydantic models |
| AC2 | Example exercises for each type | Yes | Will create at least one example per type |
| AC3 | Answer key included | Yes | Each example will have correct_answer field |

**AC Coverage Summary**: 3 of 3 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Schema should be validated with Pydantic (following existing pattern)
- Examples should be stored as JSON files in appropriate directory
- Should follow existing naming and structure conventions

---

## REASONS Canvas

### Requirements
From GitHub issue #34 acceptance criteria:
- Template schema defined for grammar practice exercises
- Example exercises for each type: fill-in-the-blank, multiple choice, translation (French to English), conjugation, sentence transformation
- Answer key included for all exercises

### Examples
Concrete examples to guide implementation:

**Fill-in-the-blank**:
```json
{
  "type": "fill-in-the-blank",
  "prompt": "Je ___ français.",
  "correct_answer": "parle",
  "topic": "Verbs",
  "difficulty": "beginner"
}
```

**Multiple choice**:
```json
{
  "type": "multiple-choice",
  "prompt": "Quelle est la forme correcte du verbe 'être' pour 'je'?",
  "correct_answer": "suis",
  "options": ["suis", "es", "est", "sont"],
  "topic": "Verbs",
  "difficulty": "beginner"
}
```

**Translation**:
```json
{
  "type": "translation",
  "prompt": "Translate to English: J'aime le fromage",
  "correct_answer": "I like cheese",
  "source_language": "fr",
  "target_language": "en",
  "topic": "Sentence Structure",
  "difficulty": "beginner"
}
```

**Conjugation**:
```json
{
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

**Sentence transformation**:
```json
{
  "type": "sentence-transformation",
  "prompt": "Rewrite in negative form: Je parle français.",
  "correct_answer": "Je ne parle pas français.",
  "transformation_type": "negative",
  "topic": "Sentence Structure",
  "difficulty": "beginner"
}
```

### Architecture
Existing codebase structure and patterns to follow:
- **Schema files**: Pydantic models in `schemas/` directory (e.g., `grammar_lesson.py`, `grammar_reference.py`)
- **Data files**: JSON files in `data/` directory with subdirectories (e.g., `data/grammar_lessons/`, `data/grammar/reference/`)
- **Validation**: Pydantic models with custom validators for non-empty strings, patterns, etc.
- **Loading utilities**: Helper functions like `load_lesson_from_file()`, `load_lessons_from_directory()`
- **Enums**: Use of Python enums for controlled vocabularies (e.g., DifficultyLevel)

### Standards
Coding standards to follow:
- **Naming**: snake_case for files, PascalCase for classes, lowercase with hyphens for IDs
- **Style**: PEP 8 compliance
- **Validation**: 80%+ test coverage required
- **Documentation**: Docstrings for all public functions and classes
- **Patterns**: Follow existing schema patterns from `grammar_lesson.py` and `grammar_reference.py`
- **File structure**: Store exercises in `data/grammar/exercises/` directory

### Omissions
Explicitly out-of-scope items:
- Backend API endpoints for exercises (future issue)
- Frontend components for exercise rendering (future issue)
- User progress tracking (future issue)
- Random exercise generation (future issue)
- Integration with conversation feedback (future issue)
- English to French translation (only French to English specified)

### Notes
Implementation hints and context:
- Follow the pattern established by `grammar_lesson.py` for Pydantic models
- Use discriminated unions (union types with discriminator) for different exercise types
- See `grammar_lesson.py` Lines 10-20 for enum definitions
- See `grammar_lesson.py` Lines 23-50 for BaseModel definitions with Field validators
- See `grammar_lesson.py` Lines 150-195 for utility functions (load_from_file, load_from_directory)
- The schema should support validation of individual exercise files and directories
- Consider using `Literal` types or enums for exercise types

### Solutions
Reference implementations and patterns to follow:
- **Pattern 1**: Enum for exercise types (similar to DifficultyLevel in grammar_lesson.py)
- **Pattern 2**: BaseModel with Field validators (similar to Section and GrammarLesson in grammar_lesson.py)
- **Pattern 3**: Union types for flexible fields (e.g., correct_answer: str | list[str])
- **Pattern 4**: Helper functions for loading from files/directories
- **Pattern 5**: Custom validators for non-empty strings and lists

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
