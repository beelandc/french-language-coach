"""Pydantic models for grammar lesson schema validation.

This module provides Pydantic models for validating grammar lesson data
against the JSON schema defined in schemas/grammar_lesson.json.

The models mirror the JSON Schema structure and provide:
- Type-safe data validation
- Automatic serialization/deserialization
- Custom validation for non-empty strings and valid difficulty levels
- Helper functions for loading and validating lesson files
"""

from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class DifficultyLevel(str, Enum):
    """Valid difficulty levels for grammar lessons.
    
    Matches the difficulty levels used in scenarios.py for consistency.
    """
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Section(BaseModel):
    """A section within a grammar lesson.
    
    Each section contains a title, content text, and optional examples.
    
    Attributes:
        title: The title of the section (e.g., "Regular -ER Verbs")
        content: The main content/text of the section
        examples: List of example strings illustrating the concept
    """
    title: str = Field(..., min_length=1, description="Title of the lesson section")
    content: str = Field(..., min_length=1, description="Main content of the section")
    examples: list[str] = Field(
        default_factory=list,
        description="List of example strings illustrating the concept"
    )
    
    @field_validator('title', 'content')
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        """Validate that string fields are not empty or whitespace-only."""
        if not v.strip():
            raise ValueError("String must contain non-whitespace characters")
        return v
    
    @field_validator('examples')
    @classmethod
    def validate_examples_non_empty_strings(cls, v: list[str]) -> list[str]:
        """Validate that all example strings are non-empty."""
        for example in v:
            if not example.strip():
                raise ValueError("Example strings must contain non-whitespace characters")
        return v


class GrammarLesson(BaseModel):
    """A grammar lesson with metadata and structured content.
    
    This model represents a complete grammar lesson with identification
    metadata and content organized into sections.
    
    Attributes:
        id: Unique identifier for the lesson (lowercase alphanumeric with hyphens)
        title: Human-readable title of the lesson
        topic: The grammatical topic/category (e.g., "Verbs", "Nouns")
        difficulty: The difficulty level (beginner, intermediate, advanced)
        sections: Array of content sections that make up the lesson
    """
    id: str = Field(
        ...,
        min_length=1,
        pattern=r'^[a-z][a-z0-9-]*$',
        description="Unique identifier (lowercase alphanumeric with hyphens)"
    )
    title: str = Field(..., min_length=1, description="Human-readable title of the lesson")
    topic: str = Field(..., min_length=1, description="Grammatical topic/category")
    difficulty: DifficultyLevel = Field(
        ...,
        description="Difficulty level: beginner, intermediate, or advanced"
    )
    sections: list[Section] = Field(
        ...,
        min_length=1,
        description="Array of content sections"
    )
    
    @field_validator('id', 'title', 'topic')
    @classmethod
    def validate_non_empty_metadata(cls, v: str) -> str:
        """Validate that metadata fields are not empty or whitespace-only."""
        if not v.strip():
            raise ValueError("Field must contain non-whitespace characters")
        return v
    
    @model_validator(mode='after')
    def validate_section_titles_unique(self) -> 'GrammarLesson':
        """Validate that section titles within a lesson are unique."""
        section_titles = [section.title for section in self.sections]
        if len(section_titles) != len(set(section_titles)):
            raise ValueError("Section titles within a lesson must be unique")
        return self


def load_lesson_from_file(file_path: Path | str) -> GrammarLesson:
    """Load and validate a grammar lesson from a JSON file.
    
    Args:
        file_path: Path to the JSON file containing lesson data
        
    Returns:
        Validated GrammarLesson instance
        
    Raises:
        FileNotFoundError: If the file does not exist
        ValueError: If the file contains invalid JSON or invalid lesson data
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Lesson file not found: {path}")
    
    lesson_data = path.read_text(encoding='utf-8')
    return GrammarLesson.model_validate_json(lesson_data)


def load_lessons_from_directory(directory_path: Path | str) -> dict[str, GrammarLesson]:
    """Load and validate all grammar lessons from a directory.
    
    Args:
        directory_path: Path to the directory containing lesson JSON files
        
    Returns:
        Dictionary mapping lesson IDs to validated GrammarLesson instances
        
    Raises:
        FileNotFoundError: If the directory does not exist
        ValueError: If any lesson file contains invalid data
    """
    path = Path(directory_path)
    if not path.exists():
        raise FileNotFoundError(f"Directory not found: {path}")
    
    lessons: dict[str, GrammarLesson] = {}
    
    for json_file in path.glob("*.json"):
        lesson = load_lesson_from_file(json_file)
        
        # Check for duplicate IDs
        if lesson.id in lessons:
            raise ValueError(
                f"Duplicate lesson ID '{lesson.id}' found in: {json_file} "
                f"(previously in: {list(path.glob(f'{lesson.id}.json'))})"
            )
        
        lessons[lesson.id] = lesson
    
    return lessons


def validate_lesson_data(data: dict[str, Any]) -> GrammarLesson:
    """Validate lesson data against the GrammarLesson schema.
    
    Args:
        data: Dictionary containing lesson data
        
    Returns:
        Validated GrammarLesson instance
        
    Raises:
        pydantic.ValidationError: If the data does not conform to the schema
    """
    return GrammarLesson.model_validate(data)


def validate_lesson_json(json_str: str) -> GrammarLesson:
    """Validate lesson data from a JSON string.
    
    Args:
        json_str: JSON string containing lesson data
        
    Returns:
        Validated GrammarLesson instance
        
    Raises:
        pydantic.ValidationError: If the JSON does not conform to the schema
    """
    return GrammarLesson.model_validate_json(json_str)
