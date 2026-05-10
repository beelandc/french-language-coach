# Structured Prompt Driven Development (SPDD) - Project Workflow

*Inspired by [Structured Prompt Driven Development by Wei Zhang and Jessie Jie Xia](https://martinfowler.com/articles/structured-prompt-driven.html)*

## Overview

This document establishes the Structured Prompt Driven Development (SPDD) workflow for the French Language Coach project. SPDD provides a systematic methodology for integrating AI coding assistants (Mistral Vibe) into the development process while maintaining quality, consistency, and human oversight.

## Core Principles

### Intent
To leverage AI productivity gains while mitigating risks through:
- Structured, repeatable prompting patterns
- Clear boundaries between AI and human responsibility
- Human-in-the-loop validation at every critical decision point
- Full traceability of AI-generated artifacts

### Vision
By following SPDD, we achieve:
- **Consistency**: Predictable AI outputs that match project standards
- **Quality**: Code that meets our 80% test coverage requirement
- **Maintainability**: Clear documentation of AI interactions for future developers
- **Traceability**: Every AI contribution is documented and reviewable

## REASONS Canvas

The REASONS canvas is the foundation of our SPDD approach. Every development task should be framed using these components:

### Requirements
- **Source**: GitHub issues with clear acceptance criteria
- **Format**: Checklist of "Definition of Done" items
- **Example**: "- [ ] Endpoint returns 200 status, - [ ] Response matches schema, - [ ] 80% test coverage"

### Examples
- **Source**: Test cases in the issue description
- **Format**: Concrete input/output pairs, edge cases
- **Example**: "Given a session with 3 messages, feedback endpoint returns scores for grammar, vocabulary, fluency"

### Architecture
- **Source**: Existing codebase structure, design patterns
- **Reference**: See `README.md` Architecture section
- **Patterns**: 
  - Backend: FastAPI routers with dependency injection
  - Frontend: React components with TypeScript (future)
  - Database: SQLAlchemy ORM with async
  - Testing: pytest (backend), jest (frontend)

### Standards
- **Coding**: PEP 8 (Python), consistent with existing codebase
- **Testing**: 80% coverage minimum per module
- **Documentation**: Docstrings for public functions, README updates for new features
- **Code Review**: All PRs require approval, tests must pass

### Omissions
- **Explicitly Documented**: What is NOT being implemented
- **Source**: GitHub issue descriptions, VISION.md "Out of Scope" section
- **Example**: "No voice input/output in MVP", "No user authentication until Phase 5"

### Notes
- **Context**: Implementation hints, references to similar code
- **Source**: Code comments, issue descriptions
- **Example**: "See scenarios.py for system prompt patterns", "Use existing SM-2 algorithm for SRS"

### Solutions
- **Reference**: Existing implementations to mimic
- **Source**: Codebase patterns, external libraries
- **Example**: "Use factory-boy for test fixtures", "Follow existing router structure in routers/"

## Development Workflow

### Phase 1: Issue Selection
1. Select a GitHub issue from the appropriate milestone
2. Review the issue's acceptance criteria
3. Verify all dependencies (other issues) are complete
4. Estimate effort and confirm with stakeholder

### Phase 2: Context Gathering
1. **Read the issue carefully** - Understand requirements and acceptance criteria
2. **Review relevant code**:
   - Existing implementations of similar features
   - Related models, schemas, and services
   - Architecture patterns in README.md
3. **Check VISION.md** - Verify alignment with project vision
4. **Review tests** - Understand existing test patterns and coverage

### Phase 3: Prompt Engineering

When requesting AI assistance, structure prompts with:

```
CONTEXT:
- Current codebase state
- Relevant files and their purposes
- Existing patterns to follow

GOAL:
- Clear, specific objective
- Reference to GitHub issue number

CONSTRAINTS:
- Must follow existing architecture
- Must meet 80% test coverage
- Must include acceptance criteria from issue

EXAMPLES:
- Concrete test cases
- Expected input/output pairs
- Edge cases to handle

DELIVERABLES:
- Code changes
- Tests (unit, integration, E2E as applicable)
- Documentation updates
```

### Phase 4: Iterative Development
1. **AI generates initial solution** based on structured prompt
2. **Human reviews** for:
   - Architecture alignment
   - Code quality
   - Test coverage
   - Security implications
3. **Refine** based on feedback
4. **Repeat** until acceptance criteria are met

### Phase 5: Validation
1. Run all tests - must pass at 80%+ coverage
2. Verify each acceptance criterion from the issue
3. Perform manual testing for user-facing features
4. Update documentation
5. Create pull request with:
   - Reference to GitHub issue
   - Summary of changes
   - Test results
   - Screenshots (for UI changes)

### Phase 6: Documentation
1. Update README.md if new features affect setup/usage
2. Add inline documentation (docstrings, comments)
3. Update VISION.md if scope changes
4. Document decisions in ADR (Architecture Decision Record) if significant

## SPDD in Practice

### For Feature Development
```
Example Prompt Structure:

"Please implement issue #42: Create LessonBrowser React component.

CONTEXT:
- We're using React with TypeScript (future migration)
- Existing components in src/components/
- Use Material-UI patterns where applicable
- Follow existing styling in style.css

GOAL:
- Create component to browse and filter grammar lessons
- Must work on mobile and desktop

CONSTRAINTS:
- Use existing API endpoints from backend/grammar/
- Must pass 80% test coverage
- Follow acceptance criteria in issue #42

ACCEPTANCE CRITERIA (from issue #42):
- [ ] Displays all lessons
- [ ] Filtering works by topic
- [ ] Filtering works by difficulty
- [ ] Search works
- [ ] Clicking lesson navigates to viewer
- [ ] Responsive design

TESTS NEEDED:
- jest tests for component rendering
- Tests for filtering logic
- Tests for search functionality
- 80% coverage required
"
```

### For Bug Fixes
```
Example Prompt Structure:

"Please fix the issue where session filtering by date returns incorrect results.

CONTEXT:
- Endpoint: GET /sessions/ with date_from, date_to params
- Router: routers/sessions.py
- Model: Session in models/session.py
- Test: test_sessions.py

GOAL:
- Fix date filtering to return correct sessions

CONSTRAINTS:
- Maintain backward compatibility
- Add test cases for edge cases (null dates, invalid formats)
- 80% coverage must be maintained

EXAMPLES:
- date_from=2024-01-01, date_to=2024-01-31 should return sessions in January 2024
- date_from only should return sessions after that date
- Invalid date format should return 400 error

ACCEPTANCE CRITERIA:
- [ ] Date range filtering works correctly
- [ ] Single date filter works
- [ ] Edge cases handled (null, invalid)
- [ ] Tests pass
- [ ] No regression in existing functionality
"
```

## Testing Strategy

### Backend (Python/pytest)
- **Unit tests**: Individual functions and methods
- **Integration tests**: API endpoints with test client
- **Fixtures**: factory-boy for model instances
- **Coverage**: 80% minimum per module

### Frontend (JavaScript/jest)
- **Component tests**: Rendering and interaction
- **MSW**: Mock API endpoints
- **User event tests**: Simulate user interactions
- **Coverage**: 80% minimum per component

### E2E (Cypress)
- Critical user flows per phase
- Runs in CI on PR
- One E2E test per major feature

## Tools

### Current Stack
- **AI Assistant**: Mistral Vibe (CLI and API)
- **Backend Testing**: pytest, pytest-asyncio, httpx, factory-boy
- **Frontend Testing**: jest, @testing-library/react, MSW
- **E2E Testing**: Cypress
- **CI/CD**: GitHub Actions (planned)

### Future Considerations
- **open-spdd**: Utility for SPDD workflow management (not currently used)
  - Repository: https://github.com/gszhangwei/open-spdd
  - Status: Under evaluation, not adopted yet
  - Decision: Currently using Mistral Vibe directly

## Quality Gates

Before merging any PR:

1. **✅ All acceptance criteria met** (from GitHub issue)
2. **✅ Tests pass** (backend and frontend)
3. **✅ 80% test coverage** maintained or improved
4. **✅ Code review approved** by at least one human
5. **✅ No security vulnerabilities** introduced
6. **✅ Documentation updated** (README, code comments)
7. **✅ Backward compatibility** maintained (unless intentional breaking change)

## References

- [Structured Prompt Driven Development (Wei Zhang & Jessie Jie Xia)](https://martinfowler.com/articles/structured-prompt-driven.html)
- [open-spdd GitHub Repository](https://github.com/gszhangwei/open-spdd)

---

*Last updated: May 2026*
*Project: French Language Coach*
