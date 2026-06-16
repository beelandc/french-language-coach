"""Simple tests for vocabulary router endpoints.

This module contains basic tests for the vocabulary router to verify core functionality.
"""

import pytest
from datetime import date, timedelta

from models.card import Card as CardModel
from models.deck import Deck as DeckModel


@pytest.mark.asyncio
class TestVocabularyBasics:
    """Basic tests for vocabulary router."""
    
    async def test_list_decks_empty(self, client):
        """Test listing decks when none exist."""
        response = client.get("/vocabulary/decks/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["decks"] == []
        assert data["pagination"]["total"] == 0
    
    async def test_create_deck(self, client):
        """Test creating a new deck."""
        response = client.post(
            "/vocabulary/decks/",
            json={"name": "Test Deck"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["name"] == "Test Deck"
    
    async def test_create_deck_with_description(self, client):
        """Test creating a deck with description."""
        response = client.post(
            "/vocabulary/decks/",
            json={
                "name": "Food Vocabulary",
                "description": "Words related to food"
            }
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Food Vocabulary"
        assert data["description"] == "Words related to food"
    
    async def test_create_deck_empty_name_fails(self, client):
        """Test that creating a deck with empty name fails."""
        response = client.post(
            "/vocabulary/decks/",
            json={"name": ""}
        )
        
        assert response.status_code == 422
    
    async def test_list_decks_with_data(self, client, test_db):
        """Test listing decks with existing data."""
        # Create decks directly in database
        deck1 = DeckModel(name="Deck 1", description="First deck")
        deck2 = DeckModel(name="Deck 2", description="Second deck")
        test_db.add_all([deck1, deck2])
        await test_db.commit()
        
        response = client.get("/vocabulary/decks/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["decks"]) == 2


@pytest.mark.asyncio
class TestCardBasics:
    """Basic tests for card operations."""
    
    async def test_create_card(self, client, test_db):
        """Test creating a new card in a deck."""
        # First create a deck
        deck_response = client.post(
            "/vocabulary/decks/",
            json={"name": "Test Deck for Cards"}
        )
        deck_id = deck_response.json()["id"]
        
        # Create a card in the deck
        card_data = {
            "card_id": "test_card",
            "front": "test_front",
            "back": "test_back",
            "difficulty": 2
        }
        
        response = client.post(
            f"/vocabulary/decks/{deck_id}/cards/",
            json=card_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["deck_id"] == deck_id
        assert data["card_id"] == "test_card"
        assert data["front"] == "test_front"
        assert data["back"] == "test_back"
        assert data["difficulty"] == 2
        # Check initial spaced repetition values
        assert data["interval"] == 1
        assert data["ease_factor"] == 2.5
    
    async def test_create_card_empty_front_fails(self, client, test_db):
        """Test that creating a card with empty front fails."""
        # First create a deck
        deck_response = client.post(
            "/vocabulary/decks/",
            json={"name": "Test Deck"}
        )
        deck_id = deck_response.json()["id"]
        
        card_data = {
            "card_id": "test_card",
            "front": "",
            "back": "test_back"
        }
        
        response = client.post(
            f"/vocabulary/decks/{deck_id}/cards/",
            json=card_data
        )
        
        assert response.status_code == 422
    
    async def test_list_cards_empty_deck(self, client, test_db):
        """Test listing cards in an empty deck."""
        # Create a deck
        deck = DeckModel(name="Empty Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        response = client.get(f"/vocabulary/decks/{deck.id}/cards/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cards"] == []
    
    async def test_list_cards_with_data(self, client, test_db):
        """Test listing cards in a deck with cards."""
        # Create deck
        deck = DeckModel(name="Deck with Cards")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        # Create cards
        today = date.today()
        for i in range(3):
            card = CardModel(
                deck_id=deck.id,
                card_id=f"card_{i}",
                front=f"front_{i}",
                back=f"back_{i}",
                next_review_date=today + timedelta(days=i),
                interval=1,
                ease_factor=2.5,
                difficulty=1
            )
            test_db.add(card)
        await test_db.commit()
        
        response = client.get(f"/vocabulary/decks/{deck.id}/cards/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["cards"]) == 3


@pytest.mark.asyncio
class TestReviewBasics:
    """Basic tests for review submission."""
    
    async def test_submit_review_success(self, client, test_db):
        """Test submitting a review for a card."""
        # Create deck and card
        deck = DeckModel(name="Review Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = date.today()
        card = CardModel(
            deck_id=deck.id,
            card_id="review_card",
            front="review_front",
            back="review_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        response = client.post(
            "/vocabulary/review/",
            json={
                "card_id": card.id,
                "deck_id": deck.id,
                "ease": 3  # Good
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["new_interval"] >= 1
    
    async def test_submit_review_again_reset(self, client, test_db):
        """Test that ease=1 (Again) resets interval to 1."""
        # Create deck and card
        deck = DeckModel(name="Review Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = date.today()
        card = CardModel(
            deck_id=deck.id,
            card_id="again_card",
            front="again_front",
            back="again_back",
            next_review_date=today,
            interval=5,  # Start with higher interval
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        response = client.post(
            "/vocabulary/review/",
            json={
                "card_id": card.id,
                "deck_id": deck.id,
                "ease": 1  # Again
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["new_interval"] == 1  # Reset to 1
    
    async def test_submit_review_nonexistent_card(self, client):
        """Test submitting a review for non-existent card."""
        response = client.post(
            "/vocabulary/review/",
            json={
                "card_id": 999,
                "deck_id": 1,
                "ease": 3
            }
        )
        
        assert response.status_code == 404
    
    async def test_submit_review_invalid_ease(self, client, test_db):
        """Test submitting a review with invalid ease factor."""
        # Create deck and card
        deck = DeckModel(name="Review Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        today = date.today()
        card = CardModel(
            deck_id=deck.id,
            card_id="invalid_card",
            front="invalid_front",
            back="invalid_back",
            next_review_date=today,
            interval=1,
            ease_factor=2.5,
            difficulty=1
        )
        test_db.add(card)
        await test_db.commit()
        await test_db.refresh(card)
        
        # Try with ease=5 (invalid)
        response = client.post(
            "/vocabulary/review/",
            json={
                "card_id": card.id,
                "deck_id": deck.id,
                "ease": 5
            }
        )
        
        assert response.status_code == 422


@pytest.mark.asyncio
class TestDueCardsBasics:
    """Basic tests for due cards endpoint."""
    
    async def test_get_due_cards_empty(self, client):
        """Test getting due cards when none are due."""
        response = client.get("/vocabulary/due/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["cards"] == []
    
    async def test_get_due_cards_with_data(self, client, test_db):
        """Test getting due cards with existing due cards."""
        # Create deck
        deck = DeckModel(name="Due Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        # Create due cards (next_review_date <= today)
        today = date.today()
        for i in range(3):
            card = CardModel(
                deck_id=deck.id,
                card_id=f"due_card_{i}",
                front=f"due_front_{i}",
                back=f"due_back_{i}",
                next_review_date=today - timedelta(days=i + 1),  # In the past
                interval=1,
                ease_factor=2.5,
                difficulty=1
            )
            test_db.add(card)
        await test_db.commit()
        
        response = client.get("/vocabulary/due/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["cards"]) == 3
        
        # Verify deck name is included
        for card in data["cards"]:
            assert "deck_name" in card
            assert card["deck_name"] == "Due Deck"
    
    async def test_due_cards_not_returned(self, client, test_db):
        """Test that future cards are not returned as due."""
        # Create deck
        deck = DeckModel(name="Future Deck")
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        # Create future cards (next_review_date > today)
        today = date.today()
        for i in range(3):
            card = CardModel(
                deck_id=deck.id,
                card_id=f"future_card_{i}",
                front=f"future_front_{i}",
                back=f"future_back_{i}",
                next_review_date=today + timedelta(days=i + 1),  # In the future
                interval=1,
                ease_factor=2.5,
                difficulty=1
            )
            test_db.add(card)
        await test_db.commit()
        
        response = client.get("/vocabulary/due/")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["cards"]) == 0
