"""Pydantic models for grammar exercise schema validation.

This module provides Pydantic models for validating grammar exercise data
against the JSON schema defined for grammar practice exercises.

The models support five exercise types:
- Fill-in-the-blank
- Multiple choice
- Translation (French to English)
- Conjugation
- Sentence transformation

The models mirror the JSON Schema structure and provide:
- Type-safe data validation
- Automatic serialization/deserialization
- Custom validation for non-empty strings and valid exercise types
- Helper functions for loading and validating exercise files
"""

from enum import Enum
from pathlib import Path
from typing import Any, Literal, Union

from pydantic import BaseModel, Field, field_validator, model_validator

from .grammar_lesson import DifficultyLevel


class ExerciseType(str, Enum):
    """Valid exercise types for grammar practice exercises.
    
    Defines the five supported exercise types as specified in issue #34.
    """
    FILL_IN_THE_BLANK = "fill-in-the-blank"
    MULTIPLE_CHOICE = "multiple-choice"
    TRANSLATION = "translation"
    CONJUGATION = "conjugation"
    SENTENCE_TRANSFORMATION = "sentence-transformation"


class TranslationExercise(BaseModel):
    """Type-specific fields for translation exercises.
    
    Translation exercises require source and target language specification.
    Currently only supports French to English as per issue #34.
    
    Attributes:
        source_language: The language of the text to translate (ISO 639-1 code)
        target_language: The language to translate to (ISO 639-1 code)
    """
    source_language: str = Field(
        ...,
        min_length=2,
        max_length=2,
        description="Source language ISO 639-1 code (e.g., 'fr' for French)"
    )
    target_language: str = Field(
        ...,
        min_length=2,
        max_length=2,
        description="Target language ISO 639-1 code (e.g., 'en' for English)"
    )


class ConjugationExercise(BaseModel):
    """Type-specific fields for conjugation exercises.
    
    Conjugation exercises require additional metadata about the verb and tense.
    
    Attributes:
        verb: The infinitive form of the verb to conjugate
        tense: The tense to conjugate in
        pronoun: The subject pronoun for the conjugation
    """
    verb: str = Field(..., min_length=1, description="Infinitive form of the verb")
    tense: str = Field(..., min_length=1, description="Tense to conjugate in")
    pronoun: str = Field(..., min_length=1, description="Subject pronoun for conjugation")


class SentenceTransformationExercise(BaseModel):
    """Type-specific fields for sentence transformation exercises.
    
    Sentence transformation exercises require the type of transformation.
    
    Attributes:
        transformation_type: The type of transformation (e.g., negative, affirmative, interrogative)
    """
    transformation_type: str = Field(
        ...,
        min_length=1,
        description="Type of sentence transformation"
    )


class ExerciseBase(BaseModel):
    """Base model for grammar practice exercises with common fields.
    
    Contains fields that are common to all exercise types.
    
    Attributes:
        id: Unique identifier for the exercise (lowercase alphanumeric with hyphens)
        type: The exercise type (fill-in-the-blank, multiple-choice, etc.)
        prompt: The question or instruction for the exercise
        correct_answer: The correct answer (for single-answer exercises)
        correct_answers: List of correct answers (for exercises with multiple valid answers)
        topic: The grammatical topic or category
        difficulty: The difficulty level (beginner, intermediate, advanced)
        hint: Optional hint for the user
    """
    id: str = Field(
        ...,
        min_length=1,
        pattern=r'^[a-z][a-z0-9-]*$',
        description="Unique identifier (lowercase alphanumeric with hyphens)"
    )
    type: ExerciseType = Field(..., description="Type of exercise")
    prompt: str = Field(..., min_length=1, description="Question or instruction")
    correct_answer: str | None = Field(
        default=None,
        min_length=1,
        description="Correct answer (for single-answer exercises)"
    )
    correct_answers: list[str] | None = Field(
        default=None,
        min_length=1,
        description="List of correct answers (for exercises with multiple valid answers)"
    )
    topic: str = Field(..., min_length=1, description="Grammatical topic or category")
    difficulty: DifficultyLevel = Field(
        ...,
        description="Difficulty level: beginner, intermediate, or advanced"
    )
    hint: str | None = Field(
        default=None,
        min_length=1,
        description="Optional hint for the user"
    )
    
    @field_validator('id', 'prompt', 'topic', 'hint')
    @classmethod
    def validate_non_empty_strings(cls, v: str | None) -> str | None:
        """Validate that string fields are not empty or whitespace-only."""
        if v is not None and not v.strip():
            raise ValueError("String must contain non-whitespace characters")
        return v
    
    @field_validator('correct_answer')
    @classmethod
    def validate_correct_answer_non_empty(cls, v: str | None) -> str | None:
        """Validate that correct_answer is not empty if provided."""
        if v is not None and not v.strip():
            raise ValueError("Correct answer must contain non-whitespace characters")
        return v
    
    @field_validator('correct_answers')
    @classmethod
    def validate_correct_answers_non_empty(cls, v: list[str] | None) -> list[str] | None:
        """Validate that all correct_answers are non-empty strings."""
        if v is not None:
            for answer in v:
                if not answer.strip():
                    raise ValueError("Correct answers must contain non-whitespace characters")
        return v
    
    @model_validator(mode='after')
    def validate_answer_present(self) -> 'ExerciseBase':
        """Validate that at least one answer field is provided."""
        if self.correct_answer is None and self.correct_answers is None:
            raise ValueError("Either correct_answer or correct_answers must be provided")
        return self


class MultipleChoiceExercise(ExerciseBase):
    """Model for multiple-choice exercises.
    
    Extends ExerciseBase with options field and validates that there are
    at least 3 options (1 correct + 2 distractors).
    
    Attributes:
        options: List of answer options (must include the correct answer)
    """
    type: Literal[ExerciseType.MULTIPLE_CHOICE] = Field(
        default=ExerciseType.MULTIPLE_CHOICE,
        description="Exercise type (always multiple-choice)"
    )
    options: list[str] = Field(
        ...,
        min_length=3,
        description="List of answer options (minimum 3: 1 correct + 2 distractors)"
    )
    
    @field_validator('options')
    @classmethod
    def validate_options_non_empty(cls, v: list[str]) -> list[str]:
        """Validate that all options are non-empty strings."""
        for option in v:
            if not option.strip():
                raise ValueError("Options must contain non-whitespace characters")
        return v
    
    @model_validator(mode='after')
    def validate_correct_answer_in_options(self) -> 'MultipleChoiceExercise':
        """Validate that the correct answer is in the options list."""
        correct = self.correct_answer
        if correct is not None and correct not in self.options:
            raise ValueError(f"Correct answer '{correct}' must be in options list")
        return self


class FillInTheBlankExercise(ExerciseBase):
    """Model for fill-in-the-blank exercises.
    
    Extends ExerciseBase with no additional required fields.
    The prompt should contain a blank (e.g., "___" or "____") to indicate where the answer goes.
    
    Attributes:
        type: Exercise type (always fill-in-the-blank)
    """
    type: Literal[ExerciseType.FILL_IN_THE_BLANK] = Field(
        default=ExerciseType.FILL_IN_THE_BLANK,
        description="Exercise type (always fill-in-the-blank)"
    )


class TranslationExerciseModel(ExerciseBase):
    """Model for translation exercises.
    
    Extends ExerciseBase with translation-specific fields.
    
    Attributes:
        type: Exercise type (always translation)
        source_language: Source language ISO code
        target_language: Target language ISO code
    """
    type: Literal[ExerciseType.TRANSLATION] = Field(
        default=ExerciseType.TRANSLATION,
        description="Exercise type (always translation)"
    )
    source_language: str = Field(
        ...,
        min_length=2,
        max_length=2,
        description="Source language ISO 639-1 code"
    )
    target_language: str = Field(
        ...,
        min_length=2,
        max_length=2,
        description="Target language ISO 639-1 code"
    )


class ConjugationExerciseModel(ExerciseBase):
    """Model for conjugation exercises.
    
    Extends ExerciseBase with conjugation-specific fields.
    Uses correct_answers (list) instead of correct_answer (string) to support
    multiple valid conjugations.
    
    Attributes:
        type: Exercise type (always conjugation)
        verb: Infinitive form of the verb
        tense: Tense to conjugate in
        pronoun: Subject pronoun
    """
    type: Literal[ExerciseType.CONJUGATION] = Field(
        default=ExerciseType.CONJUGATION,
        description="Exercise type (always conjugation)"
    )
    verb: str = Field(..., min_length=1, description="Infinitive form of the verb")
    tense: str = Field(..., min_length=1, description="Tense to conjugate in")
    pronoun: str = Field(..., min_length=1, description="Subject pronoun for conjugation")
    
    @model_validator(mode='after')
    def validate_correct_answers_required(self) -> 'ConjugationExerciseModel':
        """Validate that conjugation exercises have correct_answers (list)."""
        if self.correct_answers is None:
            raise ValueError("Conjugation exercises must have correct_answers (list)")
        return self


class SentenceTransformationExerciseModel(ExerciseBase):
    """Model for sentence transformation exercises.
    
    Extends ExerciseBase with transformation-specific fields.
    
    Attributes:
        type: Exercise type (always sentence-transformation)
        transformation_type: Type of transformation
    """
    type: Literal[ExerciseType.SENTENCE_TRANSFORMATION] = Field(
        default=ExerciseType.SENTENCE_TRANSFORMATION,
        description="Exercise type (always sentence-transformation)"
    )
    transformation_type: str = Field(
        ...,
        min_length=1,
        description="Type of sentence transformation"
    )


# Union type for all exercise types
Exercise = Union[
    FillInTheBlankExercise,
    MultipleChoiceExercise,
    TranslationExerciseModel,
    ConjugationExerciseModel,
    SentenceTransformationExerciseModel
]


def validate_exercise_data(data: dict[str, Any]) -> Exercise:
    """Validate exercise data against the appropriate Exercise schema.
    
    This function determines the exercise type from the 'type' field and validates
    against the corresponding Pydantic model.
    
    Args:
        data: Dictionary containing exercise data
        
    Returns:
        Validated Exercise instance (one of the type-specific models)
        
    Raises:
        pydantic.ValidationError: If the data does not conform to any exercise schema
        KeyError: If the 'type' field is missing
    """
    if 'type' not in data:
        raise KeyError("Exercise data must contain a 'type' field")
    
    exercise_type = data['type']
    
    # Map exercise type strings to their corresponding models
    type_to_model = {
        ExerciseType.FILL_IN_THE_BLANK: FillInTheBlankExercise,
        ExerciseType.MULTIPLE_CHOICE: MultipleChoiceExercise,
        ExerciseType.TRANSLATION: TranslationExerciseModel,
        ExerciseType.CONJUGATION: ConjugationExerciseModel,
        ExerciseType.SENTENCE_TRANSFORMATION: SentenceTransformationExerciseModel,
    }
    
    # Handle string type values (from JSON files)
    if isinstance(exercise_type, str):
        try:
            exercise_type = ExerciseType(exercise_type)
        except ValueError:
            raise ValueError(
                f"Invalid exercise type: {exercise_type}. "
                f"Valid types are: {', '.join(t.value for t in ExerciseType)}"
            )
    
    model = type_to_model.get(exercise_type)
    if model is None:
        raise ValueError(
            f"No validation model for exercise type: {exercise_type}"
        )
    
    return model.model_validate(data)


def load_exercise_from_file(file_path: Path | str) -> Exercise:
    """Load and validate a grammar exercise from a JSON file.
    
    Args:
        file_path: Path to the JSON file containing exercise data
        
    Returns:
        Validated Exercise instance (type-specific model)
        
    Raises:
        FileNotFoundError: If the file does not exist
        pydantic.ValidationError: If the file contains invalid JSON or invalid exercise data
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Exercise file not found: {path}")
    
    exercise_data = path.read_text(encoding='utf-8')
    return validate_exercise_json(exercise_data)


def load_exercises_from_directory(directory_path: Path | str) -> dict[str, Exercise]:
    """Load and validate all grammar exercises from a directory.
    
    Args:
        directory_path: Path to the directory containing exercise JSON files
        
    Returns:
        Dictionary mapping exercise IDs to validated Exercise instances
        
    Raises:
        FileNotFoundError: If the directory does not exist
        pydantic.ValidationError: If any exercise file contains invalid data
    """
    path = Path(directory_path)
    if not path.exists():
        raise FileNotFoundError(f"Directory not found: {path}")
    
    exercises: dict[str, Exercise] = {}
    
    for json_file in path.glob("*.json"):
        exercise = load_exercise_from_file(json_file)
        
        # Check for duplicate IDs
        if exercise.id in exercises:
            raise ValueError(
                f"Duplicate exercise ID '{exercise.id}' found in: {json_file} "
                f"(previously in: {list(path.glob(f'{exercise.id}.json'))})"
            )
        
        exercises[exercise.id] = exercise
    
    return exercises


def validate_exercise_json(json_str: str) -> Exercise:
    """Validate exercise data from a JSON string.
    
    Args:
        json_str: JSON string containing exercise data
        
    Returns:
        Validated Exercise instance (type-specific model)
        
    Raises:
        pydantic.ValidationError: If the JSON does not conform to any exercise schema
    """
    import json
    data = json.loads(json_str)
    return validate_exercise_data(data)
