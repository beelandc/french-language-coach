# AI Development Instructions for French Language Coach

**IMPORTANT**: These instructions apply to all AI-assisted development on this project. Read this file before starting any development work.

## Methodology: Structured Prompt Driven Development (SPDD)

This project **MUST** follow the SPDD methodology as documented in `SPDD.md`. This is non-negotiable.

### Quick Reference

1. **ALWAYS start with a GitHub issue** - Never work without one
2. **Review the issue's acceptance criteria** - This is your "Definition of Done"
3. **Use the REASONS canvas** - Every task must be framed with:
   - Requirements
   - Examples
   - Architecture
   - Standards
   - Omissions
   - Notes
   - Solutions
4. **Follow the 6-phase workflow** from SPDD.md
5. **80% test coverage is mandatory** - No exceptions

## Before You Start

When a user asks you to implement something:

### ✅ DO:
- Ask for the GitHub issue number if not provided
- Read the issue carefully, especially acceptance criteria
- Review `SPDD.md` for the complete methodology
- Review `VISION.md` for project context
- Review `README.md` for architecture and setup
- Ask clarifying questions if requirements are unclear
- Structure your prompts using the REASONS canvas
- Generate tests alongside code (80% coverage required)
- Document reasoning for significant decisions

### ❌ DON'T:
- Start coding without a GitHub issue
- Ignore acceptance criteria
- Skip test creation
- Generate code that doesn't follow existing patterns
- Make architectural decisions without human approval
- Assume something is in scope without checking VISION.md

## Workflow Checklist

For every development request:

- [ ] **Issue identified**: Do we have a GitHub issue number?
- [ ] **Context gathered**: Have I read the issue, VISION.md, README.md?
- [ ] **Dependencies checked**: Are all blocking issues resolved?
- [ ] **Prompt structured**: Does my request include CONTEXT, GOAL, CONSTRAINTS, EXAMPLES?
- [ ] **Acceptance criteria clear**: Do I know exactly what "done" looks like?
- [ ] **Tests planned**: Have I identified what tests are needed?
- [ ] **Documentation considered**: Will I need to update README.md, VISION.md, or add docstrings?

## Project Specifics

### Architecture
- **Backend**: FastAPI, SQLAlchemy async, Mistral API
- **Frontend**: React (migrating from vanilla JS), jsPDF, CSS
- **Database**: SQLite (Phase 1-4), PostgreSQL (Phase 5)
- **Testing**: pytest (backend), jest (frontend), Cypress (E2E)

### Quality Standards
- **Test Coverage**: 80% minimum per module/component
- **Code Style**: Match existing codebase (PEP 8 for Python)
- **Documentation**: Docstrings for public functions, comments for complex logic
- **Security**: Never store API keys in code, use environment variables

### Current Phase
- Check `VISION.md` for current phase and roadmap
- Issues are organized by milestone (Phase 1.5, Phase 2, etc.)
- Phase 1.5 (Current Features) is the highest priority

## Git Workflow

**This project uses GitHub Flow with Issue-Based Branching.**

### ✅ DO:
- **Always create a dedicated branch** from `main` for each GitHub issue
- **Follow the naming convention**: `{type}/issue-{number}-{description}`
  - Examples: `feature/issue-42-grammar`, `fix/issue-21-filtering`, `refactor/issue-12-module`
- **Push your branch** to remote and create a PR to `main`
- **Reference the issue** in branch name, commit messages, and PR description
- **Use gh CLI** for GitHub operations when possible
- **Clean up** merged branches (local and remote)

### ❌ DON'T:
- Work directly on `main` branch
- Combine multiple issues in one branch
- Create branches without a corresponding GitHub issue
- Merge your own PR without review
- Forget to update from `main` regularly

### Workflow Quick Reference:
1. Identify the GitHub issue
2. `git checkout main && git pull origin main`
3. `git checkout -b {type}/issue-{number}-{desc}`
4. Implement changes (following SPDD)
5. `git push -u origin {branch}`
6. Create PR to `main` via GitHub UI or `gh pr create`
7. Get review and approval
8. Merge (squash and merge preferred)
9. Delete branch locally and remotely

**See `GIT-WORKFLOW.md` for complete details.**

## Resources

- **Primary**: `SPDD.md` - Complete methodology documentation
- **Vision**: `VISION.md` - Project vision and roadmap
- **Architecture**: `README.md` - Tech stack and architecture
- **Git Workflow**: `GIT-WORKFLOW.md` - Branch and PR strategy
- **Issues**: GitHub issues with acceptance criteria

## Remember

> "With great power comes great responsibility." - Uncle Ben

Your AI capabilities can generate code quickly, but **quality and correctness are more important than speed**. Always follow SPDD to ensure you're building the right thing the right way.

---

*Last updated: May 2025*
*Project: French Language Coach*
