"""Tests for the deterministic correction matching in the feedback eval (issue #231)."""

import pytest

from evals.matching import (
    METHOD_DETERMINISTIC,
    Correction,
    JudgePair,
    accepted_corrections,
    match_deterministic,
    normalize,
    prepare_corrections,
)
from evals.schema import FeedbackEvalRecord, load_dataset


@pytest.fixture(scope="module")
def records() -> dict[str, FeedbackEvalRecord]:
    return {record.id: record for record in load_dataset()}


def detected(result) -> list[int]:
    return sorted(d.error_index for d in result.decisions if d.detected and d.correct)


def judged(result) -> list[int]:
    return sorted(pair.error_index for pair in result.judge_pairs)


class TestNormalize:
    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("Je n’ai pas", "je n'ai pas"),
            ("  À LE   comptoir. ", "à le comptoir"),
            ("« Oui »", "oui"),
            ("Vous avez le 42 ?", "vous avez le 42"),
            ("C'est combien ? Merci", "c'est combien? merci"),
            ("Il dit “bonjour”…", 'il dit "bonjour'),
            ("été", "été"),  # decomposed accents become NFC
        ],
    )
    def test_normalize(self, raw, expected):
        assert normalize(raw) == expected

    def test_apostrophe_is_kept_at_the_edges(self):
        assert normalize("j'") == "j'"


class TestPrepareCorrections:
    def test_drops_no_ops_and_duplicates(self):
        kept, no_ops, duplicates = prepare_corrections(
            [
                Correction("une croissant", "un croissant"),
                Correction("Une croissant.", "Un croissant"),  # duplicate once normalized
                Correction("Bonjour", "bonjour !"),  # no-op once normalized
                Correction("le gare", "la gare"),
            ]
        )
        assert [c.original for c in kept] == ["une croissant", "le gare"]
        assert (no_ops, duplicates) == (1, 1)

    def test_correction_key_and_no_op(self):
        correction = Correction("Je ne ai pas", "Je n’ai pas")
        assert correction.key == ("je ne ai pas", "je n'ai pas")
        assert not correction.is_no_op


class TestDeterministicMatch:
    def test_exact_match(self, records):
        result = match_deterministic(records["fb-001"], [Correction("une croissant", "un croissant")])
        assert detected(result) == [0]
        assert result.judge_pairs == []
        assert result.decisions[0].method == METHOD_DETERMINISTIC

    def test_wider_span_with_curly_apostrophe(self, records):
        result = match_deterministic(
            records["fb-001"], [Correction("Je ne ai pas de monnaie", "Je n’ai pas de monnaie")]
        )
        assert detected(result) == [2]
        assert result.judge_pairs == []

    def test_narrower_span(self, records):
        result = match_deterministic(records["fb-001"], [Correction("à le", "au")])
        assert detected(result) == [1]

    def test_alternative_correction(self, records):
        result = match_deterministic(records["fb-002"], [Correction("avec le train", "par le train")])
        assert detected(result) == [2]

    def test_correction_extending_the_labeled_span(self, records):
        # "deux nuit" survives inside "deux nuits"; that must not block the match
        result = match_deterministic(records["fb-003"], [Correction("deux nuit", "deux nuits")])
        assert detected(result) == [0]

    def test_wrong_fix_goes_to_the_judge(self, records):
        result = match_deterministic(records["fb-001"], [Correction("une croissant", "une croissante")])
        assert result.decisions == []
        assert result.judge_pairs == [JudgePair(0, 0)]

    def test_narrower_span_with_wrong_fix_goes_to_the_judge(self, records):
        result = match_deterministic(records["fb-001"], [Correction("à le", "a la")])
        assert judged(result) == [1]

    def test_one_correction_covering_two_errors(self, records):
        # fb-009 message 5 holds two labeled errors: "beaucoup des livres", "une grosse vélo"
        result = match_deterministic(
            records["fb-009"],
            [
                Correction(
                    "J'ai beaucoup des livres et une grosse vélo.",
                    "J'ai beaucoup de livres et un gros vélo.",
                )
            ],
        )
        assert detected(result) == [0, 1]
        assert result.judge_pairs == []

    def test_wide_span_fixing_only_one_of_two_errors(self, records):
        result = match_deterministic(
            records["fb-009"],
            [
                Correction(
                    "J'ai beaucoup des livres et une grosse vélo.",
                    "J'ai beaucoup de livres et une grosse vélo.",
                )
            ],
        )
        assert detected(result) == [0]
        assert judged(result) == [1]

    def test_unrelated_correction_in_the_same_message_is_judged(self, records):
        # Located in message 1, which holds labeled error 0 only
        result = match_deterministic(
            records["fb-003"], [Correction("Je m'appelle John Smith", "Je me nomme John Smith")]
        )
        assert result.decisions == []
        assert result.judge_pairs == [JudgePair(0, 0)]

    def test_correction_not_found_verbatim_is_judged_against_every_error(self, records):
        result = match_deterministic(
            records["fb-001"], [Correction("un croissant féminin", "un croissant")]
        )
        assert judged(result) == [0, 1, 2]

    def test_correction_in_a_message_without_errors_has_no_candidates(self, records):
        record = records["fb-001"]
        # Learner message 5 has no labeled error
        result = match_deterministic(record, [Correction("je n'aime pas le jus", "je déteste le jus")])
        assert result.no_candidates == [0]
        assert result.judge_pairs == [] and result.decisions == []

    def test_clean_record_has_no_candidates(self, records):
        result = match_deterministic(records["fb-007"], [Correction("Bonjour", "Salut")])
        assert result.no_candidates == [0]

    def test_counts_no_ops_and_duplicates(self, records):
        result = match_deterministic(
            records["fb-001"],
            [
                Correction("une croissant", "un croissant"),
                Correction("une croissant", "un croissant"),
                Correction("Sur place", "Sur place."),
            ],
        )
        assert len(result.corrections) == 1
        assert (result.no_op_count, result.duplicate_count) == (1, 1)

    def test_empty_original_is_judged(self, records):
        result = match_deterministic(records["fb-001"], [Correction("...", "un croissant")])
        assert judged(result) == [0, 1, 2]


def test_accepted_corrections_are_normalized(records):
    error = records["fb-002"].errors[2]
    assert accepted_corrections(error) == ["en train", "par le train"]
