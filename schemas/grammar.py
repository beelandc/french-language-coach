"""Pydantic models for grammar router response schemas.

This module provides response schemas for the grammar router endpoints.
It reuses the existing GrammarLesson and GrammarReference models for
data validation and defines response wrappers with pagination support.

The schemas follow the same patterns as schemas/session.py for consistency.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .grammar_lesson import DifficultyLevel, GrammarLesson
from .grammar_reference import GrammarReference, GrammarReferenceCategory


# ============================================================================
# Lesson Schemas
# ============================================================================

class LessonSummary(BaseModel):
    """Summary of a grammar lesson for listing purposes.
    
    Excludes the full content (sections) for brevity in list responses.
    
    Attributes:
        id: Unique identifier for the lesson
        title: Human-readable title of the lesson
        topic: The grammatical topic/category
        difficulty: The difficulty level (beginner, intermediate, advanced)
    """
    id: str = Field(..., description="Unique identifier for the lesson")
    title: str = Field(..., description="Human-readable title of the lesson")
    topic: str = Field(..., description="The grammatical topic/category")
    difficulty: DifficultyLevel = Field(
        ...,
        description="Difficulty level: beginner, intermediate, or advanced"
    )


class LessonResponse(GrammarLesson):
    """Full grammar lesson response.
    
    Extends GrammarLesson to reuse all its fields (id, title, topic, difficulty, sections).
    This is the response model for GET /grammar/lessons/{id}.
    """
    pass


# ============================================================================
# Reference Schemas
# ============================================================================

class ReferenceSummary(BaseModel):
    """Summary of a grammar reference entry for listing purposes.
    
    Includes all fields from GrammarReference for search result display.
    
    Attributes:
        id: Unique identifier for the reference entry
        term: The grammar term name
        category: The grammatical category
        difficulty: The difficulty level
        definition: Concise explanation of the term
    """
    id: str = Field(..., description="Unique identifier for the reference entry")
    term: str = Field(..., description="The grammar term name")
    category: GrammarReferenceCategory = Field(
        ...,
        description="The grammatical category"
    )
    difficulty: DifficultyLevel = Field(
        ...,
        description="Difficulty level: beginner, intermediate, or advanced"
    )
    definition: str = Field(..., description="Concise explanation of the term")


class ReferenceResponse(GrammarReference):
    """Full grammar reference entry response.
    
    Extends GrammarReference to reuse all its fields.
    This is the response model for search results in GET /grammar/reference/.
    """
    pass


# ============================================================================
# Pagination Schema (Reused from session.py pattern)
# ============================================================================

class PaginationInfo(BaseModel):
    """Pagination metadata for list endpoints.
    
    Attributes:
        total: Total number of items across all pages
        page: Current page number (1-indexed)
        per_page: Number of items per page
        total_pages: Total number of pages
    """
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number (1-indexed)")
    per_page: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


# ============================================================================
# List Response Schemas
# ============================================================================

class LessonListResponse(BaseModel):
    """Response for GET /grammar/lessons/ endpoint.
    
    Contains a paginated list of lesson summaries.
    
    Attributes:
        lessons: List of lesson summaries
        pagination: Pagination metadata
    """
    lessons: list[LessonSummary] = Field(
        default_factory=list,
        description="List of grammar lesson summaries"
    )
    pagination: PaginationInfo = Field(
        ...,
        description="Pagination metadata"
    )


class ReferenceListResponse(BaseModel):
    """Response for GET /grammar/reference/ endpoint.
    
    Contains a paginated list of reference entries.
    
    Attributes:
        references: List of reference entries
        pagination: Pagination metadata
    """
    references: list[ReferenceResponse] = Field(
        default_factory=list,
        description="List of grammar reference entries"
    )
    pagination: PaginationInfo = Field(
        ...,
        description="Pagination metadata"
    )
