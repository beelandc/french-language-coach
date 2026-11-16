# SPDD Prompt: Enforce backend test coverage in CI (80% gate)

**GitHub Issue**: #252
**Issue Title**: Enforce backend test coverage in CI so PRs below the 80% threshold can't merge
**Issue URL**: https://github.com/beelandc/french-language-coach/issues/252
**Artifact ID**: FLC-060-202611151852
**Created**: 2026-11-15 18:52
**Author**: Claude Code (Claude Opus 5.5, AI Assistant)
**Related Analysis**: [spdd/analysis/FLC-060-202611151846-[Analysis]-issue-252-backend-coverage-gate.md](../analysis/FLC-060-202611151846-[Analysis]-issue-252-backend-coverage-gate.md)

---

## Context

### Current Codebase State
- Backend coverage is configured (#249) in `.coveragerc` (`[run]` only: `concurrency = thread,greenlet`, `source = .`, omits `tests/*`, `frontend/*`, `.venv/*`, `scripts/*`). There's no `[report]` section, so no threshold.
- CI (`.github/workflows/pytest-tests.yml`, name "Pytest Backend Unit Tests") runs `python3 -m pytest tests/ -v --tb=short` with no coverage. Its path filters miss `schemas/**`, `scenarios.py`, `data/**`, `seed_*.py`, `scripts/**` and `.coveragerc`.
- `status-gateway.yml` (the only required check) tracks workflows by name and already includes "Pytest Backend Unit Tests". If no tracked workflow runs, it passes.
- `pytest-cov` is not in `requirements.txt` (installed locally: pytest-cov 7.1.0, coverage 7.14.0).
- Baseline (`python3 -m pytest tests/ --cov`): 829 passed, 1 xfailed, **TOTAL 91.17%**. Under 80%: `main.py` 71%, `database.py` 78%, `seed_database.py` 0% (imported at runtime by `main.py:43`), `seed_all_decks.py` 0% (standalone CLI generator). Lowest other module: `routers/grammar.py` 83%.
- User decisions (accepted 2026-11-15, all analysis recommendations):
  1. Per-module enforcement = option (a) total `fail_under` + (b) per-module script with allowlist. No diff-cover.
  2. Omit `seed_all_decks.py` from coverage; allowlist `seed_database.py`.
  3. Allowlist `main.py` and `database.py`; one follow-up issue covers all three allowlisted modules.
  4. Approved: create the follow-up issue with `gh issue create`; push a throwaway branch and open a draft "DO NOT MERGE" PR for the AC5 demonstration, then close it and delete the branch.
  5. Leave the pre-existing `pytest.xml` upload reference as is.

### Relevant Files
| File | Purpose | Key Lines/Functions |
|------|---------|---------------------|
| `.coveragerc` | coverage.py / pytest-cov config (#249) | `[run]` section, lines 4-16; add `omit` entry + `[report]` section |
| `.github/workflows/pytest-tests.yml` | Backend CI job, "Pytest Backend Unit Tests" | `on.push.paths` / `on.pull_request.paths` (lines 7-31); "Run Pytest" step (lines 55-59); "Upload Test Results" (61-69) |
| `.github/workflows/status-gateway.yml` | Required check; tracks workflows by name | `expectedWorkflowNames` (~line 43). **Do not change** |
| `.github/workflows/frontend-typecheck.yml` | Recent workflow in the current house style (#250) | Header comment, `paths`, step naming |
| `requirements.txt` | Python dependencies | `# Testing` block, lines 13-17 |
| `scripts/validate_vocabulary_cards.py` | CLI script style to mirror | Module docstring with Usage / Exit Codes, `main() -> int`, `argparse`, `sys.exit(main())` |
| `tests/test_vocabulary_card_schema.py` | Precedent for tests locating a `scripts/` file | line 154 |
| `main.py` | App; startup auto-seed imports `seed_database` | lines 30-44, 95-129 (uncovered lines) |
| `database.py` | `get_db()` (overridden in tests) | lines 14-16 |
| `seed_database.py` / `seed_all_decks.py` | Seed scripts | `seed_database()` line 94; `seed_all_decks.py` CLI only |
| `.gitignore` | Ignores `.coverage` (line 48) | add generated coverage outputs |
| `README.md` | Backend testing docs | "To run with test coverage", lines 687-690 |
| `CLAUDE.md` | Claude commands + gotchas | Commands block line 54; Gotchas section |

### Existing Patterns
- Coverage config comments explain *why* (see the #249 comment block in `.coveragerc`).
- CLI scripts in `scripts/`: shebang, module docstring (Usage, Exit Codes 0/1/2, Examples), `argparse` in `main() -> int`, `if __name__ == "__main__": sys.exit(main())`.
- Workflows: header comment naming the issue, `actions/*@v4`, push + pull_request on `main` with identical `paths`.
- Tests: pytest classes `TestXxx` with docstrings, `tmp_path` fixtures, Given/When/Then comments.

---

## Goal

**Primary Objective**: Make the "Pytest Backend Unit Tests" workflow fail, and so fail the required `status-gateway` check, when total backend coverage is below the threshold in `.coveragerc` (80) or when any measured, non-allowlisted backend module is below 80%.

**Secondary Objectives**:
- Run the backend workflow on every backend-affecting path.
- Make the coverage report visible on every run (job summary + artifact).
- Document the gate and a one-line local reproduction in README.md and CLAUDE.md.
- Track the allowlisted modules in a follow-up issue.
- Demonstrate a failing gate on a throwaway draft PR.

---

## Constraints

### Architecture Constraints
- Keep the workflow name "Pytest Backend Unit Tests" and the job in the same workflow; don't touch `status-gateway.yml`.
- The threshold is defined **only** in `.coveragerc` (`[report] fail_under = 80`). No `--cov-fail-under=80` in the workflow or docs. The script reads the threshold and precision through the coverage API.
- No new dependencies beyond `pytest-cov` and an explicit `coverage` floor (both authorized by the issue / user). The script uses only the standard library plus `coverage`.
- No application code changes (`main.py`, `database.py`, routers, etc.). No changes to which tests run or pass.
- Don't omit `seed_database.py`; it's runtime code.

### Code Quality Constraints
- PEP 8, type hints, a module docstring and docstrings on public functions, matching `scripts/validate_*.py`.
- Separate pure logic (threshold loading, evaluation, formatting) from I/O so it's unit-testable.
- Clear messages: name each failing module with its percentage and the threshold.

### Testing Constraints
- New `tests/test_check_module_coverage.py` loads the script via `importlib.util.spec_from_file_location` (`scripts/` isn't a package).
- Cover: all pass; non-allowlisted failure; allowlisted under threshold (passes, reported); allowlisted now ≥ threshold (passes, warning); stale allowlist entry (passes, warning); rounding boundary (79.5 passes at precision 0, 79.4 fails; precision 1 respected); `fail_under = 100` special case (99.99 fails); missing JSON (exit 2); malformed JSON (exit 2); no threshold configured (`fail_under` 0 → exit 2); Markdown summary written/appended; `main()` end-to-end with a temp rcfile.
- `scripts/` is omitted from the measured set, so verify the script's own coverage separately: `python3 -m pytest tests/test_check_module_coverage.py --cov=scripts --cov-report=term-missing --cov-fail-under=0` must show ≥ 80% for `scripts/check_module_coverage.py`.
- Full suite: `python3 -m pytest tests/ -v --tb=short --cov --cov-report=term-missing --cov-report=xml --cov-report=json` passes; then the script passes on its `coverage.json`.

### Acceptance Criteria
From issue #252:
- [ ] `pytest-cov` is in `requirements.txt`
- [ ] The backend CI job runs tests with coverage and **fails when coverage is below 80%**, using the threshold from the repo's coverage config (one source of truth for local and CI)
- [ ] The per-module enforcement decision is recorded and implemented. Any allowlisted modules are listed with a reason and a follow-up issue
- [ ] The workflow triggers on every backend-affecting path (including `schemas/**`, `scenarios.py`, `data/**`, the coverage config), so the gate can't be skipped by which files a PR touches
- [ ] A failing coverage step fails the required `status-gateway` check (shown with a throwaway test PR or branch that drops coverage, linked in the PR)
- [ ] The coverage report is visible from the CI run (artifact and/or job summary)
- [ ] README / CLAUDE.md document the gate and the local command
- [ ] `main` passes the new gate when the PR merges

---

## Examples

### Input/Output Examples
1. **Full local run on this branch**
   - Input: `python3 -m pytest tests/ --cov --cov-report=term-missing --cov-report=json`
   - Expected Output: 829 passed, 1 xfailed, TOTAL ≈ 91%, no `seed_all_decks.py` row, `Required test coverage of 80% reached`, exit 0
2. **Per-module check on that data**
   - Input: `python3 scripts/check_module_coverage.py coverage.json`
   - Expected Output: exit 0; output says threshold 80% (from `.coveragerc`); lists `main.py` 71%, `database.py` 78%, `seed_database.py` 0% as allowlisted with their follow-up issue; "All non-allowlisted modules meet 80%"
3. **Total gate**
   - Input: same pytest command with `--cov-fail-under=95`
   - Expected Output: `FAIL Required test coverage of 95% not reached. Total coverage: 91.xx%`, non-zero exit
4. **New untested module**
   - Input: `coverage.json` with `services/foo.py` at 40.0%, not allowlisted
   - Expected Output: `FAIL services/foo.py: 40% < 80%`, exit 1
5. **Summary output**
   - Input: `--summary $GITHUB_STEP_SUMMARY`
   - Expected Output: appends a `### Per-module coverage (threshold 80%)` Markdown section: result line, a table of failing modules (if any), allowlisted modules with reasons, warnings

### Edge Cases
- Module at 79.5% with precision 0 → passes (`round(79.5) == 80`; mirrors coverage.py `should_fail_under`). 79.4% → fails.
- `fail_under = 100` → any module below exactly 100.0 fails (coverage.py's special case).
- Allowlisted module at ≥ threshold → pass with `WARNING main.py is allowlisted but now meets 80%; remove it from ALLOWLIST`.
- Allowlisted path missing from the report → pass with `WARNING allowlisted path not in coverage report (stale entry?): foo.py`.
- `coverage.json` missing or not valid JSON / missing `files` → message on stderr, exit 2.
- `fail_under` not set (0) → `ERROR no [report] fail_under configured`, exit 2 (the gate must never silently pass everything).
- Local partial run (`python3 -m pytest tests/test_scenarios.py --cov`) now fails on the total → documented: add `--cov-fail-under=0`, or drop `--cov`.
- Summary step after a failing total: `coverage report` would also exit non-zero because of `fail_under`, so it runs with `--fail-under=0` (display only).

### Test Cases
```python
class TestEvaluate:
    """evaluate() applies the threshold, precision and allowlist."""

    def test_non_allowlisted_module_below_threshold_fails(self, checker):
        # Given
        report = make_report({"services/foo.py": 40.0, "config.py": 100.0})

        # When
        result = checker.evaluate(report, threshold=80.0, precision=0, allowlist={})

        # Then
        assert not result.passed
        assert [f.path for f in result.failures] == ["services/foo.py"]

    def test_rounding_matches_coverage_py(self, checker):
        report = make_report({"a.py": 79.5, "b.py": 79.4})
        result = checker.evaluate(report, threshold=80.0, precision=0, allowlist={})
        assert [f.path for f in result.failures] == ["b.py"]
```

---

## Deliverables

### Code Changes
- [ ] `requirements.txt`: add `pytest-cov>=5.0.0` and `coverage>=7.4.0` to `# Testing`
- [ ] `.coveragerc`: `omit` += `seed_all_decks.py` (commented); new `[report]` with `fail_under = 80` (commented as the single source of truth, #252)
- [ ] `scripts/check_module_coverage.py` (new): per-module check with `ALLOWLIST`
- [ ] `.github/workflows/pytest-tests.yml`: widened paths, coverage run, per-module step, job summary, coverage artifact
- [ ] `.gitignore`: `coverage.xml`, `coverage.json`, `htmlcov/`

### Tests
- [ ] `tests/test_check_module_coverage.py` (new), ≥ 80% coverage of the script

### Documentation
- [ ] README.md backend testing section: coverage gate, CI-equivalent command, partial-run tip, allowlist + follow-up issue
- [ ] CLAUDE.md: Commands block (replace the `--cov=.` line) + one Gotcha line about `fail_under` on partial runs and the allowlist
- [ ] Prompt artifact closed out (AI Response, Human Review Notes, Verification)

### GitHub actions (approved by the user)
- [ ] Follow-up issue created **before** writing the allowlist, so its number goes into the reasons
- [ ] Throwaway branch + draft PR demonstrating the failing gate; runs linked in the real PR; draft PR closed and branch deleted afterwards

---

## Actual Prompt

```
Implement GitHub issue #252 (French Language Coach): enforce backend test coverage in CI.
Work on branch chore/issue-252-backend-coverage-gate. Decisions below were approved by the user.

CONTEXT:
- .coveragerc (#249) has [run] concurrency = thread,greenlet; source = .; omit tests/*, frontend/*,
  .venv/*, scripts/*. No [report] section.
- .github/workflows/pytest-tests.yml ("Pytest Backend Unit Tests") runs
  `python3 -m pytest tests/ -v --tb=short` with no coverage. Path filters (push + pull_request):
  models/**, routers/**, services/**, tests/**, requirements.txt, database.py, config.py, main.py,
  the workflow file.
- status-gateway.yml is the only required check; it tracks "Pytest Backend Unit Tests" by name.
- requirements.txt has no pytest-cov.
- Baseline: 829 passed, total 91.17%. Under 80%: main.py 71%, database.py 78%,
  seed_database.py 0% (imported by main.py:43 at startup), seed_all_decks.py 0% (CLI generator).
- Script style: scripts/validate_vocabulary_cards.py (docstring with Usage/Exit Codes,
  argparse in main() -> int, sys.exit(main())).

GOAL:
Fail the backend workflow (and therefore status-gateway) when total coverage is below
.coveragerc's fail_under (80) or when any measured, non-allowlisted module is below 80%.
Widen the path filters, publish coverage on every run, document the gate.

CONSTRAINTS:
1. Follow-up issue first: `gh issue create` titled "Raise backend coverage of main.py, database.py
   and seed_database.py to 80% and remove them from the per-module allowlist" (labels: backend, test).
   Body: context (#252), per-module numbers and missing lines, notes (get_db overridden in
   tests/conftest.py; seed_database uses module-level database.engine; main.py static/index.html
   routes and auto-seed branch), ACs (each ≥80%, entries removed from ALLOWLIST and README).
   Use its number below as <FOLLOWUP>.
2. requirements.txt (# Testing): add `pytest-cov>=5.0.0` and `coverage>=7.4.0`.
3. .coveragerc: add `seed_all_decks.py` to omit, with a comment (standalone generator of
   data/vocabulary_cards/*.json, not imported by the app; same category as scripts/). Add:
       [report]
       # Issue #252: single source of truth for the coverage threshold. pytest-cov uses it as the
       # default for --cov-fail-under, and scripts/check_module_coverage.py applies it per module.
       fail_under = 80
   Do NOT omit seed_database.py.
4. scripts/check_module_coverage.py (new, stdlib + coverage only):
   - Usage: python3 scripts/check_module_coverage.py [coverage.json] [--rcfile .coveragerc]
     [--summary PATH]. Exit codes: 0 pass, 1 module(s) below threshold, 2 usage/input error.
   - load_threshold(rcfile) -> (fail_under: float, precision: int) via
     coverage.Coverage(config_file=rcfile).get_option("report:fail_under" / "report:precision").
     fail_under <= 0 → error, exit 2.
   - below_threshold(percent, threshold, precision) mirrors coverage.py should_fail_under:
     threshold == 100 → percent != 100; else round(percent, precision) < threshold.
   - ALLOWLIST: dict[str, str] path → reason, each reason ending "(follow-up: #<FOLLOWUP>)":
       main.py: startup auto-seed branch and static/index.html routes untested
       database.py: get_db() is overridden by the test DB in tests/conftest.py
       seed_database.py: runtime seeder (imported by main.py on first startup) with no tests
     Comment above it: entries are temporary; remove each when the module reaches the threshold.
   - evaluate(report, threshold, precision, allowlist) -> result with: failures (path, percent),
     allowlisted_below (path, percent, reason), now_passing (allowlisted but >= threshold),
     stale (allowlisted but not in report), passed (no failures). Uses
     report["files"][path]["summary"]["percent_covered"]. Paths compared with "/" separators.
   - Text output: threshold + source, FAIL lines, allowlisted lines with reasons, WARNING lines,
     final result line. --summary appends (never overwrites) a Markdown section
     "### Per-module coverage (threshold N%)".
   - Missing/invalid JSON or missing "files" → stderr message, exit 2.
5. .github/workflows/pytest-tests.yml (keep name, job, existing steps' style):
   - Header comment mentions #252 coverage gate.
   - paths (identical for push and pull_request): '*.py', 'models/**', 'routers/**', 'schemas/**',
     'services/**', 'data/**', 'scripts/**', 'tests/**', 'requirements.txt', '.coveragerc',
     '.github/workflows/pytest-tests.yml'. Comment: '*.py' matches repo-root modules only
     (main.py, config.py, database.py, scenarios.py, seed_*.py).
   - "Run Pytest" → "Run Pytest with Coverage":
     python3 -m pytest tests/ -v --tb=short --cov --cov-report=term-missing --cov-report=xml --cov-report=json
     (no threshold number in the workflow).
   - New step "Check Per-Module Coverage", if: always() && hashFiles('coverage.json') != '':
     python3 scripts/check_module_coverage.py coverage.json --summary "$GITHUB_STEP_SUMMARY"
   - New step "Coverage Summary", if: always() && hashFiles('.coverage') != '':
     append "### Backend coverage" + `python3 -m coverage report --format=markdown --fail-under=0`
     to $GITHUB_STEP_SUMMARY.
   - New step "Upload Coverage Report", if: always(), actions/upload-artifact@v4, name
     coverage-report, paths coverage.xml and coverage.json, if-no-files-found: ignore,
     retention-days: 7.
   - Leave "Upload Test Results" unchanged.
6. .gitignore: add coverage.xml, coverage.json, htmlcov/ next to .coverage.
7. Don't change status-gateway.yml or any application code; don't change which tests run.
8. PEP 8, type hints, docstrings.

EXAMPLES:
- Full run → total ~91%, "Required test coverage of 80% reached", exit 0; script → exit 0, lists
  main.py 71%, database.py 78%, seed_database.py 0% as allowlisted.
- --cov-fail-under=95 → "FAIL Required test coverage of 95% not reached", non-zero.
- services/foo.py 40% not allowlisted → "FAIL services/foo.py: 40% < 80%", exit 1.
- 79.5% at precision 0 passes; 79.4% fails; threshold 100 with 99.99% fails.
- Allowlisted module at 85% → WARNING to remove it; allowlisted path absent → stale WARNING.
- Missing coverage.json / invalid JSON / fail_under unset → exit 2.

TESTS (tests/test_check_module_coverage.py, new):
- Load the script with importlib.util.spec_from_file_location.
- Unit tests for below_threshold, load_threshold (temp rcfile: set, precision, unset → error),
  evaluate (every case above), summary formatting/appending, main() end-to-end with tmp_path
  coverage.json + rcfile (exit 0, 1, 2) and capsys output checks.
- Verify ≥80% for the script: python3 -m pytest tests/test_check_module_coverage.py
  --cov=scripts --cov-report=term-missing --cov-fail-under=0

ACCEPTANCE CRITERIA:
- pytest-cov in requirements.txt
- CI runs tests with coverage and fails below 80% using .coveragerc's threshold
- Per-module decision (total + per-module script) implemented; allowlist with reasons + follow-up issue
- Workflow triggers on schemas/**, scenarios.py, data/**, .coveragerc and all other backend paths
- Failing coverage fails status-gateway, demonstrated on a throwaway draft PR, linked in the PR
- Coverage report visible in the CI run (job summary + artifact)
- README / CLAUDE.md document the gate and the local command
- main passes the gate

DELIVERABLES:
- Code: requirements.txt, .coveragerc, scripts/check_module_coverage.py, pytest-tests.yml, .gitignore
- Tests: tests/test_check_module_coverage.py
- Docs:
  README.md "To run with test coverage" → "Backend coverage gate (Issue #252)": the CI-equivalent
  command (pytest line + script line), threshold lives in .coveragerc, per-module rule, allowlist
  table (module, current %, reason, #<FOLLOWUP>), partial runs use --cov-fail-under=0, where to
  find the report in CI (job summary, coverage-report artifact).
  CLAUDE.md Commands: replace the `--cov=.` line with the two CI-equivalent lines; Gotchas: one
  bullet on fail_under applying to partial --cov runs and the allowlist in the script.
- AC5 demo (after the real PR's CI is green): branch demo/issue-252-coverage-gate-failure off this
  branch. Commit 1 adds services/coverage_gate_canary.py (a few untested functions) → per-module
  check fails. Commit 2 removes it and sets fail_under = 95 → pytest step fails on total. Open as
  draft PR titled "DO NOT MERGE: demo of #252 coverage gate failing", wait for both runs and
  status-gateway, link the runs in the real PR, close the draft PR, delete the branch.
- Update this prompt artifact's AI Response, Human Review Notes, Verification.
```

---

## AI Response

Implemented by Claude Code (Claude Opus 5.5) from the prompt above, in this order:

- **Follow-up issue**: created [#259](https://github.com/beelandc/french-language-coach/issues/259) ("Raise backend coverage of main.py, database.py and seed_database.py to 80% and remove them from the per-module allowlist", labels `backend`, `test`) before writing the allowlist.
- **`requirements.txt`**: `pytest-cov>=5.0.0`, `coverage>=7.4.0` in the Testing block.
- **`.coveragerc`**: `seed_all_decks.py` added to `omit` (commented); new `[report] fail_under = 80` (commented as the single source of truth).
- **`scripts/check_module_coverage.py`** (new): `load_threshold()` (coverage API, `report:fail_under` / `report:precision`, error if unset), `below_threshold()` (mirrors coverage.py's `should_fail_under`), `load_report()`, `evaluate()` → `CheckResult` (failures, allowlisted_below, now_passing, stale), `format_text()`, `format_markdown()`, `main()` with `--rcfile` and `--summary` (append). Exit codes 0/1/2. `ALLOWLIST` = `main.py`, `database.py`, `seed_database.py`, each reason ending `(follow-up: #259)`.
- **`tests/test_check_module_coverage.py`** (new): 38 tests (below_threshold, load_threshold, load_report, evaluate, formatting, main end to end, allowlist reasons name an issue).
- **`.github/workflows/pytest-tests.yml`**: header comment; widened identical push/pull_request paths (`'*.py'`, `models/**`, `routers/**`, `schemas/**`, `services/**`, `data/**`, `scripts/**`, `tests/**`, `requirements.txt`, `.coveragerc`, the workflow); "Run Pytest with Coverage" (`--cov --cov-report=term-missing --cov-report=xml --cov-report=json`, no threshold number); "Check Per-Module Coverage"; "Coverage Summary" (`coverage report --format=markdown --fail-under=0` appended to the job summary); "Upload Coverage Report" (`coverage-report` artifact). Name and "Upload Test Results" unchanged.
- **`.gitignore`**: `coverage.xml`, `coverage.json`, `htmlcov/`.
- **Docs**: README "Backend Tests" coverage section (commands, total + per-module rules, what's measured, allowlist table → #259, `--cov-fail-under=0` for partial runs, where the report is in CI) and the CI/CD workflow list; CLAUDE.md Commands (two CI-equivalent lines) and one Gotcha.

---

## Human Review Notes

### Changes Made
- [x] **Script coverage command**: the prompt's `--cov=scripts` check reports "No data to report" because `.coveragerc` omits `scripts/*` even when `--cov=scripts` is given. Measured instead with a throwaway config (`[run] source = scripts`, excluding the `__main__` guard) passed via `--cov-config`: `scripts/check_module_coverage.py` 119 statements, **100%**. No repo change; noted here so the next person doesn't hit the same thing.
- [x] **Allowlisted line format**: `ALLOWLISTED main.py: 71% - <reason>` instead of `(<reason>)`, because reasons already end in `(follow-up: #259)` and nested parentheses read badly.
- [x] **Percent formatting**: module percentages are rounded to the configured precision, like coverage.py's report (71.17 → "71%"); the threshold prints without a trailing ".0".
- [x] **Path lists written out twice** (push and pull_request) rather than a YAML anchor, to match the other workflows and avoid depending on anchor support in Actions.
- [x] **Follow-up issue body fix**: the first version of #259 named a non-existent `main.py` function; corrected to `seed_vocabulary_decks()` right after creation.
- [x] **Total after omitting `seed_all_decks.py`**: 93.74% (2158 statements, 135 missed), up from 91.17%. Expected; that file was 61 uncovered statements.

- [x] **CI vs local coverage differ (found on the first PR run)**: CI reported a 96.90% total, `main.py` 77% and `seed_database.py` 92% (with the "allowlisted but now meets 80%" warning), against 93.74% / 71% / 0% locally. Cause: `tests/conftest.py:69` (`with TestClient(app)`) runs `main.py`'s startup hook against the real `database.engine` (`./french_coach.db`). On a fresh runner the database has no decks, so `seed_vocabulary_decks()` → `seed_database()` runs. Locally the database already had decks, so it was skipped. Reproduced CI's numbers exactly with `DATABASE_URL` pointing to an empty temp file. Changes: rewrote the `main.py` and `seed_database.py` allowlist reasons and the README table (CI numbers) and added a README note on reproducing CI exactly. **Kept `seed_database.py` allowlisted** despite the CI warning, because local runs against a seeded database measure it at 0% and would fail the per-module check. This is a pre-existing test-isolation gap (the test suite writes to the developer's `french_coach.db`), not caused by this issue; added to follow-up #259.

### Quality Checks
- [x] Code follows existing patterns (script mirrors `scripts/validate_*.py`; workflow keeps the house style)
- [x] Tests pass at 80%+ coverage (new script 100%; backend total 93.74%)
- [x] Documentation updated (README, CLAUDE.md)
- [ ] All acceptance criteria met (AC5 demo and AC8 CI run pending, see Verification)

### Issues Found
- Pre-existing, left as is per user decision: "Upload Test Results" uploads `pytest.xml`, which no step generates.

---

## Verification

Local runs (macOS, Python 3.12.8, pytest-cov 7.1.0, coverage 7.14.0):

| Check | Command | Result |
|---|---|---|
| Full suite + total gate | `python3 -m pytest tests/ --cov --cov-report=term-missing --cov-report=xml --cov-report=json` | 867 passed, 1 xfailed; "Required test coverage of 80.0% reached. Total coverage: 93.74%"; exit 0 |
| Per-module gate | `python3 scripts/check_module_coverage.py coverage.json` | PASS; `database.py` 78%, `main.py` 71%, `seed_database.py` 0% allowlisted (#259); exit 0 |
| Total gate fails | same pytest command + `--cov-fail-under=95` | "FAIL Required test coverage of 95% not reached. Total coverage: 93.74%"; exit 1 |
| Config parsing | `coverage.Coverage().get_option(...)` | `omit` includes `seed_all_decks.py`; `fail_under` 80.0 |
| New tests | `python3 -m pytest tests/test_check_module_coverage.py` | 38 passed; script coverage 100% (see Human Review Notes) |
| Job summary content | `coverage report --format=markdown --fail-under=0` + `--summary` | Markdown table (TOTAL 94%) and per-module section rendered as expected |
| Workflow YAML | `yaml.safe_load` | Parses; push and pull_request paths identical |

- [x] `pytest-cov` is in `requirements.txt`
- [x] CI runs tests with coverage and fails below 80% using `.coveragerc`'s threshold (verified locally; CI run pending)
- [x] Per-module decision (total + per-module script) recorded in the analysis and implemented; allowlist with reasons + #259
- [x] Workflow triggers on every backend-affecting path, including `schemas/**`, `scenarios.py` (`'*.py'`), `data/**`, `.coveragerc`
- [ ] Failing coverage fails `status-gateway`, demonstrated on a throwaway draft PR (pending: done after the real PR's CI is green)
- [x] Coverage report visible from the CI run (job summary + `coverage-report` artifact, confirmed on run 43778008085)
- [x] README / CLAUDE.md document the gate and the local command
- [x] `main` passes the new gate: PR #260 run [43778008085](https://github.com/beelandc/french-language-coach/actions/runs/43778008085): Run Backend Tests pass (867 passed, total 96.90%, per-module PASS), Status Check Gateway pass, `coverage-report` artifact uploaded
- [x] No breaking changes; no application code changed; no change to which existing tests run
- [ ] Human review completed

---

*Template based on SPDD practice from [Martin Fowler](https://martinfowler.com/articles/structured-prompt-driven.html) and [gszhangwei/token-billing](https://github.com/gszhangwei/token-billing/tree/spdd-practice-demo/spdd/)*
