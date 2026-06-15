"""Tests for factory-boy factory classes.

This module verifies that all factory classes work correctly and generate
valid model instances with the expected default and custom values.
"""

import json
import pytest
from datetime import datetime

from models.session import Session
from models.lesson_progress import LessonProgress
from tests.factories import SessionFactory, LessonProgressFactory


class TestSessionFactory:
    """Tests for SessionFactory."""
    
    def test_creates_valid_session_instance(self):
        """Factory creates a valid Session model instance."""
        # When
        session = SessionFactory()
        
        # Then
        assert isinstance(session, Session)
    
    def test_scenario_id_is_generated(self):
        """Session has a generated scenario_id."""
        # When
        session = SessionFactory()
        
        # Then
        assert session.scenario_id is not None
        assert isinstance(session.scenario_id, str)
        assert len(session.scenario_id) > 0
    
    def test_difficulty_is_valid(self):
        """Session has a valid difficulty level."""
        # When
        session = SessionFactory()
        
        # Then
        assert session.difficulty in ["beginner", "intermediate", "advanced"]
    
    def test_messages_is_valid_json_array(self):
        """Session messages field is valid JSON array."""
        # When
        session = SessionFactory()
        
        # Then
        assert session.messages == "[]"
        # Verify the property works
        assert session.messages_list == []
    
    def test_feedback_is_none_by_default(self):
        """Session feedback field is None by default."""
        # When
        session = SessionFactory()
        
        # Then
        assert session.feedback is None
        assert session.feedback_dict is None
    
    def test_locking_fields_defaults(self):
        """Session locking fields have correct defaults."""
        # When
        session = SessionFactory()
        
        # Then
        assert session.is_locked is False
        assert session.locked_at is None
        assert session.locked_by is None
    
    def test_ended_at_is_none_by_default(self):
        """Session ended_at is None by default."""
        # When
        session = SessionFactory()
        
        # Then
        assert session.ended_at is None
    
    def test_custom_scenario_id(self):
        """Factory accepts custom scenario_id override."""
        # When
        session = SessionFactory(scenario_id="greetings")
        
        # Then
        assert session.scenario_id == "greetings"
    
    def test_custom_difficulty(self):
        """Factory accepts custom difficulty override."""
        # When
        session = SessionFactory(difficulty="beginner")
        
        # Then
        assert session.difficulty == "beginner"
    
    def test_custom_ended_at(self):
        """Factory accepts custom ended_at override."""
        # When
        custom_datetime = datetime(2024, 1, 1, 12, 0, 0)
        session = SessionFactory(ended_at=custom_datetime)
        
        # Then
        assert session.ended_at == custom_datetime
    
    def test_custom_messages(self):
        """Factory accepts custom messages override."""
        # When
        custom_messages = json.dumps([{"role": "user", "content": "Hello"}])
        session = SessionFactory(messages=custom_messages)
        
        # Then
        assert session.messages == custom_messages
        assert len(session.messages_list) == 1
        assert session.messages_list[0]["role"] == "user"
    
    def test_custom_feedback(self):
        """Factory accepts custom feedback override."""
        # When
        custom_feedback = json.dumps({"grammar": 85, "vocabulary": 90})
        session = SessionFactory(feedback=custom_feedback)
        
        # Then
        assert session.feedback == custom_feedback
        assert session.feedback_dict["grammar"] == 85
    
    def test_multiple_sessions_have_unique_scenario_ids(self):
        """Multiple sessions generated have unique scenario_ids."""
        # When
        session1 = SessionFactory()
        session2 = SessionFactory()
        
        # Then
        assert session1.scenario_id != session2.scenario_id
    
    def test_can_create_batch(self):
        """Factory can create multiple instances at once."""
        # When
        sessions = SessionFactory.create_batch(5)
        
        # Then
        assert len(sessions) == 5
        for session in sessions:
            assert isinstance(session, Session)
            assert session.scenario_id is not None


class TestLessonProgressFactory:
    """Tests for LessonProgressFactory."""
    
    def test_creates_valid_lesson_progress_instance(self):
        """Factory creates a valid LessonProgress model instance."""
        # When
        progress = LessonProgressFactory()
        
        # Then
        assert isinstance(progress, LessonProgress)
    
    def test_lesson_id_is_generated(self):
        """LessonProgress has a generated lesson_id."""
        # When
        progress = LessonProgressFactory()
        
        # Then
        assert progress.lesson_id is not None
        assert isinstance(progress.lesson_id, str)
        assert len(progress.lesson_id) > 0
    
    def test_user_id_is_none_by_default(self):
        """LessonProgress user_id is None by default (Phase 1.5)."""
        # When
        progress = LessonProgressFactory()
        
        # Then
        assert progress.user_id is None
    
    def test_completed_is_false_by_default(self):
        """LessonProgress completed is False by default."""
        # When
        progress = LessonProgressFactory()
        
        # Then
        assert progress.completed is False
    
    def test_score_is_valid(self):
        """LessonProgress score is a valid integer between 0 and 100."""
        # When
        progress = LessonProgressFactory()
        
        # Then
        assert isinstance(progress.score, int)
        assert 0 <= progress.score <= 100
    
    def test_time_spent_is_zero_by_default(self):
        """LessonProgress time_spent is 0 by default."""
        # When
        progress = LessonProgressFactory()
        
        # Then
        assert progress.time_spent == 0
    
    def test_last_accessed_is_datetime(self):
        """LessonProgress last_accessed is a datetime."""
        # When
        progress = LessonProgressFactory()
        
        # Then
        assert isinstance(progress.last_accessed, datetime)
    
    def test_custom_lesson_id(self):
        """Factory accepts custom lesson_id override."""
        # When
        progress = LessonProgressFactory(lesson_id="grammar_101")
        
        # Then
        assert progress.lesson_id == "grammar_101"
    
    def test_custom_user_id(self):
        """Factory accepts custom user_id override."""
        # When
        progress = LessonProgressFactory(user_id=1)
        
        # Then
        assert progress.user_id == 1
    
    def test_custom_completed(self):
        """Factory accepts custom completed override."""
        # When
        progress = LessonProgressFactory(completed=True)
        
        # Then
        assert progress.completed is True
    
    def test_custom_score(self):
        """Factory accepts custom score override."""
        # When
        progress = LessonProgressFactory(score=95)
        
        # Then
        assert progress.score == 95
    
    def test_custom_time_spent(self):
        """Factory accepts custom time_spent override."""
        # When
        progress = LessonProgressFactory(time_spent=120)
        
        # Then
        assert progress.time_spent == 120
    
    def test_custom_last_accessed(self):
        """Factory accepts custom last_accessed override."""
        # When
        custom_datetime = datetime(2024, 6, 15, 10, 30, 0)
        progress = LessonProgressFactory(last_accessed=custom_datetime)
        
        # Then
        assert progress.last_accessed == custom_datetime
    
    def test_multiple_progress_have_unique_lesson_ids(self):
        """Multiple progress instances have unique lesson_ids."""
        # When
        progress1 = LessonProgressFactory()
        progress2 = LessonProgressFactory()
        
        # Then
        assert progress1.lesson_id != progress2.lesson_id
    
    def test_can_create_batch(self):
        """Factory can create multiple instances at once."""
        # When
        progress_list = LessonProgressFactory.create_batch(5)
        
        # Then
        assert len(progress_list) == 5
        for progress in progress_list:
            assert isinstance(progress, LessonProgress)
            assert progress.lesson_id is not None
