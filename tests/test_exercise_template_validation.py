"""Tests for exercise template validation.

This module contains tests to verify that all exercise template files
in data/grammar/exercises/ pass validation, can be properly rendered,
and have correct answer checking logic configured.

Acceptance Criteria (from GitHub issue #35):
- [ ] All templates pass validation
- [ ] Exercise rendering works
- [ ] Answer checking logic works

These tests specifically validate the exercise template files created in issue #34.
"""

import json
import tempfile
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from schemas.grammar_exercise import (
    ConjugationExerciseModel,
    DifficultyLevel,
    Exercise,
    ExerciseType,
    FillInTheBlankExercise,
    MultipleChoiceExercise,
    SentenceTransformationExerciseModel,
    TranslationExerciseModel,
    load_exercise_from_file,
    load_exercises_from_directory,
    validate_exercise_data,
    validate_exercise_json,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def exercises_directory() -> Path:
    """Provide the path to the exercises directory."""
    return Path(__file__).parent.parent / "data" / "grammar" / "exercises"


@pytest.fixture
def fill_in_blank_file(exercises_directory: Path) -> Path:
    """Provide the path to the fill-in-the-blank exercise file."""
    return exercises_directory / "fill-in-the-blank-present-tense.json"


@pytest.fixture
def multiple_choice_file(exercises_directory: Path) -> Path:
    """Provide the path to the multiple-choice exercise file."""
    return exercises_directory / "multiple-choice-etre.json"


@pytest.fixture
def translation_file(exercises_directory: Path) -> Path:
    """Provide the path to the translation exercise file."""
    return exercises_directory / "translation-j-aime.json"


@pytest.fixture
def conjugation_file(exercises_directory: Path) -> Path:
    """Provide the path to the conjugation exercise file."""
    return exercises_directory / "conjugation-parler-nous.json"


@pytest.fixture
def transformation_file(exercises_directory: Path) -> Path:
    """Provide the path to the sentence transformation exercise file."""
    return exercises_directory / "transformation-negative.json"


# =============================================================================
# Tests for Acceptance Criteria (Issue #35)
# =============================================================================


class TestAcceptanceCriteriaIssue35:
    """Tests for the three acceptance criteria from GitHub issue #35."""

    def test_ac1_all_templates_pass_validation(self, exercises_directory: Path) -> None:
        """AC1: All templates pass validation.
        
        Given: All 5 exercise template files in data/grammar/exercises/
        When: Loaded through load_exercises_from_directory
        Then: All templates validate successfully without errors
        """
        # Verify directory exists
        assert exercises_directory.exists(), f"Directory {exercises_directory} should exist"
        assert exercises_directory.is_dir(), f"{exercises_directory} should be a directory"
        
        # Load and validate all exercises
        exercises = load_exercises_from_directory(exercises_directory)
        
        # Verify all 5 exercises loaded successfully
        assert len(exercises) == 5, f"Expected 5 exercises, got {len(exercises)}"
        
        # Verify all are valid Exercise instances
        for exercise_id, exercise in exercises.items():
            assert isinstance(exercise, Exercise), \
                f"Exercise {exercise_id} should be a valid Exercise instance"

    def test_ac2_exercise_rendering_works(self, exercises_directory: Path) -> None:
        """AC2: Exercise rendering works.
        
        Given: Validated exercise data
        When: Accessing exercise fields (id, type, prompt, etc.)
        Then: All required fields are present and accessible
        """
        exercises = load_exercises_from_directory(exercises_directory)
        
        # Verify each exercise has all required fields accessible
        for exercise_id, exercise in exercises.items():
            # Common fields from ExerciseBase
            assert hasattr(exercise, 'id'), f"Exercise {exercise_id} missing 'id' field"
            assert hasattr(exercise, 'type'), f"Exercise {exercise_id} missing 'type' field"
            assert hasattr(exercise, 'prompt'), f"Exercise {exercise_id} missing 'prompt' field"
            assert hasattr(exercise, 'topic'), f"Exercise {exercise_id} missing 'topic' field"
            assert hasattr(exercise, 'difficulty'), f"Exercise {exercise_id} missing 'difficulty' field"
            
            # At least one answer field should be present
            assert hasattr(exercise, 'correct_answer') or hasattr(exercise, 'correct_answers'), \
                f"Exercise {exercise_id} missing answer field(s)"
            
            # Verify fields are accessible and non-empty
            assert exercise.id, f"Exercise {exercise_id} has empty id"
            assert exercise.type, f"Exercise {exercise_id} has empty type"
            assert exercise.prompt, f"Exercise {exercise_id} has empty prompt"
            assert exercise.topic, f"Exercise {exercise_id} has empty topic"
            assert exercise.difficulty, f"Exercise {exercise_id} has empty difficulty"

    def test_ac3_answer_checking_logic_works(self, exercises_directory: Path) -> None:
        """AC3: Answer checking logic works.
        
        Given: Validated exercise data
        When: Checking for correct_answer or correct_answers fields
        Then: At least one answer field is present and contains valid data
        """
        exercises = load_exercises_from_directory(exercises_directory)
        
        # Verify each exercise has valid answer checking configuration
        for exercise_id, exercise in exercises.items():
            # Check that at least one answer field is provided
            assert exercise.correct_answer is not None or exercise.correct_answers is not None, \
                f"Exercise {exercise_id} must have correct_answer or correct_answers"
            
            # Verify the answer is not empty
            if exercise.correct_answer is not None:
                assert exercise.correct_answer.strip(), \
                    f"Exercise {exercise_id} has empty correct_answer"
            
            if exercise.correct_answers is not None:
                assert len(exercise.correct_answers) > 0, \
                    f"Exercise {exercise_id} has empty correct_answers list"
                for answer in exercise.correct_answers:
                    assert answer.strip(), \
                        f"Exercise {exercise_id} has empty answer in correct_answers"


# =============================================================================
# Tests for Individual Exercise Types
# =============================================================================


class TestFillInTheBlankTemplate:
    """Tests for fill-in-the-blank exercise template validation."""

    def test_fill_in_blank_template_validates(self, fill_in_blank_file: Path) -> None:
        """Test that fill-in-the-blank template validates correctly."""
        assert fill_in_blank_file.exists(), "Fill-in-the-blank template file should exist"
        
        exercise = load_exercise_from_file(fill_in_blank_file)
        
        assert isinstance(exercise, FillInTheBlankExercise)
        assert exercise.id == "fill-in-the-blank-present-tense"
        assert exercise.type == ExerciseType.FILL_IN_THE_BLANK

    def test_fill_in_blank_rendering(self, fill_in_blank_file: Path) -> None:
        """Test that fill-in-the-blank exercise renders correctly."""
        exercise = load_exercise_from_file(fill_in_blank_file)
        
        # Verify all fields are accessible
        assert exercise.id == "fill-in-the-blank-present-tense"
        assert exercise.type == ExerciseType.FILL_IN_THE_BLANK
        assert exercise.prompt == "Je ___ français."
        assert exercise.correct_answer == "parle"
        assert exercise.topic == "Verbs"
        assert exercise.difficulty == DifficultyLevel.BEGINNER
        assert exercise.hint == "Conjugate 'parler' for 'je' in present tense"

    def test_fill_in_blank_answer_checking(self, fill_in_blank_file: Path) -> None:
        """Test that fill-in-the-blank exercise has valid answer checking."""
        exercise = load_exercise_from_file(fill_in_blank_file)
        
        # Fill-in-the-blank uses correct_answer (string)
        assert exercise.correct_answer is not None
        assert exercise.correct_answer == "parle"
        assert exercise.correct_answers is None or len(exercise.correct_answers) == 0


class TestMultipleChoiceTemplate:
    """Tests for multiple-choice exercise template validation."""

    def test_multiple_choice_template_validates(self, multiple_choice_file: Path) -> None:
        """Test that multiple-choice template validates correctly."""
        assert multiple_choice_file.exists(), "Multiple-choice template file should exist"
        
        exercise = load_exercise_from_file(multiple_choice_file)
        
        assert isinstance(exercise, MultipleChoiceExercise)
        assert exercise.id == "multiple-choice-etre-je"
        assert exercise.type == ExerciseType.MULTIPLE_CHOICE

    def test_multiple_choice_rendering(self, multiple_choice_file: Path) -> None:
        """Test that multiple-choice exercise renders correctly."""
        exercise = load_exercise_from_file(multiple_choice_file)
        
        # Verify all fields are accessible
        assert exercise.id == "multiple-choice-etre-je"
        assert exercise.type == ExerciseType.MULTIPLE_CHOICE
        assert exercise.prompt == "Quelle est la forme correcte du verbe 'être' pour 'je'?"
        assert exercise.correct_answer == "suis"
        assert exercise.options == ["suis", "es", "est", "sont"]
        assert exercise.topic == "Verbs"
        assert exercise.difficulty == DifficultyLevel.BEGINNER
        assert exercise.hint == "Remember: je + être = ?"

    def test_multiple_choice_answer_checking(self, multiple_choice_file: Path) -> None:
        """Test that multiple-choice exercise has valid answer checking."""
        exercise = load_exercise_from_file(multiple_choice_file)
        
        # Multiple choice uses correct_answer (string)
        assert exercise.correct_answer is not None
        assert exercise.correct_answer == "suis"
        
        # Verify correct answer is in options
        assert exercise.correct_answer in exercise.options, \
            "Correct answer must be in options list"
        
        # Verify at least 3 options (1 correct + 2 distractors)
        assert len(exercise.options) >= 3, \
            "Multiple choice must have at least 3 options"


class TestTranslationTemplate:
    """Tests for translation exercise template validation."""

    def test_translation_template_validates(self, translation_file: Path) -> None:
        """Test that translation template validates correctly."""
        assert translation_file.exists(), "Translation template file should exist"
        
        exercise = load_exercise_from_file(translation_file)
        
        assert isinstance(exercise, TranslationExerciseModel)
        assert exercise.id == "translation-j-aime"
        assert exercise.type == ExerciseType.TRANSLATION

    def test_translation_rendering(self, translation_file: Path) -> None:
        """Test that translation exercise renders correctly."""
        exercise = load_exercise_from_file(translation_file)
        
        # Verify all fields are accessible
        assert exercise.id == "translation-j-aime"
        assert exercise.type == ExerciseType.TRANSLATION
        assert exercise.prompt == "Translate to English: J'aime le fromage"
        assert exercise.correct_answer == "I like cheese"
        assert exercise.source_language == "fr"
        assert exercise.target_language == "en"
        assert exercise.topic == "Sentence Structure"
        assert exercise.difficulty == DifficultyLevel.BEGINNER
        assert exercise.hint == "Use 'I like' for 'J'aime'"

    def test_translation_answer_checking(self, translation_file: Path) -> None:
        """Test that translation exercise has valid answer checking."""
        exercise = load_exercise_from_file(translation_file)
        
        # Translation uses correct_answer (string)
        assert exercise.correct_answer is not None
        assert exercise.correct_answer == "I like cheese"
        
        # Verify language codes are valid
        assert len(exercise.source_language) == 2, "Source language must be 2-character code"
        assert len(exercise.target_language) == 2, "Target language must be 2-character code"


class TestConjugationTemplate:
    """Tests for conjugation exercise template validation."""

    def test_conjugation_template_validates(self, conjugation_file: Path) -> None:
        """Test that conjugation template validates correctly."""
        assert conjugation_file.exists(), "Conjugation template file should exist"
        
        exercise = load_exercise_from_file(conjugation_file)
        
        assert isinstance(exercise, ConjugationExerciseModel)
        assert exercise.id == "conjugation-parler-nous"
        assert exercise.type == ExerciseType.CONJUGATION

    def test_conjugation_rendering(self, conjugation_file: Path) -> None:
        """Test that conjugation exercise renders correctly."""
        exercise = load_exercise_from_file(conjugation_file)
        
        # Verify all fields are accessible
        assert exercise.id == "conjugation-parler-nous"
        assert exercise.type == ExerciseType.CONJUGATION
        assert exercise.prompt == "Conjugate 'parler' for 'nous' in present tense"
        assert exercise.verb == "parler"
        assert exercise.tense == "present"
        assert exercise.pronoun == "nous"
        assert exercise.topic == "Verbs"
        assert exercise.difficulty == DifficultyLevel.BEGINNER
        assert exercise.hint == "For -er verbs with 'nous', the ending is -ons"

    def test_conjugation_answer_checking(self, conjugation_file: Path) -> None:
        """Test that conjugation exercise has valid answer checking."""
        exercise = load_exercise_from_file(conjugation_file)
        
        # Conjugation MUST use correct_answers (list), not correct_answer (string)
        assert exercise.correct_answers is not None, \
            "Conjugation exercises must have correct_answers (list)"
        assert exercise.correct_answer is None, \
            "Conjugation exercises should not have correct_answer (string)"
        
        assert "parlons" in exercise.correct_answers
        assert len(exercise.correct_answers) > 0


class TestSentenceTransformationTemplate:
    """Tests for sentence transformation exercise template validation."""

    def test_transformation_template_validates(self, transformation_file: Path) -> None:
        """Test that sentence transformation template validates correctly."""
        assert transformation_file.exists(), "Transformation template file should exist"
        
        exercise = load_exercise_from_file(transformation_file)
        
        assert isinstance(exercise, SentenceTransformationExerciseModel)
        assert exercise.id == "transformation-negative"
        assert exercise.type == ExerciseType.SENTENCE_TRANSFORMATION

    def test_transformation_rendering(self, transformation_file: Path) -> None:
        """Test that sentence transformation exercise renders correctly."""
        exercise = load_exercise_from_file(transformation_file)
        
        # Verify all fields are accessible
        assert exercise.id == "transformation-negative"
        assert exercise.type == ExerciseType.SENTENCE_TRANSFORMATION
        assert exercise.prompt == "Rewrite in negative form: Je parle français."
        assert exercise.correct_answer == "Je ne parle pas français."
        assert exercise.transformation_type == "negative"
        assert exercise.topic == "Sentence Structure"
        assert exercise.difficulty == DifficultyLevel.BEGINNER
        assert exercise.hint == "Use 'ne...pas' structure around the verb"

    def test_transformation_answer_checking(self, transformation_file: Path) -> None:
        """Test that sentence transformation exercise has valid answer checking."""
        exercise = load_exercise_from_file(transformation_file)
        
        # Sentence transformation uses correct_answer (string)
        assert exercise.correct_answer is not None
        assert exercise.correct_answer == "Je ne parle pas français."
        
        # Verify transformation type is present
        assert exercise.transformation_type, "Transformation type must be present"
        assert len(exercise.transformation_type) > 0, "Transformation type must not be empty"


# =============================================================================
# Negative Tests for Validation Logic
# =============================================================================


class TestValidationNegativeCases:
    """Negative tests to verify validation logic works correctly."""

    def test_validate_missing_type_field(self) -> None:
        """Test that validation fails when type field is missing."""
        invalid_data = {
            "id": "test-exercise",
            "prompt": "Test prompt",
            "correct_answer": "test answer",
            "topic": "Test",
            "difficulty": "beginner"
        }
        
        with pytest.raises(KeyError, match="type"):
            validate_exercise_data(invalid_data)

    def test_validate_invalid_exercise_type(self) -> None:
        """Test that validation fails for invalid exercise type."""
        invalid_data = {
            "id": "test-exercise",
            "type": "invalid-type",
            "prompt": "Test prompt",
            "correct_answer": "test answer",
            "topic": "Test",
            "difficulty": "beginner"
        }
        
        with pytest.raises(ValueError, match="Invalid exercise type"):
            validate_exercise_data(invalid_data)

    def test_validate_empty_string_fields(self) -> None:
        """Test that validation fails for empty string fields."""
        invalid_data = {
            "id": "test-exercise",
            "type": "fill-in-the-blank",
            "prompt": "   ",  # Whitespace only
            "correct_answer": "test answer",
            "topic": "Test",
            "difficulty": "beginner"
        }
        
        with pytest.raises(ValidationError):
            validate_exercise_data(invalid_data)

    def test_validate_missing_answer_fields(self) -> None:
        """Test that validation fails when no answer field is provided."""
        invalid_data = {
            "id": "test-exercise",
            "type": "fill-in-the-blank",
            "prompt": "Test prompt",
            "topic": "Test",
            "difficulty": "beginner"
            # No correct_answer or correct_answers
        }
        
        with pytest.raises(ValidationError, match="Either correct_answer or correct_answers must be provided"):
            validate_exercise_data(invalid_data)

    def test_validate_multiple_choice_correct_answer_not_in_options(self) -> None:
        """Test that validation fails when correct_answer is not in options."""
        invalid_data = {
            "id": "test-multiple-choice",
            "type": "multiple-choice",
            "prompt": "Test prompt",
            "correct_answer": "correct",
            "options": ["wrong1", "wrong2", "wrong3"],  # correct not in options
            "topic": "Test",
            "difficulty": "beginner"
        }
        
        with pytest.raises(ValidationError, match="Correct answer.*must be in options list"):
            validate_exercise_data(invalid_data)

    def test_validate_multiple_choice_too_few_options(self) -> None:
        """Test that validation fails when multiple choice has fewer than 3 options."""
        invalid_data = {
            "id": "test-multiple-choice",
            "type": "multiple-choice",
            "prompt": "Test prompt",
            "correct_answer": "correct",
            "options": ["correct", "wrong"],  # Only 2 options
            "topic": "Test",
            "difficulty": "beginner"
        }
        
        with pytest.raises(ValidationError, match="at least 3 items"):
            validate_exercise_data(invalid_data)

    def test_validate_conjugation_missing_correct_answers(self) -> None:
        """Test that validation fails when conjugation uses correct_answer instead of correct_answers."""
        invalid_data = {
            "id": "test-conjugation",
            "type": "conjugation",
            "prompt": "Test prompt",
            "correct_answer": "parlons",  # Should use correct_answers (list)
            "verb": "parler",
            "tense": "present",
            "pronoun": "nous",
            "topic": "Test",
            "difficulty": "beginner"
        }
        
        with pytest.raises(ValidationError, match="Conjugation exercises must have correct_answers"):
            validate_exercise_data(invalid_data)

    def test_load_exercise_from_file_not_found(self) -> None:
        """Test that load_exercise_from_file raises FileNotFoundError for non-existent file."""
        with pytest.raises(FileNotFoundError, match="Exercise file not found"):
            load_exercise_from_file("/nonexistent/path/to/file.json")

    def test_load_exercise_from_file_invalid_json(self) -> None:
        """Test that load_exercise_from_file raises error for invalid JSON."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write("{ invalid json }")
            temp_path = Path(f.name)
        
        try:
            # Invalid JSON raises JSONDecodeError before pydantic validation
            with pytest.raises((ValidationError, json.JSONDecodeError)):
                load_exercise_from_file(temp_path)
        finally:
            temp_path.unlink()

    def test_load_exercises_from_directory_not_found(self) -> None:
        """Test that load_exercises_from_directory raises FileNotFoundError for non-existent directory."""
        with pytest.raises(FileNotFoundError, match="Directory not found"):
            load_exercises_from_directory("/nonexistent/path")

    def test_validate_exercise_json_invalid(self) -> None:
        """Test that validate_exercise_json raises error for invalid exercise type."""
        # Invalid exercise type raises ValueError before pydantic validation
        with pytest.raises((ValidationError, ValueError, KeyError)):
            validate_exercise_json('{"type": "invalid-type"}')


# =============================================================================
# Integration Tests
# =============================================================================


class TestExerciseTemplateIntegration:
    """Integration tests for exercise template validation."""

    def test_all_exercises_have_unique_ids(self, exercises_directory: Path) -> None:
        """Test that all exercises in the directory have unique IDs."""
        exercises = load_exercises_from_directory(exercises_directory)
        
        ids = list(exercises.keys())
        assert len(ids) == len(set(ids)), "All exercise IDs should be unique"

    def test_all_exercises_have_valid_types(self, exercises_directory: Path) -> None:
        """Test that all exercises have valid exercise types."""
        exercises = load_exercises_from_directory(exercises_directory)
        
        valid_types = {t.value for t in ExerciseType}
        for exercise_id, exercise in exercises.items():
            assert exercise.type.value in valid_types, \
                f"Exercise {exercise_id} has invalid type: {exercise.type}"

    def test_all_exercises_have_valid_difficulty(self, exercises_directory: Path) -> None:
        """Test that all exercises have valid difficulty levels."""
        exercises = load_exercises_from_directory(exercises_directory)
        
        valid_difficulties = {d.value for d in DifficultyLevel}
        for exercise_id, exercise in exercises.items():
            assert exercise.difficulty.value in valid_difficulties, \
                f"Exercise {exercise_id} has invalid difficulty: {exercise.difficulty}"

    def test_all_exercises_have_non_empty_prompts(self, exercises_directory: Path) -> None:
        """Test that all exercises have non-empty prompts."""
        exercises = load_exercises_from_directory(exercises_directory)
        
        for exercise_id, exercise in exercises.items():
            assert exercise.prompt, f"Exercise {exercise_id} has empty prompt"
            assert exercise.prompt.strip(), f"Exercise {exercise_id} has whitespace-only prompt"
