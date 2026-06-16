#!/usr/bin/env python3
"""Seed all vocabulary decks from deck_definitions.json.

This is the main script for GitHub issue #51: Seed themed decks (500+ cards, 10+ decks).

The script reads card definitions from data/deck_definitions.json and creates individual
vocabulary card JSON files in data/vocabulary_cards/ directory following the
VocabularyCard schema.

Each card definition in deck_definitions.json has the format:
[card_id, front, back, example, [tags], difficulty]

Usage:
    python3 seed_all_decks.py

This will:
1. Read deck definitions from data/deck_definitions.json
2. Generate individual JSON files for each card in data/vocabulary_cards/
3. Preserve any existing cards that don't conflict
4. Validate all generated cards against the VocabularyCard schema
"""

import json
from pathlib import Path

from schemas.vocabulary_card import load_cards_from_directory, validate_card_data


def create_card(deck_id, card_id, front, back, example, tags=None, difficulty=1, context=None):
    """Create a card dictionary matching the VocabularyCard schema."""
    return {
        "deck_id": deck_id,
        "card_id": card_id,
        "front": front,
        "back": back,
        "example": example,
        "tags": tags or [],
        "context": context or f"deck:{deck_id}",
        "difficulty": difficulty
    }


def write_card(card, output_dir):
    """Write a card to a JSON file."""
    filename = f"{card['deck_id']}-{card['card_id']}.json"
    filepath = output_dir / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(card, f, ensure_ascii=False, indent=2)
    return filepath


def seed_decks():
    """Main function to seed all vocabulary decks from deck_definitions.json."""
    # Paths
    definitions_path = Path("data/deck_definitions.json")
    output_dir = Path("data/vocabulary_cards")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load deck definitions
    with open(definitions_path, 'r', encoding='utf-8') as f:
        deck_definitions = json.load(f)
    
    # Count existing cards to preserve
    existing = list(output_dir.glob("*.json"))
    print(f"Preserving {len(existing)} existing cards")
    
    # Generate cards for each deck
    total_created = 0
    
    for deck_id, cards_data in deck_definitions.items():
        print(f"Processing deck: {deck_id} ({len(cards_data)} cards)")
        
        for card_def in cards_data:
            # Parse card definition
            # Format: [card_id, front, back, example, [tags], difficulty]
            card_id = card_def[0]
            front = card_def[1]
            back = card_def[2]
            example = card_def[3]
            tags = card_def[4]
            difficulty = card_def[5]
            
            # Create card dictionary matching VocabularyCard schema
            card = create_card(
                deck_id=deck_id,
                card_id=card_id,
                front=front,
                back=back,
                example=example,
                tags=tags,
                difficulty=difficulty,
                context=f"deck:{deck_id}"
            )
            
            # Validate the card data against schema
            validated_card = validate_card_data(card)
            
            # Write card to file
            filepath = write_card(validated_card.model_dump(), output_dir)
            total_created += 1
    
    # Count final results
    all_files = list(output_dir.glob("*.json"))
    total = len(all_files)
    
    print(f"\n{'='*60}")
    print(f"Seeding complete!")
    print(f"Total cards: {total} ({total_created} new + {len(existing)} existing)")
    
    # Count decks
    deck_ids = set()
    for filepath in all_files:
        with open(filepath, 'r', encoding='utf-8') as f:
            card = json.load(f)
            deck_ids.add(card['deck_id'])
    
    print(f"Unique decks: {len(deck_ids)}")
    print(f"Decks: {sorted(deck_ids)}")
    
    # Validate all cards in the directory
    print(f"\nValidating all cards...")
    try:
        all_cards = load_cards_from_directory(output_dir)
        print(f"All {len(all_cards)} cards validated successfully!")
    except Exception as e:
        print(f"Validation error: {e}")
        raise
    
    # Verify acceptance criteria
    print(f"\n{'='*60}")
    print(f"Acceptance Criteria Check:")
    deck_count = len(deck_ids)
    card_count = len(all_cards)
    print(f"  Decks: {deck_count} (need 10+) {'✓ PASS' if deck_count >= 10 else '✗ FAIL'}")
    print(f"  Cards: {card_count} (need 500+) {'✓ PASS' if card_count >= 500 else '✗ FAIL'}")
    
    return total, len(deck_ids)


if __name__ == "__main__":
    total_cards, total_decks = seed_decks()
