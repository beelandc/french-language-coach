# SPDD Analysis: Set up pytest with factory-boy for backend

**GitHub Issue**: #25
**Issue Title**: 1.5-INFRA-1: Set up pytest with factory-boy for backend
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/25
**Artifact ID**: FLC-031-202606151700
**Created**: 2026-06-15 17:00
**Author**: Mistral Vibe

---

## Original Business Requirement

Set up pytest testing infrastructure with factory-boy for test fixtures.

## Acceptance Criteria (from issue #25)

- [ ] pytest installed in requirements.txt
- [ ] pytest-asyncio for async tests
- [ ] httpx for FastAPI test client
- [ ] factory-boy configured for models
- [ ] conftest.py with common fixtures
- [ ] CI runs tests on PR

---

## Background

This project uses FastAPI for the backend with SQLAlchemy async ORM. Currently, pytest, pytest-asyncio, and httpx are already installed in requirements.txt. However, factory-boy is not yet configured for creating test fixtures. The existing conftest.py has basic database and client fixtures but lacks factory-boy integration.

Setting up factory-boy will enable:
- Consistent, reusable test data generation
- Reduced boilerplate in test files
- Better test isolation
- Easier maintenance of test data

---

## Business Value

- **Test Quality**: Factory-boy provides a robust way to create test fixtures, improving test reliability and maintainability
- **Developer Productivity**: Reduces the time spent creating and maintaining test data
- **Code Consistency**: Ensures all models have consistent factory definitions
- **Future Readiness**: Prepares the infrastructure for comprehensive backend testing as the codebase grows

---

## Scope In

- [ ] Add factory-boy to requirements.txt
- [ ] Create factory-boy factory classes for all existing models (Session, LessonProgress, BaseModel)
- [ ] Update conftest.py to include factory-boy session fixtures
- [ ] Verify existing tests still pass with new setup
- [ ] Create a GitHub Actions workflow for pytest (backend tests)
- [ ] Ensure CI workflow runs tests on pull requests to main

## Scope Out

- [ ] Frontend testing (Jest/Vitest) - already handled by separate workflows
- [ ] E2E testing (Cypress) - separate concern
- [ ] Test coverage reporting configuration (can be added later)
- [ ] Factory classes for future models not yet created
- [ ] Migration of existing tests to use factory-boy (optional follow-up)

---

## Acceptance Criteria (Detailed with Gherkin)

1. **AC1: pytest installed in requirements.txt**
   **Given** requirements.txt is checked
   **When** pip install -r requirements.txt is run
   **Then** pytest>=7.4.0 is installed

2. **AC2: pytest-asyncio for async tests**
   **Given** requirements.txt is checked
   **When** pip install -r requirements.txt is run
   **Then** pytest-asyncio>=0.21.0 is installed

3. **AC3: httpx for FastAPI test client**
   **Given** requirements.txt is checked
   **When** pip install -r requirements.txt is run
   **Then** httpx>=0.25.0 is installed

4. **AC4: factory-boy configured for models**
   **Given** the test infrastructure is set up
   **When** a test needs to create a Session model instance
   **Then** a factory-boy factory is available and can create the instance

5. **AC5: conftest.py with common fixtures**
   **Given** conftest.py exists
   **When** a test uses session or model factories
   **Then** the fixtures are available and work correctly

6. **AC6: CI runs tests on PR**
   **Given** a pull request is created to main
   **When** the PR is submitted
   **Then** the pytest workflow runs automatically

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **pytest**: Already installed (>=7.4.0) - testing framework
- **pytest-asyncio**: Already installed (>=0.21.0) - async support for pytest
- **httpx**: Already installed (>=0.25.0) - HTTP client for testing FastAPI
- **conftest.py**: Already exists in tests/ directory with:
  - event_loop fixture (session scope)
  - test_db fixture (function scope) - creates fresh in-memory database
  - client fixture (function scope) - FastAPI TestClient with overridden db
  - valid_scenario_ids fixture
  - valid_difficulties fixture
- **SQLAlchemy Models**:
  - BaseModel (abstract base in models/base.py)
  - Session (models/session.py)
  - LessonProgress (models/lesson_progress.py)

### New Concepts Required

- **factory-boy**: Python library for test fixture generation
  - Factory classes for each model
  - Faker integration for realistic test data
  - SubFactory for related model creation
- **GitHub Actions Workflow**: pytest-tests.yml for backend CI

### Key Business Rules

- All models must have corresponding factory classes
- Factories must support both default and custom attribute values
- Factories must work with async SQLAlchemy sessions
- CI workflow must run on pull requests to main
- CI workflow must run on pushes to main
- Tests must pass before PR can be merged

---

## Strategic Approach

### Solution Direction

1. **Add factory-boy to requirements.txt** - Add `factory-boy>=3.3.0` to the testing section
2. **Create factories module** - Create `tests/factories.py` with factory classes for all models
3. **Update conftest.py** - Add factory-related fixtures if needed
4. **Create GitHub Actions workflow** - Create `.github/workflows/pytest-tests.yml`
5. **Verify setup** - Run tests to ensure everything works together

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Factory location | tests/factories.py vs tests/conftest.py | tests/factories.py - keeps conftest clean, better organization |
| Factory inheritance | ModelFactory(BaseFactory) vs custom base | ModelFactory - follows factory-boy conventions |
| Async support | Sync factories with async save vs async factories | Sync factories - simpler, works with existing patterns |
| CI triggers | Push to main only vs PR only vs both | Both - ensures tests run on all relevant events |

### Alternatives Considered

- **Alternative 1**: Use pytest-fixtures instead of factory-boy - Rejected because factory-boy provides more powerful fixture generation capabilities
- **Alternative 2**: Create factories in conftest.py directly - Rejected because it would make conftest.py too large and less maintainable
- **Alternative 3**: Use a separate pytest.ini for configuration - Rejected because pytest works well with default configuration for this project

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Factory-boy version | Which version to use | Use latest stable: >=3.3.0 |
| CI workflow scope | Which tests to run | Run all backend tests (tests/ directory) |
| Factory coverage | Which models need factories | All existing models (Session, LessonProgress) |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Model with required fields | Factories must provide all required fields | Use faker or default values |
| Model with JSON fields | Factories must handle JSON serialization | Use dict/default values for JSON fields |
| Async database session | Factories need to work with async SQLAlchemy | Save instances using async session |
| Missing dependencies | Factory-boy not installed | Add to requirements.txt and verify |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Version conflicts | factory-boy may not work with existing dependencies | Use well-tested version range (>=3.3.0) |
| Async compatibility | Factories may not work properly with async SQLAlchemy | Test thoroughly with existing async fixtures |
| CI failures | Workflow may fail due to environment issues | Test workflow locally before committing |
| Import errors | New factories module may cause circular imports | Keep factories in separate module, import carefully |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | pytest installed | Yes | Already installed, just verify |
| AC2 | pytest-asyncio installed | Yes | Already installed, just verify |
| AC3 | httpx installed | Yes | Already installed, just verify |
| AC4 | factory-boy configured | Yes | Need to add to requirements and create factories |
| AC5 | conftest.py with fixtures | Yes | Already has fixtures, may need updates |
| AC6 | CI runs tests on PR | Yes | Need to create workflow file |

**AC Coverage Summary**: 6 of 6 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Factory classes should follow consistent naming conventions
- Factories should be easy to extend for future models
- CI workflow should cache dependencies for faster runs

---

## REASONS Canvas

### Requirements
From GitHub issue #25 acceptance criteria:
- pytest installed in requirements.txt
- pytest-asyncio for async tests
- httpx for FastAPI test client
- factory-boy configured for models
- conftest.py with common fixtures
- CI runs tests on PR

### Examples

**Factory usage example:**
```python
# In a test file
from tests.factories import SessionFactory

def test_session_creation():
    session = SessionFactory()
    assert session.scenario_id == "default_scenario"
    assert session.difficulty == "intermediate"
```

**CI workflow example:**
```yaml
# In .github/workflows/pytest-tests.yml
name: Pytest Unit Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest tests/
```

### Architecture

**Existing codebase structure:**
- Backend: FastAPI with SQLAlchemy async
- Models: BaseModel (abstract), Session, LessonProgress in models/ directory
- Tests: pytest tests in tests/ directory
- Test configuration: conftest.py with database and client fixtures
- CI: Existing GitHub Actions workflows for frontend (jest-tests.yml, vitest-tests.yml)

**New components to add:**
- tests/factories.py - Factory classes for all models
- .github/workflows/pytest-tests.yml - Backend test workflow
- Updated requirements.txt with factory-boy

### Standards

**Coding standards:**
- Follow PEP 8 style guide
- Use consistent naming: {ModelName}Factory for factory classes
- Include docstrings for factory classes
- Use type hints where applicable

**Testing standards:**
- 80% test coverage minimum (existing requirement)
- Factories must support all model fields
- Tests must verify factory functionality

**Documentation standards:**
- Update README.md if setup instructions change
- Include comments in factories.py explaining usage
- Document CI workflow in comments

### Omissions

Explicitly out of scope:
- Frontend testing setup (handled by separate issues)
- E2E testing setup (handled by separate issues)
- Test coverage reporting and badges (future enhancement)
- Migration of existing tests to use factories (follow-up task)
- Factory classes for future models not yet created

### Notes

**Implementation hints:**
- Review existing conftest.py to understand current fixture patterns
- Follow factory-boy documentation for SQLAlchemy integration
- Use Faker library (included with factory-boy) for realistic test data
- Check other FastAPI projects for pytest + factory-boy patterns
- The Session model has JSON fields (messages, feedback) that need special handling

**References:**
- factory-boy documentation: https://factoryboy.readthedocs.io/
- pytest-asyncio documentation: https://pytest-asyncio.readthedocs.io/
- FastAPI testing: https://fastapi.tiangolo.com/tutorial/testing/
- Similar project: https://github.com/tiangolo/full-stack-fastapi-postgresql

### Solutions

**Reference implementations to mimic:**
- Existing conftest.py structure for fixtures
- Existing test files for patterns (test_sessions.py, etc.)
- factory-boy SQLAlchemy examples: https://factoryboy.readthedocs.io/en/stable/orms.html#sqlalchemy

**Patterns to follow:**
```python
# Factory pattern for SQLAlchemy models
import factory
import factory.fuzzy
from models.session import Session

class SessionFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Session
        sqlalchemy_session = None  # Will be set in fixture
    
    scenario_id = factory.fuzzy.FuzzyText(length=10)
    difficulty = factory.fuzzy.FuzzyChoice(["beginner", "intermediate", "advanced"])
    messages = "[]"
    feedback = None
```

---

*Analysis based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
