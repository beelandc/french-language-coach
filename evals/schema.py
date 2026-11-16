"""Schema and loader for the labeled feedback dataset (issue #230).

Each line of ``evals/datasets/feedback_v1.jsonl`` is one learner conversation
with the errors a good tutor should catch and a labeled grammar score. The
labels mirror the app's feedback output (``schemas.session.FeedbackResponse``):
labeled errors correspond to ``example_corrections`` (``original`` /
``corrected``) and ``grammar_score`` to ``grammar_score``.

See ``evals/LABELING.md`` for the category definitions and scoring rubric.
"""

import re
from enum import Enum
from pathlib import Path
from typing import Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)

from scenarios import SCENARIOS, VALID_DIFFICULTIES

#: Default location of the v1 dataset.
DATASET_PATH = Path(__file__).parent / "datasets" / "feedback_v1.jsonl"

#: Lowest grammar score a clean conversation (no labeled errors) may have.
CLEAN_MIN_GRAMMAR_SCORE = 90

_ID_PATTERN = re.compile(r"^fb-\d{3}$")
_SCENARIO_IDS = frozenset(s["id"] for s in SCENARIOS)
_MODEL_CONFIG = ConfigDict(extra="forbid", strict=True)


class ErrorCategory(str, Enum):
    """Error categories defined in ``evals/LABELING.md``."""

    GENDER = "gender"
    AGREEMENT = "agreement"
    CONJUGATION = "conjugation"
    TENSE_MOOD = "tense_mood"
    AUXILIARY = "auxiliary"
    ARTICLE = "article"
    CONTRACTION = "contraction"
    PREPOSITION = "preposition"
    PRONOUN = "pronoun"
    NEGATION = "negation"
    WORD_ORDER = "word_order"
    SPELLING = "spelling"
    REGISTER = "register"
    ANGLICISM = "anglicism"
    LEXICAL = "lexical"


#: Categories that count toward the labeled grammar score. Register, anglicisms
#: and lexical choice are labeled as errors to catch but are vocabulary issues.
GRAMMATICAL_CATEGORIES = frozenset(ErrorCategory) - {
    ErrorCategory.REGISTER,
    ErrorCategory.ANGLICISM,
    ErrorCategory.LEXICAL,
}


def _require_text(value: str) -> str:
    """Reject empty or whitespace-only strings."""
    if not value.strip():
        raise ValueError("must not be blank")
    return value


class Message(BaseModel):
    """One conversation turn, in the app's ``{role, content}`` shape."""

    model_config = _MODEL_CONFIG

    role: Literal["user", "assistant"]
    content: str

    @field_validator("content")
    @classmethod
    def _content_not_blank(cls, value: str) -> str:
        return _require_text(value)


class LabeledError(BaseModel):
    """An error in a learner message that a good tutor should catch.

    Attributes:
        message_index: Index into the record's ``messages``; must be a user turn.
        category: The error category.
        original: The erroneous span, verbatim from the message.
        corrected: The replacement for ``original``.
        alternatives: Other acceptable replacements for the same span.
        note: Optional explanation or labeling remark.
    """

    model_config = _MODEL_CONFIG

    message_index: int = Field(ge=0)
    category: ErrorCategory
    original: str
    corrected: str
    alternatives: list[str] = Field(default_factory=list)
    note: Optional[str] = None

    @field_validator("original", "corrected")
    @classmethod
    def _span_not_blank(cls, value: str) -> str:
        return _require_text(value)

    @model_validator(mode="after")
    def _check_corrections(self) -> "LabeledError":
        if self.corrected == self.original:
            raise ValueError("corrected must differ from original")
        seen: set[str] = set()
        for alternative in self.alternatives:
            _require_text(alternative)
            if alternative in (self.original, self.corrected):
                raise ValueError(
                    f"alternative {alternative!r} repeats original or corrected"
                )
            if alternative in seen:
                raise ValueError(f"duplicate alternative {alternative!r}")
            seen.add(alternative)
        return self


class FeedbackEvalRecord(BaseModel):
    """One labeled conversation in the feedback dataset.

    Attributes:
        id: Stable record id, ``fb-NNN``.
        scenario_id: A scenario id from ``scenarios.SCENARIOS``.
        difficulty: One of ``scenarios.VALID_DIFFICULTIES``.
        messages: The conversation, assistant first, roles alternating.
        errors: Labeled errors in the learner turns (empty for a clean record).
        grammar_score: Labeled grammar score, 0 to 100.
        notes: Optional labeling remarks for the whole record.
    """

    model_config = _MODEL_CONFIG

    id: str
    scenario_id: str
    difficulty: str
    messages: list[Message] = Field(min_length=2)
    errors: list[LabeledError]
    grammar_score: int = Field(ge=0, le=100)
    notes: Optional[str] = None

    @field_validator("id")
    @classmethod
    def _check_id(cls, value: str) -> str:
        if not _ID_PATTERN.match(value):
            raise ValueError(f"id {value!r} must match fb-NNN")
        return value

    @field_validator("scenario_id")
    @classmethod
    def _check_scenario(cls, value: str) -> str:
        if value not in _SCENARIO_IDS:
            raise ValueError(f"unknown scenario_id {value!r}")
        return value

    @field_validator("difficulty")
    @classmethod
    def _check_difficulty(cls, value: str) -> str:
        if value not in VALID_DIFFICULTIES:
            raise ValueError(f"unknown difficulty {value!r}")
        return value

    @model_validator(mode="after")
    def _check_record(self) -> "FeedbackEvalRecord":
        self._check_turns()
        for error in self.errors:
            self._check_error_location(error)
        if self.is_clean and self.grammar_score < CLEAN_MIN_GRAMMAR_SCORE:
            raise ValueError(
                f"{self.id}: clean record must have grammar_score >= "
                f"{CLEAN_MIN_GRAMMAR_SCORE}, got {self.grammar_score}"
            )
        return self

    def _check_turns(self) -> None:
        if self.messages[0].role != "assistant":
            raise ValueError(f"{self.id}: the first message must be from the assistant")
        for index in range(1, len(self.messages)):
            if self.messages[index].role == self.messages[index - 1].role:
                raise ValueError(
                    f"{self.id}: messages {index - 1} and {index} have the same role; "
                    "roles must alternate"
                )

    def _check_error_location(self, error: LabeledError) -> None:
        index = error.message_index
        if index >= len(self.messages):
            raise ValueError(
                f"{self.id}: message_index {index} out of range "
                f"({len(self.messages)} messages)"
            )
        message = self.messages[index]
        if message.role != "user":
            raise ValueError(
                f"{self.id}: message_index {index} is not a learner (user) message"
            )
        if error.original not in message.content:
            raise ValueError(
                f"{self.id}: span {error.original!r} not found in message {index}"
            )

    @property
    def is_clean(self) -> bool:
        """True when the record has no labeled errors."""
        return not self.errors


class DatasetError(ValueError):
    """Raised when a dataset file has an invalid or duplicate record."""


def load_dataset(path: Path | str = DATASET_PATH) -> list[FeedbackEvalRecord]:
    """Load and validate a JSONL feedback dataset.

    Blank lines are skipped. Every other line must be one JSON object that
    validates as a :class:`FeedbackEvalRecord`.

    Args:
        path: The JSONL file to read. Defaults to the v1 dataset.

    Returns:
        The records, in file order.

    Raises:
        DatasetError: A line is invalid JSON, fails validation (the message
            names the 1-based line number), or repeats an earlier record's id.
    """
    path = Path(path)
    records: list[FeedbackEvalRecord] = []
    first_line_by_id: dict[str, int] = {}
    with path.open(encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                record = FeedbackEvalRecord.model_validate_json(line)
            except ValidationError as exc:
                raise DatasetError(f"{path} line {line_no}: {exc}") from exc
            if record.id in first_line_by_id:
                raise DatasetError(
                    f"{path} line {line_no}: duplicate id {record.id!r} "
                    f"(first seen on line {first_line_by_id[record.id]})"
                )
            first_line_by_id[record.id] = line_no
            records.append(record)
    return records
