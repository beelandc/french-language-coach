# SPDD Analysis: Add Base Models and Schemas

**GitHub Issue**: #13
**Issue Title**: 1.5.13: Add base models and schemas
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/13
**Artifact ID**: FLC-026-202606091639
**Created**: 2026-06-09 16:39
**Author**: Mistral Vibe (AI Assistant)

---

## Original Business Requirement

Create shared base classes for models and schemas that all features can inherit from.

---

## Background

The French Language Coach project currently has multiple model classes (Session, LessonProgress) and schema classes that are defined independently. Each model repeats common fields like `id`, `created_at`, and `updated_at`. Each schema repeats common validation patterns. This leads to:

- Code duplication across models and schemas
- Inconsistent field definitions
- Difficulty maintaining changes across all models
- No centralized place for common model behavior or schema validation

By creating base classes, we can:
- Reduce code duplication
- Ensure consistency across all models and schemas
- Make it easier to add new models in the future
- Centralize common functionality and validation

---

## Business Value

- **Maintainability**: Single source of truth for common fields and validation
- **Consistency**: All models share the same timestamp fields with identical behavior
- **Extensibility**: New models can easily inherit common functionality
- **Quality**: Reduces bugs from inconsistent field definitions
- **Developer Experience**: Less boilerplate code when creating new models

---

## Scope In

- [ ] Create a base SQLAlchemy model class with common fields (id, created_at, updated_at)
- [ ] Create a base Pydantic schema class with common validation
- [ ] Update Session model to extend the base model
- [ ] Update LessonProgress model to extend the base model
- [ ] Update corresponding schema classes to extend base schema where applicable
- [ ] Create unit tests for base classes
- [ ] Verify all existing functionality still works
- [ ] Ensure 80% test coverage is maintained

## Scope Out

- [ ] Creating new feature models (only refactoring existing ones)
- [ ] Modifying database migration history
- [ ] Adding new API endpoints
- [ ] Changing existing API contracts (response formats must remain compatible)
- [ ] Frontend changes

---

## Acceptance Criteria (ACs)

1. **AC1: Base model class with common fields**
   **Given** A new base model class is created
   **When** It is used as a parent class
   **Then** It provides id, created_at, and updated_at fields with appropriate defaults

2. **AC2: Base schema class with common validation**
   **Given** A new base schema class is created
   **When** It is used as a parent class
   **Then** It provides common validation and fields that all schemas can use

3. **AC3: All feature models extend base**
   **Given** Existing models (Session, LessonProgress)
   **When** They are updated
   **Then** They inherit from the base model class

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Session Model** (`models/session.py`): SQLAlchemy model for conversation sessions. Currently defines id, scenario_id, difficulty, created_at, ended_at, messages, feedback, and locking fields.
- **LessonProgress Model** (`models/lesson_progress.py`): SQLAlchemy model for tracking user progress through grammar lessons. Currently defines id, user_id, lesson_id, completed, score, last_accessed, time_spent, created_at, updated_at.
- **Base** (`database.py`): SQLAlchemy declarative_base() instance that all models inherit from.
- **Session Schemas** (`schemas/session.py`): Pydantic schemas for Session API operations (SessionCreate, SessionResponse, SessionSummary, etc.).
- **LessonProgress Schemas** (`schemas/lesson_progress.py`): Pydantic schemas for lesson progress API operations (LessonProgressCreate, LessonProgressResponse, LessonProgressListResponse).

### New Concepts Required

- **BaseModel** (`models/base.py`): New SQLAlchemy base model class that all domain models inherit from. Will provide common fields and behavior.
- **BaseSchema** (`schemas/base.py`): New Pydantic base schema class that all API schemas can optionally inherit from. Will provide common validation and fields.

### Key Business Rules

- All domain models must have an `id` primary key
- All domain models must have `created_at` timestamp
- All domain models must have `updated_at` timestamp (with auto-update on change)
- Timestamp fields must use UTC
- Base classes should not introduce breaking changes to existing functionality
- API response schemas must maintain backward compatibility

---

## Strategic Approach

### Solution Direction

1. Create `models/base.py` with a BaseModel class inheriting from SQLAlchemy's Base
2. Define common columns (id, created_at, updated_at) in the base class
3. Create `schemas/base.py` with BaseSchema class inheriting from Pydantic's BaseModel
4. Update existing models to inherit from BaseModel instead of Base directly
5. Update existing schemas to optionally inherit from BaseSchema where appropriate
6. Create comprehensive tests for the new base classes
7. Verify all existing tests still pass

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Whether to use SQLAlchemy's declarative_base() directly or create an intermediate base | Direct: Simpler. Intermediate: Allows adding common methods/fields | Create intermediate BaseModel for consistency and future extensibility |
| Whether to make updated_at auto-update | Auto-update: Convenient. Manual: More control | Use SQLAlchemy's onupdate parameter for auto-update |
| Whether all schemas should extend BaseSchema | All extend: Consistency. Optional: Flexibility | Make BaseSchema optional; use where it provides value |
| Whether to include id in BaseSchema | Including: Consistency. Excluding: Some response schemas don't need it | Include id in BaseSchema but allow schemas to exclude if needed |

### Alternatives Considered

- **Alternative 1: Mixin classes instead of inheritance** - Rejected because it's more complex and less explicit than simple inheritance for this use case
- **Alternative 2: Use SQLAlchemy's __abstract__ = True** - This is actually the recommended approach for base classes in SQLAlchemy, will use this
- **Alternative 3: Create separate base classes for different model types** - Rejected as premature abstraction; a single base class suffices for current needs

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Which existing models should extend the base? | All models or just new ones? | All existing models (Session, LessonProgress) should be updated |
| Should schemas be forced to extend BaseSchema? | Required or optional? | Optional - some schemas like PaginationInfo don't need common model fields |
| What common validation should be in BaseSchema? | Field validation rules | Include common timestamp format validation |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Existing code references old Base import | All models currently import from database import Base | Update imports and verify no breakage |
| Models with custom __init__ methods | Need to ensure base class initialization works | Test that model creation still works correctly |
| Schemas with custom validators | Need to ensure BaseSchema doesn't interfere | Test all existing schema validation |
| Database migration | Existing tables don't have updated_at column | Add updated_at to Session table via migration |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Breaking existing model imports | Code that imports Session/LessonProgress directly may break | Verify all imports work; keep backward compatibility |
| Database schema mismatch | Session table doesn't have updated_at column | Add updated_at column to Session model and create migration |
| Test failures | Existing tests may rely on specific model behavior | Run all tests and fix any failures |
| Performance impact | Auto-updating updated_at may add overhead | Minimal overhead is acceptable for consistency |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Base model class with common fields | Yes | Will create BaseModel with id, created_at, updated_at |
| AC2 | Base schema class with common validation | Yes | Will create BaseSchema with common fields and validation |
| AC3 | All feature models extend base | Yes | Will update Session and LessonProgress to extend BaseModel |

**AC Coverage Summary**: 3 of 3 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- Base classes should follow existing code style (PEP 8)
- Must maintain backward compatibility
- Must include docstrings
- Must have 80% test coverage

---

## REASONS Canvas

This section explicitly maps to the REASONS canvas from SPDD methodology.

### Requirements
From GitHub issue #13 acceptance criteria:
- Base model class with common fields (id, created_at, updated_at)
- Base schema class with common validation
- All feature models extend base

### Examples
Concrete test cases and expected behaviors:

1. **BaseModel instantiation**
   - Given: Create a new instance of a model extending BaseModel
   - When: No id, created_at, or updated_at is provided
   - Then: id is auto-generated (None initially), created_at and updated_at are set to current UTC time

2. **BaseModel update**
   - Given: An existing model instance
   - When: The instance is updated and committed
   - Then: updated_at field is automatically refreshed to current UTC time

3. **BaseSchema validation**
   - Given: A schema extending BaseSchema
   - When: Invalid timestamp format is provided
   - Then: Validation error is raised

4. **Model inheritance**
   - Given: Session extends BaseModel
   - When: Session is instantiated
   - Then: Session has id, created_at, and updated_at fields from BaseModel plus its own fields

### Architecture
Existing codebase structure, design patterns, and conventions to follow:

- **Backend**: FastAPI with SQLAlchemy async ORM
- **Models**: Located in `models/` directory, inherit from `database.Base` (SQLAlchemy declarative_base)
- **Schemas**: Located in `schemas/` directory, inherit from `pydantic.BaseModel`
- **Database**: SQLite for Phase 1-4, async SQLAlchemy
- **Pattern**: Models define table structure, schemas define API contracts
- **Convention**: All models use Column for field definitions, timestamps use datetime.utcnow

Current model files:
- `models/session.py`: Session model
- `models/lesson_progress.py`: LessonProgress model

Current schema files:
- `schemas/session.py`: Session-related schemas
- `schemas/lesson_progress.py`: Lesson progress schemas
- `schemas/grammar*.py`: Grammar-related schemas

### Standards
Coding standards, test coverage requirements, documentation requirements:

- **Code Style**: PEP 8 for Python
- **Test Coverage**: 80% minimum per module
- **Documentation**: Docstrings for all public classes and methods
- **Testing Framework**: pytest for backend
- **Pattern Matching**: Follow existing patterns in the codebase

### Omissions
Explicitly out-of-scope items:

- Creating new feature models beyond refactoring existing ones
- Modifying existing database tables (migrations will be handled separately)
- Changing API endpoint contracts
- Frontend changes
- Authentication/authorization (Phase 5 concern)

### Notes
Implementation hints, references to similar code, context:

- Session model already has id and created_at but not updated_at
- LessonProgress model has id, created_at, and updated_at
- Both models import Base from database.py
- The updated_at field should use `onupdate=datetime.utcnow` for automatic updates
- BaseModel should be marked as abstract in SQLAlchemy using `__abstract__ = True`
- BaseSchema can provide common configuration and fields for consistency
- See SQLAlchemy docs: https://docs.sqlalchemy.org/en/14/orm/extensions/declarative/basic_use.html#abstract-base-classes

### Solutions
Reference implementations, patterns to follow, existing code to mimic:

- **SQLAlchemy Abstract Base**: Use `__abstract__ = True` pattern for BaseModel
- **Timestamp Pattern**: Use `Column(DateTime, default=datetime.utcnow)` for created_at and `Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)` for updated_at
- **BaseSchema Pattern**: Create a simple BaseSchema with common config, extend pydantic.BaseModel
- **Model Import Pattern**: Follow existing pattern of importing Base from database

Example from SQLAlchemy documentation:
```python
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class BaseModel(Base):
    __abstract__ = True
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
