# SPDD Analysis: Vocabulary Router with CRUD Endpoints

**GitHub Issue**: #55
**Issue Title**: 3.4: Create vocabulary router with CRUD endpoints
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/55
**Artifact ID**: FLC-034-202606152200-[Analysis]-issue-55-vocabulary-router
**Created**: 2026-06-15 22:00
**Author**: Mistral Vibe

---

## Original Business Requirement

REST endpoints for vocabulary deck and card management.

## Endpoints
- GET /vocabulary/decks/ - List all decks
- GET /vocabulary/decks/{id}/cards/ - List cards in deck
- POST /vocabulary/decks/ - Create new deck
- POST /vocabulary/review/ - Submit card review
- GET /vocabulary/due/ - Get cards due for review

## Acceptance Criteria
- [ ] All endpoints implemented
- [ ] Proper validation
- [ ] Error handling

---

## Background

This feature implements the vocabulary management system for Phase 3 of the French Language Coach project (Vocabulary Builder). The vocabulary router will provide RESTful endpoints for managing decks and cards, enabling spaced-repetition flashcard functionality.

The vocabulary card schema (Issue #49) has already been implemented with the following structure:
- `deck_id`: Unique identifier for the deck/collection
- `card_id`: Unique identifier for the card within the deck
- `front`: The French word, phrase, or text to be learned
- `back`: The English translation
- `example`: A French sentence using the word/phrase in context (optional)
- `tags`: List of categorization labels (optional)
- `context`: Description of where the word appeared or was learned from (optional)
- `difficulty`: Numeric rating from 1 to 5

This router will provide the API layer to create, read, and manage these vocabulary resources.

---

## Business Value

- Enables spaced-repetition flashcard functionality (Phase 3 core feature)
- Provides API for frontend to manage vocabulary decks and cards
- Supports vocabulary extraction from conversations (future feature)
- Allows users to create custom decks for personalized study
- Enables review tracking and progress monitoring

---

## Scope In

- [ ] Create SQLAlchemy models for Deck and Card (if needed beyond existing schemas)
- [ ] Create Pydantic schemas for request/response validation
- [ ] Implement GET /vocabulary/decks/ endpoint to list all decks
- [ ] Implement GET /vocabulary/decks/{id}/cards/ endpoint to list cards in a deck
- [ ] Implement POST /vocabulary/decks/ endpoint to create a new deck
- [ ] Implement POST /vocabulary/review/ endpoint to submit card review
- [ ] Implement GET /vocabulary/due/ endpoint to get cards due for review
- [ ] Proper validation for all endpoints
- [ ] Error handling for all endpoints
- [ ] Unit tests for all endpoints (80%+ coverage)
- [ ] Update README.md with new endpoints

## Scope Out

- [ ] Frontend components for vocabulary management (separate issue)
- [ ] Spaced repetition algorithm implementation (can use SM-2 or similar)
- [ ] Vocabulary data extraction from conversations (future feature)
- [ ] Themed/pre-built decks (can be added later)
- [ ] Multi-format practice (recognition, recall, listening, usage)
- [ ] Progress tracking UI (separate issue)

---

## Acceptance Criteria (ACs)

1. **AC1**: All endpoints implemented
   **Given** The vocabulary router is deployed
   **When** A request is made to any vocabulary endpoint
   **Then** The endpoint responds with appropriate data or error

2. **AC2**: Proper validation
   **Given** A request with invalid data
   **When** The request is processed
   **Then** A 400 or 422 error is returned with descriptive message

3. **AC3**: Error handling
   **Given** A request for non-existent resource
   **When** The request is processed
   **Then** A 404 error is returned with descriptive message

4. **AC4**: GET /vocabulary/decks/ returns list of decks
   **Given** Decks exist in the database
   **When** GET /vocabulary/decks/ is called
   **Then** A list of all decks with their metadata is returned

5. **AC5**: GET /vocabulary/decks/{id}/cards/ returns cards in deck
   **Given** A deck with ID exists with cards
   **When** GET /vocabulary/decks/{id}/cards/ is called
   **Then** A list of all cards in that deck is returned

6. **AC6**: POST /vocabulary/decks/ creates new deck
   **Given** Valid deck creation request
   **When** POST /vocabulary/decks/ is called with deck data
   **Then** A new deck is created and its details are returned

7. **AC7**: POST /vocabulary/review/ submits card review
   **Given** Valid review submission
   **When** POST /vocabulary/review/ is called with review data
   **Then** The review is recorded and card interval is updated

8. **AC8**: GET /vocabulary/due/ returns cards due for review
   **Given** Cards with scheduled review dates exist
   **When** GET /vocabulary/due/ is called
   **Then** A list of cards due for review is returned

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **VocabularyCard Schema** (`schemas/vocabulary_card.py`): Pydantic model for validating vocabulary card data with deck_id, card_id, front, back, example, tags, context, difficulty fields
- **VocabularyCard JSON Schema** (`schemas/vocabulary_card.json`): JSON Schema definition for vocabulary cards
- **BaseModel** (`models/base.py`): Abstract base class for SQLAlchemy models with id, created_at, updated_at fields
- **Session Model** (`models/session.py`): Example of SQLAlchemy model with JSON fields and helper properties
- **Grammar Router** (`routers/grammar.py`): Example of router structure with filtering, pagination, and error handling
- **Sessions Router** (`routers/sessions.py`): Example of CRUD operations with validation and error handling
- **Database** (`database.py`): SQLAlchemy async engine and session setup
- **Main App** (`main.py`): FastAPI app with router registration pattern

### New Concepts Required

- **Deck Model**: SQLAlchemy model representing a vocabulary deck/collection with name, description, created_at, updated_at
- **Card Model**: SQLAlchemy model representing a vocabulary card with fields matching the VocabularyCard schema plus review tracking fields (next_review_date, interval, ease_factor, etc.)
- **Deck Schema**: Pydantic schema for deck creation and response
- **Card Schema**: Pydantic schema for card creation and response (may extend existing VocabularyCard schema)
- **Review Schema**: Pydantic schema for review submission with card_id, deck_id, user_response, ease (1-4 rating)
- **Vocabulary Router**: FastAPI router with endpoints for deck and card management

### Key Business Rules

- **Rule 1**: All vocabulary operations must be atomic - database transactions should be used
- **Rule 2**: Vocabulary cards must have required fields: deck_id, card_id, front, back, difficulty
- **Rule 3**: Spaced repetition uses SM-2 algorithm or similar (intervals: 1, 6, ... days based on ease factor)
- **Rule 4**: Cards due for review are those where next_review_date <= current date
- **Rule 5**: Ease factor starts at 2.5 and is adjusted based on user's review performance (1=Again, 2=Hard, 3=Good, 4=Easy)
- **Rule 6**: All endpoints must validate input and return appropriate HTTP status codes

---

## Strategic Approach

### Solution Direction

1. **Model Layer**: Create Deck and Card SQLAlchemy models with proper relationships
   - Deck: id, name, description, created_at, updated_at
   - Card: id, deck_id, card_id (within deck), front, back, example, tags, context, difficulty, next_review_date, interval, ease_factor, created_at, updated_at

2. **Schema Layer**: Create Pydantic schemas for validation
   - DeckCreate, DeckResponse, DeckListResponse
   - CardCreate, CardResponse, CardListResponse
   - ReviewSubmit (card_id, deck_id, ease, optional response)

3. **Router Layer**: Implement endpoints with proper validation and error handling
   - GET /vocabulary/decks/ - List all decks
   - GET /vocabulary/decks/{id}/cards/ - List cards in deck
   - POST /vocabulary/decks/ - Create new deck
   - POST /vocabulary/review/ - Submit card review (updates next_review_date based on SM-2)
   - GET /vocabulary/due/ - Get cards due for review (next_review_date <= today)

4. **Service Layer** (optional): If logic is complex, create service functions for spaced repetition algorithm

5. **Testing**: Create comprehensive tests for all endpoints with 80%+ coverage

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Use SQLAlchemy models vs JSON files | SQLAlchemy: persistent storage, queryable, transactional. JSON files: simpler, no DB dependency | **SQLAlchemy models** - Aligns with existing session storage pattern, enables querying and filtering |
| SM-2 vs custom algorithm | SM-2: well-established, proven. Custom: tailored to app | **SM-2 algorithm** - Industry standard for spaced repetition, well-documented |
| Separate service layer | Separation: better for complex logic, testable. Direct in router: simpler | **Start in router, extract if needed** - Keep it simple initially, refactor if complexity grows |
| Next review date storage | Store date vs calculate on demand | **Store next_review_date** - Enables efficient querying of due cards |

### Alternatives Considered

- **Alternative 1**: Use existing VocabularyCard schema directly for database - Rejected because we need additional fields for spaced repetition (next_review_date, interval, ease_factor)
- **Alternative 2**: Store cards only in decks directory as JSON files - Rejected because it doesn't align with existing database-first approach for sessions
- **Alternative 3**: Implement full Anki-compatible database - Rejected as over-engineering for Phase 3 MVP

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Spaced repetition algorithm | Which algorithm to use? | Use SM-2 algorithm as industry standard |
| User identification | How to track which user a deck belongs to? | For Phase 3, assume single-user (like sessions). Add user_id field but make it nullable |
| Deck creation defaults | What default values for new decks? | name required, description optional, empty deck |
| Review endpoint validation | What validates a review is for the correct user/card? | For single-user Phase 3, validate card exists in requested deck |
| Due cards logic | What constitutes "due"? | next_review_date <= current date |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Deck with no cards | Empty decks should still be listable | Return empty list for cards endpoint |
| Card not in requested deck | Prevents data corruption | Return 404 if card not found in specified deck |
| Invalid ease factor in review | Ensures data quality | Validate ease is 1-4, return 400 if invalid |
| Review for non-existent card | Prevents errors | Return 404 with descriptive message |
| Multiple decks with same name | Allowed for flexibility | No uniqueness constraint on deck names |
| Very large deck (1000+ cards) | Performance consideration | Implement pagination for deck cards endpoint |
| Concurrent reviews | Data consistency | Use database transactions |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Database schema changes | Could break existing data | Create migrations if needed, but this is new feature so no existing data |
| Spaced repetition logic errors | Incorrect review scheduling | Thorough unit testing of SM-2 algorithm |
| Performance issues with large decks | Slow queries | Add indexes on deck_id and next_review_date, implement pagination |
| Race conditions in review | Inconsistent state | Use database transactions for atomic operations |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | All endpoints implemented | Yes | Need to implement 5 endpoints |
| AC2 | Proper validation | Yes | Will use Pydantic schemas |
| AC3 | Error handling | Yes | Will implement try/catch with appropriate HTTP errors |
| AC4 | GET /vocabulary/decks/ returns list | Yes | Straightforward query |
| AC5 | GET /vocabulary/decks/{id}/cards/ returns cards | Yes | Query with deck_id filter |
| AC6 | POST /vocabulary/decks/ creates deck | Yes | Create and persist new deck |
| AC7 | POST /vocabulary/review/ submits review | Yes | Update card's review tracking fields |
| AC8 | GET /vocabulary/due/ returns due cards | Yes | Query cards where next_review_date <= today |

**AC Coverage Summary**: All 8 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Pagination for endpoints that could return many results
- Proper HTTP status codes (200, 201, 400, 404, etc.)
- CORS support (already configured in main.py)
- Database transactions for data consistency
- Documentation updates to README.md

---

## REASONS Canvas

### Requirements
- REST endpoints for vocabulary deck and card management
- 5 specific endpoints: list decks, list cards in deck, create deck, submit review, get due cards
- Proper validation on all endpoints
- Error handling for all endpoints
- 80%+ test coverage

### Examples
**Example 1: List decks**
- Request: GET /vocabulary/decks/
- Response: `{"decks": [{"id": 1, "name": "Travel Vocabulary", "description": "Words for traveling in France", "created_at": "...", "card_count": 25}, ...], "pagination": {...}}`

**Example 2: Create deck**
- Request: POST /vocabulary/decks/ with body `{"name": "Food", "description": "Restaurant and dining words"}`
- Response: 201 Created with `{"id": 2, "name": "Food", "description": "Restaurant and dining words", "created_at": "..."}`

**Example 3: Submit review**
- Request: POST /vocabulary/review/ with body `{"card_id": "123", "deck_id": "1", "ease": 3}`
- Response: 200 OK with `{"success": true, "next_review_date": "2026-06-22", "new_interval": 6}`

**Example 4: Get due cards**
- Request: GET /vocabulary/due/
- Response: `{"cards": [{"id": "123", "deck_id": "1", "front": "bonjour", "back": "hello", "next_review_date": "2026-06-15"}, ...], "pagination": {...}}`

### Architecture
- **Backend**: FastAPI with SQLAlchemy async
- **Database**: SQLite (matching existing session storage)
- **Pattern**: Follow existing router patterns from `routers/sessions.py` and `routers/grammar.py`
- **Models**: SQLAlchemy models in `models/` directory
- **Schemas**: Pydantic schemas in `schemas/` directory
- **Router**: New file `routers/vocabulary.py`

Existing patterns to follow:
- Use `BaseModel` from `models/base.py` for all models
- Use `get_db()` dependency from `database.py`
- Use async/await for all database operations
- Return appropriate HTTP status codes (200, 201, 400, 404)
- Use FastAPI's Query for query parameters
- Use Pydantic BaseModel for request/response schemas

### Standards
- **Coding**: PEP 8, match existing codebase style
- **Testing**: 80%+ coverage, pytest, use factory-boy for test fixtures
- **Documentation**: Docstrings for public functions, update README.md
- **Database**: Async SQLAlchemy, use existing engine setup
- **API Design**: RESTful conventions, clear endpoint naming

### Omissions
- Frontend components (separate issue)
- User authentication (Phase 5)
- Multi-user support (Phase 5, user_id nullable for now)
- Themed/pre-built decks (future enhancement)
- Advanced spacing algorithms beyond SM-2 (future enhancement)
- Mobile-specific optimizations (future enhancement)

### Notes
- Issue #49 has already created the vocabulary card JSON schema and Pydantic models
- The existing `VocabularyCard` schema in `schemas/vocabulary_card.py` can be extended or used as reference
- The spaced repetition algorithm (SM-2) needs to be implemented for the review endpoint
- SM-2 algorithm reference: https://www.supermemo.com/en/archives1990-2015/english/ol6
- Need to add vocabulary_router to main.py imports and app.include_router()

### Solutions
- **Reference Implementation**: Follow `routers/sessions.py` for CRUD patterns and `routers/grammar.py` for list/filter patterns
- **SM-2 Algorithm**: Use standard implementation with ease factors 1.3 (Again), 1.2 (Hard), 1.0 (Good), 1.3 (Easy) - actually standard is: EF' = EF + (0.1 - (5 - response)*(0.08 + (5 - response)*0.02)) where response is 1-4
- **Database Pattern**: Use SQLAlchemy declarative models like `models/session.py`
- **Validation Pattern**: Use Pydantic schemas like in `schemas/session.py`
- **Error Handling**: Use HTTPException like in existing routers

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
