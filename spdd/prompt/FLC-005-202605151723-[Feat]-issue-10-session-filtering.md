# SPDD Prompt: Session Filtering Implementation

**GitHub Issue**: #10
**Issue Title**: 1.5.4: Add session filtering (scenario, date, score)
**Artifact ID**: FLC-005-202605151723
**Created**: 2026-05-15 17:23
**Author**: Mistral Vibe AI Assistant
**Related Analysis**: FLC-005-202605151721-[Analysis]-issue-10-session-filtering.md

---

## Prompt Text

Implement GitHub issue #10: Add session filtering to GET /sessions/ endpoint.

### CONTEXT

**Current State:**
- File: `routers/sessions.py` - list_sessions endpoint exists with pagination (page, per_page)
- Model: `models/session.py` - Session model with fields: id, scenario_id, difficulty, created_at, ended_at, messages, feedback
- Schema: `schemas/session.py` - SessionSummary includes overall_score (Optional[int])
- Feedback is stored as JSON string in `feedback` column, contains overall_score field
- Scenario IDs are defined in `scenarios.py` SCENARIOS list
- Tests: `tests/test_sessions_listing.py` (schema tests), `tests/test_session_deletion.py` (integration tests)
- Test fixtures: `tests/conftest.py` provides client fixture with test database

**Existing Patterns:**
- Query parameters use FastAPI `Query()` with defaults
- Database queries use SQLAlchemy async with `db.execute(select(...))`
- JSON extraction uses model properties (feedback_dict) in Python, not at DB level
- Pagination: count total → calculate pages → apply offset/limit → return results

### GOAL

Extend GET /sessions/ endpoint with optional query parameters for filtering:
- `scenario_id`: Filter sessions by exact scenario ID match
- `date_from`: Filter sessions created on or after this datetime
- `date_to`: Filter sessions created on or before this datetime  
- `min_score`: Filter sessions with overall_score >= this integer value

All filters are optional. When multiple filters are provided, use AND logic.

### CONSTRAINTS

**Architecture Constraints:**
- Must follow existing FastAPI + SQLAlchemy async patterns
- Must maintain backward compatibility (existing calls without filters still work)
- Must use existing schemas (SessionListResponse, SessionSummary, PaginationInfo)
- Pagination must reflect filtered results (count after filtering)

**Code Quality Constraints:**
- PEP 8 compliance
- Type hints on all function parameters and return values
- Docstrings for modified functions
- 80%+ test coverage required

**Database Constraints:**
- SQLite (Phase 1-4), will migrate to PostgreSQL (Phase 5)
- Use SQLAlchemy functions for cross-database compatibility
- Handle NULL feedback gracefully (sessions without feedback have NULL overall_score)

### EXAMPLES

**Example Requests:**
```
GET /sessions/?scenario_id=cafe_order
GET /sessions/?date_from=2026-01-01T00:00:00
GET /sessions/?date_to=2026-01-31T23:59:59
GET /sessions/?min_score=80
GET /sessions/?scenario_id=job_interview&min_score=75&date_from=2026-05-01
GET /sessions/?page=2&per_page=20&scenario_id=cafe_order
```

**Expected Behavior:**
- Scenario filter: exact string match on SessionModel.scenario_id
- Date filters: inclusive range on SessionModel.created_at (>= date_from, <= date_to)
- Score filter: sessions with NULL feedback excluded when min_score is specified
- Combined: all filters applied with AND logic

**Edge Cases:**
- `min_score` with sessions that have no feedback → exclude those sessions
- `date_from > date_to` → return empty list
- Non-existent `scenario_id` → return empty list
- `min_score > 100` or `min_score < 0` → filter normally (no artificial limits)
- No filters provided → return all sessions (current behavior)

### ACCEPTANCE CRITERIA

From issue #10:
- [ ] Filter by scenario_id
- [ ] Filter by date range
- [ ] Filter by minimum overall_score
- [ ] Filters can be combined

### DELIVERABLES

1. **Code Changes:**
   - Modify `routers/sessions.py` list_sessions endpoint
   - Add query parameters: scenario_id, date_from, date_to, min_score
   - Build dynamic WHERE clause based on provided filters
   - Handle NULL overall_score for min_score filter

2. **Tests:**
   - Create `tests/test_session_filtering.py` with integration tests
   - Test each filter individually
   - Test filter combinations
   - Test edge cases (null scores, empty results, date ranges)
   - Ensure existing tests still pass
   - Achieve 80%+ coverage for modified code

3. **Documentation:**
   - Update OpenAPI docs (automatic via FastAPI type hints)
   - Update endpoint docstring
   - README.md update if API changes affect setup/usage (assess after implementation)

---

## Implementation Notes

### Technical Approach

**Option 1: Filter in Python (RECOMMENDED)**
- Query all sessions (or paginated subset)
- Apply filters in Python after fetching
- Pros: Simpler, works with existing JSON extraction pattern
- Cons: Less efficient for large datasets

**Option 2: Filter at Database Level**
- Use SQLAlchemy func.json_extract to filter by overall_score in JSON
- Pros: More efficient
- Cons: Database-specific JSON functions, more complex

**Decision: Use Option 1** for simplicity and consistency with existing codebase patterns. The current implementation already extracts overall_score in Python from the feedback JSON. We'll apply the min_score filter in Python after fetching.

### Query Structure

```python
# Build base query
query = select(SessionModel).order_by(SessionModel.created_at.desc())

# Apply filters
if scenario_id:
    query = query.where(SessionModel.scenario_id == scenario_id)
if date_from:
    query = query.where(SessionModel.created_at >= date_from)
if date_to:
    query = query.where(SessionModel.created_at <= date_to)

# Execute query
result = await db.execute(query)
sessions = result.scalars().all()

# Apply min_score filter in Python (after extracting overall_score)
if min_score is not None:
    sessions = [s for s in sessions if s.feedback_dict and s.feedback_dict.get("overall_score") >= min_score]
```

### Pagination Considerations

Since min_score filtering happens in Python, we need to:
1. Apply database-level filters (scenario_id, date_from, date_to) to the count query
2. Apply all filters (including min_score) to the results before pagination
3. Calculate total_pages based on filtered count

This means we need to query all matching sessions, apply Python filter, then paginate.

---

## Human Review Notes

[To be filled after AI implementation]

---

## Verification Status

- [ ] Implementation complete
- [ ] All acceptance criteria met
- [ ] All tests pass at 80%+ coverage
- [ ] Code follows existing patterns
- [ ] Documentation updated
