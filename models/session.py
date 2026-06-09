import json
from datetime import datetime, timedelta

from sqlalchemy import Column, DateTime, Integer, String, Text, Boolean

from models.base import BaseModel

# Lock TTL in minutes - locks automatically expire after this duration
LOCK_TTL_MINUTES = 10


class Session(BaseModel):
    __tablename__ = "sessions"

    scenario_id = Column(String(50), nullable=False)
    difficulty = Column(String(20), default="intermediate")
    ended_at = Column(DateTime, nullable=True)
    messages = Column(Text, default="[]")
    feedback = Column(Text, nullable=True)
    
    # Session locking fields for preventing concurrent access
    is_locked = Column(Boolean, default=False, index=True)
    locked_at = Column(DateTime, nullable=True)
    locked_by = Column(String(255), nullable=True)

    @property
    def messages_list(self):
        return json.loads(self.messages)

    @messages_list.setter
    def messages_list(self, value):
        self.messages = json.dumps(value)

    @property
    def feedback_dict(self):
        if self.feedback:
            return json.loads(self.feedback)
        return None

    @feedback_dict.setter
    def feedback_dict(self, value):
        self.feedback = json.dumps(value)

    def is_lock_expired(self) -> bool:
        """Check if the session lock has expired based on TTL.
        
        Returns:
            True if the lock has expired (locked_at is older than LOCK_TTL_MINUTES),
            False if the lock is still valid or session is not locked.
        """
        if not self.is_locked or self.locked_at is None:
            return False
        
        expiration_time = self.locked_at + timedelta(minutes=LOCK_TTL_MINUTES)
        return datetime.utcnow() > expiration_time

    def can_be_locked(self) -> bool:
        """Check if this session can be locked.
        
        Returns:
            True if the session can be locked (not locked or lock expired).
        """
        return not self.is_locked or self.is_lock_expired()
