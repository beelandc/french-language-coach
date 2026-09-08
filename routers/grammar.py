"""FastAPI router for grammar endpoints.

This module provides RESTful endpoints for accessing grammar content:
- GET /grammar/lessons/ - List all grammar lessons with filtering and pagination
- GET /grammar/lessons/{id} - Get a specific grammar lesson by ID
- GET /grammar/reference/ - Search grammar reference entries with filtering
- GET /grammar/exercises/ - List grammar exercises with filtering and pagination
- GET /grammar/exercises/{id} - Get a specific exercise by ID

The router loads data from JSON files in the data/ directory and uses
Pydantic models from schemas/grammar_lesson.py, schemas/grammar_reference.py,
and schemas/grammar_exercise.py for validation.
"""

from math import ceil
from pathlib import Path
from typing import Optional
import re

from fastapi import APIRouter, HTTPException, Query

from schemas.grammar import (
    LessonListResponse,
    LessonResponse,
    LessonSummary,
    PaginationInfo,
    RecommendationResponse,
    ReferenceListResponse,
    ReferenceResponse,
)
from schemas.grammar_exercise import (
    Exercise,
    ExerciseType,
    load_exercises_from_directory,
)
from schemas.grammar_lesson import (
    DifficultyLevel,
    GrammarLesson,
    load_lessons_from_directory,
)
from schemas.grammar_reference import (
    GrammarReference,
    GrammarReferenceCategory,
    load_references_from_directory,
)

router = APIRouter(prefix="/grammar", tags=["grammar"])


# ============================================================================
# Data Loading Utilities
# ============================================================================

# Paths to grammar data directories
LESSONS_DIRECTORY = Path(__file__).parent.parent / "data" / "grammar_lessons"
REFERENCES_DIRECTORY = Path(__file__).parent.parent / "data" / "grammar" / "reference"
EXERCISES_DIRECTORY = Path(__file__).parent.parent / "data" / "grammar" / "exercises"

# Valid values for enum-based filters
VALID_DIFFICULTIES = {d.value for d in DifficultyLevel}
VALID_CATEGORIES = {c.value for c in GrammarReferenceCategory}
VALID_EXERCISE_TYPES = {e.value for e in ExerciseType}


def get_lessons() -> dict[str, GrammarLesson]:
    """Load and return all grammar lessons from the lessons directory.
    
    Returns:
        Dictionary mapping lesson IDs to GrammarLesson instances.
        
    Raises:
        FileNotFoundError: If the lessons directory does not exist.
        ValueError: If any lesson file contains invalid data.
    """
    if not LESSONS_DIRECTORY.exists():
        return {}
    return load_lessons_from_directory(LESSONS_DIRECTORY)


def get_references() -> dict[str, GrammarReference]:
    """Load and return all grammar reference entries from the reference directory.
    
    Returns:
        Dictionary mapping reference IDs to GrammarReference instances.
        
    Raises:
        FileNotFoundError: If the reference directory does not exist.
        ValueError: If any reference file contains invalid data.
    """
    if not REFERENCES_DIRECTORY.exists():
        return {}
    return load_references_from_directory(REFERENCES_DIRECTORY)


def get_exercises() -> dict[str, Exercise]:
    """Load and return all grammar exercises from the exercises directory.
    
    Returns:
        Dictionary mapping exercise IDs to Exercise instances.
        
    Raises:
        FileNotFoundError: If the exercises directory does not exist.
        ValueError: If any exercise file contains invalid data.
    """
    if not EXERCISES_DIRECTORY.exists():
        return {}
    return load_exercises_from_directory(EXERCISES_DIRECTORY)


# ============================================================================
# Helper Functions for Filtering and Pagination
# ============================================================================

def filter_lessons(
    lessons: dict[str, GrammarLesson],
    topic: Optional[str] = None,
    difficulty: Optional[DifficultyLevel] = None,
) -> list[GrammarLesson]:
    """Filter lessons by topic and/or difficulty.
    
    Uses AND logic: a lesson must match ALL provided filters.
    
    Args:
        lessons: Dictionary of all lessons
        topic: Optional topic filter (case-insensitive substring match)
        difficulty: Optional difficulty level filter
        
    Returns:
        List of matching GrammarLesson instances
    """
    filtered = []
    for lesson in lessons.values():
        # Check topic filter (case-insensitive substring match)
        if topic and topic.lower() not in lesson.topic.lower():
            continue
        
        # Check difficulty filter
        if difficulty and lesson.difficulty != difficulty:
            continue
        
        filtered.append(lesson)
    
    return filtered


def filter_references(
    references: dict[str, GrammarReference],
    q: Optional[str] = None,
    category: Optional[GrammarReferenceCategory] = None,
    difficulty: Optional[DifficultyLevel] = None,
) -> list[GrammarReference]:
    """Filter and search reference entries.
    
    Uses AND logic: a reference must match ALL provided filters.
    Search query (q) performs case-insensitive substring matching on:
    - term
    - definition
    - examples (as comma-separated string)
    - common_pitfalls (as comma-separated string)
    
    Args:
        references: Dictionary of all references
        q: Optional search query for partial matching
        category: Optional category filter
        difficulty: Optional difficulty level filter
        
    Returns:
        List of matching GrammarReference instances
    """
    filtered = []
    for reference in references.values():
        # Check search query (case-insensitive substring match)
        if q:
            q_lower = q.lower()
            # Search in term
            if q_lower not in reference.term.lower():
                # Search in definition
                if q_lower not in reference.definition.lower():
                    # Search in examples
                    examples_str = ", ".join(reference.examples).lower()
                    if q_lower not in examples_str:
                        # Search in common_pitfalls
                        pitfalls_str = ", ".join(reference.common_pitfalls).lower()
                        if q_lower not in pitfalls_str:
                            continue
        
        # Check category filter
        if category and reference.category != category:
            continue
        
        # Check difficulty filter
        if difficulty and reference.difficulty != difficulty:
            continue
        
        filtered.append(reference)
    
    return filtered


def filter_exercises(
    exercises: dict[str, Exercise],
    exercise_type: Optional[ExerciseType] = None,
    topic: Optional[str] = None,
    difficulty: Optional[DifficultyLevel] = None,
) -> list[Exercise]:
    """Filter exercises by type, topic, and/or difficulty.
    
    Uses AND logic: an exercise must match ALL provided filters.
    
    Args:
        exercises: Dictionary of all exercises
        exercise_type: Optional exercise type filter
        topic: Optional topic filter (case-insensitive substring match)
        difficulty: Optional difficulty level filter
        
    Returns:
        List of matching Exercise instances
    """
    filtered = []
    for exercise in exercises.values():
        # Check exercise type filter
        if exercise_type and exercise.type != exercise_type:
            continue
        
        # Check topic filter (case-insensitive substring match)
        if topic and topic.lower() not in exercise.topic.lower():
            continue
        
        # Check difficulty filter
        if difficulty and exercise.difficulty != difficulty:
            continue
        
        filtered.append(exercise)
    
    return filtered


def paginate(
    items: list,
    page: int = 1,
    per_page: int = 10,
) -> tuple[list, PaginationInfo]:
    """Apply pagination to a list of items.
    
    Args:
        items: List of all items to paginate
        page: Page number (1-indexed)
        per_page: Number of items per page
        
    Returns:
        Tuple of (paginated_items, pagination_info)
        
    Raises:
        HTTPException: If page exceeds total_pages
    """
    total = len(items)
    total_pages = max(1, ceil(total / per_page)) if total > 0 else 0
    
    # Validate page number
    if page > total_pages and total_pages > 0:
        raise HTTPException(
            status_code=404,
            detail=f"Page {page} does not exist. Maximum page is {total_pages}."
        )
    
    # Calculate offset
    offset = (page - 1) * per_page
    
    # Apply pagination
    paginated_items = items[offset:offset + per_page]
    
    pagination_info = PaginationInfo(
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )
    
    return paginated_items, pagination_info


# ============================================================================
# Recommendation Helpers
# ============================================================================

# Maximum number of lessons returned by the recommendations endpoint.
MAX_RECOMMENDATIONS = 3

# Mapping from focus_area keywords to grammar lesson topics. The keys cover both
# English and French terms because the Mistral feedback prompt emits French focus
# areas while some test fixtures use English. A single focus_area may match one or
# more topics; matching is case-insensitive substring containment.
FOCUS_AREA_TO_TOPIC: dict[str, str] = {
    # Nouns and Adjectives
    "noun": "Nouns and Adjectives",
    "nouns": "Nouns and Adjectives",
    "adjective": "Nouns and Adjectives",
    "adjectives": "Nouns and Adjectives",
    "articles": "Nouns and Adjectives",
    "gender": "Nouns and Adjectives",
    "agreement": "Nouns and Adjectives",
    "nom": "Nouns and Adjectives",
    "adjectif": "Nouns and Adjectives",
    "genre": "Nouns and Adjectives",
    "accord": "Nouns and Adjectives",
    # Verb Tenses
    "verb tense": "Verb Tenses",
    "verb tenses": "Verb Tenses",
    "present tense": "Verb Tenses",
    "conjugation": "Verb Tenses",
    "conjugate": "Verb Tenses",
    "verbe": "Verb Tenses",
    "conjugaison": "Verb Tenses",
    # Past Tenses
    "past tense": "Past Tenses",
    "past tenses": "Past Tenses",
    "passé composé": "Past Tenses",
    "passe compose": "Past Tenses",
    "imparfait": "Past Tenses",
    "imperfect": "Past Tenses",
    "plus-que-parfait": "Past Tenses",
    "pluperfect": "Past Tenses",
    "passé": "Past Tenses",
    # Future Tenses
    "future tense": "Future Tenses",
    "future tenses": "Future Tenses",
    "futur": "Future Tenses",
    "futur proche": "Future Tenses",
    "futur simple": "Future Tenses",
    # Moods
    "mood": "Moods",
    "moods": "Moods",
    "conditional": "Moods",
    "conditionnel": "Moods",
    "subjunctive": "Moods",
    "subjonctif": "Moods",
    "imperative": "Moods",
    "impératif": "Moods",
    # Pronouns
    "pronoun": "Pronouns",
    "pronouns": "Pronouns",
    "object pronoun": "Pronouns",
    "relative pronoun": "Pronouns",
    "pronom": "Pronouns",
    "pronoms": "Pronouns",
    # Questions
    "question": "Questions",
    "questions": "Questions",
    "est-ce-que": "Questions",
    "inversion": "Questions",
    "question word": "Questions",
    "question words": "Questions",
    # Sentence Structure
    "sentence structure": "Sentence Structure",
    "negation": "Sentence Structure",
    "négation": "Sentence Structure",
    "preposition": "Sentence Structure",
    "prepositions": "Sentence Structure",
    "conjunction": "Sentence Structure",
    "adverb": "Sentence Structure",
    "adverbs": "Sentence Structure",
    "préposition": "Sentence Structure",
    "conjonction": "Sentence Structure",
    "adverbe": "Sentence Structure",
    # Verbs
    "verbs": "Verbs",
    "verb": "Verbs",
    "verbes": "Verbs",
}


def map_focus_area_to_topics(focus_area: str) -> list[str]:
    """Map a feedback focus_area string to matching grammar lesson topics.

    Matching is case-insensitive and uses whole-word (word-boundary) matching
    against the ``FOCUS_AREA_TO_TOPIC`` keyword dictionary. Word boundaries
    prevent short keywords (e.g. "nouns") from matching inside longer words
    (e.g. "pronouns"). A single focus_area may match more than one topic.

    Args:
        focus_area: The feedback focus_area string (free-form LLM output).

    Returns:
        A de-duplicated list of matching lesson topic strings. Empty if the
        focus_area is blank, whitespace-only, or matches no known keyword.
    """
    if not focus_area:
        return []

    normalized = focus_area.strip()
    if not normalized:
        return []

    matched: list[str] = []
    seen: set[str] = set()
    for keyword, topic in FOCUS_AREA_TO_TOPIC.items():
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, normalized, re.IGNORECASE) and topic not in seen:
            matched.append(topic)
            seen.add(topic)

    return matched


def get_recommendations(focus_area: str) -> tuple[list[str], list[GrammarLesson]]:
    """Compute grammar lesson recommendations for a given focus_area.

    Loads the lesson catalog, filters by the topics matched from the
    focus_area, sorts the matches deterministically by lesson id, and caps
    the result at ``MAX_RECOMMENDATIONS``. When no topic matches, returns a
    fallback of general beginner lessons (still capped at
    ``MAX_RECOMMENDATIONS``).

    Args:
        focus_area: The feedback focus_area string.

    Returns:
        A tuple of (matched_topics, recommended_lessons). When the focus_area
        does not match any topic, ``matched_topics`` is empty and
        ``recommended_lessons`` contains fallback beginner lessons.
    """
    lessons_dict = get_lessons()

    matched_topics = map_focus_area_to_topics(focus_area)

    if matched_topics:
        recommended = [
            lesson for lesson in lessons_dict.values()
            if lesson.topic in matched_topics
        ]
    else:
        # Fallback: general beginner lessons when the focus_area is unknown.
        recommended = [
            lesson for lesson in lessons_dict.values()
            if lesson.difficulty == DifficultyLevel.BEGINNER
        ]

    # Deterministic ordering by lesson id, then cap at MAX_RECOMMENDATIONS.
    recommended.sort(key=lambda lesson: lesson.id)
    recommended = recommended[:MAX_RECOMMENDATIONS]

    return matched_topics, recommended


# ============================================================================
# Endpoint: GET /grammar/lessons/
# ============================================================================

@router.get("/lessons/", response_model=LessonListResponse)
async def list_lessons(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    topic: Optional[str] = Query(None, description="Filter by topic (case-insensitive substring)"),
    difficulty: Optional[DifficultyLevel] = Query(
        None,
        description="Filter by difficulty level: beginner, intermediate, or advanced"
    ),
) -> LessonListResponse:
    """List all grammar lessons with optional filtering and pagination.
    
    Supports filtering by:
    - topic: Case-insensitive substring match on the lesson's topic field
    - difficulty: Exact match on difficulty level
    
    All filters are optional and use AND logic (all must match).
    
    Returns a paginated list of lesson summaries (id, title, topic, difficulty).
    Use GET /grammar/lessons/{id} to retrieve full lesson content.
    """
    # Load all lessons
    lessons_dict = get_lessons()
    
    # Apply filters
    filtered_lessons = filter_lessons(lessons_dict, topic, difficulty)
    
    # Apply pagination
    paginated_lessons, pagination = paginate(filtered_lessons, page, per_page)
    
    # Convert to summary format
    lesson_summaries = [
        LessonSummary(
            id=lesson.id,
            title=lesson.title,
            topic=lesson.topic,
            difficulty=lesson.difficulty,
        )
        for lesson in paginated_lessons
    ]
    
    return LessonListResponse(
        lessons=lesson_summaries,
        pagination=pagination,
    )


# ============================================================================
# Endpoint: GET /grammar/lessons/{id}
# ============================================================================

@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: str) -> LessonResponse:
    """Get a specific grammar lesson by ID.
    
    Returns the full lesson content including all sections and examples.
    
    Args:
        lesson_id: The unique identifier of the lesson
        
    Returns:
        The complete GrammarLesson with all fields
        
    Raises:
        HTTPException 404: If the lesson with the given ID is not found
    """
    # Load all lessons
    lessons_dict = get_lessons()
    
    # Find lesson by ID
    if lesson_id not in lessons_dict:
        raise HTTPException(
            status_code=404,
            detail=f"Lesson not found: {lesson_id}"
        )
    
    # Return the full lesson
    return LessonResponse(**lessons_dict[lesson_id].model_dump())


# ============================================================================
# Endpoint: GET /grammar/reference/
# ============================================================================

@router.get("/reference/", response_model=ReferenceListResponse)
async def list_references(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    q: Optional[str] = Query(None, description="Search query (case-insensitive partial match)"),
    category: Optional[GrammarReferenceCategory] = Query(
        None,
        description="Filter by grammatical category"
    ),
    difficulty: Optional[DifficultyLevel] = Query(
        None,
        description="Filter by difficulty level: beginner, intermediate, or advanced"
    ),
) -> ReferenceListResponse:
    """Search and filter grammar reference entries with pagination.
    
    Supports filtering by:
    - q: Search query that performs case-insensitive substring matching on
      term, definition, examples, and common_pitfalls
    - category: Exact match on grammatical category
    - difficulty: Exact match on difficulty level
    
    All filters are optional and use AND logic (all must match).
    
    Returns a paginated list of reference entries with full content.
    """
    # Load all references
    references_dict = get_references()
    
    # Apply filters
    filtered_references = filter_references(references_dict, q, category, difficulty)
    
    # Apply pagination
    paginated_references, pagination = paginate(filtered_references, page, per_page)
    
    # Convert to response format
    reference_responses = [
        ReferenceResponse(**reference.model_dump())
        for reference in paginated_references
    ]
    
    return ReferenceListResponse(
        references=reference_responses,
        pagination=pagination,
    )


# ============================================================================
# Endpoint: GET /grammar/exercises/
# ============================================================================

@router.get("/exercises/")
async def list_exercises(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    exercise_type: Optional[ExerciseType] = Query(
        None,
        description="Filter by exercise type: fill-in-the-blank, multiple-choice, translation, conjugation, or sentence-transformation"
    ),
    topic: Optional[str] = Query(None, description="Filter by topic (case-insensitive substring)"),
    difficulty: Optional[DifficultyLevel] = Query(
        None,
        description="Filter by difficulty level: beginner, intermediate, or advanced"
    ),
):
    """List all grammar exercises with optional filtering and pagination.
    
    Supports filtering by:
    - exercise_type: Exact match on exercise type
    - topic: Case-insensitive substring match on the exercise's topic field
    - difficulty: Exact match on difficulty level
    
    All filters are optional and use AND logic (all must match).
    
    Returns a paginated list of exercises with full content.
    Use GET /grammar/exercises/{id} to retrieve a specific exercise by ID.
    """
    # Load all exercises
    exercises_dict = get_exercises()
    
    # Apply filters
    filtered_exercises = filter_exercises(exercises_dict, exercise_type, topic, difficulty)
    
    # Apply pagination
    paginated_exercises, pagination = paginate(filtered_exercises, page, per_page)
    
    # Return exercises as a simple dictionary with pagination info
    return {
        "exercises": [exercise.model_dump() for exercise in paginated_exercises],
        "pagination": pagination.model_dump()
    }


# ============================================================================
# Endpoint: GET /grammar/exercises/{id}
# ============================================================================

@router.get("/exercises/{exercise_id}")
async def get_exercise(exercise_id: str):
    """Get a specific grammar exercise by ID.
    
    Returns the full exercise content including all type-specific fields.
    
    Args:
        exercise_id: The unique identifier of the exercise
        
    Returns:
        The complete Exercise with all fields
        
    Raises:
        HTTPException 404: If the exercise with the given ID is not found
    """
    # Load all exercises
    exercises_dict = get_exercises()
    
    # Find exercise by ID
    if exercise_id not in exercises_dict:
        raise HTTPException(
            status_code=404,
            detail=f"Exercise not found: {exercise_id}"
        )
    
    # Return the full exercise as a dictionary
    return exercises_dict[exercise_id].model_dump()


# ============================================================================
# Endpoint: GET /grammar/recommendations/
# ============================================================================

@router.get("/recommendations/", response_model=RecommendationResponse)
async def get_grammar_recommendations(
    focus_area: str = Query(
        ...,
        description="The conversation feedback focus_area to map to grammar lessons",
    ),
) -> RecommendationResponse:
    """Recommend grammar lessons for a given conversation feedback focus_area.

    Maps the provided focus_area to matching grammar lesson topics via a
    curated bilingual (English + French) keyword dictionary, then returns up
    to 3 relevant lesson summaries. When the focus_area does not match any
    known topic (including blank or whitespace-only values), a fallback set of
    general beginner lessons is returned instead of an error.

    Args:
        focus_area: The focus_area string from session feedback.

    Returns:
        A RecommendationResponse containing the echoed focus_area, the
        matched topic strings (empty on fallback), and up to 3 recommended
        lesson summaries.
    """
    matched_topics, recommended_lessons = get_recommendations(focus_area)

    lesson_summaries = [
        LessonSummary(
            id=lesson.id,
            title=lesson.title,
            topic=lesson.topic,
            difficulty=lesson.difficulty,
        )
        for lesson in recommended_lessons
    ]

    return RecommendationResponse(
        focus_area=focus_area,
        matched_topics=matched_topics,
        lessons=lesson_summaries,
    )
