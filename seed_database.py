#!/usr/bin/env python3
"""Seed the SQLite database with vocabulary decks and cards from deck_definitions.json.

This script reads card definitions from data/deck_definitions.json and inserts them
into the SQLite database for the vocabulary system.

Each card definition in deck_definitions.json has the format:
[card_id, front, back, example, [tags], difficulty]

Usage:
    python3 seed_database.py

This will:
1. Read deck definitions from data/deck_definitions.json
2. Create deck records in the database
3. Create card records for each deck
4. Preserve any existing data
"""

import json
import asyncio
from pathlib import Path
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import engine, get_db
from models.deck import Deck
from models.card import Card


# Deck metadata for each theme
DECK_METADATA = {
    "travel": {
        "name": "Travel",
        "description": "Vocabulary for travel, transportation, accommodations, and tourism"
    },
    "dining": {
        "name": "Dining",
        "description": "Food, drinks, restaurants, and dining vocabulary"
    },
    "shopping": {
        "name": "Shopping",
        "description": "Clothing, stores, money, and shopping vocabulary"
    },
    "business": {
        "name": "Business",
        "description": "Office, meetings, documents, and business vocabulary"
    },
    "medical": {
        "name": "Medical",
        "description": "Body parts, health, hospitals, and medical vocabulary"
    },
    "technology": {
        "name": "Technology",
        "description": "Computers, devices, internet, and technology vocabulary"
    },
    "daily_routines": {
        "name": "Daily Routines",
        "description": "Morning, day, evening, night routines and activities"
    },
    "hobbies": {
        "name": "Hobbies",
        "description": "Sports, arts, outdoor activities, and leisure vocabulary"
    },
    "education": {
        "name": "Education",
        "description": "School, university, subjects, and learning vocabulary"
    },
    "sports": {
        "name": "Sports",
        "description": "Sports, equipment, actions, and athletic vocabulary"
    },
    "food": {
        "name": "Food",
        "description": "Fruits, vegetables, meats, dairy, prepared foods, and food-related vocabulary"
    }
}


async def get_existing_deck_ids(session: AsyncSession) -> set:
    """Get set of existing deck IDs from the database."""
    result = await session.execute(select(Deck.id))
    return set(result.scalars().all())


async def get_existing_card_ids(session: AsyncSession) -> set:
    """Get set of existing card IDs (deck_id-card_id) from the database."""
    result = await session.execute(select(Card.deck_id, Card.card_id))
    return set((row[0], row[1]) for row in result.all())


async def seed_database():
    """Main function to seed the database with vocabulary decks and cards."""
    # Paths
    definitions_path = Path("data/deck_definitions.json")
    
    if not definitions_path.exists():
        print(f"Error: {definitions_path} not found!")
        return 0, 0
    
    # Load deck definitions
    with open(definitions_path, 'r', encoding='utf-8') as f:
        deck_definitions = json.load(f)
    
    print(f"Loaded {len(deck_definitions)} decks from {definitions_path}")
    print(f"Total cards to process: {sum(len(v) for v in deck_definitions.values())}")
    
    # Create async session
    async with AsyncSession(engine) as session:
        # Check existing data
        existing_deck_ids = await get_existing_deck_ids(session)
        existing_card_identifiers = await get_existing_card_ids(session)
        
        print(f"Found {len(existing_deck_ids)} existing decks in database")
        print(f"Found {len(existing_card_identifiers)} existing cards in database")
        
        # Process each deck
        created_decks = 0
        created_cards = 0
        skipped_cards = 0
        
        for deck_key, cards_data in deck_definitions.items():
            # Get or create deck metadata
            deck_meta = DECK_METADATA.get(deck_key, {
                "name": deck_key.title().replace("_", " "),
                "description": f"Vocabulary for {deck_key}"
            })
            
            # Check if deck already exists with this name
            result = await session.execute(
                select(Deck.id).where(Deck.name == deck_meta["name"])
            )
            deck_id = result.scalar()
            
            if deck_id is None:
                # Create new deck
                new_deck = Deck(
                    name=deck_meta["name"],
                    description=deck_meta["description"]
                )
                session.add(new_deck)
                await session.flush()
                deck_id = new_deck.id
                created_decks += 1
                print(f"Created deck: {deck_meta['name']} (ID: {deck_id})")
            else:
                print(f"Deck exists: {deck_meta['name']} (ID: {deck_id})")
            
            # Process cards for this deck
            for card_def in cards_data:
                # Parse card definition
                # Format: [card_id, front, back, example, [tags], difficulty]
                card_id = str(card_def[0])
                front = card_def[1]
                back = card_def[2]
                example = card_def[3]
                tags = card_def[4]
                difficulty = card_def[5]
                
                # Create tag string (comma-separated)
                tag_string = ",".join(tags) if tags else None
                
                # Check if card already exists
                if (deck_id, card_id) in existing_card_identifiers:
                    skipped_cards += 1
                    continue
                
                # Create new card
                new_card = Card(
                    deck_id=deck_id,
                    card_id=card_id,
                    front=front,
                    back=back,
                    example=example,
                    tags=tag_string,
                    context=f"deck:{deck_key}",
                    difficulty=difficulty,
                    next_review_date=date.today(),
                    interval=1,
                    ease_factor=2.5
                )
                session.add(new_card)
                created_cards += 1
                
            # Commit after each deck for better progress tracking
            await session.commit()
            print(f"  Added {len(cards_data)} cards for {deck_meta['name']}")
        
        await session.commit()
    
    print(f"\n{'='*60}")
    print(f"Database seeding complete!")
    print(f"Created {created_decks} new decks")
    print(f"Created {created_cards} new cards")
    print(f"Skipped {skipped_cards} existing cards")
    print(f"{'='*60}")
    
    return created_decks, created_cards


if __name__ == "__main__":
    asyncio.run(seed_database())
