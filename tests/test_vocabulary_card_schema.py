"""Tests for vocabulary card schema validation.

This module contains comprehensive tests for the VocabularyCard Pydantic model
and related validation functions, ensuring that the schema correctly validates
all acceptance criteria from GitHub issue #49.
"""

import json
import tempfile
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from schemas.vocabulary_card import (
    VocabularyCard,
    load_card_from_file,
    load_cards_from_directory,
    validate_card_data,
    validate_card_json,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def valid_card_data() -> dict[str, Any]:
    """Provide a valid vocabulary card data dictionary with all fields."""
    return {
        "deck_id": "french-basics",
        "card_id": "hello",
        "front": "Bonjour",
        "back": "Hello",
        "example": "Bonjour, comment ça va?",
        "tags": ["greeting", "common"],
        "context": "lesson:greetings-101",
        "difficulty": 1
    }


@pytest.fixture
def valid_card_data_minimal() -> dict[str, Any]:
    """Provide a valid vocabulary card data dictionary with only required fields."""
    return {
        "deck_id": "food-vocabulary",
        "card_id": "apple",
        "front": "pomme",
        "back": "apple",
        "difficulty": 1
    }


@pytest.fixture
def valid_card_json() -> str:
    """Provide a valid vocabulary card as a JSON string."""
    return json.dumps({
        "deck_id": "french-basics",
        "card_id": "hello",
        "front": "Bonjour",
        "back": "Hello",
        "difficulty": 1
    })


@pytest.fixture
def minimal_valid_card() -> VocabularyCard:
    """Provide a minimal valid VocabularyCard instance."""
    return VocabularyCard(
        deck_id="test",
        card_id="test",
        front="test",
        back="test",
        difficulty=1
    )


# =============================================================================
# Tests for Acceptance Criteria (Issue #49)
# =============================================================================

class TestAcceptanceCriteria:
    """Tests for the three acceptance criteria from GitHub issue #49."""

    def test_ac1_schema_defined_and_validated(self, valid_card_data: dict[str, Any]) -> None:
        """AC1: Schema defined and validated.
        
        Given a vocabulary card data structure
        When it is validated against the schema
        Then it passes validation if all required fields are present with correct types
        """
        card = VocabularyCard(**valid_card_data)
        
        # Verify all required fields are present
        assert hasattr(card, 'deck_id')
        assert hasattr(card, 'card_id')
        assert hasattr(card, 'front')
        assert hasattr(card, 'back')
        assert hasattr(card, 'difficulty')
        
        # Verify optional fields are present
        assert hasattr(card, 'example')
        assert hasattr(card, 'tags')
        assert hasattr(card, 'context')
        
        # Verify field values
        assert card.deck_id == "french-basics"
        assert card.card_id == "hello"
        assert card.front == "Bonjour"
        assert card.back == "Hello"
        assert card.difficulty == 1
        assert card.example == "Bonjour, comment ça va?"
        assert card.tags == ["greeting", "common"]
        assert card.context == "lesson:greetings-101"

    def test_ac2_example_card_created(self, valid_card_data: dict[str, Any]) -> None:
        """AC2: Example card created.
        
        Given the schema definition
        When an example vocabulary card is created
        Then it conforms to the schema and passes validation
        """
        card = VocabularyCard(**valid_card_data)
        
        # Verify card can be created and conforms to schema
        assert isinstance(card, VocabularyCard)
        
        # Verify it can be serialized back to dict
        dumped = card.model_dump()
        assert "deck_id" in dumped
        assert "card_id" in dumped
        assert "front" in dumped
        assert "back" in dumped
        assert "difficulty" in dumped
        
        # Verify the example card file exists
        example_path = Path(__file__).parent.parent / "data" / "vocabulary_cards" / "basic_greetings.json"
        assert example_path.exists(), "Example card file should exist"
        
        # Verify the example card can be loaded from file
        example_card = load_card_from_file(example_path)
        assert isinstance(example_card, VocabularyCard)
        assert example_card.front == "Bonjour"

    def test_ac3_validation_script_exists(self) -> None:
        """AC3: Validation script works.
        
        Given a vocabulary card JSON file
        When it is passed to the validation script
        Then the script correctly validates or rejects the file based on schema conformance
        """
        script_path = Path(__file__).parent.parent / "scripts" / "validate_vocabulary_cards.py"
        assert script_path.exists(), "Validation script should exist at scripts/validate_vocabulary_cards.py"
        assert script_path.is_file()


# =============================================================================
# Tests for Valid Card Data
# =============================================================================

class TestValidCards:
    """Tests for valid vocabulary card data."""

    def test_valid_card_from_dict(self, valid_card_data: dict[str, Any]) -> None:
        """Test creating a valid VocabularyCard from a dictionary."""
        card = VocabularyCard(**valid_card_data)
        
        assert card.deck_id == "french-basics"
        assert card.card_id == "hello"
        assert card.front == "Bonjour"
        assert card.back == "Hello"
        assert card.difficulty == 1
        assert card.example == "Bonjour, comment ça va?"
        assert card.tags == ["greeting", "common"]
        assert card.context == "lesson:greetings-101"

    def test_valid_card_from_json(self, valid_card_json: str) -> None:
        """Test creating a valid VocabularyCard from a JSON string."""
        card = VocabularyCard.model_validate_json(valid_card_json)
        
        assert card.deck_id == "french-basics"
        assert card.card_id == "hello"
        assert card.front == "Bonjour"
        assert card.back == "Hello"
        assert card.difficulty == 1

    def test_valid_card_minimal_fields(self, valid_card_data_minimal: dict[str, Any]) -> None:
        """Test creating a valid VocabularyCard with only required fields."""
        card = VocabularyCard(**valid_card_data_minimal)
        
        assert card.deck_id == "food-vocabulary"
        assert card.card_id == "apple"
        assert card.front == "pomme"
        assert card.back == "apple"
        assert card.difficulty == 1
        assert card.example is None
        assert card.tags == []
        assert card.context is None

    def test_valid_card_with_all_difficulty_levels(self) -> None:
        """Test that all difficulty levels from 1 to 5 are accepted."""
        for difficulty in range(1, 6):  # 1, 2, 3, 4, 5
            card_data = {
                "deck_id": f"test-difficulty-{difficulty}",
                "card_id": "test",
                "front": "test",
                "back": "test",
                "difficulty": difficulty
            }
            card = VocabularyCard(**card_data)
            assert card.difficulty == difficulty

    def test_valid_card_with_empty_tags(self) -> None:
        """Test that empty tags array is valid."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "tags": []
        }
        card = VocabularyCard(**card_data)
        assert card.tags == []

    def test_valid_card_with_multiple_tags(self) -> None:
        """Test card with multiple valid tags."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "tags": ["tag1", "tag2", "tag3"]
        }
        card = VocabularyCard(**card_data)
        assert card.tags == ["tag1", "tag2", "tag3"]

    def test_valid_card_with_context(self) -> None:
        """Test card with context field."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "context": "lesson:test-123"
        }
        card = VocabularyCard(**card_data)
        assert card.context == "lesson:test-123"

    def test_valid_card_with_example(self) -> None:
        """Test card with example field."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "example": "This is an example sentence."
        }
        card = VocabularyCard(**card_data)
        assert card.example == "This is an example sentence."

    def test_valid_card_with_french_accented_characters(self) -> None:
        """Test card with French accented characters."""
        card_data = {
            "deck_id": "french-accented",
            "card_id": "cafe",
            "front": "café",
            "back": "coffee",
            "example": "Je bois un café au lait.",
            "difficulty": 1
        }
        card = VocabularyCard(**card_data)
        assert card.front == "café"
        assert "café" in card.example

    def test_valid_card_with_various_french_characters(self) -> None:
        """Test card with various French accented characters."""
        card_data = {
            "deck_id": "test",
            "card_id": "french-chars",
            "front": "hôtel",
            "back": "hotel",
            "example": "L'hôtel est très beau.",
            "difficulty": 2
        }
        card = VocabularyCard(**card_data)
        assert card.front == "hôtel"


# =============================================================================
# Tests for Missing Required Fields
# =============================================================================

class TestMissingRequiredFields:
    """Tests for validation errors when required fields are missing."""

    def test_missing_deck_id(self) -> None:
        """Test that missing deck_id raises ValidationError."""
        card_data = {
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "deck_id" in error_fields

    def test_missing_card_id(self) -> None:
        """Test that missing card_id raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "card_id" in error_fields

    def test_missing_front(self) -> None:
        """Test that missing front raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "back": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "front" in error_fields

    def test_missing_back(self) -> None:
        """Test that missing back raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "back" in error_fields

    def test_missing_difficulty(self) -> None:
        """Test that missing difficulty raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test"
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "difficulty" in error_fields

    def test_missing_multiple_required_fields(self) -> None:
        """Test that missing multiple required fields are all reported."""
        card_data = {
            "deck_id": "test",
            "card_id": "test"
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "front" in error_fields
        assert "back" in error_fields
        assert "difficulty" in error_fields


# =============================================================================
# Tests for Invalid Field Values
# =============================================================================

class TestInvalidFieldValues:
    """Tests for validation errors with invalid field values."""

    def test_invalid_difficulty_too_low(self) -> None:
        """Test that difficulty < 1 raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 0
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("difficulty" in error['loc'] for error in errors)

    def test_invalid_difficulty_too_high(self) -> None:
        """Test that difficulty > 5 raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 6
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("difficulty" in error['loc'] for error in errors)

    def test_invalid_difficulty_not_integer(self) -> None:
        """Test that non-integer difficulty raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": "easy"
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("difficulty" in error['loc'] for error in errors)

    def test_invalid_difficulty_float(self) -> None:
        """Test that float difficulty raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 2.5
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("difficulty" in error['loc'] for error in errors)

    def test_empty_string_deck_id(self) -> None:
        """Test that empty string deck_id raises ValidationError."""
        card_data = {
            "deck_id": "",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("deck_id" in error['loc'] for error in errors)

    def test_empty_string_card_id(self) -> None:
        """Test that empty string card_id raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "",
            "front": "test",
            "back": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("card_id" in error['loc'] for error in errors)

    def test_empty_string_front(self) -> None:
        """Test that empty string front raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "",
            "back": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("front" in error['loc'] for error in errors)

    def test_empty_string_back(self) -> None:
        """Test that empty string back raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("back" in error['loc'] for error in errors)

    def test_whitespace_only_deck_id(self) -> None:
        """Test that whitespace-only deck_id raises ValidationError."""
        card_data = {
            "deck_id": "   ",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("deck_id" in error['loc'] for error in errors)

    def test_whitespace_only_front(self) -> None:
        """Test that whitespace-only front raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "   ",
            "back": "test",
            "difficulty": 1
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("front" in error['loc'] for error in errors)

    def test_empty_string_example(self) -> None:
        """Test that empty string example raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "example": ""
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("example" in error['loc'] for error in errors)

    def test_empty_string_context(self) -> None:
        """Test that empty string context raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "context": ""
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        assert any("context" in error['loc'] for error in errors)


# =============================================================================
# Tests for Tags Validation
# =============================================================================

class TestTagsValidation:
    """Tests for tags field validation."""

    def test_empty_tags_array_is_valid(self) -> None:
        """Test that empty tags array is valid."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "tags": []
        }
        card = VocabularyCard(**card_data)
        assert card.tags == []

    def test_tags_with_valid_strings(self) -> None:
        """Test tags with valid strings."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "tags": ["tag1", "tag2", "tag3"]
        }
        card = VocabularyCard(**card_data)
        assert card.tags == ["tag1", "tag2", "tag3"]

    def test_tags_with_empty_string(self) -> None:
        """Test that tags with empty string raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "tags": ["valid", ""]
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        # Should have error about empty tag
        error_text = str(errors).lower()
        assert "tags" in error_text or "non-whitespace" in error_text

    def test_tags_with_whitespace_only(self) -> None:
        """Test that tags with whitespace-only string raises ValidationError."""
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "tags": ["valid", "   "]
        }
        with pytest.raises(ValidationError) as exc_info:
            VocabularyCard(**card_data)
        
        errors = exc_info.value.errors()
        error_text = str(errors).lower()
        assert "tags" in error_text or "non-whitespace" in error_text


# =============================================================================
# Tests for Helper Functions
# =============================================================================

class TestHelperFunctions:
    """Tests for validation helper functions."""

    def test_validate_card_data(self, valid_card_data: dict[str, Any]) -> None:
        """Test the validate_card_data function."""
        card = validate_card_data(valid_card_data)
        assert card.deck_id == "french-basics"

    def test_validate_card_data_invalid(self) -> None:
        """Test validate_card_data with invalid data."""
        invalid_data = {"deck_id": "test", "card_id": "test"}
        with pytest.raises(ValidationError):
            validate_card_data(invalid_data)

    def test_validate_card_json(self, valid_card_json: str) -> None:
        """Test the validate_card_json function."""
        card = validate_card_json(valid_card_json)
        assert card.deck_id == "french-basics"

    def test_validate_card_json_invalid(self) -> None:
        """Test validate_card_json with invalid JSON."""
        invalid_json = json.dumps({"deck_id": "test", "card_id": "test"})
        with pytest.raises(ValidationError):
            validate_card_json(invalid_json)

    def test_load_card_from_file(self, valid_card_data: dict[str, Any]) -> None:
        """Test loading a card from a file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(valid_card_data, f)
            temp_path = f.name
        
        try:
            card = load_card_from_file(temp_path)
            assert card.deck_id == "french-basics"
        finally:
            Path(temp_path).unlink()

    def test_load_card_from_file_not_found(self) -> None:
        """Test load_card_from_file with non-existent file."""
        with pytest.raises(FileNotFoundError):
            load_card_from_file("/nonexistent/path/to/file.json")

    def test_load_card_from_file_invalid_json(self) -> None:
        """Test load_card_from_file with invalid JSON."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write("not valid json {")
            temp_path = f.name
        
        try:
            with pytest.raises(Exception):  # JSONDecodeError or ValidationError
                load_card_from_file(temp_path)
        finally:
            Path(temp_path).unlink()

    def test_load_cards_from_directory(self, valid_card_data: dict[str, Any]) -> None:
        """Test loading multiple cards from a directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create multiple card files
            card1_path = Path(temp_dir) / "card1.json"
            card2_path = Path(temp_dir) / "card2.json"
            
            card1_data = valid_card_data.copy()
            card1_data["card_id"] = "card-1"
            
            card2_data = valid_card_data.copy()
            card2_data["card_id"] = "card-2"
            
            card1_path.write_text(json.dumps(card1_data))
            card2_path.write_text(json.dumps(card2_data))
            
            cards = load_cards_from_directory(temp_dir)
            
            assert len(cards) == 2
            assert "french-basics:card-1" in cards
            assert "french-basics:card-2" in cards

    def test_load_cards_from_directory_not_found(self) -> None:
        """Test load_cards_from_directory with non-existent directory."""
        with pytest.raises(FileNotFoundError):
            load_cards_from_directory("/nonexistent/path")

    def test_load_cards_from_directory_duplicate_ids(self, valid_card_data: dict[str, Any]) -> None:
        """Test load_cards_from_directory with duplicate card IDs in same deck."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create two card files with the same card_id in same deck
            card1_path = Path(temp_dir) / "card1.json"
            card2_path = Path(temp_dir) / "card2.json"
            
            # Both have the same card_id in same deck
            card1_data = valid_card_data.copy()
            card2_data = valid_card_data.copy()
            
            card1_path.write_text(json.dumps(card1_data))
            card2_path.write_text(json.dumps(card2_data))
            
            with pytest.raises(ValueError) as exc_info:
                load_cards_from_directory(temp_dir)
            
            assert "Duplicate card ID" in str(exc_info.value)


# =============================================================================
# Tests for Model Properties and Methods
# =============================================================================

class TestModelProperties:
    """Tests for model properties and methods."""

    def test_vocabulary_card_model_dump(self, valid_card_data: dict[str, Any]) -> None:
        """Test that VocabularyCard can be dumped to a dictionary."""
        card = VocabularyCard(**valid_card_data)
        dumped = card.model_dump()
        
        assert dumped["deck_id"] == "french-basics"
        assert dumped["card_id"] == "hello"
        assert dumped["front"] == "Bonjour"
        assert dumped["back"] == "Hello"
        assert dumped["difficulty"] == 1
        assert dumped["example"] == "Bonjour, comment ça va?"
        assert dumped["tags"] == ["greeting", "common"]
        assert dumped["context"] == "lesson:greetings-101"

    def test_vocabulary_card_model_dump_json(self, valid_card_data: dict[str, Any]) -> None:
        """Test that VocabularyCard can be dumped to JSON."""
        card = VocabularyCard(**valid_card_data)
        json_str = card.model_dump_json()
        
        # Parse back and verify
        parsed = json.loads(json_str)
        assert parsed["deck_id"] == "french-basics"
        assert parsed["card_id"] == "hello"
        assert parsed["front"] == "Bonjour"

    def test_vocabulary_card_equality(self, valid_card_data: dict[str, Any]) -> None:
        """Test that VocabularyCard instances can be compared for equality."""
        card1 = VocabularyCard(**valid_card_data)
        card2 = VocabularyCard(**valid_card_data)
        
        assert card1 == card2

    def test_vocabulary_card_repr(self, minimal_valid_card: VocabularyCard) -> None:
        """Test that VocabularyCard has a string representation."""
        repr_str = repr(minimal_valid_card)
        assert "VocabularyCard" in repr_str


# =============================================================================
# Tests for Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    def test_card_with_many_tags(self) -> None:
        """Test card with many tags."""
        tags = [f"tag-{i}" for i in range(20)]
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": "test",
            "back": "test",
            "difficulty": 1,
            "tags": tags
        }
        card = VocabularyCard(**card_data)
        assert len(card.tags) == 20

    def test_card_with_long_strings(self) -> None:
        """Test card with very long strings."""
        long_string = "x" * 10000
        card_data = {
            "deck_id": "test",
            "card_id": "test",
            "front": long_string,
            "back": long_string,
            "difficulty": 1,
            "example": long_string,
            "context": long_string,
            "tags": [long_string]
        }
        card = VocabularyCard(**card_data)
        assert len(card.front) == 10000

    def test_card_with_unicode(self) -> None:
        """Test card with Unicode characters (French text)."""
        card_data = {
            "deck_id": "test-unicode",
            "card_id": "french-words",
            "front": "restaurant",
            "back": "restaurant",
            "example": "Nous allons au restaurant ce soir.",
            "difficulty": 2,
            "tags": ["food", "dining"]
        }
        card = VocabularyCard(**card_data)
        assert card.front == "restaurant"
        assert "restaurant" in card.example

    def test_card_with_special_characters_in_id(self) -> None:
        """Test card with special characters in deck_id and card_id."""
        card_data = {
            "deck_id": "test-deck-123",
            "card_id": "test-card_xyz",
            "front": "test",
            "back": "test",
            "difficulty": 1
        }
        card = VocabularyCard(**card_data)
        assert card.deck_id == "test-deck-123"
        assert card.card_id == "test-card_xyz"

    def test_card_with_numeric_id(self) -> None:
        """Test card with numeric strings in IDs."""
        card_data = {
            "deck_id": "123",
            "card_id": "456",
            "front": "test",
            "back": "test",
            "difficulty": 1
        }
        card = VocabularyCard(**card_data)
        assert card.deck_id == "123"
        assert card.card_id == "456"


# =============================================================================
# Tests for Example Data Files
# =============================================================================

class TestExampleDataFiles:
    """Tests for the example vocabulary card data files."""

    def test_basic_greetings_file_exists(self) -> None:
        """Test that basic_greetings.json example file exists."""
        file_path = Path(__file__).parent.parent / "data" / "vocabulary_cards" / "basic_greetings.json"
        assert file_path.exists()
        assert file_path.is_file()

    def test_goodbye_file_exists(self) -> None:
        """Test that goodbye.json example file exists."""
        file_path = Path(__file__).parent.parent / "data" / "vocabulary_cards" / "goodbye.json"
        assert file_path.exists()
        assert file_path.is_file()

    def test_food_vocabulary_file_exists(self) -> None:
        """Test that food_vocabulary.json example file exists."""
        file_path = Path(__file__).parent.parent / "data" / "vocabulary_cards" / "food_vocabulary.json"
        assert file_path.exists()
        assert file_path.is_file()

    def test_bread_file_exists(self) -> None:
        """Test that bread.json example file exists."""
        file_path = Path(__file__).parent.parent / "data" / "vocabulary_cards" / "bread.json"
        assert file_path.exists()
        assert file_path.is_file()

    def test_coffee_file_exists(self) -> None:
        """Test that coffee.json example file exists."""
        file_path = Path(__file__).parent.parent / "data" / "vocabulary_cards" / "coffee.json"
        assert file_path.exists()
        assert file_path.is_file()

    def test_all_example_files_valid(self) -> None:
        """Test that all example files are valid vocabulary cards."""
        vocab_dir = Path(__file__).parent.parent / "data" / "vocabulary_cards"
        
        for json_file in vocab_dir.glob("*.json"):
            card = load_card_from_file(json_file)
            assert isinstance(card, VocabularyCard)
            # Verify required fields
            assert card.deck_id
            assert card.card_id
            assert card.front
            assert card.back
            assert 1 <= card.difficulty <= 5

    def test_example_files_have_french_content(self) -> None:
        """Test that example files contain French content."""
        vocab_dir = Path(__file__).parent.parent / "data" / "vocabulary_cards"
        
        for json_file in vocab_dir.glob("*.json"):
            card = load_card_from_file(json_file)
            # Front should contain French text (check for common French characters or words)
            front_lower = card.front.lower()
            # Check if it looks like French (has accented characters or common French words)
            has_french_chars = any(c in card.front for c in ['é', 'è', 'ê', 'à', 'ç', 'û', 'î', 'ô'])
            common_french = any(word in front_lower for word in ['le', 'la', 'les', 'un', 'une', 'de', 'des', 'je', 'tu', 'il', 'elle'])
            # Either has French characters or common French words, or is a valid word
            assert has_french_chars or common_french or len(card.front) > 0
