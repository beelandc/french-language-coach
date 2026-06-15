# SPDD Prompt: Set up pytest with factory-boy for backend

**GitHub Issue**: #25
**Issue Title**: 1.5-INFRA-1: Set up pytest with factory-boy for backend
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/25
**Artifact ID**: FLC-031-202606151715
**Created**: 2026-06-15 17:15
**Author**: Mistral Vibe
**Related Analysis**: spdd/analysis/FLC-031-202606151700-[Analysis]-issue-25-pytest-factoryboy.md

---

## Context

### Current Codebase State

The French Language Coach project has a FastAPI backend with SQLAlchemy async ORM. The current testing infrastructure includes:
- **pytest>=7.4.0** - Already installed in requirements.txt
- **pytest-asyncio>=0.21.0** - Already installed for async test support
- **httpx>=0.25.0** - Already installed for FastAPI test client
- **conftest.py** - Already exists with basic fixtures:
  - `event_loop` fixture (session scope)
  - `test_db` fixture (function scope) - creates fresh in-memory SQLite database
  - `client` fixture (function scope) - FastAPI TestClient with overridden database dependency
  - `valid_scenario_ids` and `valid_difficulties` fixtures

However, **factory-boy is NOT yet installed or configured**.

### Relevant Files

| File | Purpose | Key Elements |
|------|---------|--------------|
| `requirements.txt` | Project dependencies | pytest, pytest-asyncio, httpx already present |
| `tests/conftest.py` | Pytest configuration and fixtures | event_loop, test_db, client fixtures |
| `models/__init__.py` | Model exports | BaseModel, Session, LessonProgress |
| `models/base.py` | Abstract base model | id, created_at, updated_at columns |
| `models/session.py` | Session model | scenario_id, difficulty, messages (JSON), feedback (JSON), locking fields |
| `models/lesson_progress.py` | LessonProgress model | user_id, lesson_id, completed, score, last_accessed, time_spent |
| `.github/workflows/` | CI/CD workflows | jest-tests.yml, vitest-tests.yml, cypress-tests.yml exist (no pytest workflow) |

### Existing Patterns

- All models inherit from BaseModel (models/base.py) which inherits from database.Base (SQLAlchemy declarative base)
- Tests use async SQLAlchemy with aiosqlite for in-memory testing
- conftest.py creates fresh database for each test function
- FastAPI TestClient is used for API endpoint testing
- All dependencies are pinned with minimum versions in requirements.txt

---

## Goal

**Primary Objective**: Set up factory-boy for test fixture generation and create CI workflow for pytest

**Secondary Objectives**:
- Add factory-boy to requirements.txt
- Create factory classes for all existing models (Session, LessonProgress)
- Ensure factories work with async SQLAlchemy sessions
- Create GitHub Actions workflow for backend tests
- Verify all acceptance criteria from issue #25 are met

---

## Constraints

### Architecture Constraints
- Must work with existing SQLAlchemy async setup (aiosqlite)
- Must integrate with existing conftest.py fixtures
- Must follow existing project structure and naming conventions
- Must not break existing tests

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must include docstrings for factory classes
- Must use type hints where applicable
- Must handle JSON fields properly (Session.messages, Session.feedback)

### Testing Constraints
- Must maintain 80% test coverage requirement
- Must work with pytest-asyncio
- Must support both default and custom attribute values
- Must verify factories create valid model instances

### Acceptance Criteria

From GitHub issue #25:
- [ ] pytest installed in requirements.txt
- [ ] pytest-asyncio for async tests
- [ ] httpx for FastAPI test client
- [ ] factory-boy configured for models
- [ ] conftest.py with common fixtures
- [ ] CI runs tests on PR

---

## Examples

### Input/Output Examples

**Example 1: Using SessionFactory in a test**
- Input: Test needs a Session instance
- Expected Output: Valid Session model instance with all required fields

```python
# Test file
from tests.factories import SessionFactory

def test_session_factory():
    # When
    session = SessionFactory()
    
    # Then
    assert session.scenario_id is not None
    assert session.difficulty in ["beginner", "intermediate", "advanced"]
    assert session.messages_list == []
```

**Example 2: Using factory with custom attributes**
- Input: Test needs a Session with specific scenario_id
- Expected Output: Session instance with specified scenario_id

```python
# Test file
from tests.factories import SessionFactory

def test_session_with_custom_scenario():
    # When
    session = SessionFactory(scenario_id="greetings")
    
    # Then
    assert session.scenario_id == "greetings"
```

**Example 3: Using factory with database session**
- Input: Test needs to persist a Session to database
- Expected Output: Session saved to database, can be queried

```python
# Test file
import pytest
from tests.factories import SessionFactory

@pytest.mark.asyncio
async def test_session_persistence(test_db):
    # When
    session = SessionFactory()
    test_db.add(session)
    await test_db.commit()
    
    # Then - query and verify
    result = await test_db.execute(
        select(Session).where(Session.id == session.id)
    )
    fetched = result.scalar_one()
    assert fetched.scenario_id == session.scenario_id
```

### Edge Cases

1. **Model with required non-nullable fields**
   - Session.scenario_id is nullable=False
   - Factory must always provide a value
   - Use Faker or default value

2. **Model with JSON fields**
   - Session.messages and Session.feedback are Text fields storing JSON
   - Factory must provide valid JSON strings (or empty)
   - Use `json.dumps([])` for messages, None or valid JSON for feedback

3. **Model with datetime fields**
   - BaseModel has created_at and updated_at with defaults
   - LessonProgress has last_accessed with default
   - Factory should allow overrides but use defaults when not specified

4. **Async database operations**
   - Factories create model instances (not yet persisted)
   - Tests must explicitly add and commit to database
   - Works with existing test_db fixture

### Test Cases

```python
# In tests/test_factories.py (new file to verify factories work)
import json
import pytest
from datetime import datetime

from models.session import Session
from models.lesson_progress import LessonProgress
from tests.factories import SessionFactory, LessonProgressFactory


class TestSessionFactory:
    """Tests for SessionFactory."""
    
    def test_creates_valid_session(self):
        """Factory creates a valid Session instance."""
        # When
        session = SessionFactory()
        
        # Then
        assert isinstance(session, Session)
        assert session.scenario_id is not None
        assert len(session.scenario_id) > 0
        assert session.difficulty in ["beginner", "intermediate", "advanced"]
    
    def test_messages_is_valid_json(self):
        """Session messages field is valid JSON."""
        # When
        session = SessionFactory()
        
        # Then
        assert session.messages == "[]"
        assert session.messages_list == []
    
    def test_custom_attributes(self):
        """Factory accepts custom attribute overrides."""
        # When
        session = SessionFactory(
            scenario_id="custom_scenario",
            difficulty="beginner",
            ended_at=datetime.utcnow()
        )
        
        # Then
        assert session.scenario_id == "custom_scenario"
        assert session.difficulty == "beginner"
        assert session.ended_at is not None
    
    def test_feedback_is_valid_json(self):
        """Session feedback field is valid JSON or None."""
        # When
        session = SessionFactory()
        
        # Then
        assert session.feedback is None or isinstance(json.loads(session.feedback), dict)


class TestLessonProgressFactory:
    """Tests for LessonProgressFactory."""
    
    def test_creates_valid_lesson_progress(self):
        """Factory creates a valid LessonProgress instance."""
        # When
        progress = LessonProgressFactory()
        
        # Then
        assert isinstance(progress, LessonProgress)
        assert progress.lesson_id is not None
        assert len(progress.lesson_id) > 0
        assert 0 <= progress.score <= 100
        assert progress.time_spent >= 0
```

---

## Deliverables

### Code Changes

1. **requirements.txt**
   - Add `factory-boy>=3.3.0` to the testing section
   
2. **tests/factories.py** (new file)
   - Import factory-boy and models
   - Create SessionFactory class
   - Create LessonProgressFactory class
   - Handle JSON fields properly
   - Include docstrings
   
3. **tests/conftest.py** (optional updates)
   - May add factory_session fixture for easier factory usage
   - Or keep existing pattern of using test_db fixture directly
   
4. **.github/workflows/pytest-tests.yml** (new file)
   - Workflow name: Pytest Unit Tests
   - Triggers: push to main, pull_request to main
   - Steps: checkout, setup Python, install dependencies, run pytest
   - Path filtering: run when backend files change

### Tests

1. **tests/test_factories.py** (new file)
   - Unit tests for all factory classes
   - Test default values
   - Test custom attribute overrides
   - Test JSON field handling
   - 100% coverage of factories module

### Documentation

- [ ] Update README.md testing section to mention factory-boy
- [ ] Add comments in factories.py explaining usage patterns
- [ ] Document CI workflow in workflow file comments

---

## Actual Prompt

```
YOU ARE WORKING ON GITHUB ISSUE #25: Set up pytest with factory-boy for backend testing infrastructure.

CONTEXT:
- This is a FastAPI project with SQLAlchemy async ORM (aiosqlite)
- pytest, pytest-asyncio, and httpx are ALREADY installed in requirements.txt
- conftest.py already exists with test_db and client fixtures
- Models: Session (models/session.py), LessonProgress (models/lesson_progress.py), BaseModel (models/base.py)
- Session model has JSON fields: messages (stores JSON array), feedback (stores JSON object or null)
- All models inherit from BaseModel which has id, created_at, updated_at
- Need to add factory-boy and create factory classes for all models
- Need to create GitHub Actions workflow for pytest

GOAL:
Implement all acceptance criteria from issue #25:
1. Add factory-boy>=3.3.0 to requirements.txt
2. Verify pytest, pytest-asyncio, httpx are present (they already are)
3. Create tests/factories.py with factory-boy factories for all models
4. Update conftest.py if needed (optional: add factory-related fixtures)
5. Create .github/workflows/pytest-tests.yml for CI
6. Create tests/test_factories.py to verify factories work
7. Verify existing tests still pass

CONSTRAINTS:
- MUST follow existing codebase patterns
- MUST use PEP 8 style
- MUST include docstrings
- MUST handle JSON fields properly
- MUST work with async SQLAlchemy (aiosqlite)
- MUST NOT break existing tests
- factories.py must be importable without errors
- CI workflow must run on push and pull_request to main

EXAMPLES:

Factory for Session model:
```python
import factory
import factory.fuzzy
from models.session import Session

class SessionFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Session
    
    scenario_id = factory.fuzzy.FuzzyText(length=10)
    difficulty = factory.fuzzy.FuzzyChoice(["beginner", "intermediate", "advanced"])
    messages = "[]"
    feedback = None
    ended_at = None
```

Factory for LessonProgress model:
```python
import factory
import factory.fuzzy
from datetime import datetime
from models.lesson_progress import LessonProgress

class LessonProgressFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = LessonProgress
    
    user_id = None  # nullable for Phase 1.5
    lesson_id = factory.fuzzy.FuzzyText(length=10)
    completed = False
    score = factory.fuzzy.FuzzyInteger(0, 100)
    last_accessed = datetime.utcnow
    time_spent = 0
```

GitHub Actions workflow:
```yaml
name: Pytest Unit Tests

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - 'models/**'
      - 'routers/**'
      - 'tests/**'
      - 'requirements.txt'
      - '.github/workflows/pytest-tests.yml'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'
      - 'models/**'
      - 'routers/**'
      - 'tests/**'
      - 'requirements.txt'
      - '.github/workflows/pytest-tests.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest tests/ -v
```

ACCEPTANCE CRITERIA (MUST ALL BE MET):
- [ ] pytest installed in requirements.txt
- [ ] pytest-asyncio for async tests
- [ ] httpx for FastAPI test client
- [ ] factory-boy configured for models
- [ ] conftest.py with common fixtures
- [ ] CI runs tests on PR

DELIVERABLES:
1. Updated requirements.txt with factory-boy
2. New file: tests/factories.py with SessionFactory and LessonProgressFactory
3. New file: tests/test_factories.py with tests for factories
4. New file: .github/workflows/pytest-tests.yml
5. All existing tests must still pass

IMPLEMENTATION ORDER:
1. Update requirements.txt
2. Create tests/factories.py
3. Create tests/test_factories.py
4. Create .github/workflows/pytest-tests.yml
5. Run tests to verify everything works

REMEMBER:
- You are the AI implementing this based on the structured prompt
- Follow SPDD methodology: analysis -> prompt -> implementation
- Do NOT skip any acceptance criteria
- Create minimal, clean code that follows existing patterns
```

---

## AI Response

Implementation completed successfully. All acceptance criteria met:

1. **factory-boy added to requirements.txt**: Added `factory-boy>=3.3.0` to the testing section
2. **Factories created**: Created `tests/factories.py` with:
   - `SessionFactory` for Session model
   - `LessonProgressFactory` for LessonProgress model
   - Both use base `factory.Factory` (not SQLAlchemyModelFactory) to work with async SQLAlchemy
   - Proper handling of JSON fields (messages, feedback)
   - LazyAttribute for datetime fields
3. **Tests created**: Created `tests/test_factories.py` with 29 tests covering all factory functionality
4. **CI workflow created**: Created `.github/workflows/pytest-tests.yml`
5. **All tests pass**: 430 tests passed, 1 xfailed (expected)

---

## Human Review Notes

### Changes Made

- [x] Changed from `factory.alchemy.SQLAlchemyModelFactory` to `factory.Factory` - Async SQLAlchemy (aiosqlite) is not compatible with the standard SQLAlchemyModelFactory which expects a sync session. Using base Factory class allows us to create model instances that can be manually persisted using the existing async test_db fixture.
- [x] Changed `last_accessed = datetime.utcnow` to `last_accessed = factory.LazyAttribute(lambda _: datetime.utcnow())` - The datetime method reference was being stored directly instead of being called. Using LazyAttribute ensures a new datetime is generated for each instance.

### Quality Checks

- [x] Code follows existing patterns (PEP 8, docstrings, type hints where applicable)
- [x] Tests pass at 80%+ coverage (430 passed, all new tests pass)
- [x] Documentation updated (docstrings in factories.py, workflow comments)
- [x] All acceptance criteria met (all 6 ACs from issue #25)
- [x] No breaking changes introduced (all existing tests still pass)
- [x] No circular import errors
- [x] CI workflow is valid YAML

### Issues Found

1. **SQLAlchemyModelFactory compatibility**: Initially used `factory.alchemy.SQLAlchemyModelFactory` which requires a configured SQLAlchemy session. This doesn't work with async SQLAlchemy (aiosqlite). **Resolution**: Switched to base `factory.Factory` class and documented that tests must explicitly add and commit instances to the database.

2. **Datetime method reference**: Using `datetime.utcnow` directly stored the method reference instead of calling it. **Resolution**: Used `factory.LazyAttribute` to ensure the method is called for each instance.

3. **Deprecation warning**: `datetime.utcnow()` is deprecated in Python 3.12. **Note**: This is a known deprecation that will be addressed in a future update. For now, it's functional and the warning is acceptable.

---

## Verification

[Checklist for verifying the deliverables]

- [x] All acceptance criteria from issue #25 are met
- [x] factory-boy>=3.3.0 added to requirements.txt
- [x] tests/factories.py created with factory classes (SessionFactory, LessonProgressFactory)
- [x] tests/test_factories.py created and passes (29 tests)
- [x] .github/workflows/pytest-tests.yml created
- [x] All existing tests still pass (430 passed, 1 xfailed)
- [x] Tests run with 80%+ coverage
- [x] Code follows project conventions (PEP 8, docstrings, patterns)
- [x] No circular import errors
- [x] CI workflow is valid YAML

**Verification Date**: 2026-06-15
**Verification Status**: ✅ ALL PASS

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
