"""Pydantic schemas for vocabulary router endpoints.

This module provides Pydantic models for validating vocabulary deck, card, and review
data for the vocabulary router API endpoints.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from schemas.base import BaseSchema


# ============================================================================
# Deck Schemas
# ============================================================================

class DeckCreate(BaseSchema):
    """Schema for creating a new vocabulary deck."""
    
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="The name of the vocabulary deck"
    )
    description: Optional[str] = Field(
        None,
        max_length=10000,
        description="Optional description of the deck's purpose or content"
    )


class DeckResponse(BaseSchema):
    """Schema for deck response (includes all deck fields)."""
    
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    card_count: int = 0


class DeckSummary(BaseSchema):
    """Schema for deck summary in list responses."""
    
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    card_count: int = 0


# ============================================================================
# Card Schemas
# ============================================================================

class CardCreate(BaseSchema):
    """Schema for creating a new vocabulary card.
    
    Note: deck_id is optional here because it can be provided via the URL path
    in the POST /vocabulary/decks/{id}/cards/ endpoint.
    """
    
    deck_id: Optional[int] = Field(
        None,
        ge=1,
        description="The ID of the deck this card belongs to (optional, can be in URL path)"
    )
    card_id: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Unique identifier for this card within the deck"
    )
    front: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="The French word, phrase, or text to be learned"
    )
    back: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="The English translation of the French text"
    )
    example: Optional[str] = Field(
        None,
        max_length=1000,
        description="A French sentence using the word/phrase in context"
    )
    tags: Optional[list[str]] = Field(
        None,
        description="List of categorization labels for filtering and organizing"
    )
    context: Optional[str] = Field(
        None,
        max_length=1000,
        description="Description of where the word appeared or was learned from"
    )
    difficulty: Optional[int] = Field(
        1,
        ge=1,
        le=5,
        description="Numeric rating from 1 to 5 indicating difficulty level"
    )


class CardResponse(BaseSchema):
    """Schema for card response (includes all card fields)."""
    
    id: int
    deck_id: int
    card_id: str
    front: str
    back: str
    example: Optional[str] = None
    tags: Optional[list[str]] = None
    context: Optional[str] = None
    difficulty: int
    next_review_date: date
    interval: int
    ease_factor: float
    created_at: datetime
    updated_at: datetime


class CardSummary(BaseSchema):
    """Schema for card summary in list responses."""
    
    id: int
    deck_id: int
    card_id: str
    front: str
    back: str
    example: Optional[str] = None
    tags: Optional[list[str]] = None
    context: Optional[str] = None
    difficulty: int
    next_review_date: date
    interval: int
    ease_factor: float
    created_at: datetime
    updated_at: datetime


# ============================================================================
# Review Schemas
# ============================================================================

class ReviewSubmit(BaseSchema):
    """Schema for submitting a card review.
    
    The ease parameter determines how the spaced repetition algorithm updates
    the card's interval and ease factor:
    - 1 = Again (card was forgotten, reset interval to 1)
    - 2 = Hard (card was recalled with difficulty)
    - 3 = Good (card was recalled correctly)
    - 4 = Easy (card was recalled easily)
    """
    
    card_id: int = Field(
        ...,
        ge=1,
        description="The ID of the card being reviewed"
    )
    deck_id: int = Field(
        ...,
        ge=1,
        description="The ID of the deck containing the card"
    )
    ease: int = Field(
        ...,
        ge=1,
        le=4,
        description="Review ease rating: 1=Again, 2=Hard, 3=Good, 4=Easy"
    )
    
    @field_validator('ease')
    @classmethod
    def validate_ease_range(cls, v: int) -> int:
        """Validate that ease is within the valid range of 1-4."""
        if v < 1 or v > 4:
            raise ValueError("ease must be between 1 and 4 (1=Again, 2=Hard, 3=Good, 4=Easy)")
        return v


class ReviewResponse(BaseSchema):
    """Schema for review submission response."""
    
    success: bool
    message: str
    next_review_date: date
    new_interval: int
    new_ease_factor: float


# ============================================================================
# Due Card Schemas
# ============================================================================

class DueCardResponse(BaseSchema):
    """Schema for cards due for review (simplified for listing)."""
    
    id: int
    deck_id: int
    deck_name: str
    card_id: str
    front: str
    back: str
    next_review_date: date


# ============================================================================
# List Response Schemas
# ============================================================================

class DeckListResponse(BaseSchema):
    """Response schema for GET /vocabulary/decks/ with pagination."""
    
    decks: list[DeckSummary]
    pagination: "PaginationInfo"


class CardListResponse(BaseSchema):
    """Response schema for GET /vocabulary/decks/{id}/cards/ with pagination."""
    
    cards: list[CardSummary]
    pagination: "PaginationInfo"


class DueCardsResponse(BaseSchema):
    """Response schema for GET /vocabulary/due/ with pagination."""
    
    cards: list[DueCardResponse]
    pagination: "PaginationInfo"


# Import PaginationInfo here to avoid circular dependency
from schemas.session import PaginationInfo


# Update the list response schemas with the actual PaginationInfo class
DeckListResponse.model_rebuild()
CardListResponse.model_rebuild()
DueCardsResponse.model_rebuild()
