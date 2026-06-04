# SPDD Prompt: Grammar Router with 3 Endpoints

**GitHub Issue**: #36
**Issue Title**: 2.5: Create grammar router with 3 endpoints
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/36
**Artifact ID**: FLC-020-202606031530
**Created**: 2026-06-03 15:30
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-020-202606031500-[Analysis]-issue-36-grammar-router.md`

---

## Context

### Current Codebase State

The French Language Coach project has completed Phase 1 (Conversation Practice) and is now in Phase 2 (Grammar Mastery). The following components are already implemented:

1. **Backend**: FastAPI with async SQLAlchemy, existing routers for sessions, messages, and feedback
2. **Grammar Data**: 
   - 20+ grammar lessons in `data/grammar_lessons/*.json` (Issue #30)
   - 50+ grammar reference entries in `data/grammar/reference/*.json` (Issue #32)
   - Grammar lesson schema in `schemas/grammar_lesson.py` (Issue #28)
   - Grammar reference schema in `schemas/grammar_reference.py` (Issue #32)
3. **Patterns**: Router pattern in `routers/sessions.py`, pagination pattern, error handling with HTTPException

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `routers/sessions.py` | Session router pattern | `list_sessions()` with pagination, `get_session()` with 404 handling |
| `routers/__init__.py` | Router exports | Imports and exports all routers |
| `main.py` | App entry point | Includes routers, mounts static files |
| `schemas/session.py` | Session schemas | `SessionListResponse`, `SessionSummary`, `PaginationInfo` |
| `schemas/grammar_lesson.py` | Lesson schemas | `GrammarLesson`, `Section`, `DifficultyLevel`, `load_lessons_from_directory()` |
| `schemas/grammar_reference.py` | Reference schemas | `GrammarReference`, `GrammarReferenceCategory`, `load_references_from_directory()` |
| `data/grammar_lessons/*.json` | Lesson data | JSON files with id, title, topic, difficulty, sections |
| `data/grammar/reference/*.json` | Reference data | JSON files with id, term, category, difficulty, definition, examples |
| `tests/conftest.py` | Test fixtures | `client`, `test_db` fixtures |
| `tests/test_sessions_listing.py` | Test patterns | Pagination and filtering test examples |

### Existing Patterns

1. **Router Pattern**: Each router is created with `APIRouter(prefix="/...", tags=["..."])`
2. **Pagination**: Uses `page` and `per_page` Query parameters with defaults (page=1, per_page=10)
3. **Error Handling**: Uses `HTTPException(status_code=404, detail="...")`
4. **Schemas**: Pydantic models for request/response validation
5. **Query Parameters**: Uses `Query()` from fastapi with validation
6. **Path Parameters**: Uses `Path()` for required path parameters

---

## Goal

**Primary Objective**: Implement a FastAPI router (`routers/grammar.py`) with three endpoints for serving grammar content:

1. **GET /grammar/lessons/** - List all grammar lessons with pagination and filtering
2. **GET /grammar/lessons/{id}** - Get a specific grammar lesson by ID
3. **GET /grammar/reference/** - Search grammar reference entries with filtering

**Secondary Objectives**:
- Create response schemas for each endpoint
- Integrate the router into the main application
- Ensure proper error handling (404 for not found, 400 for invalid parameters)
- Implement pagination for list endpoints
- Implement filtering for lessons (topic, difficulty) and references (category, difficulty, search query)

---

## Constraints

### Architecture Constraints
- Must follow existing FastAPI router pattern from `routers/sessions.py`
- Must use existing Pydantic models (`GrammarLesson`, `GrammarReference`)
- Must load data from JSON files in `data/grammar_lessons/` and `data/grammar/reference/`
- Must use existing helper functions (`load_lessons_from_directory`, `load_references_from_directory`)
- Must not modify existing files except `routers/__init__.py` and `main.py` for integration
- Must not introduce database models (data is static in JSON files)
- Must use the same pagination pattern as sessions router

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must match existing codebase patterns (naming, structure, etc.)
- Must use type hints consistently
- Must include docstrings for public functions
- Must handle edge cases gracefully

### Testing Constraints
- Must create tests in `tests/` directory
- Must use existing conftest.py fixtures (`client`, `test_db`)
- Must achieve 80%+ test coverage for new code
- Must test all acceptance criteria from issue #36
- Must test error cases (404, 400)

### Acceptance Criteria

From GitHub Issue #36:
- [ ] All endpoints implemented
- [ ] Proper error handling (404, etc.)
- [ ] Pagination support for list endpoints
- [ ] Filtering by topic and difficulty

---

## Examples

### Input/Output Examples

#### Endpoint 1: GET /grammar/lessons/

**Example 1.1: List all lessons (default pagination)**
- Request: `GET /grammar/lessons/`
- Response: 200
```json
{
  "lessons": [
    {
      "id": "articles",
      "title": "French Articles",
      "topic": "Nouns and Adjectives",
      "difficulty": "beginner"
    },
    {
      "id": "present-tense-regular",
      "title": "Present Tense: Regular Verbs",
      "topic": "Verbs",
      "difficulty": "beginner"
    }
  ],
  "pagination": {
    "total": 20,
    "page": 1,
    "per_page": 10,
    "total_pages": 2
  }
}
```

**Example 1.2: List lessons with filters and pagination**
- Request: `GET /grammar/lessons/?topic=Verbs&difficulty=beginner&page=2&per_page=5`
- Response: 200
```json
{
  "lessons": [
    {
      "id": "present-tense-regular",
      "title": "Present Tense: Regular Verbs",
      "topic": "Verbs",
      "difficulty": "beginner"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 2,
    "per_page": 5,
    "total_pages": 1
  }
}
```

#### Endpoint 2: GET /grammar/lessons/{id}

**Example 2.1: Get specific lesson (success)**
- Request: `GET /grammar/lessons/articles`
- Response: 200
```json
{
  "id": "articles",
  "title": "French Articles",
  "topic": "Nouns and Adjectives",
  "difficulty": "beginner",
  "sections": [
    {
      "title": "Introduction to Articles",
      "content": "Articles are words that precede nouns...",
      "examples": ["le livre", "un livre", "du pain"]
    }
  ]
}
```

**Example 2.2: Get non-existent lesson**
- Request: `GET /grammar/lessons/nonexistent`
- Response: 404
```json
{
  "detail": "Lesson not found: nonexistent"
}
```

#### Endpoint 3: GET /grammar/reference/

**Example 3.1: List all references (default)**
- Request: `GET /grammar/reference/`
- Response: 200
```json
{
  "references": [
    {
      "id": "definite-articles",
      "term": "Definite Articles",
      "category": "Articles",
      "difficulty": "beginner",
      "definition": "Specific articles: le, la, les, l'..."
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "per_page": 10,
    "total_pages": 5
  }
}
```

**Example 3.2: Search references with query and filters**
- Request: `GET /grammar/reference/?q=subjonctif&category=Verbs&difficulty=intermediate`
- Response: 200
```json
{
  "references": [
    {
      "id": "subjunctive-mood",
      "term": "Le Subjonctif",
      "category": "Verbs",
      "difficulty": "intermediate",
      "definition": "The subjunctive mood expresses...",
      "examples": ["Il faut que je parte"],
      "common_pitfalls": ["Don't confuse with indicative"],
      "related_terms": ["indicative", "conditional"]
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

1. **Empty directories**: Return empty list with pagination total=0
2. **Invalid page**: Page > total_pages → Return 404
3. **Invalid difficulty**: Not beginner/intermediate/advanced → Return 400
4. **Invalid category**: Not a valid GrammarReferenceCategory → Return 400
5. **Search with no matches**: Return empty list with pagination total=0
6. **Special characters in search**: Handle UTF-8 properly (é, ç, à)

---

## Deliverables

### Code Changes

1. **New File: `schemas/grammar.py`**
   - Response schemas for grammar endpoints
   - `LessonSummary` - Summary for lesson listing (id, title, topic, difficulty)
   - `LessonResponse` - Full lesson response (reuses GrammarLesson or extends it)
   - `ReferenceSummary` - Summary for reference listing
   - `ReferenceResponse` - Full reference response (reuses GrammarReference or extends it)
   - `LessonListResponse` - Paginated lesson list response
   - `ReferenceListResponse` - Paginated reference list response
   - `PaginationInfo` can be reused from `schemas.session` or duplicated

2. **New File: `routers/grammar.py`**
   - FastAPI router with prefix="/grammar", tags=["grammar"]
   - `list_lessons()` - GET /grammar/lessons/
   - `get_lesson()` - GET /grammar/lessons/{id}
   - `list_references()` - GET /grammar/reference/
   - Helper functions for loading and filtering data

3. **Modified File: `routers/__init__.py`**
   - Import grammar_router
   - Add to __all__ list

4. **Modified File: `main.py`**
   - Import grammar_router from routers
   - Include grammar_router in app

### Tests

1. **New File: `tests/test_grammar_router.py`**
   - Schema validation tests for new response models
   - Integration tests for each endpoint:
     - Test GET /grammar/lessons/ (all, with pagination, with filters)
     - Test GET /grammar/lessons/{id} (success, 404)
     - Test GET /grammar/reference/ (all, with pagination, with filters, with search)
   - Error handling tests (404, 400)
   - Edge case tests (empty data, invalid parameters)

### Documentation

1. **Modified File: `README.md`**
   - Add new endpoints to API Endpoints table
   - Update architecture diagram if needed

---

## Actual Prompt

This is the exact prompt that will be used to drive implementation:

```
IMPLEMENT GRAMMAR ROUTER FOR ISSUE #36

CONTEXT:
- Project: French Language Coach (FastAPI backend)
- Issue: #36 - Create grammar router with 3 endpoints
- Phase: Phase 2 (Grammar Mastery)
- Existing data: 20+ grammar lessons in data/grammar_lessons/*.json, 50+ reference entries in data/grammar/reference/*.json
- Existing schemas: GrammarLesson in schemas/grammar_lesson.py, GrammarReference in schemas/grammar_reference.py
- Pattern reference: routers/sessions.py for router structure and pagination

GOAL:
Implement a FastAPI router with these 3 endpoints:
1. GET /grammar/lessons/ - List all lessons with pagination and filtering (topic, difficulty)
2. GET /grammar/lessons/{id} - Get specific lesson by ID
3. GET /grammar/reference/ - Search reference entries with filtering (category, difficulty, search query q)

CONSTRAINTS:
- Follow existing patterns from routers/sessions.py
- Use existing GrammarLesson and GrammarReference Pydantic models
- Use existing load_lessons_from_directory() and load_references_from_directory() helpers
- Pagination: default page=1, per_page=10, max per_page=100
- Filtering: AND logic (all filters must match)
- Error handling: 404 for not found, 400 for invalid parameters
- Search: case-insensitive, partial matching on term, definition, examples, common_pitfalls for references
- Must achieve 80%+ test coverage
- Must not modify existing data files
- Must follow PEP 8 style

EXAMPLES:
1. GET /grammar/lessons/?topic=Verbs&difficulty=beginner&page=1&per_page=10
   → Returns filtered list of lessons with pagination

2. GET /grammar/lessons/articles
   → Returns full lesson content

3. GET /grammar/lessons/nonexistent
   → Returns 404 with error message

4. GET /grammar/reference/?q=subjonctif&category=Verbs
   → Returns matching reference entries

5. GET /grammar/reference/?page=9999
   → Returns 404 if page exceeds total

ACCEPTANCE CRITERIA (Issue #36):
- [ ] All endpoints implemented
- [ ] Proper error handling (404, etc.)
- [ ] Pagination support for list endpoints
- [ ] Filtering by topic and difficulty

DELIVERABLES:
1. schemas/grammar.py - Response schemas
2. routers/grammar.py - Router with 3 endpoints
3. Update routers/__init__.py - Import and export grammar_router
4. Update main.py - Include grammar_router
5. tests/test_grammar_router.py - Tests with 80%+ coverage
6. Update README.md - Document new endpoints

IMPLEMENTATION ORDER:
1. Create schemas/grammar.py with response models
2. Create routers/grammar.py with endpoints
3. Integrate into routers/__init__.py and main.py
4. Create tests/test_grammar_router.py
5. Update README.md
6. Verify all acceptance criteria

IMPORTANT: Follow the exact patterns from routers/sessions.py for:
- Router creation (APIRouter with prefix and tags)
- Pagination implementation
- Error handling (HTTPException)
- Query parameters (Query, Optional, etc.)
- Response models (use Pydantic models)
```

---

## AI Response

[To be filled after implementation]

---

## Human Review Notes

[To be filled after implementation]

### Changes Made
- [ ] List of any changes made to AI-generated code

### Quality Checks
- [ ] Code follows existing patterns from routers/sessions.py
- [ ] Tests pass at 80%+ coverage
- [ ] All acceptance criteria from issue #36 are met
- [ ] Documentation updated (README.md)
- [ ] No breaking changes introduced

### Issues Found
- [ ] List of any issues found and their resolutions

---

## Verification

- [ ] All acceptance criteria from issue #36 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated (README.md)
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
