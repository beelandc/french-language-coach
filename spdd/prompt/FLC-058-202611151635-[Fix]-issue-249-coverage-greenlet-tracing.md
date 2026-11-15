# SPDD Prompt: Trace SQLAlchemy greenlets so backend coverage reports async routers correctly

**GitHub Issue**: #249
**Issue Title**: Backend coverage under-reports async routers (trace SQLAlchemy greenlets)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/249
**Artifact ID**: FLC-058-202611151635
**Created**: 2026-11-15 16:35
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: `spdd/analysis/FLC-058-202611151621-[Analysis]-issue-249-coverage-greenlet-tracing.md`

---

## Context

### Current Codebase State
- No coverage configuration exists: no `.coveragerc`, `pyproject.toml`, `setup.cfg`, `tox.ini` or `pytest.ini` at the repo root.
- Every async router reaches the database through SQLAlchemy's `AsyncSession`, which runs ORM work inside greenlets. coverage.py doesn't follow greenlet switches by default, so lines after the first `await db.…` show as missed even when tests run them.
- Tests use FastAPI's `TestClient`, which runs the ASGI app on an anyio portal thread, so `thread` tracing is needed too.
- Measured on `main` @ `5c4644b` (coverage 7.14.0, pytest-cov 7.1.0, greenlet 3.5.0, Python 3.12.8): routers total 59% by default and 93% with `concurrency = thread,greenlet`. Tests: 829 passed, 1 xfailed under both.
- `greenlet>=3.0.0` is already in `requirements.txt`. `pytest-cov` is not, which is a pre-existing gap that #252 addresses (user decision: don't touch it or document it here).
- CI (`.github/workflows/pytest-tests.yml`) runs `python3 -m pytest tests/ -v --tb=short` without coverage and is unaffected.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `.coveragerc` (new) | coverage.py config, read automatically by coverage.py and pytest-cov from the repo root | `[run]` section |
| `database.py` | Async engine and session (where greenlets come from) | L1 imports `AsyncSession`, L6 `create_async_engine`, L14 `get_db()` |
| `tests/conftest.py` | In-memory SQLite (`sqlite+aiosqlite`), `TestClient` fixture (portal thread) | L16 `TEST_DATABASE_URL`, L57–69 `client` fixture |
| `routers/feedback.py` | AC1 reference module | L34 `await db.get(...)`, L57–58 `await db.commit()` / `refresh()` |
| `README.md` | Documents `pytest --cov=. --cov-report=term-missing` | L687–690 (**do not edit**) |
| `CLAUDE.md` | Documents `python3 -m pytest --cov=. --cov-report=term-missing` | L54 (**do not edit**) |
| `.gitignore` | Already ignores `.coverage` (L48); `htmlcov/` ignores itself | (**do not edit**) |

### Existing Patterns
- Config files at the repo root are plain and commented where a setting isn't obvious (see `.env.example`, `.gitignore`).
- Commands are run from the repo root with `python3`.

---

## Goal

**Primary Objective**: Add a root `.coveragerc` that turns on greenlet (and thread) tracing so `pytest --cov` reports the async routers' real coverage.

**Secondary Objectives**:
- Set `source = .` and the agreed `omit` list so whole-repo runs (`--cov` / `--cov=.`) measure only application code.
- Confirm the documented commands pick up the config unchanged, and that test selection and results don't change.

---

## Constraints

### Architecture Constraints
- Use `.coveragerc` (not a new `pyproject.toml` or `setup.cfg`).
- `concurrency = thread,greenlet` exactly (coverage.py allows `thread` plus one other library).
- `omit` is exactly the issue's list: `tests/*`, `frontend/*`, `.venv/*`, `scripts/*`. Don't omit `seed_*.py` (the user agreed it's #252's decision).
- No `branch`, `fail_under`, `[report]` thresholds or other settings beyond `[run]`. Those belong to #252.
- No new dependencies. Don't modify `requirements.txt`.

### Code Quality Constraints
- Short comments in `.coveragerc` explaining why `greenlet` and `thread` are needed, referencing #249.
- No changes to application code, tests, CI workflows, `README.md`, `CLAUDE.md` or `.gitignore` (user decision: no README note).

### Testing Constraints
- No new tests: this is tooling config, and the coverage report is the verification.
- Test selection and results must stay identical: 829 passed, 1 xfailed.
- No frontend tests are involved, so the runner-discovery gotcha doesn't apply.

### Acceptance Criteria
- [ ] Repo coverage config enables greenlet tracing; `python3 -m pytest --cov=routers` reports the async routers' real coverage (e.g. `routers/feedback.py` ≥ 85%)
- [ ] The documented coverage command in `README.md` / `CLAUDE.md` still works and picks up the config
- [ ] No change in which tests run or pass

---

## Examples

### Input/Output Examples
1. **AC1: router coverage**
   - Input: `python3 -m pytest tests/ --cov=routers --cov-report=term` (no `--cov-config`)
   - Expected Output: `routers/feedback.py` 90% (≥ 85%), `routers/messages.py` 90%, `routers/sessions.py` 96%, `routers/card_review.py` 100%, `routers/vocabulary.py` 96%, `routers/grammar.py` 83% (sync, unchanged), TOTAL ~93%; `829 passed, 1 xfailed`

2. **AC2: documented commands**
   - Input: `pytest --cov=. --cov-report=term-missing` and `python3 -m pytest --cov=. --cov-report=term-missing`
   - Expected Output: both succeed; no rows for `tests/`, `frontend/`, `scripts/` or `.venv/`; router rows match example 1; TOTAL ~91%; `seed_all_decks.py` and `seed_database.py` listed at 0%

3. **AC3: no coverage**
   - Input: `python3 -m pytest tests/ -v --tb=short`
   - Expected Output: `829 passed, 1 xfailed` (same as `main` before the change)

### Edge Cases
- **`--cov=<path>` on the CLI** overrides `source` but keeps `concurrency` and `omit`. Example 1 shows this.
- **Plain `--cov` with no argument** uses `source = .` from the config. It should give the same table as `--cov=.`.
- **Config actually loaded**: `python3 -m coverage debug config` from the repo root should show `concurrency: ['thread', 'greenlet']` and the four omit patterns, with `.coveragerc` as the config file.

### Test Cases
No new test code. Verification is the command output above, recorded in the *Verification* section.

---

## Deliverables

### Code Changes
- [ ] `.coveragerc` (new, repo root): `[run]` with `concurrency`, `source`, `omit`, plus explanatory comments

### Tests
- [ ] None added. Run the AC1–AC3 commands and record the output

### Documentation
- [ ] None. `README.md` and `CLAUDE.md` stay unchanged (user decision). The prompt artifact's AI Response, Human Review Notes and Verification sections get filled in after implementation

---

## Actual Prompt

```
Implement GitHub issue #249 (French Language Coach): make backend coverage trace
SQLAlchemy greenlets so async FastAPI routers report their real coverage.

CONTEXT:
- Repo root has no coverage config (.coveragerc / pyproject.toml / setup.cfg absent).
- Async routers use SQLAlchemy AsyncSession (database.py: create_async_engine L6,
  get_db L14). Code after `await db.…` runs in greenlets, which coverage.py does not
  trace by default, so routers under-report (~40% instead of ~90-100%).
- Tests use fastapi.testclient.TestClient (tests/conftest.py L57-69), which runs the
  app on an anyio portal thread, so thread tracing is also required.
- greenlet>=3.0.0 is already in requirements.txt. pytest-cov is NOT in requirements.txt;
  that gap belongs to issue #252. Do not add it or document it.
- Baseline (main @ 5c4644b): routers total 59% default vs 93% with
  `concurrency = thread,greenlet`; 829 passed, 1 xfailed in both.
- Documented commands: README.md L689 `pytest --cov=. --cov-report=term-missing`,
  CLAUDE.md L54 `python3 -m pytest --cov=. --cov-report=term-missing`.

GOAL:
Create `.coveragerc` at the repo root so every `pytest --cov…` run from the repo root
traces greenlets and threads, measures application code only, and leaves test
selection and results unchanged.

CONSTRAINTS:
- File: `.coveragerc` only. Contents: a `[run]` section with
    concurrency = thread,greenlet
    source = .
    omit =
        tests/*
        frontend/*
        .venv/*
        scripts/*
  plus brief comments explaining that SQLAlchemy's async session runs ORM code in
  greenlets and TestClient runs the app in a thread (reference #249).
- Do NOT omit seed_*.py (decision deferred to #252).
- Do NOT add branch, fail_under, [report] or other settings (#252).
- Do NOT modify requirements.txt, README.md, CLAUDE.md, .gitignore, CI workflows,
  application code or tests. No new dependencies.
- Run all commands from the repo root with python3.

EXAMPLES:
- `python3 -m pytest tests/ --cov=routers --cov-report=term` →
  routers/feedback.py 90%, messages.py 90%, sessions.py 96%, card_review.py 100%,
  vocabulary.py 96%, grammar.py 83%, TOTAL ~93%; 829 passed, 1 xfailed.
- `pytest --cov=. --cov-report=term-missing` and
  `python3 -m pytest --cov=. --cov-report=term-missing` → succeed, no tests/,
  frontend/, scripts/, .venv/ rows; TOTAL ~91%; seed_*.py listed at 0%.
- `python3 -m pytest tests/ -v --tb=short` → 829 passed, 1 xfailed.
- `python3 -m coverage debug config` → concurrency ['thread', 'greenlet'], the four
  omit patterns, config file .coveragerc.

ACCEPTANCE CRITERIA:
- [ ] Repo coverage config enables greenlet tracing; `python3 -m pytest --cov=routers`
      reports real async router coverage (routers/feedback.py ≥ 85%)
- [ ] The documented coverage command in README.md / CLAUDE.md still works and picks
      up the config
- [ ] No change in which tests run or pass

DELIVERABLES:
- New file `.coveragerc` as specified.
- Verification output for each example above, recorded in this prompt artifact's
  Verification section.
- No other file changes besides the SPDD artifacts.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, 2026-11-15.

Created `.coveragerc` at the repo root: a `[run]` section with `concurrency = thread,greenlet`, `source = .` and `omit = tests/*, frontend/*, .venv/*, scripts/*`, plus a comment explaining why greenlet and thread tracing are needed (#249). No other files changed besides the SPDD artifacts.

---

## Human Review Notes

### Changes Made
- [x] `.coveragerc` added exactly as specified in the prompt. No deviations
- [x] No changes to application code, tests, `requirements.txt`, CI, `README.md`, `CLAUDE.md` or `.gitignore` (user decisions recorded in the analysis)

### Quality Checks
- [x] Code follows existing patterns (plain, commented root config file)
- [x] Tests pass (829 passed, 1 xfailed). Coverage is now measured correctly: whole repo 91%, routers 93%. Modules still under 80% (`main.py` 71%, `database.py` 78%, `seed_*.py` 0%) are pre-existing and left to #252 or follow-up issues
- [x] Documentation: none required. The documented commands are unchanged and pick up the config
- [x] All acceptance criteria met

### Issues Found
- **Bare `pytest` isn't on PATH in the local shell used for verification.** The `pytest` script lives in `/Library/Frameworks/Python.framework/Versions/3.12/bin`, which isn't on this shell's PATH. The README command was run through that script with the directory prepended to PATH. This is a local environment detail, not a repo problem
- **`pytest-cov` isn't in `requirements.txt`** (pre-existing). The coverage commands only work where it's installed. Left to #252 per the user's decision

---

## Verification

Environment: Python 3.12.8, coverage 7.14.0, pytest-cov 7.1.0, greenlet 3.5.0, macOS. All commands run from the repo root with no `--cov-config` flag.

| Check | Command | Result |
|---|---|---|
| Config loaded | `python3 -m coverage debug config` | `config_file: .coveragerc`; `concurrency: thread, greenlet`; `run_omit: tests/*, frontend/*, .venv/*, scripts/*`; `source: .` |
| AC1 | `python3 -m pytest tests/ --cov=routers --cov-report=term` | `routers/feedback.py` **90%** (was 42%), `messages.py` 90% (38%), `sessions.py` 96% (39%), `card_review.py` 100% (42%), `vocabulary.py` 96% (52%), `grammar_progress.py` 100% (85%), `metrics.py` 100% (85%), `grammar.py` 83% (83%, sync); TOTAL **93%** (59%). 829 passed, 1 xfailed |
| AC2 (README) | `pytest --cov=. --cov-report=term-missing` | Succeeds; router rows match AC1; TOTAL 91%; 0 rows from `tests/`, `frontend/`, `scripts/`, `.venv/`. 829 passed, 1 xfailed |
| AC2 (CLAUDE.md) | `python3 -m pytest --cov=. --cov-report=term-missing` | Same as README run; `seed_all_decks.py` / `seed_database.py` listed at 0% as expected |
| Plain `--cov` | `python3 -m pytest tests/ --cov` | Uses `source = .`; TOTAL 91%. 829 passed, 1 xfailed |
| AC3 | `python3 -m pytest tests/ -v --tb=short` (CI command) | 829 passed, 1 xfailed, identical to `main` before the change |

- [x] All acceptance criteria from issue #249 are met
- [x] Tests pass; coverage is now measured correctly (91% total, 93% routers). No new code needed tests
- [x] Code follows project conventions
- [x] Documentation is updated (none required; user chose no README note)
- [x] No breaking changes introduced (the config only applies when `--cov` is used)
- [ ] Human review completed (pending PR review)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
