"""Tests for the labeled feedback dataset and its schema (issue #230).

Acceptance criteria:
- At least 25 conversations, 3 or more per difficulty level, 2 or 3 clean
- Every labeled error has a category, an original span and a corrected form
- A schema test validates the file in CI (this module)
"""

import copy
import json
from collections import Counter
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from evals.schema import (
    CLEAN_MIN_GRAMMAR_SCORE,
    DATASET_PATH,
    GRAMMATICAL_CATEGORIES,
    DatasetError,
    ErrorCategory,
    FeedbackEvalRecord,
    load_dataset,
)
from scenarios import SCENARIOS, VALID_DIFFICULTIES

LABELING_GUIDE = Path(__file__).resolve().parent.parent / "evals" / "LABELING.md"


def _dataset_lines() -> list[pytest.param]:
    """One pytest param per non-blank line of the dataset, with its line number."""
    lines = DATASET_PATH.read_text(encoding="utf-8").splitlines()
    return [
        pytest.param(line, id=f"line-{number}")
        for number, line in enumerate(lines, start=1)
        if line.strip()
    ]


def _validate(data: dict[str, Any]) -> FeedbackEvalRecord:
    """Validate a record dict the same way the loader does (JSON mode)."""
    return FeedbackEvalRecord.model_validate_json(json.dumps(data, ensure_ascii=False))


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def valid_record() -> dict[str, Any]:
    """A minimal valid record with one labeled error."""
    return {
        "id": "fb-001",
        "scenario_id": "cafe_order",
        "difficulty": "beginner",
        "messages": [
            {"role": "assistant", "content": "Bonjour ! Qu'est-ce que vous voulez boire ?"},
            {"role": "user", "content": "Bonjour, je veux un café, s'il vous plaît."},
            {"role": "assistant", "content": "Très bien. Sur place ou à emporter ?"},
            {"role": "user", "content": "Sur place. Je vais m'asseoir à le comptoir."},
        ],
        "errors": [
            {
                "message_index": 3,
                "category": "contraction",
                "original": "à le comptoir",
                "corrected": "au comptoir",
                "note": "à + le contracts to au",
            }
        ],
        "grammar_score": 88,
    }


@pytest.fixture
def clean_record(valid_record: dict[str, Any]) -> dict[str, Any]:
    """A valid record with no labeled errors."""
    record = copy.deepcopy(valid_record)
    record["messages"][3]["content"] = "Sur place. Je vais m'asseoir au comptoir."
    record["errors"] = []
    record["grammar_score"] = 97
    return record


@pytest.fixture(scope="module")
def dataset() -> list[FeedbackEvalRecord]:
    """The real v1 dataset."""
    return load_dataset()


# =============================================================================
# The real dataset file (AC1, AC2, AC4)
# =============================================================================


class TestDatasetFile:
    """Validate evals/datasets/feedback_v1.jsonl."""

    @pytest.mark.parametrize("line", _dataset_lines())
    def test_each_line_validates(self, line: str):
        FeedbackEvalRecord.model_validate_json(line)

    def test_file_ends_with_newline(self):
        assert DATASET_PATH.read_text(encoding="utf-8").endswith("\n")

    def test_loads(self, dataset):
        assert dataset

    def test_at_least_25_records(self, dataset):
        assert len(dataset) >= 25

    def test_at_least_3_per_difficulty(self, dataset):
        counts = Counter(record.difficulty for record in dataset)
        for difficulty in VALID_DIFFICULTIES:
            assert counts[difficulty] >= 3, f"{difficulty}: {counts[difficulty]} records"

    def test_two_or_three_clean_records(self, dataset):
        clean = [record.id for record in dataset if record.is_clean]
        assert 2 <= len(clean) <= 3, clean

    def test_every_scenario_is_covered(self, dataset):
        used = {record.scenario_id for record in dataset}
        missing = {s["id"] for s in SCENARIOS} - used
        assert not missing, f"scenarios without a conversation: {sorted(missing)}"

    def test_ids_are_unique_and_sequential(self, dataset):
        ids = [record.id for record in dataset]
        assert ids == [f"fb-{n:03d}" for n in range(1, len(dataset) + 1)]

    def test_clean_records_score_high(self, dataset):
        for record in dataset:
            if record.is_clean:
                assert record.grammar_score >= CLEAN_MIN_GRAMMAR_SCORE, record.id

    def test_every_error_is_complete_and_located(self, dataset):
        """AC2: category, original span and corrected form on every labeled error."""
        total = 0
        for record in dataset:
            for error in record.errors:
                total += 1
                assert isinstance(error.category, ErrorCategory)
                assert error.original.strip(), record.id
                assert error.corrected.strip(), record.id
                message = record.messages[error.message_index]
                assert message.role == "user", record.id
                assert error.original in message.content, (record.id, error.original)
        assert total > 0


class TestLabelingGuide:
    """Keep evals/LABELING.md and the schema in sync."""

    def test_every_category_is_documented(self):
        guide = LABELING_GUIDE.read_text(encoding="utf-8")
        undocumented = [c.value for c in ErrorCategory if f"`{c.value}`" not in guide]
        assert not undocumented, f"categories missing from LABELING.md: {undocumented}"

    def test_grammatical_categories_exclude_vocabulary(self):
        vocabulary = {ErrorCategory.REGISTER, ErrorCategory.ANGLICISM, ErrorCategory.LEXICAL}
        assert not (GRAMMATICAL_CATEGORIES & vocabulary)
        assert GRAMMATICAL_CATEGORIES | vocabulary == set(ErrorCategory)


# =============================================================================
# Schema: valid records
# =============================================================================


class TestRecordValid:
    """Records the schema accepts."""

    def test_valid_record(self, valid_record):
        record = _validate(valid_record)
        assert record.id == "fb-001"
        assert record.errors[0].category is ErrorCategory.CONTRACTION
        assert record.is_clean is False

    def test_clean_record(self, clean_record):
        assert _validate(clean_record).is_clean is True

    def test_alternatives_accepted(self, valid_record):
        valid_record["errors"][0]["alternatives"] = ["près du comptoir"]
        record = _validate(valid_record)
        assert record.errors[0].alternatives == ["près du comptoir"]

    def test_notes_optional(self, valid_record):
        valid_record["notes"] = "Judgment call on the score."
        assert _validate(valid_record).notes == "Judgment call on the score."

    @pytest.mark.parametrize("score", [0, 100])
    def test_score_bounds_inclusive(self, valid_record, score):
        valid_record["grammar_score"] = score
        assert _validate(valid_record).grammar_score == score


# =============================================================================
# Schema: rejected records
# =============================================================================


class TestRecordRejected:
    """Each validation rule rejects bad input."""

    @pytest.mark.parametrize(
        "field, value",
        [
            ("scenario_id", "space_travel"),
            ("difficulty", "expert"),
            ("id", "fb-1"),
            ("id", "conv-001"),
            ("grammar_score", -1),
            ("grammar_score", 101),
            ("grammar_score", "85"),
            ("grammar_score", 85.5),
        ],
    )
    def test_bad_field_value(self, valid_record, field, value):
        valid_record[field] = value
        with pytest.raises(ValidationError):
            _validate(valid_record)

    def test_extra_field(self, valid_record):
        valid_record["categroy"] = "gender"
        with pytest.raises(ValidationError, match="categroy"):
            _validate(valid_record)

    def test_extra_field_on_error(self, valid_record):
        valid_record["errors"][0]["severity"] = "major"
        with pytest.raises(ValidationError, match="severity"):
            _validate(valid_record)

    def test_missing_required_field(self, valid_record):
        del valid_record["grammar_score"]
        with pytest.raises(ValidationError, match="grammar_score"):
            _validate(valid_record)

    def test_unknown_category(self, valid_record):
        valid_record["errors"][0]["category"] = "style"
        with pytest.raises(ValidationError, match="category"):
            _validate(valid_record)

    @pytest.mark.parametrize("field", ["original", "corrected"])
    @pytest.mark.parametrize("value", ["", "   "])
    def test_blank_span(self, valid_record, field, value):
        valid_record["errors"][0][field] = value
        with pytest.raises(ValidationError, match="blank"):
            _validate(valid_record)

    def test_corrected_equals_original(self, valid_record):
        valid_record["errors"][0]["corrected"] = "à le comptoir"
        with pytest.raises(ValidationError, match="differ"):
            _validate(valid_record)

    @pytest.mark.parametrize("alternative", ["à le comptoir", "au comptoir"])
    def test_alternative_repeats_original_or_corrected(self, valid_record, alternative):
        valid_record["errors"][0]["alternatives"] = [alternative]
        with pytest.raises(ValidationError, match="repeats"):
            _validate(valid_record)

    def test_duplicate_alternatives(self, valid_record):
        valid_record["errors"][0]["alternatives"] = ["près du comptoir", "près du comptoir"]
        with pytest.raises(ValidationError, match="duplicate alternative"):
            _validate(valid_record)

    def test_blank_alternative(self, valid_record):
        valid_record["errors"][0]["alternatives"] = [" "]
        with pytest.raises(ValidationError, match="blank"):
            _validate(valid_record)

    def test_negative_message_index(self, valid_record):
        valid_record["errors"][0]["message_index"] = -1
        with pytest.raises(ValidationError):
            _validate(valid_record)

    def test_message_index_out_of_range(self, valid_record):
        valid_record["errors"][0]["message_index"] = 4
        with pytest.raises(ValidationError, match="out of range"):
            _validate(valid_record)

    def test_message_index_on_assistant_turn(self, valid_record):
        valid_record["errors"][0]["message_index"] = 2
        with pytest.raises(ValidationError, match="not a learner"):
            _validate(valid_record)

    def test_span_not_found(self, valid_record):
        valid_record["errors"][0]["original"] = "à la gare"
        with pytest.raises(ValidationError, match="not found"):
            _validate(valid_record)

    def test_first_message_from_user(self, valid_record):
        valid_record["messages"] = valid_record["messages"][1:]
        valid_record["errors"] = []
        valid_record["grammar_score"] = 95
        with pytest.raises(ValidationError, match="first message"):
            _validate(valid_record)

    def test_roles_must_alternate(self, valid_record):
        valid_record["messages"][2]["role"] = "user"
        with pytest.raises(ValidationError, match="alternate"):
            _validate(valid_record)

    def test_assistant_only(self, clean_record):
        """Without a user turn, the second message repeats the assistant role."""
        clean_record["messages"] = [
            {"role": "assistant", "content": "Bonjour !"},
            {"role": "assistant", "content": "Vous êtes là ?"},
        ]
        with pytest.raises(ValidationError, match="alternate"):
            _validate(clean_record)

    def test_fewer_than_two_messages(self, clean_record):
        clean_record["messages"] = clean_record["messages"][:1]
        with pytest.raises(ValidationError, match="messages"):
            _validate(clean_record)

    def test_unknown_role(self, valid_record):
        valid_record["messages"][0]["role"] = "system"
        with pytest.raises(ValidationError):
            _validate(valid_record)

    def test_blank_message_content(self, valid_record):
        valid_record["messages"][1]["content"] = "  "
        with pytest.raises(ValidationError, match="blank"):
            _validate(valid_record)

    def test_clean_record_scoring_low(self, clean_record):
        clean_record["grammar_score"] = CLEAN_MIN_GRAMMAR_SCORE - 1
        with pytest.raises(ValidationError, match="clean record"):
            _validate(clean_record)


# =============================================================================
# Loader
# =============================================================================


class TestLoadDataset:
    """load_dataset() reads JSONL and reports problems by line number."""

    def _write(self, path: Path, lines: list[str]) -> Path:
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return path

    def test_default_path(self):
        assert len(load_dataset()) == len(_dataset_lines())

    def test_reads_records_and_skips_blank_lines(self, tmp_path, valid_record, clean_record):
        clean_record["id"] = "fb-002"
        path = self._write(
            tmp_path / "data.jsonl",
            [json.dumps(valid_record), "", "   ", json.dumps(clean_record)],
        )
        records = load_dataset(path)
        assert [r.id for r in records] == ["fb-001", "fb-002"]

    def test_accepts_str_path(self, tmp_path, valid_record):
        path = self._write(tmp_path / "data.jsonl", [json.dumps(valid_record)])
        assert len(load_dataset(str(path))) == 1

    def test_invalid_json_reports_line(self, tmp_path, valid_record):
        path = self._write(tmp_path / "data.jsonl", [json.dumps(valid_record), "{not json}"])
        with pytest.raises(DatasetError, match="line 2"):
            load_dataset(path)

    def test_schema_failure_reports_line(self, tmp_path, valid_record):
        bad = copy.deepcopy(valid_record)
        bad["id"] = "fb-002"
        bad["grammar_score"] = 150
        path = self._write(
            tmp_path / "data.jsonl", [json.dumps(valid_record), "", json.dumps(bad)]
        )
        with pytest.raises(DatasetError, match="line 3"):
            load_dataset(path)

    def test_duplicate_id(self, tmp_path, valid_record):
        path = self._write(
            tmp_path / "data.jsonl", [json.dumps(valid_record), json.dumps(valid_record)]
        )
        with pytest.raises(DatasetError, match=r"duplicate id 'fb-001' \(first seen on line 1\)"):
            load_dataset(path)

    def test_empty_file(self, tmp_path):
        path = tmp_path / "empty.jsonl"
        path.write_text("", encoding="utf-8")
        assert load_dataset(path) == []

    def test_dataset_error_is_value_error(self):
        assert issubclass(DatasetError, ValueError)
