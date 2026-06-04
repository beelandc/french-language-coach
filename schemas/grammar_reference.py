"""Pydantic models for grammar reference entry validation.

This module provides Pydantic models for validating grammar reference data
against the JSON schema for reference entries. Reference entries are concise,
searchable grammar definitions for quick lookup, complementing the more
detailed grammar lessons.

The models mirror the structure of grammar reference entries and provide:
- Type-safe data validation
- Automatic serialization/deserialization
- Custom validation for non-empty strings and valid difficulty levels
- Helper functions for loading and validating reference files
"""

from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from .grammar_lesson import DifficultyLevel


class GrammarReferenceCategory(str, Enum):
    """Valid categories for grammar reference entries.
    
    These categories provide a controlled vocabulary for organizing
    reference entries by grammatical topic.
    """
    VERBS = "Verbs"
    NOUNS = "Nouns"
    ADJECTIVES = "Adjectives"
    ADVERBS = "Adverbs"
    PRONOUNS = "Pronouns"
    PREPOSITIONS = "Prepositions"
    CONJUNCTIONS = "Conjunctions"
    ARTICLES = "Articles"
    SENTENCE_STRUCTURE = "Sentence Structure"
    PUNCTUATION = "Punctuation"
    OTHER = "Other"


class GrammarReference(BaseModel):
    """A grammar reference entry for quick lookup.
    
    Reference entries provide concise, searchable definitions of grammar
    concepts, complementing the more detailed grammar lessons. Each entry
    contains the essential information needed to understand a specific
    grammar term or concept.
    
    Attributes:
        id: Unique identifier for the reference entry (lowercase alphanumeric with hyphens)
        term: The grammar term name (e.g., "Le Subjonctif", "Passé Composé")
        category: The grammatical category (e.g., Verbs, Nouns, Adjectives)
        difficulty: The difficulty level (beginner, intermediate, advanced)
        definition: Concise explanation of the term (1-3 sentences)
        examples: List of practical usage examples (minimum 2)
        common_pitfalls: List of common mistakes to avoid (minimum 1)
        related_terms: Optional list of related grammar terms
    """
    id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r'^[a-z][a-z0-9-]*$',
        description="Unique identifier (lowercase alphanumeric with hyphens)"
    )
    term: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="The grammar term name"
    )
    category: GrammarReferenceCategory = Field(
        ...,
        description="The grammatical category"
    )
    difficulty: DifficultyLevel = Field(
        ...,
        description="Difficulty level: beginner, intermediate, or advanced"
    )
    definition: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Concise explanation of the term"
    )
    examples: list[str] = Field(
        ...,
        min_length=2,
        description="List of practical usage examples (minimum 2)"
    )
    common_pitfalls: list[str] = Field(
        ...,
        min_length=1,
        description="List of common mistakes to avoid (minimum 1)"
    )
    related_terms: list[str] = Field(
        default_factory=list,
        description="Optional list of related grammar terms"
    )
    
    @field_validator('id', 'term', 'definition')
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        """Validate that string fields are not empty or whitespace-only."""
        if not v.strip():
            raise ValueError("String must contain non-whitespace characters")
        return v
    
    @field_validator('examples', 'common_pitfalls', 'related_terms')
    @classmethod
    def validate_list_items_non_empty(cls, v: list[str]) -> list[str]:
        """Validate that all list items are non-empty strings."""
        for item in v:
            if not item.strip():
                raise ValueError("List items must contain non-whitespace characters")
        return v


def load_reference_from_file(file_path: Path | str) -> GrammarReference:
    """Load and validate a grammar reference entry from a JSON file.
    
    Args:
        file_path: Path to the JSON file containing reference data
        
    Returns:
        Validated GrammarReference instance
        
    Raises:
        FileNotFoundError: If the file does not exist
        ValueError: If the file contains invalid JSON or invalid reference data
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Reference file not found: {path}")
    
    reference_data = path.read_text(encoding='utf-8')
    return GrammarReference.model_validate_json(reference_data)


def load_references_from_directory(directory_path: Path | str) -> dict[str, GrammarReference]:
    """Load and validate all grammar reference entries from a directory.
    
    Args:
        directory_path: Path to the directory containing reference JSON files
        
    Returns:
        Dictionary mapping reference IDs to validated GrammarReference instances
        
    Raises:
        FileNotFoundError: If the directory does not exist
        ValueError: If any reference file contains invalid data or duplicate IDs
    """
    path = Path(directory_path)
    if not path.exists():
        raise FileNotFoundError(f"Directory not found: {path}")
    
    references: dict[str, GrammarReference] = {}
    
    for json_file in path.glob("*.json"):
        reference = load_reference_from_file(json_file)
        
        # Check for duplicate IDs
        if reference.id in references:
            raise ValueError(
                f"Duplicate reference ID '{reference.id}' found in: {json_file} "
                f"(previously in: {list(path.glob(f'{reference.id}.json'))})"
            )
        
        references[reference.id] = reference
    
    return references


def validate_reference_data(data: dict[str, Any]) -> GrammarReference:
    """Validate reference data against the GrammarReference schema.
    
    Args:
        data: Dictionary containing reference data
        
    Returns:
        Validated GrammarReference instance
        
    Raises:
        pydantic.ValidationError: If the data does not conform to the schema
    """
    return GrammarReference.model_validate(data)


def validate_reference_json(json_str: str) -> GrammarReference:
    """Validate reference data from a JSON string.
    
    Args:
        json_str: JSON string containing reference data
        
    Returns:
        Validated GrammarReference instance
        
    Raises:
        pydantic.ValidationError: If the JSON does not conform to the schema
    """
    return GrammarReference.model_validate_json(json_str)
