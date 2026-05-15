# SPDD Analysis: Session Listing Endpoint Tests

**GitHub Issue**: #7
**Issue Title**: 1.5.2-T: Test session listing endpoint
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/7
**Artifact ID**: FLC-004-202605142212
**Created**: 2026-05-14 22:12
**Author**: Mistral Vibe

---

## Original Business Requirement

Unit and integration tests for session listing endpoint.

## Background

Issue #6 implemented the session listing endpoint with pagination (GET /sessions/). Issue #7 requires adding comprehensive tests to verify the endpoint works correctly, including pagination, filtering by scenario_id, filtering by date range, response schema validation, and achieving 80% test coverage for the listing logic.

Current state:
- `routers/sessions.py` has `list_sessions` endpoint with pagination support
- `schemas/session.py` has SessionSummary, PaginationInfo, SessionListResponse schemas
- `tests/test_sessions_listing.py` has schema tests only (Issue #6)
- **Missing**: Integration tests for the actual endpoint, filtering by scenario_id, filtering by date range

## Business Value

- Ensures the session listing endpoint is production-ready
- Validates pagination, filtering, and schema compliance
- Achieves required 80% test coverage for Phase 1.5
- Provides regression protection for future changes

## Scope In

- [ ] Integration tests for GET /sessions/ endpoint
- [ ] Tests for pagination (page, per_page parameters)
- [ ] Tests for filtering by scenario_id
- [ ] Tests for filtering by date range (date_from, date_to)
- [ ] Tests to verify response schema compliance
- [ ] 80% coverage for listing logic in routers/sessions.py
- [ ] Add filtering parameters to the list_sessions endpoint (currently missing)

## Scope Out

- [ ] Frontend integration tests (out of scope for this issue)
- [ ] E2E tests (separate testing strategy)
- [ ] Tests for other endpoints (messages, feedback)
- [ ] Schema changes (schemas already defined in Issue #6)

---

## Acceptance Criteria (ACs)

From GitHub Issue #7:

1. **AC-7.1**: Tests for pagination (page, per_page)
   **Given** multiple sessions exist in the database
   **When** calling GET /sessions/?page=2&per_page=5
   **Then** returns correct slice of sessions with pagination metadata

2. **AC-7.2**: Tests for filtering by scenario_id
   **Given** sessions with different scenario_ids exist
   **When** calling GET /sessions/?scenario_id=cafe_order
   **Then** returns only sessions matching that scenario_id

3. **AC-7.3**: Tests for filtering by date range
   **Given** sessions with various created_at dates exist
   **When** calling GET /sessions/?date_from=2024-01-01&date_to=2024-01-31
   **Then** returns only sessions created in January 2024

4. **AC-7.4**: Tests verify response schema
   **Given** a valid request to GET /sessions/
   **When** the endpoint returns data
   **Then** the response matches SessionListResponse schema with SessionSummary items

5. **AC-7.5**: 80% coverage for listing logic
   **Given** all tests for list_sessions endpoint
   **When** pytest --cov is run
   **Then** coverage for routers/sessions.py list_sessions function >= 80%

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session Model**: `models/session.py` - SQLite ORM model with id, scenario_id, difficulty, created_at, ended_at, messages, feedback
- **Session Schema**: `schemas/session.py` - Pydantic models including SessionSummary, PaginationInfo, SessionListResponse
- **Sessions Router**: `routers/sessions.py` - FastAPI router with list_sessions endpoint (GET /sessions/)
- **Scenario Lookup**: `scenarios.py` - SCENARIOS list with id and name mappings
- **Database**: SQLite async via SQLAlchemy

### New Concepts Required

- **Filtering Parameters**: Add scenario_id, date_from, date_to query parameters to list_sessions
- **Integration Tests**: TestClient-based tests for the actual HTTP endpoint
- **Date Filtering Logic**: SQLAlchemy filters for date ranges

### Key Business Rules

- Pagination: page >= 1, 1 <= per_page <= 100
- Default: page=1, per_page=10
- Sessions ordered by created_at descending
- Empty result returns empty sessions list with correct pagination metadata
- Invalid page number returns 404 error

---

## Strategic Approach

### Solution Direction

1. **Update list_sessions endpoint** to accept filtering parameters (scenario_id, date_from, date_to)
2. **Add SQLAlchemy filters** to the existing pagination query
3. **Create integration tests** using FastAPI TestClient
4. **Verify 80% coverage** for the listing function

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **Filter chaining** | Multiple filters can be combined (AND logic) | Use SQLAlchemy's filter chaining for efficiency |
| **Date format** | ISO 8601 strings vs datetime objects | Accept ISO 8601 date strings, parse in endpoint |
| **Empty filter values** | Ignore None values vs require all params | Ignore None/empty values for flexibility |
| **Test isolation** | Shared test DB vs fresh DB per test | Fresh DB per test (via conftest.py fixtures) |

### Alternatives Considered

- **Alternative 1**: Use query string parsing library for dates - Rejected because FastAPI has built-in Query type support
- **Alternative 2**: Add filtering at the Python level (post-query) - Rejected because database-level filtering is more efficient
- **Alternative 3**: Use separate endpoints for filtered listing - Rejected because REST conventions favor query parameters for filtering

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **Date range behavior** | Should date_from be inclusive or exclusive? | Inclusive (>= date_from, < date_to+1 or <= date_to) |
| **Multiple scenario_ids** | Should filtering support multiple scenario_ids? | Single scenario_id only (comma-separated can be added later) |
| **Empty results** | What status code for empty results with valid filters? | 200 with empty sessions list (standard REST behavior) |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **Page exceeds total pages** | User requests page 100 with only 2 pages | Return 404 error with message |
| **Empty database** | No sessions exist | Return empty list with total=0, total_pages=0 |
| **Invalid date format** | User provides non-ISO date string | FastAPI validation returns 422 |
| **date_from > date_to** | Invalid date range | Return 400 error or empty result |
| **No matching scenario_id** | scenario_id doesn't exist in any session | Return empty list (200) |
| **Negative page/per_page** | Invalid pagination values | FastAPI Query validation rejects (ge=1) |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **Performance with many sessions** | Slow queries with large datasets | Add indexes, use efficient SQLAlchemy queries |
| **Time zone issues with dates** | Incorrect filtering due to TZ | Use UTC consistently (created_at is UTC) |
| **Test flakiness** | Date-based tests may be time-sensitive | Use fixed datetime values in tests |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC-7.1 | Tests for pagination | Yes | Need to test page, per_page, edge cases |
| AC-7.2 | Tests for filtering by scenario_id | Yes | Need to add scenario_id parameter first |
| AC-7.3 | Tests for filtering by date range | Yes | Need to add date_from, date_to parameters first |
| AC-7.4 | Tests verify response schema | Yes | Validate against Pydantic schemas |
| AC-7.5 | 80% coverage for listing logic | Yes | Ensure all code paths tested |

**AC Coverage Summary**: All 5 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Filtering parameters must be optional (can be combined or used individually)
- Tests should cover both happy path and edge cases
- Code must follow existing patterns (FastAPI, SQLAlchemy async)

---

## REASONS Canvas

### Requirements

From GitHub issue #7 acceptance criteria:
- Tests for pagination (page, per_page)
- Tests for filtering by scenario_id
- Tests for filtering by date range
- Tests verify response schema
- 80% coverage for listing logic

### Examples

**Pagination Examples:**
- GET /sessions/?page=1&per_page=10 → Returns first 10 sessions
- GET /sessions/?page=2&per_page=5 → Returns sessions 6-10
- GET /sessions/?page=100&per_page=10 → Returns 404 (no page 100)

**Filtering Examples:**
- GET /sessions/?scenario_id=cafe_order → Returns only cafe_order sessions
- GET /sessions/?date_from=2024-01-01&date_to=2024-01-31 → Returns Jan 2024 sessions
- GET /sessions/?scenario_id=cafe_order&date_from=2024-01-01 → Returns cafe_order sessions from Jan 2024 onwards

**Schema Examples:**
- Response has `sessions` array of SessionSummary objects
- Response has `pagination` object with total, page, per_page, total_pages
- Each SessionSummary has id, scenario_id, scenario_name, difficulty, created_at, ended_at, overall_score

### Architecture

**Existing codebase structure:**
```
routers/
  sessions.py      # Contains list_sessions endpoint with pagination
models/
  session.py       # Session ORM model
schemas/
  session.py       # SessionSummary, PaginationInfo, SessionListResponse
tests/
  conftest.py      # Test fixtures (test_db, client)
  test_sessions_listing.py  # Currently has schema tests only
```

**Design patterns to follow:**
- FastAPI dependency injection (get_db)
- SQLAlchemy async queries
- Pydantic response models
- TestClient for integration tests
- factory-boy or direct model creation for test data

### Standards

**Coding standards:**
- PEP 8 for Python
- Type hints on all functions
- Docstrings for public functions
- Consistent naming (snake_case for variables, functions)

**Testing standards:**
- pytest framework
- 80% minimum coverage per module
- Test edge cases and error conditions
- Use existing fixtures (test_db, client)

**Documentation standards:**
- Update README.md if API changes
- Docstrings for new functions
- SPDD artifacts required

### Omissions

**Explicitly out of scope:**
- Frontend tests (Jest/Cypress - separate issue)
- E2E tests (separate testing strategy)
- Authentication/authorization (not yet implemented)
- Other endpoints (messages, feedback)
- Schema modifications (defined in Issue #6)
- Performance testing (load testing)

### Notes

**Implementation hints:**
- The current list_sessions endpoint has pagination but no filtering
- Filtering should be added to the existing SQLAlchemy query
- Use FastAPI Query for optional parameters
- Date parameters should be Optional[datetime] with None as default
- Use `datetime.fromisoformat()` for date string parsing

**References to similar code:**
- See existing list_sessions pagination logic in routers/sessions.py
- See scenario lookup pattern in list_sessions for scenario_name
- See conftest.py for test fixtures and TestClient setup

### Solutions

**Reference implementations to mimic:**
- Pagination pattern in existing list_sessions endpoint
- Filter chaining in SQLAlchemy: `.where(SessionModel.scenario_id == scenario_id)`
- Date filtering: `.where(SessionModel.created_at >= date_from, SessionModel.created_at <= date_to)`
- Test pattern: See test_sessions_listing.py for schema tests (extend with integration tests)

**Test structure to follow:**
```python
# Example test structure
class TestListSessions:
    async def test_pagination_page_1(self, client, test_db):
        # Create test data
        # Call endpoint
        # Assert response
        pass
    
    async def test_filter_by_scenario_id(self, client, test_db):
        # Create sessions with different scenario_ids
        # Call with scenario_id filter
        # Assert only matching sessions returned
        pass
```

---

## Next Steps

1. Create prompt document for implementing filtering and tests
2. Implement filtering parameters in list_sessions endpoint
3. Create integration tests in test_sessions_listing.py
4. Run tests and verify 80% coverage
5. Commit changes with SPDD artifacts

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
