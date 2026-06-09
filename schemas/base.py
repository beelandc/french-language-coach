"""Base schema class for all Pydantic schemas in French Language Coach.

This module provides a common base class that all API schemas can optionally
inherit from, ensuring consistent configuration and validation patterns.
"""

from pydantic import BaseModel as PydanticBaseModel


class BaseSchema(PydanticBaseModel):
    """Base schema class with common configuration for all API schemas.
    
    This class serves as a base for all Pydantic schemas in the French Language
    Coach application. It provides a consistent foundation for schema definitions
    and can be extended with common validation logic as needed.
    
    Note:
        This is an optional base class. Schemas that don't need common
        functionality (like PaginationInfo) can continue to inherit directly
        from pydantic.BaseModel.
    """
    
    class Config:
        """Pydantic configuration for base schema."""
        # Enable orm_mode for compatibility with SQLAlchemy models
        from_attributes = True
