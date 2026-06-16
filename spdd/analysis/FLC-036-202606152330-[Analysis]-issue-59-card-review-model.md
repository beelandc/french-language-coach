# SPDD Analysis: Card Review Model and Review Endpoint

**GitHub Issue**: #59
**Issue Title**: 3.6+3.7: Create card review model and review endpoint
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/59
**Artifact ID**: FLC-036-202606152330
**Created**: 2026-06-15 23:30
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

From GitHub Issue #59:

> Track spaced repetition state for each card.
>
> ## Model: CardReview
> - user_id (nullable)
> - card_id
> - ease_factor (float, default 2.5)
> - interval (int, days)
> - due_date (datetime)
> - reps (int)
> - lapses (int)
>
> ## Endpoint
> - POST /vocabulary/review/ with card_id and rating (0-3)
> - Returns next due date
>
> ## Acceptance Criteria
> - [ ] Model with all fields
> - [ ] Review endpoint updates state
> - [ ] Returns next due date
> - [ ] Handles new cards (first review)

---

## Background

The French Language Coach project uses a spaced repetition system (SM-2 algorithm) to help users learn vocabulary efficiently. Currently, the Card model stores spaced repetition state directly (interval, ease_factor, next_review_date). Issue #59 requests a separate CardReview model to track review history and state separately from the card content itself.

This separation allows:
- Tracking historical review data for analytics
- Multiple review sessions per card
- Better separation of concerns (card content vs. review state)
- Support for multiple users reviewing the same cards (in future with authentication)

---

## Business Value

- **Improved Analytics**: Track user progress and identify difficult cards
- **Flexibility**: Support multiple users reviewing the same vocabulary decks
- **Data Integrity**: Separate card content from user-specific review data
- **Spaced Repetition**: Implement proper SM-2 or FSRS algorithm tracking

---

## Scope In

- [ ] Create CardReview SQLAlchemy model with specified fields
- [ ] Create Pydantic schemas for CardReview (create, response)
- [ ] Update existing vocabulary router or create new endpoint
- [ ] POST /vocabulary/review/ endpoint accepting card_id and rating (0-3)
- [ ] Implement state update logic using spaced repetition algorithm
- [ ] Return next due date in response
- [ ] Handle first review for new cards (initialize state)
- [ ] Create factory for CardReview testing
- [ ] Write unit tests for CardReview model
- [ ] Write integration tests for review endpoint
- [ ] Update models/__init__.py to export CardReview
- [ ] Update README.md if new endpoint patterns are introduced

## Scope Out

- [ ] User authentication (user_id is nullable, matches existing pattern)
- [ ] Review history API (GET /vocabulary/reviews/)
- [ ] Analytics endpoints based on review data
- [ ] Migration from existing Card.spaced repetition fields
- [ ] FSRS algorithm implementation (use existing SM-2 or similar)
- [ ] Frontend UI for review submission
- [ ] Batch review operations

---

## Acceptance Criteria (ACs)

1. **AC1: Model with all fields**
   **Given** the CardReview model is defined
   **When** a CardReview instance is created
   **Then** it contains all required fields: user_id, card_id, ease_factor, interval, due_date, reps, lapses

2. **AC2: Review endpoint updates state**
   **Given** a card exists
   **When** POST /vocabulary/review/ is called with card_id and rating
   **Then** the card's review state is updated according to the rating

3. **AC3: Returns next due date**
   **Given** a review submission
   **When** the endpoint returns a response
   **Then** the response includes the next due date for the card

4. **AC4: Handles new cards (first review)**
   **Given** a card with no prior reviews
   **When** POST /vocabulary/review/ is called for the first time
   **Then** the system initializes the spaced repetition state appropriately

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Card Model** (`models/card.py`): 
  - Currently stores spaced repetition fields: interval, ease_factor, next_review_date
  - Has relationship to Deck model
  - Used for vocabulary flashcards

- **Deck Model** (`models/deck.py`): 
  - Container for cards
  - Has name, description, created_at, updated_at

- **Vocabulary Router** (`routers/vocabulary.py`): 
  - Already has POST /vocabulary/review/ endpoint
  - Uses SM-2 algorithm (calculate_sm2 function)
  - Currently updates Card model directly
  - Accepts ease rating 1-4 (Again, Hard, Good, Easy)

- **SM-2 Algorithm** (`routers/vocabulary.py:48-88`): 
  - Implements Anki's spaced repetition algorithm
  - Adjusts interval and ease_factor based on user rating
  - Handles ease ratings 1-4

- **ReviewSubmit Schema** (`schemas/vocabulary.py:155-190`): 
  - Current schema for review submission
  - Uses ease (1-4) not rating (0-3)

- **Factory Pattern** (`tests/factories.py`): 
  - Uses factory-boy for test fixtures
  - Currently has SessionFactory and LessonProgressFactory

### New Concepts Required

- **CardReview Model**: 
  - Separate model to track review state and history
  - Fields: user_id (nullable), card_id, ease_factor, interval, due_date, reps, lapses
  - Relationship: belongs to a Card, optionally to a User (future)

- **Review Rating (0-3)**: 
  - 0 = Fail/Again (card was forgotten)
  - 1 = Hard (recalled with difficulty)
  - 2 = Good (recalled correctly)
  - 3 = Easy (recalled easily)
  - Note: This differs from current ease 1-4 scale

- **Reps and Lapses**: 
  - reps: Number of consecutive successful reviews
  - lapses: Number of times the card was failed (rating=0)

### Key Business Rules

- **Rating Scale**: 0-3 (Fail, Hard, Good, Easy) - different from current 1-4 (Again, Hard, Good, Easy)
- **Default Values**: ease_factor=2.5, interval=1 (for first review)
- **Due Date Calculation**: today + interval days
- **State Updates**: Based on spaced repetition algorithm (SM-2 or similar)
- **Nullability**: user_id is nullable (Phase 1.5 has no authentication)

---

## Strategic Approach

### Solution Direction

1. **Create CardReview Model**
   - Define SQLAlchemy model in `models/card_review.py`
   - Include all specified fields with appropriate types
   - Set default values (ease_factor=2.5, interval=1)
   - Add relationships to Card model

2. **Create Pydantic Schemas**
   - CardReviewCreate schema for POST requests
   - CardReviewResponse schema for API responses
   - Update schemas/vocabulary.py or create new schemas/card_review.py

3. **Update or Create Endpoint**
   - Note: POST /vocabulary/review/ already exists
   - Decision needed: Modify existing endpoint or create new one?
   - Existing endpoint uses ease 1-4, issue wants rating 0-3
   - Options:
     a) Modify existing endpoint to accept rating 0-3 (breaking change)
     b) Create new endpoint (e.g., POST /vocabulary/review-v2/)
     c) Add versioning to existing endpoint
   - **Recommendation**: Create new endpoint to avoid breaking existing clients

4. **Implement Review Logic**
   - Map rating 0-3 to algorithm inputs
   - Initialize state for first review
   - Update state using spaced repetition algorithm
   - Calculate next due date

5. **Create Tests**
   - Unit tests for CardReview model
   - Integration tests for new endpoint
   - Test edge cases (first review, invalid inputs, etc.)

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Rating scale (0-3 vs 1-4) | Issue specifies 0-3, existing uses 1-4. Mapping needed or new endpoint | Create new endpoint with rating 0-3 to match issue requirements |
| Separate model vs Card fields | Current Card has SR fields. New model separates concerns | Create separate CardReview model as requested |
| Endpoint path | POST /vocabulary/review/ exists. Issue requests same path | Create new endpoint or modify existing? Need clarification |
| Algorithm choice | SM-2 vs FSRS vs custom | Use SM-2 (already implemented) with rating mapping |
| user_id nullable | Phase 1.5 has no auth, but future-proofing | Keep nullable as specified |

### Alternatives Considered

- **Alternative 1: Modify existing endpoint** - Rejected because it would be a breaking change to existing API consumers
- **Alternative 2: Use existing Card model fields** - Rejected because issue explicitly requests separate CardReview model
- **Alternative 3: Create comprehensive review history** - Out of scope for this issue, but could be future enhancement

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Endpoint path | POST /vocabulary/review/ already exists with different schema | Create new endpoint or confirm if we should modify existing |
| Rating vs Ease | Issue says rating (0-3), existing uses ease (1-4) | Map rating to ease internally, or implement new algorithm |
| Algorithm | Issue doesn't specify which SR algorithm | Use existing SM-2 with rating mapping |
| due_date type | Issue says datetime, existing uses Date | Use datetime for more precision |
| Relationship to Card | CardReview should reference Card | Foreign key to cards.id |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| First review (no existing CardReview) | Initialize state properly | Create new CardReview with default values |
| Invalid card_id | Prevent errors | Return 404 Not Found |
| Invalid rating (not 0-3) | Validation needed | Return 422 Validation Error |
| Rating=0 (Fail) | Should reset interval | interval=1, lapses+1, reps=0 |
| Rating=3 (Easy) | Should increase interval significantly | Apply algorithm formula |
| Concurrent reviews | Race condition possible | Use database transactions |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Breaking existing API | Existing clients may break | Create new endpoint instead of modifying |
| Data migration | Existing Card SR fields vs new CardReview | Keep both for now, migrate later |
| Algorithm differences | Rating 0-3 vs ease 1-4 | Document mapping clearly |
| Database schema changes | Need to run migrations | Create migration script |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Model with all fields | Yes | All fields specified in issue |
| AC2 | Review endpoint updates state | Yes | Will implement logic |
| AC3 | Returns next due date | Yes | Will include in response |
| AC4 | Handles new cards (first review) | Yes | Will initialize state |

**AC Coverage Summary**: All 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Validation of input data (card_id exists, rating in 0-3)
- Error handling and appropriate HTTP status codes
- Database transactions for atomicity
- Test coverage at 80%+

---

## REASONS Canvas

### Requirements
From GitHub issue #59 acceptance criteria:
- Model: CardReview with fields: user_id (nullable), card_id, ease_factor (float, default 2.5), interval (int, days), due_date (datetime), reps (int), lapses (int)
- Endpoint: POST /vocabulary/review/ with card_id and rating (0-3)
- Returns: next due date
- Handles: new cards (first review)

### Examples
Concrete test cases:
1. **First Review**: 
   - Input: card_id=1, rating=2
   - Expected: Create CardReview with ease_factor=2.5, interval=1, due_date=today+1, reps=1, lapses=0
   - Return: next_due_date = today + 1 day

2. **Second Review (rating=3 - Easy)**:
   - Input: card_id=1, rating=3
   - Current state: interval=1, ease_factor=2.5
   - Expected: new_interval = 1 * 2.5 * ease_multiplier ≈ 3-4 days
   - Return: next_due_date = today + new_interval days

3. **Failed Review (rating=0 - Again)**:
   - Input: card_id=1, rating=0
   - Expected: interval=1, reps=0, lapses+1
   - Return: next_due_date = today + 1 day

4. **Invalid Rating**:
   - Input: card_id=1, rating=5
   - Expected: 422 Validation Error

5. **Non-existent Card**:
   - Input: card_id=999, rating=2
   - Expected: 404 Not Found

### Architecture
Existing codebase structure:
- Models: SQLAlchemy async models in `models/` directory
- Schemas: Pydantic models in `schemas/` directory
- Routers: FastAPI endpoints in `routers/` directory
- Tests: pytest with factory-boy in `tests/` directory
- Database: SQLite (Phase 1-4), PostgreSQL (Phase 5)
- BaseModel: `models/base.py` provides id, created_at, updated_at

Patterns to follow:
- Model naming: PascalCase, singular (Card, Deck, CardReview)
- Table naming: plural snake_case (cards, decks, card_reviews)
- Schema naming: PascalCase with suffix (CardCreate, CardResponse)
- Endpoint naming: RESTful, plural resources
- Foreign keys: use SQLAlchemy relationship()
- Async database: use AsyncSession from sqlalchemy.ext.asyncio

### Standards
- **Coding**: PEP 8, match existing codebase style
- **Testing**: 80% coverage minimum, pytest-asyncio
- **Documentation**: Docstrings for public functions, README updates for new features
- **Security**: No API keys in code, use environment variables
- **Quality**: All tests must pass, code review required

### Omissions
Explicitly out of scope:
- User authentication (user_id is nullable)
- Review history API (GET endpoints)
- Analytics based on review data
- Migration from existing Card.spaced repetition fields
- FSRS algorithm implementation
- Frontend UI changes
- Batch operations

### Notes
Implementation hints and context:
- Existing SM-2 algorithm in `routers/vocabulary.py:48-88` can be reused or adapted
- Rating 0-3 needs to map to algorithm inputs (currently 1-4)
- Consider creating a mapping: rating + 1 = ease (0→1, 1→2, 2→3, 3→4)
- The due_date field should be a datetime (not just date) for more precision
- CardReview should have a foreign key to Card model
- For Phase 1.5, user_id remains nullable (no authentication)
- The reps and lapses fields are used by some SR algorithms (like FSRS)
- The interval is in days, due_date is the actual datetime

### Solutions
Reference implementations and patterns to follow:
- **Model Pattern**: See `models/card.py` for Card model structure
- **Schema Pattern**: See `schemas/vocabulary.py` for existing review schemas
- **Router Pattern**: See `routers/vocabulary.py` for existing endpoints
- **Test Pattern**: See `tests/test_vocabulary_simple.py` for test structure
- **Factory Pattern**: See `tests/factories.py` for factory-boy usage
- **SM-2 Algorithm**: See `routers/vocabulary.py:48-88` for existing implementation
- **Async DB**: See `database.py` for async session setup

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
