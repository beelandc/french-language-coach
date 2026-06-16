"""Pydantic schemas for card review model and endpoints.

This module provides Pydantic models for validating card review data
for the card review router API endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import Field, field_validator

from schemas.base import BaseSchema


class CardReviewCreate(BaseSchema):
    """Schema for creating/updating a card review.
    
    This schema is used for submitting card reviews with a rating.
    The rating scale is:
    - 0 = Fail/Again (card was forgotten)
    - 1 = Hard (card was recalled with difficulty)
    - 2 = Good (card was recalled correctly)
    - 3 = Easy (card was recalled easily)
    
    Attributes:
        card_id: Required. The ID of the card being reviewed
        rating: Required. Review rating (0-3)
        user_id: Optional. The ID of the user submitting the review (nullable for Phase 1.5)
    """
    
    card_id: int = Field(
        ...,
        ge=1,
        description="The ID of the card being reviewed"
    )
    rating: int = Field(
        ...,
        ge=0,
        le=3,
        description="Review rating: 0=Fail/Again, 1=Hard, 2=Good, 3=Easy"
    )
    user_id: Optional[int] = Field(
        None,
        ge=1,
        description="Optional user ID (nullable for Phase 1.5 - no authentication)"
    )
    
    @field_validator('rating')
    @classmethod
    def validate_rating_range(cls, v: int) -> int:
        """Validate that rating is within the valid range of 0-3."""
        if v < 0 or v > 3:
            raise ValueError("rating must be between 0 and 3 (0=Fail/Again, 1=Hard, 2=Good, 3=Easy)")
        return v


class CardReviewResponse(BaseSchema):
    """Schema for card review submission response.
    
    This schema is returned after a successful card review submission.
    It includes the updated spaced repetition state.
    
    Attributes:
        success: Whether the review was recorded successfully
        message: Human-readable message about the result
        next_due_date: The datetime when the card should be reviewed next
        interval: The number of days until next review
        ease_factor: The current ease factor
        reps: Number of consecutive successful reviews
        lapses: Number of times the card was failed
    """
    
    success: bool
    message: str
    next_due_date: datetime
    interval: int
    ease_factor: float
    reps: int
    lapses: int


class CardReviewSummary(BaseSchema):
    """Schema for card review summary (for list responses if needed in future).
    
    This schema provides a summary of a card's review state.
    
    Attributes:
        id: The review ID
        card_id: The ID of the reviewed card
        user_id: The user ID (nullable)
        ease_factor: The current ease factor
        interval: The current interval in days
        due_date: The next due date
        reps: Number of consecutive successful reviews
        lapses: Number of failures
        created_at: When the review was created
        updated_at: When the review was last updated
    """
    
    id: int
    card_id: int
    user_id: Optional[int] = None
    ease_factor: float
    interval: int
    due_date: datetime
    reps: int
    lapses: int
    created_at: datetime
    updated_at: datetime
