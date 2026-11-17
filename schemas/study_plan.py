"""Schemas for the post-session study plan (issue #270).

``StudyPlanDraft`` is what the study-coach agent submits through its
``submit_study_plan`` tool; its JSON schema is that tool's input schema, and its field
limits match the ``cards`` columns so an accepted proposal always fits. The response
models are what the study-plan endpoints return.
"""

from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

#: Most plan items and card proposals per plan.
MAX_PLAN_ITEMS = 4
MAX_CARD_PROPOSALS = 5

_Strict = ConfigDict(str_strip_whitespace=True, extra="forbid")

AddressedCorrection = Annotated[str, Field(min_length=1, max_length=300)]
ExerciseId = Annotated[str, Field(min_length=1, max_length=100)]

ProposalStatus = Literal["pending", "accepted", "rejected"]


class StudyPlanItemDraft(BaseModel):
    """One plan step: a lesson (and optional exercises) for some of the session's errors."""

    model_config = _Strict

    lesson_id: str = Field(
        min_length=1,
        max_length=100,
        description="Id of a grammar lesson returned by the other tools, e.g. 'articles'.",
    )
    exercise_ids: list[ExerciseId] = Field(
        default_factory=list,
        max_length=3,
        description="Ids of practice exercises from list_exercises. Empty if none fit.",
    )
    addresses: list[AddressedCorrection] = Field(
        min_length=1,
        max_length=5,
        description="The learner's original text for each correction this step addresses.",
    )
    why: str = Field(
        min_length=1,
        max_length=500,
        description="One or two sentences in French, addressed to the learner as 'vous'.",
    )


class CardDraft(BaseModel):
    """A flashcard proposal from the session's vocabulary."""

    model_config = _Strict

    front: str = Field(
        min_length=1,
        max_length=500,
        description="French word or phrase, with its article for nouns.",
    )
    back: str = Field(min_length=1, max_length=500, description="English meaning.")
    example: Optional[str] = Field(
        default=None, max_length=1000, description="Optional French example sentence."
    )
    source: Optional[str] = Field(
        default=None,
        max_length=500,
        description="The learner's phrase in the session that this card comes from.",
    )


class StudyPlanDraft(BaseModel):
    """The study plan the agent submits."""

    model_config = _Strict

    summary: str = Field(
        min_length=1,
        max_length=600,
        description="Two or three sentences in French summarising the plan for the learner.",
    )
    items: list[StudyPlanItemDraft] = Field(min_length=1, max_length=MAX_PLAN_ITEMS)
    cards: list[CardDraft] = Field(default_factory=list, max_length=MAX_CARD_PROPOSALS)


class StudyPlanItemResponse(BaseModel):
    """A stored plan item, with the lesson's title for display."""

    lesson_id: str
    lesson_title: str
    exercise_ids: list[str]
    addresses: list[str]
    why: str


class CardProposalResponse(BaseModel):
    """A stored flashcard proposal and its review status."""

    id: int
    front: str
    back: str
    example: Optional[str] = None
    source: Optional[str] = None
    status: ProposalStatus
    already_known: bool
    card_id: Optional[int] = None
    deck_id: Optional[int] = None


class StudyPlanResponse(BaseModel):
    """A session's stored study plan."""

    session_id: int
    summary: str
    items: list[StudyPlanItemResponse]
    proposals: list[CardProposalResponse]
    model: str
    created_at: datetime
