# SPDD Prompt: Add Base Models and Schemas

**GitHub Issue**: #13
**Issue Title**: 1.5.13: Add base models and schemas
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/13
**Artifact ID**: FLC-026-202606091640
**Created**: 2026-06-09 16:40
**Author**: Mistral Vibe (AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-026-202606091639-[Analysis]-issue-13-base-models-schemas.md`

---

## Context

Provide the AI assistant with the context it needs to generate appropriate code.

### Current Codebase State
The French Language Coach project is in Phase 1.5 with FastAPI backend and React frontend. The project currently has:
- SQLAlchemy async ORM with SQLite database
- Multiple model classes (Session, LessonProgress) that independently define common fields
- Multiple Pydantic schema classes for API requests/responses
- No shared base classes, leading to code duplication

### Relevant Files

| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `models/__init__.py` | Model exports | Exports Session, LessonProgress |
| `models/session.py` | Session model | Defines id, scenario_id, difficulty, created_at, ended_at, messages, feedback, locking fields |
| `models/lesson_progress.py` | LessonProgress model | Defines id, user_id, lesson_id, completed, score, last_accessed, time_spent, created_at, updated_at |
| `models/base.py` | NEW - Base model | Will define common fields: id, created_at, updated_at |
| `database.py` | Database setup | Defines Base (declarative_base), engine, async_session_maker |
| `schemas/__init__.py` | Schema exports | Exports all schema classes |
| `schemas/session.py` | Session schemas | SessionCreate, SessionResponse, SessionSummary, etc. |
| `schemas/lesson_progress.py` | LessonProgress schemas | LessonProgressCreate, LessonProgressResponse, LessonProgressListResponse |
| `schemas/base.py` | NEW - Base schema | Will define common validation and fields for schemas |
| `tests/test_schemas.py` | Schema tests | Existing tests for schemas |

### Existing Patterns

1. **Model Pattern**: All models import Base from database, inherit from Base, define __tablename__, use Column for fields, use datetime.utcnow for timestamps
2. **Schema Pattern**: All schemas inherit from pydantic.BaseModel, use Field for validation, use Optional for nullable fields
3. **Timestamp Pattern**: Use `datetime.utcnow` as default for timestamp fields
4. **Import Pattern**: Models import from database, schemas use typing imports and pydantic

---

## Goal

Clearly state what you want the AI to generate. Be specific.

**Primary Objective**: Create shared base classes for all models and schemas to eliminate code duplication and ensure consistency.

**Secondary Objectives**:
- Create `models/base.py` with BaseModel class containing id, created_at, updated_at fields
- Create `schemas/base.py` with BaseSchema class containing common validation
- Update `models/session.py` to inherit from BaseModel
- Update `models/lesson_progress.py` to inherit from BaseModel
- Update `models/__init__.py` to export BaseModel
- Update `schemas/__init__.py` to export BaseSchema
- Create comprehensive unit tests for the new base classes
- Verify all existing tests still pass
- Maintain 80%+ test coverage

---

## Constraints

List hard constraints that the AI must follow.

### Architecture Constraints
- Must use SQLAlchemy's `__abstract__ = True` for BaseModel
- Must use `onupdate=datetime.utcnow` for auto-updating updated_at field
- Must inherit from database.Base (SQLAlchemy declarative_base) for BaseModel
- Must inherit from pydantic.BaseModel for BaseSchema
- Must maintain backward compatibility - all existing code must continue to work
- Must not change existing API response formats

### Code Quality Constraints
- Must follow PEP 8 style guide
- Must include docstrings for all public classes and methods
- Must match existing code style and patterns
- Must use consistent naming (snake_case for variables, CamelCase for classes)

### Testing Constraints
- Must create unit tests for BaseModel (test field defaults, timestamp behavior)
- Must create unit tests for BaseSchema (test validation, inheritance)
- Must verify Session and LessonProgress models still work correctly
- Must verify all existing schema validation still works
- Must achieve 80%+ test coverage for new code
- Must not break existing tests

### Acceptance Criteria
From GitHub issue #13:
1. **AC1**: Base model class with common fields (id, created_at, updated_at)
2. **AC2**: Base schema class with common validation
3. **AC3**: All feature models extend base

---

## Examples

Provide concrete examples to guide the AI's output.

### Input/Output Examples

1. **BaseModel Field Inheritance**
   - Input: Create Session class inheriting from BaseModel
   - Expected Output: Session has id, created_at, updated_at from BaseModel plus its own fields (scenario_id, difficulty, etc.)

2. **BaseModel Timestamp Defaults**
   - Input: Create new Session instance without providing timestamps
   - Expected Output: created_at and updated_at are automatically set to current UTC time

3. **BaseModel Auto-Update**
   - Input: Update a Session instance and commit
   - Expected Output: updated_at field is automatically refreshed to current UTC time

4. **BaseSchema Inheritance**
   - Input: Create SessionResponse schema inheriting from BaseSchema
   - Expected Output: SessionResponse has common fields/validation from BaseSchema plus its own fields

### Edge Cases

- **Existing models without updated_at**: Session model currently doesn't have updated_at field - must add it
- **Models with custom __init__**: Must ensure base class initialization doesn't break existing behavior
- **Schemas with different field requirements**: Some schemas (like PaginationInfo) don't need id/created_at/updated_at
- **Backward compatibility**: Existing code that imports and uses Session/LessonProgress must continue to work

### Test Cases

```python
# models/base.py tests
import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.base import BaseModel
from database import Base, engine

class TestModel(BaseModel):
    __tablename__ = "test_model"
    name = Column(String(50))

# Test that BaseModel is abstract
# Test that child classes inherit id, created_at, updated_at
# Test that timestamps are set on creation
# Test that updated_at is refreshed on update

# schemas/base.py tests
from schemas.base import BaseSchema
from pydantic import ValidationError

class TestSchema(BaseSchema):
    name: str

# Test that BaseSchema provides common validation
# Test that child schemas can add their own fields
```

---

## Deliverables

List what the AI should produce.

### Code Changes
- [ ] `models/base.py` - New file with BaseModel class
- [ ] `schemas/base.py` - New file with BaseSchema class
- [ ] `models/session.py` - Update to inherit from BaseModel, add updated_at field
- [ ] `models/lesson_progress.py` - Update to inherit from BaseModel
- [ ] `models/__init__.py` - Add BaseModel to exports
- [ ] `schemas/__init__.py` - Add BaseSchema to exports

### Tests
- [ ] `tests/test_base_model.py` - Unit tests for BaseModel
- [ ] `tests/test_base_schema.py` - Unit tests for BaseSchema
- [ ] Update existing model tests if needed
- [ ] Verify all existing tests pass

### Documentation
- [ ] Docstrings for BaseModel class and fields
- [ ] Docstrings for BaseSchema class
- [ ] Update README.md if the new structure affects project setup (likely not needed for internal refactoring)

---

## Actual Prompt

This section contains the exact prompt text that was/will be sent to the AI assistant.

```
You are an expert Python/FastAPI/SQLAlchemy developer. Please implement the following feature for the French Language Coach project.

CONTEXT:
- This is a FastAPI backend with SQLAlchemy async ORM
- Database: SQLite with async SQLAlchemy
- Models are in models/ directory, schemas in schemas/ directory
- Current models: Session (models/session.py), LessonProgress (models/lesson_progress.py)
- Current schemas: Various in schemas/ directory
- Both models import Base from database.py (SQLAlchemy declarative_base)
- Both models already have id, created_at fields but not all have updated_at
- No base classes currently exist

CURRENT MODEL STRUCTURE:
models/session.py:
- Has: id, scenario_id, difficulty, created_at, ended_at, messages, feedback, is_locked, locked_at, locked_by
- Missing: updated_at field
- Imports: from database import Base
- Inherits: from Base directly

models/lesson_progress.py:
- Has: id, user_id, lesson_id, completed, score, last_accessed, time_spent, created_at, updated_at
- Imports: from database import Base
- Inherits: from Base directly

GOAL:
Implement shared base classes that all models and schemas can inherit from to eliminate code duplication and ensure consistency.

TASKS:
1. Create models/base.py with a BaseModel class that:
   - Inherits from database.Base
   - Is marked as abstract (__abstract__ = True)
   - Contains common fields: id (Integer, primary_key), created_at (DateTime, default=datetime.utcnow), updated_at (DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
   - Has proper docstrings

2. Create schemas/base.py with a BaseSchema class that:
   - Inherits from pydantic.BaseModel
   - Can be optionally inherited by other schemas
   - Has proper docstrings
   - Provides common configuration if needed

3. Update models/session.py to:
   - Import BaseModel from models.base instead of Base from database
   - Inherit from BaseModel instead of Base
   - Remove duplicate id and created_at field definitions (keep them in BaseModel)
   - Add updated_at field (will be inherited from BaseModel, but Session model doesn't have it yet)

4. Update models/lesson_progress.py to:
   - Import BaseModel from models.base instead of Base from database
   - Inherit from BaseModel instead of Base
   - Remove duplicate id, created_at, updated_at field definitions (keep them in BaseModel)

5. Update models/__init__.py to:
   - Import and export BaseModel

6. Update schemas/__init__.py to:
   - Import and export BaseSchema

REQUIREMENTS:
- Session model MUST have all its existing fields (scenario_id, difficulty, ended_at, messages, feedback, is_locked, locked_at, locked_by) PLUS the inherited ones (id, created_at, updated_at)
- LessonProgress model MUST have all its existing fields (user_id, lesson_id, completed, score, last_accessed, time_spent) PLUS the inherited ones (id, created_at, updated_at)
- All existing code that imports Session or LessonProgress must continue to work
- All existing API endpoints must return the same response format
- No breaking changes

CONSTRAINTS:
- Must use SQLAlchemy 2.0+ patterns
- Must use async SQLAlchemy (models already use it)
- Must follow PEP 8
- Must include docstrings
- Must maintain backward compatibility
- Session table will need an updated_at column added (handled separately via migration)

EXAMPLES:
BaseModel should look like:
```python
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer
from database import Base

class BaseModel(Base):
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

BaseSchema should look like:
```python
from pydantic import BaseModel as PydanticBaseModel

class BaseSchema(PydanticBaseModel):
    """Base schema class with common validation for all schemas."""
    pass
```

Session model after update should look like:
```python
from sqlalchemy import Column, DateTime, Integer, String, Text, Boolean
from models.base import BaseModel

class Session(BaseModel):
    __tablename__ = "sessions"
    
    scenario_id = Column(String(50), nullable=False)
    difficulty = Column(String(20), default="intermediate")
    ended_at = Column(DateTime, nullable=True)
    messages = Column(Text, default="[]")
    feedback = Column(Text, nullable=True)
    
    # Session locking fields
    is_locked = Column(Boolean, default=False, index=True)
    locked_at = Column(DateTime, nullable=True)
    locked_by = Column(String(255), nullable=True)
    
    # Keep existing properties and methods
```

ACCEPTANCE CRITERIA:
- [ ] BaseModel exists with id, created_at, updated_at fields
- [ ] BaseSchema exists as a Pydantic base class
- [ ] Session inherits from BaseModel
- [ ] LessonProgress inherits from BaseModel
- [ ] All existing model fields are preserved
- [ ] All existing functionality works (properties, methods)
- [ ] All existing tests pass

DELIVERABLES:
- models/base.py
- schemas/base.py
- Updated models/session.py
- Updated models/lesson_progress.py
- Updated models/__init__.py
- Updated schemas/__init__.py
- tests/test_base_model.py
- tests/test_base_schema.py
```

---

## AI Response

[Optionally capture the AI's response here for reproducibility.]

---

## Human Review Notes

[Document any changes made by humans after AI generation.]

### Changes Made
- [ ] List any modifications to the AI-generated code

### Quality Checks
- [ ] Code follows existing patterns
- [ ] Tests pass at 80%+ coverage
- [ ] Documentation updated
- [ ] All acceptance criteria met

### Issues Found
- [ ] List any problems discovered and their resolutions

---

## Verification

[Checklist for verifying the deliverables.]

- [ ] All acceptance criteria from issue #13 are met
- [ ] Tests pass with 80%+ coverage
- [ ] Code follows project conventions
- [ ] Documentation is updated
- [ ] No breaking changes introduced
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
