# SPDD Prompt: Seed Themed Vocabulary Decks

**GitHub Issue**: #51
**Issue Title**: 3.2: Seed themed decks (500+ cards, 10+ decks)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/51
**Artifact ID**: FLC-035-202606152300
**Created**: 2026-06-15 23:00
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-035-202606152247-[Analysis]-issue-51-seed-thematic-decks.md`

---

## Context

### Current Codebase State
The French Language Coach project is in Phase 3 (Vocabulary Builder). Currently:
- There are 5 vocabulary card JSON files in `data/vocabulary_cards/`
- The vocabulary card schema is defined in `schemas/vocabulary_card.py` with Pydantic validation
- A validation script exists at `scripts/validate_vocabulary_cards.py`
- Cards are stored as individual JSON files (one file per card)

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `schemas/vocabulary_card.py` | Pydantic model for card validation | VocabularyCard class, load_card_from_file(), validate_card_data() |
| `data/vocabulary_cards/` | Current card storage directory | Contains 5 existing cards |
| `scripts/validate_vocabulary_cards.py` | Validation utility | Validates all cards in directory |
| `tests/test_vocabulary_card_schema.py` | Schema validation tests | Tests for VocabularyCard model |

### Existing Patterns
- Each card is a separate JSON file in `data/vocabulary_cards/`
- Files are named with descriptive names (e.g., `basic_greetings.json`, `food_vocabulary.json`)
- Each JSON file contains a single card object matching the VocabularyCard schema
- Cards use deck_id to group them into thematic collections
- Difficulty levels range from 1 (beginner) to 5 (advanced)

---

## Goal

**Primary Objective**: Create 500+ vocabulary cards organized into 10+ themed decks for the French Language Coach vocabulary builder feature.

**Secondary Objectives**:
- Ensure all cards pass schema validation
- Include required fields: deck_id, card_id, front, back, example
- Include optional fields: tags, context, difficulty
- Use meaningful tags for filtering and organization
- Set appropriate difficulty levels (1-4 for intermediate learners)
- Create comprehensive vocabulary coverage for each theme

---

## Constraints

### Architecture Constraints
- Must follow existing file-based storage pattern (one JSON file per card)
- Must use existing VocabularyCard schema from `schemas/vocabulary_card.py`
- Must store files in `data/vocabulary_cards/` directory
- Must use UTF-8 encoding for all files

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must include docstrings for any new Python scripts
- Must maintain consistency with existing codebase patterns

### Testing Constraints
- Must create tests to verify all acceptance criteria
- Must validate all cards against the schema
- Must verify minimum deck and card counts
- Must achieve 80% test coverage for new test files

### Acceptance Criteria
From GitHub issue #51:
- [ ] 10+ themed decks
- [ ] 500+ total cards
- [ ] All cards have front, back, example
- [ ] All cards pass schema validation

---

## Examples

### Input/Output Examples

1. **Example Card Structure**:
   - Input: JSON file content
   ```json
   {
     "deck_id": "travel",
     "card_id": "passport",
     "front": "passeport",
     "back": "passport",
     "example": "J'ai oublié mon passeport à la maison.",
     "tags": ["travel", "document", "beginner"],
     "context": "lesson:travel-basics",
     "difficulty": 1
   }
   ```
   - Expected Output: Validates successfully against VocabularyCard schema

2. **Example Deck Organization**:
   - 10 decks: travel, dining, shopping, business, medical, technology, daily-routines, hobbies, education, sports, food
   - Each deck: 50 cards
   - Total: 500+ cards

3. **Example Tags**:
   - travel: ["travel", "transportation", "accommodation", "directions"]
   - dining: ["food", "restaurant", "ordering", " menu"]
   - business: ["work", "office", "meeting", "professional"]

### Edge Cases
- Special French characters (é, è, ê, ç, à, ù) must be handled correctly in JSON
- Long phrases should be kept under 100 characters for front field
- Example sentences should be complete, grammatically correct French
- Card IDs should be URL-safe (alphanumeric, hyphens, underscores only)

### Test Cases
```python
# Test for deck count
def test_deck_count():
    # Given: vocabulary_cards directory with cards
    # When: counting unique deck_ids
    # Then: at least 10 unique decks exist
    cards = load_cards_from_directory('data/vocabulary_cards')
    deck_ids = set(card.deck_id for card in cards.values())
    assert len(deck_ids) >= 10

# Test for card count
def test_card_count():
    # Given: vocabulary_cards directory with cards
    # When: counting all cards
    # Then: at least 500 cards exist
    cards = load_cards_from_directory('data/vocabulary_cards')
    assert len(cards) >= 500

# Test for required fields
def test_required_fields():
    # Given: any card in any deck
    # When: checking fields
    # Then: front, back, example are populated
    cards = load_cards_from_directory('data/vocabulary_cards')
    for card in cards.values():
        assert card.front and card.front.strip()
        assert card.back and card.back.strip()
        assert card.example and card.example.strip()

# Test for schema validation
def test_schema_validation():
    # Given: all cards in directory
    # When: validating against schema
    # Then: all cards pass validation
    cards = load_cards_from_directory('data/vocabulary_cards')
    # load_cards_from_directory already validates, so this will pass
    assert len(cards) > 0
```

---

## Deliverables

### Code Changes
- [ ] 495+ new JSON card files in `data/vocabulary_cards/` (to reach 500+ total)
- [ ] Organized into 10+ themed decks via deck_id field
- [ ] All cards following VocabularyCard schema

### Tests
- [ ] Test for minimum deck count (10+)
- [ ] Test for minimum card count (500+)
- [ ] Test for required fields on all cards
- [ ] Test for schema validation of all cards
- [ ] 80%+ test coverage for new test files

### Documentation
- [ ] Update README.md if the vocabulary card structure changes
- [ ] Add docstrings to any new utility functions
- [ ] Document deck themes and structure

---

## Actual Prompt

```
You are Mistral Vibe, working on GitHub issue #51 for the French Language Coach project.

CONTEXT:
- This is a Phase 3 (Vocabulary Builder) task to create pre-built themed vocabulary decks
- Current state: 5 cards exist in data/vocabulary_cards/
- Target state: 500+ cards across 10+ themed decks
- Schema: VocabularyCard in schemas/vocabulary_card.py defines required fields
- Storage: One JSON file per card in data/vocabulary_cards/ directory
- Validation: Use existing load_cards_from_directory() function

GOAL:
Create 495+ new vocabulary card JSON files organized into themed decks.

THEMES TO COVER (10+ decks):
1. Travel (50 cards)
2. Dining/Restaurant (50 cards)
3. Shopping (50 cards)
4. Business (50 cards)
5. Medical (50 cards)
6. Technology (50 cards)
7. Daily Routines (50 cards)
8. Hobbies (50 cards)
9. Education (50 cards)
10. Sports (50 cards)
11. Food (50 cards) - to exceed minimum requirements

Total: 550 cards across 11 decks

REQUIREMENTS FOR EACH CARD:
- Required fields: deck_id, card_id, front (French), back (English), example (French sentence), difficulty (1-5)
- Optional fields: tags (array of strings), context (string)
- deck_id: theme name (e.g., "travel", "dining", "shopping")
- card_id: unique identifier within deck (e.g., "passport", "menu", "receipt")
- front: French word or phrase (non-empty, meaningful)
- back: English translation (non-empty, accurate)
- example: French sentence using the word in context (non-empty, grammatically correct)
- difficulty: 1-5 (1=beginner, 3=intermediate, 5=advanced)
- tags: meaningful category labels for filtering

DECK SPECIFIC VOCABULARY GUIDELINES:

Travel deck (50 cards):
- Transportation: airplane, train, bus, taxi, subway, ticket, schedule, departure, arrival
- Accommodation: hotel, room, reservation, check-in, check-out, key, reception
- Directions: left, right, straight, map, address, street, avenue, boulevard
- Travel documents: passport, visa, ID, boarding pass, luggage, suitcase
- Places: airport, station, tourist office, museum, monument, beach
- Actions: travel, visit, explore, book, reserve, cancel

Dining/Restaurant deck (50 cards):
- Food items: appetizer, main course, dessert, salad, soup, bread, cheese
- Drinks: water, wine, beer, coffee, tea, juice, soda
- Restaurant terms: menu, waiter, waitress, table, chair, reservation, bill
- Ordering: order, serve, recommend, special, today's special, vegetarian
- Actions: eat, drink, taste, order, pay, tip
- Questions: "What do you recommend?", "Is this spicy?", "Can I have the bill?"

Shopping deck (50 cards):
- Stores: mall, supermarket, bakery, butcher, pharmacy, clothing store
- Products: clothes, shoes, hat, shirt, pants, dress, coat
- Actions: buy, sell, try on, fit, size, color, price, discount
- Money: cash, credit card, debit card, change, receipt, total
- Shopping terms: open, closed, sale, offer, bargain, refund

Business deck (50 cards):
- Office: desk, computer, phone, meeting room, conference, colleague
- Meetings: meeting, agenda, minutes, presentation, slide, projector
- Documents: contract, invoice, receipt, report, proposal, email
- Actions: work, call, write, send, receive, sign, negotiate
- Time: deadline, schedule, appointment, urgent, important
- Job titles: manager, director, employee, client, customer, supplier

Medical deck (50 cards):
- Body parts: head, arm, leg, hand, foot, stomach, back, chest
- Symptoms: pain, fever, headache, cough, nausea, dizziness, allergy
- Medical terms: doctor, nurse, hospital, clinic, pharmacy, medicine
- Actions: examine, diagnose, prescribe, treat, heal, hurt
- Emergency: emergency, ambulance, first aid, accident, injury
- Health: health, sick, illness, disease, prevention, treatment

Technology deck (50 cards):
- Devices: computer, laptop, tablet, smartphone, camera, printer
- Software: program, application, software, update, install, download
- Internet: internet, website, email, chat, social media, online
- Actions: use, turn on, turn off, connect, disconnect, charge
- Problems: problem, error, bug, crash, virus, repair
- Technical terms: password, username, account, profile, setting, network

Daily Routines deck (50 cards):
- Morning: wake up, get up, breakfast, shower, brush teeth, get dressed
- Day: work, lunch, break, nap, errands, appointments
- Evening: dinner, relax, watch TV, read, cook, clean
- Night: go to bed, sleep, dream, alarm clock
- Time: morning, afternoon, evening, night, today, tomorrow, yesterday
- Frequency: always, often, sometimes, rarely, never, every day

Hobbies deck (50 cards):
- Creative: paint, draw, write, photograph, craft, music
- Sports: play, game, competition, win, lose, team
- Reading: read, book, novel, magazine, newspaper, library
- Music: sing, play instrument, concert, song, melody, rhythm
- Outdoor: garden, hike, camp, fish, swim, bike
- Indoor: cook, bake, knit, sew, collect, puzzle

Education deck (50 cards):
- School: school, university, college, class, classroom, student
- Subjects: math, science, history, geography, language, art
- Actions: learn, study, teach, read, write, research, memorize
- Materials: book, notebook, pen, pencil, paper, computer
- Tests: exam, test, quiz, grade, score, pass, fail
- Degrees: degree, diploma, certificate, graduate, bachelor, master

Sports deck (50 cards):
- Sports: soccer, basketball, tennis, swimming, running, cycling
- Equipment: ball, racket, bat, glove, net, goal, field
- Actions: play, score, win, lose, compete, train, practice
- Places: stadium, gym, pool, court, field, track
- People: player, coach, referee, team, opponent, fan
- Terms: game, match, tournament, championship, medal, record

Food deck (50 cards):
- Fruits: apple, banana, orange, grape, strawberry, pear, peach
- Vegetables: carrot, potato, tomato, onion, lettuce, cucumber
- Meats: chicken, beef, pork, fish, shrimp, lamb
- Dairy: milk, cheese, butter, yogurt, cream
- Grains: bread, rice, pasta, cereal, flour
- Prepared: salad, soup, sandwich, pizza, cake, dessert
- Verbs: cook, bake, fry, boil, grill, peel, cut
- Adjectives: fresh, ripe, raw, cooked, spicy, sweet, sour

CONSTRAINTS:
- Follow existing schema: deck_id, card_id, front, back, example are required
- Use UTF-8 encoding for all JSON files
- Keep filenames URL-safe (alphanumeric, hyphens, underscores)
- Use consistent naming: deck-theme-cardname.json (e.g., travel-passport.json)
- Set difficulty appropriately: 1-2 for basic words, 3 for intermediate, 4-5 for advanced
- Include meaningful tags for each card (2-4 tags typical)
- Ensure all example sentences are grammatically correct French
- Validate all cards using load_cards_from_directory() from schemas/vocabulary_card.py

EXAMPLES:

Travel deck card example:
Filename: travel-passport.json
```json
{
  "deck_id": "travel",
  "card_id": "passport",
  "front": "passeport",
  "back": "passport",
  "example": "J'ai oublié mon passeport à la maison.",
  "tags": ["travel", "document", "beginner"],
  "context": "lesson:travel-basics",
  "difficulty": 1
}
```

Dining deck card example:
Filename: dining-menu.json
```json
{
  "deck_id": "dining",
  "card_id": "menu",
  "front": "menu",
  "back": "menu",
  "example": "Peux-tu me montrer le menu, s'il te plaît?",
  "tags": ["dining", "restaurant", "food", "beginner"],
  "context": "lesson:dining-out",
  "difficulty": 1
}
```

ACCEPTANCE CRITERIA:
1. 10+ themed decks (will create 11)
2. 500+ total cards (will create 550)
3. All cards have front, back, example fields populated
4. All cards pass schema validation via load_cards_from_directory()

DELIVERABLES:
1. Create all card JSON files in data/vocabulary_cards/
2. Create test file to verify acceptance criteria
3. Ensure all cards validate against schema
4. Update README.md if vocabulary structure changes

EXECUTION PLAN:
1. Create cards for each theme (50 cards × 11 decks = 550 cards)
2. Save each as individual JSON file with proper naming
3. Run validation script to verify all cards
4. Create pytest tests for acceptance criteria
5. Verify all tests pass
```

---

## AI Response

Implementation completed successfully. Created seed_all_decks.py script that reads from deck_definitions.json and generates 548 individual vocabulary card JSON files across 11 themed decks. Combined with 5 existing cards, the total is 553 cards across 13 decks (11 new + 2 existing).

### Implementation Details:
- Created `data/deck_definitions.json` with 548 card definitions across 11 decks
- Updated `seed_all_decks.py` to read from deck_definitions.json and generate individual card files
- Each deck has 46-52 cards with varied difficulty levels (1-2 for most cards)
- All cards include: deck_id, card_id, front (French), back (English), example (French sentence), tags, context, difficulty
- Preserved original 5 cards (basic_greetings, bread, coffee, food_vocabulary, goodbye)

### Files Modified/Created:
- `data/deck_definitions.json` - New file with all card definitions
- `seed_all_decks.py` - Updated to use deck_definitions.json
- `data/vocabulary_cards/*.json` - 548 new card files generated
- `tests/test_issue_51_thematic_decks.py` - New test suite with 13 tests

---

## Human Review Notes

### Changes Made
- [x] Created deck_definitions.json with comprehensive vocabulary data
- [x] Updated seed_all_decks.py to read from deck_definitions.json
- [x] Fixed duplicate card_id issues in several decks
- [x] Added additional cards to reach 500+ total
- [x] Preserved original 5 card files

### Quality Checks
- [x] All 553+ cards created (548 new + 5 existing)
- [x] All cards pass schema validation (verified via load_cards_from_directory)
- [x] All acceptance criteria verified (13 decks >= 10, 553 cards >= 500)
- [x] Tests pass with 80%+ coverage (13/13 tests pass)
- [x] All cards have required fields (front, back, example)
- [x] All cards have valid difficulty levels (1-5)

### Issues Found and Resolved
- [x] Original seed_all_decks.py had hardcoded, minimal card data - Replaced with deck_definitions.json approach
- [x] Duplicate card_ids found in dining, hobbies, education, sports decks - Fixed by renaming duplicates
- [x] Shopping deck had only 49 cards - Added 1 more card to reach 50
- [x] Some decks had fewer than 50 cards - Added cards to bring all decks to 46-52 cards

---

## Verification

- [x] All acceptance criteria from issue #51 are met
- [x] 13 themed decks exist (11 new + 2 existing, need 10+)
- [x] 553 total cards exist (548 new + 5 existing, need 500+)
- [x] All cards have front, back, example fields
- [x] All cards pass schema validation
- [x] Tests pass with 80%+ coverage
- [x] Code follows project conventions
- [ ] Documentation is updated (README.md update may be needed)
- [x] No breaking changes introduced
- [ ] Human review completed (pending human review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
