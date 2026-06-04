# SPDD Prompt: Grammar Reference Guide Content

**GitHub Issue**: #32
**Issue Title**: 2.3: Create reference guide content
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/32
**Artifact ID**: FLC-018-202606031230
**Created**: 2026-06-03 12:30
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-018-202606031200-[Analysis]-issue-32-grammar-reference.md`

---

## Context

### Current Codebase State

The French Language Coach project has completed Phase 1 (Conversation Practice) and is implementing Phase 2 (Grammar Mastery). Issue #30 (grammar lessons) has been completed with:
- 20+ grammar lesson JSON files in `data/grammar_lessons/`
- Pydantic validation models in `schemas/grammar_lesson.py`
- Validation script in `scripts/validate_grammar_lessons.py`
- Tests in `tests/test_grammar_lesson_schema.py` and `tests/test_grammar_lessons_issue_30.py`

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `data/grammar_lessons/*.json` | Grammar lesson content | 20+ JSON files with id, title, topic, difficulty, sections |
| `schemas/grammar_lesson.py` | Pydantic validation models | GrammarLesson, Section, DifficultyLevel, load_lesson_from_file(), load_lessons_from_directory() |
| `scripts/validate_grammar_lessons.py` | Validation script | Validates all lessons against schema, reports errors |
| `tests/test_grammar_lesson_schema.py` | Schema tests | Tests for Pydantic models and validation |
| `schemas/__init__.py` | Schema exports | Exports all schema models |

### Existing Patterns

1. **File Structure Pattern**: Individual JSON files in subdirectories of `data/`
   - Files named with lowercase hyphenated IDs (e.g., `present-tense-regular.json`)
   - UTF-8 encoding
   - Valid JSON with consistent formatting

2. **Pydantic Model Pattern** (from `schemas/grammar_lesson.py`):
   - BaseModel with Field annotations
   - Custom validators using `@field_validator` for non-empty strings
   - Enum types for controlled vocabularies (e.g., DifficultyLevel)
   - Helper functions for loading/validating from files

3. **Validation Script Pattern** (from `scripts/validate_grammar_lessons.py`):
   - Load all JSON files from a directory
   - Validate each against Pydantic model
   - Report statistics (valid count, errors)
   - Exit with error code if validation fails

4. **Testing Pattern** (from `tests/test_grammar_lesson_schema.py`):
   - Test valid data passes validation
   - Test invalid data raises ValidationError
   - Test edge cases (empty strings, missing fields)
   - Test helper functions

---

## Goal

**Primary Objective**: Implement GitHub issue #32 by creating 50+ grammar reference entries with:
- Individual JSON files in `data/grammar/reference/`
- Pydantic validation models in `schemas/grammar_reference.py`
- Validation script in `scripts/validate_grammar_reference.py`
- Tests in `tests/test_grammar_reference.py`

**Secondary Objectives**:
- Follow the exact same patterns as grammar lessons (Issue #30)
- Ensure 80%+ test coverage
- Create comprehensive, accurate French grammar reference content
- Validate all entries conform to schema

---

## Constraints

### Architecture Constraints
- MUST follow existing project architecture and patterns
- MUST use Pydantic v2 for validation (matching grammar_lesson.py)
- MUST store entries as individual JSON files in `data/grammar/reference/`
- MUST use the same difficulty levels: beginner, intermediate, advanced
- MUST be compatible with future frontend/search functionality

### Code Quality Constraints
- MUST follow PEP 8 style guide
- MUST include docstrings for all public functions
- MUST use type hints throughout
- MUST handle UTF-8 encoding properly (French characters)
- MUST validate all inputs and raise appropriate errors

### Testing Constraints
- MUST create unit tests achieving 80%+ coverage
- MUST test valid entries, invalid entries, and edge cases
- MUST use pytest framework
- MUST follow existing test patterns from test_grammar_lesson_schema.py

### Acceptance Criteria

**From GitHub Issue #32:**
- [ ] 50+ reference entries
- [ ] Each entry has: term, definition, examples, common pitfalls
- [ ] Entries are categorizable
- [ ] JSON format in data/grammar/reference/

---

## Examples

### Input/Output Examples

**Example 1: Valid Reference Entry**
- Input: JSON file `data/grammar/reference/subjunctive-mood.json`
- Expected Output: Validates successfully against GrammarReference model

```json
{
  "id": "subjunctive-mood",
  "term": "Le Subjonctif",
  "category": "Verbs",
  "difficulty": "advanced",
  "definition": "The subjunctive mood expresses various states of unreality such as doubt, possibility, necessity, or action that has not yet occurred.",
  "examples": [
    "Il faut que tu fasses attention",
    "Je doute qu'il vienne"
  ],
  "common_pitfalls": [
    "Don't use subjunctive after 'je pense que' - this expresses certainty, not doubt"
  ],
  "related_terms": ["indicative", "conditional"]
}
```

**Example 2: Invalid Reference Entry (missing required field)**
- Input: JSON file missing "definition" field
- Expected Output: ValidationError raised with clear error message

**Example 3: Validation Script Output**
```
Validating grammar reference entries in data/grammar/reference/
Found 55 entries
Valid: 55
Invalid: 0
All entries are valid!
```

### Edge Cases

- Entry with empty term string → ValidationError
- Entry with no examples array → ValidationError (must have at least 2)
- Entry with duplicate ID in directory → ValidationError
- Entry with special French characters (ç, é, è) → Must validate successfully
- Entry with very long definition (>500 chars) → ValidationError (recommended max)
- Entry with invalid difficulty level → ValidationError
- Entry with invalid category → ValidationError (if using enum)

### Test Cases

```python
# Test valid reference entry
def test_valid_reference_entry():
    entry_data = {
        "id": "test-entry",
        "term": "Test Term",
        "category": "Test Category",
        "difficulty": "beginner",
        "definition": "A test definition",
        "examples": ["Example 1", "Example 2"],
        "common_pitfalls": ["Pitfall 1"]
    }
    entry = GrammarReference.model_validate(entry_data)
    assert entry.id == "test-entry"
    assert entry.term == "Test Term"

# Test missing required field
def test_missing_definition():
    entry_data = {
        "id": "test-entry",
        "term": "Test Term",
        "category": "Test Category",
        "difficulty": "beginner",
        "examples": ["Example 1"],
        "common_pitfalls": ["Pitfall 1"]
        # Missing "definition"
    }
    with pytest.raises(ValidationError) as exc_info:
        GrammarReference.model_validate(entry_data)
    assert "definition" in str(exc_info.value)

# Test empty string validation
def test_empty_term():
    entry_data = {
        "id": "test-entry",
        "term": "   ",
        "category": "Test Category",
        "difficulty": "beginner",
        "definition": "A test definition",
        "examples": ["Example 1", "Example 2"],
        "common_pitfalls": ["Pitfall 1"]
    }
    with pytest.raises(ValidationError) as exc_info:
        GrammarReference.model_validate(entry_data)
    assert "non-whitespace" in str(exc_info.value)

# Test load all entries from directory
def test_load_references_from_directory():
    entries = load_references_from_directory("data/grammar/reference")
    assert len(entries) >= 50
```

---

## Deliverables

### Code Changes

- [ ] `schemas/grammar_reference.py` - Pydantic models for reference entry validation
  - GrammarReference model with all required fields
  - DifficultyLevel enum (reuse from grammar_lesson.py or import)
  - Category enum or string field for categorization
  - Helper functions: load_reference_from_file(), load_references_from_directory()
  - Custom validators for non-empty strings, minimum array lengths

- [ ] `scripts/validate_grammar_reference.py` - Validation script
  - Load all JSON files from `data/grammar/reference/`
  - Validate each against GrammarReference model
  - Report validation statistics
  - Exit with appropriate error code

- [ ] `data/grammar/reference/*.json` - 50+ reference entry JSON files
  - Individual files for each reference entry
  - Consistent naming (lowercase with hyphens)
  - Valid JSON with UTF-8 encoding
  - All required fields present and valid

### Tests

- [ ] `tests/test_grammar_reference.py` - Unit tests for reference entry models
  - Test valid entry validation
  - Test invalid entry validation (missing fields, empty strings, etc.)
  - Test helper functions (load_reference_from_file, load_references_from_directory)
  - Test edge cases (special characters, maximum lengths)
  - Target: 80%+ coverage

### Documentation

- [ ] Update `schemas/__init__.py` to export new models (if applicable)
- [ ] Add docstrings to all new public functions
- [ ] Update `spdd/README.md` with new artifacts
- [ ] Update this prompt document with AI response and human review notes

---

## Actual Prompt

[This section contains the exact prompt text that will be used to drive implementation.]

```
IMPLEMENT GitHub issue #32: Create searchable grammar reference entries.

CONTEXT:
- This is the French Language Coach project (Phase 2: Grammar Mastery)
- Issue #30 (grammar lessons) is complete with 20+ lessons in data/grammar_lessons/
- Patterns to follow: schemas/grammar_lesson.py, scripts/validate_grammar_lessons.py, tests/test_grammar_lesson_schema.py
- We are on branch: feature/issue-32-grammar-reference
- Current directory: /Users/cbeeland/repositories/french-language-coach

GOAL:
Create 50+ grammar reference entries for quick lookup with the following deliverables:
1. schemas/grammar_reference.py - Pydantic validation models
2. scripts/validate_grammar_reference.py - Validation script
3. data/grammar/reference/*.json - 50+ reference entry JSON files
4. tests/test_grammar_reference.py - Unit tests with 80%+ coverage

CONSTRAINTS:
- MUST follow existing patterns from Issue #30 (grammar lessons)
- MUST use Pydantic v2 with BaseModel
- MUST store entries as individual JSON files in data/grammar/reference/
- MUST use same difficulty levels: beginner, intermediate, advanced
- MUST validate all required fields: term, definition, examples, common_pitfalls
- MUST ensure entries are categorizable (category/topic field)
- MUST achieve 80%+ test coverage
- MUST follow PEP 8 style
- MUST include docstrings for all public functions
- MUST handle UTF-8 encoding (French characters: ç, é, è, à, etc.)

ACCEPTANCE CRITERIA (from issue #32):
- [ ] 50+ reference entries created
- [ ] Each entry has: term, definition, examples, common pitfalls
- [ ] Entries are categorizable
- [ ] JSON format in data/grammar/reference/

EXAMPLES:

Example Reference Entry (subjunctive-mood.json):
{
  "id": "subjunctive-mood",
  "term": "Le Subjonctif",
  "category": "Verbs",
  "difficulty": "advanced",
  "definition": "The subjunctive mood expresses various states of unreality such as doubt, possibility, necessity, or action that has not yet occurred.",
  "examples": [
    "Il faut que tu fasses attention",
    "Je doute qu'il vienne",
    "Bien que ce soit difficile"
  ],
  "common_pitfalls": [
    "Don't use subjunctive after 'je pense que' - this expresses certainty, not doubt",
    "Remember the subjunctive trigger words: que, bien que, avant que, pour que, etc."
  ],
  "related_terms": ["indicative", "conditional", "imperative"]
}

Schema Model (schemas/grammar_reference.py) - Similar to grammar_lesson.py but simpler:
- GrammarReference(BaseModel):
  - id: str (required, pattern: lowercase alphanumeric with hyphens)
  - term: str (required, the grammar term name)
  - category: str (required, e.g., "Verbs", "Nouns", "Adjectives")
  - difficulty: DifficultyLevel (required, enum: beginner/intermediate/advanced)
  - definition: str (required, concise explanation)
  - examples: list[str] (required, min_length=2, practical usage examples)
  - common_pitfalls: list[str] (required, min_length=1, common mistakes)
  - related_terms: list[str] (optional, related grammar terms)
  
Helper Functions:
- load_reference_from_file(file_path: Path | str) -> GrammarReference
- load_references_from_directory(directory_path: Path | str) -> dict[str, GrammarReference]
- validate_reference_data(data: dict) -> GrammarReference
- validate_reference_json(json_str: str) -> GrammarReference

Validation Script (scripts/validate_grammar_reference.py):
- Load all *.json files from data/grammar/reference/
- Validate each against GrammarReference model
- Report: total count, valid count, invalid count, errors
- Exit with code 0 if all valid, 1 if any invalid

Tests (tests/test_grammar_reference.py):
- test_valid_reference_entry()
- test_missing_required_field()
- test_empty_string_validation()
- test_minimum_examples_length()
- test_minimum_pitfalls_length()
- test_duplicate_id_detection()
- test_load_from_file()
- test_load_from_directory()
- test_special_characters()
- test_invalid_difficulty()

50+ Reference Entries to Create:
Create entries covering these categories (suggested distribution):

VERBS (15 entries):
- Present tense (regular and irregular)
- Past tenses (passé composé, imparfait, plus-que-parfait, passé simple)
- Future tenses (futur simple, futur proche, futur antérieur)
- Conditional (présent, passé)
- Subjunctive (présent, passé, imparfait)
- Imperative
- Infinitive
- Participle (présent, passé)
- Gerund
- Pronominal verbs (reflexive)
- Impersonal verbs
- Verb + infinitive constructions
- Modal verbs (pouvoir, vouloir, savoir, devoir, etc.)
- Auxiliary verbs (être, avoir)

NOUNS (8 entries):
- Gender (masculine, feminine, epicene)
- Number (singular, plural)
- Articles (definite, indefinite, partitive)
- Proper nouns
- Compound nouns
- Abstract nouns
- Concrete nouns
- Countable vs uncountable

ADJECTIVES (7 entries):
- Agreement (gender, number)
- Position (before/after noun)
- Comparatives and superlatives
- Possessive adjectives
- Demonstrative adjectives
- Indefinite adjectives
- Qualitative vs relational adjectives

PRONOUNS (8 entries):
- Subject pronouns
- Object pronouns (direct, indirect)
- Reflexive pronouns
- Possessive pronouns
- Demonstrative pronouns
- Indefinite pronouns
- Relative pronouns
- Interrogative pronouns

ADVERBS (4 entries):
- Formation (from adjectives)
- Position in sentence
- Comparatives and superlatives
- Adverbs of time, place, manner, degree

PREPOSITIONS (3 entries):
- Common prepositions (à, de, en, dans, etc.)
- Prepositions with verbs
- Prepositions with places

CONJUNCTIONS (3 entries):
- Coordinating conjunctions
- Subordinating conjunctions
- Common conjunction pairs

OTHER (2 entries):
- Negation (ne...pas, ne...jamais, etc.)
- Questions (inversion, est-ce que, intonation)

DELIVERABLES:
1. Create schemas/grammar_reference.py
2. Create scripts/validate_grammar_reference.py
3. Create data/grammar/reference/ directory
4. Create 50+ JSON files in data/grammar/reference/
5. Create tests/test_grammar_reference.py
6. Run validation to ensure all entries are valid
7. Run tests to ensure 80%+ coverage
```

---

## AI Response

[To be filled after AI implementation]

---

## Human Review Notes

[To be filled after human review of AI-generated code]

### Changes Made
- [ ] [Change 1: Description and reason]
- [ ] [Change 2: Description and reason]

### Quality Checks
- [ ] Code follows existing patterns from Issue #30
- [ ] All 50+ entries created and valid
- [ ] Tests pass with 80%+ coverage
- [ ] All acceptance criteria from issue #32 met
- [ ] Documentation (docstrings) updated
- [ ] PEP 8 compliance verified

### Issues Found
- [ ] [Issue 1: Description and resolution]
- [ ] [Issue 2: Description and resolution]

---

## Verification

[Checklist for verifying the deliverables]

- [ ] All acceptance criteria from issue #32 are met
  - [ ] 50+ reference entries created
  - [ ] Each entry has: term, definition, examples, common pitfalls
  - [ ] Entries are categorizable
  - [ ] JSON format in data/grammar/reference/
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions (matches Issue #30 patterns)
- [ ] No breaking changes introduced
- [ ] Documentation updated (docstrings)
- [ ] Human review completed
- [ ] Validation script runs successfully
- [ ] All 50+ entries validate successfully

---

*Prompt based on SPDD methodology from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
