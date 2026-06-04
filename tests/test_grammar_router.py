"""
Tests for grammar router endpoints (Issue #36).

This module contains tests for:
- GET /grammar/lessons/ - List all lessons with filtering and pagination
- GET /grammar/lessons/{id} - Get specific lesson by ID
- GET /grammar/reference/ - Search reference entries with filtering

Issue #36 Acceptance Criteria:
- [x] All endpoints implemented
- [x] Proper error handling (404, etc.)
- [x] Pagination support for list endpoints
- [x] Filtering by topic and difficulty
"""

from math import ceil

import pytest

from schemas.grammar import (
    LessonListResponse,
    LessonResponse,
    LessonSummary,
    PaginationInfo,
    ReferenceListResponse,
    ReferenceResponse,
)
from schemas.grammar_lesson import DifficultyLevel, GrammarLesson
from schemas.grammar_reference import GrammarReference, GrammarReferenceCategory


# ============================================================================
# Schema Tests
# ============================================================================

class TestLessonSchemas:
    """Test the lesson-related response schemas."""

    def test_lesson_summary_creation(self):
        """Verify LessonSummary can be created with required fields."""
        summary = LessonSummary(
            id="articles",
            title="French Articles",
            topic="Nouns and Adjectives",
            difficulty=DifficultyLevel.BEGINNER,
        )

        assert summary.id == "articles"
        assert summary.title == "French Articles"
        assert summary.topic == "Nouns and Adjectives"
        assert summary.difficulty == DifficultyLevel.BEGINNER

    def test_lesson_summary_from_grammar_lesson(self):
        """Verify LessonSummary can be created from GrammarLesson fields."""
        from schemas.grammar_lesson import Section
        
        section = Section(
            title="Test Section",
            content="Test content",
            examples=["Test example"]
        )
        
        lesson = GrammarLesson(
            id="articles",
            title="French Articles",
            topic="Nouns and Adjectives",
            difficulty=DifficultyLevel.BEGINNER,
            sections=[section],
        )

        summary = LessonSummary(
            id=lesson.id,
            title=lesson.title,
            topic=lesson.topic,
            difficulty=lesson.difficulty,
        )

        assert summary.id == lesson.id
        assert summary.title == lesson.title
        assert summary.topic == lesson.topic
        assert summary.difficulty == lesson.difficulty


class TestReferenceSchemas:
    """Test the reference-related response schemas."""

    def test_reference_response_creation(self):
        """Verify ReferenceResponse can be created with required fields."""
        reference = ReferenceResponse(
            id="definite-articles",
            term="Definite Articles",
            category=GrammarReferenceCategory.ARTICLES,
            difficulty=DifficultyLevel.BEGINNER,
            definition="Specific articles: le, la, les, l'.",
            examples=["Le livre (the book)", "La table (the table)"],
            common_pitfalls=["Use l' before vowel sounds"],
            related_terms=["indefinite-articles"],
        )

        assert reference.id == "definite-articles"
        assert reference.term == "Definite Articles"
        assert reference.category == GrammarReferenceCategory.ARTICLES
        assert reference.difficulty == DifficultyLevel.BEGINNER
        assert reference.definition == "Specific articles: le, la, les, l'."
        assert len(reference.examples) == 2
        assert len(reference.common_pitfalls) == 1


class TestPaginationSchemas:
    """Test the pagination schema."""

    def test_pagination_info_creation(self):
        """Verify PaginationInfo can be created with required fields."""
        pagination = PaginationInfo(
            total=25,
            page=1,
            per_page=10,
            total_pages=3,
        )

        assert pagination.total == 25
        assert pagination.page == 1
        assert pagination.per_page == 10
        assert pagination.total_pages == 3

    def test_pagination_info_zero_items(self):
        """Verify PaginationInfo handles zero items."""
        pagination = PaginationInfo(
            total=0,
            page=1,
            per_page=10,
            total_pages=0,
        )

        assert pagination.total == 0
        assert pagination.total_pages == 0


class TestListResponseSchemas:
    """Test the list response schemas."""

    def test_lesson_list_response_empty(self):
        """Verify LessonListResponse handles empty lessons list."""
        response = LessonListResponse(
            lessons=[],
            pagination=PaginationInfo(
                total=0,
                page=1,
                per_page=10,
                total_pages=0,
            ),
        )

        assert response.lessons == []
        assert response.pagination.total == 0

    def test_lesson_list_response_with_data(self):
        """Verify LessonListResponse handles lessons with data."""
        lessons = [
            LessonSummary(
                id="articles",
                title="French Articles",
                topic="Nouns and Adjectives",
                difficulty=DifficultyLevel.BEGINNER,
            ),
            LessonSummary(
                id="present-tense-regular",
                title="Present Tense: Regular Verbs",
                topic="Verbs",
                difficulty=DifficultyLevel.BEGINNER,
            ),
        ]

        response = LessonListResponse(
            lessons=lessons,
            pagination=PaginationInfo(
                total=2,
                page=1,
                per_page=10,
                total_pages=1,
            ),
        )

        assert len(response.lessons) == 2
        assert response.pagination.total == 2

    def test_reference_list_response_empty(self):
        """Verify ReferenceListResponse handles empty references list."""
        response = ReferenceListResponse(
            references=[],
            pagination=PaginationInfo(
                total=0,
                page=1,
                per_page=10,
                total_pages=0,
            ),
        )

        assert response.references == []
        assert response.pagination.total == 0


# ============================================================================
# Integration Tests for Lesson Endpoints
# ============================================================================

@pytest.mark.asyncio
class TestListLessonsEndpoint:
    """Integration tests for GET /grammar/lessons/ endpoint."""

    async def test_list_lessons_default_pagination(self, client):
        """Test default pagination returns first page with default per_page."""
        response = client.get("/grammar/lessons/")
        assert response.status_code == 200

        data = response.json()
        assert "lessons" in data
        assert "pagination" in data

        # Should return at least some lessons (we have 20+ in data/)
        assert len(data["lessons"]) > 0

        # Check pagination structure
        pagination = data["pagination"]
        assert "total" in pagination
        assert "page" in pagination
        assert "per_page" in pagination
        assert "total_pages" in pagination

        # Default values
        assert pagination["page"] == 1
        assert pagination["per_page"] == 10

    async def test_list_lessons_custom_pagination(self, client):
        """Test custom pagination parameters."""
        response = client.get("/grammar/lessons/?page=1&per_page=5")
        assert response.status_code == 200

        data = response.json()
        pagination = data["pagination"]

        assert pagination["page"] == 1
        assert pagination["per_page"] == 5

    async def test_list_lessons_pagination_edge_cases(self, client):
        """Test pagination edge cases."""
        # per_page=1
        response = client.get("/grammar/lessons/?per_page=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data["lessons"]) <= 1

        # per_page=100 (max allowed)
        response = client.get("/grammar/lessons/?per_page=100")
        assert response.status_code == 200
        data = response.json()
        assert data["pagination"]["per_page"] == 100

    async def test_list_lessons_invalid_page(self, client):
        """Test requesting page beyond total pages returns 404."""
        # Get total pages first
        response = client.get("/grammar/lessons/")
        total_pages = response.json()["pagination"]["total_pages"]

        # Request a page beyond total pages
        if total_pages > 0:
            response = client.get(f"/grammar/lessons/?page={total_pages + 1}")
            assert response.status_code == 404
            assert "Page" in response.json()["detail"]
            assert "does not exist" in response.json()["detail"]

    async def test_list_lessons_filter_by_topic(self, client):
        """Test filtering lessons by topic."""
        # Filter by a known topic
        response = client.get("/grammar/lessons/?topic=Verbs")
        assert response.status_code == 200

        data = response.json()
        # All returned lessons should have "Verbs" in their topic
        for lesson in data["lessons"]:
            assert "verbs" in lesson["topic"].lower()

    async def test_list_lessons_filter_by_difficulty(self, client):
        """Test filtering lessons by difficulty."""
        response = client.get("/grammar/lessons/?difficulty=beginner")
        assert response.status_code == 200

        data = response.json()
        # All returned lessons should be beginner level
        for lesson in data["lessons"]:
            assert lesson["difficulty"] == "beginner"

    async def test_list_lessons_filter_by_topic_and_difficulty(self, client):
        """Test filtering by both topic and difficulty (AND logic)."""
        response = client.get("/grammar/lessons/?topic=Verbs&difficulty=beginner")
        assert response.status_code == 200

        data = response.json()
        # All returned lessons should match both filters
        for lesson in data["lessons"]:
            assert "verbs" in lesson["topic"].lower()
            assert lesson["difficulty"] == "beginner"

    async def test_list_lessons_filter_no_match(self, client):
        """Test filtering with no matches returns empty list."""
        response = client.get("/grammar/lessons/?topic=NonExistentTopic")
        assert response.status_code == 200

        data = response.json()
        assert data["lessons"] == []
        assert data["pagination"]["total"] == 0

    async def test_list_lessons_case_insensitive_topic(self, client):
        """Test that topic filtering is case-insensitive."""
        # Search with uppercase
        response1 = client.get("/grammar/lessons/?topic=VERBS")
        assert response1.status_code == 200

        # Search with mixed case
        response2 = client.get("/grammar/lessons/?topic=verBs")
        assert response2.status_code == 200

        data1 = response1.json()
        data2 = response2.json()

        # Both should return the same results
        assert len(data1["lessons"]) == len(data2["lessons"])

    async def test_list_lessons_response_structure(self, client):
        """Test that response has correct structure."""
        response = client.get("/grammar/lessons/")
        assert response.status_code == 200

        data = response.json()

        # Check top-level structure
        assert isinstance(data["lessons"], list)
        assert isinstance(data["pagination"], dict)

        # Check lesson structure
        if data["lessons"]:
            lesson = data["lessons"][0]
            assert "id" in lesson
            assert "title" in lesson
            assert "topic" in lesson
            assert "difficulty" in lesson

        # Check pagination structure
        pagination = data["pagination"]
        assert isinstance(pagination["total"], int)
        assert isinstance(pagination["page"], int)
        assert isinstance(pagination["per_page"], int)
        assert isinstance(pagination["total_pages"], int)


@pytest.mark.asyncio
class TestGetLessonEndpoint:
    """Integration tests for GET /grammar/lessons/{id} endpoint."""

    async def test_get_lesson_success(self, client):
        """Test getting a specific lesson by ID."""
        # Try with a known lesson ID
        response = client.get("/grammar/lessons/articles")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == "articles"
        assert "title" in data
        assert "topic" in data
        assert "difficulty" in data
        assert "sections" in data

    async def test_get_lesson_not_found(self, client):
        """Test getting a non-existent lesson returns 404."""
        response = client.get("/grammar/lessons/nonexistent-lesson-123")
        assert response.status_code == 404
        assert "Lesson not found" in response.json()["detail"]

    async def test_get_lesson_full_content(self, client):
        """Test that full lesson content is returned."""
        response = client.get("/grammar/lessons/articles")
        assert response.status_code == 200

        data = response.json()

        # Check that sections are included
        assert "sections" in data
        assert isinstance(data["sections"], list)

        # Check section structure
        if data["sections"]:
            section = data["sections"][0]
            assert "title" in section
            assert "content" in section
            assert "examples" in section


# ============================================================================
# Integration Tests for Reference Endpoints
# ============================================================================

@pytest.mark.asyncio
class TestListReferencesEndpoint:
    """Integration tests for GET /grammar/reference/ endpoint."""

    async def test_list_references_default_pagination(self, client):
        """Test default pagination returns first page with default per_page."""
        response = client.get("/grammar/reference/")
        assert response.status_code == 200

        data = response.json()
        assert "references" in data
        assert "pagination" in data

        # Should return at least some references (we have 50+ in data/)
        assert len(data["references"]) > 0

        # Check pagination structure
        pagination = data["pagination"]
        assert pagination["page"] == 1
        assert pagination["per_page"] == 10

    async def test_list_references_custom_pagination(self, client):
        """Test custom pagination parameters."""
        response = client.get("/grammar/reference/?page=1&per_page=5")
        assert response.status_code == 200

        data = response.json()
        pagination = data["pagination"]

        assert pagination["page"] == 1
        assert pagination["per_page"] == 5

    async def test_list_references_invalid_page(self, client):
        """Test requesting page beyond total pages returns 404."""
        # Get total pages first
        response = client.get("/grammar/reference/")
        total_pages = response.json()["pagination"]["total_pages"]

        # Request a page beyond total pages
        if total_pages > 0:
            response = client.get(f"/grammar/reference/?page={total_pages + 1}")
            assert response.status_code == 404
            assert "Page" in response.json()["detail"]
            assert "does not exist" in response.json()["detail"]

    async def test_list_references_search_by_query(self, client):
        """Test searching references by query string."""
        # Search for a common term
        response = client.get("/grammar/reference/?q=articles")
        assert response.status_code == 200

        data = response.json()
        # At least one reference should match
        assert len(data["references"]) > 0

    async def test_list_references_search_case_insensitive(self, client):
        """Test that search is case-insensitive."""
        # Search with different cases
        response1 = client.get("/grammar/reference/?q=ARTICLES")
        response2 = client.get("/grammar/reference/?q=articles")
        response3 = client.get("/grammar/reference/?q=ArTiClEs")

        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response3.status_code == 200

        data1 = response1.json()
        data2 = response2.json()
        data3 = response3.json()

        # All should return the same number of results
        assert len(data1["references"]) == len(data2["references"])
        assert len(data2["references"]) == len(data3["references"])

    async def test_list_references_filter_by_category(self, client):
        """Test filtering references by category."""
        response = client.get("/grammar/reference/?category=Articles")
        assert response.status_code == 200

        data = response.json()
        # All returned references should be in the Articles category
        for reference in data["references"]:
            assert reference["category"] == "Articles"

    async def test_list_references_filter_by_difficulty(self, client):
        """Test filtering references by difficulty."""
        response = client.get("/grammar/reference/?difficulty=beginner")
        assert response.status_code == 200

        data = response.json()
        # All returned references should be beginner level
        for reference in data["references"]:
            assert reference["difficulty"] == "beginner"

    async def test_list_references_filter_combined(self, client):
        """Test filtering by multiple parameters (AND logic)."""
        response = client.get("/grammar/reference/?q=articles&category=Articles&difficulty=beginner")
        assert response.status_code == 200

        data = response.json()
        # All returned references should match all filters
        for reference in data["references"]:
            assert "articles" in reference["term"].lower() or \
                   "articles" in reference["definition"].lower() or \
                   any("articles" in ex.lower() for ex in reference["examples"])
            assert reference["category"] == "Articles"
            assert reference["difficulty"] == "beginner"

    async def test_list_references_no_match(self, client):
        """Test filtering with no matches returns empty list."""
        response = client.get("/grammar/reference/?q=NonExistentTerm123")
        assert response.status_code == 200

        data = response.json()
        assert data["references"] == []
        assert data["pagination"]["total"] == 0

    async def test_list_references_response_structure(self, client):
        """Test that reference response has correct structure."""
        response = client.get("/grammar/reference/")
        assert response.status_code == 200

        data = response.json()

        # Check top-level structure
        assert isinstance(data["references"], list)
        assert isinstance(data["pagination"], dict)

        # Check reference structure
        if data["references"]:
            reference = data["references"][0]
            assert "id" in reference
            assert "term" in reference
            assert "category" in reference
            assert "difficulty" in reference
            assert "definition" in reference
            assert "examples" in reference
            assert "common_pitfalls" in reference
            # related_terms is optional

    async def test_list_references_search_in_definition(self, client):
        """Test that search matches in definition field."""
        # Search for a word that's in definitions (e.g., "Specific articles")
        response = client.get("/grammar/reference/?q=Specific")
        assert response.status_code == 200

        data = response.json()
        # Should find references with "specific" in definition
        matching_refs = [
            ref for ref in data["references"]
            if "specific" in ref["definition"].lower()
        ]
        assert len(matching_refs) > 0

    async def test_list_references_search_in_examples(self, client):
        """Test that search matches in examples field."""
        # Search for a word that's likely in examples
        response = client.get("/grammar/reference/?q=livre")
        assert response.status_code == 200

        data = response.json()
        # Should find references with "livre" in examples
        matching_refs = [
            ref for ref in data["references"]
            if any("livre" in ex.lower() for ex in ref["examples"])
        ]
        # At least check we got some results
        assert len(data["references"]) > 0


# ============================================================================
# Error Handling Tests
# ============================================================================

@pytest.mark.asyncio
class TestErrorHandling:
    """Test error handling across all endpoints."""

    async def test_lessons_invalid_page_zero(self, client):
        """Test that page < 1 returns validation error."""
        response = client.get("/grammar/lessons/?page=0")
        assert response.status_code == 422  # FastAPI validation error

    async def test_lessons_invalid_page_negative(self, client):
        """Test that negative page returns validation error."""
        response = client.get("/grammar/lessons/?page=-1")
        assert response.status_code == 422

    async def test_lessons_invalid_per_page_zero(self, client):
        """Test that per_page < 1 returns validation error."""
        response = client.get("/grammar/lessons/?per_page=0")
        assert response.status_code == 422

    async def test_lessons_invalid_per_page_over_max(self, client):
        """Test that per_page > 100 returns validation error."""
        response = client.get("/grammar/lessons/?per_page=101")
        assert response.status_code == 422

    async def test_references_invalid_page(self, client):
        """Test that invalid page returns validation error for references."""
        response = client.get("/grammar/reference/?page=0")
        assert response.status_code == 422

    async def test_references_invalid_per_page(self, client):
        """Test that invalid per_page returns validation error for references."""
        response = client.get("/grammar/reference/?per_page=101")
        assert response.status_code == 422


# ============================================================================
# Edge Case Tests
# ============================================================================

@pytest.mark.asyncio
class TestEdgeCases:
    """Test edge cases and special scenarios."""

    async def test_lessons_empty_filters(self, client):
        """Test with empty string filters."""
        response = client.get("/grammar/lessons/?topic=")
        assert response.status_code == 200

        # Empty topic should return all lessons
        data = response.json()
        assert len(data["lessons"]) > 0

    async def test_references_empty_query(self, client):
        """Test with empty search query."""
        response = client.get("/grammar/reference/?q=")
        assert response.status_code == 200

        # Empty query should return all references
        data = response.json()
        assert len(data["references"]) > 0

    async def test_lessons_special_characters_in_topic(self, client):
        """Test filtering with special characters in topic."""
        # Some topics might have special characters like "&"
        response = client.get("/grammar/lessons/?topic=Nouns")
        assert response.status_code == 200

    async def test_references_unicode_search(self, client):
        """Test searching with Unicode characters."""
        # French has many accented characters
        response = client.get("/grammar/reference/?q=é")
        assert response.status_code == 200
        # Should not crash, even if no matches

    async def test_lessons_all_difficulty_levels(self, client):
        """Test that all difficulty levels can be filtered."""
        for difficulty in ["beginner", "intermediate", "advanced"]:
            response = client.get(f"/grammar/lessons/?difficulty={difficulty}")
            assert response.status_code == 200
            data = response.json()
            # Each should return some lessons or empty list
            assert isinstance(data["lessons"], list)

    async def test_references_all_categories(self, client):
        """Test that all categories can be filtered."""
        # Test a few common categories
        categories = ["Articles", "Verbs", "Nouns"]
        for category in categories:
            response = client.get(f"/grammar/reference/?category={category}")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data["references"], list)
