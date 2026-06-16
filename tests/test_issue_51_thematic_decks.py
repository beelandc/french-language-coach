"""Tests for GitHub issue #51: Seed themed decks (500+ cards, 10+ decks).

This test suite verifies that the themed vocabulary decks meet all acceptance criteria:
- 10+ themed decks
- 500+ total cards
- All cards have front, back, example
- All cards pass schema validation
"""

import pytest
from pathlib import Path

from schemas.vocabulary_card import load_cards_from_directory, VocabularyCard


# Fixture for the vocabulary cards directory
@pytest.fixture
def vocab_cards_dir():
    """Return the path to the vocabulary cards directory."""
    return Path("data/vocabulary_cards")


class TestAcceptanceCriteria:
    """Test suite for issue #51 acceptance criteria."""

    def test_ac_01_minimum_deck_count(self, vocab_cards_dir):
        """AC-01: Verify there are at least 10 themed decks.
        
        Given: vocabulary_cards directory with cards
        When: counting unique deck_ids
        Then: there are at least 10 different themed decks
        """
        cards = load_cards_from_directory(vocab_cards_dir)
        deck_ids = set(card.deck_id for card in cards.values())
        
        assert len(deck_ids) >= 10, f"Expected at least 10 decks, found {len(deck_ids)}"

    def test_ac_02_minimum_card_count(self, vocab_cards_dir):
        """AC-02: Verify there are at least 500 total cards.
        
        Given: all JSON files in vocabulary_cards directory
        When: counting all cards
        Then: there are at least 500 cards
        """
        cards = load_cards_from_directory(vocab_cards_dir)
        
        assert len(cards) >= 500, f"Expected at least 500 cards, found {len(cards)}"

    def test_ac_03_required_fields_present(self, vocab_cards_dir):
        """AC-03: Verify all cards have front, back, and example fields populated.
        
        Given: any card in any deck
        When: examining its fields
        Then: it has front, back, and example fields populated
        """
        cards = load_cards_from_directory(vocab_cards_dir)
        
        for card_key, card in cards.items():
            # Check required fields are present and non-empty
            assert hasattr(card, 'front'), f"Card {card_key} missing 'front' field"
            assert hasattr(card, 'back'), f"Card {card_key} missing 'back' field"
            assert hasattr(card, 'example'), f"Card {card_key} missing 'example' field"
            
            # Check fields are non-empty
            assert card.front and card.front.strip(), f"Card {card_key} has empty 'front'"
            assert card.back and card.back.strip(), f"Card {card_key} has empty 'back'"
            assert card.example and card.example.strip(), f"Card {card_key} has empty 'example'"

    def test_ac_04_schema_validation(self, vocab_cards_dir):
        """AC-04: Verify all cards pass schema validation.
        
        Given: all cards in all decks
        When: validated against VocabularyCard schema
        Then: all cards pass validation without errors
        """
        # load_cards_from_directory already validates each card
        # If we get here without exception, all cards passed validation
        cards = load_cards_from_directory(vocab_cards_dir)
        
        # Verify we have cards
        assert len(cards) > 0, "No cards loaded"
        
        # Verify all cards are VocabularyCard instances
        for card_key, card in cards.items():
            assert isinstance(card, VocabularyCard), f"Card {card_key} is not a VocabularyCard instance"


class TestDeckCoverage:
    """Test suite for verifying deck coverage and completeness."""

    def test_all_expected_decks_present(self, vocab_cards_dir):
        """Verify all 11 expected themed decks are present."""
        expected_decks = {
            'travel', 'dining', 'shopping', 'business', 'medical',
            'technology', 'daily_routines', 'hobbies', 'education',
            'sports', 'food'
        }
        
        cards = load_cards_from_directory(vocab_cards_dir)
        actual_decks = set(card.deck_id for card in cards.values())
        
        assert expected_decks.issubset(actual_decks), \
            f"Missing decks: {expected_decks - actual_decks}"

    def test_deck_sizes(self, vocab_cards_dir):
        """Verify each of the 11 new themed decks has the expected number of cards."""
        cards = load_cards_from_directory(vocab_cards_dir)
        
        # The 11 new themed decks that we created
        new_decks = {
            'travel', 'dining', 'shopping', 'business', 'medical',
            'technology', 'daily_routines', 'hobbies', 'education',
            'sports', 'food'
        }
        
        # Count cards per deck
        deck_counts = {}
        for card in cards.values():
            deck_counts[card.deck_id] = deck_counts.get(card.deck_id, 0) + 1
        
        # Verify the new themed decks have at least 40 cards each
        for deck_id in new_decks:
            count = deck_counts.get(deck_id, 0)
            assert count >= 40, f"Deck '{deck_id}' has only {count} cards (expected at least 40)"


class TestCardQuality:
    """Test suite for verifying card quality standards."""

    def test_all_cards_have_deck_id(self, vocab_cards_dir):
        """Verify all cards have a deck_id."""
        cards = load_cards_from_directory(vocab_cards_dir)
        
        for card_key, card in cards.items():
            assert card.deck_id and card.deck_id.strip(), \
                f"Card {card_key} has empty or missing deck_id"

    def test_all_cards_have_card_id(self, vocab_cards_dir):
        """Verify all cards have a card_id."""
        cards = load_cards_from_directory(vocab_cards_dir)
        
        for card_key, card in cards.items():
            assert card.card_id and card.card_id.strip(), \
                f"Card {card_key} has empty or missing card_id"

    def test_all_cards_have_difficulty(self, vocab_cards_dir):
        """Verify all cards have a valid difficulty level (1-5)."""
        cards = load_cards_from_directory(vocab_cards_dir)
        
        for card_key, card in cards.items():
            assert 1 <= card.difficulty <= 5, \
                f"Card {card_key} has invalid difficulty: {card.difficulty}"

    def test_unique_card_ids_within_decks(self, vocab_cards_dir):
        """Verify card_ids are unique within each deck."""
        cards = load_cards_from_directory(vocab_cards_dir)
        
        # Group by deck
        decks = {}
        for card in cards.values():
            if card.deck_id not in decks:
                decks[card.deck_id] = []
            decks[card.deck_id].append(card)
        
        # Check for duplicates within each deck
        for deck_id, deck_cards in decks.items():
            card_ids = [c.card_id for c in deck_cards]
            assert len(card_ids) == len(set(card_ids)), \
                f"Deck '{deck_id}' has duplicate card_ids"


class TestFileStructure:
    """Test suite for verifying file structure and naming."""

    def test_all_files_are_json(self, vocab_cards_dir):
        """Verify all files in vocabulary_cards directory are JSON files."""
        for file_path in vocab_cards_dir.glob("*"):
            if file_path.is_file():
                assert file_path.suffix == ".json", \
                    f"File {file_path.name} is not a JSON file"

    def test_all_files_are_valid_json(self, vocab_cards_dir):
        """Verify all files contain valid JSON."""
        import json
        
        for file_path in vocab_cards_dir.glob("*.json"):
            with open(file_path, 'r', encoding='utf-8') as f:
                # This will raise json.JSONDecodeError if invalid
                json.load(f)

    def test_all_files_have_utf8_encoding(self, vocab_cards_dir):
        """Verify all files use UTF-8 encoding."""
        for file_path in vocab_cards_dir.glob("*.json"):
            # Try reading as UTF-8
            with open(file_path, 'r', encoding='utf-8') as f:
                f.read()
