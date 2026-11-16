# SPDD Analysis: Enforce backend test coverage in CI (80% gate)

**GitHub Issue**: #252
**Issue Title**: Enforce backend test coverage in CI so PRs below the 80% threshold can't merge
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/252
**Artifact ID**: FLC-060-202611151846
**Created**: 2026-11-15 18:46
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)

---

## Original Business Requirement

> ## Summary
>
> The project standard is **80% test coverage** (SPDD.md, `.vibe/instructions.md`), but CI never measures backend coverage. `.github/workflows/pytest-tests.yml` runs `python3 -m pytest tests/ -v --tb=short` without `--cov`, and `pytest-cov` isn't in `requirements.txt`. A PR can lower coverage, or add untested code, and still merge. Add a coverage step to the backend CI job that fails below the threshold, so the existing required `status-gateway` check blocks the merge.
>
> **Depends on:** #249. Async routers under-report by ~50 points until coverage traces SQLAlchemy greenlets, so a per-module gate would fail on correct code without that fix.
>
> ## Current state (`main`, Nov 2026)
> - `pytest-tests.yml` already appears in `status-gateway.yml`'s `expectedWorkflowNames` ("Pytest Backend Unit Tests"), so a failing coverage step in that workflow fails the gateway. No gateway change is needed unless the step moves to a new workflow.
> - **Path-filter gap:** the workflow only triggers on `models/**`, `routers/**`, `services/**`, `tests/**`, `requirements.txt`, `database.py`, `config.py`, `main.py` and the workflow file. PRs that only change `schemas/**`, `scenarios.py`, `data/**` or `seed_*.py` don't run backend tests at all, and so would skip the coverage gate.
> - Baseline, measured locally with `source = .` and `tests/`, `frontend/`, `scripts/`, `.venv/` omitted:
>
>   | | Default config | With greenlet tracing (#249) |
>   |---|---|---|
>   | Total | 82% | 91% |
>   | Modules under 80% | many async routers (~40%) | `main.py` 71%, `database.py` 78%, `seed_all_decks.py` 0%, `seed_database.py` 0% |
>
> ## Proposed approach
> 1. Add `pytest-cov` to `requirements.txt` (pinned with a minimum version, like the other test dependencies).
> 2. Build on the #249 coverage config. Set `fail_under = 80` in it so local runs and CI use the same threshold. Decide whether the seed scripts are omitted (they are CLI entry points) or tested.
> 3. Change the CI test step to something like:
>    ```bash
>    python3 -m pytest tests/ -v --tb=short --cov --cov-report=term-missing --cov-report=xml
>    ```
>    Upload `coverage.xml` as an artifact. Optionally write the coverage table to the job summary.
> 4. Widen the workflow `paths` filters (push and pull_request) to every file that affects backend behaviour or coverage: at least `schemas/**`, `scenarios.py`, `data/**`, `seed_*.py` and the coverage config file.
> 5. **Decide on per-module enforcement** (record the choice in the SPDD analysis). The standard says "80% per module", but `--cov-fail-under` only checks the total:
>    - **(a) Total only**: `fail_under = 80`. Simplest, but a well-covered codebase can hide an untested new module.
>    - **(b) Per-module check**: a small script reads `coverage.json` and fails if any measured file is under 80%, with an explicit, commented allowlist for known exceptions (e.g. `main.py` until it's covered). No new dependency.
>    - **(c) Diff coverage**: e.g. `diff-cover coverage.xml --compare-branch=origin/main --fail-under=80`, so new or changed lines must be 80% covered. Strongest for "this PR adds untested code", but it's a new dependency and needs the base branch fetched.
>
>    Recommendation: (a) plus (b), with (c) as an option if you're happy to add a dependency.
> 6. Update README / CLAUDE.md to document the gate and the exact command, so contributors can reproduce the CI check locally.
>
> ## Acceptance criteria
> - [ ] `pytest-cov` is in `requirements.txt`
> - [ ] The backend CI job runs tests with coverage and **fails when coverage is below 80%**, using the threshold from the repo's coverage config (one source of truth for local and CI)
> - [ ] The per-module enforcement decision is recorded and implemented. Any allowlisted modules are listed with a reason and a follow-up issue
> - [ ] The workflow triggers on every backend-affecting path (including `schemas/**`, `scenarios.py`, `data/**`, the coverage config), so the gate can't be skipped by which files a PR touches
> - [ ] A failing coverage step fails the required `status-gateway` check (shown with a throwaway test PR or branch that drops coverage, linked in the PR)
> - [ ] The coverage report is visible from the CI run (artifact and/or job summary)
> - [ ] README / CLAUDE.md document the gate and the local command
> - [ ] `main` passes the new gate when the PR merges
>
> ## Out of scope
> - Raising coverage of specific modules beyond what's needed to pass (separate issues for any allowlisted modules)
> - Frontend coverage gates (Jest/Vitest have no thresholds configured today; a separate issue if wanted)
> - Changing the 80% standard

---

## Background

80% coverage per module is a stated quality gate in `SPDD.md` ("Quality Gates" §3), `.vibe/instructions.md` ("80% test coverage is mandatory - No exceptions") and the README intro, but nothing measures it for the backend. Until #249 (merged as `4014e34`) the numbers were also wrong: async routers under-reported by ~50 points because SQLAlchemy's async ORM work runs in greenlets that coverage.py didn't trace. With `.coveragerc` now tracing `thread,greenlet`, the measured numbers are trustworthy, so they can be enforced.

The project is a testbed for AI-assisted development (two coding agents, every change through SPDD and CI before a human merges). An automated coverage gate turns "80% coverage" from a checklist item agents self-report into something CI verifies.

**Dependency check**: #249 is CLOSED (merged in `4014e34`). #250 (frontend type check, the last commit on `main`, `3e81164`) is unrelated but added the `Frontend Type Check` workflow to the gateway list, a pattern this issue does not need to repeat.

### Measured baseline (this branch, `main` @ `3e81164`, `python3 -m pytest tests/ --cov`)

829 passed, 1 xfailed. **TOTAL 91.17%** (2219 statements, 196 missed). Modules under 80%:

| Module | Cover | Missing | What the misses are |
|---|---|---|---|
| `main.py` | 71% | 40-44, 101-107, 123-129 | Startup auto-seed branch (`main.py:40-44`, only runs when the DB has no decks); success path of `GET /` and the SPA fallback reading `static/index.html` (`main.py:101-107`, `main.py:123-129`) |
| `database.py` | 78% | 15-16 | Body of `get_db()` (`database.py:14-16`); tests override this dependency with an in-memory session in `tests/conftest.py`, so the real one never runs |
| `seed_database.py` | 0% | 20-204 | DB seeder; a CLI (`__main__`) **and** imported at runtime by `main.py:43` (`from seed_database import seed_database`) on first startup |
| `seed_all_decks.py` | 0% | 23-141 | CLI that generates `data/vocabulary_cards/*.json` from `data/deck_definitions.json`; not imported by any app or test code |

Every other measured module is ≥ 83% (lowest: `routers/grammar.py` 83%).

---

## Business Value

- The 80% standard becomes enforced: a PR that lowers total coverage below 80%, or adds a new module under 80%, can't pass the required `status-gateway` check.
- Contributors (human and both AI agents) can reproduce the exact CI check locally with one documented command, and the threshold lives in one place.
- Closes the path-filter gap, so backend tests (not only coverage) run on PRs that touch `schemas/`, `data/`, `scenarios.py` or the seed scripts. Today a breaking schema change can merge without any backend test run.
- Coverage reports are visible on every CI run (job summary + downloadable artifact), so reviewers can see coverage without checking out the branch.

---

## Scope In

- [ ] Add `pytest-cov` (and an explicit `coverage` minimum) to `requirements.txt`
- [ ] Add `[report] fail_under = 80` to `.coveragerc` (single source of truth for the total threshold)
- [ ] Add `seed_all_decks.py` to `.coveragerc` `omit` (CLI content generator, same category as `scripts/`)
- [ ] New per-module check script `scripts/check_module_coverage.py`: reads `coverage.json`, reads the threshold from the coverage config, fails if any measured file not on the allowlist is below it, with a commented allowlist (module → reason + follow-up issue)
- [ ] Unit tests for the per-module check script in `tests/`
- [ ] Update `.github/workflows/pytest-tests.yml`: run with `--cov` and term/xml/json reports; run the per-module check; write the coverage table to the job summary; upload the coverage reports as an artifact
- [ ] Widen the workflow `paths` filters (push and pull_request) to all backend-affecting paths
- [ ] Ignore generated coverage outputs (`coverage.xml`, `coverage.json`, `htmlcov/`) in `.gitignore`
- [ ] One follow-up GitHub issue for the allowlisted modules (created only with the user's approval)
- [ ] Throwaway branch / draft PR that demonstrates a failing coverage step failing `status-gateway` (pushed only with the user's approval; closed and deleted afterwards)
- [ ] README.md and CLAUDE.md: document the gate, the local command and the allowlist

## Scope Out

- [ ] Raising coverage of `main.py`, `database.py`, `seed_database.py` (follow-up issue)
- [ ] Frontend coverage thresholds (Jest/Vitest)
- [ ] Changing the 80% standard
- [ ] Diff coverage (`diff-cover`), option (c): a new dependency; not adopted unless the user asks (see Key Design Decisions)
- [ ] Changes to `status-gateway.yml` (the workflow name "Pytest Backend Unit Tests" stays, so the gateway already tracks it)
- [ ] Coverage services (Codecov, Coveralls): external services, not needed for a pass/fail gate
- [ ] Fixing the existing `Upload Test Results` step's reference to `pytest.xml`, which no step generates (pre-existing; harmless because `upload-artifact` only warns about missing files). Noted, not changed, unless the user wants it folded in.

---

## Acceptance Criteria (ACs)

1. **AC1**: `pytest-cov` in requirements
   **Given** a fresh environment
   **When** `pip install -r requirements.txt` runs
   **Then** `pytest-cov` (pinned with a minimum version) is installed and `python3 -m pytest --cov` works

2. **AC2**: CI fails below 80% total, threshold from repo config
   **Given** `.coveragerc` contains `[report] fail_under = 80`
   **When** the "Pytest Backend Unit Tests" workflow runs `python3 -m pytest tests/ ... --cov ...` and total coverage is below 80%
   **Then** the step fails (pytest-cov reads `fail_under` from the coverage config; the workflow passes no hard-coded number), and the same command run locally fails the same way

3. **AC3**: Per-module decision recorded and implemented
   **Given** this analysis records option (a) + (b)
   **When** the per-module check runs on the CI coverage data
   **Then** any measured module below the threshold that is not allowlisted fails the job; each allowlisted module has a reason and a linked follow-up issue in the script and the README

4. **AC4**: Workflow triggers on every backend-affecting path
   **Given** a PR that only changes `schemas/**`, `scenarios.py`, `data/**`, a `seed_*.py`, `.coveragerc` or the check script
   **When** the PR is opened against `main`
   **Then** "Pytest Backend Unit Tests" runs (same for `push` to `main`)

5. **AC5**: Failing coverage fails `status-gateway`
   **Given** a throwaway branch off this branch that drops coverage (an untested module, then a raised threshold)
   **When** a draft PR is opened from it
   **Then** the coverage step fails, "Pytest Backend Unit Tests" concludes `failure`, and "Status Check Gateway" fails; the run/PR is linked in this issue's PR

6. **AC6**: Coverage report visible from the CI run
   **Given** any run of the workflow (pass or fail)
   **When** the run finishes
   **Then** the job summary shows the coverage table and the per-module result, and a `coverage-report` artifact holds `coverage.xml` and `coverage.json`

7. **AC7**: Docs
   **Given** a contributor reading README.md or CLAUDE.md
   **When** they look up backend testing
   **Then** they find the gate, the exact local command that reproduces CI, how to run a single test file with coverage without tripping the threshold, and the allowlist with its follow-up issue

8. **AC8**: `main` passes
   **Given** this PR's own CI run (it changes the workflow file, so the workflow triggers)
   **When** it runs on the merged code
   **Then** the coverage step and per-module check pass (total 91% ≥ 80%; only allowlisted modules are under 80%)

---

## Domain Concept Identification

### Existing Concepts (from codebase)

- **Coverage config**: `.coveragerc` (added in #249). `[run]` with `concurrency = thread,greenlet`, `source = .`, `omit = tests/* frontend/* .venv/* scripts/*`. No `[report]` section yet.
- **Backend CI workflow**: `.github/workflows/pytest-tests.yml`, name "Pytest Backend Unit Tests". Python 3.12, `pip install -r requirements.txt`, runs `python3 -m pytest tests/ -v --tb=short` with `MISTRAL_API_KEY: dummy_test_key`, uploads `pytest.xml`/`.pytest_cache/`. Path filters listed in the issue.
- **Status gateway**: `.github/workflows/status-gateway.yml`. The only required check. Polls workflow runs for the PR head SHA whose name is in `expectedWorkflowNames` (includes `'Pytest Backend Unit Tests'`) and fails if any concluded `failure` or `cancelled`. If no tracked workflow ran, it passes; that's why the path-filter gap matters.
- **Test dependencies**: `requirements.txt` "# Testing" block: `pytest>=7.4.0`, `pytest-asyncio>=0.21.0`, `httpx>=0.25.0`, `factory-boy>=3.3.0`. `greenlet>=3.0.0` is already a runtime dependency.
- **Test harness**: `tests/conftest.py` (in-memory SQLite, overrides `get_db`); 829 tests.
- **Scripts directory**: `scripts/validate_grammar_lessons.py`, `validate_grammar_reference.py`, `validate_vocabulary_cards.py`, all CLI tools, all omitted from coverage. `tests/test_vocabulary_card_schema.py:154` already locates a script by path, a precedent for testing `scripts/`.
- **Seed scripts**: `seed_database.py` (async DB seeder, runtime-imported by `main.py:43`), `seed_all_decks.py` (JSON file generator, CLI only).
- **Docs**: README "To run with test coverage" (`README.md:687-690`, `pytest --cov=. --cov-report=term-missing`); CLAUDE.md Commands (`CLAUDE.md:54`, `python3 -m pytest --cov=. --cov-report=term-missing`).

### New Concepts Required

- **Total coverage threshold**: `[report] fail_under = 80` in `.coveragerc`. pytest-cov uses it as the default for `--cov-fail-under`, so local and CI runs read the same value.
- **Per-module coverage check**: `scripts/check_module_coverage.py`. Inputs: `coverage.json` (path argument, default `coverage.json`) and the coverage config threshold (via `coverage.Coverage().get_option("report:fail_under")`, so no second number). Behavior: list measured files below the threshold; fail (exit 1) if any aren't allowlisted; report allowlisted files as known exceptions; warn when an allowlisted file is now at or above the threshold (time to remove it) or no longer measured (stale entry). Optional `--summary` output in Markdown for `$GITHUB_STEP_SUMMARY`. Standard library + `coverage` only.
- **Coverage allowlist**: a dict constant in the script, `path → reason (with follow-up issue number)`. Initial entries: `main.py`, `database.py`, `seed_database.py`.
- **Coverage report artifact**: `coverage-report` (`coverage.xml`, `coverage.json`) uploaded with `if: always()`.

### Key Business Rules

- **Rule**: Total backend coverage must be ≥ `fail_under` (80) or the backend CI job fails.
- **Rule**: Every measured backend module must be ≥ 80% unless it is on the allowlist with a reason and a follow-up issue.
- **Rule**: The threshold is defined once, in `.coveragerc`. The workflow and the per-module script read it from there.
- **Rule**: Rounding matches coverage.py's own `fail_under` check (`round(percent, precision) < fail_under`, `precision` defaults to 0), so a module showing "80%" in the report never fails the per-module check.
- **Rule**: Any PR that can change backend behaviour or coverage triggers the backend workflow.
- **Rule**: Allowlist entries are temporary; the follow-up issue removes them as modules are covered.

---

## Strategic Approach

### Solution Direction

1. `requirements.txt`: add `pytest-cov>=5.0.0` and `coverage>=7.4.0` to the Testing block (explicit `coverage` floor because we rely on multi-library `concurrency` and `coverage report --format=markdown`).
2. `.coveragerc`: add `seed_all_decks.py` to `omit` with a comment; add a `[report]` section with `fail_under = 80` and a comment explaining it's the one source of truth.
3. `scripts/check_module_coverage.py` with the allowlist + `tests/test_check_module_coverage.py` covering pass, fail, allowlisted, rounding at the boundary, stale/now-passing allowlist warnings, missing JSON file, and summary output. The tests load the script by path (`importlib`) since `scripts/` isn't a package.
4. `pytest-tests.yml`:
   - Widen `paths` (push + pull_request) to `'*.py'` (all root modules: `main.py`, `config.py`, `database.py`, `scenarios.py`, `seed_*.py`, future ones), `models/**`, `routers/**`, `schemas/**`, `services/**`, `data/**`, `scripts/**`, `tests/**`, `requirements.txt`, `.coveragerc`, and the workflow file.
   - Test step: `python3 -m pytest tests/ -v --tb=short --cov --cov-report=term-missing --cov-report=xml --cov-report=json`.
   - Per-module step (`if: always() && hashFiles('coverage.json') != ''`): `python3 scripts/check_module_coverage.py coverage.json --summary "$GITHUB_STEP_SUMMARY"`.
   - Summary step (`if: always()`, guarded on `.coverage` existing): `python3 -m coverage report --format=markdown >> "$GITHUB_STEP_SUMMARY"`.
   - Upload step (`if: always()`): `coverage-report` artifact with `coverage.xml`, `coverage.json`, `if-no-files-found: ignore`.
   - Keep the workflow name unchanged so the gateway keeps tracking it.
5. `.gitignore`: add `coverage.xml`, `coverage.json`, `htmlcov/`.
6. Follow-up issue (with user approval): "Raise coverage of main.py, database.py and seed_database.py to 80% and remove them from the per-module allowlist". Put its number in the allowlist reasons and README.
7. Docs: README backend testing section and CLAUDE.md Commands. The CI-equivalent command, the per-module command, `--cov-fail-under=0` for partial runs, and the allowlist.
8. AC5 demo (with user approval): push a throwaway branch off this branch, open a **draft** PR. Commit 1 adds an untested module under `services/` → per-module check fails → gateway fails. Commit 2 removes it and sets `fail_under = 95` → pytest step fails on the total → gateway fails. Link both runs in the real PR, then close the draft PR and delete the branch.
9. Verify locally: full command passes; the per-module script passes with the allowlist; `--cov-fail-under=95` fails locally; new tests pass.

### Key Design Decisions

| Decision | Trade-offs | Recommendation |
|----------|------------|----------------|
| Per-module enforcement: (a) total only, (b) per-module script, (c) diff-cover | (a) alone lets a new untested module hide behind 91% total. (b) matches the "80% per module" standard with no new dependency; needs a small script + allowlist upkeep. (c) best catches "this PR adds untested lines" but adds a dependency, needs `origin/main` fetched (already `fetch-depth: 0`), and duplicates much of (b) at module granularity | **(a) + (b)**, as the issue recommends. (c) not adopted now; can be its own issue if wanted. Needs user confirmation. |
| `seed_all_decks.py`: omit vs allowlist vs test | It generates JSON content files from a CLI; not imported by the app or tests, same nature as the omitted `scripts/` validators. Testing would mean writing into `data/vocabulary_cards/` or refactoring paths | **Omit** in `.coveragerc` with a comment. |
| `seed_database.py`: omit vs allowlist vs test | Not just a CLI: `main.py:43` imports and runs it on first startup when the DB has no decks, so it is runtime code. Omitting it would hide untested runtime behavior. Testing needs `database.engine` patched to the test engine (moderate effort) | **Allowlist** with the follow-up issue. Do not omit. |
| `main.py` (71%), `database.py` (78%): allowlist vs add tests now | Tests are cheap (`GET /` with/without `static/index.html`, `get_db` yields a session, the auto-seed branch) but the issue puts "raising coverage of specific modules" out of scope and suggests the allowlist (e.g. `main.py`) | **Allowlist** both, one follow-up issue for all three modules. Needs user confirmation (alternative: write the small tests in this PR and allowlist only `seed_database.py`). |
| Where the threshold lives | `--cov-fail-under=80` in the workflow duplicates the number; `.coveragerc` is already the repo's coverage config | `[report] fail_under = 80` in `.coveragerc`; the workflow passes no number; the script reads it via the coverage API. |
| Where the allowlist lives | In `.coveragerc` (custom section) keeps one file but is non-standard and can't hold structured reasons; in the script it's explicit and testable | **Constant in the script**, with comments, mirrored in README. |
| Per-module rounding | Strict float comparison would fail a module the report shows as "80%" (e.g. 79.6) | Mirror coverage.py: `round(pct, precision) < threshold`, `precision` read from config (default 0). |
| Path filter style | Listing root files one by one (`main.py`, `config.py`, ...) misses new root modules; `'*.py'` matches only repo-root `.py` files (`*` doesn't cross `/` in GitHub path filters) | `'*.py'` plus explicit directories. |
| Job summary | `coverage report --format=markdown` (coverage ≥ 7.0) gives the full table with no extra code | Use it, plus the per-module script's Markdown section. |
| Pin `coverage` explicitly | pytest-cov pulls `coverage` anyway; an explicit floor documents the features we rely on | Add `coverage>=7.4.0` next to `pytest-cov>=5.0.0`. |

### Alternatives Considered

- **New dedicated "Backend Coverage" workflow**: Rejected. It would rerun the suite and require a gateway list change; the issue prefers a step in the existing job.
- **`--cov-fail-under=80` on the command line**: Rejected. Two sources of truth.
- **Per-module check via the coverage API directly from `.coverage`** (no JSON): Viable, but JSON is the documented, stable interchange format, is uploaded as an artifact anyway, and makes the script easy to unit-test with fixture files.
- **Third-party coverage services (Codecov etc.)**: Rejected. External service, tokens, data leaves the repo; not needed for pass/fail.
- **Removing the path filters entirely** (run backend tests on every PR): Simpler and leak-proof, but runs ~30s of backend CI on frontend-only PRs; the repo deliberately path-filters (see #190). Widening is enough.

---

## Risk & Gap Analysis

### Requirement Ambiguities

| Ambiguity | What needs clarification | Recommendation |
|-----------|-------------------------|----------------|
| Per-module enforcement option | (a), (a)+(b) or (a)+(b)+(c)? | (a)+(b) |
| Seed scripts | Omit, allowlist or test? | Omit `seed_all_decks.py` (CLI generator); allowlist `seed_database.py` (runtime-imported by `main.py`) |
| `main.py` / `database.py` | Allowlist, or add the small tests in this PR? | Allowlist + one follow-up issue (issue scope says raising coverage is separate) |
| Follow-up issue | Needs creating with `gh issue create` | Create one issue covering all three allowlisted modules, after user approval |
| AC5 demonstration | Needs a pushed branch and a (draft) PR, which are outward-facing | Push a throwaway branch, open a draft PR, link the failing runs, then close it and delete the branch, after user approval |
| Allowlisted module that climbs above 80% | Fail or warn? | Warn (in output and job summary), don't fail. Failing would block unrelated PRs that happen to add tests |

### Edge Cases

| Scenario | Why it matters | Expected Handling |
|----------|----------------|------------------|
| Developer runs one test file with `--cov` locally | `fail_under` in `.coveragerc` now applies to every `--cov` run, so partial runs "fail" on coverage | Document `--cov-fail-under=0` (or no `--cov`) for partial runs |
| Tests fail (not coverage) | Per-module check on partial data adds noise | Per-module step still runs only if `coverage.json` exists; the job is already failing, so it's informational |
| Total passes but a new module is at 0% | The case (a) misses | Per-module script fails and names the module |
| Module at 79.6% | Report shows 80% | Per-module check passes (same rounding as coverage.py) |
| Module with 0 statements (e.g. empty `__init__.py`) | coverage.json reports 100% for those | Passes naturally; no special case |
| Allowlist entry for a file that was renamed or deleted | Stale allowlist hides nothing but rots | Script warns "allowlisted but not measured" |
| `coverage.json` missing or malformed | Script must not crash with a traceback that looks like a code failure | Clear error message, exit code 2 |
| PR touches only `.coveragerc` or the check script | Could weaken the gate without running it | Both are in the path filters, so the gate runs |
| PR touches only `data/**` | Content tests (e.g. `test_issue_51_thematic_decks.py`) validate data files | `data/**` in path filters |
| Push to `main` | Workflow also runs on push; same gate | Same paths for push and pull_request |

### Technical Risks

| Risk | Potential Impact | Mitigation |
|------|------------------|------------|
| CI coverage differs from local (e.g. different Python patch version, greenlet tracing behaviour) | Gate fails on `main` | Total has an 11-point margin; per-module lowest non-allowlisted is 83%. Verify on this PR's own CI run before review |
| pytest-cov ignores `[report] fail_under` | Total gate silently off | pytest-cov documents that `--cov-fail-under` defaults to the config value; verified locally by checking that `fail_under = 95` fails and through the AC5 demo |
| `GITHUB_STEP_SUMMARY` written from multiple steps | Interleaving / overwrite | Append (`>>`), never overwrite |
| `concurrency = thread,greenlet` + `coverage report` run as a separate process | Combine/data-file issues | `coverage report` only reads `.coverage`; pytest-cov combines before writing. Verified locally |
| Path filter `'*.py'` semantics | Might not match root files | GitHub uses fnmatch-like globs where `*` doesn't match `/`, so `'*.py'` matches root `.py` files only. The AC5 demo and this PR's run confirm triggering |
| Allowlist becomes permanent | Standard eroded | Each entry names the follow-up issue; README lists it; script warns when an entry can be removed |

### Acceptance Criteria Coverage

| AC# | Description | Addressable? | Gaps/Notes |
|-----|-------------|--------------|------------|
| AC1 | `pytest-cov` in requirements | Yes | Plus explicit `coverage` floor |
| AC2 | CI fails below 80% from repo config | Yes | `[report] fail_under` |
| AC3 | Per-module decision recorded + implemented, allowlist with reasons + follow-up issue | Yes | Follow-up issue creation needs user approval |
| AC4 | Workflow triggers on all backend-affecting paths | Yes | |
| AC5 | Failing coverage fails `status-gateway`, demonstrated | Yes | Needs user approval to push a throwaway branch and open a draft PR |
| AC6 | Coverage report visible from CI | Yes | Job summary + artifact |
| AC7 | README / CLAUDE.md document gate + local command | Yes | |
| AC8 | `main` passes the gate on merge | Yes | Verified by this PR's CI run (workflow file changed → triggers) |

**AC Coverage Summary**: 8 of 8 ACs are addressable with the proposed approach. AC3 and AC5 each need one outward-facing action that the user must approve.

**Implicit Requirements Not in ACs**:
- The per-module script itself is tested (80% standard applies to new code, even though `scripts/` is omitted from the measured set).
- Generated coverage files aren't committed (`.gitignore`).
- The workflow name stays "Pytest Backend Unit Tests" so the gateway keeps matching it.
- No change to which tests run or pass.

---

## REASONS Canvas

This section explicitly maps to the REASONS canvas from SPDD methodology.

### Requirements
- `pytest-cov` (min version) in `requirements.txt`.
- `.coveragerc` `[report] fail_under = 80`, the single threshold for local and CI.
- Per-module enforcement: option (a) + (b), a script with a commented allowlist (reason + follow-up issue per entry).
- Backend workflow runs tests with coverage, fails below threshold, runs the per-module check, publishes a job summary and a coverage artifact.
- Workflow `paths` (push + pull_request) cover all backend-affecting paths, including `schemas/**`, `scenarios.py`, `data/**`, `seed_*.py`, `.coveragerc`.
- Demonstrated: failing coverage → failing `status-gateway` (throwaway draft PR, linked).
- README / CLAUDE.md document the gate and the local command.
- `main` passes the gate.

### Examples
- `python3 -m pytest tests/ --cov --cov-report=term-missing --cov-report=json` on this branch → TOTAL ~91%, exit 0; `python3 scripts/check_module_coverage.py coverage.json` → passes, listing `main.py` 71%, `database.py` 78%, `seed_database.py` 0% as allowlisted, exit 0.
- Same pytest command with `--cov-fail-under=95` → "FAIL Required test coverage of 95% not reached", non-zero exit.
- `coverage.json` with `services/foo.py` at 40%, not allowlisted → script prints `services/foo.py 40% < 80%`, exit 1.
- `coverage.json` with a module at 79.6% (precision 0) → passes.
- Allowlisted `main.py` at 85% → passes with a warning "main.py is allowlisted but now meets 80%; remove it from the allowlist".
- Allowlisted path absent from `coverage.json` → passes with a "stale allowlist entry" warning.
- Missing `coverage.json` → error message, exit 2.
- PR changing only `schemas/session.py` → "Pytest Backend Unit Tests" runs.
- Throwaway draft PR adding an untested `services/` module → per-module step fails → "Status Check Gateway" fails.

### Architecture
- CI: path-filtered test workflows plus `status-gateway.yml` (the one required check), which tracks workflows by name. Coverage goes into the existing "Pytest Backend Unit Tests" job; no new workflow, no gateway change.
- Coverage config in `.coveragerc` at repo root (from #249), read automatically by coverage.py and pytest-cov.
- CLI tools live in `scripts/` (omitted from coverage), run as `python3 scripts/<name>.py`.
- Tests in `tests/`, pytest, run as `python3 -m pytest tests/`.

### Standards
- PEP 8; module and public-function docstrings in the new script, matching the `scripts/validate_*.py` style.
- 80% coverage: the new script gets its own tests in `tests/test_check_module_coverage.py`. The script sits in the omitted `scripts/` dir, so verify its coverage explicitly with `--cov=scripts` (the CLI wrapper in `if __name__ == "__main__"` may be excluded).
- YAML: keep existing workflow style (comments, step names, `actions/*@v4`).
- README.md and CLAUDE.md updated (structure/setup changed). Don't copy rules into CLAUDE.md that belong in `.vibe/instructions.md`; the command and gotcha are Claude-agnostic facts and fit both README and CLAUDE.md's Commands/Gotchas.
- Commit `chore(#252): ...` on `chore/issue-252-backend-coverage-gate`; PR with `Closes #252`.

### Omissions
- No new tests for `main.py`, `database.py`, `seed_database.py` (follow-up issue).
- No frontend coverage thresholds.
- No change to the 80% standard.
- No diff-cover / new non-coverage dependency.
- No `status-gateway.yml` change.
- No external coverage service.
- No fix of the pre-existing `pytest.xml` upload reference (unless the user asks).

### Notes
- pytest-cov uses `[report] fail_under` from the coverage config as the `--cov-fail-under` default; running with `--cov` (no value) uses `[run] source = .` from the config. The documented `--cov=.` still works but `--cov` is cleaner.
- coverage.py's `fail_under` check rounds the total to `[report] precision` (default 0) before comparing; mirror that in the script. Read options via `coverage.Coverage().get_option("report:fail_under")` / `"report:precision"`.
- `coverage.json` (coverage 7.14 locally): `files[<path>]["summary"]["percent_covered"]`, `totals["percent_covered"]`, `meta["version"]`.
- `seed_database.py` uses the module-level `database.engine`, which is why the in-memory test DB never reaches it. That's the follow-up issue's problem, not this one.
- Tests override `get_db` (`tests/conftest.py`), which explains `database.py:15-16`.
- `GITHUB_STEP_SUMMARY` must be appended to (`>>`).
- `if: always()` on report/upload steps so failing runs still show the report.
- The AC5 throwaway branch must not be merged; open it as a draft PR with a "DO NOT MERGE" title, close and delete it after the runs are linked.

### Solutions
- `.coveragerc` (#249) for config layout and comment style.
- `scripts/validate_vocabulary_cards.py` and siblings for CLI script structure (argparse/`main()` + `sys.exit`).
- `tests/test_vocabulary_card_schema.py:154` for locating a script by path from tests; load with `importlib.util.spec_from_file_location`.
- `.github/workflows/frontend-typecheck.yml` (#250) for a recent workflow written in the repo's current style.
- `coverage report --format=markdown` for the job summary table.

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
