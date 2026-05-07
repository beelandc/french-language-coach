import json
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    messages = Column(Text, default="[]")
    feedback = Column(Text, nullable=True)

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
