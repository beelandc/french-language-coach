"""Tests for the BaseModel class.

This module contains unit tests for the BaseModel abstract base class
that all domain models inherit from.
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import Column, String, create_engine
from sqlalchemy.orm import sessionmaker

from models.base import BaseModel
from database import Base


# Create a test model that inherits from BaseModel
class TestModel(BaseModel):
    """Test model for BaseModel testing."""
    __tablename__ = "test_model"
    
    name = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)


# Create an in-memory SQLite database for testing
engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
TestingSession = sessionmaker(bind=engine)


@pytest.fixture
def db_session():
    """Create a fresh database session for each test."""
    session = TestingSession()
    try:
        yield session
        session.rollback()
    finally:
        session.close()


class TestBaseModelFields:
    """Test that BaseModel provides the correct fields."""
    
    def test_base_model_has_id_field(self):
        """Test that BaseModel has an id field."""
        # Check that the id column exists in BaseModel's columns
        assert hasattr(BaseModel, 'id')
        # The id should be a Column
        from sqlalchemy import Column
        assert isinstance(BaseModel.id, Column)
    
    def test_base_model_has_created_at_field(self):
        """Test that BaseModel has a created_at field."""
        assert hasattr(BaseModel, 'created_at')
        from sqlalchemy import Column
        assert isinstance(BaseModel.created_at, Column)
    
    def test_base_model_has_updated_at_field(self):
        """Test that BaseModel has an updated_at field."""
        assert hasattr(BaseModel, 'updated_at')
        from sqlalchemy import Column
        assert isinstance(BaseModel.updated_at, Column)
    
    def test_base_model_is_abstract(self):
        """Test that BaseModel is marked as abstract."""
        assert BaseModel.__abstract__ is True


class TestBaseModelInheritance:
    """Test that child models properly inherit from BaseModel."""
    
    def test_child_model_has_all_fields(self):
        """Test that child model has all BaseModel fields plus its own."""
        # Check inherited fields
        assert hasattr(TestModel, 'id')
        assert hasattr(TestModel, 'created_at')
        assert hasattr(TestModel, 'updated_at')
        
        # Check own fields
        assert hasattr(TestModel, 'name')
        assert hasattr(TestModel, 'description')
    
    def test_child_model_has_correct_table_name(self):
        """Test that child model has the correct table name."""
        assert TestModel.__tablename__ == "test_model"


class TestBaseModelTimestampBehavior:
    """Test the timestamp behavior of BaseModel."""
    
    def test_created_at_set_on_creation(self, db_session):
        """Test that created_at is set when a model instance is created."""
        before_creation = datetime.utcnow()
        test_obj = TestModel(name="Test Object")
        db_session.add(test_obj)
        db_session.commit()
        after_creation = datetime.utcnow()
        
        # Verify created_at is set and within reasonable bounds
        assert test_obj.created_at is not None
        assert isinstance(test_obj.created_at, datetime)
        assert before_creation <= test_obj.created_at <= after_creation
    
    def test_updated_at_set_on_creation(self, db_session):
        """Test that updated_at is set when a model instance is created."""
        before_creation = datetime.utcnow()
        test_obj = TestModel(name="Test Object")
        db_session.add(test_obj)
        db_session.commit()
        after_creation = datetime.utcnow()
        
        # Verify updated_at is set and within reasonable bounds
        assert test_obj.updated_at is not None
        assert isinstance(test_obj.updated_at, datetime)
        assert before_creation <= test_obj.updated_at <= after_creation
    
    def test_updated_at_refreshed_on_update(self, db_session):
        """Test that updated_at is automatically refreshed when model is updated."""
        # Create test object
        test_obj = TestModel(name="Original Name")
        db_session.add(test_obj)
        db_session.commit()
        
        # Record the original updated_at
        original_updated_at = test_obj.updated_at
        
        # Wait a small amount to ensure timestamp difference
        import time
        time.sleep(0.01)
        
        # Update the object
        test_obj.name = "Updated Name"
        db_session.commit()
        
        # Verify updated_at has changed
        assert test_obj.updated_at > original_updated_at


class TestSessionModelInheritance:
    """Test that Session model properly inherits from BaseModel."""
    
    def test_session_has_base_fields(self):
        """Test that Session model has all BaseModel fields."""
        from models.session import Session
        
        # Check that Session has the inherited fields
        assert hasattr(Session, 'id')
        assert hasattr(Session, 'created_at')
        assert hasattr(Session, 'updated_at')
        
        # Check that Session has its own fields
        assert hasattr(Session, 'scenario_id')
        assert hasattr(Session, 'difficulty')
        assert hasattr(Session, 'ended_at')
        assert hasattr(Session, 'messages')
        assert hasattr(Session, 'feedback')


class TestLessonProgressModelInheritance:
    """Test that LessonProgress model properly inherits from BaseModel."""
    
    def test_lesson_progress_has_base_fields(self):
        """Test that LessonProgress model has all BaseModel fields."""
        from models.lesson_progress import LessonProgress
        
        # Check that LessonProgress has the inherited fields
        assert hasattr(LessonProgress, 'id')
        assert hasattr(LessonProgress, 'created_at')
        assert hasattr(LessonProgress, 'updated_at')
        
        # Check that LessonProgress has its own fields
        assert hasattr(LessonProgress, 'user_id')
        assert hasattr(LessonProgress, 'lesson_id')
        assert hasattr(LessonProgress, 'completed')
        assert hasattr(LessonProgress, 'score')
        assert hasattr(LessonProgress, 'last_accessed')
        assert hasattr(LessonProgress, 'time_spent')
