"""Tests for issue #229: strict FeedbackResponse validation and schema consistency."""

import json

import pytest

from schemas.session import ExampleCorrection, FeedbackResponse
from services.llm.base import FEEDBACK_JSON_SCHEMA
from services.llm.service import (
    ERROR_INVALID_JSON,
    ERROR_SCHEMA_MISMATCH,
    FeedbackOutputError,
    validate_feedback,
)
from tests.llm_fakes import VALID_FEEDBACK_JSON

SCORES = ("grammar_score", "vocabulary_score", "fluency_score", "overall_score")


def feedback_json(**overrides) -> str:
    data = json.loads(VALID_FEEDBACK_JSON)
    data.update(overrides)
    return json.dumps(data)


class TestValidateFeedback:
    def test_valid_feedback_returns_model(self):
        feedback = validate_feedback(VALID_FEEDBACK_JSON)

        assert isinstance(feedback, FeedbackResponse)
        assert feedback.overall_score == 69
        assert feedback.example_corrections == [
            ExampleCorrection(
                original="je suis allé hier au le café",
                corrected="je suis allé hier au café",
                explanation="au = à + le",
            )
        ]

    def test_serialised_shape_is_unchanged(self):
        assert validate_feedback(VALID_FEEDBACK_JSON).model_dump() == json.loads(VALID_FEEDBACK_JSON)

    @pytest.mark.parametrize("score", [0, 100])
    def test_score_bounds_are_inclusive(self, score):
        assert validate_feedback(feedback_json(grammar_score=score)).grammar_score == score

    @pytest.mark.parametrize("text", ["", "pas du JSON", '{"grammar_score": 72'])
    def test_unparseable_text_is_invalid_json(self, text):
        with pytest.raises(FeedbackOutputError) as exc_info:
            validate_feedback(text)

        assert exc_info.value.kind == ERROR_INVALID_JSON
        assert str(exc_info.value).startswith("invalid_json: Invalid JSON")

    @pytest.mark.parametrize(
        "text, detail",
        [
            ("[1, 2, 3]", "<root>: Input should be an object"),
            ('"bonjour"', "<root>: Input should be an object"),
            (feedback_json(grammar_score="72"), "grammar_score: Input should be a valid integer"),
            (feedback_json(grammar_score=True), "grammar_score: Input should be a valid integer"),
            (feedback_json(overall_score=101), "overall_score: Input should be less than or equal to 100"),
            (feedback_json(strengths="Bonne prononciation"), "strengths: Input should be a valid array"),
            (feedback_json(example_corrections=[{"original": "a", "corrected": "b"}]),
             "example_corrections.0.explanation: Field required"),
        ],
    )
    def test_shape_errors_are_schema_mismatch(self, text, detail):
        with pytest.raises(FeedbackOutputError) as exc_info:
            validate_feedback(text)

        assert exc_info.value.kind == ERROR_SCHEMA_MISMATCH
        assert exc_info.value.detail == detail
        assert str(exc_info.value) == f"schema_mismatch: {detail}"

    def test_multiple_problems_are_joined(self):
        text = json.dumps({"grammar_score": 1})

        with pytest.raises(FeedbackOutputError) as exc_info:
            validate_feedback(text)

        assert "vocabulary_score: Field required; " in exc_info.value.detail
        assert exc_info.value.detail.count(";") == 5


class TestJsonSchemaMatchesPydantic:
    """FEEDBACK_JSON_SCHEMA (Claude structured outputs) must not drift from FeedbackResponse."""

    def test_required_fields_match(self):
        assert set(FEEDBACK_JSON_SCHEMA["required"]) == set(FeedbackResponse.model_fields)
        assert set(FEEDBACK_JSON_SCHEMA["properties"]) == set(FeedbackResponse.model_fields)

    def test_score_types_match_and_carry_no_numeric_bounds(self):
        for name in SCORES:
            assert FEEDBACK_JSON_SCHEMA["properties"][name] == {"type": "integer"}

    def test_correction_items_match_example_correction(self):
        items = FEEDBACK_JSON_SCHEMA["properties"]["example_corrections"]["items"]
        assert set(items["required"]) == set(ExampleCorrection.model_fields)
        assert set(items["properties"]) == set(ExampleCorrection.model_fields)
