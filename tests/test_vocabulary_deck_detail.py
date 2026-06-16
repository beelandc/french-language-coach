"""Tests for the GET /vocabulary/decks/{id} endpoint.

Part of Issue #201: Implement vocabulary deck detail pages
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from models.base import BaseModel
from models.deck import Deck as DeckModel
from models.card import Card as CardModel
from database import get_db

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create test database
BaseModel.metadata.create_all(bind=engine)


def override_get_db():
    """Dependency override for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture
def test_db():
    """Fixture for test database."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(test_db):
    """Test client with database dependency override."""
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def sample_deck(test_db):
    """Create a sample deck for testing."""
    deck = DeckModel(
        name="Travel Vocabulary",
        description="Travel-related French vocabulary"
    )
    test_db.add(deck)
    test_db.commit()
    test_db.refresh(deck)
    
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
        next_review_date="2024-01-10",
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
        next_review_date="2024-01-10",
        interval=2,
        ease_factor=2.5
    )
    test_db.add_all([card1, card2])
    test_db.commit()
    
    return deck


class TestGetDeckDetail:
    """Tests for GET /vocabulary/decks/{id} endpoint."""
    
    def test_get_deck_detail_success(self, client, sample_deck):
        """Test successful retrieval of a single deck."""
        response = client.get(f"/vocabulary/decks/{sample_deck.id}")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == sample_deck.id
        assert data["name"] == "Travel Vocabulary"
        assert data["description"] == "Travel-related French vocabulary"
        assert data["card_count"] == 2
        assert "created_at" in data
        assert "updated_at" in data
        
    def test_get_deck_detail_not_found(self, client):
        """Test retrieval of non-existent deck returns 404."""
        response = client.get("/vocabulary/decks/999")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        
    def test_get_deck_detail_returns_card_count(self, client, sample_deck, test_db):
        """Test that deck response includes correct card count."""
        # Add more cards to verify count
        for i in range(3, 6):
            card = CardModel(
                deck_id=sample_deck.id,
                card_id=f"card-{i}",
                front=f"Word {i}",
                back=f"Translation {i}",
                difficulty=1,
                next_review_date="2024-01-10",
                interval=1,
                ease_factor=2.5
            )
            test_db.add(card)
        test_db.commit()
        
        response = client.get(f"/vocabulary/decks/{sample_deck.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["card_count"] == 5  # Original 2 + 3 new cards
        
    def test_get_deck_detail_empty_deck(self, client, test_db):
        """Test retrieval of deck with no cards."""
        deck = DeckModel(
            name="Empty Deck",
            description="A deck with no cards"
        )
        test_db.add(deck)
        test_db.commit()
        test_db.refresh(deck)
        
        response = client.get(f"/vocabulary/decks/{deck.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["card_count"] == 0
        
    def test_get_deck_detail_no_description(self, client, test_db):
        """Test retrieval of deck with no description."""
        deck = DeckModel(
            name="Deck Without Description",
            description=None
        )
        test_db.add(deck)
        test_db.commit()
        test_db.refresh(deck)
        
        response = client.get(f"/vocabulary/decks/{deck.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["description"] is None
        
    def test_get_deck_detail_dates_format(self, client, sample_deck):
        """Test that dates are returned in correct format."""
        response = client.get(f"/vocabulary/decks/{sample_deck.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that dates are strings in ISO format
        assert isinstance(data["created_at"], str)
        assert isinstance(data["updated_at"], str)
        
        # Dates should be parseable
        from datetime import datetime
        datetime.fromisoformat(data["created_at"])
        datetime.fromisoformat(data["updated_at"])


class TestVocabularyDeckDetailIntegration:
    """Integration tests for vocabulary deck detail functionality."""
    
    def test_list_decks_then_get_detail(self, client, sample_deck):
        """Test listing all decks then getting detail for a specific deck."""
        # List all decks
        list_response = client.get("/vocabulary/decks/")
        assert list_response.status_code == 200
        
        decks = list_response.json()["decks"]
        deck_ids = [d["id"] for d in decks]
        assert sample_deck.id in deck_ids
        
        # Get detail for our sample deck
        detail_response = client.get(f"/vocabulary/decks/{sample_deck.id}")
        assert detail_response.status_code == 200
        
        detail_data = detail_response.json()
        assert detail_data["id"] == sample_deck.id
        assert detail_data["name"] == "Travel Vocabulary"
        
    def test_get_deck_cards_integration(self, client, sample_deck):
        """Test getting deck detail and then cards for that deck."""
        # Get deck detail
        deck_response = client.get(f"/vocabulary/decks/{sample_deck.id}")
        assert deck_response.status_code == 200
        
        deck_data = deck_response.json()
        assert deck_data["card_count"] == 2
        
        # Get cards for this deck
        cards_response = client.get(f"/vocabulary/decks/{sample_deck.id}/cards/")
        assert cards_response.status_code == 200
        
        cards_data = cards_response.json()
        assert len(cards_data["cards"]) == 2
        assert cards_data["pagination"]["total"] == 2


# Cleanup after tests
@pytest.fixture(scope="session", autouse=True)
def cleanup():
    """Cleanup test database after all tests."""
    yield
    BaseModel.metadata.drop_all(bind=engine)
