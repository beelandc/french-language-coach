"""Tests for the GET /vocabulary/decks/{id} endpoint.

Part of Issue #201: Implement vocabulary deck detail pages
"""

import pytest
from datetime import date, datetime

from models.card import Card as CardModel
from models.deck import Deck as DeckModel


@pytest.mark.asyncio
class TestGetDeckDetail:
    """Tests for GET /vocabulary/decks/{id} endpoint."""
    
    async def test_get_deck_detail_success(self, client, test_db):
        """Test successful retrieval of a single deck."""
        # Create a deck
        deck = DeckModel(
            name="Travel Vocabulary",
            description="Travel-related French vocabulary"
        )
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        # Add some cards to the deck
        card1 = CardModel(
            deck_id=deck.id,
            card_id="card-1",
            front="Bonjour",
            back="Hello",
            example="Bonjour, comment ça va?",
            tags="greeting,common",
            context="Basic greeting",
            difficulty=1,
            next_review_date=date(2024, 1, 10),
            interval=1,
            ease_factor=2.5
        )
        card2 = CardModel(
            deck_id=deck.id,
            card_id="card-2",
            front="Merci",
            back="Thank you",
            example="Merci beaucoup",
            tags="greeting",
            context="Expressing gratitude",
            difficulty=1,
            next_review_date=date(2024, 1, 10),
            interval=2,
            ease_factor=2.5
        )
        test_db.add_all([card1, card2])
        await test_db.commit()

        response = client.get(f"/vocabulary/decks/{deck.id}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == deck.id
        assert data["name"] == "Travel Vocabulary"
        assert data["description"] == "Travel-related French vocabulary"
        assert data["card_count"] == 2
        assert "created_at" in data
        assert "updated_at" in data
        
    async def test_get_deck_detail_not_found(self, client):
        """Test retrieval of non-existent deck returns 404."""
        response = client.get("/vocabulary/decks/999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        
    async def test_get_deck_detail_returns_card_count(self, client, test_db):
        """Test that deck response includes correct card count."""
        # Create a deck
        deck = DeckModel(
            name="Card Count Test",
            description="Test deck for card counting"
        )
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        # Add 5 cards to verify count
        for i in range(1, 6):
            card = CardModel(
                deck_id=deck.id,
                card_id=f"card-{i}",
                front=f"Word {i}",
                back=f"Translation {i}",
                difficulty=1,
                next_review_date=date(2024, 1, 10),
                interval=1,
                ease_factor=2.5
            )
            test_db.add(card)
        await test_db.commit()

        response = client.get(f"/vocabulary/decks/{deck.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["card_count"] == 5
        
    async def test_get_deck_detail_empty_deck(self, client, test_db):
        """Test retrieval of deck with no cards."""
        deck = DeckModel(
            name="Empty Deck",
            description="A deck with no cards"
        )
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        response = client.get(f"/vocabulary/decks/{deck.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["card_count"] == 0
        
    async def test_get_deck_detail_no_description(self, client, test_db):
        """Test retrieval of deck with no description."""
        deck = DeckModel(
            name="Deck Without Description",
            description=None
        )
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        response = client.get(f"/vocabulary/decks/{deck.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["description"] is None
        
    async def test_get_deck_detail_dates_format(self, client, test_db):
        """Test that dates are returned in correct format."""
        deck = DeckModel(
            name="Date Test",
            description="Test deck for date format"
        )
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)

        response = client.get(f"/vocabulary/decks/{deck.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that dates are strings in ISO format
        assert isinstance(data["created_at"], str)
        assert isinstance(data["updated_at"], str)
        
        # Dates should be parseable
        datetime.fromisoformat(data["created_at"])
        datetime.fromisoformat(data["updated_at"])


@pytest.mark.asyncio
class TestVocabularyDeckDetailIntegration:
    """Integration tests for vocabulary deck detail functionality."""
    
    async def test_list_decks_then_get_detail(self, client, test_db):
        """Test listing all decks then getting detail for a specific deck."""
        # Create a deck
        deck = DeckModel(
            name="Integration Test",
            description="Test deck for integration"
        )
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        # List all decks
        list_response = client.get("/vocabulary/decks/")
        assert list_response.status_code == 200
        
        decks = list_response.json()["decks"]
        deck_ids = [d["id"] for d in decks]
        assert deck.id in deck_ids
        
        # Get detail for our deck
        detail_response = client.get(f"/vocabulary/decks/{deck.id}")
        assert detail_response.status_code == 200
        
        detail_data = detail_response.json()
        assert detail_data["id"] == deck.id
        assert detail_data["name"] == "Integration Test"
        
    async def test_get_deck_cards_integration(self, client, test_db):
        """Test getting deck detail and then cards for that deck."""
        # Create a deck with cards
        deck = DeckModel(
            name="Cards Integration Test",
            description="Test deck with cards"
        )
        test_db.add(deck)
        await test_db.commit()
        await test_db.refresh(deck)
        
        # Add cards
        card1 = CardModel(
            deck_id=deck.id,
            card_id="card-1",
            front="Test Word 1",
            back="Test Translation 1",
            difficulty=1,
            next_review_date=date(2024, 1, 10),
            interval=1,
            ease_factor=2.5
        )
        card2 = CardModel(
            deck_id=deck.id,
            card_id="card-2",
            front="Test Word 2",
            back="Test Translation 2",
            difficulty=2,
            next_review_date=date(2024, 1, 12),
            interval=2,
            ease_factor=2.5
        )
        test_db.add_all([card1, card2])
        await test_db.commit()
        
        # Get deck detail
        deck_response = client.get(f"/vocabulary/decks/{deck.id}")
        assert deck_response.status_code == 200
        
        deck_data = deck_response.json()
        assert deck_data["card_count"] == 2
        
        # Get cards for this deck
        cards_response = client.get(f"/vocabulary/decks/{deck.id}/cards/")
        assert cards_response.status_code == 200
        
        cards_data = cards_response.json()
        assert len(cards_data["cards"]) == 2
        assert cards_data["pagination"]["total"] == 2
