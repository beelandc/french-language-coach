# SPDD Analysis: Grammar Reference Guide Content

**GitHub Issue**: #32
**Issue Title**: 2.3: Create reference guide content
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/32
**Artifact ID**: FLC-018-202606031200
**Created**: 2026-06-03 12:00
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Create searchable grammar reference entries.

---

## Background

As part of Phase 2 (Grammar Mastery) of the French Language Coach project, we need to create a comprehensive grammar reference guide that complements the interactive lessons (Issue #30). While lessons provide structured, step-by-step tutorials, the reference guide will serve as a quick-lookup resource for specific grammar terms, rules, and concepts.

This reference guide will allow users to:
- Look up specific grammar terms quickly
- Understand definitions with clear explanations
- See practical examples of usage
- Learn about common mistakes and how to avoid them
- Filter entries by category/topic

The reference entries are distinct from grammar lessons:
- **Lessons**: Full tutorials with multiple sections, practice exercises (Issue #30 - already implemented)
- **Reference Entries**: Concise, searchable entries for quick lookup (Issue #32 - this task)

---

## Business Value

- **Enhances User Experience**: Provides quick answers to grammar questions without requiring users to go through full lessons
- **Supports Phase 2 Goals**: Completes the Grammar Mastery pillar alongside lessons
- **Improves Learning Efficiency**: Users can find specific information faster
- **Builds Content Library**: Creates reusable content that can be referenced from lessons, feedback, and conversations
- **Enables Future Features**: Reference entries can be linked from conversation feedback (e.g., "You made a mistake with the subjunctive - see reference entry X")

---

## Scope In

- [ ] Create 50+ grammar reference entries in JSON format
- [ ] Store entries in `data/grammar/reference/` directory
- [ ] Each entry contains: term, definition, examples, common pitfalls
- [ ] Entries are categorizable (by topic/difficulty)
- [ ] JSON schema for reference entries
- [ ] Validation script for reference entries
- [ ] Pydantic models for reference entry validation (similar to grammar_lesson.py)

## Scope Out

- [ ] Frontend UI for displaying reference entries (future issue)
- [ ] Search functionality API endpoint (future issue)
- [ ] Integration with existing lessons (future issue)
- [ ] User bookmarking/favorites for reference entries (future issue)
- [ ] Audio pronunciations for reference terms (future issue)

---

## Acceptance Criteria (ACs)

**From GitHub Issue #32:**

1. **AC-32-01**: 50+ reference entries created
   **Given** The data/grammar/reference/ directory exists
   **When** All reference entry files are counted
   **Then** There are at least 50 valid JSON files

2. **AC-32-02**: Each entry has required fields
   **Given** A reference entry file
   **When** The entry is parsed
   **Then** It contains: term, definition, examples, common pitfalls

3. **AC-32-03**: Entries are categorizable
   **Given** A reference entry
   **When** Examining its metadata
   **Then** It has category/topic information for filtering

4. **AC-32-04**: JSON format in data/grammar/reference/
   **Given** The data directory structure
   **When** Looking for reference entries
   **Then** They are stored in data/grammar/reference/ as individual JSON files

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Grammar Lessons**: Structured tutorials in `data/grammar_lessons/` (Issue #30)
  - Location: `data/grammar_lessons/*.json`
  - Schema: `schemas/grammar_lesson.py`
  - Validation: `scripts/validate_grammar_lessons.py`
  - Contains: id, title, topic, difficulty, sections (each with title, content, examples)

- **GrammarLesson Pydantic Model**: Validates lesson structure
  - Location: `schemas/grammar_lesson.py`
  - Provides: Type-safe validation, custom validators, helper functions

- **Validation Script Pattern**: Python script to validate all JSON files in a directory
  - Location: `scripts/validate_grammar_lessons.py`
  - Pattern: Load all files, validate against schema, report errors

### New Concepts Required

- **GrammarReferenceEntry**: Individual reference entry structure
  - Fields: term, definition, examples, common_pitfalls, category, difficulty, related_terms
  - Format: Individual JSON files in `data/grammar/reference/`

- **ReferenceEntry Pydantic Model**: Validation for reference entries
  - Location: `schemas/grammar_reference.py` (new file)
  - Purpose: Type-safe validation similar to GrammarLesson

- **Reference Validation Script**: Script to validate all reference entries
  - Location: `scripts/validate_grammar_reference.py` (new file)
  - Purpose: Ensure all 50+ entries conform to schema

### Key Business Rules

- **Rule 1**: All reference entries MUST be valid JSON
- **Rule 2**: All reference entries MUST conform to the defined schema
- **Rule 3**: Entry IDs/filenames MUST be unique
- **Rule 4**: Categories MUST be consistent across entries (controlled vocabulary)
- **Rule 5**: Difficulty levels MUST match existing levels (beginner, intermediate, advanced)
- **Rule 6**: Examples MUST be practical and accurate French usage
- **Rule 7**: Common pitfalls MUST describe actual common mistakes English speakers make

---

## Strategic Approach

### Solution Direction

1. **Define Schema**: Create JSON schema and Pydantic model for reference entries
2. **Create Directory**: Set up `data/grammar/reference/` directory structure
3. **Author Entries**: Create 50+ reference entries covering core French grammar concepts
4. **Validate**: Create and run validation script to ensure all entries are valid
5. **Test**: Create tests to verify validation logic

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **File Structure**: Individual JSON files vs. single large file | Individual files: easier to maintain, version control, partial loading. Single file: simpler to load, fewer I/O operations. | **Individual JSON files** - matches existing lesson pattern, better maintainability |
| **ID Format**: Filename as ID vs. separate ID field | Filename as ID: simpler, URL-friendly. Separate field: more flexible, can change filename. | **Filename as ID** - matches lesson pattern, keeps things simple |
| **Schema Strictness**: Strict validation vs. flexible | Strict: catches errors early, ensures consistency. Flexible: easier to create content, fewer validation errors. | **Strict validation** - quality is critical for educational content |
| **Category System**: Hierarchical vs. flat | Hierarchical: allows nested categories (e.g., Verbs > Tenses > Present). Flat: simpler, easier to implement. | **Flat with topic field** - start simple, can extend later if needed |

### Alternatives Considered

- **Alternative 1**: Store all entries in a single JSON array file
  - Rejected because: Harder to maintain, merge conflicts, can't partially load
  
- **Alternative 2**: Use YAML instead of JSON
  - Rejected because: JSON is already used for lessons, consistent with project patterns
  
- **Alternative 3**: Create a database table for reference entries
  - Rejected because: Phase 1-4 use JSON files for content, database is for session data

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **Number of entries**: "50+" - exact target? | Should we aim for exactly 50 or more? | Aim for 50-60 to start, can add more later |
| **Category system**: How specific should categories be? | Should we use the same topics as lessons? | Use consistent topic categories from lessons (Verbs, Nouns, etc.) |
| **Definition length**: How long should definitions be? | No guidance on length/format | Keep concise (1-3 sentences) but thorough |
| **Examples count**: How many examples per entry? | No specified minimum | Require at least 2 examples per entry |
| **Pitfalls count**: How many common pitfalls? | No specified minimum | Require at least 1 pitfall per entry |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **Special characters in term**: Terms like "Ça", "Lmarshal's" | JSON must handle Unicode properly | Use UTF-8 encoding, validate JSON parsing |
| **Empty examples array**: Entry with no examples | Violates acceptance criteria | Validation should require at least 2 examples |
| **Duplicate term**: Two entries for "subjunctive" | Causes confusion, violates uniqueness | Validation should check for duplicate terms |
| **Invalid category**: Category not in allowed list | Inconsistent filtering | Use enum or predefined list of categories |
| **Very long definition**: Definition exceeds reasonable length | Affects display/readability | Add max length validation (e.g., 500 chars) |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Schema changes**: Schema needs to evolve after creating entries | Would require updating all 50+ files | Design schema carefully upfront, version if needed |
| **Content accuracy**: Non-native French speaker creating entries | Errors in grammar explanations | Use Mistral Large for content generation, human review |
| **Validation performance**: Validating 50+ files is slow | Slow development feedback loop | Optimize validation, validate incrementally |
| **Merge conflicts**: Multiple people working on entries | Git conflicts on JSON files | Assign unique entries to different people, use separate files |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-32-01 | 50+ reference entries | Yes | Need to create 50+ valid entries |
| AC-32-02 | Each entry has term, definition, examples, common pitfalls | Yes | Schema will enforce these fields |
| AC-32-03 | Entries are categorizable | Yes | Add category/topic field to schema |
| AC-32-04 | JSON format in data/grammar/reference/ | Yes | Store files in this directory |

**AC Coverage Summary**: 4 of 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Validation script to ensure quality
- Pydantic models for type safety
- Tests for validation logic
- Consistent category system
- Proper encoding (UTF-8)

---

## REASONS Canvas

### Requirements
- Create 50+ grammar reference entries
- Each entry must have: term, definition, examples, common pitfalls
- Entries must be categorizable
- Must be in JSON format in data/grammar/reference/
- Must follow existing project patterns (similar to grammar lessons)

### Examples

**Example Reference Entry Structure:**
```json
{
  "id": "subjunctive-mood",
  "term": "Le Subjonctif",
  "category": "Verbs",
  "difficulty": "advanced",
  "definition": "The subjunctive mood expresses various states of unreality such as doubt, possibility, necessity, or action that has not yet occurred.",
  "examples": [
    "Il faut que tu **fasses** attention (It's necessary that you pay attention)",
    "Je doute qu'il **vienne** (I doubt that he's coming)",
    "Bien que ce **soit** difficile (Although it is difficult)"
  ],
  "common_pitfalls": [
    "Don't use subjunctive after 'je pense que' - this expresses certainty, not doubt",
    "Remember the subjunctive trigger words: que, bien que, avant que, pour que, etc."
  ],
  "related_terms": ["indicative", "conditional", "imperative"]
}
```

**Example Categories:**
- Verbs (Tenses, Moods, Pronouns)
- Nouns (Gender, Number, Articles)
- Adjectives (Agreement, Position)
- Adverbs
- Prepositions
- Conjunctions
- Pronouns
- Sentence Structure
- Punctuation

### Architecture

**Existing patterns to follow:**
- JSON files in `data/` directory (like `data/grammar_lessons/`)
- Pydantic models in `schemas/` (like `schemas/grammar_lesson.py`)
- Validation scripts in `scripts/` (like `scripts/validate_grammar_lessons.py`)
- Individual JSON files with consistent naming (lowercase with hyphens)

**New components:**
- `data/grammar/reference/` - Directory for reference entry JSON files
- `schemas/grammar_reference.py` - Pydantic models for validation
- `scripts/validate_grammar_reference.py` - Validation script
- `tests/test_grammar_reference.py` - Tests for validation

### Standards

- **Coding**: PEP 8 for Python, consistent with existing codebase
- **Testing**: 80% coverage minimum, pytest framework
- **Documentation**: Docstrings for all public functions, README updates
- **JSON**: UTF-8 encoding, valid JSON, consistent formatting
- **File naming**: Lowercase with hyphens (e.g., `subjunctive-mood.json`)
- **Validation**: Strict type checking, custom validators for non-empty strings

### Omissions

**Explicitly out of scope:**
- Frontend UI for reference guide (future issue)
- Search API endpoint (future issue)
- Integration with lessons or feedback system (future issue)
- User personalization (bookmarks, favorites) (future issue)
- Audio pronunciation (future issue)
- Mobile-specific formatting (future issue)

### Notes

**Implementation hints:**
- Follow the exact pattern from Issue #30 (grammar lessons) for schema, validation, and file structure
- Use similar Pydantic model structure as `schemas/grammar_lesson.py`
- Create validation script similar to `scripts/validate_grammar_lessons.py`
- Reference entry schema should be simpler than lesson schema (no sections)
- Use the same difficulty levels (beginner, intermediate, advanced) for consistency
- Consider using the same topic categories as lessons for consistency

**References:**
- `schemas/grammar_lesson.py` - Model pattern to follow
- `scripts/validate_grammar_lessons.py` - Validation script pattern
- `data/grammar_lessons/*.json` - File structure pattern
- `schemas/grammar_lesson.json` - JSON Schema pattern (if exists)

### Solutions

**Reference implementations to mimic:**
1. **Schema/Validation**: Copy pattern from `schemas/grammar_lesson.py`
   - Use Pydantic BaseModel
   - Add custom validators for non-empty strings
   - Add helper functions for loading/validating files

2. **File Structure**: Copy pattern from `data/grammar_lessons/`
   - Individual JSON files
   - Consistent naming convention
   - UTF-8 encoding

3. **Validation Script**: Copy pattern from `scripts/validate_grammar_lessons.py`
   - Load all files from directory
   - Validate each against schema
   - Report errors and statistics

4. **Testing**: Copy pattern from `tests/test_grammar_lesson_schema.py`
   - Test valid entries
   - Test invalid entries
   - Test edge cases

---

*Analysis based on SPDD methodology from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
