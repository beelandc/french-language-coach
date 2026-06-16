"""SQLAlchemy model for vocabulary flashcards.

This module provides the Card model for storing individual vocabulary flashcards
with spaced repetition tracking fields.
"""

from datetime import date

from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from models.base import BaseModel


class Card(BaseModel):
    """A vocabulary flashcard with French-English translation and spaced repetition tracking.
    
    Each card represents a single vocabulary item to be learned, with fields for
    the French text, English translation, and metadata for study. The card also
    tracks spaced repetition data (next_review_date, interval, ease_factor) for
    scheduling optimal review times using the SM-2 algorithm.
    
    Attributes:
        deck_id: Foreign key to the deck this card belongs to
        deck: Relationship to the Deck model
        card_id: Unique identifier for this card within the deck
        front: The French word, phrase, or text to be learned
        back: The English translation of the French text
        example: A French sentence using the word/phrase in context (optional)
        tags: Comma-separated list of categorization labels (optional)
        context: Description of where the word appeared or was learned from (optional)
        difficulty: Numeric rating from 1 to 5 indicating difficulty level
        next_review_date: The next date this card should be reviewed (for spaced repetition)
        interval: Number of days until next review
        ease_factor: The ease factor used in SM-2 algorithm (default 2.5)
    
    Note:
        The created_at and updated_at fields are inherited from BaseModel.
        For new cards: interval=1, ease_factor=2.5, next_review_date=today+1 day
    """
    
    __tablename__ = "cards"
    
    # Foreign key to deck
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="CASCADE"), nullable=False)
    
    # Relationship to deck
    deck = relationship("Deck", back_populates="cards")
    
    # Card identifier within the deck
    card_id = Column(String(50), nullable=False)
    
    # French and English content
    front = Column(String(500), nullable=False)
    back = Column(String(500), nullable=False)
    
    # Optional content
    example = Column(String(1000), nullable=True)
    tags = Column(String(500), nullable=True)  # Comma-separated for SQLite
    context = Column(String(1000), nullable=True)
    
    # Difficulty level (1-5)
    difficulty = Column(Integer, nullable=False, default=1)
    
    # Spaced repetition fields (SM-2 algorithm)
    next_review_date = Column(Date, nullable=False, default=func.current_date())
    interval = Column(Integer, nullable=False, default=1)  # in days
    ease_factor = Column(Float, nullable=False, default=2.5)
