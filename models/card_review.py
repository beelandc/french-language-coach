"""SQLAlchemy model for card review tracking.

This module provides the CardReview model for tracking spaced repetition state
and review history for vocabulary flashcards.
"""

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer

from models.base import BaseModel


class CardReview(BaseModel):
    """Tracks spaced repetition state and review history for a vocabulary card.
    
    This model stores the review state for each card, allowing for separate
    tracking of study progress from the card content itself. Each review
    represents the current state of a card for a user (or globally when
    user_id is null).
    
    The model implements spaced repetition using the SM-2 algorithm (or similar)
    to determine optimal review intervals based on user performance.
    
    Attributes:
        user_id: User ID (nullable for Phase 1.5 - no authentication)
        card_id: Foreign key to the vocabulary card being reviewed
        ease_factor: The ease factor used in spaced repetition algorithm (default 2.5)
        interval: Number of days until next review (default 1)
        due_date: The exact datetime when the card should be reviewed next
        reps: Number of consecutive successful reviews
        lapses: Number of times the card was failed (rating=0)
    
    Note:
        The created_at and updated_at fields are inherited from BaseModel.
        For new reviews: ease_factor=2.5, interval=1, reps=0, lapses=0
        The due_date is calculated as current time + interval days.
        
        user_id is nullable and not a foreign key in Phase 1.5 since
        user authentication is not yet implemented. This matches the pattern
        used in LessonProgress model.
    """
    
    __tablename__ = "card_reviews"
    
    # User ID (nullable for Phase 1.5 - no authentication)
    # Not a foreign key since User model doesn't exist yet
    user_id = Column(Integer, nullable=True, index=True)
    
    # Foreign key to card (required)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Spaced repetition algorithm fields
    ease_factor = Column(Float, nullable=False, default=2.5)
    interval = Column(Integer, nullable=False, default=1)  # in days
    due_date = Column(DateTime, nullable=False)
    
    # Review statistics
    reps = Column(Integer, nullable=False, default=0)  # consecutive successful reviews
    lapses = Column(Integer, nullable=False, default=0)  # number of failures
