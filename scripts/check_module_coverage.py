#!/usr/bin/env python3
"""Per-module backend coverage check (Issue #252).

`fail_under` in .coveragerc makes pytest-cov fail when the *total* coverage is
below the threshold. The project standard is 80% *per module*, so this script
reads the JSON coverage report and fails if any measured module is below the
same threshold, unless the module is on ALLOWLIST (known exceptions, each with
a reason and a follow-up issue).

The threshold and precision come from the coverage config (.coveragerc), so
local runs and CI use one number.

Usage:
    python3 scripts/check_module_coverage.py [coverage.json] [options]

Arguments:
    coverage.json        JSON report from `pytest --cov --cov-report=json`
                         (default: coverage.json)

Options:
    --rcfile PATH        Coverage config file to read the threshold from
                         (default: .coveragerc)
    --summary PATH       Append a Markdown summary to PATH (e.g. $GITHUB_STEP_SUMMARY)
    --help               Show this help message and exit

Exit Codes:
    0   Every non-allowlisted module meets the threshold
    1   One or more non-allowlisted modules are below the threshold
    2   Missing/invalid report, no threshold configured, or other error

Examples:
    # Reproduce the CI check locally
    python3 -m pytest tests/ --cov --cov-report=term-missing --cov-report=json
    python3 scripts/check_module_coverage.py coverage.json
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

import coverage

# Known exceptions to the per-module threshold. Entries are temporary: remove
# each one as soon as its module reaches the threshold (the script warns when
# that happens). Every reason must name the follow-up issue that tracks it.
# seed_database.py shows the warning in CI (fresh database, ~92%) but is 0%
# locally once ./french_coach.db has decks, so keep it until #259 tests it.
ALLOWLIST: dict[str, str] = {
    "main.py": (
        "static/index.html routes are untested; the auto-seed branch runs only "
        "when ./french_coach.db has no decks (follow-up: #259)"
    ),
    "database.py": (
        "get_db() is overridden by the test database in tests/conftest.py "
        "(follow-up: #259)"
    ),
    "seed_database.py": (
        "no tests of its own; covered only as a side effect when the test "
        "app's startup seeds an empty ./french_coach.db, as in CI, and 0% "
        "otherwise (follow-up: #259)"
    ),
}


class CoverageCheckError(Exception):
    """Raised for input or configuration problems (exit code 2)."""


@dataclass
class ModuleResult:
    """Coverage of one module, with the allowlist reason if it has one."""

    path: str
    percent: float
    reason: str = ""


@dataclass
class CheckResult:
    """Outcome of evaluating a coverage report against the threshold."""

    threshold: float
    precision: int
    failures: list[ModuleResult] = field(default_factory=list)
    allowlisted_below: list[ModuleResult] = field(default_factory=list)
    now_passing: list[ModuleResult] = field(default_factory=list)
    stale: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        """True when no non-allowlisted module is below the threshold."""
        return not self.failures


def load_threshold(rcfile: str | Path = ".coveragerc") -> tuple[float, int]:
    """Read `[report] fail_under` and `[report] precision` from a coverage config.

    Raises CoverageCheckError if the file doesn't exist or no threshold is set,
    so the gate can never silently pass everything.
    """
    if not Path(rcfile).is_file():
        raise CoverageCheckError(f"coverage config not found: {rcfile}")
    cov = coverage.Coverage(config_file=str(rcfile))
    fail_under = float(cov.get_option("report:fail_under") or 0)
    precision = int(cov.get_option("report:precision") or 0)
    if fail_under <= 0:
        raise CoverageCheckError(f"no [report] fail_under configured in {rcfile}")
    return fail_under, precision


def below_threshold(percent: float, threshold: float, precision: int) -> bool:
    """Return True if `percent` fails `threshold`.

    Mirrors coverage.py's own fail_under rule, so a module the report shows as
    meeting the threshold never fails here: the percentage is rounded to
    `precision` decimals first, and a threshold of 100 means exactly 100.
    """
    if threshold == 100.0:
        return percent != 100.0
    return round(percent, precision) < threshold


def load_report(path: str | Path) -> dict:
    """Load a coverage.py JSON report and check it has a `files` mapping."""
    try:
        report = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise CoverageCheckError(f"coverage report not found: {path}") from None
    except (OSError, json.JSONDecodeError) as exc:
        raise CoverageCheckError(f"could not read coverage report {path}: {exc}") from None
    if not isinstance(report, dict) or not isinstance(report.get("files"), dict):
        raise CoverageCheckError(f"{path} is not a coverage.py JSON report (no 'files')")
    return report


def evaluate(
    report: dict,
    threshold: float,
    precision: int,
    allowlist: dict[str, str],
) -> CheckResult:
    """Compare each measured module in `report` with the threshold and allowlist."""
    result = CheckResult(threshold=threshold, precision=precision)
    allow = {_normalize(path): reason for path, reason in allowlist.items()}
    measured: set[str] = set()

    for raw_path, data in sorted(report["files"].items()):
        path = _normalize(raw_path)
        measured.add(path)
        percent = float(data["summary"]["percent_covered"])
        below = below_threshold(percent, threshold, precision)
        if path in allow:
            entry = ModuleResult(path, percent, allow[path])
            (result.allowlisted_below if below else result.now_passing).append(entry)
        elif below:
            result.failures.append(ModuleResult(path, percent))

    result.stale = sorted(path for path in allow if path not in measured)
    return result


def format_text(result: CheckResult) -> str:
    """Render the result as plain text for the terminal / CI log."""
    pct = _fmt_pct(result.threshold)
    lines = [f"Per-module coverage threshold: {pct}% (from [report] fail_under)"]
    for mod in result.failures:
        lines.append(f"FAIL {mod.path}: {_fmt_pct(mod.percent, result.precision)}% < {pct}%")
    for mod in result.allowlisted_below:
        lines.append(
            f"ALLOWLISTED {mod.path}: {_fmt_pct(mod.percent, result.precision)}% - {mod.reason}"
        )
    for mod in result.now_passing:
        lines.append(
            f"WARNING {mod.path} is allowlisted but now meets {pct}%; remove it from ALLOWLIST"
        )
    for path in result.stale:
        lines.append(f"WARNING allowlisted path not in coverage report (stale entry?): {path}")
    if result.passed:
        lines.append(f"PASS: all non-allowlisted modules meet {pct}%")
    else:
        lines.append(f"FAILED: {len(result.failures)} module(s) below {pct}%")
    return "\n".join(lines)


def format_markdown(result: CheckResult) -> str:
    """Render the result as a Markdown section for the GitHub job summary."""
    pct = _fmt_pct(result.threshold)
    lines = [f"### Per-module coverage (threshold {pct}%)", ""]
    if result.passed:
        lines.append(f":white_check_mark: All non-allowlisted modules meet {pct}%.")
    else:
        lines.append(f":x: {len(result.failures)} module(s) below {pct}%:")
        lines += ["", "| Module | Coverage |", "|---|---:|"]
        lines += [
            f"| `{m.path}` | {_fmt_pct(m.percent, result.precision)}% |" for m in result.failures
        ]
    if result.allowlisted_below:
        lines += ["", "Allowlisted (known exceptions):", ""]
        lines += ["| Module | Coverage | Reason |", "|---|---:|---|"]
        lines += [
            f"| `{m.path}` | {_fmt_pct(m.percent, result.precision)}% | {m.reason} |"
            for m in result.allowlisted_below
        ]
    warnings = [
        f"`{m.path}` is allowlisted but now meets {pct}%; remove it from `ALLOWLIST`."
        for m in result.now_passing
    ] + [f"`{path}` is allowlisted but not in the coverage report." for path in result.stale]
    if warnings:
        lines += ["", "Warnings:", ""] + [f"- {w}" for w in warnings]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    """Run the per-module check and return the exit code."""
    parser = argparse.ArgumentParser(
        description="Fail if any measured backend module is below the coverage threshold",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("report", nargs="?", default="coverage.json",
                        help="coverage.py JSON report (default: coverage.json)")
    parser.add_argument("--rcfile", default=".coveragerc",
                        help="coverage config to read the threshold from (default: .coveragerc)")
    parser.add_argument("--summary", help="append a Markdown summary to this file")
    args = parser.parse_args(argv)

    try:
        threshold, precision = load_threshold(args.rcfile)
        report = load_report(args.report)
        result = evaluate(report, threshold, precision, ALLOWLIST)
    except CoverageCheckError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    print(format_text(result))
    if args.summary:
        with open(args.summary, "a", encoding="utf-8") as fh:
            fh.write(format_markdown(result))
    return 0 if result.passed else 1


def _normalize(path: str) -> str:
    """Use forward slashes so report and allowlist paths compare equal."""
    return path.replace("\\", "/")


def _fmt_pct(value: float, precision: int | None = None) -> str:
    """Format a percentage.

    With `precision`, round like coverage.py's report does (71.17 -> "71" at
    precision 0). Without it (used for the threshold), drop a trailing ".0".
    """
    if precision is None:
        return f"{value:g}"
    return f"{value:.{precision}f}"


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
