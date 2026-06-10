# SPDD Prompt: Validate Reference Entries Tests

**GitHub Issue**: #33
**Issue Title**: 2.3-T: Validate reference entries
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/33
**Artifact ID**: FLC-027-202606091715
**Created**: 2026-06-09 17:15
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-027-202606091711-[Analysis]-issue-33-validate-reference-entries.md`

---

## Context

### Current Codebase State

The French Language Coach project has a grammar reference guide feature with:
- **50+ reference entries** stored as JSON files in `data/grammar/reference/`
- **Pydantic model** `GrammarReference` in `schemas/grammar_reference.py` with validation rules
- **Existing test file** `tests/test_grammar_reference.py` with comprehensive model and loading tests
- **Filter function** `filter_references()` in `routers/grammar.py` that supports searching by term and category

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `schemas/grammar_reference.py` | Defines GrammarReference model and validation functions | Lines 43-101: GrammarReference class with required fields |
| `schemas/grammar_reference.py` | Load functions | Lines 121-173: load_reference_from_file, load_references_from_directory |
| `tests/test_grammar_reference.py` | Existing tests | Lines 593-654: TestActualReferenceEntries class with actual data tests |
| `routers/grammar.py` | Filter function | Lines 144-195: filter_references function for search/filter |
| `data/grammar/reference/*.json` | Reference entry data | 50+ JSON files with grammar reference content |

### Existing Patterns

- **Test structure**: Uses pytest with clear docstrings for each test function
- **Test classes**: Organized by component (TestGrammarReferenceModel, TestLoadReferenceFromFile, TestLoadReferencesFromDirectory, TestActualReferenceEntries)
- **Naming convention**: `test_<description>()` with descriptive names
- **Assertion style**: Uses pytest.raises() for error cases, direct assertions for success cases
- **Fixtures**: Uses tmp_path for temporary file/directory tests
- **Test data**: Uses both mock data and actual files

---

## Goal

**Primary Objective**: Implement tests to validate the three acceptance criteria from issue #33:
1. All entries have required fields
2. Cross-references work (related_terms point to valid entries)
3. Searchable by term and category

**Secondary Objectives**:
- Extend the `TestActualReferenceEntries` class in `tests/test_grammar_reference.py`
- Follow existing test patterns and conventions
- Ensure tests use actual reference data files
- Achieve 80%+ test coverage for the new functionality

---

## Constraints

### Architecture Constraints
- Must extend existing `tests/test_grammar_reference.py` file
- Must use existing `load_references_from_directory()` and `filter_references()` functions
- Must work with actual JSON files in `data/grammar/reference/`
- Must not modify schemas or loading logic

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must include docstrings for all new test functions
- Must use pytest conventions
- Must maintain existing code patterns

### Testing Constraints
- Must test ALL 50+ reference entries (not just a sample)
- Must test actual data files, not just mocks
- Must achieve 80%+ coverage for new code
- Must identify any data integrity issues

### Acceptance Criteria

From GitHub issue #33:
- [ ] All entries have required fields
- [ ] Cross-references work
- [ ] Searchable by term and category

---

## Examples

### Input/Output Examples

1. **Cross-reference validation**:
   - Input: Reference entry with `related_terms: ["imparfait", "passe-compose"]`
   - Expected: Both "imparfait" and "passe-compose" must exist as valid reference IDs

2. **Category filtering**:
   - Input: `filter_references(all_references, category=GrammarReferenceCategory.VERBS)`
   - Expected: Returns list containing only entries with category="Verbs"

3. **Term searching**:
   - Input: `filter_references(all_references, q="subjunctive")`
   - Expected: Returns list containing entries where term, definition, examples, or pitfalls contain "subjunctive" (case-insensitive)

### Edge Cases

- Entry with empty `related_terms` list (should pass - empty list is valid)
- Entry with `related_terms` referencing non-existent ID (should fail test)
- Entry with `related_terms` that have case mismatches (should fail - IDs are case-sensitive)
- Filtering with no matches (should return empty list)
- Searching with term not found in any entry (should return empty list)

### Test Cases

```python
# Example test structure for cross-reference validation
def test_all_related_terms_are_valid(self):
    """Test that all related_terms in all entries reference valid entry IDs."""
    # Given
    references = load_references_from_directory("data/grammar/reference")
    
    # When/Then
    for ref_id, reference in references.items():
        for related_term in reference.related_terms:
            # Each related_term must be a key in the references dict
            assert related_term in references, \
                f"Reference '{ref_id}' has invalid related_term: '{related_term}'"

# Example test for category filtering
def test_filter_by_category_returns_correct_entries(self):
    """Test that filtering by category returns only entries with that category."""
    # Given
    references = load_references_from_directory("data/grammar/reference")
    
    # When
    verbs = filter_references(references, category=GrammarReferenceCategory.VERBS)
    
    # Then
    assert len(verbs) > 0
    for verb in verbs:
        assert verb.category == GrammarReferenceCategory.VERBS

# Example test for term searching
def test_search_by_term_returns_matching_entries(self):
    """Test that searching by term returns entries matching the search query."""
    # Given
    references = load_references_from_directory("data/grammar/reference")
    
    # When
    results = filter_references(references, q="subjunctive")
    
    # Then
    assert len(results) > 0
    for result in results:
        # At least one field must contain "subjunctive" (case-insensitive)
        assert "subjunctive" in result.term.lower() or \
               "subjunctive" in result.definition.lower() or \
               any("subjunctive" in ex.lower() for ex in result.examples) or \
               any("subjunctive" in pf.lower() for pf in result.common_pitfalls)
```

---

## Deliverables

### Code Changes
- [ ] Extend `TestActualReferenceEntries` class in `tests/test_grammar_reference.py`
- [ ] Add test: `test_all_related_terms_are_valid()` - validates cross-references
- [ ] Add test: `test_filter_by_category_returns_correct_entries()` - validates category filtering
- [ ] Add test: `test_search_by_term_returns_matching_entries()` - validates term searching
- [ ] Add test: `test_filter_by_difficulty_returns_correct_entries()` - validates difficulty filtering (bonus)
- [ ] Add test: `test_search_case_insensitive()` - validates case-insensitive search (bonus)

### Tests
- [ ] Unit tests for cross-reference validation
- [ ] Integration tests for filter_references function
- [ ] Tests covering all acceptance criteria

### Documentation
- [ ] Docstrings for all new test functions
- [ ] Clear error messages in assertions

---

## Actual Prompt

```
IMPLEMENT the following tests for GitHub issue #33: "2.3-T: Validate reference entries"

CONTEXT:
- Project: French Language Coach
- Feature: Grammar reference guide (Phase 2)
- Issue: #33 - Tests for grammar reference content validation
- Existing code:
  * schemas/grammar_reference.py: GrammarReference Pydantic model with validation
  * tests/test_grammar_reference.py: Existing test file with TestActualReferenceEntries class
  * routers/grammar.py: filter_references() function for search/filter
  * data/grammar/reference/: 50+ JSON reference entry files

GOAL:
Extend tests/test_grammar_reference.py to add tests that verify:
1. All entries have required fields (AC1)
2. Cross-references work - all related_terms point to valid entry IDs (AC2)
3. Entries are searchable by term and category using filter_references (AC3)

CONSTRAINTS:
- MUST extend existing TestActualReferenceEntries class
- MUST use actual reference files from data/grammar/reference/
- MUST use existing functions: load_references_from_directory(), filter_references()
- MUST follow existing test patterns in the file
- MUST include docstrings for all new test functions
- MUST use pytest conventions
- MUST NOT modify schemas or loading logic
- MUST achieve 80%+ test coverage

EXAMPLES:
Example 1: Cross-reference validation
  Given: Reference entry with related_terms: ["imparfait"]
  When: Loading all references
  Then: An entry with id="imparfait" must exist

Example 2: Category filtering
  Given: 50+ reference entries with various categories
  When: filter_references(references, category=GrammarReferenceCategory.VERBS)
  Then: Return only entries with category=VERBS

Example 3: Term searching
  Given: Reference entries with terms containing "subjunctive"
  When: filter_references(references, q="subjunctive")
  Then: Return entries where term/definition/examples/pitfalls contain "subjunctive" (case-insensitive)

ACCEPTANCE CRITERIA:
- [ ] All entries have required fields
- [ ] Cross-references work
- [ ] Searchable by term and category

DELIVERABLES:
1. test_all_related_terms_are_valid() - validates all related_terms point to valid IDs
2. test_filter_by_category_returns_correct_entries() - validates category filtering
3. test_search_by_term_returns_matching_entries() - validates term searching
4. (Bonus) test_filter_by_difficulty_returns_correct_entries() - validates difficulty filtering
5. (Bonus) test_combined_filters() - validates multiple filters work together

IMPLEMENTATION NOTES:
- Import filter_references from routers.grammar
- Use load_references_from_directory("data/grammar/reference") to get all references
- Write clear, descriptive test names and docstrings
- Use assert statements with helpful error messages
- Handle edge cases: empty related_terms, no matches, case sensitivity
```

---

## AI Response

[To be populated after implementation]

---

## Human Review Notes

[To be populated after human review]

### Changes Made
- [ ] [Change 1: Description and reason]
- [ ] [Change 2: Description and reason]

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [Issue 1: Description and resolution]
- [Issue 2: Description and resolution]

---

## Verification

- [ ] All acceptance criteria from issue #33 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Prompt ready for implementation.*
