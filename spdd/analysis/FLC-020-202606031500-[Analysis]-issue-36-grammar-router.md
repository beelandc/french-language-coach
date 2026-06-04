# SPDD Analysis: Grammar Router with 3 Endpoints

**GitHub Issue**: #36
**Issue Title**: 2.5: Create grammar router with 3 endpoints
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/36
**Artifact ID**: FLC-020-202606031500
**Created**: 2026-06-03 15:00
**Author**: Mistral Vibe

---

## Original Business Requirement

From GitHub Issue #36:

### Description
Implement REST endpoints for grammar content.

### Endpoints
- GET /grammar/lessons/ - List all lessons with filtering
- GET /grammar/lessons/{id} - Get specific lesson
- GET /grammar/reference/ - Search reference guide

### Acceptance Criteria
- [ ] All endpoints implemented
- [ ] Proper error handling (404, etc.)
- [ ] Pagination support for list endpoints
- [ ] Filtering by topic and difficulty

---

## Background

This feature is part of **Phase 2 - Grammar Mastery** as outlined in VISION.md. The grammar router will expose the existing grammar lesson and reference data (created in issues #28, #30, #32, and #34) via RESTful API endpoints, enabling the frontend to display and search grammar content.

The grammar data already exists:
- **20+ grammar lessons** in `data/grammar_lessons/*.json` (Issue #30)
- **50+ grammar reference entries** in `data/grammar/reference/*.json` (Issue #32)
- **Grammar lesson schemas** in `schemas/grammar_lesson.py` (Issue #28)
- **Grammar reference schemas** in `schemas/grammar_reference.py` (Issue #32)
- **Exercise templates** in `data/grammar/exercises/*.json` (Issue #34)

This router will provide the API layer to serve this data to the frontend React components.

---

## Business Value

- Enables frontend to display grammar lessons to users
- Provides search functionality for grammar reference guide
- Supports filtering lessons by topic and difficulty for personalized learning
- Maintains consistency with existing API patterns (sessions router)
- Critical dependency for Phase 2 completion

---

## Scope In

### Endpoints to Implement
1. **GET /grammar/lessons/** - List all grammar lessons with pagination and filtering
   - Filter by `topic` (query parameter)
   - Filter by `difficulty` (query parameter: beginner, intermediate, advanced)
   - Pagination via `page` and `per_page` parameters

2. **GET /grammar/lessons/{id}** - Get a specific grammar lesson by ID
   - Return full lesson content with sections
   - Proper 404 handling if lesson not found

3. **GET /grammar/reference/** - Search grammar reference entries
   - Search by `q` (query string) for term matching
   - Filter by `category` (query parameter)
   - Filter by `difficulty` (query parameter)
   - Pagination via `page` and `per_page` parameters

### Supporting Code
- Response schemas for each endpoint
- Helper functions to load and filter grammar data from JSON files
- Error handling consistent with existing patterns

---

## Scope Out

- **Frontend components** - Will be implemented in separate issues
- **Database models** - Grammar data is stored in JSON files, not database
- **Write operations** - No POST/PUT/DELETE endpoints (data is static)
- **Authentication** - Not required for Phase 2
- **Caching** - Not required for initial implementation
- **Exercise endpoints** - Only lesson and reference endpoints for this issue

---

## Acceptance Criteria (ACs)

### AC-1: All endpoints implemented
**Given** The API is running
**When** I call GET /grammar/lessons/
**Then** I receive a list of all grammar lessons with pagination metadata

**Given** The API is running
**When** I call GET /grammar/lessons/{id} with a valid ID
**Then** I receive the full lesson content

**Given** The API is running
**When** I call GET /grammar/reference/
**Then** I receive a list of reference entries

### AC-2: Proper error handling
**Given** The API is running
**When** I call GET /grammar/lessons/{id} with an invalid ID
**Then** I receive a 404 status code with a descriptive error message

**Given** The API is running
**When** I call GET /grammar/lessons/?page=9999
**Then** I receive a 404 status code if page exceeds total pages

### AC-3: Pagination support for list endpoints
**Given** The API is running
**When** I call GET /grammar/lessons/?page=2&per_page=10
**Then** I receive page 2 with up to 10 lessons and correct pagination metadata

**Given** The API is running
**When** I call GET /grammar/reference/?page=1&per_page=20
**Then** I receive page 1 with up to 20 reference entries and correct pagination metadata

### AC-4: Filtering by topic and difficulty
**Given** The API is running
**When** I call GET /grammar/lessons/?topic=Verbs&difficulty=beginner
**Then** I receive only beginner-level lessons about verbs

**Given** The API is running
**When** I call GET /grammar/reference/?category=Verbs
**Then** I receive only reference entries in the Verbs category

**Given** The API is running
**When** I call GET /grammar/reference/?q=subjonctif
**Then** I receive reference entries matching "subjonctif" in term, definition, or examples

---

## Domain Concept Identification

### Existing Concepts (from codebase)

| Concept | Description | Location |
|---------|-------------|----------|
| **APIRouter** | FastAPI router pattern | `routers/sessions.py` |
| **Pagination** | Pagination pattern with page/per_page | `routers/sessions.py` |
| **GrammarLesson** | Pydantic model for lesson validation | `schemas/grammar_lesson.py` |
| **GrammarReference** | Pydantic model for reference validation | `schemas/grammar_reference.py` |
| **DifficultyLevel** | Enum for difficulty levels | `schemas/grammar_lesson.py` |
| **GrammarReferenceCategory** | Enum for reference categories | `schemas/grammar_reference.py` |
| **load_lessons_from_directory** | Helper to load lesson files | `schemas/grammar_lesson.py` |
| **load_references_from_directory** | Helper to load reference files | `schemas/grammar_reference.py` |
| **Error Handling** | HTTPException pattern | `routers/sessions.py` |

### New Concepts Required

| Concept | Description |
|---------|-------------|
| **GrammarRouter** | FastAPI router for /grammar/* endpoints |
| **LessonListResponse** | Response schema for lesson listing |
| **LessonResponse** | Response schema for single lesson |
| **ReferenceListResponse** | Response schema for reference listing |
| **ReferenceResponse** | Response schema for single reference entry |
| **LessonFilterParams** | Query parameters for lesson filtering |
| **ReferenceFilterParams** | Query parameters for reference filtering |

---

## Strategic Approach

### Solution Direction

1. **Create Response Schemas** (in `schemas/`)
   - Define Pydantic models for each endpoint's response
   - Reuse existing GrammarLesson and GrammarReference models
   - Add pagination metadata where applicable

2. **Create Router** (`routers/grammar.py`)
   - Implement GET /grammar/lessons/ with filtering and pagination
   - Implement GET /grammar/lessons/{id} with error handling
   - Implement GET /grammar/reference/ with search and filtering
   - Load data from JSON files using existing helper functions

3. **Integrate Router** (in `routers/__init__.py` and `main.py`)
   - Import grammar_router
   - Include router in main app
   - Update __init__.py exports

4. **Create Tests** (in `tests/`)
   - Unit tests for schemas
   - Integration tests for each endpoint
   - Test error handling and edge cases
   - Achieve 80%+ coverage

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **JSON file loading vs Database** | JSON files: simpler, no migration needed, but slower for large datasets. DB: more complex, requires migration, but faster queries. | Use JSON files since grammar data is static and Phase 2 requirement |
| **Cache loaded data** | Caching: faster subsequent requests, but uses memory. No caching: slower but always fresh. | Don't cache initially; optimize later if needed |
| **Case-sensitive search** | Case-sensitive: more precise. Case-insensitive: more user-friendly. | Use case-insensitive search for better UX |
| **Partial vs exact matching** | Partial: more results, may be noisy. Exact: precise but may miss relevant results. | Use partial matching (substring) for search queries |

### Alternatives Considered

- **Alternative 1**: Store grammar data in database - Rejected because data is static and JSON files already exist
- **Alternative 2**: Create a single /grammar/search endpoint - Rejected because issue specifies 3 separate endpoints
- **Alternative 3**: Implement caching with TTL - Deferred to future optimization

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Search scope for /grammar/reference/ | Should search match term only, or also definition and examples? | Search term, definition, examples, and common_pitfalls |
| Filter combination logic | Should filters use AND or OR logic? | Use AND logic (all filters must match) |
| Pagination default for reference | What should default per_page be? | Use 10 (consistent with sessions) |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Empty lesson directory | No lessons exist | Return empty list with pagination total=0 |
| Empty reference directory | No references exist | Return empty list with pagination total=0 |
| Invalid page number | Page > total_pages | Return 404 with error message |
| Invalid difficulty | Not beginner/intermediate/advanced | Return 400 with error message |
| Invalid category | Not a valid GrammarReferenceCategory | Return 400 with error message |
| Lesson ID not found | Requested lesson doesn't exist | Return 404 with error message |
| Special characters in search | User searches for "é" or "ç" | Handle UTF-8 encoding properly |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Performance with many files | Loading 20+ lessons and 50+ references on each request | Use efficient file loading; defer caching to future |
| JSON file corruption | Invalid JSON in data files | Use Pydantic validation; return 500 with clear error |
| File system permissions | Cannot read JSON files | Ensure proper permissions; use Path library |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-1 | All endpoints implemented | Yes | |
| AC-2 | Proper error handling | Yes | Need to handle 404, 400 |
| AC-3 | Pagination support | Yes | Follow existing pattern from sessions |
| AC-4 | Filtering by topic and difficulty | Yes | Need to implement for both endpoints |

**AC Coverage Summary**: All 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Response schemas must be documented
- Endpoints must follow REST conventions
- Code must follow existing patterns
- Tests must achieve 80%+ coverage

---

## REASONS Canvas

### Requirements
From GitHub issue #36:
- Implement REST endpoints for grammar content
- GET /grammar/lessons/ - List all lessons with filtering
- GET /grammar/lessons/{id} - Get specific lesson
- GET /grammar/reference/ - Search reference guide
- All endpoints implemented
- Proper error handling (404, etc.)
- Pagination support for list endpoints
- Filtering by topic and difficulty

### Examples

**Example 1: List all lessons**
- Request: GET /grammar/lessons/
- Response: 200 with list of all lessons, pagination metadata

**Example 2: Get specific lesson**
- Request: GET /grammar/lessons/articles
- Response: 200 with full lesson content

**Example 3: Get non-existent lesson**
- Request: GET /grammar/lessons/nonexistent
- Response: 404 with error detail

**Example 4: List lessons with filters**
- Request: GET /grammar/lessons/?topic=Nouns&difficulty=beginner&page=1&per_page=10
- Response: 200 with filtered lessons

**Example 5: Search reference**
- Request: GET /grammar/reference/?q=subjonctif&category=Verbs
- Response: 200 with matching reference entries

### Architecture

**Existing Patterns to Follow:**
- Router pattern from `routers/sessions.py`
- Schema pattern from `schemas/session.py`
- Error handling with HTTPException
- Pagination pattern with PaginationInfo
- Query parameters with Query() and Optional[]
- Path parameters with {id}

**File Structure:**
```
routers/
└── grammar.py          # New router file
schemas/
├── grammar_lesson.py   # Existing - reuse GrammarLesson model
├── grammar_reference.py# Existing - reuse GrammarReference model
└── grammar.py          # New - response schemas for endpoints
data/
├── grammar_lessons/    # Existing - lesson JSON files
└── grammar/reference/   # Existing - reference JSON files
```

### Standards

**Coding Standards:**
- Follow PEP 8 style guide
- Match existing codebase patterns
- Use type hints consistently
- Include docstrings for public functions
- Use async/await for file I/O (if needed)

**Testing Standards:**
- 80% minimum coverage per module
- Unit tests for schemas
- Integration tests for endpoints
- Test error cases and edge cases
- Use existing conftest.py fixtures

**Documentation Standards:**
- Update README.md with new endpoints
- Add docstrings to new functions
- Include OpenAPI docs via FastAPI

### Omissions

**Explicitly Out of Scope:**
- Frontend implementation
- Database storage (using JSON files)
- Write operations (POST/PUT/DELETE)
- Authentication/authorization
- Caching mechanism
- Exercise endpoints (only in Issue #34, but not in this issue's scope)
- Real-time updates

### Notes

**Implementation Hints:**
- Use `schemas/grammar_lesson.py:load_lessons_from_directory()` to load lessons
- Use `schemas/grammar_reference.py:load_references_from_directory()` to load references
- Follow pagination pattern from `routers/sessions.py:list_sessions()`
- Use existing HTTPException pattern for error handling
- Reuse DifficultyLevel and GrammarReferenceCategory enums

**Reference Files:**
- `routers/sessions.py` - Router pattern and pagination
- `schemas/session.py` - Response schema patterns
- `schemas/grammar_lesson.py` - Lesson data model
- `schemas/grammar_reference.py` - Reference data model
- `data/grammar_lessons/*.json` - Lesson data files
- `data/grammar/reference/*.json` - Reference data files

### Solutions

**Reference Implementations:**
- Sessions router: `routers/sessions.py`
- Schema patterns: `schemas/session.py`
- Pagination: `routers/sessions.py:list_sessions()`
- Error handling: `routers/sessions.py:get_session()`

**Patterns to Follow:**
1. Create router with APIRouter(prefix="/grammar", tags=["grammar"])
2. Use Query() for optional query parameters
3. Use Path() for path parameters
4. Return Pydantic models for responses
5. Raise HTTPException for errors
6. Use async def for endpoint functions

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html)*
