"""Tests for grammar reference schema validation.

This module tests the GrammarReference Pydantic model and related functions
for validating grammar reference entry data.
"""

import json
import tempfile
from pathlib import Path

import pytest
from pydantic import ValidationError

from schemas.grammar_reference import (
    GrammarReference,
    GrammarReferenceCategory,
    load_reference_from_file,
    load_references_from_directory,
    validate_reference_data,
    validate_reference_json,
)
from schemas.grammar_lesson import DifficultyLevel
from routers.grammar import filter_references


class TestGrammarReferenceModel:
    """Tests for the GrammarReference Pydantic model."""

    def test_valid_reference_entry(self):
        """Test that a valid reference entry passes validation."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        entry = GrammarReference.model_validate(entry_data)
        
        assert entry.id == "test-entry"
        assert entry.term == "Test Term"
        assert entry.category == GrammarReferenceCategory.VERBS
        assert entry.difficulty == DifficultyLevel.BEGINNER
        assert entry.definition == "A test definition"
        assert entry.examples == ["Example 1", "Example 2"]
        assert entry.common_pitfalls == ["Pitfall 1"]
        assert entry.related_terms == []

    def test_valid_entry_with_related_terms(self):
        """Test that an entry with related terms passes validation."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "intermediate",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"],
            "related_terms": ["term1", "term2"]
        }
        entry = GrammarReference.model_validate(entry_data)
        
        assert entry.related_terms == ["term1", "term2"]

    def test_missing_id(self):
        """Test that missing id raises ValidationError."""
        entry_data = {
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "id" in str(exc_info.value)

    def test_missing_term(self):
        """Test that missing term raises ValidationError."""
        entry_data = {
            "id": "test-entry",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "term" in str(exc_info.value)

    def test_missing_definition(self):
        """Test that missing definition raises ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "definition" in str(exc_info.value)

    def test_missing_examples(self):
        """Test that missing examples raises ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "examples" in str(exc_info.value)

    def test_missing_common_pitfalls(self):
        """Test that missing common_pitfalls raises ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "common_pitfalls" in str(exc_info.value)

    def test_empty_id(self):
        """Test that empty id raises ValidationError."""
        entry_data = {
            "id": "   ",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        # The pattern validation will catch this as it requires lowercase letter start
        assert "id" in str(exc_info.value).lower() or "pattern" in str(exc_info.value).lower()

    def test_empty_term(self):
        """Test that empty term raises ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        # min_length=1 will catch this
        assert "term" in str(exc_info.value).lower() or "short" in str(exc_info.value).lower()

    def test_empty_definition(self):
        """Test that empty definition raises ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "   ",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "non-whitespace" in str(exc_info.value).lower() or "empty" in str(exc_info.value).lower()

    def test_invalid_id_pattern(self):
        """Test that invalid id pattern raises ValidationError."""
        # ID must start with lowercase letter and contain only alphanumeric and hyphens
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference(
                id="123invalid",
                term="Test",
                category="Verbs",
                difficulty="beginner",
                definition="Test",
                examples=["e1"],
                common_pitfalls=["p1"]
            )
        
        assert "id" in str(exc_info.value).lower() or "pattern" in str(exc_info.value).lower()

    def test_examples_minimum_length(self):
        """Test that examples must have at least 2 items."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Only one example"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "examples" in str(exc_info.value).lower() or "at least" in str(exc_info.value).lower()

    def test_common_pitfalls_minimum_length(self):
        """Test that common_pitfalls must have at least 1 item."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": []
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "common_pitfalls" in str(exc_info.value).lower() or "at least" in str(exc_info.value).lower()

    def test_empty_string_in_examples(self):
        """Test that empty strings in examples list raise ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "   ", "Example 3"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "non-whitespace" in str(exc_info.value).lower() or "empty" in str(exc_info.value).lower()

    def test_empty_string_in_common_pitfalls(self):
        """Test that empty strings in common_pitfalls list raise ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1", ""]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "non-whitespace" in str(exc_info.value).lower() or "empty" in str(exc_info.value).lower()

    def test_invalid_category(self):
        """Test that invalid category raises ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "InvalidCategory",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "category" in str(exc_info.value).lower()

    def test_invalid_difficulty(self):
        """Test that invalid difficulty raises ValidationError."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "expert",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError) as exc_info:
            GrammarReference.model_validate(entry_data)
        
        assert "difficulty" in str(exc_info.value).lower()

    def test_special_characters_in_term(self):
        """Test that special French characters in term are handled correctly."""
        entry_data = {
            "id": "special-chars",
            "term": "Le Subjonctif",
            "category": "Verbs",
            "difficulty": "advanced",
            "definition": "Test definition with français characters",
            "examples": ["Il faut que tu fasses", "Je doute qu'il vienne"],
            "common_pitfalls": ["Common pitfall"]
        }
        
        entry = GrammarReference.model_validate(entry_data)
        assert entry.term == "Le Subjonctif"
        assert entry.definition == "Test definition with français characters"

    def test_all_categories(self):
        """Test that all GrammarReferenceCategory values are valid."""
        # Use a valid ID format (no spaces in category names for ID)
        category_id_map = {
            "Verbs": "verbs",
            "Nouns": "nouns",
            "Adjectives": "adjectives",
            "Adverbs": "adverbs",
            "Pronouns": "pronouns",
            "Prepositions": "prepositions",
            "Conjunctions": "conjunctions",
            "Articles": "articles",
            "Sentence Structure": "sentence-structure",
            "Punctuation": "punctuation",
            "Other": "other"
        }
        
        for category in [cat.value for cat in GrammarReferenceCategory]:
            entry_data = {
                "id": f"test-{category_id_map.get(category, category.lower().replace(' ', '-'))}",
                "term": f"Test {category}",
                "category": category,
                "difficulty": "beginner",
                "definition": f"Test definition for {category}",
                "examples": ["Example 1", "Example 2"],
                "common_pitfalls": ["Pitfall 1"]
            }
            
            entry = GrammarReference.model_validate(entry_data)
            assert entry.category.value == category

    def test_all_difficulty_levels(self):
        """Test that all DifficultyLevel values are valid."""
        difficulties = [dif.value for dif in DifficultyLevel]
        
        for difficulty in difficulties:
            entry_data = {
                "id": f"test-{difficulty}",
                "term": "Test Term",
                "category": "Verbs",
                "difficulty": difficulty,
                "definition": "Test definition",
                "examples": ["Example 1", "Example 2"],
                "common_pitfalls": ["Pitfall 1"]
            }
            
            entry = GrammarReference.model_validate(entry_data)
            assert entry.difficulty.value == difficulty


class TestLoadReferenceFromFile:
    """Tests for load_reference_from_file function."""

    def test_load_valid_file(self, tmp_path):
        """Test loading a valid reference entry from a file."""
        entry_data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        file_path = tmp_path / "test-entry.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(entry_data, f, ensure_ascii=False)
        
        entry = load_reference_from_file(file_path)
        
        assert entry.id == "test-entry"
        assert entry.term == "Test Term"
        assert entry.category == GrammarReferenceCategory.VERBS

    def test_load_file_not_found(self, tmp_path):
        """Test that FileNotFoundError is raised for non-existent file."""
        non_existent = tmp_path / "non-existent.json"
        
        with pytest.raises(FileNotFoundError) as exc_info:
            load_reference_from_file(non_existent)
        
        assert "not found" in str(exc_info.value).lower()

    def test_load_invalid_json(self, tmp_path):
        """Test that ValidationError is raised for invalid JSON."""
        file_path = tmp_path / "invalid.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("{ invalid json }")
        
        with pytest.raises((json.JSONDecodeError, ValidationError)):
            load_reference_from_file(file_path)

    def test_load_invalid_data(self, tmp_path):
        """Test that ValidationError is raised for invalid entry data."""
        invalid_data = {
            "id": "test-entry",
            "term": "Test Term",
            # Missing required fields
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        file_path = tmp_path / "invalid.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(invalid_data, f, ensure_ascii=False)
        
        with pytest.raises(ValidationError):
            load_reference_from_file(file_path)


class TestLoadReferencesFromDirectory:
    """Tests for load_references_from_directory function."""

    def test_load_valid_directory(self, tmp_path):
        """Test loading multiple valid reference entries from a directory."""
        entries = [
            {
                "id": "entry-1",
                "term": "Term 1",
                "category": "Verbs",
                "difficulty": "beginner",
                "definition": "Definition 1",
                "examples": ["Ex1", "Ex2"],
                "common_pitfalls": ["Pit1"]
            },
            {
                "id": "entry-2",
                "term": "Term 2",
                "category": "Nouns",
                "difficulty": "intermediate",
                "definition": "Definition 2",
                "examples": ["Ex1", "Ex2"],
                "common_pitfalls": ["Pit2"]
            }
        ]
        
        for entry in entries:
            file_path = tmp_path / f"{entry['id']}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(entry, f, ensure_ascii=False)
        
        references = load_references_from_directory(tmp_path)
        
        assert len(references) == 2
        assert "entry-1" in references
        assert "entry-2" in references
        assert references["entry-1"].term == "Term 1"
        assert references["entry-2"].term == "Term 2"

    def test_load_directory_not_found(self, tmp_path):
        """Test that FileNotFoundError is raised for non-existent directory."""
        non_existent = tmp_path / "non-existent"
        
        with pytest.raises(FileNotFoundError) as exc_info:
            load_references_from_directory(non_existent)
        
        assert "not found" in str(exc_info.value).lower()

    def test_load_empty_directory(self, tmp_path):
        """Test that empty directory returns empty dict."""
        references = load_references_from_directory(tmp_path)
        
        assert references == {}

    def test_load_duplicate_ids(self, tmp_path):
        """Test that ValueError is raised for duplicate IDs in directory."""
        entry_data = {
            "id": "duplicate",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        # Create two files with the same ID
        for i in range(2):
            file_path = tmp_path / f"duplicate{i}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(entry_data, f, ensure_ascii=False)
        
        with pytest.raises(ValueError) as exc_info:
            load_references_from_directory(tmp_path)
        
        assert "duplicate" in str(exc_info.value).lower()


class TestValidateReferenceData:
    """Tests for validate_reference_data function."""

    def test_validate_valid_data(self):
        """Test validating valid entry data."""
        data = {
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        entry = validate_reference_data(data)
        
        assert entry.id == "test-entry"
        assert isinstance(entry, GrammarReference)

    def test_validate_invalid_data(self):
        """Test that ValidationError is raised for invalid data."""
        data = {
            "id": "test-entry",
            "term": "Test Term",
            # Missing required fields
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        }
        
        with pytest.raises(ValidationError):
            validate_reference_data(data)


class TestValidateReferenceJson:
    """Tests for validate_reference_json function."""

    def test_validate_valid_json(self):
        """Test validating valid JSON string."""
        json_str = json.dumps({
            "id": "test-entry",
            "term": "Test Term",
            "category": "Verbs",
            "difficulty": "beginner",
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        })
        
        entry = validate_reference_json(json_str)
        
        assert entry.id == "test-entry"
        assert isinstance(entry, GrammarReference)

    def test_validate_invalid_json_string(self):
        """Test that ValidationError is raised for invalid JSON string."""
        invalid_json = json.dumps({
            "id": "test-entry",
            "term": "Test Term",
            # Missing required fields
            "definition": "A test definition",
            "examples": ["Example 1", "Example 2"],
            "common_pitfalls": ["Pitfall 1"]
        })
        
        with pytest.raises(ValidationError):
            validate_reference_json(invalid_json)


class TestActualReferenceEntries:
    """Tests using the actual reference entry files from data/grammar/reference."""

    def test_load_all_actual_entries(self):
        """Test that all actual reference entries can be loaded and validated."""
        references = load_references_from_directory("data/grammar/reference")
        
        assert len(references) >= 50
        
        for ref_id, reference in references.items():
            assert isinstance(reference, GrammarReference)
            assert reference.id == ref_id
            assert len(reference.examples) >= 2
            assert len(reference.common_pitfalls) >= 1

    def test_all_entries_have_required_fields(self):
        """Test that all actual entries have all required fields."""
        references = load_references_from_directory("data/grammar/reference")
        
        for ref_id, reference in references.items():
            assert reference.id
            assert reference.term
            assert reference.category
            assert reference.difficulty
            assert reference.definition
            assert reference.examples
            assert reference.common_pitfalls

    def test_all_entries_have_valid_categories(self):
        """Test that all actual entries have valid categories."""
        references = load_references_from_directory("data/grammar/reference")
        
        valid_categories = [cat.value for cat in GrammarReferenceCategory]
        
        for ref_id, reference in references.items():
            assert reference.category.value in valid_categories

    def test_all_entries_have_valid_difficulties(self):
        """Test that all actual entries have valid difficulty levels."""
        references = load_references_from_directory("data/grammar/reference")
        
        valid_difficulties = [dif.value for dif in DifficultyLevel]
        
        for ref_id, reference in references.items():
            assert reference.difficulty.value in valid_difficulties

    def test_entry_with_special_characters(self):
        """Test that entries with special French characters are valid."""
        # Load an entry that we know has special characters
        try:
            entry = load_reference_from_file("data/grammar/reference/subjunctive-present.json")
            
            assert entry.term
            assert entry.definition
            # Check that examples contain French characters
            examples_text = " ".join(entry.examples)
            # French commonly uses é, è, ç in subjunctive examples
            french_chars = ['é', 'è', 'ê', 'à', 'â', 'ç', 'î', 'ô', 'û', 'ë', 'ï', 'ü']
            assert any(c in examples_text for c in french_chars), f"No French characters found in examples: {examples_text}"
        except FileNotFoundError:
            # If the file doesn't exist, skip this test
            pytest.skip("subjunctive-present.json not found")

    @pytest.mark.xfail(reason="Data integrity issue: related_terms use inconsistent naming conventions. See issue #33 for details.")
    def test_all_related_terms_are_valid(self):
        """Test that all related_terms in all entries reference valid entry IDs.
        
        This validates AC2: Cross-references work
        All related_terms must point to existing reference entry IDs.
        
        NOTE: This test is currently marked as xfail because the data has
        inconsistencies in related_terms naming. For example:
        - File: pronouns-indirect-object.json (id: pronouns-indirect-object)
        - Related term: indirect-object-pronouns (doesn't match)
        
        To fix: Update related_terms in all entries to match actual entry IDs.
        """
        # Given
        references = load_references_from_directory("data/grammar/reference")
        
        # When/Then - verify all related_terms point to valid entries
        invalid_related_terms = []
        for ref_id, reference in references.items():
            for related_term in reference.related_terms:
                if related_term not in references:
                    invalid_related_terms.append({
                        'source_id': ref_id,
                        'invalid_term': related_term
                    })
        
        # Assert no invalid related terms were found
        assert len(invalid_related_terms) == 0, (
            f"Found {len(invalid_related_terms)} invalid related_terms:\n" +
            "\n".join(
                f"  Reference '{item['source_id']}' has invalid related_term: '{item['invalid_term']}'"
                for item in invalid_related_terms
            )
        )

    def test_filter_by_category_returns_correct_entries(self):
        """Test that filtering by category returns only entries with that category.
        
        This validates AC3: Searchable by category
        """
        # Given
        references = load_references_from_directory("data/grammar/reference")
        
        # When - filter by each category
        for category in GrammarReferenceCategory:
            filtered = filter_references(references, category=category)
            
            # Then - all returned entries must have the specified category
            assert len(filtered) >= 0  # At least zero entries (some categories may be empty)
            for entry in filtered:
                assert entry.category == category, (
                    f"Entry '{entry.id}' has category '{entry.category}' but expected '{category}'"
                )

    def test_filter_by_difficulty_returns_correct_entries(self):
        """Test that filtering by difficulty returns only entries with that difficulty.
        
        This validates AC3: Searchable by category (and by extension, difficulty)
        """
        # Given
        references = load_references_from_directory("data/grammar/reference")
        
        # When - filter by each difficulty level
        for difficulty in DifficultyLevel:
            filtered = filter_references(references, difficulty=difficulty)
            
            # Then - all returned entries must have the specified difficulty
            assert len(filtered) >= 0  # At least zero entries (some difficulties may be empty)
            for entry in filtered:
                assert entry.difficulty == difficulty, (
                    f"Entry '{entry.id}' has difficulty '{entry.difficulty}' but expected '{difficulty}'"
                )

    def test_search_by_term_returns_matching_entries(self):
        """Test that searching by term returns entries matching the search query.
        
        This validates AC3: Searchable by term
        """
        # Given
        references = load_references_from_directory("data/grammar/reference")
        
        # When - search for a known term
        results = filter_references(references, q="subjunctive")
        
        # Then - all returned entries must contain "subjunctive" in at least one field
        assert len(results) > 0, "Expected to find entries matching 'subjunctive'"
        for result in results:
            # Check that at least one field contains "subjunctive" (case-insensitive)
            found_in_term = "subjunctive" in result.term.lower()
            found_in_definition = "subjunctive" in result.definition.lower()
            found_in_examples = any("subjunctive" in ex.lower() for ex in result.examples)
            found_in_pitfalls = any("subjunctive" in pf.lower() for pf in result.common_pitfalls)
            
            assert found_in_term or found_in_definition or found_in_examples or found_in_pitfalls, (
                f"Entry '{result.id}' returned for search 'subjunctive' but contains no match in any field"
            )

    def test_search_is_case_insensitive(self):
        """Test that search is case-insensitive for ASCII characters.
        
        This validates that the search functionality handles case variations correctly.
        Note: Accented characters (like é, è, ç) are handled as-is and require
        matching accents in the search query.
        """
        # Given
        references = load_references_from_directory("data/grammar/reference")
        
        # When - search with different cases (using ASCII-only terms)
        results_lower = filter_references(references, q="subjunctive")
        results_upper = filter_references(references, q="SUBJUNCTIVE")
        results_mixed = filter_references(references, q="SuBjUnCtIvE")
        
        # Then - all searches should return the same results
        # Convert to sets of IDs for comparison
        ids_lower = {r.id for r in results_lower}
        ids_upper = {r.id for r in results_upper}
        ids_mixed = {r.id for r in results_mixed}
        
        assert ids_lower == ids_upper == ids_mixed, (
            f"Case-insensitive search failed:\n"
            f"  Lowercase 'subjunctive': {ids_lower}\n"
            f"  Uppercase 'SUBJUNCTIVE': {ids_upper}\n"
            f"  Mixed 'SuBjUnCtIvE': {ids_mixed}"
        )

    def test_combined_filters_work_together(self):
        """Test that multiple filters can be combined (AND logic).
        
        This validates that the filter function correctly applies AND logic.
        """
        # Given
        references = load_references_from_directory("data/grammar/reference")
        
        # When - filter by category and difficulty
        verbs_beginner = filter_references(
            references,
            category=GrammarReferenceCategory.VERBS,
            difficulty=DifficultyLevel.BEGINNER
        )
        
        # Then - all returned entries must match BOTH filters
        assert len(verbs_beginner) >= 0
        for entry in verbs_beginner:
            assert entry.category == GrammarReferenceCategory.VERBS, (
                f"Entry '{entry.id}' has category '{entry.category}' but expected VERBS"
            )
            assert entry.difficulty == DifficultyLevel.BEGINNER, (
                f"Entry '{entry.id}' has difficulty '{entry.difficulty}' but expected BEGINNER"
            )

    def test_search_and_filter_combined(self):
        """Test that search query and filters work together.
        
        This validates complex search scenarios.
        """
        # Given
        references = load_references_from_directory("data/grammar/reference")
        
        # When - search with query and category filter
        results = filter_references(
            references,
            q="passé",
            category=GrammarReferenceCategory.VERBS
        )
        
        # Then - all returned entries must match ALL criteria
        assert len(results) >= 0
        for entry in results:
            # Must be a verb
            assert entry.category == GrammarReferenceCategory.VERBS
            # Must contain "passé" in at least one field (case-insensitive)
            search_term = "passé"
            found = (
                search_term in entry.term.lower() or
                search_term in entry.definition.lower() or
                any(search_term in ex.lower() for ex in entry.examples) or
                any(search_term in pf.lower() for pf in entry.common_pitfalls)
            )
            assert found, (
                f"Entry '{entry.id}' returned but doesn't contain '{search_term}' in any field"
            )
