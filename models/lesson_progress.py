from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Boolean

from models.base import BaseModel


class LessonProgress(BaseModel):
    """SQLAlchemy model for tracking user progress through grammar lessons.
    
    This model stores progress records for grammar lessons, allowing users to:
    - Track which lessons they've completed
    - Record scores on lessons (0-100)
    - Track time spent on each lesson
    - Resume lessons where they left off
    
    Attributes:
        user_id: Foreign key to users table (nullable for Phase 1.5 - no auth)
        lesson_id: String ID referencing grammar lesson JSON files
        completed: Whether the lesson has been completed
        score: User's score on the lesson (0-100)
        last_accessed: When the lesson was last accessed
        time_spent: Total seconds spent on the lesson
        
    Inherited from BaseModel:
        id: Primary key, auto-incrementing
        created_at: When the progress record was created
        updated_at: When the progress record was last updated
    """
    
    __tablename__ = "lesson_progress"
    
    user_id = Column(Integer, nullable=True, index=True)
    lesson_id = Column(String(50), nullable=False, index=True)
    completed = Column(Boolean, default=False)
    score = Column(Integer, default=0)
    last_accessed = Column(DateTime, default=datetime.utcnow)
    time_spent = Column(Integer, default=0)
