"""FastAPI router for vocabulary deck and card management endpoints.

This module provides RESTful endpoints for vocabulary management:
- GET /vocabulary/decks/ - List all decks
- GET /vocabulary/decks/{id}/cards/ - List cards in a deck
- POST /vocabulary/decks/ - Create a new deck
- POST /vocabulary/review/ - Submit a card review
- GET /vocabulary/due/ - Get cards due for review

The router implements the SM-2 spaced repetition algorithm for scheduling
optimal review times based on user performance.
"""

from datetime import date, timedelta
from math import ceil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.card import Card as CardModel
from models.deck import Deck as DeckModel
from schemas.vocabulary import (
    CardCreate,
    CardListResponse,
    CardSummary,
    DeckCreate,
    DeckListResponse,
    DeckResponse,
    DeckSummary,
    DueCardResponse,
    DueCardsResponse,
    ReviewResponse,
    ReviewSubmit,
)
from schemas.session import PaginationInfo

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


# ============================================================================
# Helper Functions
# ============================================================================

def calculate_sm2(interval: int, ease_factor: float, ease: int) -> tuple[int, float]:
    """Calculate new interval and ease factor using the SM-2 algorithm.
    
    The SM-2 algorithm adjusts the interval and ease factor based on the user's
    self-reported ease of recall:
    - ease=1 (Again): Card was forgotten, reset interval to 1 day
    - ease=2 (Hard): Card was recalled with difficulty
    - ease=3 (Good): Card was recalled correctly
    - ease=4 (Easy): Card was recalled easily
    
    Formula for new ease factor:
    EF' = EF + (0.1 - (5 - ease) * (0.08 + (5 - ease) * 0.02))
    
    Formula for new interval:
    - If ease >= 3: interval' = interval * EF'
    - If ease < 3: interval' = 1 (reset)
    
    Args:
        interval: Current interval in days
        ease_factor: Current ease factor
        ease: User-reported ease (1-4)
        
    Returns:
        Tuple of (new_interval, new_ease_factor)
        
    Note:
        The ease factor is constrained to the range [1.3, 2.5] after update.
    """
    # Calculate new ease factor
    new_ease_factor = ease_factor + (0.1 - (5 - ease) * (0.08 + (5 - ease) * 0.02))
    
    # Constrain ease factor to [1.3, 2.5]
    new_ease_factor = max(1.3, min(2.5, new_ease_factor))
    
    # Calculate new interval
    if ease >= 3:
        new_interval = int(interval * new_ease_factor)
    else:
        new_interval = 1
    
    return new_interval, new_ease_factor


def get_today() -> date:
    """Get today's date (UTC)."""
    return date.today()


# ============================================================================
# Pagination Helper
# ============================================================================

def paginate_items(
    items: list,
    page: int = 1,
    per_page: int = 10
) -> tuple[list, PaginationInfo]:
    """Apply pagination to a list of items.
    
    Args:
        items: List of all items to paginate
        page: Page number (1-indexed)
        per_page: Number of items per page (max 100)
        
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
# Endpoint: GET /vocabulary/decks/
# ============================================================================

@router.get("/decks/", response_model=DeckListResponse)
async def list_decks(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    db: AsyncSession = Depends(get_db)
) -> DeckListResponse:
    """List all vocabulary decks with pagination.
    
    Returns a paginated list of deck summaries including the number of cards
    in each deck.
    
    Query Parameters:
        page: Page number (default: 1)
        per_page: Items per page, maximum 100 (default: 10)
        
    Returns:
        DeckListResponse with list of DeckSummary and PaginationInfo
        
    Raises:
        HTTPException 404: If page exceeds total_pages
    """
    # Query all decks
    result = await db.execute(
        select(DeckModel).order_by(DeckModel.created_at.desc())
    )
    decks = result.scalars().all()
    
    # Count cards for each deck
    deck_summaries = []
    for deck in decks:
        # Count cards in this deck
        card_count_result = await db.execute(
            select(func.count(CardModel.id)).where(CardModel.deck_id == deck.id)
        )
        card_count = card_count_result.scalar() or 0
        
        deck_summaries.append(
            DeckSummary(
                id=deck.id,
                name=deck.name,
                description=deck.description,
                created_at=deck.created_at,
                updated_at=deck.updated_at,
                card_count=card_count
            )
        )
    
    # Apply pagination
    paginated_decks, pagination = paginate_items(deck_summaries, page, per_page)
    
    return DeckListResponse(
        decks=paginated_decks,
        pagination=pagination
    )


# ============================================================================
# Endpoint: POST /vocabulary/decks/
# ============================================================================

@router.post("/decks/", response_model=DeckResponse, status_code=201)
async def create_deck(
    deck_create: DeckCreate,
    db: AsyncSession = Depends(get_db)
) -> DeckResponse:
    """Create a new vocabulary deck.
    
    Creates a new deck with the provided name and optional description.
    The deck starts empty (no cards).
    
    Request Body:
        name: Required. The name of the deck (1-255 characters)
        description: Optional. Description of the deck's purpose
        
    Returns:
        DeckResponse with the created deck's details
        
    Raises:
        HTTPException 400: If deck with same name already exists (optional constraint)
        HTTPException 422: If validation fails
    """
    # Create new deck model
    new_deck = DeckModel(
        name=deck_create.name,
        description=deck_create.description
    )
    
    db.add(new_deck)
    await db.commit()
    await db.refresh(new_deck)
    
    # Return response with card_count=0 (new deck is empty)
    return DeckResponse(
        id=new_deck.id,
        name=new_deck.name,
        description=new_deck.description,
        created_at=new_deck.created_at,
        updated_at=new_deck.updated_at,
        card_count=0
    )


# ============================================================================
# Endpoint: GET /vocabulary/decks/{id}/cards/
# ============================================================================

@router.get("/decks/{deck_id}/cards/", response_model=CardListResponse)
async def list_cards_in_deck(
    deck_id: int,
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    db: AsyncSession = Depends(get_db)
) -> CardListResponse:
    """List all cards in a specific deck with pagination.
    
    Returns a paginated list of all cards belonging to the specified deck.
    
    Path Parameters:
        deck_id: The ID of the deck
        
    Query Parameters:
        page: Page number (default: 1)
        per_page: Items per page, maximum 100 (default: 10)
        
    Returns:
        CardListResponse with list of CardSummary and PaginationInfo
        
    Raises:
        HTTPException 404: If deck not found or page exceeds total_pages
    """
    # Verify deck exists
    deck = await db.get(DeckModel, deck_id)
    if not deck:
        raise HTTPException(
            status_code=404,
            detail=f"Deck with ID {deck_id} not found"
        )
    
    # Query cards in this deck, ordered by next_review_date
    result = await db.execute(
        select(CardModel)
        .where(CardModel.deck_id == deck_id)
        .order_by(CardModel.next_review_date.asc())
    )
    cards = result.scalars().all()
    
    # Convert to CardSummary format
    card_summaries = [
        CardSummary(
            id=card.id,
            deck_id=card.deck_id,
            card_id=card.card_id,
            front=card.front,
            back=card.back,
            example=card.example,
            tags=[tag for tag in (card.tags or "").split(",") if tag] if card.tags else None,
            context=card.context,
            difficulty=card.difficulty,
            next_review_date=card.next_review_date,
            interval=card.interval,
            ease_factor=card.ease_factor,
            created_at=card.created_at,
            updated_at=card.updated_at
        )
        for card in cards
    ]
    
    # Apply pagination
    paginated_cards, pagination = paginate_items(card_summaries, page, per_page)
    
    return CardListResponse(
        cards=paginated_cards,
        pagination=pagination
    )


# ============================================================================
# Endpoint: POST /vocabulary/review/
# ============================================================================

@router.post("/review/", response_model=ReviewResponse)
async def submit_review(
    review_submit: ReviewSubmit,
    db: AsyncSession = Depends(get_db)
) -> ReviewResponse:
    """Submit a card review and update spaced repetition scheduling.
    
    Updates the card's interval, ease factor, and next review date based on
    the SM-2 spaced repetition algorithm. The user provides an ease rating:
    - 1 = Again (card was forgotten)
    - 2 = Hard (card was recalled with difficulty)
    - 3 = Good (card was recalled correctly)
    - 4 = Easy (card was recalled easily)
    
    Request Body:
        card_id: Required. The ID of the card being reviewed
        deck_id: Required. The ID of the deck containing the card
        ease: Required. Review ease rating (1-4)
        
    Returns:
        ReviewResponse with success status, next review date, and new values
        
    Raises:
        HTTPException 400: If ease is not in valid range (handled by Pydantic)
        HTTPException 404: If card or deck not found
    """
    # Verify card exists and belongs to the specified deck
    card = await db.get(CardModel, review_submit.card_id)
    if not card:
        raise HTTPException(
            status_code=404,
            detail=f"Card with ID {review_submit.card_id} not found"
        )
    
    # Verify deck exists (optional, since card.deck_id should match)
    if card.deck_id != review_submit.deck_id:
        raise HTTPException(
            status_code=400,
            detail=f"Card {review_submit.card_id} does not belong to deck {review_submit.deck_id}"
        )
    
    # Get current values
    current_interval = card.interval
    current_ease_factor = card.ease_factor
    
    # Calculate new values using SM-2 algorithm
    new_interval, new_ease_factor = calculate_sm2(
        current_interval,
        current_ease_factor,
        review_submit.ease
    )
    
    # Calculate new next review date
    new_next_review_date = get_today() + timedelta(days=new_interval)
    
    # Update card with new values
    card.interval = new_interval
    card.ease_factor = new_ease_factor
    card.next_review_date = new_next_review_date
    
    await db.commit()
    await db.refresh(card)
    
    return ReviewResponse(
        success=True,
        message="Review recorded successfully",
        next_review_date=new_next_review_date,
        new_interval=new_interval,
        new_ease_factor=new_ease_factor
    )


# ============================================================================
# Endpoint: GET /vocabulary/due/
# ============================================================================

@router.get("/due/", response_model=DueCardsResponse)
async def get_due_cards(
    page: int = Query(1, ge=1, description="Page number, starting at 1"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page, maximum 100"),
    db: AsyncSession = Depends(get_db)
) -> DueCardsResponse:
    """Get all cards that are due for review.
    
    Returns cards where next_review_date is less than or equal to today's date.
    Cards are ordered by next_review_date (oldest first).
    
    Query Parameters:
        page: Page number (default: 1)
        per_page: Items per page, maximum 100 (default: 10)
        
    Returns:
        DueCardsResponse with list of DueCardResponse and PaginationInfo
        
    Raises:
        HTTPException 404: If page exceeds total_pages
    """
    today = get_today()
    
    # Query cards that are due (next_review_date <= today)
    # Load deck relationship for deck_name
    result = await db.execute(
        select(CardModel)
        .options(selectinload(CardModel.deck))
        .where(CardModel.next_review_date <= today)
        .order_by(CardModel.next_review_date.asc())
    )
    cards = result.scalars().all()
    
    # Convert to DueCardResponse format
    due_cards = [
        DueCardResponse(
            id=card.id,
            deck_id=card.deck_id,
            deck_name=card.deck.name if card.deck else "Unknown Deck",
            card_id=card.card_id,
            front=card.front,
            back=card.back,
            next_review_date=card.next_review_date
        )
        for card in cards
    ]
    
    # Apply pagination
    paginated_cards, pagination = paginate_items(due_cards, page, per_page)
    
    return DueCardsResponse(
        cards=paginated_cards,
        pagination=pagination
    )


# ============================================================================
# Endpoint: POST /vocabulary/decks/{id}/cards/ (Bonus - for creating cards)
# ============================================================================

@router.post("/decks/{deck_id}/cards/", response_model=CardSummary, status_code=201)
async def create_card(
    deck_id: int,
    card_create: CardCreate,
    db: AsyncSession = Depends(get_db)
) -> CardSummary:
    """Create a new card in a specific deck.
    
    Creates a new vocabulary card and adds it to the specified deck.
    Initial spaced repetition values are set:
    - interval: 1 day
    - ease_factor: 2.5
    - next_review_date: today + 1 day
    
    Path Parameters:
        deck_id: The ID of the deck to add the card to
        
    Request Body:
        card_id: Required. Unique identifier within the deck
        front: Required. French text to learn
        back: Required. English translation
        example: Optional. Example sentence
        tags: Optional. List of tags
        context: Optional. Context description
        difficulty: Optional. Difficulty level (1-5, default 1)
        
    Returns:
        CardSummary with the created card's details
        
    Raises:
        HTTPException 404: If deck not found
        HTTPException 422: If validation fails
    """
    # Verify deck exists
    deck = await db.get(DeckModel, deck_id)
    if not deck:
        raise HTTPException(
            status_code=404,
            detail=f"Deck with ID {deck_id} not found"
        )
    
    # Use deck_id from path parameter (overrides body if provided)
    # card_create.deck_id is optional, path deck_id is authoritative
    deck_id_to_use = deck_id
    
    # Set initial spaced repetition values
    today = get_today()
    
    new_card = CardModel(
        deck_id=deck_id_to_use,
        card_id=card_create.card_id,
        front=card_create.front,
        back=card_create.back,
        example=card_create.example,
        tags=",".join(card_create.tags) if card_create.tags else None,
        context=card_create.context,
        difficulty=card_create.difficulty or 1,
        next_review_date=today + timedelta(days=1),
        interval=1,
        ease_factor=2.5
    )
    
    db.add(new_card)
    await db.commit()
    await db.refresh(new_card)
    
    # Return card summary
    return CardSummary(
        id=new_card.id,
        deck_id=new_card.deck_id,
        card_id=new_card.card_id,
        front=new_card.front,
        back=new_card.back,
        example=new_card.example,
        tags=[tag for tag in (new_card.tags or "").split(",") if tag] if new_card.tags else None,
        context=new_card.context,
        difficulty=new_card.difficulty,
        next_review_date=new_card.next_review_date,
        interval=new_card.interval,
        ease_factor=new_card.ease_factor,
        created_at=new_card.created_at,
        updated_at=new_card.updated_at
    )
