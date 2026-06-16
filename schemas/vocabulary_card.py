"""Pydantic models for vocabulary card schema validation.

This module provides Pydantic models for validating vocabulary card data
against the JSON schema defined in schemas/vocabulary_card.json.

The models mirror the JSON Schema structure and provide:
- Type-safe data validation
- Automatic serialization/deserialization
- Custom validation for non-empty strings and valid difficulty levels
- Helper functions for loading and validating card files
"""

from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator
from typing_extensions import Annotated

from schemas.base import BaseSchema


class VocabularyCard(BaseSchema):
    """A vocabulary flashcard with French text and English translation.
    
    This model represents a single vocabulary card containing a French word/phrase,
    its English translation, and metadata for study and organization.
    
    Attributes:
        deck_id: Unique identifier for the deck/collection this card belongs to
        card_id: Unique identifier for this card within the deck
        front: The French word, phrase, or text to be learned
        back: The English translation of the French text
        example: A French sentence using the word/phrase in context (optional)
        tags: List of categorization labels for filtering and organizing (optional)
        context: Description of where the word appeared or was learned from (optional)
        difficulty: Numeric rating from 1 to 5 indicating difficulty level
    """
    deck_id: str = Field(
        ...,
        min_length=1,
        description="Unique identifier for the deck/collection this card belongs to"
    )
    card_id: str = Field(
        ...,
        min_length=1,
        description="Unique identifier for this card within the deck"
    )
    front: str = Field(
        ...,
        min_length=1,
        description="The French word, phrase, or text to be learned"
    )
    back: str = Field(
        ...,
        min_length=1,
        description="The English translation of the French text"
    )
    example: Annotated[str | None, Field(
        default=None,
        min_length=1,
        description="A French sentence using the word/phrase in context"
    )] = None
    tags: list[str] = Field(
        default_factory=list,
        description="List of categorization labels for filtering and organizing cards"
    )
    context: Annotated[str | None, Field(
        default=None,
        min_length=1,
        description="Describes where the word appeared or was learned from"
    )] = None
    difficulty: Annotated[int, Field(
        ge=1,
        le=5,
        description="Numeric rating from 1 to 5 indicating difficulty level"
    )]
    
    @field_validator('deck_id', 'card_id', 'front', 'back')
    @classmethod
    def validate_non_empty_strings(cls, v: str) -> str:
        """Validate that required string fields are not empty or whitespace-only."""
        if not v.strip():
            raise ValueError("String must contain non-whitespace characters")
        return v
    
    @field_validator('example', 'context')
    @classmethod
    def validate_optional_non_empty_strings(cls, v: str | None) -> str | None:
        """Validate that optional string fields, if present, are not empty or whitespace-only."""
        if v is not None and not v.strip():
            raise ValueError("String must contain non-whitespace characters")
        return v
    
    @field_validator('tags')
    @classmethod
    def validate_tags_non_empty_strings(cls, v: list[str]) -> list[str]:
        """Validate that all tag strings are non-empty."""
        for tag in v:
            if not tag.strip():
                raise ValueError("Tag strings must contain non-whitespace characters")
        return v


def load_card_from_file(file_path: Path | str) -> VocabularyCard:
    """Load and validate a vocabulary card from a JSON file.
    
    Args:
        file_path: Path to the JSON file containing card data
        
    Returns:
        Validated VocabularyCard instance
        
    Raises:
        FileNotFoundError: If the file does not exist
        ValueError: If the file contains invalid JSON or invalid card data
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Card file not found: {path}")
    
    card_data = path.read_text(encoding='utf-8')
    return VocabularyCard.model_validate_json(card_data)


def load_cards_from_directory(directory_path: Path | str) -> dict[str, VocabularyCard]:
    """Load and validate all vocabulary cards from a directory.
    
    Each file in the directory should contain a single vocabulary card.
    The card_id is used as the key in the returned dictionary.
    
    Args:
        directory_path: Path to the directory containing card JSON files
        
    Returns:
        Dictionary mapping card IDs to validated VocabularyCard instances
        
    Raises:
        FileNotFoundError: If the directory does not exist
        ValueError: If any card file contains invalid data or if duplicate card IDs exist
    """
    path = Path(directory_path)
    if not path.exists():
        raise FileNotFoundError(f"Directory not found: {path}")
    
    cards: dict[str, VocabularyCard] = {}
    
    for json_file in path.glob("*.json"):
        card = load_card_from_file(json_file)
        
        # Check for duplicate card IDs within the same deck
        card_key = f"{card.deck_id}:{card.card_id}"
        if card_key in cards:
            raise ValueError(
                f"Duplicate card ID '{card.card_id}' in deck '{card.deck_id}' found in: {json_file} "
                f"(previously in: {list(path.glob(f'{card.card_id}.json'))})"
            )
        
        cards[card_key] = card
    
    return cards


def validate_card_data(data: dict[str, Any]) -> VocabularyCard:
    """Validate vocabulary card data against the VocabularyCard schema.
    
    Args:
        data: Dictionary containing card data
        
    Returns:
        Validated VocabularyCard instance
        
    Raises:
        pydantic.ValidationError: If the data does not conform to the schema
    """
    return VocabularyCard.model_validate(data)


def validate_card_json(json_str: str) -> VocabularyCard:
    """Validate vocabulary card data from a JSON string.
    
    Args:
        json_str: JSON string containing card data
        
    Returns:
        Validated VocabularyCard instance
        
    Raises:
        pydantic.ValidationError: If the JSON does not conform to the schema
    """
    return VocabularyCard.model_validate_json(json_str)
