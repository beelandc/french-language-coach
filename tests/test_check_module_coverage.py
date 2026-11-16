"""Tests for scripts/check_module_coverage.py (Issue #252).

The script is the per-module half of the backend coverage gate: pytest-cov
enforces the total via `[report] fail_under` in .coveragerc, and this script
fails CI if any measured, non-allowlisted module is below the same threshold.
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_PATH = REPO_ROOT / "scripts" / "check_module_coverage.py"


def _load_script():
    """Import the script as a module (scripts/ is not a package)."""
    spec = importlib.util.spec_from_file_location("check_module_coverage", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module  # dataclasses need the module registered
    spec.loader.exec_module(module)
    return module


checker = _load_script()


# =============================================================================
# Helpers and fixtures
# =============================================================================

def make_report(percentages: dict[str, float]) -> dict:
    """Build a minimal coverage.py JSON report with the given per-file percentages."""
    return {
        "meta": {"version": "7.14.0"},
        "files": {
            path: {"summary": {"percent_covered": pct}} for path, pct in percentages.items()
        },
        "totals": {"percent_covered": 90.0},
    }


@pytest.fixture
def rcfile(tmp_path: Path) -> Path:
    """A coverage config with fail_under = 80 (the repo's setting)."""
    path = tmp_path / ".coveragerc"
    path.write_text("[report]\nfail_under = 80\n", encoding="utf-8")
    return path


@pytest.fixture
def write_report(tmp_path: Path):
    """Write a coverage.json built from per-file percentages; return its path."""

    def _write(percentages: dict[str, float]) -> Path:
        path = tmp_path / "coverage.json"
        path.write_text(json.dumps(make_report(percentages)), encoding="utf-8")
        return path

    return _write


# =============================================================================
# below_threshold
# =============================================================================

class TestBelowThreshold:
    """below_threshold() mirrors coverage.py's fail_under rounding rule."""

    @pytest.mark.parametrize(
        "percent, expected",
        [(100.0, False), (80.0, False), (79.5, False), (79.4, True), (0.0, True)],
    )
    def test_precision_zero_rounds_to_whole_percent(self, percent, expected):
        assert checker.below_threshold(percent, 80.0, 0) is expected

    def test_precision_one_is_respected(self):
        # Given precision 1, 79.95 rounds to 80.0 but 79.94 rounds to 79.9
        assert checker.below_threshold(79.95, 80.0, 1) is False
        assert checker.below_threshold(79.94, 80.0, 1) is True

    def test_threshold_100_requires_exactly_100(self):
        assert checker.below_threshold(99.99, 100.0, 0) is True
        assert checker.below_threshold(100.0, 100.0, 0) is False


# =============================================================================
# load_threshold
# =============================================================================

class TestLoadThreshold:
    """load_threshold() reads fail_under and precision from the coverage config."""

    def test_reads_fail_under_with_default_precision(self, rcfile):
        assert checker.load_threshold(rcfile) == (80.0, 0)

    def test_reads_precision(self, tmp_path):
        path = tmp_path / ".coveragerc"
        path.write_text("[report]\nfail_under = 85.5\nprecision = 2\n", encoding="utf-8")
        assert checker.load_threshold(path) == (85.5, 2)

    def test_missing_fail_under_is_an_error(self, tmp_path):
        # Given a config without a threshold, the gate must not silently pass
        path = tmp_path / ".coveragerc"
        path.write_text("[run]\nsource = .\n", encoding="utf-8")
        with pytest.raises(checker.CoverageCheckError, match="no \\[report\\] fail_under"):
            checker.load_threshold(path)

    def test_missing_config_file_is_an_error(self, tmp_path):
        with pytest.raises(checker.CoverageCheckError, match="coverage config not found"):
            checker.load_threshold(tmp_path / "nope.ini")

    def test_repo_config_sets_80(self):
        """The repo's .coveragerc is the single source of truth: 80%."""
        assert checker.load_threshold(REPO_ROOT / ".coveragerc") == (80.0, 0)


# =============================================================================
# load_report
# =============================================================================

class TestLoadReport:
    """load_report() validates the JSON report."""

    def test_loads_valid_report(self, write_report):
        report = checker.load_report(write_report({"a.py": 90.0}))
        assert "a.py" in report["files"]

    def test_missing_file(self, tmp_path):
        with pytest.raises(checker.CoverageCheckError, match="not found"):
            checker.load_report(tmp_path / "coverage.json")

    def test_invalid_json(self, tmp_path):
        path = tmp_path / "coverage.json"
        path.write_text("{not json", encoding="utf-8")
        with pytest.raises(checker.CoverageCheckError, match="could not read"):
            checker.load_report(path)

    @pytest.mark.parametrize("content", ['{"totals": {}}', "[]", '{"files": []}'])
    def test_report_without_files_mapping(self, tmp_path, content):
        path = tmp_path / "coverage.json"
        path.write_text(content, encoding="utf-8")
        with pytest.raises(checker.CoverageCheckError, match="no 'files'"):
            checker.load_report(path)


# =============================================================================
# evaluate
# =============================================================================

class TestEvaluate:
    """evaluate() applies the threshold, precision and allowlist."""

    def test_all_modules_pass(self):
        result = checker.evaluate(make_report({"a.py": 80.0, "b.py": 100.0}), 80.0, 0, {})
        assert result.passed
        assert result.failures == []

    def test_non_allowlisted_module_below_threshold_fails(self):
        # Given
        report = make_report({"services/foo.py": 40.0, "config.py": 100.0})

        # When
        result = checker.evaluate(report, threshold=80.0, precision=0, allowlist={})

        # Then
        assert not result.passed
        assert [(f.path, f.percent) for f in result.failures] == [("services/foo.py", 40.0)]

    def test_rounding_matches_coverage_py(self):
        report = make_report({"a.py": 79.5, "b.py": 79.4})
        result = checker.evaluate(report, threshold=80.0, precision=0, allowlist={})
        assert [f.path for f in result.failures] == ["b.py"]

    def test_allowlisted_module_below_threshold_passes_and_is_reported(self):
        report = make_report({"main.py": 71.0, "config.py": 100.0})
        result = checker.evaluate(report, 80.0, 0, {"main.py": "untested routes (#259)"})
        assert result.passed
        assert [(m.path, m.reason) for m in result.allowlisted_below] == [
            ("main.py", "untested routes (#259)")
        ]

    def test_allowlisted_module_now_passing_is_flagged(self):
        result = checker.evaluate(make_report({"main.py": 85.0}), 80.0, 0, {"main.py": "r"})
        assert result.passed
        assert [m.path for m in result.now_passing] == ["main.py"]
        assert result.allowlisted_below == []

    def test_stale_allowlist_entry_is_flagged(self):
        result = checker.evaluate(make_report({"a.py": 90.0}), 80.0, 0, {"gone.py": "r"})
        assert result.passed
        assert result.stale == ["gone.py"]

    def test_windows_separators_match_allowlist(self):
        report = make_report({"services\\foo.py": 10.0})
        result = checker.evaluate(report, 80.0, 0, {"services/foo.py": "r"})
        assert result.passed
        assert [m.path for m in result.allowlisted_below] == ["services/foo.py"]

    def test_failures_are_sorted_by_path(self):
        report = make_report({"z.py": 10.0, "a.py": 20.0})
        result = checker.evaluate(report, 80.0, 0, {})
        assert [f.path for f in result.failures] == ["a.py", "z.py"]


# =============================================================================
# Output formatting
# =============================================================================

class TestFormatting:
    """format_text() and format_markdown() describe the result."""

    def _mixed_result(self):
        report = make_report(
            {"services/foo.py": 40.0, "main.py": 71.17, "database.py": 90.0}
        )
        allowlist = {"main.py": "untested (#259)", "database.py": "r", "gone.py": "r"}
        return checker.evaluate(report, 80.0, 0, allowlist)

    def test_text_output(self):
        text = checker.format_text(self._mixed_result())
        assert "threshold: 80% (from [report] fail_under)" in text
        assert "FAIL services/foo.py: 40% < 80%" in text
        assert "ALLOWLISTED main.py: 71% - untested (#259)" in text
        assert "WARNING database.py is allowlisted but now meets 80%" in text
        assert "stale entry?): gone.py" in text
        assert "FAILED: 1 module(s) below 80%" in text

    def test_text_output_pass(self):
        result = checker.evaluate(make_report({"a.py": 100.0}), 80.0, 0, {})
        assert checker.format_text(result).endswith("PASS: all non-allowlisted modules meet 80%")

    def test_markdown_output(self):
        md = checker.format_markdown(self._mixed_result())
        assert md.startswith("### Per-module coverage (threshold 80%)")
        assert ":x: 1 module(s) below 80%" in md
        assert "| `services/foo.py` | 40% |" in md
        assert "| `main.py` | 71% | untested (#259) |" in md
        assert "- `database.py` is allowlisted but now meets 80%" in md
        assert "- `gone.py` is allowlisted but not in the coverage report." in md

    def test_markdown_output_pass(self):
        result = checker.evaluate(make_report({"a.py": 100.0}), 80.0, 0, {})
        md = checker.format_markdown(result)
        assert ":white_check_mark: All non-allowlisted modules meet 80%." in md
        assert "Allowlisted" not in md
        assert "Warnings" not in md

    def test_precision_is_used_for_module_percentages(self):
        result = checker.evaluate(make_report({"a.py": 71.176}), 80.0, 2, {})
        assert "FAIL a.py: 71.18% < 80%" in checker.format_text(result)


# =============================================================================
# main() end to end
# =============================================================================

class TestMain:
    """main() wires config, report, evaluation and output together."""

    def test_pass_exits_0(self, rcfile, write_report, capsys, monkeypatch):
        monkeypatch.setattr(checker, "ALLOWLIST", {})
        report = write_report({"a.py": 95.0})
        assert checker.main([str(report), "--rcfile", str(rcfile)]) == 0
        assert "PASS" in capsys.readouterr().out

    def test_failure_exits_1(self, rcfile, write_report, capsys, monkeypatch):
        monkeypatch.setattr(checker, "ALLOWLIST", {})
        report = write_report({"services/foo.py": 40.0})
        assert checker.main([str(report), "--rcfile", str(rcfile)]) == 1
        assert "FAIL services/foo.py: 40% < 80%" in capsys.readouterr().out

    def test_real_allowlist_is_applied(self, rcfile, write_report, capsys):
        report = write_report({"main.py": 71.0, "database.py": 78.0, "seed_database.py": 0.0})
        assert checker.main([str(report), "--rcfile", str(rcfile)]) == 0
        out = capsys.readouterr().out
        assert out.count("ALLOWLISTED") == 3

    def test_missing_report_exits_2(self, rcfile, tmp_path, capsys):
        missing = tmp_path / "coverage.json"
        assert checker.main([str(missing), "--rcfile", str(rcfile)]) == 2
        assert "ERROR: coverage report not found" in capsys.readouterr().err

    def test_no_threshold_exits_2(self, tmp_path, write_report, capsys):
        cfg = tmp_path / "empty.ini"
        cfg.write_text("[run]\nsource = .\n", encoding="utf-8")
        assert checker.main([str(write_report({"a.py": 1.0})), "--rcfile", str(cfg)]) == 2
        assert "no [report] fail_under" in capsys.readouterr().err

    def test_summary_is_appended(self, rcfile, write_report, tmp_path, monkeypatch):
        monkeypatch.setattr(checker, "ALLOWLIST", {})
        summary = tmp_path / "summary.md"
        summary.write_text("existing content\n", encoding="utf-8")
        report = write_report({"a.py": 95.0})

        assert checker.main([str(report), "--rcfile", str(rcfile), "--summary", str(summary)]) == 0

        content = summary.read_text(encoding="utf-8")
        assert content.startswith("existing content\n### Per-module coverage (threshold 80%)")

    def test_allowlist_reasons_name_a_follow_up_issue(self):
        """Every allowlist entry must say which issue removes it."""
        for path, reason in checker.ALLOWLIST.items():
            assert "follow-up: #" in reason, path
