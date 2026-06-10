# SPDD Analysis: Validate Reference Entries

**GitHub Issue**: #33
**Issue Title**: 2.3-T: Validate reference entries
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/33
**Artifact ID**: FLC-027-202606091711
**Created**: 2026-06-09 17:11
**Author**: Mistral Vibe

---

## Original Business Requirement

Tests for grammar reference guide content.

## Acceptance Criteria (ACs)

From GitHub issue #33:
- [ ] All entries have required fields
- [ ] Cross-references work
- [ ] Searchable by term and category

---

## Background

The French Language Coach project includes a grammar reference guide feature (Phase 2) that provides users with concise, searchable definitions of grammar concepts. These reference entries are stored as JSON files in `data/grammar/reference/` and are loaded and validated using Pydantic models defined in `schemas/grammar_reference.py`.

Issue #33 is specifically focused on creating tests to validate that:
1. All 50+ reference entries have all required fields (id, term, category, difficulty, definition, examples, common_pitfalls)
2. Cross-references between entries work correctly (related_terms field)
3. Entries are searchable by term and category

This is a test-only issue (prefix "2.3-T"), meaning it focuses on adding test coverage rather than new functionality.

---

## Business Value

- **Quality Assurance**: Ensures data integrity of grammar reference entries
- **Reliability**: Validates that the reference guide content is complete and consistent
- **Maintainability**: Provides automated validation for future reference entry additions
- **User Experience**: Guarantees that users can find and navigate reference entries effectively

---

## Scope In

- [ ] Tests for required fields validation on all existing reference entries
- [ ] Tests for cross-reference integrity (related_terms point to valid entries)
- [ ] Tests for searchability by term and category
- [ ] Integration with existing test suite in `tests/test_grammar_reference.py`

## Scope Out

- [ ] Creating new reference entries
- [ ] Modifying the GrammarReference schema
- [ ] Modifying the reference loading logic
- [ ] Frontend components for reference display
- [ ] API endpoint modifications

---

## Acceptance Criteria (Detailed)

1. **AC1: All entries have required fields**
   **Given** A reference entry exists in the data directory
   **When** The entry is loaded and validated
   **Then** All required fields (id, term, category, difficulty, definition, examples, common_pitfalls) must be present and non-empty

2. **AC2: Cross-references work**
   **Given** A reference entry has related_terms
   **When** The related_terms are checked against the reference directory
   **Then** All terms in related_terms must correspond to valid reference entry IDs that exist in the directory

3. **AC3: Searchable by term and category**
   **Given** The reference loading and filtering system
   **When** Searching/filtering by term or category
   **Then** The system must return the correct entries matching the search criteria

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **GrammarReference**: Pydantic model in `schemas/grammar_reference.py` that defines the schema for reference entries with validation rules
- **GrammarReferenceCategory**: Enum defining valid categories (Verbs, Nouns, Adjectives, etc.)
- **DifficultyLevel**: Enum for difficulty levels (beginner, intermediate, advanced)
- **load_references_from_directory()**: Function that loads all reference JSON files from a directory and validates them
- **filter_references()**: Function in `routers/grammar.py` that filters and searches reference entries
- **Reference entry data**: 50+ JSON files in `data/grammar/reference/` containing actual grammar reference content

### New Concepts Required

None - This is a test-only issue. We will add new test cases to validate the existing concepts.

### Key Business Rules

- All reference entries must conform to the GrammarReference schema
- Reference IDs must be unique across all entries
- Related terms must reference existing entry IDs
- All required fields must be non-empty
- Lists (examples, common_pitfalls, related_terms) must contain non-empty strings
- Category must be one of the valid GrammarReferenceCategory values
- Difficulty must be one of the valid DifficultyLevel values

---

## Strategic Approach

### Solution Direction

1. **Extend existing test file**: Add new test cases to `tests/test_grammar_reference.py`
2. **Test cross-references**: Create tests that verify all related_terms in all entries point to valid, existing reference IDs
3. **Test searchability**: Verify that filtering by term and category works correctly using the existing filter_references function
4. **Leverage existing patterns**: Follow the same testing patterns already established in the test file

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Test location | Could create separate test file vs. extend existing | Extend `tests/test_grammar_reference.py` to keep all reference tests together |
| Test scope | Unit tests vs. integration tests | Both: unit tests for validation, integration tests for cross-references |
| Test data | Use actual files vs. mock data | Use actual reference files to validate real data |

### Alternatives Considered

- **Alternative 1**: Create a separate test file `tests/test_reference_validation.py` - Rejected because it would fragment reference-related tests
- **Alternative 2**: Only test a sample of entries - Rejected because AC requires ALL entries to be validated
- **Alternative 3**: Use mock data only - Rejected because we need to validate actual data files

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| "Cross-references work" | What exactly does this mean? | Interpret as: all related_terms in all entries must point to valid reference IDs |
| "Searchable by term and category" | How is this implemented? | Use existing filter_references function which already supports this |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Related term references non-existent entry | Ensures data integrity | Test should fail and identify the invalid reference |
| Entry has no related_terms | Empty list is valid | Test should pass |
| Related term is case-sensitive | IDs are case-sensitive | Test must match exact case |
| Duplicate IDs in directory | Breaks uniqueness constraint | Already tested in existing tests |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Test failures due to invalid data | Blocks CI/CD pipeline | Tests will identify data issues that need fixing |
| Performance of loading all entries | Slow test execution | Already acceptable (50 entries is small) |
| False positives in tests | Missed validation issues | Write thorough assertions |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | All entries have required fields | Yes | Existing test `test_all_entries_have_required_fields` already covers this, but we should enhance it |
| AC2 | Cross-references work | Yes | Need to add new test to verify related_terms point to valid entries |
| AC3 | Searchable by term and category | Yes | Need to add tests for filter_references function |

**AC Coverage Summary**: All 3 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Related terms that reference non-existent entries should be identified
- Search functionality should be case-insensitive where appropriate

---

## REASONS Canvas

### Requirements
From GitHub issue #33 acceptance criteria:
- All entries have required fields
- Cross-references work
- Searchable by term and category

### Examples
Concrete test cases:
1. Entry with id="passe-compose" has all required fields
2. Entry with related_terms=["imparfait"] should find an entry with id="imparfait"
3. Filtering by category="Verbs" should return all verb entries
4. Searching by term="subjunctive" should return matching entries

### Architecture
Existing codebase structure:
- Pydantic models in `schemas/grammar_reference.py`
- Reference data in `data/grammar/reference/*.json`
- Test file at `tests/test_grammar_reference.py`
- Filter function in `routers/grammar.py`

### Standards
- Must follow existing pytest patterns in the codebase
- Must achieve 80%+ test coverage
- Must follow PEP 8 style
- Must include docstrings for new test functions

### Omissions
- Creating new reference entries
- Modifying schemas or loading logic
- Frontend implementation
- API endpoint changes

### Notes
- Existing test `TestActualReferenceEntries` already validates required fields
- Need to add cross-reference validation
- Need to add search/filter validation
- Use actual data files, not mocks

### Solutions
- Extend `TestActualReferenceEntries` class in `tests/test_grammar_reference.py`
- Add test for cross-reference integrity: `test_all_related_terms_are_valid`
- Add tests for search/filter: `test_filter_by_category`, `test_search_by_term`
- Follow existing test patterns from the file

---

*Analysis complete. Ready for prompt creation.*
