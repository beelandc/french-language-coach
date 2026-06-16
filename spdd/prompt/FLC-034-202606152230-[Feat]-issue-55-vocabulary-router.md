# SPDD Prompt: Vocabulary Router with CRUD Endpoints

**GitHub Issue**: #55
**Issue Title**: 3.4: Create vocabulary router with CRUD endpoints
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/55
**Artifact ID**: FLC-034-202606152230-[Feat]-issue-55-vocabulary-router
**Created**: 2026-06-15 22:30
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-034-202606152200-[Analysis]-issue-55-vocabulary-router.md`

---

## Context

### Current Codebase State

The French Language Coach project is a FastAPI backend with React frontend. Current state:
- **Backend**: FastAPI with async SQLAlchemy, SQLite database
- **Existing Routers**: sessions.py (CRUD for conversation sessions), grammar.py (grammar lessons/reference/exercises), feedback.py, messages.py
- **Existing Models**: Session (models/session.py), BaseModel (models/base.py)
- **Existing Schemas**: VocabularyCard (schemas/vocabulary_card.py) - Issue #49, Session schemas, Grammar schemas
- **Database**: SQLite with async SQLAlchemy engine
- **Testing**: pytest with factory-boy for backend tests

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `models/base.py` | Abstract base model with id, created_at, updated_at | Lines 14-35, BaseModel class |
| `models/session.py` | Session SQLAlchemy model with JSON fields | Lines 12-63, Session class with messages_list, feedback_dict properties |
| `schemas/vocabulary_card.py` | Pydantic VocabularyCard model | Lines 22-76, VocabularyCard class with validation |
| `schemas/vocabulary_card.json` | JSON Schema for vocabulary cards | Full schema definition |
| `routers/sessions.py` | CRUD router pattern | Lines 19-387, create, list, get, delete, lock, unlock endpoints |
| `routers/grammar.py` | List/filter router pattern | Lines 45-491, list endpoints with pagination and filtering |
| `database.py` | Database engine and session setup | Lines 1-16, get_db() dependency |
| `main.py` | FastAPI app setup | Lines 1-80, router registration pattern |

### Existing Patterns

1. **Model Pattern**: Inherit from BaseModel (models/base.py), use Column types from sqlalchemy, add helper properties for JSON fields
2. **Router Pattern**: Use APIRouter with prefix and tags, use Depends(get_db) for database session, async functions, HTTPException for errors
3. **Schema Pattern**: Pydantic BaseModel with Field for validation, use typing.Anotated for optional fields
4. **Pagination Pattern**: Use math.ceil for total_pages, Query parameters for page/per_page, return PaginationInfo
5. **Error Handling**: Use HTTPException with status_code and detail message, return appropriate status codes (200, 201, 400, 404)

---

## Goal

**Primary Objective**: Implement RESTful vocabulary router with 5 endpoints for deck and card management

**Secondary Objectives**:
- Create SQLAlchemy models for Deck and Card with spaced repetition fields
- Create Pydantic schemas for request/response validation
- Implement SM-2 spaced repetition algorithm for review scheduling
- Write comprehensive tests (80%+ coverage)
- Update README.md with new endpoints

---

## Constraints

### Architecture Constraints
- Must follow existing FastAPI + SQLAlchemy async architecture
- Must use existing database.py engine and get_db() dependency
- Must register router in main.py with app.include_router()
- Must follow existing naming conventions (snake_case for files, CamelCase for classes)
- Must use existing patterns from routers/sessions.py and routers/grammar.py

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must include docstrings for all public functions and classes
- Must use type hints for all functions
- Must use async/await for all database operations
- Must validate all inputs using Pydantic schemas
- Must return appropriate HTTP status codes

### Testing Constraints
- Must create unit tests for all new functions
- Must create integration tests for all endpoints
- Must test edge cases (empty decks, invalid inputs, non-existent resources)
- Must achieve 80%+ test coverage per module
- Must use existing pytest setup with factory-boy

### Acceptance Criteria

From GitHub Issue #55:
- [ ] All endpoints implemented
- [ ] Proper validation
- [ ] Error handling

Additional ACs from analysis:
- [ ] GET /vocabulary/decks/ returns list of decks
- [ ] GET /vocabulary/decks/{id}/cards/ returns cards in deck
- [ ] POST /vocabulary/decks/ creates new deck
- [ ] POST /vocabulary/review/ submits card review
- [ ] GET /vocabulary/due/ returns cards due for review

---

## Examples

### Input/Output Examples

**Example 1: List all decks (GET /vocabulary/decks/)**
- Request: GET /vocabulary/decks/
- Response (200):
  ```json
  {
    "decks": [
      {
        "id": 1,
        "name": "Travel Vocabulary",
        "description": "Words for traveling in France",
        "card_count": 25,
        "created_at": "2026-06-15T10:00:00",
        "updated_at": "2026-06-15T10:00:00"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "per_page": 10,
      "total_pages": 1
    }
  }
  ```

**Example 2: Create a new deck (POST /vocabulary/decks/)**
- Request: POST /vocabulary/decks/ with body:
  ```json
  {"name": "Food & Dining", "description": "Restaurant vocabulary"}
  ```
- Response (201):
  ```json
  {
    "id": 1,
    "name": "Food & Dining",
    "description": "Restaurant vocabulary",
    "created_at": "2026-06-15T10:00:00",
    "updated_at": "2026-06-15T10:00:00"
  }
  ```

**Example 3: List cards in a deck (GET /vocabulary/decks/{id}/cards/)**
- Request: GET /vocabulary/decks/1/cards/
- Response (200):
  ```json
  {
    "cards": [
      {
        "id": 1,
        "deck_id": 1,
        "card_id": "bonjour",
        "front": "bonjour",
        "back": "hello",
        "example": "Bonjour, comment ca va?",
        "tags": ["greeting"],
        "context": "Common greeting",
        "difficulty": 1,
        "next_review_date": "2026-06-16",
        "interval": 1,
        "ease_factor": 2.5,
        "created_at": "2026-06-15T10:00:00",
        "updated_at": "2026-06-15T10:00:00"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "per_page": 10,
      "total_pages": 1
    }
  }
  ```

**Example 4: Submit card review (POST /vocabulary/review/)**
- Request: POST /vocabulary/review/ with body:
  ```json
  {"card_id": 1, "deck_id": 1, "ease": 3}
  ```
- Response (200):
  ```json
  {
    "success": true,
    "message": "Review recorded successfully",
    "next_review_date": "2026-06-22",
    "new_interval": 6,
    "new_ease_factor": 2.6
  }
  ```

**Example 5: Get cards due for review (GET /vocabulary/due/)**
- Request: GET /vocabulary/due/
- Response (200):
  ```json
  {
    "cards": [
      {
        "id": 1,
        "deck_id": 1,
        "deck_name": "Travel Vocabulary",
        "card_id": "bonjour",
        "front": "bonjour",
        "back": "hello",
        "next_review_date": "2026-06-15"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "per_page": 10,
      "total_pages": 1
    }
  }
  ```

### Edge Cases

- **Empty deck**: GET /vocabulary/decks/{id}/cards/ returns empty array for cards
- **Invalid ease factor**: POST /vocabulary/review/ with ease=5 returns 400 error
- **Non-existent deck**: GET /vocabulary/decks/999 returns 404 error
- **Non-existent card**: POST /vocabulary/review/ with card_id=999 returns 404 error
- **Invalid deck data**: POST /vocabulary/decks/ with empty name returns 422 error
- **Pagination out of range**: GET /vocabulary/decks/?page=999 returns empty list

### Test Cases

```python
# Example test structure for vocabulary router

# Test: List decks
async def test_list_decks_empty(db_session):
    # Given: No decks exist
    # When: GET /vocabulary/decks/
    # Then: Returns empty list
    response = client.get("/vocabulary/decks/")
    assert response.status_code == 200
    assert response.json()["decks"] == []

# Test: Create deck
async def test_create_deck(db_session):
    # Given: Valid deck data
    # When: POST /vocabulary/decks/ with {"name": "Test"}
    # Then: Returns created deck with 201 status
    response = client.post("/vocabulary/decks/", json={"name": "Test"})
    assert response.status_code == 201
    assert response.json()["name"] == "Test"
    assert "id" in response.json()

# Test: List cards in deck
async def test_list_cards_in_deck(db_session, test_deck, test_card):
    # Given: Deck with cards exists
    # When: GET /vocabulary/decks/{deck_id}/cards/
    # Then: Returns list of cards
    response = client.get(f"/vocabulary/decks/{test_deck.id}/cards/")
    assert response.status_code == 200
    assert len(response.json()["cards"]) >= 1

# Test: Submit review
async def test_submit_review(db_session, test_card):
    # Given: Valid card exists
    # When: POST /vocabulary/review/ with {"card_id": card.id, "deck_id": deck.id, "ease": 3}
    # Then: Returns success with updated review date
    response = client.post("/vocabulary/review/", json={
        "card_id": test_card.id,
        "deck_id": test_card.deck_id,
        "ease": 3
    })
    assert response.status_code == 200
    assert response.json()["success"] is True

# Test: Get due cards
async def test_get_due_cards(db_session, test_card_due):
    # Given: Card with due date <= today exists
    # When: GET /vocabulary/due/
    # Then: Returns list including the due card
    response = client.get("/vocabulary/due/")
    assert response.status_code == 200
    card_ids = [c["id"] for c in response.json()["cards"]]
    assert test_card_due.id in card_ids

# Test: Invalid ease factor
async def test_submit_review_invalid_ease(db_session):
    # Given: ease factor out of range
    # When: POST /vocabulary/review/ with ease=5
    # Then: Returns 400 error
    response = client.post("/vocabulary/review/", json={
        "card_id": 1,
        "deck_id": 1,
        "ease": 5
    })
    assert response.status_code == 400

# Test: Non-existent deck
async def test_get_nonexistent_deck():
    # Given: Deck with id 999 doesn't exist
    # When: GET /vocabulary/decks/999/cards/
    # Then: Returns 404 error
    response = client.get("/vocabulary/decks/999/cards/")
    assert response.status_code == 404
```

---

## Deliverables

### Code Changes

- [ ] `models/deck.py` - SQLAlchemy Deck model with id, name, description, created_at, updated_at
- [ ] `models/card.py` - SQLAlchemy Card model with id, deck_id, card_id, front, back, example, tags, context, difficulty, next_review_date, interval, ease_factor, created_at, updated_at
- [ ] `schemas/vocabulary.py` - Pydantic schemas for DeckCreate, DeckResponse, DeckListResponse, CardCreate, CardResponse, CardListResponse, ReviewSubmit, ReviewResponse, DueCardResponse
- [ ] `routers/vocabulary.py` - FastAPI router with all 5 endpoints
- [ ] `main.py` - Updated to import and register vocabulary_router
- [ ] `tests/test_vocabulary.py` - Comprehensive tests for all endpoints

### Tests

- [ ] Unit tests for Deck model
- [ ] Unit tests for Card model
- [ ] Unit tests for SM-2 algorithm
- [ ] Integration tests for GET /vocabulary/decks/
- [ ] Integration tests for GET /vocabulary/decks/{id}/cards/
- [ ] Integration tests for POST /vocabulary/decks/
- [ ] Integration tests for POST /vocabulary/review/
- [ ] Integration tests for GET /vocabulary/due/
- [ ] Edge case tests for all endpoints

### Documentation

- [ ] Update README.md API Endpoints table with new vocabulary endpoints
- [ ] Add docstrings to all new functions and classes
- [ ] Add comments for complex logic (SM-2 algorithm)

---

## Actual Prompt

```
IMPLEMENT VOCABULARY ROUTER FOR FRENCH LANGUAGE COACH (ISSUE #55)

CONTEXT:
You are implementing the vocabulary management system for the French Language Coach project.
The project uses:
- Backend: FastAPI with async SQLAlchemy, SQLite database
- Existing vocabulary card schema: schemas/vocabulary_card.py (Issue #49)
- Existing patterns: routers/sessions.py (CRUD), routers/grammar.py (list/filter), models/base.py (BaseModel)

GOAL:
Implement RESTful vocabulary router with the following 5 endpoints:
1. GET /vocabulary/decks/ - List all decks with pagination
2. GET /vocabulary/decks/{id}/cards/ - List cards in a deck with pagination
3. POST /vocabulary/decks/ - Create a new deck
4. POST /vocabulary/review/ - Submit card review (updates spaced repetition fields)
5. GET /vocabulary/due/ - Get cards due for review

REQUIREMENTS:
- Create SQLAlchemy models: Deck and Card
- Create Pydantic schemas for validation
- Implement SM-2 spaced repetition algorithm for review scheduling
- Add proper validation and error handling
- Support pagination for list endpoints
- Follow existing codebase patterns

CONSTRAINTS:
- Must use existing database.py (async SQLAlchemy)
- Must follow existing model patterns (inherit from BaseModel)
- Must follow existing router patterns (APIRouter, Depends(get_db), async)
- Must use Pydantic schemas for validation
- Must return appropriate HTTP status codes (200, 201, 400, 404)
- Must include docstrings for public functions
- Must use type hints
- Must support 80%+ test coverage

ACCEPTANCE CRITERIA (from Issue #55):
- [ ] All endpoints implemented
- [ ] Proper validation
- [ ] Error handling

ADDITIONAL REQUIREMENTS:
- Deck model: id, name (required), description (optional), created_at, updated_at
- Card model: id, deck_id (FK), card_id, front, back, example, tags, context, difficulty, next_review_date, interval, ease_factor, created_at, updated_at
- SM-2 algorithm: EF' = EF + (0.1 - (5 - response) * (0.08 + (5 - response) * 0.02)) where response is 1-4 (1=Again, 2=Hard, 3=Good, 4=Easy)
- Default ease_factor: 2.5
- Default interval for new cards: 1 day
- Cards due: next_review_date <= current date
- Pagination: page (default 1), per_page (default 10, max 100)

EXAMPLES:

Model structure:
```python
# models/deck.py
class Deck(BaseModel):
    __tablename__ = "decks"
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    # ... with created_at, updated_at from BaseModel

# models/card.py  
class Card(BaseModel):
    __tablename__ = "cards"
    deck_id = Column(Integer, ForeignKey("decks.id"), nullable=False)
    card_id = Column(String(50), nullable=False)  # unique within deck
    front = Column(String(500), nullable=False)
    back = Column(String(500), nullable=False)
    example = Column(String(1000), nullable=True)
    tags = Column(JSON, nullable=True, default=[])
    context = Column(String(1000), nullable=True)
    difficulty = Column(Integer, nullable=False, default=1)
    next_review_date = Column(Date, nullable=False)
    interval = Column(Integer, nullable=False, default=1)  # in days
    ease_factor = Column(Float, nullable=False, default=2.5)
```

Endpoint examples:
- GET /vocabulary/decks/ -> {"decks": [...], "pagination": {...}}
- POST /vocabulary/decks/ <- {"name": "Food"} -> 201 {"id": 1, "name": "Food", ...}
- GET /vocabulary/decks/1/cards/ -> {"cards": [...], "pagination": {...}}
- POST /vocabulary/review/ <- {"card_id": 1, "deck_id": 1, "ease": 3} -> 200 {"success": true, "next_review_date": "..."}
- GET /vocabulary/due/ -> {"cards": [...], "pagination": {...}}

DELIVERABLES:
1. models/deck.py - Deck SQLAlchemy model
2. models/card.py - Card SQLAlchemy model
3. schemas/vocabulary.py - All Pydantic schemas
4. routers/vocabulary.py - FastAPI router with 5 endpoints
5. Update main.py to include vocabulary_router
6. tests/test_vocabulary.py - Comprehensive tests
7. Update README.md API Endpoints table

IMPLEMENTATION NOTES:
- Use SM-2 algorithm for spaced repetition: EF' = EF + (0.1 - (5 - response) * (0.08 + (5 - response) * 0.02))
- response mapping: 1=Again, 2=Hard, 3=Good, 4=Easy
- interval update: if response >= 3, interval = interval * EF; else interval = 1
- next_review_date = today + interval days
- For new cards: interval=1, ease_factor=2.5, next_review_date=today+1

START IMPLEMENTATION NOW
```

---

## AI Response

[To be filled after AI generates the implementation]

---

## Human Review Notes

[To be filled during and after implementation]

### Changes Made
- [ ] Any manual adjustments to AI-generated code
- [ ] Bug fixes applied
- [ ] Refactoring done

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [ ] Any issues discovered during implementation

---

## Verification

[Checklist for verifying the deliverables]

- [ ] All acceptance criteria from issue #55 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
