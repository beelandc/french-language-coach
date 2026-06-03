# SPDD Analysis: Grammar Lesson JSON Schema

**GitHub Issue**: #28
**Issue Title**: 2.1: Create grammar lesson JSON schema
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/28
**Artifact ID**: FLC-017-202606021200
**Created**: 2026-06-02 12:00
**Author**: Mistral Vibe

---

## Original Business Requirement

Define JSON schema for grammar lessons with sections, examples, and exercises.

---

## Background

The French Language Coach application is expanding from conversation practice (Phase 1) to include Grammar Mastery (Phase 2). As part of Phase 2, the application needs a structured way to define grammar lessons that can be:
- Stored as static JSON data files
- Validated for consistency and completeness
- Used by both frontend and backend components
- Extended in the future with additional metadata

Grammar lessons form the foundation of the Grammar Mastery pillar, providing structured learning content that complements the conversational practice. The schema will enable the application to:
- Display grammar lessons to users in a consistent format
- Validate lesson data before loading
- Support future features like lesson progress tracking and search

---

## Business Value

- **Content Structure**: Provides a standardized format for grammar lesson content
- **Data Validation**: Ensures all lessons have required fields and valid data types
- **Developer Experience**: Clear contract for creating new grammar lessons
- **Future Extensibility**: Schema can be extended to support new features (e.g., progress tracking, search filtering)
- **Consistency**: All grammar lessons will have the same structure, making the UI predictable

---

## Scope In

- [ ] Define JSON schema for grammar lesson structure
- [ ] Include required fields: id, title, topic, difficulty
- [ ] Include sections array with title, content, examples fields
- [ ] Create validation script to validate lessons against the schema
- [ ] Ensure schema is documented and versioned

## Scope Out

- [ ] Database models for grammar lessons (future implementation)
- [ ] API endpoints for grammar lessons (future implementation)
- [ ] Frontend components to display lessons (future implementation)
- [ ] Lesson content creation (content will be added later)
- [ ] Internationalization of lesson content
- [ ] User progress tracking for lessons
- [ ] Search and filtering functionality

---

## Acceptance Criteria (ACs)

1. **AC1: Schema defined for lesson structure**
   **Given** The need to define grammar lessons
   **When** Schema is created
   **Then** It includes all required fields: id, title, topic, difficulty, sections[]

2. **AC2: Sections structure defined**
   **Given** The need for structured lesson content
   **When** Schema defines sections
   **Then** Each section includes: title, content, examples[]

3. **AC3: Validation script created**
   **Given** Grammar lesson JSON data
   **When** Validation script is run
   **Then** It validates the data against the schema and reports errors

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Pydantic Schemas** (`schemas/session.py`): Existing pattern for data validation using Pydantic BaseModel
- **JSON Data** (`scenarios.py`): Static data defined as Python dictionaries (scenarios with id, title, system_prompt, difficulty_levels)
- **Type Definitions** (`frontend/src/types/index.ts`): TypeScript interfaces for frontend data structures

### New Concepts Required

- **Grammar Lesson Schema**: JSON Schema (draft-07) definition for grammar lesson structure
- **Lesson Validation Script**: Python script to validate lesson JSON files against the schema
- **Grammar Lesson Data**: JSON files containing actual lesson content (structure only in this issue)

### Key Business Rules

- **Rule 1**: Every grammar lesson must have a unique id
- **Rule 2**: Every lesson must have a title, topic, and difficulty level
- **Rule 3**: Every lesson must have at least one section
- **Rule 4**: Every section must have a title and content
- **Rule 5**: Examples are optional but recommended for clarity
- **Rule 6**: Difficulty must be one of: "beginner", "intermediate", "advanced"
- **Rule 7**: All string fields must be non-empty

---

## Strategic Approach

### Solution Direction

1. **Create JSON Schema file**: Define schema in `schemas/grammar_lesson.json` following JSON Schema draft-07
2. **Create Python validation module**: Create `schemas/grammar_lesson.py` with Pydantic model and validation functions
3. **Create validation script**: Create standalone script `scripts/validate_grammar_lessons.py` to validate lesson files
4. **Add example lesson**: Create example lesson file to demonstrate the schema
5. **Create tests**: Write pytest tests for the schema and validation logic

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **JSON Schema vs Pydantic-only** | JSON Schema: Standard format, can be used outside Python. Pydantic-only: More Pythonic, easier to use with FastAPI. | **Both**: Use JSON Schema as the source of truth, with Pydantic model for Python validation. This provides interoperability while maintaining Python integration. |
| **Schema location** | schemas/ vs data/ vs root | **schemas/grammar_lesson.json** - Consistent with existing schemas directory, separates definition from implementation |
| **Validation approach** | Standalone script vs integrated in app | **Both**: Standalone script for development/CI, integrated validation for runtime use |
| **Difficulty levels** | Custom list vs reuse existing | **Reuse existing**: Use same difficulty levels as scenarios (beginner, intermediate, advanced) for consistency |

### Alternatives Considered

- **Alternative 1**: Use only Pydantic models without JSON Schema - Rejected because: JSON Schema provides better documentation, can be used by non-Python tools, more portable
- **Alternative 2**: Use Python dataclasses instead of Pydantic - Rejected because: Pydantic provides built-in validation, serialization, and integrates better with FastAPI
- **Alternative 3**: Store schema in database - Rejected because: Schema is for data definition, not runtime storage; static files are simpler for this use case
- **Alternative 4**: Use YAML instead of JSON - Rejected because: JSON is more standard for schemas and data interchange

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **Exercises field** | Issue mentions "exercises" but AC only lists sections with examples | Include exercises as optional field in sections, but focus on examples for initial implementation |
| **Examples structure** | What format should examples take? | Use array of strings for simple examples; can be extended later for more complex examples |
| **Schema versioning** | How to handle future schema changes? | Include $schema version field and version number in schema |
| **Lesson file location** | Where to store actual lesson JSON files? | Create `data/grammar_lessons/` directory for lesson content |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **Empty sections array** | Lesson with no sections | Validation should fail - lesson must have at least one section |
| **Duplicate lesson IDs** | Multiple lessons with same ID | Validation should detect and report duplicates across all lessons |
| **Invalid difficulty value** | Difficulty not in allowed list | Validation should fail with clear error message |
| **Missing required field** | Lesson missing id, title, etc. | Validation should fail, listing all missing required fields |
| **Empty string fields** | Fields present but empty | Validation should fail - all string fields must have non-whitespace content |
| **Non-array sections** | sections is not an array | Validation should fail with type error |
| **Section missing title** | Section without title | Validation should fail - section title is required |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Schema too restrictive** | May need to change as requirements evolve | Include version field, document breaking vs non-breaking changes |
| **Performance of validation** | Validating many large lesson files could be slow | Validation script runs once during development/CI, not in hot path |
| **Schema complexity** | JSON Schema can become complex | Keep initial schema simple, add complexity as needed |
| **Pydantic/JSON Schema mismatch** | Differences between JSON Schema and Pydantic validation | Write tests to ensure both produce same validation results |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Schema defined for lesson structure | Yes | Will define schema with all required fields |
| AC2 | Sections include title, content, examples[] | Yes | Will include sections with these fields |
| AC3 | Validation script created | Yes | Will create Python script for validation |

**AC Coverage Summary**: 3 of 3 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Schema should be documented
- Schema should be versioned
- Validation should provide clear error messages
- Schema should support future extensibility

---

## REASONS Canvas

### Requirements
From GitHub issue #28:
- Schema defined for lesson structure
- Includes: id, title, topic, difficulty, sections[]
- Sections include: title, content, examples[]
- Validation script created

### Examples

**Example 1: Valid Grammar Lesson**
```json
{
  "id": "present-tense",
  "title": "The Present Tense in French",
  "topic": "Verbs",
  "difficulty": "beginner",
  "sections": [
    {
      "title": "Regular -ER Verbs",
      "content": "Most French verbs ending in -er follow a regular conjugation pattern...",
      "examples": [
        "Je mange (I eat)",
        "Tu manges (You eat)",
        "Il/Elle/On mange (He/She/One eats)"
      ]
    }
  ]
}
```

**Example 2: Invalid Lesson (Missing required fields)**
```json
{
  "id": "present-tense",
  "title": "The Present Tense in French"
}
```
Expected: Validation fails with error about missing topic, difficulty, sections

**Example 3: Invalid Lesson (Invalid difficulty)**
```json
{
  "id": "present-tense",
  "title": "The Present Tense in French",
  "topic": "Verbs",
  "difficulty": "expert",
  "sections": [...]
}
```
Expected: Validation fails with error about invalid difficulty value

### Architecture
**Existing Codebase Patterns:**
- Pydantic models in `schemas/` directory (e.g., `schemas/session.py`)
- Static data in Python modules (e.g., `scenarios.py`)
- TypeScript types in `frontend/src/types/index.ts`

**Proposed Architecture:**
1. **Schema Definition**: `schemas/grammar_lesson.json` - JSON Schema (draft-07) format
2. **Python Validation**: `schemas/grammar_lesson.py` - Pydantic model mirroring the schema
3. **Validation Script**: `scripts/validate_grammar_lessons.py` - Standalone validation utility
4. **Lesson Data**: `data/grammar_lessons/*.json` - Individual lesson files
5. **Tests**: `tests/test_grammar_lesson_schema.py` - Validation tests

**Data Flow:**
1. Lesson author creates JSON file in `data/grammar_lessons/`
2. Validation script checks all lesson files against schema
3. Application loads validated lessons at runtime
4. Frontend displays lessons to users

### Standards
- **Coding**: Follow existing PEP 8 style, match project patterns
- **Testing**: pytest, 80% coverage minimum for new code
- **Code Style**: Consistent with existing codebase (snake_case for Python, camelCase for JSON)
- **Documentation**: Docstrings for all public functions, README updates if needed
- **Validation**: Use jsonschema library for JSON Schema validation, Pydantic for Python model validation
- **File Format**: JSON files with UTF-8 encoding, 2-space indentation

### Omissions
Explicitly out of scope:
- Database models for storing lessons (Phase 2.5+)
- API endpoints for serving lessons (Phase 2.2+)
- Frontend components for displaying lessons (Phase 2.2+)
- Lesson content authoring tools
- Internationalization of lesson content
- User progress tracking
- Search and filtering by metadata

### Notes
Implementation hints:
- See `schemas/session.py` for existing Pydantic schema patterns
- Use `enum.Enum` for difficulty levels to ensure type safety
- Consider using `TypedDict` or dataclasses as alternative to Pydantic for data-only structures
- JSON Schema can be validated using `jsonschema` library (Draft7Validator)
- Pydantic v2 supports JSON Schema export for interoperability
- Include `$schema` field in schema file to specify JSON Schema version
- Use `definitions` in JSON Schema for reusable sub-schemas (sections)
- Consider adding `description` fields to schema properties for documentation

### Solutions
Reference implementations to mimic:
- **Pydantic Schema Pattern**: See `schemas/session.py` for model definitions
- **Validation Pattern**: See `tests/test_schemas.py` for schema validation tests
- **Static Data Pattern**: See `scenarios.py` for static data structure
- **Type Definitions**: See `frontend/src/types/index.ts` for TypeScript type patterns

Similar code in codebase:
- `schemas/session.py:SessionCreate` - BaseModel with field validation
- `schemas/session.py:Message` - Nested model structure
- `schemas/session.py:FeedbackResponse` - Complex nested structure with arrays
- `scenarios.py` - Static data with id, title, difficulty_levels

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
