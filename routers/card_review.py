"""FastAPI router for card review endpoint.

This module provides RESTful endpoints for submitting card reviews
using a separate CardReview model for spaced repetition tracking.

The router implements a modified SM-2 spaced repetition algorithm
with rating scale 0-3 (Fail/Again, Hard, Good, Easy).
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.card import Card as CardModel
from models.card_review import CardReview as CardReviewModel
from schemas.card_review import CardReviewCreate, CardReviewResponse

router = APIRouter(prefix="/card-review", tags=["card-review"])


def calculate_sm2_for_rating(interval: int, ease_factor: float, rating: int) -> tuple[int, float]:
    """Calculate new interval and ease factor using SM-2 algorithm with rating input.
    
    This function adapts the existing SM-2 algorithm to work with rating scale 0-3
    by mapping rating to ease: ease = rating + 1.
    
    The SM-2 algorithm adjusts the interval and ease factor based on the user's
    self-reported ease of recall:
    - rating=0 (Fail/Again): Card was forgotten, reset interval to 1 day
    - rating=1 (Hard): Card was recalled with difficulty
    - rating=2 (Good): Card was recalled correctly
    - rating=3 (Easy): Card was recalled easily
    
    Formula for new ease factor (with ease = rating + 1):
    EF' = EF + (0.1 - (5 - ease) * (0.08 + (5 - ease) * 0.02))
    
    Formula for new interval:
    - If ease >= 3 (rating >= 2): interval' = interval * EF'
    - If ease < 3 (rating < 2): interval' = 1 (reset)
    
    Args:
        interval: Current interval in days
        ease_factor: Current ease factor
        rating: User rating (0-3)
        
    Returns:
        Tuple of (new_interval, new_ease_factor)
        
    Note:
        The ease factor is constrained to the range [1.3, 2.5] after update.
    """
    # Map rating to ease (0-3 -> 1-4)
    ease = rating + 1
    
    # Calculate new ease factor using SM-2 formula
    new_ease_factor = ease_factor + (0.1 - (5 - ease) * (0.08 + (5 - ease) * 0.02))
    
    # Constrain ease factor to [1.3, 2.5]
    new_ease_factor = max(1.3, min(2.5, new_ease_factor))
    
    # Calculate new interval
    if ease >= 3:  # rating >= 2 (Good or Easy)
        new_interval = int(interval * new_ease_factor)
    else:  # rating < 2 (Fail/Again or Hard)
        new_interval = 1
    
    return new_interval, new_ease_factor


def get_current_time() -> datetime:
    """Get current UTC datetime."""
    return datetime.utcnow()


# ============================================================================
# Endpoint: POST /card-review/
# ============================================================================

@router.post("/", response_model=CardReviewResponse)
async def submit_card_review(
    review_data: CardReviewCreate,
    db: AsyncSession = Depends(get_db)
) -> CardReviewResponse:
    """Submit a card review and update spaced repetition scheduling.
    
    Updates the card's review state in the CardReview model using the SM-2
    spaced repetition algorithm. The user provides a rating:
    - 0 = Fail/Again (card was forgotten)
    - 1 = Hard (card was recalled with difficulty)
    - 2 = Good (card was recalled correctly)
    - 3 = Easy (card was recalled easily)
    
    For the first review of a card (no existing CardReview), initializes the
    state with default values (ease_factor=2.5, interval=1, reps=0, lapses=0).
    
    For subsequent reviews, updates the state based on the rating and SM-2
    algorithm. Updates reps (consecutive successful reviews) and lapses (failures).
    
    Request Body:
        card_id: Required. The ID of the card being reviewed
        rating: Required. Review rating (0-3)
        user_id: Optional. User ID for multi-user support (nullable in Phase 1.5)
        
    Returns:
        CardReviewResponse with success status, next review date, and new values
        
    Raises:
        HTTPException 400: If validation fails (handled by Pydantic)
        HTTPException 404: If card not found
    """
    # Validate card exists
    card = await db.get(CardModel, review_data.card_id)
    if not card:
        raise HTTPException(
            status_code=404,
            detail=f"Card with ID {review_data.card_id} not found"
        )
    
    current_time = get_current_time()
    
    # Get or create CardReview for this card (and user if specified)
    # For Phase 1.5, user_id is nullable, so we look up by card_id and user_id
    query = select(CardReviewModel).where(
        CardReviewModel.card_id == review_data.card_id,
        CardReviewModel.user_id == review_data.user_id
    )
    result = await db.execute(query)
    card_review = result.scalar_one_or_none()
    
    if card_review is None:
        # First review for this card (and user)
        # Initialize with default values
        card_review = CardReviewModel(
            user_id=review_data.user_id,
            card_id=review_data.card_id,
            ease_factor=2.5,
            interval=1,
            due_date=current_time + timedelta(days=1),
            reps=0,
            lapses=0
        )
        db.add(card_review)
        await db.commit()
        await db.refresh(card_review)
    
    # Get current values
    current_interval = card_review.interval
    current_ease_factor = card_review.ease_factor
    current_reps = card_review.reps
    current_lapses = card_review.lapses
    
    # Calculate new values using SM-2 algorithm with rating
    new_interval, new_ease_factor = calculate_sm2_for_rating(
        current_interval,
        current_ease_factor,
        review_data.rating
    )
    
    # Update reps and lapses based on rating
    if review_data.rating == 0:  # Fail/Again
        new_reps = 0
        new_lapses = current_lapses + 1
    else:  # Success (Hard, Good, or Easy)
        new_reps = current_reps + 1
        new_lapses = current_lapses
    
    # Calculate new due date
    new_due_date = current_time + timedelta(days=new_interval)
    
    # Update card review with new values
    card_review.ease_factor = new_ease_factor
    card_review.interval = new_interval
    card_review.due_date = new_due_date
    card_review.reps = new_reps
    card_review.lapses = new_lapses
    
    await db.commit()
    await db.refresh(card_review)
    
    return CardReviewResponse(
        success=True,
        message="Review recorded successfully",
        next_due_date=card_review.due_date,
        interval=card_review.interval,
        ease_factor=card_review.ease_factor,
        reps=card_review.reps,
        lapses=card_review.lapses
    )
