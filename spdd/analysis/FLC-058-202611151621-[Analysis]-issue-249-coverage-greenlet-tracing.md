# SPDD Analysis: Trace SQLAlchemy greenlets so backend coverage reports async routers correctly

**GitHub Issue**: #249
**Issue Title**: Backend coverage under-reports async routers (trace SQLAlchemy greenlets)
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/249
**Artifact ID**: FLC-058-202611151621
**Created**: 2026-11-15 16:21
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> `pytest --cov` under-reports coverage for every async FastAPI router. Lines that run inside SQLAlchemy's async session (after an `await db.…` call) execute in greenlets, which coverage.py doesn't trace by default. Those lines show as missed even when tests exercise them. Because of this, the 80% coverage standard can't be checked for routers with the current setup.
>
> Found while working on #229 (PR #248).
>
> ## Evidence
>
> Same test run (`python3 -m pytest tests/ --cov=routers`), with and without greenlet tracing:
>
> | Module | Default config | `concurrency = thread,greenlet` |
> |---|---|---|
> | `routers/feedback.py` | 42% | 90% |
> | `routers/messages.py` | 38% | 90% |
> | `routers/sessions.py` | 39% | 96% |
> | `routers/card_review.py` | 42% | (not measured) |
> | `routers/vocabulary.py` | 52% | (not measured) |
>
> With greenlet tracing, the remaining misses in `routers/feedback.py` are real gaps (the 404/400 guards), so the measured number becomes meaningful.
>
> ## Current state
> - There is no coverage configuration in the repo (no `.coveragerc`, no `[tool.coverage]` / `[coverage:run]` section).
> - CI (`.github/workflows/`) runs backend tests without coverage, so the 80% target isn't measured or enforced for the backend in CI.
> - `CLAUDE.md` and `README.md` document `python3 -m pytest --cov=. --cov-report=term-missing`, which gives misleading router numbers today.
>
> ## Proposed change
> - Add a coverage config file at the repo root (e.g. `.coveragerc`) with:
>   ```ini
>   [run]
>   concurrency = thread,greenlet
>   source = .
>   omit =
>       tests/*
>       frontend/*
>       .venv/*
>       scripts/*
>   ```
>   (Agree the exact `omit` list in the analysis.)
> - `greenlet` is already in `requirements.txt` (`greenlet>=3.0.0`), so no new dependency is needed.
> - Running and enforcing coverage in CI is tracked separately in #252, which depends on this issue.
>
> ## Acceptance criteria
> - [ ] Repo coverage config enables greenlet tracing; `python3 -m pytest --cov=routers` reports the async routers' real coverage (e.g. `routers/feedback.py` ≥ 85%)
> - [ ] The documented coverage command in `README.md` / `CLAUDE.md` still works and picks up the config
> - [ ] No change in which tests run or pass
>
> ## Out of scope
> - Running or enforcing coverage in CI (#252)
> - Writing new tests to raise coverage in specific routers (separate issues once real numbers are visible)
> - Frontend coverage configuration

---

## Background

SQLAlchemy's asyncio extension (`AsyncSession`, used by every router through `database.get_db`) runs the synchronous ORM core inside a greenlet and bridges back to the event loop with `greenlet_spawn`. coverage.py installs its trace function per thread. It doesn't follow greenlet switches unless `concurrency` includes `greenlet`. So any router code that runs after the first `await db.execute(...)` / `await db.commit()` in a request is invisible to the tracer and reported as missed.

The tests also need `thread` tracing. `fastapi.testclient.TestClient` (used throughout `tests/`) runs the ASGI app on an anyio portal thread. coverage.py lets you combine `thread` with one other concurrency library, so the issue's `concurrency = thread,greenlet` is the right setting.

### Baseline measured for this analysis (main @ `5c4644b`, coverage 7.14.0, pytest-cov 7.1.0, greenlet 3.5.0)

`python3 -m pytest tests/ --cov=routers` with an empty rcfile and then with `concurrency = thread,greenlet` (both via a scratch `--cov-config`, so nothing was written to the repo):

| Module | Default | `thread,greenlet` |
|---|---|---|
| `routers/card_review.py` | 42% | 100% |
| `routers/feedback.py` | 42% | 90% |
| `routers/grammar.py` | 83% | 83% (sync router, unaffected) |
| `routers/grammar_progress.py` | 85% | 100% |
| `routers/messages.py` | 38% | 90% |
| `routers/metrics.py` | 85% | 100% |
| `routers/sessions.py` | 39% | 96% |
| `routers/vocabulary.py` | 52% | 96% |
| **Total (`routers/`)** | **59%** | **93%** |

Test outcome was identical in both runs: **829 passed, 1 xfailed** (runtime ~7.3 s → ~9.3 s).

Whole-repo run with the full proposed config (`source = .`, issue's `omit` list): total **91%**. Modules under 80%: `main.py` 71%, `database.py` 78%, `seed_all_decks.py` 0%, `seed_database.py` 0%. Everything else is ≥ 83%.

---

## Business Value

- **The 80% standard becomes checkable for the backend.** Today router numbers are wrong by ~50 points, so reviewers can't tell whether a PR meets the standard.
- **Real gaps become visible.** With tracing fixed, the remaining misses (e.g. the 404/400 guards in `routers/feedback.py`) are genuine, so future test work can target them.
- **Unblocks #252.** A CI coverage gate would fail correct code without this fix.

---

## Scope In

- [ ] Add `.coveragerc` at the repo root with `[run] concurrency = thread,greenlet`, `source = .` and the agreed `omit` list
- [ ] Confirm `python3 -m pytest --cov=routers` reports real router coverage (`routers/feedback.py` ≥ 85%)
- [ ] Confirm both documented commands, `pytest --cov=. --cov-report=term-missing` (README) and `python3 -m pytest --cov=. --cov-report=term-missing` (CLAUDE.md), pick up the config with no extra flags
- [ ] Confirm the plain CI command `python3 -m pytest tests/ -v --tb=short` runs and passes the same tests (829 passed, 1 xfailed)

## Scope Out

- [ ] Running or enforcing coverage in CI, `fail_under`, `pytest-cov` in `requirements.txt`, CI path filters (all #252)
- [ ] Deciding whether `seed_*.py` are omitted or tested (#252 owns this explicitly: "Decide whether the seed scripts are omitted … or tested")
- [ ] New tests to raise coverage in any module
- [ ] Branch coverage (`branch = True`). It would change every number and belongs with the threshold decision in #252
- [ ] Frontend coverage configuration
- [ ] Any change to application code or tests
- [ ] Any `README.md` or `CLAUDE.md` edit. The documented commands are unchanged and pick up the config on their own (user decision, 2026-11-15)

---

## Acceptance Criteria (ACs)

1. **AC1**: Greenlet tracing is configured and async routers report real coverage
   **Given** a `.coveragerc` at the repo root with `concurrency = thread,greenlet`
   **When** a developer runs `python3 -m pytest --cov=routers` from the repo root (no `--cov-config` flag)
   **Then** `routers/feedback.py` reports ≥ 85% (expected 90%), and the other async routers report roughly the greenlet-column numbers above instead of ~40%

2. **AC2**: The documented coverage command still works and uses the config
   **Given** `pytest-cov` is installed
   **When** a developer runs `pytest --cov=. --cov-report=term-missing` (README) or `python3 -m pytest --cov=. --cov-report=term-missing` (CLAUDE.md)
   **Then** the command succeeds, `tests/`, `frontend/`, `scripts/` and `.venv/` files don't appear in the report, and router numbers match the greenlet column

3. **AC3**: No change in which tests run or pass
   **Given** the new `.coveragerc`
   **When** `python3 -m pytest tests/ -v --tb=short` (the CI command, no coverage) and the coverage commands are run
   **Then** each run reports 829 passed, 1 xfailed, the same as on `main` before the change

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Async DB session dependency**: `database.py` (`AsyncSession`, `get_db`) is the source of the greenlet execution
- **Async routers**: `routers/feedback.py`, `routers/messages.py`, `routers/sessions.py`, `routers/card_review.py`, `routers/vocabulary.py`, `routers/grammar_progress.py`, `routers/metrics.py` are the affected modules. `routers/grammar.py` serves static JSON and is unaffected (83% in both runs)
- **Test harness**: `tests/conftest.py` (in-memory SQLite, `TestClient`), which runs the app in a portal thread, hence `thread` tracing
- **Documented coverage commands**: `README.md:689` (`pytest --cov=. --cov-report=term-missing`), `CLAUDE.md:54` (`python3 -m pytest --cov=. --cov-report=term-missing`)
- **Ignored coverage outputs**: `.gitignore:48` ignores `.coverage`; `htmlcov/` ignores itself (coverage.py writes `htmlcov/.gitignore`). `.coveragerc` is not ignored (checked with `git check-ignore`)
- **Dependency**: `requirements.txt:10` `greenlet>=3.0.0` (already present). `pytest-cov` is **not** in `requirements.txt` (installed locally, 7.1.0); #252 adds it

### New Concepts Required

- **`.coveragerc`** (repo root): the coverage.py configuration, picked up automatically by coverage.py and pytest-cov when run from the repo root. It's the single place #252 will add `fail_under` to

### Key Business Rules

- **Rule**: Coverage numbers must reflect code the tests actually execute, so the 80%-per-module standard (`SPDD.md:81`) can be applied
- **Rule**: The config must not change test selection or results. It only affects runs that pass `--cov`
- **Rule**: The omit list must not hide application code that runs in production

---

## Strategic Approach

### Solution Direction

1. Create `.coveragerc` at the repo root with the `[run]` section from the issue (omit list as agreed below), with a short comment explaining why greenlet tracing is needed
2. Run the AC1 command and the two documented commands with no `--cov-config` flag. Check that router numbers match the greenlet column and omitted paths don't appear
3. Run the CI command without coverage and confirm 829 passed, 1 xfailed

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Config file format | `.coveragerc` is read automatically by coverage.py and pytest-cov and affects nothing else. `pyproject.toml` `[tool.coverage]` would create a new `pyproject.toml`, which pytest would then treat as a rootdir/config candidate and pip as a project file. `setup.cfg` is legacy | **`.coveragerc`**, as the issue suggests |
| Concurrency setting | `greenlet` alone loses the `TestClient` portal thread. `thread,greenlet` covers both (coverage.py allows `thread` plus one other) | **`concurrency = thread,greenlet`** |
| `source` | `source = .` makes `--cov` (no argument) measure the whole repo and lists unexecuted files under it. A CLI `--cov=<path>` overrides it, so `--cov=routers` still works | **`source = .`** |
| `omit` list | The issue's list (`tests/*`, `frontend/*`, `.venv/*`, `scripts/*`) removes test code, the frontend tree (it holds a `.py` file under `node_modules`), an optional local venv, and the validation CLI scripts. Omitting `seed_*.py` would raise the total to ~94%, but `seed_database.py` runs at app startup (`main.py:43-44`), and #252 explicitly owns that decision | **Use the issue's list as is.** Leave `seed_*.py` measured for #252 to decide |
| Branch coverage | Would make numbers stricter and is good practice, but changes the baseline #252 is designing its gate around | **Not in this issue.** Note it for #252 |
| `pytest-cov` dependency | The documented commands need it, but it isn't in `requirements.txt`. Adding it is a new dependency (needs approval per CLAUDE.md), and #252 AC1 already adds it | **Don't add it here, and don't add a README note.** #252 handles it (user decision, 2026-11-15) |

### Alternatives Considered

- **Pass `--cov-config` or `--cov-context` flags in every documented command**: rejected because it's easy to forget and doesn't help ad-hoc runs. A root config file is picked up automatically
- **`[tool.coverage]` in a new `pyproject.toml`**: rejected because it introduces a file pytest and pip also interpret, for no gain
- **Make the routers avoid greenlets (e.g. a sync session in tests)**: rejected because it changes application or test architecture to work around a tooling setting
- **Omit `seed_*.py` now**: deferred to #252, which owns the decision and the threshold that motivates it

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Exact `omit` list ("Agree the exact `omit` list in the analysis") | Whether to add `seed_*.py` or anything else | **Resolved (user agreed, 2026-11-15):** keep the issue's four entries. `seed_*.py` stays measured and goes to #252 |
| AC2 "still works" while `pytest-cov` isn't in `requirements.txt` | A fresh `pip install -r requirements.txt` can't run `--cov` at all (pre-existing, not caused by this issue) | **Resolved (user, 2026-11-15):** #252 addresses it. No README note |
| Whether `CLAUDE.md` needs editing | The command there is unchanged and will pick up the config | No `CLAUDE.md` or `README.md` edit. Verify the commands only |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Run from a subdirectory (e.g. `cd tests && pytest --cov`) | coverage.py looks for `.coveragerc` in the current directory | Documented commands run from the repo root (the README and CLAUDE.md already assume this). No handling needed |
| `--cov=<path>` on the CLI | Overrides `source` | Expected. `omit` and `concurrency` still apply (checked with `--cov=routers`) |
| `greenlet` not installed | coverage.py errors when `concurrency = greenlet` can't import it | `greenlet>=3.0.0` is already a hard requirement (and SQLAlchemy async needs it anyway) |
| Plain `pytest` without `--cov` | Must not be affected | coverage.py and pytest-cov only read `.coveragerc` when coverage is active. Verified in AC3 |
| Stale `.coverage` data file from an older run | Could confuse a later `coverage report` | pytest-cov erases data at the start of each run by default. No handling needed |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| Older coverage.py doesn't support combined `thread,greenlet` | Config error on an old environment | Combined values have been supported since coverage 6.x. Note the tested versions in the PR. Pinning `pytest-cov`/`coverage` minimums belongs with #252 |
| Slower coverage runs | ~2 s extra on ~9 s | Acceptable. Only applies to `--cov` runs |
| Whole-repo total shifts from 82% (#252's default-config figure) to 91% | Could look like an unexplained jump | Record both figures in the PR. The jump is the measurement fix |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | Greenlet tracing configured; `routers/feedback.py` ≥ 85% | Yes | Measured 90% with the equivalent scratch config |
| AC2 | Documented command works and picks up config | Yes | Requires `pytest-cov` installed (pre-existing gap, left to #252). No doc changes |
| AC3 | No change in which tests run or pass | Yes | 829 passed, 1 xfailed with and without tracing |

**AC Coverage Summary**: 3 of 3 ACs are addressable with the proposed approach.

**Implicit Requirements Not in ACs**:
- `.coveragerc` must be committed (not gitignored). Checked: it isn't ignored
- The config should explain itself (a comment on the `concurrency` line), so nobody removes it as noise

---

## REASONS Canvas

This section explicitly maps to the REASONS canvas from SPDD methodology.

### Requirements
- Root `.coveragerc` with `concurrency = thread,greenlet`, `source = .`, `omit = tests/*, frontend/*, .venv/*, scripts/*`
- `python3 -m pytest --cov=routers` → `routers/feedback.py` ≥ 85%
- README/CLAUDE.md coverage commands work unchanged and use the config
- Test selection and results unchanged (829 passed, 1 xfailed)

### Examples
- `python3 -m pytest tests/ --cov=routers` → `routers/feedback.py 31 stmts, 3 miss, 90%`, `routers/sessions.py 96%`, `routers/messages.py 90%`, `routers/card_review.py 100%`, `routers/vocabulary.py 96%`, routers total 93%
- `python3 -m pytest --cov=. --cov-report=term-missing` → no `tests/…`, `frontend/…`, `scripts/…` rows; total ~91%; `seed_all_decks.py`/`seed_database.py` listed at 0%
- `python3 -m pytest tests/ -v --tb=short` → `829 passed, 1 xfailed`

### Architecture
- Async FastAPI routers → `Depends(get_db)` → SQLAlchemy `AsyncSession` (greenlet bridge) in `database.py`
- Tests: `tests/conftest.py`, `TestClient` (portal thread) against in-memory SQLite
- No coverage config exists today. CI (`.github/workflows/pytest-tests.yml`) runs pytest without coverage and is unaffected

### Standards
- 80% coverage per module (`SPDD.md:81`). This issue makes it measurable rather than raising it
- Config comments explain non-obvious settings
- No README update: the documented commands (`README.md:687-690`, `CLAUDE.md:54`) stay as they are and pick up `.coveragerc` automatically. The user chose not to add a note
- No application code changes, so PEP 8 and docstring rules don't come into play. No new tests needed: the change is tooling configuration, and the verification is the coverage report itself

### Omissions
- CI coverage, thresholds, `pytest-cov` in `requirements.txt`, CI path filters (#252)
- Seed-script omit/test decision (#252)
- Branch coverage
- New tests for low-coverage modules
- Frontend coverage

### Notes
- coverage.py only allows `thread` combined with one other concurrency library, which is why `thread,greenlet` and not more
- A CLI `--cov=<path>` overrides `source` but keeps `omit`/`concurrency`
- `frontend/node_modules` contains at least one `.py` file, which is why `frontend/*` must stay omitted
- Tested with coverage 7.14.0, pytest-cov 7.1.0, greenlet 3.5.0, Python 3.12.8

### Solutions
- The issue's proposed `[run]` block, verified locally via a scratch `--cov-config` before any repo change
- SQLAlchemy's documented guidance for coverage under asyncio is `concurrency = greenlet` (combined with `thread` here for `TestClient`)

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
