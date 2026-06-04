# SPDD Analysis: Lesson Progress Model and Tracking Endpoints

**GitHub Issue**: #38
**Issue Title**: 2.6+2.7: Create lesson progress model and tracking endpoints
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/38
**Artifact ID**: FLC-021-202606040858
**Created**: 2026-06-04 08:58
**Author**: Mistral Vibe

---

## Original Business Requirement

Track user progress through grammar lessons.

## Model: LessonProgress
- user_id (nullable for Phase 1.5)
- lesson_id
- completed (boolean)
- score (0-100)
- last_accessed (datetime)
- time_spent (seconds)

## Endpoints
- GET /grammar/progress/ - List user progress
- POST /grammar/progress/ - Record progress

## Acceptance Criteria
- [ ] Model created and migrated
- [ ] Progress tracking works
- [ ] Score recording works

---

## Background

This feature enables tracking user progress through grammar lessons. In Phase 1.5, user_id is nullable because user authentication is not yet implemented (see VISION.md - Phase 5 for authentication). The progress tracking will allow users to:
- See which lessons they've completed
- Track their scores on lessons
- Resume lessons where they left off
- View time spent on each lesson

This is part of the grammar learning feature set (Phase 2) and builds on the existing grammar lessons infrastructure (issue #30, #32).

## Business Value

- **User Engagement**: Users can track their learning progress, increasing motivation
- **Personalization**: Enables future features like recommended lessons based on progress
- **Analytics**: Provides data on lesson difficulty and user performance
- **Phase 2 Completion**: Required for grammar learning workflow (2.6, 2.7 in VISION.md)

---

## Scope In

- [ ] SQLAlchemy model `LessonProgress` in `models/lesson_progress.py`
- [ ] Database migration for the new table
- [ ] Pydantic schemas for request/response validation
- [ ] FastAPI router endpoints in `routers/grammar_progress.py`
- [ ] GET /grammar/progress/ endpoint to list progress records
- [ ] POST /grammar/progress/ endpoint to create/record progress
- [ ] Unit tests for model, schemas, and endpoints (80%+ coverage)
- [ ] Integration with existing grammar lesson infrastructure
- [ ] Update `main.py` to include the new router
- [ ] Update `models/__init__.py` to export LessonProgress
- [ ] Update `schemas/__init__.py` to export new schemas
- [ ] Update README.md with new API endpoints

## Scope Out

- [ ] User authentication (Phase 5)
- [ ] Progress analytics dashboard (future enhancement)
- [ ] Lesson recommendations based on progress (future enhancement)
- [ ] Progress visualization/charting (future enhancement)
- [ ] Bulk operations on progress records (not in acceptance criteria)
- [ ] Pagination for GET /grammar/progress/ (not specified in requirements)
- [ ] DELETE or PUT endpoints (not in acceptance criteria)

---

## Acceptance Criteria (ACs)

1. **AC1**: Model created and migrated
   **Given** The application starts
   **When** Database tables are created
   **Then** LessonProgress table exists with all required fields

2. **AC2**: Progress tracking works
   **Given** A lesson_id
   **When** POST /grammar/progress/ is called with progress data
   **Then** The progress record is stored in the database

3. **AC3**: Score recording works
   **Given** A completed lesson with a score
   **When** POST /grammar/progress/ is called with score data
   **Then** The score is stored and can be retrieved via GET /grammar/progress/

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **GrammarLesson** (`schemas/grammar_lesson.py`): Domain model for grammar lessons, loaded from JSON files in `data/grammar_lessons/`. Has fields: id (string), title, topic, difficulty, sections. Lessons are identified by string IDs like "articles", "conditional", etc.
- **Session** (`models/session.py`): SQLAlchemy model for conversation sessions with fields: id, scenario_id, difficulty, created_at, ended_at, messages, feedback. Uses JSON fields for complex data.
- **AsyncSession** (`database.py`): SQLAlchemy async session configuration using aiosqlite for SQLite.
- **APIRouter** (`routers/sessions.py`, `routers/grammar.py`): FastAPI routers with async endpoints using dependency injection for database sessions.

### New Concepts Required

- **LessonProgress** (`models/lesson_progress.py`): SQLAlchemy model tracking user progress on grammar lessons. Fields:
  - `id`: Primary key (auto-incrementing integer)
  - `user_id`: Foreign key to users table (nullable for Phase 1.5)
  - `lesson_id`: String field referencing GrammarLesson.id
  - `completed`: Boolean indicating if lesson is completed
  - `score`: Integer (0-100) representing user's score
  - `last_accessed`: DateTime when lesson was last accessed
  - `time_spent`: Integer representing seconds spent on lesson
  - `created_at`: DateTime when progress record was created
  - `updated_at`: DateTime when progress record was last updated

- **Progress Schemas** (`schemas/lesson_progress.py`): Pydantic models for validation:
  - `LessonProgressCreate`: Schema for POST request body
  - `LessonProgressResponse`: Schema for GET response items
  - `LessonProgressListResponse`: Schema for list endpoint response

### Key Business Rules

- **Rule 1**: score must be between 0 and 100 (inclusive)
- **Rule 2**: time_spent must be non-negative
- **Rule 3**: user_id is nullable (Phase 1.5 has no authentication)
- **Rule 4**: lesson_id must correspond to an existing grammar lesson
- **Rule 5**: When a progress record is updated, updated_at timestamp is refreshed
- **Rule 6**: Multiple progress records can exist for the same lesson_id + user_id (allowing re-attempts)

---

## Strategic Approach

### Solution Direction

1. **Create SQLAlchemy Model**: Define LessonProgress model following existing patterns from Session model
2. **Create Pydantic Schemas**: Define request/response schemas following patterns from schemas/session.py
3. **Create Router**: Implement FastAPI router with GET and POST endpoints following patterns from routers/sessions.py
4. **Database Migration**: Use SQLAlchemy's `create_all()` (existing pattern) or Alembic (if configured)
5. **Integration**: Register router in main.py and update __init__ files
6. **Testing**: Create pytest tests with factory-boy fixtures following test_sessions.py patterns

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Use string for lesson_id vs integer | String matches existing GrammarLesson.id format; Integer would require separate ID mapping | **String** - matches existing lesson IDs like "articles", "conditional" |
| user_id nullable vs required | Nullable allows Phase 1.5 use without auth; Required enforces data integrity | **Nullable** - aligns with Phase 1.5 scope |
| Multiple records vs single record per lesson-user | Multiple allows re-attempts and history; Single is simpler | **Multiple** - more flexible, allows tracking improvement over time |
| Separate router vs extend grammar.py | Separate keeps concerns isolated; Extending reduces files | **Separate router** - better separation, can be merged later if needed |
| Include created_at/updated_at timestamps | Adds auditing capability; Slightly more storage | **Include both** - standard practice for tracking records |

### Alternatives Considered

- **Alternative 1**: Use Alembic for migrations - Rejected because existing codebase uses SQLAlchemy's `create_all()` in main.py startup
- **Alternative 2**: Add endpoints to existing grammar.py router - Rejected to maintain separation of concerns and easier testing
- **Alternative 3**: Use integer IDs with auto-increment only - Rejected because lesson_id must reference existing lesson JSON files
- **Alternative 4**: Enforce unique constraint on (user_id, lesson_id) - Rejected because we want to allow multiple attempts

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| No pagination specified for GET /grammar/progress/ | Should we implement pagination? | **No pagination for now** - not in acceptance criteria, can add later |
| No authentication in Phase 1.5 | How to associate progress with users? | **user_id nullable** - allows anonymous tracking, associate later |
| No filter parameters specified | What filters should GET support? | **Filter by lesson_id, user_id, completed** - most useful filters |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| lesson_id doesn't exist | Data integrity | **Accept and store** - lessons are loaded from files, validation would require file system access |
| score < 0 or > 100 | Invalid data | **Validate and reject** - return 400 error |
| time_spent < 0 | Invalid data | **Validate and reject** - return 400 error |
| Duplicate lesson_id + user_id | Multiple attempts | **Allow** - create new record each time |
| user_id = None (null) | Phase 1.5 usage | **Allow** - nullable field |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| SQLite async issues with aiosqlite | Database operations may fail | Use existing database.py configuration (already works for Session) |
| Schema validation mismatches | Frontend/backend mismatches | Use same Pydantic schemas for both request and response |
| Performance with many progress records | Slow queries | Add indexes on lesson_id and user_id |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Model created and migrated | Yes | Will use existing `create_all()` pattern |
| AC2 | Progress tracking works | Yes | POST endpoint will create records |
| AC3 | Score recording works | Yes | score field will be stored and returned |

**AC Coverage Summary**: 3 of 3 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Proper error handling (400 for invalid input, 404 for not found)
- Response formats matching Pydantic schemas
- Async database operations
- 80%+ test coverage

---

## REASONS Canvas

### Requirements
From GitHub issue #38 acceptance criteria:
- Model created and migrated
- Progress tracking works
- Score recording works

### Examples

**POST /grammar/progress/**
```json
// Request
{
  "lesson_id": "articles",
  "completed": true,
  "score": 85,
  "time_spent": 300
}

// Response (201 Created)
{
  "id": 1,
  "user_id": null,
  "lesson_id": "articles",
  "completed": true,
  "score": 85,
  "last_accessed": "2026-06-04T08:58:00Z",
  "time_spent": 300,
  "created_at": "2026-06-04T08:58:00Z",
  "updated_at": "2026-06-04T08:58:00Z"
}
```

**GET /grammar/progress/**
```json
// Response (200 OK)
{
  "progress_records": [
    {
      "id": 1,
      "user_id": null,
      "lesson_id": "articles",
      "completed": true,
      "score": 85,
      "last_accessed": "2026-06-04T08:58:00Z",
      "time_spent": 300,
      "created_at": "2026-06-04T08:58:00Z",
      "updated_at": "2026-06-04T08:58:00Z"
    }
  ]
}
```

**Edge Case: Invalid Score**
```json
// Request
{
  "lesson_id": "articles",
  "completed": true,
  "score": 150,
  "time_spent": 300
}

// Response (400 Bad Request)
{
  "detail": "score must be between 0 and 100"
}
```

### Architecture

Existing codebase structure:
- **Database**: Async SQLAlchemy with aiosqlite (`database.py`)
- **Models**: SQLAlchemy ORM models in `models/` directory
- **Schemas**: Pydantic models in `schemas/` directory for validation
- **Routers**: FastAPI routers in `routers/` directory with dependency injection
- **Main**: `main.py` registers routers and handles startup

New components to add:
- `models/lesson_progress.py`: SQLAlchemy model
- `schemas/lesson_progress.py`: Pydantic schemas
- `routers/grammar_progress.py`: FastAPI router with endpoints

### Standards

- **Coding**: PEP 8 style guide, match existing codebase patterns
- **Testing**: pytest with 80%+ coverage, use factory-boy for fixtures
- **Documentation**: Docstrings for all public functions, update README.md
- **Code Review**: All PRs require approval, tests must pass

### Omissions

Explicitly out of scope:
- User authentication (Phase 5)
- Pagination for list endpoint (not in requirements)
- DELETE or PUT endpoints (not in requirements)
- Progress analytics/visualization
- Bulk operations
- Caching

### Notes

Implementation hints and context:
- Lesson IDs are strings matching JSON filenames in `data/grammar_lessons/` (e.g., "articles", "conditional")
- Follow existing model patterns from `models/session.py`
- Follow existing router patterns from `routers/sessions.py`
- Use async/await for all database operations
- Use SQLAlchemy 2.0 style queries (select(), not session.query())
- Add indexes on frequently filtered fields (lesson_id, user_id)

### Solutions

Reference implementations and patterns to follow:

1. **Model Pattern**: See `models/session.py` for:
   - SQLAlchemy Column definitions
   - JSON field handling with properties
   - Helper methods
   - Base class inheritance

2. **Router Pattern**: See `routers/sessions.py` for:
   - FastAPI endpoint definitions
   - AsyncSession dependency injection
   - CRUD operations
   - Error handling
   - Response models

3. **Schema Pattern**: See `schemas/session.py` for:
   - Pydantic BaseModel definitions
   - Field types and validation
   - Optional fields
   - Response vs Create schemas

4. **Testing Pattern**: See `tests/test_sessions.py` (if exists) or create new tests following pytest best practices

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
