"""Study-plan endpoints for the post-session study coach (issue #270).

The plan is built on demand: ``POST /sessions/{id}/study-plan/`` runs the study-coach
agent once and stores the plan and its flashcard proposals. Proposals are only
suggestions. A ``Card`` is created by the accept endpoint and by nothing else, so
generating, viewing or rejecting never writes a card.
"""

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.card import Card as CardModel
from models.deck import Deck as DeckModel
from models.session import Session as SessionModel
from models.study_plan import (
    STATUS_ACCEPTED,
    STATUS_PENDING,
    STATUS_REJECTED,
    STUDY_DECK_DESCRIPTION,
    STUDY_DECK_NAME,
    CardProposal,
    StudyPlan,
)
from routers.grammar import get_lessons
from routers.vocabulary import get_today
from schemas.study_plan import (
    CardProposalResponse,
    StudyPlanItemResponse,
    StudyPlanResponse,
)
from services.llm import LLMProviderError, StudyCoachUnavailableError, llm_service

router = APIRouter(prefix="/sessions/{session_id}/study-plan", tags=["study-plan"])

SESSION_NOT_FOUND = "Session not found"
FEEDBACK_REQUIRED = "Generate feedback before building a study plan."
PLAN_NOT_FOUND = "No study plan for this session yet."
PROPOSAL_NOT_FOUND = "Card proposal not found"
PLAN_FAILED_DETAIL = (
    "The study plan could not be built: the AI didn't finish a valid plan. "
    "Please try again."
)
PROPOSAL_REJECTED = "This card was dismissed."
PROPOSAL_ALREADY_KNOWN = "This card is already in your vocabulary."
PROPOSAL_ACCEPTED = "This card was already added."


def _normalize(text: str) -> str:
    """Case- and whitespace-insensitive key for comparing card fronts."""
    return " ".join(text.split()).lower()


def proposal_response(
    proposal: CardProposal, deck_id: Optional[int] = None
) -> CardProposalResponse:
    """Build the API view of a proposal."""
    return CardProposalResponse(
        id=proposal.id,
        front=proposal.front,
        back=proposal.back,
        example=proposal.example,
        source=proposal.source,
        status=proposal.status,
        already_known=bool(proposal.already_known),
        card_id=proposal.card_id,
        deck_id=deck_id,
    )


def plan_response(plan: StudyPlan) -> StudyPlanResponse:
    """Build the API view of a stored plan, adding each lesson's title."""
    lessons = get_lessons()
    data = plan.plan_dict
    items = []
    for item in data.get("items", []):
        lesson = lessons.get(item["lesson_id"])
        items.append(
            StudyPlanItemResponse(
                lesson_id=item["lesson_id"],
                lesson_title=lesson.title if lesson else item["lesson_id"],
                exercise_ids=item.get("exercise_ids", []),
                addresses=item.get("addresses", []),
                why=item.get("why", ""),
            )
        )
    return StudyPlanResponse(
        session_id=plan.session_id,
        summary=data.get("summary", ""),
        items=items,
        proposals=[proposal_response(p) for p in plan.proposals],
        model=plan.model,
        created_at=plan.created_at,
    )


async def _get_session(db: AsyncSession, session_id: int) -> SessionModel:
    """Return the session or raise 404."""
    session = await db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail=SESSION_NOT_FOUND)
    return session


async def _get_plan(db: AsyncSession, session_id: int) -> Optional[StudyPlan]:
    """Return the session's stored plan, if any."""
    result = await db.execute(select(StudyPlan).where(StudyPlan.session_id == session_id))
    return result.scalar_one_or_none()


async def _get_proposal(db: AsyncSession, session_id: int, proposal_id: int) -> CardProposal:
    """Return a proposal that belongs to this session's plan, or raise 404."""
    result = await db.execute(
        select(CardProposal)
        .join(StudyPlan, CardProposal.study_plan_id == StudyPlan.id)
        .where(CardProposal.id == proposal_id, StudyPlan.session_id == session_id)
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail=PROPOSAL_NOT_FOUND)
    return proposal


@router.post("/", response_model=StudyPlanResponse)
async def create_study_plan(
    session_id: int, db: AsyncSession = Depends(get_db)
) -> StudyPlanResponse:
    """Build and store the session's study plan, or return the one already stored.

    Runs the study-coach agent (one run, logged as one ``llm_calls`` row) only when no
    plan exists. Card proposals are stored as ``pending``; no card is created.

    Raises:
        HTTPException 404: Unknown session.
        HTTPException 400: The session has no feedback yet.
        HTTPException 503: The study coach is turned off or has no Anthropic key.
        HTTPException 502: The agent didn't produce a valid plan (refusal, API error,
            iteration cap or no submission). Nothing is stored.
    """
    session = await _get_session(db, session_id)
    if not session.feedback:
        raise HTTPException(status_code=400, detail=FEEDBACK_REQUIRED)

    existing = await _get_plan(db, session_id)
    if existing is not None:
        return plan_response(existing)

    # The LLM run comes before any other change in this DB session: the recorder
    # commits the session when it writes the llm_calls row.
    try:
        outcome = await llm_service.get_study_plan(
            session.messages_list,
            session.feedback_dict,
            session.difficulty or "intermediate",
            db=db,
            session_id=session.id,
        )
    except StudyCoachUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except LLMProviderError:
        raise HTTPException(status_code=502, detail=PLAN_FAILED_DETAIL)

    draft = outcome.plan
    fronts = {
        _normalize(front)
        for front in (await db.execute(select(CardModel.front))).scalars().all()
    }
    plan = StudyPlan(session_id=session.id, model=outcome.model)
    plan.plan_dict = draft.model_dump(include={"summary", "items"})
    plan.proposals = [
        CardProposal(
            position=position,
            front=card.front,
            back=card.back,
            example=card.example,
            source=card.source,
            status=STATUS_PENDING,
            already_known=_normalize(card.front) in fronts,
        )
        for position, card in enumerate(draft.cards)
    ]
    db.add(plan)
    try:
        await db.commit()
    except IntegrityError:
        # Another request stored a plan for this session first; return that one.
        await db.rollback()
        existing = await _get_plan(db, session_id)
        if existing is None:
            raise
        return plan_response(existing)

    stored = await _get_plan(db, session_id)
    return plan_response(stored)


@router.get("/", response_model=StudyPlanResponse)
async def get_study_plan(
    session_id: int, db: AsyncSession = Depends(get_db)
) -> StudyPlanResponse:
    """Return the session's stored study plan.

    Raises:
        HTTPException 404: Unknown session, or no plan built yet.
    """
    await _get_session(db, session_id)
    plan = await _get_plan(db, session_id)
    if plan is None:
        raise HTTPException(status_code=404, detail=PLAN_NOT_FOUND)
    return plan_response(plan)


async def _get_or_create_study_deck(db: AsyncSession) -> DeckModel:
    """Return the app-managed deck for accepted proposals, creating it if needed."""
    result = await db.execute(
        select(DeckModel).where(DeckModel.name == STUDY_DECK_NAME).order_by(DeckModel.id)
    )
    deck = result.scalars().first()
    if deck is None:
        deck = DeckModel(name=STUDY_DECK_NAME, description=STUDY_DECK_DESCRIPTION)
        db.add(deck)
        await db.flush()
    return deck


@router.post("/cards/{proposal_id}/accept", response_model=CardProposalResponse)
async def accept_card_proposal(
    session_id: int, proposal_id: int, db: AsyncSession = Depends(get_db)
) -> CardProposalResponse:
    """Accept a proposal: create its card in the "Mes mots de session" deck.

    This is the only code path that writes a card for a study plan. Accepting an
    accepted proposal returns it unchanged (no second card). The card gets the same
    initial spaced-repetition values as ``POST /vocabulary/decks/{id}/cards/``.

    Raises:
        HTTPException 404: The proposal isn't in this session's plan.
        HTTPException 409: The proposal was rejected, or its card already existed.
    """
    proposal = await _get_proposal(db, session_id, proposal_id)
    if proposal.status == STATUS_ACCEPTED:
        card = await db.get(CardModel, proposal.card_id) if proposal.card_id else None
        return proposal_response(proposal, card.deck_id if card else None)
    if proposal.status == STATUS_REJECTED:
        raise HTTPException(status_code=409, detail=PROPOSAL_REJECTED)
    if proposal.already_known:
        raise HTTPException(status_code=409, detail=PROPOSAL_ALREADY_KNOWN)

    deck = await _get_or_create_study_deck(db)
    card = CardModel(
        deck_id=deck.id,
        card_id=f"session-{session_id}-{proposal.id}",
        front=proposal.front,
        back=proposal.back,
        example=proposal.example,
        tags=f"study-plan,session-{session_id}",
        context=proposal.source,
        difficulty=1,
        next_review_date=get_today() + timedelta(days=1),
        interval=1,
        ease_factor=2.5,
    )
    db.add(card)
    await db.flush()
    proposal.status = STATUS_ACCEPTED
    proposal.card_id = card.id
    await db.commit()
    await db.refresh(proposal)
    return proposal_response(proposal, deck.id)


@router.post("/cards/{proposal_id}/reject", response_model=CardProposalResponse)
async def reject_card_proposal(
    session_id: int, proposal_id: int, db: AsyncSession = Depends(get_db)
) -> CardProposalResponse:
    """Reject a proposal. Never creates or changes a card; rejecting twice is a no-op.

    Raises:
        HTTPException 404: The proposal isn't in this session's plan.
        HTTPException 409: The proposal was already accepted.
    """
    proposal = await _get_proposal(db, session_id, proposal_id)
    if proposal.status == STATUS_ACCEPTED:
        raise HTTPException(status_code=409, detail=PROPOSAL_ACCEPTED)
    if proposal.status != STATUS_REJECTED:
        proposal.status = STATUS_REJECTED
        await db.commit()
        await db.refresh(proposal)
    return proposal_response(proposal)

