# SPDD Analysis: Vocabulary Card JSON Schema

**GitHub Issue**: #49
**Issue Title**: 3.1: Create vocabulary card JSON schema
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/49
**Artifact ID**: FLC-032-202606151800
**Created**: 2026-06-15 18:00
**Author**: Mistral Vibe

---

## Original Business Requirement

Define JSON schema for vocabulary flashcards.

## Schema Fields
- deck_id
- card_id
- front (French text)
- back (English translation)
- example (French sentence)
- tags[]
- context (where word appeared)
- difficulty (1-5)

## Acceptance Criteria
- [ ] Schema defined and validated
- [ ] Example card created
- [ ] Validation script works

---

## Background

This feature is part of Phase 3 of the French Language Coach project. Phase 3 focuses on vocabulary and content management features. The vocabulary card schema will enable the application to store, validate, and manage French vocabulary flashcards that users can study.

Vocabulary cards are a fundamental feature for language learning applications, allowing users to build their vocabulary through spaced repetition and flashcard-based learning. This schema will serve as the foundation for future vocabulary-related features including deck management, flashcard study sessions, and vocabulary tracking.

---

## Business Value

- **Enables vocabulary feature development**: Provides the data structure for all vocabulary-related functionality
- **Ensures data consistency**: Schema validation prevents invalid vocabulary data from being stored
- **Supports interoperability**: JSON schema enables easy import/export of vocabulary decks
- **Facilitates testing**: Clear schema definition allows for comprehensive test coverage
- **Future-proofing**: Establishes patterns for other content types (grammar, exercises)

---

## Scope In

- [ ] JSON Schema definition (vocabulary_card.json) for vocabulary card structure
- [ ] Pydantic model (vocabulary_card.py) for runtime validation
- [ ] Validation script (validate_vocabulary_cards.py) for testing card data
- [ ] Example vocabulary card data file(s)
- [ ] Comprehensive test suite for schema validation
- [ ] Documentation of schema fields and constraints

## Scope Out

- [ ] Database models for vocabulary cards (separate issue)
- [ ] API endpoints for vocabulary card operations (separate issue)
- [ ] Frontend UI for vocabulary card display/study (separate issue)
- [ ] Spaced repetition algorithm implementation (separate issue)
- [ ] Deck management functionality (separate issue)
- [ ] User-specific vocabulary tracking (separate issue)

---

## Acceptance Criteria (ACs)

1. **AC1: Schema defined and validated**
   **Given** a vocabulary card data structure
   **When** it is validated against the schema
   **Then** it passes validation if all required fields are present with correct types

2. **AC2: Example card created**
   **Given** the schema definition
   **When** an example vocabulary card is created
   **Then** it conforms to the schema and passes validation

3. **AC3: Validation script works**
   **Given** a vocabulary card JSON file
   **When** it is passed to the validation script
   **Then** the script correctly validates or rejects the file based on schema conformance

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Pydantic Schemas**: Located in `schemas/` directory, following pattern established by `grammar_lesson.py`, `session.py`, etc.
- **JSON Schema Files**: Located in `schemas/` directory (e.g., `grammar_lesson.json`)
- **Validation Scripts**: Located in `scripts/` directory (e.g., `validate_grammar_lessons.py`)
- **Data Files**: Located in `data/` directory (e.g., `data/grammar_lessons/`)
- **Test Patterns**: Comprehensive pytest tests in `tests/` directory (e.g., `test_grammar_lesson_schema.py`)

### New Concepts Required

- **Vocabulary Card**: A single flashcard containing French word/phrase and its English translation with metadata
- **Vocabulary Deck**: A collection of related vocabulary cards (referenced by deck_id)
- **Difficulty Level**: Numeric rating (1-5) indicating word difficulty for study prioritization
- **Context**: Reference to where the word appeared (e.g., lesson ID, session ID, or free text)
- **Tags**: Categorization labels for filtering and organizing cards

### Key Business Rules

- **deck_id**: Required string identifier for the deck/collection
- **card_id**: Required unique identifier for the card within the deck
- **front**: Required French text (word or phrase)
- **back**: Required English translation
- **example**: Optional French sentence using the word in context
- **tags**: Optional array of string tags for categorization
- **context**: Optional string describing where the word appeared
- **difficulty**: Required integer from 1 to 5 (1=easiest, 5=hardest)
- All string fields must be non-empty (if present)
- Arrays must not contain empty strings

---

## Strategic Approach

### Solution Direction

1. Create JSON Schema file (`schemas/vocabulary_card.json`) defining the structure
2. Create Pydantic model file (`schemas/vocabulary_card.py`) for runtime validation
3. Create example data file(s) in `data/vocabulary_cards/`
4. Create validation script in `scripts/validate_vocabulary_cards.py`
5. Create comprehensive test suite in `tests/test_vocabulary_card_schema.py`

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Schema Format** | JSON Schema vs Pydantic-only | Use both: JSON Schema for documentation/interop, Pydantic for runtime validation |
| **Difficulty Scale** | 1-5 vs 1-10 vs beginner/intermediate/advanced | Use 1-5 integer scale for granularity and simplicity |
| **ID Format** | UUID vs simple string vs structured | Use simple string pattern (similar to grammar lessons) for readability |
| **Field Requirements** | All optional vs required fields | Mark deck_id, card_id, front, back, difficulty as required; others optional |
| **Validation Strictness** | Lenient vs strict | Strict validation to ensure data quality |

### Alternatives Considered

- **Alternative 1**: Use only Pydantic models without JSON Schema - Rejected because JSON Schema provides better documentation and interoperability
- **Alternative 2**: Use UUID for card_id - Rejected because human-readable IDs are more maintainable
- **Alternative 3**: Use enum for difficulty (easy, medium, hard) - Rejected because numeric scale provides more granularity
- **Alternative 4**: Make all fields required - Rejected because example and context may not always be available

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **card_id uniqueness** | Should card_id be unique across all decks or just within a deck? | Unique within deck (deck_id + card_id combination is globally unique) |
| **difficulty scale** | What criteria determine difficulty levels 1-5? | 1=common words, 2=frequent, 3=standard, 4=advanced, 5=rare/specialized |
| **tags format** | Any constraints on tag values? | Free-form strings, lowercase, no spaces preferred |
| **context format** | What format should context take? | Free text describing source (e.g., "lesson:present-tense" or "session:123") |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Empty strings in required fields | Data quality | Reject with validation error |
| difficulty outside 1-5 range | Data integrity | Reject with validation error |
| Empty tags array | Valid case | Allow (empty array is acceptable) |
| Duplicate tags in array | Data quality | Allow (duplicates may be intentional for emphasis) or reject |
| Non-string values in tags | Type safety | Reject with validation error |
| Very long strings | Storage limits | Allow but consider length limits in future |
| Unicode characters | French language support | Allow (essential for French text) |
| Null/None values | Data integrity | Reject for required fields, allow for optional |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Schema changes** | Breaking existing data if schema evolves | Use semantic versioning, maintain backward compatibility |
| **Validation performance** | Slow validation for large decks | Optimize validation, validate in batches |
| **Inconsistent patterns** | Deviating from existing codebase patterns | Follow established patterns from grammar_lesson schema |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Schema defined and validated | Yes | Will create JSON Schema + Pydantic model |
| AC2 | Example card created | Yes | Will create example data files |
| AC3 | Validation script works | Yes | Will create validation script and test it |

**AC Coverage Summary**: 3 of 3 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Schema should follow existing patterns (similar to grammar_lesson.json)
- Should include Pydantic models for runtime validation
- Should include comprehensive tests
- Should support loading from files and directories

---

## REASONS Canvas

### Requirements
From GitHub issue #49 acceptance criteria:
- Schema defined and validated
- Example card created
- Validation script works

Schema fields required:
- deck_id
- card_id
- front (French text)
- back (English translation)
- example (French sentence)
- tags[]
- context (where word appeared)
- difficulty (1-5)

### Examples

**Valid Card Example 1**:
```json
{
  "deck_id": "french-basics",
  "card_id": "hello",
  "front": "Bonjour",
  "back": "Hello",
  "example": "Bonjour, comment ça va?",
  "tags": ["greeting", "common"],
  "context": "lesson:greetings-101",
  "difficulty": 1
}
```

**Valid Card Example 2**:
```json
{
  "deck_id": "food-vocabulary",
  "card_id": "apple",
  "front": "pomme",
  "back": "apple",
  "tags": ["food", "fruit"],
  "difficulty": 1
}
```

**Invalid Card Example (missing required fields)**:
```json
{
  "deck_id": "test",
  "card_id": "test",
  "front": "test"
  // Missing: back, difficulty
}
```

**Invalid Card Example (wrong difficulty type)**:
```json
{
  "deck_id": "test",
  "card_id": "test",
  "front": "test",
  "back": "test",
  "difficulty": "easy"  // Should be integer 1-5
}
```

### Architecture

Existing codebase structure:
- `schemas/` - Contains JSON schema files and Pydantic models
  - `grammar_lesson.json` - JSON Schema for grammar lessons
  - `grammar_lesson.py` - Pydantic models and validation functions
- `scripts/` - Contains validation scripts
  - `validate_grammar_lessons.py` - Validation script for grammar lessons
- `data/` - Contains example data files
  - `grammar_lessons/` - Grammar lesson JSON files
- `tests/` - Contains test files
  - `test_grammar_lesson_schema.py` - Comprehensive tests for grammar lesson schema

New files to create:
- `schemas/vocabulary_card.json` - JSON Schema definition
- `schemas/vocabulary_card.py` - Pydantic models and validation functions
- `scripts/validate_vocabulary_cards.py` - Validation script
- `data/vocabulary_cards/` - Directory for example card files
- `tests/test_vocabulary_card_schema.py` - Test suite

### Standards

- **JSON Schema**: Follow JSON Schema Draft 07 (consistent with grammar_lesson.json)
- **Pydantic**: Use Pydantic v2 (consistent with existing schemas)
- **Python**: Follow PEP 8 style guide
- **Testing**: 80%+ coverage, use pytest
- **Documentation**: Docstrings for all public functions, module-level docstrings
- **File organization**: Follow existing patterns in codebase
- **Naming**: Use snake_case for file names, PascalCase for classes

### Omissions

Explicitly out of scope:
- Database integration (SQLAlchemy models)
- API endpoints (FastAPI routers)
- Frontend components
- User authentication/authorization
- Spaced repetition algorithm
- Deck management UI
- Import/export functionality beyond basic validation

### Notes

Implementation hints:
- Follow the pattern established in `schemas/grammar_lesson.py` and `schemas/grammar_lesson.json`
- Use the same validation helper functions pattern (load_from_file, load_from_directory, validate_data, validate_json)
- Create similar test structure as `test_grammar_lesson_schema.py`
- Use Conint (constrained integer) for difficulty field (1-5)
- Use Field with min_length=1 for required string fields
- Consider using Annotated types for additional validation

References:
- `schemas/grammar_lesson.py` - Pattern to follow for Pydantic models
- `schemas/grammar_lesson.json` - Pattern to follow for JSON Schema
- `scripts/validate_grammar_lessons.py` - Pattern to follow for validation script
- `tests/test_grammar_lesson_schema.py` - Pattern to follow for tests

### Solutions

Reference implementations to mimic:
1. **Schema Pattern**: `schemas/grammar_lesson.py` - Pydantic model with validators
2. **JSON Schema Pattern**: `schemas/grammar_lesson.json` - Formal JSON Schema definition
3. **Validation Script Pattern**: `scripts/validate_grammar_lessons.py` - CLI validation tool
4. **Test Pattern**: `tests/test_grammar_lesson_schema.py` - Comprehensive test suite

Existing code to reuse:
- Base schema patterns from `schemas/base.py`
- Validation function patterns (load_from_file, load_from_directory)
- Test fixture patterns from existing test files

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
