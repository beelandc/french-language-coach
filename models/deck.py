"""SQLAlchemy model for vocabulary decks.

This module provides the Deck model for storing vocabulary deck/collection metadata.
Each deck represents a collection of vocabulary cards for a specific topic or purpose.
"""

from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship

from models.base import BaseModel


class Deck(BaseModel):
    """A vocabulary deck/collection containing related flashcards.
    
    Each deck represents a themed collection of vocabulary cards (e.g., "Travel", 
    "Food", "Business"). Decks can be created by users to organize their vocabulary
    study materials.
    
    Attributes:
        name: The name of the deck (required, max 255 characters)
        description: Optional description of the deck's purpose or content
        cards: Relationship to Card model (one-to-many)
    
    Note:
        The created_at and updated_at fields are inherited from BaseModel.
    """
    
    __tablename__ = "decks"
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Relationship to cards (one deck has many cards)
    cards = relationship("Card", back_populates="deck", cascade="all, delete-orphan")
