"""Study plans and flashcard proposals from the study-coach agent (issue #270).

A session has at most one ``StudyPlan``. Its ``CardProposal`` rows are suggestions
only: a ``Card`` is created when the learner accepts a proposal, never when the plan
is generated. SQLite doesn't enforce foreign keys here, so deleting a session deletes
its plan explicitly (``routers/sessions.py``); the ORM cascade removes the proposals.
"""

import json
from typing import Any

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from models.base import BaseModel

STATUS_PENDING = "pending"
STATUS_ACCEPTED = "accepted"
STATUS_REJECTED = "rejected"

#: App-managed deck that accepted proposals go into, created on the first Accept.
STUDY_DECK_NAME = "Mes mots de session"
STUDY_DECK_DESCRIPTION = "Cartes ajoutées depuis vos plans d'étude."


class StudyPlan(BaseModel):
    """The study plan built for one session.

    Attributes:
        session_id: Session the plan was built for (one plan per session).
        plan: JSON object with ``summary`` and ``items`` (see ``schemas.study_plan``).
        model: Model that built the plan.
        proposals: The plan's flashcard proposals, in the order the agent gave them.
    """

    __tablename__ = "study_plans"

    session_id = Column(
        Integer,
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    plan = Column(Text, nullable=False)
    model = Column(String(100), nullable=False)

    proposals = relationship(
        "CardProposal",
        back_populates="study_plan",
        cascade="all, delete-orphan",
        order_by="CardProposal.position",
        lazy="selectin",
    )

    @property
    def plan_dict(self) -> dict[str, Any]:
        """The stored plan as a dict."""
        return json.loads(self.plan)

    @plan_dict.setter
    def plan_dict(self, value: dict[str, Any]) -> None:
        self.plan = json.dumps(value, ensure_ascii=False)


class CardProposal(BaseModel):
    """A flashcard the agent proposed, waiting for the learner's Accept or Reject.

    Attributes:
        study_plan_id: Plan the proposal belongs to.
        position: Order within the plan, from 0.
        front: French side.
        back: English side.
        example: Optional French example sentence.
        source: The learner's phrase the card comes from.
        status: ``pending``, ``accepted`` or ``rejected``.
        already_known: True when a card with the same front already existed when the
            plan was stored; such a proposal can't be accepted.
        card_id: The card created on Accept.
    """

    __tablename__ = "card_proposals"

    study_plan_id = Column(
        Integer, ForeignKey("study_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position = Column(Integer, nullable=False, default=0)
    front = Column(String(500), nullable=False)
    back = Column(String(500), nullable=False)
    example = Column(String(1000), nullable=True)
    source = Column(String(500), nullable=True)
    status = Column(String(10), nullable=False, default=STATUS_PENDING)
    already_known = Column(Boolean, nullable=False, default=False)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)

    study_plan = relationship("StudyPlan", back_populates="proposals")
