# SPDD Prompt: Card Review Model and Review Endpoint

**GitHub Issue**: #59
**Issue Title**: 3.6+3.7: Create card review model and review endpoint
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/59
**Artifact ID**: FLC-036-202606152345
**Created**: 2026-06-15 23:45
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-036-202606152330-[Analysis]-issue-59-card-review-model.md`

---

## Context

### Current Codebase State

The French Language Coach project has an existing vocabulary system with:
- **Card Model** (`models/card.py`): Stores vocabulary flashcards with basic spaced repetition fields (interval, ease_factor, next_review_date)
- **Deck Model** (`models/deck.py`): Container for cards
- **Vocabulary Router** (`routers/vocabulary.py`): RESTful endpoints for vocabulary management
  - POST /vocabulary/review/ already exists but uses ease rating 1-4 (Again, Hard, Good, Easy)
  - Uses SM-2 spaced repetition algorithm
- **Schemas** (`schemas/vocabulary.py`): Pydantic models for validation

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `models/card.py` | Card model with flashcard data | Lines 1-69, class Card |
| `models/base.py` | Base model with common fields | Lines 1-35, class BaseModel |
| `models/deck.py` | Deck model | Needs review for structure |
| `routers/vocabulary.py` | Vocabulary endpoints | calculate_sm2(), POST /vocabulary/review/ |
| `schemas/vocabulary.py` | Vocabulary schemas | ReviewSubmit, ReviewResponse |
| `tests/factories.py` | Test factories | SessionFactory, LessonProgressFactory |
| `tests/conftest.py` | Test configuration | test_db, client fixtures |
| `tests/test_vocabulary_simple.py` | Vocabulary tests | ReviewBasics test class |

### Existing Patterns

1. **Model Pattern**:
   - Inherit from BaseModel (`models/base.py`)
   - Use SQLAlchemy Column types with appropriate constraints
   - Include docstrings with attribute descriptions
   - Table names are plural snake_case

2. **Schema Pattern**:
   - Inherit from BaseSchema (`schemas/base.py`)
   - Use Pydantic Field for validation and descriptions
   - Include field_validator for custom validation
   - Use Optional[] for nullable fields

3. **Router Pattern**:
   - Use APIRouter with prefix and tags
   - Async functions with Depends(get_db)
   - Return appropriate HTTP status codes
   - Use SQLAlchemy async operations
   - Include detailed docstrings

4. **Factory Pattern**:
   - Use factory-boy Factory class
   - Generate test data with fuzzy values
   - Include docstrings describing purpose

5. **Test Pattern**:
   - Use pytest with pytest-asyncio
   - Async test functions
   - Use test_db and client fixtures
   - Test both success and error cases

---

## Goal

**Primary Objective**: Implement GitHub issue #59 by creating a CardReview model and a review endpoint that tracks spaced repetition state for vocabulary cards.

**Secondary Objectives**:
- Create SQLAlchemy CardReview model with all specified fields
- Create Pydantic schemas for request/response validation
- Implement POST endpoint that accepts card_id and rating (0-3)
- Implement spaced repetition state update logic
- Handle first review initialization
- Create factory for testing
- Write comprehensive tests (80%+ coverage)
- Update module exports

---

## Constraints

### Architecture Constraints
- Must follow existing codebase architecture (FastAPI, SQLAlchemy async, Pydantic)
- Must use existing BaseModel from `models/base.py`
- Must use existing database.py for async session
- Must not break existing POST /vocabulary/review/ endpoint (create new endpoint instead)
- Must follow RESTful conventions

### Code Quality Constraints
- Must match existing code style (PEP 8)
- Must include docstrings for all public functions and classes
- Must use type hints appropriately
- Must handle edge cases gracefully
- Must use async/await properly

### Testing Constraints
- Must achieve 80%+ test coverage for new code
- Must use pytest and pytest-asyncio
- Must use factory-boy for test fixtures
- Must test both success and error cases
- Must test edge cases (first review, invalid inputs, etc.)

### Acceptance Criteria

From GitHub issue #59:
- [ ] Model with all fields (user_id, card_id, ease_factor, interval, due_date, reps, lapses)
- [ ] Review endpoint updates state
- [ ] Returns next due date
- [ ] Handles new cards (first review)

---

## Examples

### Input/Output Examples

1. **First Review**:
   - Request: POST /vocabulary/card-review/ with `{"card_id": 1, "rating": 2}`
   - Expected Response: `{"success": true, "next_due_date": "2026-06-16T23:45:00", "interval": 1, "ease_factor": 2.5, "reps": 1, "lapses": 0}`
   - Expected DB: New CardReview record created with default values

2. **Subsequent Review (rating=3 - Easy)**:
   - Request: POST /vocabulary/card-review/ with `{"card_id": 1, "rating": 3}`
   - Current state: interval=1, ease_factor=2.5, reps=1
   - Expected Response: `{"success": true, "next_due_date": "2026-06-19T23:45:00", "interval": 4, "ease_factor": 2.6, "reps": 2, "lapses": 0}`
   - Expected DB: CardReview updated with new interval, ease_factor, due_date

3. **Failed Review (rating=0 - Again)**:
   - Request: POST /vocabulary/card-review/ with `{"card_id": 1, "rating": 0}`
   - Expected Response: `{"success": true, "next_due_date": "2026-06-16T23:45:00", "interval": 1, "ease_factor": 2.5, "reps": 0, "lapses": 1}`
   - Expected DB: CardReview updated with reset interval, incremented lapses

4. **Invalid Rating**:
   - Request: POST /vocabulary/card-review/ with `{"card_id": 1, "rating": 5}`
   - Expected Response: HTTP 422 with validation error

5. **Non-existent Card**:
   - Request: POST /vocabulary/card-review/ with `{"card_id": 999, "rating": 2}`
   - Expected Response: HTTP 404 with "Card not found" error

### Edge Cases
- First review for a card (no existing CardReview)
- Rating at boundaries (0, 3)
- Invalid rating values (< 0, > 3)
- Non-existent card_id
- Null user_id (Phase 1.5 - no authentication)

### Test Cases

```python
# Test examples for CardReview model

# Test 1: First review initialization
async def test_first_review(test_db):
    # Given: A card exists with no reviews
    card = CardModel(deck_id=1, card_id="test", front="test", back="test", 
                     next_review_date=date.today(), interval=1, ease_factor=2.5, difficulty=1)
    test_db.add(card)
    await test_db.commit()
    
    # When: Submit first review
    review_data = {"card_id": card.id, "rating": 2}
    
    # Then: CardReview created with default values
    # Assert response has success=True, interval=1, ease_factor=2.5, reps=1, lapses=0

# Test 2: Subsequent review updates state
async def test_subsequent_review(client, test_db):
    # Given: Card with existing review
    # ... setup ...
    
    # When: Submit second review with rating=3
    
    # Then: State updated according to algorithm
    # Assert new interval > old interval
    # Assert ease_factor updated

# Test 3: Failed review resets interval
async def test_failed_review(client, test_db):
    # Given: Card with existing review (interval=5)
    
    # When: Submit review with rating=0
    
    # Then: Interval reset to 1, lapses incremented
    # Assert interval == 1
    # Assert lapses == 1

# Test 4: Invalid rating
async def test_invalid_rating(client):
    # Given: Any card
    
    # When: Submit review with rating=5
    
    # Then: Validation error returned
    # Assert status_code == 422

# Test 5: Non-existent card
async def test_nonexistent_card(client):
    # Given: No card with id=999
    
    # When: Submit review for card_id=999
    
    # Then: Not found error returned
    # Assert status_code == 404
```

---

## Deliverables

### Code Changes

- [ ] `models/card_review.py` - CardReview SQLAlchemy model
- [ ] `schemas/card_review.py` - Pydantic schemas (CardReviewCreate, CardReviewResponse)
- [ ] `routers/card_review.py` - New router with POST /vocabulary/card-review/ endpoint
- [ ] `tests/factories.py` - Add CardReviewFactory
- [ ] `models/__init__.py` - Export CardReview
- [ ] `main.py` - Include new router (if needed)

### Tests

- [ ] Unit tests for CardReview model creation
- [ ] Unit tests for CardReview schema validation
- [ ] Integration tests for POST /vocabulary/card-review/ endpoint
- [ ] Tests for first review initialization
- [ ] Tests for subsequent reviews
- [ ] Tests for failed reviews (rating=0)
- [ ] Tests for invalid inputs (invalid rating, non-existent card)
- [ ] Tests for edge cases

### Documentation

- [ ] Docstrings for all new functions and classes
- [ ] Update README.md if new endpoint patterns introduced
- [ ] Module-level docstrings

---

## Actual Prompt

**IMPORTANT: This is the exact prompt that will be used to drive implementation. All implementation work must follow this structured prompt.**

```
IMPLEMENT GitHub issue #59: Create card review model and review endpoint

CONTEXT:
- Project: French Language Coach (FastAPI backend, SQLAlchemy async, Pydantic schemas)
- Existing Card model in models/card.py has basic SR fields
- Existing POST /vocabulary/review/ endpoint uses ease 1-4
- Issue #59 requests separate CardReview model and endpoint with rating 0-3
- Current SM-2 algorithm implementation available in routers/vocabulary.py:48-88

REQUIRED FILES TO CREATE/MODIFY:
1. models/card_review.py - CardReview model
2. schemas/card_review.py - Pydantic schemas
3. routers/card_review.py - New router with POST endpoint
4. models/__init__.py - Export CardReview
5. tests/factories.py - Add CardReviewFactory
6. tests/test_card_review.py - Comprehensive tests

GOAL:
Create a CardReview model and endpoint that tracks spaced repetition state for vocabulary cards.
The endpoint should accept card_id and rating (0-3) and return the next due date.

CONSTRAINTS:
- DO NOT modify existing POST /vocabulary/review/ endpoint (create new endpoint)
- New endpoint path: POST /vocabulary/card-review/
- Rating scale: 0 (Fail/Again), 1 (Hard), 2 (Good), 3 (Easy)
- Use existing SM-2 algorithm with rating mapping: rating + 1 = ease (0→1, 1→2, 2→3, 3→4)
- User authentication: NOT required (user_id is nullable)
- Test coverage: 80%+ minimum
- Follow existing code patterns exactly

MODEL REQUIREMENTS (CardReview):
- user_id: Integer, nullable (Phase 1.5 has no auth)
- card_id: Integer, foreign key to cards.id, required
- ease_factor: Float, default 2.5
- interval: Integer (days), default 1
- due_date: DateTime, required
- reps: Integer, default 0 (consecutive successful reviews)
- lapses: Integer, default 0 (number of failures)
- Inherit from BaseModel (models/base.py)
- Table name: card_reviews

SCHEMA REQUIREMENTS:
- CardReviewCreate: card_id, rating (0-3), user_id (optional)
- CardReviewResponse: success, message, next_due_date, interval, ease_factor, reps, lapses

ENDPOINT REQUIREMENTS (POST /vocabulary/card-review/):
- Accept: JSON with card_id (int), rating (0-3), user_id (optional int)
- Return: CardReviewResponse with next due date
- Status codes: 200 success, 404 card not found, 422 validation error
- Logic:
  1. Validate card exists
  2. Map rating to ease: ease = rating + 1
  3. Get or create CardReview for this card (and user if authenticated)
  4. For first review: initialize with defaults (interval=1, ease_factor=2.5, reps=0, lapses=0)
  5. For subsequent reviews: update using SM-2 algorithm
  6. Update due_date = now + interval days
  7. Update reps: increment on success (rating > 0), reset on fail (rating = 0)
  8. Update lapses: increment on fail (rating = 0)
  9. Return response with updated state

ALGORITHM LOGIC:
Use existing calculate_sm2() function from routers/vocabulary.py with mapping:
- ease = rating + 1  (so rating 0-3 maps to ease 1-4)
- On rating=0 (fail/Again): reps = 0, lapses += 1
- On rating>=1: reps += 1, lapses unchanged

ACCEPTANCE CRITERIA:
- [ ] Model with all fields (user_id, card_id, ease_factor, interval, due_date, reps, lapses)
- [ ] Review endpoint updates state
- [ ] Returns next due date
- [ ] Handles new cards (first review)

TESTS REQUIRED:
- Test first review initialization
- Test subsequent review with rating 3 (Easy) - interval should increase
- Test failed review with rating 0 (Again) - interval reset to 1, lapses increment
- Test invalid rating (< 0 or > 3) - return 422
- Test non-existent card - return 404
- Test successful reviews with ratings 1 and 2
- Test that user_id is nullable
- Test that due_date is properly calculated
- Test that reps and lapses are updated correctly

DELIVERABLES:
1. models/card_review.py
2. schemas/card_review.py
3. routers/card_review.py
4. tests/factories.py (updated)
5. models/__init__.py (updated)
6. tests/test_card_review.py
7. All tests must pass at 80%+ coverage

EXAMPLES:
Example 1: First review
  Input: {"card_id": 1, "rating": 2}
  Current state: No CardReview exists
  Expected: Create CardReview with ease_factor=2.5, interval=1, reps=1, lapses=0, due_date=today+1
  Response: {"success": true, "next_due_date": "2026-06-16T23:45:00", "interval": 1, "ease_factor": 2.5, "reps": 1, "lapses": 0}

Example 2: Easy review (rating=3)
  Input: {"card_id": 1, "rating": 3}
  Current state: interval=1, ease_factor=2.5, reps=1
  Mapping: ease = 3 + 1 = 4
  SM-2: new_interval = 1 * new_ease_factor, new_ease_factor ≈ 2.5 (calculated)
  Expected: interval increases, ease_factor updated, reps=2, lapses=0

Example 3: Failed review (rating=0)
  Input: {"card_id": 1, "rating": 0}
  Current state: interval=5, ease_factor=2.5, reps=3, lapses=0
  Mapping: ease = 0 + 1 = 1
  SM-2: new_interval = 1 (reset), new_ease_factor updated
  Expected: interval=1, reps=0, lapses=1

IMPLEMENTATION NOTES:
- Import calculate_sm2 from routers.vocabulary or duplicate the logic
- Use datetime.utcnow() for timestamps (matching existing BaseModel)
- Use AsyncSession from database.py
- Follow exact import patterns from existing code
- Match docstring style from existing models/routers
- Use appropriate SQLAlchemy types (Integer, Float, DateTime, ForeignKey)
```

---

## AI Response

[To be captured after implementation]

---

## Human Review Notes

[To be completed after implementation and review]

### Changes Made
- [ ] List any changes made to AI-generated code
- [ ] Document reasons for changes

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [ ] List any issues found and their resolutions

---

## Verification

- [ ] All acceptance criteria from issue #59 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
