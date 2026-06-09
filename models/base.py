"""Base model class for all SQLAlchemy models in French Language Coach.

This module provides a common base class that all domain models inherit from,
ensuring consistent field definitions and behavior across the application.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer

from database import Base


class BaseModel(Base):
    """Abstract base model class with common fields for all domain models.
    
    This class provides common fields that all models in the French Language Coach
    application should have: id, created_at, and updated_at. It is marked as
    abstract so it won't create its own table in the database.
    
    Attributes:
        id: Primary key, auto-incrementing integer.
        created_at: Timestamp when the record was created (UTC).
        updated_at: Timestamp when the record was last updated (UTC).
    
    Note:
        The updated_at field automatically updates to the current timestamp
        whenever the record is modified and committed to the database.
    """
    
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
