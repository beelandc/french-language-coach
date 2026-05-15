# SPDD Analysis: Session Filtering Feature

**GitHub Issue**: #10
**Issue Title**: 1.5.4: Add session filtering (scenario, date, score)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/10
**Artifact ID**: FLC-005-202605151721
**Created**: 2026-05-15 17:21
**Author**: Mistral Vibe AI Assistant

---

## Original Business Requirement

Extend GET /sessions/ with query parameters for filtering: scenario_id, date_from, date_to, min_score.

---

## Background

The session listing endpoint (GET /sessions/) currently supports pagination but lacks filtering capabilities. Users cannot easily find sessions by scenario type, date range, or performance score. This feature addresses the need for filtering to enable users to review specific conversation practice sessions based on various criteria.

---

## Business Value

- **Improved User Experience**: Users can quickly find specific sessions without scrolling through all pages
- **Targeted Review**: Users can filter sessions by scenario to practice specific conversation types
- **Performance Tracking**: Users can filter by score to review their best/worst performances
- **Time-based Analysis**: Users can filter by date range to review recent practice sessions
- **Combined Filtering**: Multiple filters can be combined for precise session retrieval

---

## Scope In

- [ ] Add `scenario_id` query parameter to filter sessions by scenario
- [ ] Add `date_from` query parameter to filter sessions created on or after a specific date
- [ ] Add `date_to` query parameter to filter sessions created on or before a specific date
- [ ] Add `min_score` query parameter to filter sessions with overall_score >= specified value
- [ ] All filters are optional and can be combined
- [ ] Maintain backward compatibility with existing pagination
- [ ] Update OpenAPI documentation via FastAPI type hints
- [ ] Add integration tests for all filter combinations
- [ ] Update schema validation for new query parameters

## Scope Out

- [ ] Frontend UI changes (out of scope for this backend issue)
- [ ] Authentication/authorization for filtering (not yet implemented in project)
- [ ] Full-text search filtering (not requested in issue)
- [ ] Sorting by filter fields (only pagination order by created_at desc maintained)
- [ ] Filtering by difficulty level (not in acceptance criteria)
- [ ] Filtering by ended_at date (only created_at range filtering)

---

## Acceptance Criteria (ACs)

1. **AC1**: Filter by scenario_id
   **Given** Multiple sessions exist with different scenario_ids
   **When** GET /sessions/ is called with scenario_id parameter
   **Then** Only sessions matching that scenario_id are returned

2. **AC2**: Filter by date range
   **Given** Sessions exist with various created_at dates
   **When** GET /sessions/ is called with date_from and/or date_to parameters
   **Then** Only sessions within the specified date range are returned

3. **AC3**: Filter by minimum overall_score
   **Given** Sessions exist with various overall_score values
   **When** GET /sessions/ is called with min_score parameter
   **Then** Only sessions with overall_score >= min_score are returned

4. **AC4**: Filters can be combined
   **Given** Sessions exist with various attributes
   **When** GET /sessions/ is called with multiple filter parameters
   **Then** Only sessions matching ALL filter criteria are returned

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session Model** (`models/session.py`): SQLAlchemy model with fields: id, scenario_id, difficulty, created_at, ended_at, messages, feedback
  - `feedback` field stores JSON string containing feedback_dict with overall_score
  - `created_at` field is DateTime for session creation timestamp
- **SessionSummary Schema** (`schemas/session.py`): Pydantic model for session listing response
  - Includes: id, scenario_id, scenario_name, difficulty, created_at, ended_at, overall_score
  - overall_score is Optional[int] extracted from feedback_dict
- **SessionRouter** (`routers/sessions.py`): FastAPI router with existing list_sessions endpoint
  - Current query parameters: page (int), per_page (int)
  - Uses SQLAlchemy async session for database queries
  - Returns SessionListResponse with sessions and pagination metadata
- **SCENARIOS** (`scenarios.py`): List of valid scenario definitions with id and name
  - Used for scenario_id validation and scenario_name lookup

### New Concepts Required

- **Filter Query Parameters**: New optional query parameters for the list_sessions endpoint
  - `scenario_id`: Optional[str] - filter by exact scenario ID match
  - `date_from`: Optional[datetime] - filter sessions created on/after this date
  - `date_to`: Optional[datetime] - filter sessions created on/before this date
  - `min_score`: Optional[int] - filter sessions with overall_score >= this value

### Key Business Rules

- **Filter Combination**: When multiple filters are provided, use AND logic (all must match)
- **Null Handling**: Sessions without feedback (null overall_score) should be excluded when min_score filter is applied
- **Date Inclusivity**: date_from and date_to should be inclusive (>= and <=)
- **Scenario Validation**: scenario_id should match existing scenario IDs from SCENARIOS list
- **Score Range**: overall_score values are integers 0-100 (based on FeedbackResponse schema)

---

## Strategic Approach

### Solution Direction

1. **Update SessionListResponse Query**: Modify the list_sessions endpoint in `routers/sessions.py` to accept new query parameters
2. **Build SQLAlchemy Filter Query**: Construct WHERE clauses dynamically based on which filter parameters are provided
3. **Handle Null Scores**: Use SQLAlchemy functions to extract and filter by overall_score from JSON feedback field
4. **Maintain Pagination**: Apply filtering before pagination calculation to ensure correct total counts
5. **Add Query Parameter Validation**: Use FastAPI Query for type validation and OpenAPI documentation
6. **Create Integration Tests**: Test each filter individually and in combination

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| **JSON field filtering** | Direct JSON filtering in SQLite vs. extracting in Python | Use SQLAlchemy JSON functions (func.json_extract) for database-level filtering to be more efficient |
| **Filter parameter types** | Use string for dates (ISO format) vs. datetime objects | Use datetime objects via FastAPI Query for automatic parsing and validation |
| **Empty filter behavior** | Return all sessions vs. return empty list when filter matches nothing | Return empty list (standard REST behavior) |
| **Combined filters logic** | AND vs. OR logic for multiple filters | Use AND logic (most intuitive, matches common API conventions) |

### Alternatives Considered

- **Alternative 1**: Add a separate endpoint like GET /sessions/filter - Rejected because it fragments the API; filtering should extend existing endpoint
- **Alternative 2**: Use a single "filter" JSON parameter - Rejected because it's less RESTful and harder to use with simple query strings
- **Alternative 3**: Add index to database for filter fields - Not needed for SQLite in development; can be added later for PostgreSQL production

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| **Date format** | ISO 8601 format assumed, but not specified | Use FastAPI datetime parsing which accepts ISO 8601 and other common formats |
| **Score field name** | Issue says "score" but schema uses "overall_score" | Use overall_score from feedback_dict as it's the only score field in SessionSummary |
| **Combined filters** | "Filters can be combined" - need to clarify AND vs OR | Use AND logic as standard practice |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| **min_score with null feedback** | Sessions without feedback have null overall_score | Exclude sessions with null overall_score when min_score filter is applied |
| **date_from > date_to** | Invalid date range | Return empty list (or raise 400 error) - Recommend returning empty list for simplicity |
| **Non-existent scenario_id** | Filter by scenario that doesn't exist | Return empty list (valid behavior) |
| **min_score > 100** | No sessions can match | Return empty list (valid behavior) |
| **min_score < 0** | All sessions with feedback should match | Accept negative values, filter normally |
| **Empty database** | No sessions exist | Return empty list with correct pagination |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| **JSON filtering in SQLite** | SQLite JSON functions may differ from PostgreSQL | Use SQLAlchemy func.json_extract which abstracts database differences |
| **Performance with many filters** | Complex queries could slow down | SQLite is in-memory for dev; indexes can be added for PostgreSQL later |
| **Breaking existing tests** | Current tests don't expect filter parameters | Add new tests, verify existing tests still pass |
| **Null handling in queries** | Sessions without feedback need special handling | Use SQLAlchemy case expressions or COALESCE |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Filter by scenario_id | Yes | Straightforward string equality filter |
| AC2 | Filter by date range | Yes | Use created_at field with >= and <= |
| AC3 | Filter by minimum overall_score | Yes | Extract from JSON feedback field |
| AC4 | Filters can be combined | Yes | Apply all filters with AND logic |

**AC Coverage Summary**: 4 of 4 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Filters should be optional (all parameters have defaults of None)
- Pagination should work with filtering (count reflects filtered results)
- API should remain backward compatible (existing calls without filters work)

---

## REASONS Canvas

### Requirements
From GitHub issue #10 acceptance criteria:
- Filter by scenario_id
- Filter by date range (date_from, date_to)
- Filter by minimum overall_score
- Filters can be combined

### Examples

**Example 1: Filter by scenario_id**
- Request: GET /sessions/?scenario_id=cafe_order
- Expected: Only sessions with scenario_id="cafe_order" returned

**Example 2: Filter by date range**
- Request: GET /sessions/?date_from=2026-01-01T00:00:00&date_to=2026-01-31T23:59:59
- Expected: Only sessions created in January 2026 returned

**Example 3: Filter by minimum score**
- Request: GET /sessions/?min_score=80
- Expected: Only sessions with overall_score >= 80 returned

**Example 4: Combined filters**
- Request: GET /sessions/?scenario_id=job_interview&min_score=75&date_from=2026-05-01
- Expected: Only sessions matching ALL criteria returned

**Example 5: Edge case - no matches**
- Request: GET /sessions/?scenario_id=nonexistent
- Expected: Empty list with total=0

**Example 6: Edge case - null scores**
- Request: GET /sessions/?min_score=50
- Expected: Sessions without feedback (null overall_score) excluded

### Architecture

**Existing codebase structure:**
```
routers/sessions.py          # FastAPI router with list_sessions endpoint
├── GET /sessions/           # Current: pagination only
models/session.py            # SQLAlchemy Session model
schemas/session.py           # Pydantic schemas including SessionSummary
scenarios.py                 # SCENARIOS list for scenario_id validation
```

**Design patterns to follow:**
- Use FastAPI Query for parameter validation and OpenAPI docs
- Use SQLAlchemy async for database operations
- Follow existing pattern of extracting overall_score from feedback JSON
- Maintain existing pagination logic

### Standards

**Coding Standards:**
- PEP 8 compliance
- Type hints on all function parameters and return values
- Docstrings for public functions
- Consistent with existing codebase style

**Testing Standards:**
- 80%+ test coverage required
- Use pytest with asyncio for backend tests
- Test each filter individually
- Test filter combinations
- Test edge cases (null values, empty results, invalid ranges)

**Documentation Standards:**
- Update README.md if API changes affect setup/usage
- Update OpenAPI docs via FastAPI type hints (automatic)
- Add docstring to modified endpoint

### Omissions

**Explicitly out of scope:**
- Frontend UI implementation
- User authentication/authorization
- Sorting by filter fields
- Full-text search
- Filtering by difficulty level
- Filtering by ended_at date
- Pagination sorting changes

### Notes

**Implementation hints:**
- See existing list_sessions endpoint for pagination pattern
- Use `func.json_extract(session.feedback, '$.overall_score')` for JSON field filtering
- Scenario validation can reuse get_scenario() from scenarios.py (returns None for invalid)
- Date filtering uses SessionModel.created_at column

**References to similar code:**
- See routers/messages.py for query parameter patterns
- See test_session_deletion.py for test structure patterns

### Solutions

**Reference implementations to mimic:**
- Query parameter handling: routers/sessions.py list_sessions (page, per_page)
- Database filtering: Use SQLAlchemy where() clauses with conditional logic
- JSON field extraction: SQLAlchemy func.json_extract for cross-database compatibility
- Test patterns: test_sessions_listing.py for schema tests, test_session_deletion.py for integration tests

**Patterns to follow:**
1. Accept optional query parameters with default None
2. Build query dynamically based on which parameters are provided
3. Apply filtering before pagination count and limit/offset
4. Extract overall_score from JSON feedback using SQLAlchemy functions
5. Return SessionListResponse with filtered results and correct pagination metadata
