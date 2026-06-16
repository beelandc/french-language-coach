# SPDD Analysis: Seed Themed Vocabulary Decks

**GitHub Issue**: #51
**Issue Title**: 3.2: Seed themed decks (500+ cards, 10+ decks)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/51
**Artifact ID**: FLC-035-202606152247
**Created**: 2026-06-15 22:47
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Create pre-built vocabulary decks for the French Language Coach vocabulary builder feature.

### Decks to create
- Travel
- Dining/Restaurant
- Shopping
- Business
- Medical
- Technology
- Daily Routines
- Hobbies
- Education
- Sports
- Food

### Acceptance Criteria
- [ ] 10+ themed decks
- [ ] 500+ total cards
- [ ] All cards have front, back, example
- [ ] All cards pass schema validation

---

## Background

This task is part of Phase 3 (Vocabulary Builder) of the French Language Coach project. The vocabulary builder pillar requires pre-built themed decks to provide users with ready-to-use vocabulary sets for common learning scenarios. Currently, there are only 5 vocabulary card files in `data/vocabulary_cards/` directory, which is insufficient for a comprehensive vocabulary learning experience.

The themed decks will serve as the foundation for:
- Spaced-repetition flashcard practice
- Contextual vocabulary learning
- Category-based filtering and browsing
- Personalized study plans

---

## Business Value

- **Enhanced Learning Experience**: Users can immediately start practicing vocabulary in relevant themes without needing to create their own decks first
- **Comprehensive Coverage**: 10+ thematic areas cover common real-world situations for French learners
- **Quality Assurance**: All cards must pass schema validation ensuring data consistency
- **Scalable Foundation**: Establishes a solid base that can be extended with user-created decks
- **Alignment with VISION**: Directly supports the "Themed Decks" requirement in Phase 3 (Vocabulary Builder)

---

## Scope In

- [ ] Create JSON files for 10+ themed vocabulary decks
- [ ] Ensure each deck contains 40-60 cards (to reach 500+ total)
- [ ] Each card must have: deck_id, card_id, front (French), back (English), example (French sentence)
- [ ] Optional fields: tags, context, difficulty (1-5)
- [ ] All cards must validate against the VocabularyCard schema in `schemas/vocabulary_card.py`
- [ ] Cards should cover practical, real-world vocabulary relevant to each theme
- [ ] Cards should include varied difficulty levels (beginner to intermediate)
- [ ] Create a script to validate all created cards

## Scope Out

- [ ] User interface for browsing/using decks (future task)
- [ ] API endpoints for deck management (future task)
- [ ] Spaced repetition algorithm implementation (future task)
- [ ] Custom deck creation by users (future task)
- [ ] Audio pronunciations for cards (future task)
- [ ] Image associations for cards (future task)
- [ ] Database seeding scripts (future task - cards are file-based for now)

---

## Acceptance Criteria (ACs)

1. **AC-01: Minimum Deck Count**
   **Given** the vocabulary_cards directory
   **When** counting unique deck_ids
   **Then** there are at least 10 different themed decks

2. **AC-02: Minimum Card Count**
   **Given** all JSON files in vocabulary_cards directory
   **When** counting all cards
   **Then** there are at least 500 total cards

3. **AC-03: Required Fields Present**
   **Given** any card in any deck
   **When** examining its fields
   **Then** it has front, back, and example fields populated

4. **AC-04: Schema Validation**
   **Given** all cards in all decks
   **When** validated against VocabularyCard schema
   **Then** all cards pass validation without errors

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **VocabularyCard Schema** (`schemas/vocabulary_card.py`): Pydantic model defining the structure of vocabulary cards with required fields (deck_id, card_id, front, back, difficulty) and optional fields (example, tags, context)
- **Vocabulary Card Directory** (`data/vocabulary_cards/`): Current storage location for vocabulary card JSON files, one file per card
- **Validation Script** (`scripts/validate_vocabulary_cards.py`): Existing script for validating vocabulary cards against the schema

### New Concepts Required

- **Themed Deck**: A collection of vocabulary cards organized around a specific topic or use case (e.g., Travel, Dining, Business)
- **Deck Coverage**: Ensuring each deck has sufficient breadth and depth of vocabulary for its theme
- **Quality Standards**: Establishing criteria for good vocabulary cards (accurate translations, good examples, appropriate difficulty)

### Key Business Rules

- **Rule 1**: Every card must have a unique card_id within its deck
- **Rule 2**: Every card must have non-empty front, back, and example fields
- **Rule 3**: Difficulty must be between 1 and 5 (inclusive)
- **Rule 4**: Tags must be non-empty strings if present
- **Rule 5**: deck_id and card_id must contain only alphanumeric characters, hyphens, and underscores

---

## Strategic Approach

### Solution Direction

1. **Research and Planning**: For each theme, identify the most useful and common vocabulary words/phrases
2. **Card Creation**: Create JSON files for each card following the existing schema
3. **Organization**: Organize cards into deck directories or use deck_id prefix for filtering
4. **Validation**: Use existing validation utilities to ensure all cards pass schema validation
5. **Testing**: Create tests to verify acceptance criteria are met

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **File organization** | One file per card vs. one file per deck | One file per card (current pattern) - easier to manage and validate individually |
| **Deck size** | Fewer cards per deck (20-30) vs. more cards (50-60) | 50 cards per deck - balances comprehensiveness with manageability |
| **Difficulty distribution** | Uniform difficulty vs. varied | Varied (1-4) - provides progression within each deck |
| **Example sentences** | Simple vs. complex | Simple but context-rich - appropriate for intermediate learners |

### Alternatives Considered

- **Alternative 1**: One JSON file per deck containing an array of cards - Rejected because it would require schema changes and doesn't match existing pattern
- **Alternative 2**: Store cards in a database - Rejected because the current architecture uses file-based storage for content
- **Alternative 3**: Use CSV or YAML instead of JSON - Rejected because existing infrastructure expects JSON

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Deck count | "10+ themed decks" - is 10 the minimum or target? | Treat as minimum, aim for exactly 10 to match the listed themes |
| Card count | "500+ total cards" - is this exact or minimum? | Treat as minimum, create 500 cards (50 per deck × 10 decks) |
| Example requirement | "All cards have front, back, example" - is example mandatory? | Yes, based on acceptance criteria, example is required |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Duplicate card_ids | Would cause conflicts in the system | Use unique card_ids within each deck, validate for duplicates |
| Special characters in French | Accents and special characters are common in French | Ensure JSON files use UTF-8 encoding |
| Very long words/phrases | Could affect display in UI | Keep front text under 100 characters where possible |
| Missing fields | Would cause validation failures | All required fields must be present in every card |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Schema changes during implementation | Could invalidate created cards | Validate against current schema before finalizing |
| Manual creation errors | Typos, inconsistencies in 500+ cards | Use scripts to validate and create automated tests |
| File naming conflicts | Could overwrite existing cards | Use systematic naming convention (deck-theme-cardname.json) |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-01 | 10+ themed decks | Yes | Will create exactly 11 decks (10 listed + 1 bonus) |
| AC-02 | 500+ total cards | Yes | Will create 550 cards (50 per deck × 11 decks) |
| AC-03 | All cards have front, back, example | Yes | Will ensure all cards include these fields |
| AC-04 | All cards pass schema validation | Yes | Will use existing validation utilities |

**AC Coverage Summary**: 4 of 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Cards should be useful and accurate (French-English translations)
- Examples should be grammatically correct French sentences
- Tags should be meaningful for filtering
- Difficulty levels should be appropriate for intermediate learners (B1-B2)

---

## REASONS Canvas

### Requirements
From GitHub issue #51 acceptance criteria:
- 10+ themed decks
- 500+ total cards
- All cards have front, back, example
- All cards pass schema validation

### Examples
- A Travel deck card: front="passeport", back="passport", example="J'ai oublié mon passeport à la maison."
- A Dining deck card: front="l'addition", back="the bill", example="Peut-on avoir l'addition, s'il vous plaît?"
- A Business deck card: front="réunion", back="meeting", example="Nous avons une réunion à 14h."

### Architecture
- File-based storage in `data/vocabulary_cards/` directory
- One JSON file per card (existing pattern)
- Validation via Pydantic schema in `schemas/vocabulary_card.py`
- Existing validation script at `scripts/validate_vocabulary_cards.py`
- Deck organization via deck_id field (not filesystem directories)

### Standards
- PEP 8 for any Python code
- UTF-8 encoding for all files
- JSON format for card files
- Consistent naming convention: deck-theme-cardname.json
- Difficulty levels 1-5 (1=beginner, 5=advanced)
- 80% test coverage required for any new test files

### Omissions
- User interface for deck browsing (future Phase 3 task)
- API endpoints for deck access (future Phase 3 task)
- Spaced repetition algorithm (future Phase 3 task)
- User-created custom decks (future Phase 3 task)
- Audio support for cards (future enhancement)
- Image support for cards (future enhancement)

### Notes
- Current directory has 5 cards - need to add ~495 more
- The 10 themes listed in the issue are: Travel, Dining/Restaurant, Shopping, Business, Medical, Technology, Daily Routines, Hobbies, Education, Sports, Food
- The existing cards include: basic_greetings, bread, coffee, food_vocabulary, goodbye
- Should reuse existing cards where they fit into the new deck structure
- Consider adding a "Food & Drink" deck that incorporates existing food-related cards
- Use existing `load_cards_from_directory` and `validate_card_data` functions for validation

### Solutions
- Reference implementation: Existing cards in `data/vocabulary_cards/` (basic_greetings.json, food_vocabulary.json, etc.)
- Pattern to follow: Each card is a separate JSON file with complete schema
- Validation pattern: Use `schemas/vocabulary_card.py:load_cards_from_directory()`
- Testing pattern: See `tests/test_vocabulary_card_schema.py` for validation test examples

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
