"""Tests for grammar lesson schema validation.

This module contains comprehensive tests for the GrammarLesson Pydantic model
and related validation functions, ensuring that the schema correctly validates
all acceptance criteria from GitHub issue #28.
"""

import json
import tempfile
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from schemas.grammar_lesson import (
    DifficultyLevel,
    GrammarLesson,
    Section,
    load_lesson_from_file,
    load_lessons_from_directory,
    validate_lesson_data,
    validate_lesson_json,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def valid_lesson_data() -> dict[str, Any]:
    """Provide a valid grammar lesson data dictionary."""
    return {
        "id": "present-tense",
        "title": "The Present Tense in French",
        "topic": "Verbs",
        "difficulty": "beginner",
        "sections": [
            {
                "title": "Regular -ER Verbs",
                "content": "Most French verbs ending in -er follow a regular pattern.",
                "examples": ["Je mange", "Tu manges", "Il mange"]
            }
        ]
    }


@pytest.fixture
def valid_lesson_json() -> str:
    """Provide a valid grammar lesson as a JSON string."""
    return json.dumps({
        "id": "present-tense",
        "title": "The Present Tense in French",
        "topic": "Verbs",
        "difficulty": "beginner",
        "sections": [
            {
                "title": "Regular -ER Verbs",
                "content": "Most French verbs ending in -er follow a regular pattern."
            }
        ]
    })


@pytest.fixture
def minimal_valid_lesson() -> GrammarLesson:
    """Provide a minimal valid GrammarLesson instance."""
    return GrammarLesson(
        id="test",
        title="Test",
        topic="Test",
        difficulty=DifficultyLevel.BEGINNER,
        sections=[
            Section(title="Test Section", content="Test content")
        ]
    )


# =============================================================================
# Tests for Acceptance Criteria (Issue #28)
# =============================================================================

class TestAcceptanceCriteria:
    """Tests for the three acceptance criteria from GitHub issue #28."""

    def test_ac1_schema_includes_required_fields(self, valid_lesson_data: dict[str, Any]) -> None:
        """AC1: Schema defined for lesson structure with id, title, topic, difficulty, sections[]."""
        lesson = GrammarLesson(**valid_lesson_data)
        
        # Verify all required fields are present
        assert hasattr(lesson, 'id')
        assert hasattr(lesson, 'title')
        assert hasattr(lesson, 'topic')
        assert hasattr(lesson, 'difficulty')
        assert hasattr(lesson, 'sections')
        
        # Verify field values
        assert lesson.id == "present-tense"
        assert lesson.title == "The Present Tense in French"
        assert lesson.topic == "Verbs"
        assert lesson.difficulty == DifficultyLevel.BEGINNER
        assert len(lesson.sections) == 1

    def test_ac2_sections_include_required_fields(self, valid_lesson_data: dict[str, Any]) -> None:
        """AC2: Sections include title, content, examples[]."""
        lesson = GrammarLesson(**valid_lesson_data)
        section = lesson.sections[0]
        
        # Verify all required section fields are present
        assert hasattr(section, 'title')
        assert hasattr(section, 'content')
        assert hasattr(section, 'examples')
        
        # Verify field values
        assert section.title == "Regular -ER Verbs"
        assert section.content == "Most French verbs ending in -er follow a regular pattern."
        assert section.examples == ["Je mange", "Tu manges", "Il mange"]

    def test_ac3_validation_script_exists(self) -> None:
        """AC3: Validation script created."""
        script_path = Path(__file__).parent.parent / "scripts" / "validate_grammar_lessons.py"
        assert script_path.exists(), "Validation script should exist at scripts/validate_grammar_lessons.py"
        assert script_path.is_file()


# =============================================================================
# Tests for Valid Lesson Data
# =============================================================================

class TestValidLessons:
    """Tests for valid grammar lesson data."""

    def test_valid_lesson_from_dict(self, valid_lesson_data: dict[str, Any]) -> None:
        """Test creating a valid GrammarLesson from a dictionary."""
        lesson = GrammarLesson(**valid_lesson_data)
        
        assert lesson.id == "present-tense"
        assert lesson.title == "The Present Tense in French"
        assert lesson.topic == "Verbs"
        assert lesson.difficulty == DifficultyLevel.BEGINNER
        assert len(lesson.sections) == 1
        assert lesson.sections[0].title == "Regular -ER Verbs"

    def test_valid_lesson_from_json(self, valid_lesson_json: str) -> None:
        """Test creating a valid GrammarLesson from a JSON string."""
        lesson = GrammarLesson.model_validate_json(valid_lesson_json)
        
        assert lesson.id == "present-tense"
        assert lesson.title == "The Present Tense in French"
        assert lesson.topic == "Verbs"
        assert lesson.difficulty == DifficultyLevel.BEGINNER

    def test_valid_lesson_with_all_difficulty_levels(self) -> None:
        """Test that all difficulty levels are accepted."""
        for difficulty in ["beginner", "intermediate", "advanced"]:
            lesson_data = {
                "id": f"test-{difficulty}",
                "title": f"Test {difficulty}",
                "topic": "Test",
                "difficulty": difficulty,
                "sections": [{"title": "Test", "content": "Test"}]
            }
            lesson = GrammarLesson(**lesson_data)
            assert lesson.difficulty == DifficultyLevel(difficulty)

    def test_valid_lesson_with_empty_examples(self) -> None:
        """Test that examples array can be empty."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test", "examples": []}]
        }
        lesson = GrammarLesson(**lesson_data)
        assert lesson.sections[0].examples == []

    def test_valid_lesson_with_multiple_sections(self) -> None:
        """Test lesson with multiple valid sections."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [
                {"title": "Section 1", "content": "Content 1", "examples": ["Example 1"]},
                {"title": "Section 2", "content": "Content 2", "examples": ["Example 2"]},
                {"title": "Section 3", "content": "Content 3"}
            ]
        }
        lesson = GrammarLesson(**lesson_data)
        assert len(lesson.sections) == 3

    def test_valid_lesson_with_hyphenated_id(self) -> None:
        """Test lesson with hyphenated ID (valid pattern)."""
        lesson_data = {
            "id": "present-tense-verbs",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        lesson = GrammarLesson(**lesson_data)
        assert lesson.id == "present-tense-verbs"


# =============================================================================
# Tests for Missing Required Fields
# =============================================================================

class TestMissingRequiredFields:
    """Tests for validation errors when required fields are missing."""

    def test_missing_id(self) -> None:
        """Test that missing id raises ValidationError."""
        lesson_data = {
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "id" in error_fields

    def test_missing_title(self) -> None:
        """Test that missing title raises ValidationError."""
        lesson_data = {
            "id": "test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "title" in error_fields

    def test_missing_topic(self) -> None:
        """Test that missing topic raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "topic" in error_fields

    def test_missing_difficulty(self) -> None:
        """Test that missing difficulty raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "difficulty" in error_fields

    def test_missing_sections(self) -> None:
        """Test that missing sections raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "sections" in error_fields

    def test_missing_section_title(self) -> None:
        """Test that section without title raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        # Check that we have an error in sections[0].title
        assert any(
            'sections' in error['loc'] and 'title' in error['loc']
            for error in errors
        )

    def test_missing_section_content(self) -> None:
        """Test that section without content raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        # Check that we have an error in sections[0].content
        assert any(
            'sections' in error['loc'] and 'content' in error['loc']
            for error in errors
        )

    def test_missing_multiple_fields(self) -> None:
        """Test that missing multiple fields are all reported."""
        lesson_data = {
            "id": "test",
            "title": "Test"
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "topic" in error_fields
        assert "difficulty" in error_fields
        assert "sections" in error_fields


# =============================================================================
# Tests for Invalid Field Values
# =============================================================================

class TestInvalidFieldValues:
    """Tests for validation errors with invalid field values."""

    def test_invalid_difficulty(self) -> None:
        """Test that invalid difficulty raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "expert",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("difficulty" in error['loc'] for error in errors)

    def test_invalid_difficulty_values(self) -> None:
        """Test various invalid difficulty values."""
        invalid_difficulties = ["expert", "easy", "hard", "", "BEGINNER", "Beginner"]
        
        for difficulty in invalid_difficulties:
            lesson_data = {
                "id": "test",
                "title": "Test",
                "topic": "Test",
                "difficulty": difficulty,
                "sections": [{"title": "Test", "content": "Test"}]
            }
            with pytest.raises(ValidationError):
                GrammarLesson(**lesson_data)

    def test_empty_sections_array(self) -> None:
        """Test that empty sections array raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": []
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("sections" in error['loc'] for error in errors)

    def test_empty_string_id(self) -> None:
        """Test that empty string ID raises ValidationError."""
        lesson_data = {
            "id": "",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("id" in error['loc'] for error in errors)

    def test_whitespace_only_id(self) -> None:
        """Test that whitespace-only ID raises ValidationError."""
        lesson_data = {
            "id": "   ",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("id" in error['loc'] for error in errors)

    def test_invalid_id_pattern(self) -> None:
        """Test that ID with invalid pattern raises ValidationError."""
        invalid_ids = ["Present-Tense", "present tense", "present_tense", "123test", ""]
        
        for invalid_id in invalid_ids:
            lesson_data = {
                "id": invalid_id,
                "title": "Test",
                "topic": "Test",
                "difficulty": "beginner",
                "sections": [{"title": "Test", "content": "Test"}]
            }
            with pytest.raises(ValidationError):
                GrammarLesson(**lesson_data)

    def test_empty_string_title(self) -> None:
        """Test that empty string title raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("title" in error['loc'] for error in errors)

    def test_empty_string_topic(self) -> None:
        """Test that empty string topic raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("topic" in error['loc'] for error in errors)

    def test_empty_string_section_title(self) -> None:
        """Test that empty string section title raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "", "content": "Test"}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("title" in error['loc'] for error in errors)

    def test_empty_string_section_content(self) -> None:
        """Test that empty string section content raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": ""}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("content" in error['loc'] for error in errors)

    def test_example_with_empty_string(self) -> None:
        """Test that example with empty string raises ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test", "examples": ["", "valid"]}]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        # Should have error about empty example
        error_text = str(errors).lower()
        assert "examples" in error_text or "non-whitespace" in error_text


# =============================================================================
# Tests for Section Title Uniqueness
# =============================================================================

class TestSectionTitleUniqueness:
    """Tests for section title uniqueness validation."""

    def test_duplicate_section_titles(self) -> None:
        """Test that duplicate section titles raise ValidationError."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [
                {"title": "Duplicate", "content": "Content 1"},
                {"title": "Duplicate", "content": "Content 2"}
            ]
        }
        with pytest.raises(ValidationError) as exc_info:
            GrammarLesson(**lesson_data)
        
        errors = exc_info.value.errors()
        assert any("unique" in str(error['msg']).lower() for error in errors)

    def test_unique_section_titles_valid(self) -> None:
        """Test that unique section titles are accepted."""
        lesson_data = {
            "id": "test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [
                {"title": "Section 1", "content": "Content 1"},
                {"title": "Section 2", "content": "Content 2"}
            ]
        }
        lesson = GrammarLesson(**lesson_data)
        assert len(lesson.sections) == 2


# =============================================================================
# Tests for Helper Functions
# =============================================================================

class TestHelperFunctions:
    """Tests for validation helper functions."""

    def test_validate_lesson_data(self, valid_lesson_data: dict[str, Any]) -> None:
        """Test the validate_lesson_data function."""
        lesson = validate_lesson_data(valid_lesson_data)
        assert lesson.id == "present-tense"

    def test_validate_lesson_data_invalid(self) -> None:
        """Test validate_lesson_data with invalid data."""
        invalid_data = {"id": "test", "title": "Test"}
        with pytest.raises(ValidationError):
            validate_lesson_data(invalid_data)

    def test_validate_lesson_json(self, valid_lesson_json: str) -> None:
        """Test the validate_lesson_json function."""
        lesson = validate_lesson_json(valid_lesson_json)
        assert lesson.id == "present-tense"

    def test_validate_lesson_json_invalid(self) -> None:
        """Test validate_lesson_json with invalid JSON."""
        invalid_json = json.dumps({"id": "test", "title": "Test"})
        with pytest.raises(ValidationError):
            validate_lesson_json(invalid_json)

    def test_load_lesson_from_file(self, valid_lesson_data: dict[str, Any]) -> None:
        """Test loading a lesson from a file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(valid_lesson_data, f)
            temp_path = f.name
        
        try:
            lesson = load_lesson_from_file(temp_path)
            assert lesson.id == "present-tense"
        finally:
            Path(temp_path).unlink()

    def test_load_lesson_from_file_not_found(self) -> None:
        """Test load_lesson_from_file with non-existent file."""
        with pytest.raises(FileNotFoundError):
            load_lesson_from_file("/nonexistent/path/to/file.json")

    def test_load_lesson_from_file_invalid_json(self) -> None:
        """Test load_lesson_from_file with invalid JSON."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write("not valid json {")
            temp_path = f.name
        
        try:
            with pytest.raises(Exception):  # JSONDecodeError or ValidationError
                load_lesson_from_file(temp_path)
        finally:
            Path(temp_path).unlink()

    def test_load_lessons_from_directory(self, valid_lesson_data: dict[str, Any]) -> None:
        """Test loading multiple lessons from a directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create multiple lesson files
            lesson1_path = Path(temp_dir) / "lesson1.json"
            lesson2_path = Path(temp_dir) / "lesson2.json"
            
            lesson1_data = valid_lesson_data.copy()
            lesson1_data["id"] = "lesson-1"
            
            lesson2_data = valid_lesson_data.copy()
            lesson2_data["id"] = "lesson-2"
            
            lesson1_path.write_text(json.dumps(lesson1_data))
            lesson2_path.write_text(json.dumps(lesson2_data))
            
            lessons = load_lessons_from_directory(temp_dir)
            
            assert len(lessons) == 2
            assert "lesson-1" in lessons
            assert "lesson-2" in lessons

    def test_load_lessons_from_directory_not_found(self) -> None:
        """Test load_lessons_from_directory with non-existent directory."""
        with pytest.raises(FileNotFoundError):
            load_lessons_from_directory("/nonexistent/path")

    def test_load_lessons_from_directory_duplicate_ids(self, valid_lesson_data: dict[str, Any]) -> None:
        """Test load_lessons_from_directory with duplicate IDs."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create two lesson files with the same ID
            lesson1_path = Path(temp_dir) / "lesson1.json"
            lesson2_path = Path(temp_dir) / "lesson2.json"
            
            lesson1_data = valid_lesson_data.copy()
            lesson2_data = valid_lesson_data.copy()
            # Both have the same ID
            
            lesson1_path.write_text(json.dumps(lesson1_data))
            lesson2_path.write_text(json.dumps(lesson2_data))
            
            with pytest.raises(ValueError) as exc_info:
                load_lessons_from_directory(temp_dir)
            
            assert "Duplicate lesson ID" in str(exc_info.value)


# =============================================================================
# Tests for Model Properties and Methods
# =============================================================================

class TestModelProperties:
    """Tests for model properties and methods."""

    def test_difficulty_level_enum(self) -> None:
        """Test DifficultyLevel enum values."""
        assert DifficultyLevel.BEGINNER.value == "beginner"
        assert DifficultyLevel.INTERMEDIATE.value == "intermediate"
        assert DifficultyLevel.ADVANCED.value == "advanced"

    def test_grammar_lesson_model_dump(self, valid_lesson_data: dict[str, Any]) -> None:
        """Test that GrammarLesson can be dumped to a dictionary."""
        lesson = GrammarLesson(**valid_lesson_data)
        dumped = lesson.model_dump()
        
        assert dumped["id"] == "present-tense"
        assert dumped["title"] == "The Present Tense in French"
        assert dumped["topic"] == "Verbs"
        assert dumped["difficulty"] == "beginner"
        assert len(dumped["sections"]) == 1

    def test_grammar_lesson_model_dump_json(self, valid_lesson_data: dict[str, Any]) -> None:
        """Test that GrammarLesson can be dumped to JSON."""
        lesson = GrammarLesson(**valid_lesson_data)
        json_str = lesson.model_dump_json()
        
        # Parse back and verify
        parsed = json.loads(json_str)
        assert parsed["id"] == "present-tense"
        assert parsed["title"] == "The Present Tense in French"

    def test_section_model_dump(self) -> None:
        """Test that Section can be dumped to a dictionary."""
        section = Section(
            title="Test Section",
            content="Test content",
            examples=["Example 1", "Example 2"]
        )
        dumped = section.model_dump()
        
        assert dumped["title"] == "Test Section"
        assert dumped["content"] == "Test content"
        assert dumped["examples"] == ["Example 1", "Example 2"]

    def test_grammar_lesson_equality(self, valid_lesson_data: dict[str, Any]) -> None:
        """Test that GrammarLesson instances can be compared for equality."""
        lesson1 = GrammarLesson(**valid_lesson_data)
        lesson2 = GrammarLesson(**valid_lesson_data)
        
        assert lesson1 == lesson2

    def test_grammar_lesson_repr(self, minimal_valid_lesson: GrammarLesson) -> None:
        """Test that GrammarLesson has a string representation."""
        repr_str = repr(minimal_valid_lesson)
        assert "GrammarLesson" in repr_str


# =============================================================================
# Tests for Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    def test_lesson_with_many_sections(self) -> None:
        """Test lesson with many sections."""
        sections = [
            {"title": f"Section {i}", "content": f"Content {i}", "examples": [f"Example {i}"]}
            for i in range(20)
        ]
        lesson_data = {
            "id": "test-many-sections",
            "title": "Test Many Sections",
            "topic": "Test",
            "difficulty": "advanced",
            "sections": sections
        }
        lesson = GrammarLesson(**lesson_data)
        assert len(lesson.sections) == 20

    def test_lesson_with_long_strings(self) -> None:
        """Test lesson with very long strings."""
        long_string = "x" * 10000
        lesson_data = {
            "id": "test-long-strings",
            "title": long_string,
            "topic": long_string,
            "difficulty": "beginner",
            "sections": [{"title": long_string, "content": long_string, "examples": [long_string]}]
        }
        lesson = GrammarLesson(**lesson_data)
        assert len(lesson.title) == 10000

    def test_lesson_with_unicode(self) -> None:
        """Test lesson with Unicode characters (French text)."""
        lesson_data = {
            "id": "test-unicode",
            "title": "Les verbes français",
            "topic": "Verbes",
            "difficulty": "intermediate",
            "sections": [
                {
                    "title": "Le présent",
                    "content": "En français, le présent de l'indicatif est utilisé pour exprimer des actions habituelles.",
                    "examples": ["Je parle français.", "Tu manges une pomme."]
                }
            ]
        }
        lesson = GrammarLesson(**lesson_data)
        assert lesson.title == "Les verbes français"
        assert "français" in lesson.sections[0].content

    def test_lesson_id_with_numbers(self) -> None:
        """Test lesson ID with numbers (valid pattern)."""
        lesson_data = {
            "id": "lesson-123-test",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        lesson = GrammarLesson(**lesson_data)
        assert lesson.id == "lesson-123-test"

    def test_lesson_id_single_letter(self) -> None:
        """Test lesson ID with single letter (valid pattern)."""
        lesson_data = {
            "id": "x",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test"}]
        }
        lesson = GrammarLesson(**lesson_data)
        assert lesson.id == "x"

    def test_section_with_many_examples(self) -> None:
        """Test section with many examples."""
        examples = [f"Example {i}" for i in range(100)]
        lesson_data = {
            "id": "test-many-examples",
            "title": "Test",
            "topic": "Test",
            "difficulty": "beginner",
            "sections": [{"title": "Test", "content": "Test", "examples": examples}]
        }
        lesson = GrammarLesson(**lesson_data)
        assert len(lesson.sections[0].examples) == 100
