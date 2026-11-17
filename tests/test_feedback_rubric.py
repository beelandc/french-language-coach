"""Tests for issue #269: the French feedback rubric, its loader and the Claude Code skill.

The rubric (``data/feedback_rubric.md``) is the single source of truth for the app's
feedback prompt and the ``french-feedback-rubric`` skill. These tests keep it aligned
with the eval taxonomy, free of eval dataset text, and reachable from the skill.
"""

import hashlib
import re
import unicodedata
from pathlib import Path

import pytest

from config import Settings
from evals.schema import GRAMMATICAL_CATEGORIES, ErrorCategory, load_dataset
from services.llm.base import FEEDBACK_PROMPT
from services.llm.rubric import (
    RUBRIC_PREAMBLE,
    FeedbackRubricError,
    build_feedback_system_prompt,
    feedback_rubric_sha256,
    load_feedback_rubric,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
RUBRIC_PATH = REPO_ROOT / "data" / "feedback_rubric.md"
SKILL_DIR = REPO_ROOT / ".claude" / "skills" / "french-feedback-rubric"
SKILL_MD = SKILL_DIR / "SKILL.md"
TAXONOMY_MD = SKILL_DIR / "references" / "taxonomy.md"
EXAMPLES_MD = SKILL_DIR / "references" / "examples.md"

#: Backticked repo-relative paths that a skill file tells Claude to read.
REPO_PATH_RE = re.compile(r"`((?:data|evals|schemas|services|tests|\.claude)/[\w./-]+)`")


@pytest.fixture(autouse=True)
def clear_rubric_cache():
    """Each test reads the file fresh."""
    load_feedback_rubric.cache_clear()
    yield
    load_feedback_rubric.cache_clear()


def make_settings(**overrides) -> Settings:
    values = {"ANTHROPIC_API_KEY": "a"}
    values.update(overrides)
    return Settings(_env_file=None, **values)


def parse_taxonomy_table(text: str) -> dict[str, bool]:
    """Return ``{category: counts_toward_grammar}`` from the rubric's taxonomy table.

    Only rows of the table under ``## Error taxonomy`` whose first cell is a backticked
    ID are read; the second cell must be ``Yes`` or ``No``.
    """
    section = text.split("## Error taxonomy", 1)[1].split("\n## ", 1)[0]
    rows: dict[str, bool] = {}
    for line in section.splitlines():
        match = re.match(r"\|\s*`([a-z_]+)`\s*\|\s*([^|]+?)\s*\|", line)
        if not match:
            continue
        category, counts = match.groups()
        assert counts in ("Yes", "No"), f"{category}: grammar-score cell must be Yes or No"
        assert category not in rows, f"{category} listed twice"
        rows[category] = counts == "Yes"
    return rows


def normalize(text: str) -> str:
    """Matching form: NFC, ASCII apostrophes, lowercase, collapsed whitespace."""
    text = unicodedata.normalize("NFC", text).replace("\u2019", "'").lower()
    return " ".join(text.split())


class TestLoader:
    def test_loads_the_canonical_rubric(self):
        text = load_feedback_rubric("data/feedback_rubric.md")
        assert text.startswith("# French feedback rubric")
        assert text == text.rstrip()

    def test_normalizes_bom_line_endings_and_trailing_whitespace(self, tmp_path):
        path = tmp_path / "rubric.md"
        path.write_bytes("\ufeff# Rubric\r\nline one\rline two\r\n\n  ".encode("utf-8"))
        assert load_feedback_rubric(str(path)) == "# Rubric\nline one\nline two"

    def test_result_is_cached_per_path(self, tmp_path):
        path = tmp_path / "rubric.md"
        path.write_text("first", encoding="utf-8")
        assert load_feedback_rubric(str(path)) == "first"
        path.write_text("second", encoding="utf-8")
        assert load_feedback_rubric(str(path)) == "first"

    def test_missing_file_names_the_path(self):
        with pytest.raises(FeedbackRubricError, match="data/missing-rubric.md"):
            load_feedback_rubric("data/missing-rubric.md")

    def test_empty_file_is_an_error(self, tmp_path):
        path = tmp_path / "empty.md"
        path.write_text("\ufeff \n\n", encoding="utf-8")
        with pytest.raises(FeedbackRubricError, match="is empty"):
            load_feedback_rubric(str(path))

    def test_undecodable_file_is_an_error(self, tmp_path):
        path = tmp_path / "latin1.md"
        path.write_bytes("caf\xe9".encode("latin-1"))
        with pytest.raises(FeedbackRubricError, match="could not be read"):
            load_feedback_rubric(str(path))

    def test_sha256_is_of_the_normalized_text(self, tmp_path):
        path = tmp_path / "rubric.md"
        path.write_bytes(b"# Rubric\r\n")
        assert feedback_rubric_sha256(str(path)) == hashlib.sha256(b"# Rubric").hexdigest()


class TestBuildFeedbackSystemPrompt:
    def test_rubric_on_by_default(self):
        settings = make_settings()
        assert settings.FEEDBACK_RUBRIC is True
        assert settings.FEEDBACK_RUBRIC_FILE == "data/feedback_rubric.md"
        assert build_feedback_system_prompt(settings) == (
            FEEDBACK_PROMPT + RUBRIC_PREAMBLE + load_feedback_rubric("data/feedback_rubric.md")
        )

    def test_rubric_off_is_exactly_the_original_prompt(self):
        # The "without" arm of the eval is today's production prompt, byte for byte
        prompt = build_feedback_system_prompt(
            make_settings(FEEDBACK_RUBRIC=False, FEEDBACK_RUBRIC_FILE="data/missing-rubric.md")
        )
        assert prompt == FEEDBACK_PROMPT

    def test_rubric_file_setting_is_used(self, tmp_path):
        path = tmp_path / "rubric.md"
        path.write_text("\ufeff# Rubric\r\nline\r\n\n", encoding="utf-8")
        prompt = build_feedback_system_prompt(make_settings(FEEDBACK_RUBRIC_FILE=str(path)))
        assert prompt == FEEDBACK_PROMPT + RUBRIC_PREAMBLE + "# Rubric\nline"

    def test_missing_rubric_file_names_the_path(self):
        with pytest.raises(FeedbackRubricError, match="data/missing-rubric.md"):
            build_feedback_system_prompt(make_settings(FEEDBACK_RUBRIC_FILE="data/missing-rubric.md"))

    def test_preamble_keeps_feedback_in_french(self):
        assert RUBRIC_PREAMBLE.startswith("\n\n") and RUBRIC_PREAMBLE.endswith("\n\n")
        assert "en français" in RUBRIC_PREAMBLE

    def test_environment_can_turn_the_rubric_off(self, monkeypatch):
        monkeypatch.setenv("FEEDBACK_RUBRIC", "false")
        assert build_feedback_system_prompt(make_settings()) == FEEDBACK_PROMPT


class TestRubricContent:
    def test_taxonomy_matches_the_eval_schema(self):
        # Implicit AC: eval labels and model instructions use the same taxonomy
        rows = parse_taxonomy_table(RUBRIC_PATH.read_text(encoding="utf-8"))
        expected = {category.value for category in ErrorCategory}
        missing, extra = expected - set(rows), set(rows) - expected
        assert not missing and not extra, f"missing {sorted(missing)}, unexpected {sorted(extra)}"

    def test_grammar_score_split_matches_the_eval_schema(self):
        rows = parse_taxonomy_table(RUBRIC_PATH.read_text(encoding="utf-8"))
        assert {c for c, counts in rows.items() if counts} == {c.value for c in GRAMMATICAL_CATEGORIES}

    def test_parser_rejects_a_renamed_category(self):
        text = RUBRIC_PATH.read_text(encoding="utf-8").replace("| `tense_mood` |", "| `tense` |")
        rows = parse_taxonomy_table(text)
        assert "tense_mood" not in rows and "tense" in rows

    def test_required_sections_present(self):
        text = RUBRIC_PATH.read_text(encoding="utf-8")
        for heading in ("## Scope", "## Error taxonomy", "## What not to correct",
                        "## Severity (CEFR-aware)", "## Correction format", "## Scores",
                        "## Strengths and focus area"):
            assert heading in text, heading

    def test_grammar_bands_match_labeling_guide(self):
        # The grammar anchors must stay identical to evals/LABELING.md
        labeling = (REPO_ROOT / "evals" / "LABELING.md").read_text(encoding="utf-8")
        rubric = RUBRIC_PATH.read_text(encoding="utf-8")
        bands = re.findall(r"^\| (\d+–\d+) \| (.+?) \|$", labeling.split("## Grammar score", 1)[1], re.M)
        assert len(bands) == 6
        for band, description in bands:
            assert f"| {band} | {description} |" in rubric, band

    @pytest.mark.parametrize("path", [RUBRIC_PATH, EXAMPLES_MD], ids=lambda p: p.name)
    def test_no_labeled_dataset_span_in_model_facing_text(self, path):
        # Eval integrity: the rubric and the skill examples must not teach the answers
        text = normalize(path.read_text(encoding="utf-8"))
        leaks = [
            f"{record.id}: {error.original}"
            for record in load_dataset()
            for error in record.errors
            if len(error.original.split()) >= 2 and normalize(error.original) in text
        ]
        assert leaks == []


class TestSkill:
    def test_frontmatter_has_name_and_trigger_description(self):
        text = SKILL_MD.read_text(encoding="utf-8")
        match = re.match(r"---\n(.*?)\n---\n", text, re.S)
        assert match, "SKILL.md must start with YAML frontmatter"
        fields = dict(
            line.split(":", 1) for line in match.group(1).splitlines() if ":" in line
        )
        assert fields["name"].strip() == "french-feedback-rubric"
        description = fields["description"].strip()
        assert 50 <= len(description) <= 1024
        for trigger in ("French", "learner", "transcript", "rubric"):
            assert trigger in description

    def test_skill_points_to_the_canonical_rubric(self):
        for path in (SKILL_MD, TAXONOMY_MD):
            assert "data/feedback_rubric.md" in path.read_text(encoding="utf-8"), path.name

    @pytest.mark.parametrize("path", [SKILL_MD, TAXONOMY_MD, EXAMPLES_MD], ids=lambda p: p.name)
    def test_referenced_repo_paths_exist(self, path):
        text = path.read_text(encoding="utf-8")
        referenced = REPO_PATH_RE.findall(text)
        missing = [ref for ref in referenced if not (REPO_ROOT / ref).exists()]
        assert missing == []
        for link in re.findall(r"\]\(([^)#\s]+)\)", text):
            assert (path.parent / link).resolve().exists(), link

    def test_skill_references_exist(self):
        text = SKILL_MD.read_text(encoding="utf-8")
        for ref in ("references/taxonomy.md", "references/examples.md"):
            assert ref in text and (SKILL_DIR / ref).exists()

    def test_skill_does_not_copy_the_taxonomy(self):
        # One source of truth: no taxonomy table rows inside the skill
        for path in SKILL_DIR.rglob("*.md"):
            assert parse_taxonomy_rows_anywhere(path.read_text(encoding="utf-8")) == [], path.name

    def test_example_categories_are_valid(self):
        valid = {category.value for category in ErrorCategory}
        rows = [
            line for line in EXAMPLES_MD.read_text(encoding="utf-8").splitlines()
            if re.match(r"\| \d+ \|", line)
        ]
        assert len(rows) >= 6
        for line in rows:
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            assert len(cells) == 6, line
            assert cells[3].strip("`") in valid, line
            assert cells[4] in ("High", "Medium", "Low"), line


def parse_taxonomy_rows_anywhere(text: str) -> list[str]:
    """Rows shaped like the rubric's taxonomy table (backticked ID, then Yes/No)."""
    return re.findall(r"^\|\s*`[a-z_]+`\s*\|\s*(?:Yes|No)\s*\|", text, re.M)
