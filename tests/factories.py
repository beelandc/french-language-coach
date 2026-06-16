"""Factory-boy factories for French Language Coach test fixtures.

This module provides factory classes for all SQLAlchemy models using factory-boy.
Factories generate test data instances that can be used in unit and integration tests.

Usage:
    from tests.factories import SessionFactory, LessonProgressFactory, CardReviewFactory
    
    # Create a Session instance
    session = SessionFactory()
    
    # Create with custom attributes
    session = SessionFactory(scenario_id="greetings", difficulty="beginner")
    
    # Persist to database in async tests
    async def test_example(test_db):
        session = SessionFactory()
        test_db.add(session)
        await test_db.commit()
"""

import factory
import factory.fuzzy
from datetime import datetime, timedelta

from models.session import Session
from models.lesson_progress import LessonProgress
from models.card_review import CardReview


class SessionFactory(factory.Factory):
    """Factory for creating Session model instances.
    
    The Session model represents a conversation session with the AI tutor.
    It includes scenario_id, difficulty level, messages (JSON), feedback (JSON),
    and session locking fields.
    
    Attributes:
        scenario_id: Random string identifier for the scenario
        difficulty: Random choice from valid difficulty levels
        messages: JSON string representing empty list
        feedback: None (no feedback initially)
        ended_at: None (session not ended)
        is_locked: False (not locked by default)
        locked_at: None
        locked_by: None
    
    Note:
        The messages and feedback fields store JSON data as text. The Session
        model provides properties (messages_list, feedback_dict) for easier
        access to the parsed JSON values.
        
        This factory uses the base Factory class (not SQLAlchemyModelFactory)
        because we're using async SQLAlchemy. To persist instances, tests must
        explicitly add them to the database session and commit.
    """
    
    class Meta:
        """Factory-boy metadata configuration."""
        model = Session
    
    # Required fields
    scenario_id = factory.fuzzy.FuzzyText(length=10)
    
    # Optional fields with defaults
    difficulty = factory.fuzzy.FuzzyChoice([
        "beginner",
        "intermediate", 
        "advanced"
    ])
    messages = "[]"
    feedback = None
    
    # Session locking fields
    is_locked = False
    locked_at = None
    locked_by = None
    
    # Timestamps (handled by BaseModel defaults)
    # created_at and updated_at are set automatically by SQLAlchemy


class LessonProgressFactory(factory.Factory):
    """Factory for creating LessonProgress model instances.
    
    The LessonProgress model tracks user progress through grammar lessons.
    It includes lesson_id, completion status, score, timestamps, and time spent.
    
    Attributes:
        user_id: None (nullable for Phase 1.5 - no authentication)
        lesson_id: Random string identifier for the lesson
        completed: False (lesson not completed)
        score: Random integer between 0 and 100
        last_accessed: Current UTC datetime
        time_spent: 0 seconds
    
    Note:
        In Phase 1.5, user_id is nullable since user authentication is not yet
        implemented. This will be updated when authentication is added.
        
        This factory uses the base Factory class (not SQLAlchemyModelFactory)
        because we're using async SQLAlchemy. To persist instances, tests must
        explicitly add them to the database session and commit.
    """
    
    class Meta:
        """Factory-boy metadata configuration."""
        model = LessonProgress
    
    # Fields
    user_id = None  # Nullable for Phase 1.5 (no auth)
    lesson_id = factory.fuzzy.FuzzyText(length=10)
    completed = False
    score = factory.fuzzy.FuzzyInteger(0, 100)
    last_accessed = factory.LazyAttribute(lambda _: datetime.utcnow())
    time_spent = 0
    
    # Timestamps (handled by BaseModel defaults)
    # created_at and updated_at are set automatically by SQLAlchemy


class CardReviewFactory(factory.Factory):
    """Factory for creating CardReview model instances.
    
    The CardReview model tracks spaced repetition state and review history
    for vocabulary cards. It includes user_id, card_id, ease_factor, interval,
    due_date, reps, and lapses fields.
    
    Attributes:
        user_id: None (nullable for Phase 1.5 - no authentication)
        card_id: Random integer ID of a card
        ease_factor: Default 2.5 (SM-2 algorithm default)
        interval: Default 1 day
        due_date: Current UTC datetime + 1 day
        reps: Default 0 (no consecutive successful reviews yet)
        lapses: Default 0 (no failures yet)
    
    Note:
        In Phase 1.5, user_id is nullable since user authentication is not yet
        implemented. This will be updated when authentication is added.
        
        This factory uses the base Factory class (not SQLAlchemyModelFactory)
        because we're using async SQLAlchemy. To persist instances, tests must
        explicitly add them to the database session and commit.
    """
    
    class Meta:
        """Factory-boy metadata configuration."""
        model = CardReview
    
    # Fields
    user_id = None  # Nullable for Phase 1.5 (no auth)
    card_id = factory.fuzzy.FuzzyInteger(1, 1000)
    ease_factor = 2.5
    interval = 1
    due_date = factory.LazyAttribute(lambda _: datetime.utcnow() + timedelta(days=1))
    reps = 0
    lapses = 0
    
    # Timestamps (handled by BaseModel defaults)
    # created_at and updated_at are set automatically by SQLAlchemy
