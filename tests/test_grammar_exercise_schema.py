"""Tests for grammar exercise schema validation.

This module contains comprehensive tests for the GrammarExercise Pydantic models
and related validation functions, ensuring that the schema correctly validates
all acceptance criteria from GitHub issue #34.

Acceptance Criteria:
- Template schema defined
- Example exercises for each type (fill-in-the-blank, multiple choice, translation, conjugation, sentence transformation)
- Answer key included
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
    ExerciseBase,
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
def valid_fill_in_blank_data() -> dict[str, Any]:
    """Provide valid fill-in-the-blank exercise data."""
    return {
        "id": "fill-in-the-blank-test",
        "type": "fill-in-the-blank",
        "prompt": "Je ___ français.",
        "correct_answer": "parle",
        "topic": "Verbs",
        "difficulty": "beginner",
        "hint": "Conjugate 'parler' for 'je'"
    }


@pytest.fixture
def valid_multiple_choice_data() -> dict[str, Any]:
    """Provide valid multiple-choice exercise data."""
    return {
        "id": "multiple-choice-test",
        "type": "multiple-choice",
        "prompt": "Quelle est la forme correcte?",
        "correct_answer": "suis",
        "options": ["suis", "es", "est"],
        "topic": "Verbs",
        "difficulty": "beginner"
    }


@pytest.fixture
def valid_translation_data() -> dict[str, Any]:
    """Provide valid translation exercise data."""
    return {
        "id": "translation-test",
        "type": "translation",
        "prompt": "Translate to English: J'aime le fromage",
        "correct_answer": "I like cheese",
        "source_language": "fr",
        "target_language": "en",
        "topic": "Sentence Structure",
        "difficulty": "beginner"
    }


@pytest.fixture
def valid_conjugation_data() -> dict[str, Any]:
    """Provide valid conjugation exercise data."""
    return {
        "id": "conjugation-test",
        "type": "conjugation",
        "prompt": "Conjugate 'parler' for 'nous'",
        "correct_answers": ["parlons"],
        "verb": "parler",
        "tense": "present",
        "pronoun": "nous",
        "topic": "Verbs",
        "difficulty": "beginner"
    }


@pytest.fixture
def valid_transformation_data() -> dict[str, Any]:
    """Provide valid sentence transformation exercise data."""
    return {
        "id": "transformation-test",
        "type": "sentence-transformation",
        "prompt": "Rewrite in negative form: Je parle français.",
        "correct_answer": "Je ne parle pas français.",
        "transformation_type": "negative",
        "topic": "Sentence Structure",
        "difficulty": "beginner"
    }


# =============================================================================
# Tests for Acceptance Criteria (Issue #34)
# =============================================================================

class TestAcceptanceCriteria:
    """Tests for the three acceptance criteria from GitHub issue #34."""

    def test_ac1_template_schema_defined(self) -> None:
        """AC1: Template schema defined for grammar practice exercises."""
        # Verify that the schema module exists and has required components
        from schemas import grammar_exercise
        
        # Verify ExerciseType enum exists with all 5 types
        assert hasattr(grammar_exercise, 'ExerciseType')
        assert len(ExerciseType) == 5
        assert ExerciseType.FILL_IN_THE_BLANK.value == "fill-in-the-blank"
        assert ExerciseType.MULTIPLE_CHOICE.value == "multiple-choice"
        assert ExerciseType.TRANSLATION.value == "translation"
        assert ExerciseType.CONJUGATION.value == "conjugation"
        assert ExerciseType.SENTENCE_TRANSFORMATION.value == "sentence-transformation"
        
        # Verify base model exists with required fields
        assert hasattr(grammar_exercise, 'ExerciseBase')
        base_fields = ExerciseBase.model_fields
        assert 'id' in base_fields
        assert 'type' in base_fields
        assert 'prompt' in base_fields
        assert 'correct_answer' in base_fields or 'correct_answers' in base_fields
        assert 'topic' in base_fields
        assert 'difficulty' in base_fields
        
        # Verify type-specific models exist
        assert hasattr(grammar_exercise, 'FillInTheBlankExercise')
        assert hasattr(grammar_exercise, 'MultipleChoiceExercise')
        assert hasattr(grammar_exercise, 'TranslationExerciseModel')
        assert hasattr(grammar_exercise, 'ConjugationExerciseModel')
        assert hasattr(grammar_exercise, 'SentenceTransformationExerciseModel')
        
        # Verify union type exists
        assert hasattr(grammar_exercise, 'Exercise')

    def test_ac2_example_exercises_for_each_type(self) -> None:
        """AC2: Example exercises for each type exist and are valid."""
        exercise_dir = Path(__file__).parent.parent / "data" / "grammar" / "exercises"
        
        # Verify directory exists
        assert exercise_dir.exists(), f"Directory {exercise_dir} should exist"
        assert exercise_dir.is_dir(), f"{exercise_dir} should be a directory"
        
        # Verify all 5 example files exist
        expected_files = [
            "fill-in-the-blank-present-tense.json",
            "multiple-choice-etre.json",
            "translation-j-aime.json",
            "conjugation-parler-nous.json",
            "transformation-negative.json"
        ]
        
        for file_name in expected_files:
            file_path = exercise_dir / file_name
            assert file_path.exists(), f"Example file {file_name} should exist"
            assert file_path.is_file(), f"{file_name} should be a file"
        
        # Verify each file can be loaded and validated
        for file_name in expected_files:
            file_path = exercise_dir / file_name
            exercise = load_exercise_from_file(file_path)
            assert exercise is not None
            assert isinstance(exercise, Exercise)

    def test_ac3_answer_key_included(self) -> None:
        """AC3: Answer key included in all example exercises."""
        exercise_dir = Path(__file__).parent.parent / "data" / "grammar" / "exercises"
        
        expected_files = [
            "fill-in-the-blank-present-tense.json",
            "multiple-choice-etre.json",
            "translation-j-aime.json",
            "conjugation-parler-nous.json",
            "transformation-negative.json"
        ]
        
        for file_name in expected_files:
            file_path = exercise_dir / file_name
            exercise = load_exercise_from_file(file_path)
            
            # Verify answer is present
            assert exercise.correct_answer is not None or exercise.correct_answers is not None, \
                f"Exercise {file_name} must have correct_answer or correct_answers"


# =============================================================================
# Tests for Valid Exercise Data
# =============================================================================

class TestValidExercises:
    """Tests for valid exercises of each type."""

    def test_valid_fill_in_blank(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test creating a valid fill-in-the-blank exercise."""
        exercise = FillInTheBlankExercise(**valid_fill_in_blank_data)
        
        assert exercise.id == "fill-in-the-blank-test"
        assert exercise.type == ExerciseType.FILL_IN_THE_BLANK
        assert exercise.prompt == "Je ___ français."
        assert exercise.correct_answer == "parle"
        assert exercise.topic == "Verbs"
        assert exercise.difficulty == DifficultyLevel.BEGINNER
        assert exercise.hint == "Conjugate 'parler' for 'je'"

    def test_valid_multiple_choice(self, valid_multiple_choice_data: dict[str, Any]) -> None:
        """Test creating a valid multiple-choice exercise."""
        exercise = MultipleChoiceExercise(**valid_multiple_choice_data)
        
        assert exercise.id == "multiple-choice-test"
        assert exercise.type == ExerciseType.MULTIPLE_CHOICE
        assert exercise.prompt == "Quelle est la forme correcte?"
        assert exercise.correct_answer == "suis"
        assert exercise.options == ["suis", "es", "est"]
        assert exercise.topic == "Verbs"
        assert exercise.difficulty == DifficultyLevel.BEGINNER

    def test_valid_translation(self, valid_translation_data: dict[str, Any]) -> None:
        """Test creating a valid translation exercise."""
        exercise = TranslationExerciseModel(**valid_translation_data)
        
        assert exercise.id == "translation-test"
        assert exercise.type == ExerciseType.TRANSLATION
        assert exercise.prompt == "Translate to English: J'aime le fromage"
        assert exercise.correct_answer == "I like cheese"
        assert exercise.source_language == "fr"
        assert exercise.target_language == "en"
        assert exercise.topic == "Sentence Structure"
        assert exercise.difficulty == DifficultyLevel.BEGINNER

    def test_valid_conjugation(self, valid_conjugation_data: dict[str, Any]) -> None:
        """Test creating a valid conjugation exercise."""
        exercise = ConjugationExerciseModel(**valid_conjugation_data)
        
        assert exercise.id == "conjugation-test"
        assert exercise.type == ExerciseType.CONJUGATION
        assert exercise.prompt == "Conjugate 'parler' for 'nous'"
        assert exercise.correct_answers == ["parlons"]
        assert exercise.verb == "parler"
        assert exercise.tense == "present"
        assert exercise.pronoun == "nous"
        assert exercise.topic == "Verbs"
        assert exercise.difficulty == DifficultyLevel.BEGINNER

    def test_valid_transformation(self, valid_transformation_data: dict[str, Any]) -> None:
        """Test creating a valid sentence transformation exercise."""
        exercise = SentenceTransformationExerciseModel(**valid_transformation_data)
        
        assert exercise.id == "transformation-test"
        assert exercise.type == ExerciseType.SENTENCE_TRANSFORMATION
        assert exercise.prompt == "Rewrite in negative form: Je parle français."
        assert exercise.correct_answer == "Je ne parle pas français."
        assert exercise.transformation_type == "negative"
        assert exercise.topic == "Sentence Structure"
        assert exercise.difficulty == DifficultyLevel.BEGINNER

    def test_all_difficulty_levels(self) -> None:
        """Test that all difficulty levels are accepted for all exercise types."""
        for difficulty in ["beginner", "intermediate", "advanced"]:
            # Fill-in-the-blank
            data = {
                "id": f"test-{difficulty}",
                "type": "fill-in-the-blank",
                "prompt": "Test",
                "correct_answer": "test",
                "topic": "Test",
                "difficulty": difficulty
            }
            exercise = FillInTheBlankExercise(**data)
            assert exercise.difficulty == DifficultyLevel(difficulty)
            
            # Multiple choice
            data = {
                "id": f"test-{difficulty}",
                "type": "multiple-choice",
                "prompt": "Test",
                "correct_answer": "a",
                "options": ["a", "b", "c"],
                "topic": "Test",
                "difficulty": difficulty
            }
            exercise = MultipleChoiceExercise(**data)
            assert exercise.difficulty == DifficultyLevel(difficulty)
            
            # Translation
            data = {
                "id": f"test-{difficulty}",
                "type": "translation",
                "prompt": "Test",
                "correct_answer": "test",
                "source_language": "fr",
                "target_language": "en",
                "topic": "Test",
                "difficulty": difficulty
            }
            exercise = TranslationExerciseModel(**data)
            assert exercise.difficulty == DifficultyLevel(difficulty)

    def test_exercise_without_hint(self) -> None:
        """Test that hint field is optional."""
        data = {
            "id": "no-hint",
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = FillInTheBlankExercise(**data)
        assert exercise.hint is None

    def test_exercise_with_unicode(self) -> None:
        """Test exercise with Unicode characters (French text)."""
        data = {
            "id": "unicode-test",
            "type": "fill-in-the-blank",
            "prompt": "Je ___ le café au lait.",
            "correct_answer": "bois",
            "topic": "Verbes",
            "difficulty": "intermediate",
            "hint": "Conjuguez 'boire' pour 'je'"
        }
        exercise = FillInTheBlankExercise(**data)
        assert "café" in exercise.prompt
        assert "boire" in exercise.hint

    def test_conjugation_with_multiple_correct_answers(self) -> None:
        """Test conjugation exercise with multiple correct answers."""
        data = {
            "id": "multi-answer-conjugation",
            "type": "conjugation",
            "prompt": "Conjugate 'être' for 'je'",
            "correct_answers": ["suis"],
            "verb": "être",
            "tense": "present",
            "pronoun": "je",
            "topic": "Verbs",
            "difficulty": "beginner"
        }
        exercise = ConjugationExerciseModel(**data)
        assert exercise.correct_answers == ["suis"]

    def test_multiple_choice_with_four_options(self) -> None:
        """Test multiple choice with 4 options."""
        data = {
            "id": "four-options",
            "type": "multiple-choice",
            "prompt": "Which is correct?",
            "correct_answer": "a",
            "options": ["a", "b", "c", "d"],
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = MultipleChoiceExercise(**data)
        assert len(exercise.options) == 4


# =============================================================================
# Tests for Missing Required Fields
# =============================================================================

class TestMissingRequiredFields:
    """Tests for validation errors when required fields are missing."""

    def test_missing_id_fill_in_blank(self) -> None:
        """Test fill-in-the-blank without ID raises ValidationError."""
        data = {
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "id" in error_fields

    def test_missing_type(self) -> None:
        """Test exercise without type raises ValidationError."""
        data = {
            "id": "test",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            ExerciseBase(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "type" in error_fields

    def test_missing_prompt(self) -> None:
        """Test exercise without prompt raises ValidationError."""
        data = {
            "id": "test",
            "type": "fill-in-the-blank",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "prompt" in error_fields

    def test_missing_correct_answer(self) -> None:
        """Test exercise without any correct answer raises ValidationError."""
        data = {
            "id": "test",
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        # Should have error about missing answer
        error_text = str(exc_info.value).lower()
        assert "correct_answer" in error_text or "answer" in error_text

    def test_missing_topic(self) -> None:
        """Test exercise without topic raises ValidationError."""
        data = {
            "id": "test",
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "correct_answer": "test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "topic" in error_fields

    def test_missing_difficulty(self) -> None:
        """Test exercise without difficulty raises ValidationError."""
        data = {
            "id": "test",
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "difficulty" in error_fields

    def test_missing_options_multiple_choice(self) -> None:
        """Test multiple choice without options raises ValidationError."""
        data = {
            "id": "test",
            "type": "multiple-choice",
            "prompt": "Test",
            "correct_answer": "a",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            MultipleChoiceExercise(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "options" in error_fields

    def test_missing_verb_conjugation(self) -> None:
        """Test conjugation without verb raises ValidationError."""
        data = {
            "id": "test",
            "type": "conjugation",
            "prompt": "Test",
            "correct_answers": ["test"],
            "tense": "present",
            "pronoun": "je",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            ConjugationExerciseModel(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "verb" in error_fields

    def test_missing_source_language_translation(self) -> None:
        """Test translation without source_language raises ValidationError."""
        data = {
            "id": "test",
            "type": "translation",
            "prompt": "Test",
            "correct_answer": "test",
            "target_language": "en",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            TranslationExerciseModel(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "source_language" in error_fields

    def test_missing_transformation_type(self) -> None:
        """Test sentence transformation without transformation_type raises ValidationError."""
        data = {
            "id": "test",
            "type": "sentence-transformation",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            SentenceTransformationExerciseModel(**data)
        
        errors = exc_info.value.errors()
        error_fields = {error['loc'][-1] for error in errors}
        assert "transformation_type" in error_fields


# =============================================================================
# Tests for Invalid Field Values
# =============================================================================

class TestInvalidFieldValues:
    """Tests for validation errors with invalid field values."""

    def test_invalid_exercise_type(self) -> None:
        """Test exercise with invalid type raises ValidationError."""
        data = {
            "id": "test",
            "type": "invalid-type",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            ExerciseBase(**data)
        
        errors = exc_info.value.errors()
        assert any("type" in error['loc'] for error in errors)

    def test_invalid_difficulty(self) -> None:
        """Test exercise with invalid difficulty raises ValidationError."""
        data = {
            "id": "test",
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "expert"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        assert any("difficulty" in error['loc'] for error in errors)

    def test_invalid_id_pattern(self) -> None:
        """Test exercise with invalid ID pattern raises ValidationError."""
        invalid_ids = ["Test-ID", "test id", "test_id", "123test", ""]
        
        for invalid_id in invalid_ids:
            data = {
                "id": invalid_id,
                "type": "fill-in-the-blank",
                "prompt": "Test",
                "correct_answer": "test",
                "topic": "Test",
                "difficulty": "beginner"
            }
            with pytest.raises(ValidationError):
                FillInTheBlankExercise(**data)

    def test_empty_string_prompt(self) -> None:
        """Test exercise with empty prompt raises ValidationError."""
        data = {
            "id": "test",
            "type": "fill-in-the-blank",
            "prompt": "",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        assert any("prompt" in error['loc'] for error in errors)

    def test_whitespace_only_prompt(self) -> None:
        """Test exercise with whitespace-only prompt raises ValidationError."""
        data = {
            "id": "test",
            "type": "fill-in-the-blank",
            "prompt": "   ",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        assert any("prompt" in error['loc'] for error in errors)

    def test_empty_string_correct_answer(self) -> None:
        """Test exercise with empty correct_answer raises ValidationError."""
        data = {
            "id": "test",
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "correct_answer": "",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            FillInTheBlankExercise(**data)
        
        errors = exc_info.value.errors()
        assert any("correct_answer" in error['loc'] for error in errors)

    def test_empty_options_multiple_choice(self) -> None:
        """Test multiple choice with empty options list raises ValidationError."""
        data = {
            "id": "test",
            "type": "multiple-choice",
            "prompt": "Test",
            "correct_answer": "a",
            "options": [],
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            MultipleChoiceExercise(**data)
        
        errors = exc_info.value.errors()
        assert any("options" in error['loc'] for error in errors)

    def test_two_options_multiple_choice(self) -> None:
        """Test multiple choice with only 2 options raises ValidationError."""
        data = {
            "id": "test",
            "type": "multiple-choice",
            "prompt": "Test",
            "correct_answer": "a",
            "options": ["a", "b"],
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            MultipleChoiceExercise(**data)
        
        errors = exc_info.value.errors()
        assert any("options" in error['loc'] for error in errors)

    def test_invalid_source_language(self) -> None:
        """Test translation with invalid source_language raises ValidationError."""
        data = {
            "id": "test",
            "type": "translation",
            "prompt": "Test",
            "correct_answer": "test",
            "source_language": "f",  # Too short
            "target_language": "en",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            TranslationExerciseModel(**data)
        
        errors = exc_info.value.errors()
        assert any("source_language" in error['loc'] for error in errors)

    def test_invalid_target_language(self) -> None:
        """Test translation with invalid target_language raises ValidationError."""
        data = {
            "id": "test",
            "type": "translation",
            "prompt": "Test",
            "correct_answer": "test",
            "source_language": "fr",
            "target_language": "english",  # Too long
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            TranslationExerciseModel(**data)
        
        errors = exc_info.value.errors()
        assert any("target_language" in error['loc'] for error in errors)

    def test_empty_string_verb(self) -> None:
        """Test conjugation with empty verb raises ValidationError."""
        data = {
            "id": "test",
            "type": "conjugation",
            "prompt": "Test",
            "correct_answers": ["test"],
            "verb": "",
            "tense": "present",
            "pronoun": "je",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            ConjugationExerciseModel(**data)
        
        errors = exc_info.value.errors()
        assert any("verb" in error['loc'] for error in errors)

    def test_empty_correct_answers_list(self) -> None:
        """Test conjugation with empty correct_answers list raises ValidationError."""
        data = {
            "id": "test",
            "type": "conjugation",
            "prompt": "Test",
            "correct_answers": [],
            "verb": "parler",
            "tense": "present",
            "pronoun": "je",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            ConjugationExerciseModel(**data)
        
        errors = exc_info.value.errors()
        # Should have error about correct_answers being empty
        error_text = str(exc_info.value).lower()
        assert "correct_answers" in error_text or "min_length" in error_text


# =============================================================================
# Tests for validate_exercise_data function
# =============================================================================

class TestValidateExerciseData:
    """Tests for the validate_exercise_data function."""

    def test_validate_fill_in_blank_data(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test validate_exercise_data with fill-in-the-blank data."""
        exercise = validate_exercise_data(valid_fill_in_blank_data)
        assert isinstance(exercise, FillInTheBlankExercise)
        assert exercise.id == "fill-in-the-blank-test"

    def test_validate_multiple_choice_data(self, valid_multiple_choice_data: dict[str, Any]) -> None:
        """Test validate_exercise_data with multiple-choice data."""
        exercise = validate_exercise_data(valid_multiple_choice_data)
        assert isinstance(exercise, MultipleChoiceExercise)
        assert exercise.id == "multiple-choice-test"

    def test_validate_translation_data(self, valid_translation_data: dict[str, Any]) -> None:
        """Test validate_exercise_data with translation data."""
        exercise = validate_exercise_data(valid_translation_data)
        assert isinstance(exercise, TranslationExerciseModel)
        assert exercise.id == "translation-test"

    def test_validate_conjugation_data(self, valid_conjugation_data: dict[str, Any]) -> None:
        """Test validate_exercise_data with conjugation data."""
        exercise = validate_exercise_data(valid_conjugation_data)
        assert isinstance(exercise, ConjugationExerciseModel)
        assert exercise.id == "conjugation-test"

    def test_validate_transformation_data(self, valid_transformation_data: dict[str, Any]) -> None:
        """Test validate_exercise_data with sentence transformation data."""
        exercise = validate_exercise_data(valid_transformation_data)
        assert isinstance(exercise, SentenceTransformationExerciseModel)
        assert exercise.id == "transformation-test"

    def test_validate_missing_type(self) -> None:
        """Test validate_exercise_data with missing type raises KeyError."""
        data = {
            "id": "test",
            "prompt": "Test",
            "correct_answer": "test"
        }
        with pytest.raises(KeyError) as exc_info:
            validate_exercise_data(data)
        
        assert "type" in str(exc_info.value)

    def test_validate_invalid_type(self) -> None:
        """Test validate_exercise_data with invalid type raises ValueError."""
        data = {
            "id": "test",
            "type": "invalid-type",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValueError) as exc_info:
            validate_exercise_data(data)
        
        assert "Invalid exercise type" in str(exc_info.value)


# =============================================================================
# Tests for Helper Functions
# =============================================================================

class TestHelperFunctions:
    """Tests for loading helper functions."""

    def test_load_exercise_from_file(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test loading a valid exercise from a file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(valid_fill_in_blank_data, f)
            temp_path = f.name
        
        try:
            exercise = load_exercise_from_file(temp_path)
            assert isinstance(exercise, FillInTheBlankExercise)
            assert exercise.id == "fill-in-the-blank-test"
        finally:
            Path(temp_path).unlink()

    def test_load_exercise_from_file_not_found(self) -> None:
        """Test load_exercise_from_file with non-existent file."""
        with pytest.raises(FileNotFoundError):
            load_exercise_from_file("/nonexistent/path/to/file.json")

    def test_load_exercise_from_file_invalid_json(self) -> None:
        """Test load_exercise_from_file with invalid JSON."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write("not valid json {")
            temp_path = f.name
        
        try:
            with pytest.raises(Exception):  # JSONDecodeError or ValidationError
                load_exercise_from_file(temp_path)
        finally:
            Path(temp_path).unlink()

    def test_load_exercises_from_directory(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test loading multiple exercises from a directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create multiple exercise files
            exercise1_path = Path(temp_dir) / "exercise1.json"
            exercise2_path = Path(temp_dir) / "exercise2.json"
            
            exercise1_data = valid_fill_in_blank_data.copy()
            exercise1_data["id"] = "exercise-1"
            
            exercise2_data = valid_fill_in_blank_data.copy()
            exercise2_data["id"] = "exercise-2"
            
            exercise1_path.write_text(json.dumps(exercise1_data))
            exercise2_path.write_text(json.dumps(exercise2_data))
            
            exercises = load_exercises_from_directory(temp_dir)
            
            assert len(exercises) == 2
            assert "exercise-1" in exercises
            assert "exercise-2" in exercises

    def test_load_exercises_from_directory_not_found(self) -> None:
        """Test load_exercises_from_directory with non-existent directory."""
        with pytest.raises(FileNotFoundError):
            load_exercises_from_directory("/nonexistent/path")

    def test_load_exercises_from_directory_duplicate_ids(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test load_exercises_from_directory with duplicate IDs."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create two exercise files with the same ID
            exercise1_path = Path(temp_dir) / "exercise1.json"
            exercise2_path = Path(temp_dir) / "exercise2.json"
            
            # Both have the same ID
            exercise1_path.write_text(json.dumps(valid_fill_in_blank_data))
            exercise2_path.write_text(json.dumps(valid_fill_in_blank_data))
            
            with pytest.raises(ValueError) as exc_info:
                load_exercises_from_directory(temp_dir)
            
            assert "Duplicate exercise ID" in str(exc_info.value)

    def test_validate_exercise_json(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test validate_exercise_json with valid JSON string."""
        json_str = json.dumps(valid_fill_in_blank_data)
        exercise = validate_exercise_json(json_str)
        assert isinstance(exercise, FillInTheBlankExercise)
        assert exercise.id == "fill-in-the-blank-test"

    def test_validate_exercise_json_invalid(self) -> None:
        """Test validate_exercise_json with invalid JSON."""
        with pytest.raises(Exception):  # JSONDecodeError or ValidationError
            validate_exercise_json("not valid json {")


# =============================================================================
# Tests for Multiple Choice Specific Validations
# =============================================================================

class TestMultipleChoiceValidations:
    """Tests for multiple-choice specific validation rules."""

    def test_correct_answer_not_in_options(self) -> None:
        """Test that correct_answer must be in options list."""
        data = {
            "id": "test",
            "type": "multiple-choice",
            "prompt": "Test",
            "correct_answer": "correct",
            "options": ["a", "b", "c"],  # "correct" not in options
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            MultipleChoiceExercise(**data)
        
        errors = exc_info.value.errors()
        error_text = str(errors).lower()
        assert "must be in options" in error_text

    def test_correct_answer_in_options(self) -> None:
        """Test that correct_answer in options is accepted."""
        data = {
            "id": "test",
            "type": "multiple-choice",
            "prompt": "Test",
            "correct_answer": "b",
            "options": ["a", "b", "c"],
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = MultipleChoiceExercise(**data)
        assert exercise.correct_answer == "b"
        assert "b" in exercise.options

    def test_options_with_empty_string(self) -> None:
        """Test that options with empty string raises ValidationError."""
        data = {
            "id": "test",
            "type": "multiple-choice",
            "prompt": "Test",
            "correct_answer": "a",
            "options": ["a", "", "c"],
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            MultipleChoiceExercise(**data)
        
        errors = exc_info.value.errors()
        error_text = str(errors).lower()
        assert "options" in error_text or "non-whitespace" in error_text


# =============================================================================
# Tests for Conjugation Specific Validations
# =============================================================================

class TestConjugationValidations:
    """Tests for conjugation-specific validation rules."""

    def test_conjugation_requires_correct_answers(self) -> None:
        """Test that conjugation exercises must have correct_answers."""
        data = {
            "id": "test",
            "type": "conjugation",
            "prompt": "Test",
            "correct_answer": "parlons",  # Should use correct_answers instead
            "verb": "parler",
            "tense": "present",
            "pronoun": "nous",
            "topic": "Test",
            "difficulty": "beginner"
        }
        with pytest.raises(ValidationError) as exc_info:
            ConjugationExerciseModel(**data)
        
        errors = exc_info.value.errors()
        error_text = str(errors).lower()
        assert "correct_answers" in error_text or "required" in error_text

    def test_conjugation_with_correct_answers_list(self) -> None:
        """Test that conjugation with correct_answers list is accepted."""
        data = {
            "id": "test",
            "type": "conjugation",
            "prompt": "Test",
            "correct_answers": ["parlons"],
            "verb": "parler",
            "tense": "present",
            "pronoun": "nous",
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = ConjugationExerciseModel(**data)
        assert exercise.correct_answers == ["parlons"]

    def test_conjugation_with_multiple_correct_answers(self) -> None:
        """Test conjugation with multiple correct answers."""
        data = {
            "id": "test",
            "type": "conjugation",
            "prompt": "Test",
            "correct_answers": ["parlons", "parlons "],  # Multiple forms
            "verb": "parler",
            "tense": "present",
            "pronoun": "nous",
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = ConjugationExerciseModel(**data)
        assert len(exercise.correct_answers) == 2


# =============================================================================
# Tests for Model Properties and Methods
# =============================================================================

class TestModelProperties:
    """Tests for model properties and methods."""

    def test_exercise_type_enum(self) -> None:
        """Test ExerciseType enum values."""
        assert ExerciseType.FILL_IN_THE_BLANK.value == "fill-in-the-blank"
        assert ExerciseType.MULTIPLE_CHOICE.value == "multiple-choice"
        assert ExerciseType.TRANSLATION.value == "translation"
        assert ExerciseType.CONJUGATION.value == "conjugation"
        assert ExerciseType.SENTENCE_TRANSFORMATION.value == "sentence-transformation"

    def test_fill_in_blank_model_dump(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test that FillInTheBlankExercise can be dumped to a dictionary."""
        exercise = FillInTheBlankExercise(**valid_fill_in_blank_data)
        dumped = exercise.model_dump()
        
        assert dumped["id"] == "fill-in-the-blank-test"
        assert dumped["type"] == "fill-in-the-blank"
        assert dumped["prompt"] == "Je ___ français."
        assert dumped["correct_answer"] == "parle"

    def test_multiple_choice_model_dump(self, valid_multiple_choice_data: dict[str, Any]) -> None:
        """Test that MultipleChoiceExercise can be dumped to a dictionary."""
        exercise = MultipleChoiceExercise(**valid_multiple_choice_data)
        dumped = exercise.model_dump()
        
        assert dumped["id"] == "multiple-choice-test"
        assert dumped["type"] == "multiple-choice"
        assert dumped["options"] == ["suis", "es", "est"]

    def test_translation_model_dump(self, valid_translation_data: dict[str, Any]) -> None:
        """Test that TranslationExerciseModel can be dumped to a dictionary."""
        exercise = TranslationExerciseModel(**valid_translation_data)
        dumped = exercise.model_dump()
        
        assert dumped["id"] == "translation-test"
        assert dumped["type"] == "translation"
        assert dumped["source_language"] == "fr"
        assert dumped["target_language"] == "en"

    def test_conjugation_model_dump(self, valid_conjugation_data: dict[str, Any]) -> None:
        """Test that ConjugationExerciseModel can be dumped to a dictionary."""
        exercise = ConjugationExerciseModel(**valid_conjugation_data)
        dumped = exercise.model_dump()
        
        assert dumped["id"] == "conjugation-test"
        assert dumped["type"] == "conjugation"
        assert dumped["verb"] == "parler"
        assert dumped["tense"] == "present"
        assert dumped["pronoun"] == "nous"
        assert dumped["correct_answers"] == ["parlons"]

    def test_transformation_model_dump(self, valid_transformation_data: dict[str, Any]) -> None:
        """Test that SentenceTransformationExerciseModel can be dumped to a dictionary."""
        exercise = SentenceTransformationExerciseModel(**valid_transformation_data)
        dumped = exercise.model_dump()
        
        assert dumped["id"] == "transformation-test"
        assert dumped["type"] == "sentence-transformation"
        assert dumped["transformation_type"] == "negative"

    def test_fill_in_blank_model_dump_json(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test that FillInTheBlankExercise can be dumped to JSON."""
        exercise = FillInTheBlankExercise(**valid_fill_in_blank_data)
        json_str = exercise.model_dump_json()
        
        # Parse back and verify
        parsed = json.loads(json_str)
        assert parsed["id"] == "fill-in-the-blank-test"
        assert parsed["type"] == "fill-in-the-blank"


# =============================================================================
# Tests for Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    def test_exercise_with_french_diacritics(self) -> None:
        """Test exercise with French diacritics."""
        data = {
            "id": "diacritics-test",
            "type": "fill-in-the-blank",
            "prompt": "J'ai ___ le café.",
            "correct_answer": "bu",
            "topic": "Verbes",
            "difficulty": "beginner",
            "hint": "Conjuguez 'boire' pour 'j'ai'"
        }
        exercise = FillInTheBlankExercise(**data)
        assert "café" in exercise.prompt
        assert "boire" in exercise.hint

    def test_exercise_with_long_strings(self) -> None:
        """Test exercise with very long strings."""
        long_string = "x" * 1000
        data = {
            "id": "long-strings-test",
            "type": "fill-in-the-blank",
            "prompt": long_string,
            "correct_answer": long_string,
            "topic": long_string,
            "difficulty": "beginner",
            "hint": long_string
        }
        exercise = FillInTheBlankExercise(**data)
        assert len(exercise.prompt) == 1000

    def test_exercise_id_with_numbers(self) -> None:
        """Test exercise ID with numbers (valid pattern)."""
        data = {
            "id": "exercise-123-test",
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = FillInTheBlankExercise(**data)
        assert exercise.id == "exercise-123-test"

    def test_exercise_id_single_letter(self) -> None:
        """Test exercise ID with single letter (valid pattern)."""
        data = {
            "id": "x",
            "type": "fill-in-the-blank",
            "prompt": "Test",
            "correct_answer": "test",
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = FillInTheBlankExercise(**data)
        assert exercise.id == "x"

    def test_multiple_choice_with_many_options(self) -> None:
        """Test multiple choice with many options."""
        options = [f"option-{i}" for i in range(10)]
        data = {
            "id": "many-options",
            "type": "multiple-choice",
            "prompt": "Test",
            "correct_answer": "option-0",
            "options": options,
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = MultipleChoiceExercise(**data)
        assert len(exercise.options) == 10

    def test_conjugation_with_many_correct_answers(self) -> None:
        """Test conjugation with many correct answers."""
        correct_answers = [f"form-{i}" for i in range(10)]
        data = {
            "id": "many-answers",
            "type": "conjugation",
            "prompt": "Test",
            "correct_answers": correct_answers,
            "verb": "test",
            "tense": "present",
            "pronoun": "je",
            "topic": "Test",
            "difficulty": "beginner"
        }
        exercise = ConjugationExerciseModel(**data)
        assert len(exercise.correct_answers) == 10

    def test_exercise_equality(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test that Exercise instances can be compared for equality."""
        exercise1 = FillInTheBlankExercise(**valid_fill_in_blank_data)
        exercise2 = FillInTheBlankExercise(**valid_fill_in_blank_data)
        
        assert exercise1 == exercise2

    def test_exercise_repr(self, valid_fill_in_blank_data: dict[str, Any]) -> None:
        """Test that Exercise has a string representation."""
        exercise = FillInTheBlankExercise(**valid_fill_in_blank_data)
        repr_str = repr(exercise)
        assert "FillInTheBlankExercise" in repr_str
