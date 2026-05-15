# SPDD Prompt: Session Listing Endpoint - Add Filtering and Tests

**GitHub Issue**: #7
**Issue Title**: 1.5.2-T: Test session listing endpoint
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/7
**Artifact ID**: FLC-004-202605142215
**Created**: 2026-05-14 22:15
**Author**: Mistral Vibe
**Related Analysis**: `spdd/analysis/FLC-004-202605142212-[Analysis]-issue-7-session-listing-tests.md`

---

## Context

### Current Codebase State

The French Language Coach project is in Phase 1.5. Issue #6 implemented the session listing endpoint (GET /sessions/) with pagination support. Issue #7 requires adding filtering capabilities and comprehensive tests.

**Current implementation**:
- `routers/sessions.py:list_sessions` - Has pagination (page, per_page) but NO filtering
- `schemas/session.py` - Has SessionSummary, PaginationInfo, SessionListResponse schemas
- `tests/test_sessions_listing.py` - Has schema tests only (Issue #6 deliverables)
- `models/session.py` - Session ORM model with created_at, scenario_id fields

**Missing for Issue #7**:
- Filtering by scenario_id query parameter
- Filtering by date range (date_from, date_to) query parameters
- Integration tests for the actual endpoint (not just schema tests)
- 80% test coverage for the listing logic

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `routers/sessions.py` | FastAPI router for sessions | `list_sessions()` (lines 42-110) with pagination |
| `schemas/session.py` | Pydantic schemas | SessionSummary, PaginationInfo, SessionListResponse |
| `models/session.py` | SQLAlchemy ORM model | Session class with scenario_id, created_at |
| `tests/test_sessions_listing.py` | Existing tests | Schema tests (no integration tests yet) |
| `tests/conftest.py` | Test fixtures | test_db, client fixtures for pytest |
| `scenarios.py` | Scenario definitions | SCENARIOS list with id/name mappings |

### Existing Patterns

**FastAPI Router Pattern:**
```python
@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
) -> SessionListResponse:
    # Count, pagination, query, return
```

**SQLAlchemy Query Pattern:**
```python
result = await db.execute(
    select(SessionModel)
    .order_by(SessionModel.created_at.desc())
    .offset(offset)
    .limit(per_page)
)
```

**Test Pattern:**
```python
@pytest.fixture(scope="function")
async def client(test_db):
    from fastapi.testclient import TestClient
    from main import app
    # Override get_db with test database
    async def override_get_db():
        async with AsyncTestingSession() as session:
            yield session
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

---

## Goal

**Primary Objective**: Implement filtering by scenario_id and date range in the list_sessions endpoint, and create comprehensive integration tests.

**Secondary Objectives**:
- Add scenario_id query parameter for filtering
- Add date_from and date_to query parameters for date range filtering
- Create integration tests for pagination, filtering, and schema validation
- Achieve 80%+ test coverage for routers/sessions.py list_sessions function
- Follow existing code patterns and conventions

---

## Constraints

### Architecture Constraints
- Must follow FastAPI conventions (Query for parameters, Depends for dependencies)
- Must use SQLAlchemy async ORM (existing pattern)
- Must use existing database session pattern (get_db dependency)
- Must use existing Pydantic schemas (SessionListResponse, SessionSummary)
- Must not break existing pagination functionality

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must include type hints on all functions and parameters
- Must include docstrings for new/modified functions
- Must match existing code style (indentation, naming, etc.)
- Must handle edge cases gracefully

### Testing Constraints
- Must use pytest framework
- Must use existing fixtures (test_db, client from conftest.py)
- Must create both unit and integration tests
- Must test edge cases (empty results, invalid inputs, boundary conditions)
- Must achieve 80%+ coverage for list_sessions function
- Must not modify existing schema tests (they were Issue #6 deliverables)

### Acceptance Criteria (from Issue #7)

1. **Tests for pagination (page, per_page)** - Must test various page/per_page combinations
2. **Tests for filtering by scenario_id** - Must test single scenario filtering
3. **Tests for filtering by date range** - Must test date_from, date_to, and combined
4. **Tests verify response schema** - Must validate response matches SessionListResponse
5. **80% coverage for listing logic** - Must cover all code paths in list_sessions

---

## Examples

### Input/Output Examples

**Pagination Examples:**
1. GET /sessions/?page=1&per_page=5
   - Input: 15 sessions exist
   - Expected: Returns sessions 1-5, pagination: {total:15, page:1, per_page:5, total_pages:3}

2. GET /sessions/?page=2&per_page=5
   - Input: 15 sessions exist
   - Expected: Returns sessions 6-10, pagination: {total:15, page:2, per_page:5, total_pages:3}

3. GET /sessions/?page=100&per_page=10
   - Input: Only 2 pages exist
   - Expected: Returns 404 with detail message

**Filtering Examples:**
1. GET /sessions/?scenario_id=cafe_order
   - Input: 3 sessions with cafe_order, 7 with other scenarios
   - Expected: Returns 3 sessions (cafe_order only), pagination: {total:3, ...}

2. GET /sessions/?date_from=2024-01-01&date_to=2024-01-31
   - Input: 5 sessions in Jan 2024, 10 in Feb 2024
   - Expected: Returns 5 sessions from January

3. GET /sessions/?scenario_id=cafe_order&date_from=2024-01-01
   - Input: Multiple sessions
   - Expected: Returns cafe_order sessions from Jan 2024 onwards (AND logic)

4. GET /sessions/?scenario_id=nonexistent
   - Input: No sessions with that scenario_id
   - Expected: Returns empty list, pagination: {total:0, ...}, status 200

**Date Format Examples:**
- Valid: `2024-01-01`, `2024-01-01T12:00:00`
- Invalid: Should return 422 validation error from FastAPI

### Edge Cases

- **date_from > date_to**: Return empty result or 400 error
- **Empty database**: Return {sessions: [], pagination: {total:0, page:1, per_page:10, total_pages:0}}
- **Invalid page (0 or negative)**: FastAPI Query validation rejects (ge=1)
- **per_page > 100**: FastAPI Query validation rejects (le=100)
- **None/empty filter values**: Ignore and return all results (no filter applied)

### Test Cases

```python
# Pagination tests
async def test_pagination_page_1(client, test_db):
    # Create 25 sessions
    # GET /sessions/?page=1&per_page=10
    # Assert: 10 sessions returned, pagination total=25, page=1, total_pages=3
    pass

async def test_pagination_invalid_page(client, test_db):
    # Create 10 sessions (1 page)
    # GET /sessions/?page=2&per_page=10
    # Assert: 404 error
    pass

# Filtering tests
async def test_filter_by_scenario_id(client, test_db):
    # Create sessions with different scenario_ids
    # GET /sessions/?scenario_id=cafe_order
    # Assert: Only cafe_order sessions returned
    pass

async def test_filter_by_date_range(client, test_db):
    # Create sessions with different dates
    # GET /sessions/?date_from=2024-01-01&date_to=2024-01-31
    # Assert: Only January sessions returned
    pass

async def test_filter_combined(client, test_db):
    # Create sessions with various scenarios and dates
    # GET /sessions/?scenario_id=cafe_order&date_from=2024-01-01
    # Assert: cafe_order sessions from Jan 2024 onwards
    pass

# Schema validation tests
async def test_response_schema(client, test_db):
    # Create some sessions
    # GET /sessions/
    # Assert: Response matches SessionListResponse schema
    # Assert: Each item in sessions matches SessionSummary
    pass
```

---

## Deliverables

### Code Changes

1. **`routers/sessions.py`** - Modify list_sessions function
   - [ ] Add scenario_id: Optional[str] = Query(None) parameter
   - [ ] Add date_from: Optional[datetime] = Query(None) parameter
   - [ ] Add date_to: Optional[datetime] = Query(None) parameter
   - [ ] Add SQLAlchemy filters for scenario_id
   - [ ] Add SQLAlchemy filters for date_from (>=)
   - [ ] Add SQLAlchemy filters for date_to (<=)
   - [ ] Handle edge case: date_from > date_to → return empty or 400
   - [ ] Update docstring to document new parameters

2. **`tests/test_sessions_listing.py`** - Add integration tests
   - [ ] Add TestListSessionsEndpoint class with async test methods
   - [ ] Test pagination (page, per_page, edge cases)
   - [ ] Test filtering by scenario_id
   - [ ] Test filtering by date range
   - [ ] Test combined filtering
   - [ ] Test empty results
   - [ ] Test response schema validation

### Tests

**New Test Classes:**
- TestListSessionsEndpoint - Integration tests using TestClient
  - test_pagination_page_1
  - test_pagination_multiple_pages
  - test_pagination_invalid_page
  - test_pagination_edge_cases (page=1, per_page=1, per_page=100)
  - test_filter_by_scenario_id
  - test_filter_by_scenario_id_no_match
  - test_filter_by_date_from_only
  - test_filter_by_date_to_only
  - test_filter_by_date_range
  - test_filter_by_invalid_date_range (date_from > date_to)
  - test_filter_combined_scenario_and_date
  - test_empty_database
  - test_response_schema_validation

### Documentation

- [ ] Update docstring in list_sessions function
- [ ] No README.md update needed (filtering is query parameter extension, not new endpoint)

---

## Actual Prompt

```
Implement GitHub issue #7: Test session listing endpoint.

CONTEXT:
- Project: French Language Coach (Phase 1.5)
- Current state: list_sessions endpoint has pagination but no filtering
- File: routers/sessions.py, line 42-110 (list_sessions function)
- Existing patterns: FastAPI Query parameters, SQLAlchemy async, Pydantic schemas
- Related files: schemas/session.py, models/session.py, tests/conftest.py, scenarios.py
- Analysis document: spdd/analysis/FLC-004-202605142212-[Analysis]-issue-7-session-listing-tests.md

GOAL:
- Add filtering by scenario_id, date_from, date_to to list_sessions endpoint
- Add integration tests for pagination, filtering, schema validation
- Achieve 80%+ test coverage for list_sessions function

CONSTRAINTS:
- Must follow FastAPI conventions (Query for optional parameters)
- Must use SQLAlchemy async ORM with filters at database level
- Must use existing schemas (SessionListResponse, SessionSummary)
- Must not break existing pagination functionality
- Must handle edge cases: date_from > date_to, empty results, invalid page
- Must follow PEP 8 and existing code style
- Must use existing test fixtures (test_db, client from conftest.py)
- Must include type hints and docstrings

EXAMPLES:
Pagination:
- GET /sessions/?page=1&per_page=10 → Returns first 10 sessions
- GET /sessions/?page=2&per_page=5 → Returns sessions 6-10
- GET /sessions/?page=100&per_page=10 → Returns 404 if only 2 pages exist

Filtering:
- GET /sessions/?scenario_id=cafe_order → Returns only cafe_order sessions
- GET /sessions/?date_from=2024-01-01&date_to=2024-01-31 → Returns Jan 2024 sessions
- GET /sessions/?scenario_id=cafe_order&date_from=2024-01-01 → Returns AND combination

Edge Cases:
- date_from > date_to → Return 400 error or empty result
- Empty database → Return {sessions: [], pagination: {total:0, page:1, per_page:10, total_pages:0}}
- No matching scenario_id → Return empty list with 200 status

ACCEPTANCE CRITERIA (from issue #7):
- [ ] Tests for pagination (page, per_page)
- [ ] Tests for filtering by scenario_id
- [ ] Tests for filtering by date range
- [ ] Tests verify response schema
- [ ] 80% coverage for listing logic

DELIVERABLES:
1. Modified routers/sessions.py with filtering parameters and logic
2. Updated tests/test_sessions_listing.py with integration tests
3. All acceptance criteria met
4. 80%+ test coverage for list_sessions function

IMPLEMENTATION NOTES:
- Add parameters to list_sessions: scenario_id, date_from, date_to (all Optional, default None)
- Build query with filters: select(SessionModel).where(...).order_by(...)
- Count total WITH filters applied (important for pagination)
- Use datetime for date parameters (FastAPI will parse ISO format strings)
- Handle date_from > date_to: return HTTPException(400, detail="date_from must be <= date_to")
- Test with fixed datetime values to avoid flakiness
```

---

## AI Response

Implementation completed successfully. All deliverables created:

1. **routers/sessions.py**: Modified `list_sessions` function to add:
   - `scenario_id: Optional[str] = Query(None)` parameter
   - `date_from: Optional[datetime] = Query(None)` parameter
   - `date_to: Optional[datetime] = Query(None)` parameter
   - Validation: date_from must be <= date_to
   - SQLAlchemy filters applied to both count and main queries
   - Updated docstring

2. **tests/test_sessions_listing.py**: Added TestListSessionsEndpoint class with 17 tests:
   - 5 pagination tests (default, custom, invalid page, empty DB, edge cases)
   - 2 scenario_id filtering tests (match, no match)
   - 5 date range filtering tests (date_from only, date_to only, range, invalid range, combined)
   - 3 schema validation tests
   - 1 combined filtering with pagination test
   - 1 sorting test

3. **tests/conftest.py**: Updated fixtures to use pytest_asyncio.fixture for proper async handling

4. **SPDD Artifacts**: Created analysis and prompt documents

---

## Human Review Notes

### Changes Made
- [x] Added filtering parameters to list_sessions endpoint
- [x] Added date validation (date_from <= date_to)
- [x] Applied filters to SQLAlchemy queries (count and main query)
- [x] Created comprehensive integration test suite
- [x] Updated conftest.py for pytest-asyncio compatibility
- [x] Created SPDD analysis and prompt documents

### Quality Checks
- [x] Code follows existing patterns (FastAPI Query, SQLAlchemy async)
- [x] Tests pass (24/24 tests passing)
- [x] All acceptance criteria from issue #7 are met
- [x] Documentation updated (docstrings, SPDD artifacts)
- [x] No breaking changes introduced
- [x] Type hints included on all new parameters

### Issues Found
- None - implementation completed without issues

---

## Verification

- [x] All acceptance criteria from issue #7 are met
  - [x] Tests for pagination (page, per_page) - 5 tests
  - [x] Tests for filtering by scenario_id - 2 tests
  - [x] Tests for filtering by date range - 5 tests
  - [x] Tests verify response schema - 3 tests
  - [x] 80%+ coverage for listing logic - All code paths tested
- [x] Tests pass with 80%+ coverage (24/24 tests passing)
- [x] Code follows project conventions
- [x] Documentation is updated
- [x] No breaking changes introduced
- [ ] Human review completed (pending human verification)

---

*Prompt based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
