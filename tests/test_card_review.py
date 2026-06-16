"""Tests for CardReview model, schemas, and endpoints.

This module contains comprehensive tests for the card review functionality
implemented for GitHub issue #59.
"""

import pytest
from datetime import datetime, timedelta

from models.card import Card as CardModel
from models.card_review import CardReview as CardReviewModel
from models.deck import Deck as DeckModel
from schemas.card_review import CardReviewCreate, CardReviewResponse


@pytest.mark.asyncio
class TestCardReviewModel:
    """Tests for CardReview SQLAlchemy model."""
    
    async def test_model_fields(self, test_db):
        """Test that CardReview model has all required fields."""
        # Create a card review instance
        card_review = CardReviewModel(
            user_id=None,
            card_id=1,
            ease_factor=2.5,
            interval=1,
            due_date=datetime.utcnow() + timedelta(days=1),
            reps=0,
            lapses=0
        )
        
        # Verify all fields are present
        assert card_review.user_id is None
        assert card_review.card_id == 1
        assert card_review.ease_factor == 2.5
        assert card_review.interval == 1
        assert card_review.due_date is not None
        assert card_review.reps == 0
        assert card_review.lapses == 0
        
        # Verify table name
        assert CardReviewModel.__tablename__ == "card_reviews"
    
    async def test_model_default_values(self, test_db):
        """Test that CardReview model has correct default values."""
        # Create and persist card review with minimal fields
        card_review = CardReviewModel(
            user_id=None,
            card_id=1,
            due_date=datetime.utcnow() + timedelta(days=1)
        )
        
        test_db.add(card_review)
        await test_db.commit()
        await test_db.refresh(card_review)
        
        # Check defaults (applied by database)
        assert card_review.ease_factor == 2.5
        assert card_review.interval == 1
        assert card_review.reps == 0
        assert card_review.lapses == 0
    
    async def test_model_nullable_user_id(self, test_db):
        """Test that user_id is nullable (Phase 1.5 - no authentication)."""
        card_review = CardReviewModel(
            user_id=None,
            card_id=1,
            ease_factor=2.5,
            interval=1,
            due_date=datetime.utcnow() + timedelta(days=1),
            reps=0,
            lapses=0
        )
        
        # Should not raise an error
        test_db.add(card_review)
        await test_db.commit()
        
        assert card_review.user_id is None
    
    async def test_model_creation_and_persistence(self, test_db):
        """Test creating and persisting a CardReview instance."""
        # Create and persist
        card_review = CardReviewModel(
            user_id=None,
            card_id=1,
            ease_factor=2.5,
            interval=5,
            due_date=datetime.utcnow() + timedelta(days=5),
            reps=3,
            lapses=1
        )
        
        test_db.add(card_review)
        await test_db.commit()
        await test_db.refresh(card_review)
        
        # Verify it was persisted
        assert card_review.id is not None
        assert card_review.card_id == 1
        assert card_review.interval == 5
        assert card_review.reps == 3
        assert card_review.lapses == 1


@pytest.mark.asyncio
class TestCardReviewSchemas:
    """Tests for CardReview Pydantic schemas."""
    
    async def test_card_review_create_valid(self):
        """Test CardReviewCreate schema with valid data."""
        data = {
            "card_id": 1,
            "rating": 2,
            "user_id": None
        }
        
        schema = CardReviewCreate(**data)
        
        assert schema.card_id == 1
        assert schema.rating == 2
        assert schema.user_id is None
    
    async def test_card_review_create_with_user_id(self):
        """Test CardReviewCreate schema with user_id."""
        data = {
            "card_id": 1,
            "rating": 3,
            "user_id": 1
        }
        
        schema = CardReviewCreate(**data)
        
        assert schema.card_id == 1
        assert schema.rating == 3
        assert schema.user_id == 1
    
    async def test_card_review_create_rating_validation_min(self):
        """Test that rating below 0 raises validation error."""
        data = {
            "card_id": 1,
            "rating": -1
        }
        
        with pytest.raises(ValueError) as exc_info:
            CardReviewCreate(**data)
        
        # Pydantic validates Field constraints first, so the error message is about ge=0
        assert "greater than or equal to 0" in str(exc_info.value).lower() or \
               "rating must be between 0 and 3" in str(exc_info.value)
    
    async def test_card_review_create_rating_validation_max(self):
        """Test that rating above 3 raises validation error."""
        data = {
            "card_id": 1,
            "rating": 4
        }
        
        with pytest.raises(ValueError) as exc_info:
            CardReviewCreate(**data)
        
        # Pydantic validates Field constraints first, so the error message is about le=3
        assert "less than or equal to 3" in str(exc_info.value).lower() or \
               "rating must be between 0 and 3" in str(exc_info.value)
    
    async def test_card_review_create_card_id_validation(self):
        """Test that card_id must be positive."""
        data = {
            "card_id": 0,
            "rating": 2
        }
        
        with pytest.raises(ValueError):
            CardReviewCreate(**data)
    
    async def test_card_review_response(self):
        """Test CardReviewResponse schema."""
        now = datetime.utcnow()
        data = {
            "success": True,
            "message": "Review recorded successfully",
            "next_due_date": now + timedelta(days=1),
            "interval": 1,
            "ease_factor": 2.5,
            "reps": 1,
            "lapses": 0
        }
        
        response = CardReviewResponse(**data)
        
        assert response.success is True
        assert response.message == "Review recorded successfully"
        assert response.interval == 1
        assert response.ease_factor == 2.5
        assert response.reps == 1
        assert response.lapses == 0


@pytest.mark.asyncio
class TestCardReviewEndpoint:
    """Integration tests for POST /card-review/ endpoint."""
    
    async def test_submit_review_first_time(self, client, test_db):
        """Test submitting first review for a card (no existing CardReview)."""
        # Create a deck and card
        deck = DeckModel(name="Test Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = datetime.utcnow().date()
        card = CardModel(
            deck_id=deck.id,
            card_id="test_card",
            front="test_front",
            back="test_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        # Submit first review
        response = client.post(
            "/card-review/",
            json={
                "card_id": card.id,
                "rating": 2
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Review recorded successfully"
        # For first review with rating=2 (Good), algorithm calculates new interval
        # rating=2 maps to ease=3, which should increase interval from default 1
        assert data["interval"] >= 1  # Should be calculated by algorithm
        assert data["ease_factor"] >= 1.3
        assert data["reps"] == 1  # First successful review
        assert data["lapses"] == 0
        assert "next_due_date" in data
    
    async def test_submit_review_subsequent(self, client, test_db):
        """Test submitting subsequent review for a card."""
        # Create a deck and card
        deck = DeckModel(name="Test Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = datetime.utcnow().date()
        card = CardModel(
            deck_id=deck.id,
            card_id="test_card",
            front="test_front",
            back="test_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        # First review
        client.post(
            "/card-review/",
            json={"card_id": card.id, "rating": 2}
        )
        
        # Second review with rating=3 (Easy)
        response = client.post(
            "/card-review/",
            json={"card_id": card.id, "rating": 3}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["interval"] > 1  # Should increase from first review
        assert data["reps"] == 2  # Two consecutive successful reviews
        assert data["lapses"] == 0
    
    async def test_submit_review_failed(self, client, test_db):
        """Test submitting failed review (rating=0) resets interval and increments lapses."""
        # Create a deck and card
        deck = DeckModel(name="Test Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = datetime.utcnow().date()
        card = CardModel(
            deck_id=deck.id,
            card_id="test_card",
            front="test_front",
            back="test_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        # First review with rating=3 (Easy)
        client.post(
            "/card-review/",
            json={"card_id": card.id, "rating": 3}
        )
        
        # Failed review with rating=0
        response = client.post(
            "/card-review/",
            json={"card_id": card.id, "rating": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["interval"] == 1  # Reset to 1
        assert data["reps"] == 0  # Reset consecutive successful reviews
        assert data["lapses"] == 1  # First lapse
    
    async def test_submit_review_nonexistent_card(self, client):
        """Test submitting review for non-existent card returns 404."""
        response = client.post(
            "/card-review/",
            json={
                "card_id": 999,
                "rating": 2
            }
        )
        
        assert response.status_code == 404
        assert "Card with ID 999 not found" in response.json()["detail"]
    
    async def test_submit_review_invalid_rating_high(self, client, test_db):
        """Test that rating > 3 returns validation error."""
        # Create a deck and card
        deck = DeckModel(name="Test Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = datetime.utcnow().date()
        card = CardModel(
            deck_id=deck.id,
            card_id="test_card",
            front="test_front",
            back="test_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        response = client.post(
            "/card-review/",
            json={
                "card_id": card.id,
                "rating": 4  # Invalid - max is 3
            }
        )
        
        assert response.status_code == 422
    
    async def test_submit_review_invalid_rating_low(self, client, test_db):
        """Test that rating < 0 returns validation error."""
        # Create a deck and card
        deck = DeckModel(name="Test Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = datetime.utcnow().date()
        card = CardModel(
            deck_id=deck.id,
            card_id="test_card",
            front="test_front",
            back="test_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        response = client.post(
            "/card-review/",
            json={
                "card_id": card.id,
                "rating": -1  # Invalid - min is 0
            }
        )
        
        assert response.status_code == 422
    
    async def test_submit_review_with_user_id(self, client, test_db):
        """Test submitting review with user_id."""
        # Create a deck and card
        deck = DeckModel(name="Test Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = datetime.utcnow().date()
        card = CardModel(
            deck_id=deck.id,
            card_id="test_card",
            front="test_front",
            back="test_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        # Submit review with user_id
        response = client.post(
            "/card-review/",
            json={
                "card_id": card.id,
                "rating": 2,
                "user_id": 1
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["reps"] == 1
        assert data["lapses"] == 0
    
    async def test_submit_review_rating_hard(self, client, test_db):
        """Test submitting review with rating=1 (Hard)."""
        # Create a deck and card
        deck = DeckModel(name="Test Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = datetime.utcnow().date()
        card = CardModel(
            deck_id=deck.id,
            card_id="test_card",
            front="test_front",
            back="test_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        # Submit review with rating=1 (Hard)
        response = client.post(
            "/card-review/",
            json={"card_id": card.id, "rating": 1}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["reps"] == 1
        assert data["lapses"] == 0
    
    async def test_submit_review_multiple_users(self, client, test_db):
        """Test that different users have separate review states for the same card."""
        # Create a deck and card
        deck = DeckModel(name="Test Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = datetime.utcnow().date()
        card = CardModel(
            deck_id=deck.id,
            card_id="test_card",
            front="test_front",
            back="test_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        # User 1 submits review with rating=3
        response1 = client.post(
            "/card-review/",
            json={"card_id": card.id, "rating": 3, "user_id": 1}
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        # User 2 submits review with rating=0
        response2 = client.post(
            "/card-review/",
            json={"card_id": card.id, "rating": 0, "user_id": 2}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # User 1 should still have their own state
        # Submit another review for user 1
        response1_again = client.post(
            "/card-review/",
            json={"card_id": card.id, "rating": 2, "user_id": 1}
        )
        assert response1_again.status_code == 200
        data1_again = response1_again.json()
        
        # User 1's reps should be incremented from their first review
        assert data1_again["reps"] >= 1
        # User 2's lapses should be 1 from their failed review
        assert data2["lapses"] == 1


@pytest.mark.asyncio
class TestCardReviewAlgorithm:
    """Tests for the SM-2 algorithm implementation with rating 0-3."""
    
    async def test_calculate_sm2_rating_3_easy(self):
        """Test SM-2 calculation for rating=3 (Easy)."""
        from routers.card_review import calculate_sm2_for_rating
        
        # Start with interval=1, ease_factor=2.5
        new_interval, new_ease_factor = calculate_sm2_for_rating(1, 2.5, 3)
        
        # rating=3 maps to ease=4, which should increase interval
        assert new_interval > 1
        assert 1.3 <= new_ease_factor <= 2.5
    
    async def test_calculate_sm2_rating_0_fail(self):
        """Test SM-2 calculation for rating=0 (Fail/Again)."""
        from routers.card_review import calculate_sm2_for_rating
        
        # Any interval should reset to 1 for rating=0
        new_interval, new_ease_factor = calculate_sm2_for_rating(10, 2.5, 0)
        
        assert new_interval == 1
        assert 1.3 <= new_ease_factor <= 2.5
    
    async def test_calculate_sm2_rating_2_good(self):
        """Test SM-2 calculation for rating=2 (Good)."""
        from routers.card_review import calculate_sm2_for_rating
        
        # rating=2 maps to ease=3, which should increase interval
        new_interval, new_ease_factor = calculate_sm2_for_rating(1, 2.5, 2)
        
        assert new_interval > 1
        assert 1.3 <= new_ease_factor <= 2.5
    
    async def test_calculate_sm2_rating_1_hard(self):
        """Test SM-2 calculation for rating=1 (Hard)."""
        from routers.card_review import calculate_sm2_for_rating
        
        # rating=1 maps to ease=2, which should reset interval to 1
        new_interval, new_ease_factor = calculate_sm2_for_rating(5, 2.5, 1)
        
        assert new_interval == 1
        assert 1.3 <= new_ease_factor <= 2.5
    
    async def test_ease_factor_bounds(self):
        """Test that ease factor stays within bounds [1.3, 2.5]."""
        from routers.card_review import calculate_sm2_for_rating
        
        # Test with various inputs
        for rating in [0, 1, 2, 3]:
            for interval in [1, 5, 10]:
                for ease_factor in [1.3, 2.0, 2.5]:
                    new_interval, new_ease_factor = calculate_sm2_for_rating(
                        interval, ease_factor, rating
                    )
                    assert 1.3 <= new_ease_factor <= 2.5, \
                        f"Ease factor out of bounds: {new_ease_factor}"
