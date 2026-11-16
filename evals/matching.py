"""Deterministic matching of model corrections to labeled errors (issue #231).

The feedback models return ``example_corrections`` as ``{original, corrected,
explanation}`` with no message index, so a correction has to be located in the
conversation and compared with the labeled errors there. This module does the
deterministic pass; pairs it can't decide go to the LLM judge (``evals/judge.py``).

Rules (see ``spdd/prompt/FLC-063-*-issue-231-*.md``):

1. **Locate** a correction: the learner messages whose normalized text contains the
   normalized ``original``. Its candidate errors are the labeled errors in those
   messages, or every labeled error in the conversation when it isn't found verbatim.
2. **Span match**: one normalized span contains the other.
3. **Corrected-form match**: the model's replacement gives the labeled correction
   (or one of its alternatives) in place of the labeled span.
4. Span and corrected form match: detected and correct. Span only, or no span match
   with any candidate: a judge pair.
"""

import itertools
import re
import unicodedata
from dataclasses import dataclass, field

from evals.schema import FeedbackEvalRecord, LabeledError

#: Method names recorded on each decision.
METHOD_DETERMINISTIC = "deterministic"
METHOD_JUDGE = "judge"
METHOD_JUDGE_ERROR = "judge_error"

#: Upper bound on substitution combinations tried for one wide correction.
MAX_COMBINATIONS = 256

_APOSTROPHES = str.maketrans({"’": "'", "‘": "'", "ʼ": "'"})
_QUOTES = str.maketrans({"“": '"', "”": '"', "«": '"', "»": '"'})
_EDGE_CHARS = " .,;:!?\"()…"
_WHITESPACE = re.compile(r"\s+")
_SPACE_BEFORE_PUNCT = re.compile(r"\s+([?!;:])")


def normalize(text: str) -> str:
    """Normalize text for matching only (reports keep the raw text).

    Applies Unicode NFC, maps curly apostrophes to ``'`` and curly or French quotes
    to ``"``, casefolds, collapses whitespace (including non-breaking spaces), drops
    the space French puts before ``? ! ; :``, and strips surrounding whitespace and
    ``. , ; : ! ? " ( ) …``. Apostrophes are kept, since they carry elision.
    """
    value = unicodedata.normalize("NFC", text)
    value = value.translate(_APOSTROPHES).translate(_QUOTES).casefold()
    value = _WHITESPACE.sub(" ", value)
    value = _SPACE_BEFORE_PUNCT.sub(r"\1", value)
    return value.strip(_EDGE_CHARS)


@dataclass(frozen=True)
class Correction:
    """One correction from a model's feedback (``ExampleCorrection``)."""

    original: str
    corrected: str
    explanation: str = ""

    @property
    def key(self) -> tuple[str, str]:
        """Normalized ``(original, corrected)``, used for deduplication and caching."""
        return normalize(self.original), normalize(self.corrected)

    @property
    def is_no_op(self) -> bool:
        """True when ``original`` and ``corrected`` normalize to the same text."""
        original, corrected = self.key
        return original == corrected


@dataclass(frozen=True)
class JudgePair:
    """A (labeled error, correction) pair the deterministic pass couldn't decide."""

    error_index: int
    correction_index: int


@dataclass
class MatchDecision:
    """Outcome for one (labeled error, correction) pair.

    Attributes:
        error_index: Index into the record's ``errors``.
        correction_index: Index into the deduplicated corrections.
        detected: The correction addresses the labeled error.
        correct: Its fix of that error is acceptable.
        method: ``deterministic``, ``judge`` or ``judge_error``.
        reason: The judge's short reason, if any.
    """

    error_index: int
    correction_index: int
    detected: bool
    correct: bool
    method: str
    reason: str = ""


@dataclass
class DeterministicResult:
    """Result of the deterministic pass over one conversation.

    Attributes:
        corrections: Corrections after deduplication and no-op removal.
        no_op_count: Corrections dropped because nothing changed.
        duplicate_count: Corrections dropped as duplicates.
        decisions: Pairs decided deterministically (all detected and correct).
        judge_pairs: Pairs for the judge.
        no_candidates: Indexes of corrections with no labeled error to pair with
            (false corrections without a judge call).
    """

    corrections: list[Correction]
    no_op_count: int = 0
    duplicate_count: int = 0
    decisions: list[MatchDecision] = field(default_factory=list)
    judge_pairs: list[JudgePair] = field(default_factory=list)
    no_candidates: list[int] = field(default_factory=list)


def accepted_corrections(error: LabeledError) -> list[str]:
    """Return the normalized accepted corrections: ``corrected`` then ``alternatives``."""
    return [normalize(value) for value in [error.corrected, *error.alternatives]]


def prepare_corrections(
    corrections: list[Correction],
) -> tuple[list[Correction], int, int]:
    """Drop no-op and duplicate corrections, keeping the first occurrence.

    Returns:
        ``(kept, no_op_count, duplicate_count)``.
    """
    kept: list[Correction] = []
    seen: set[tuple[str, str]] = set()
    no_ops = duplicates = 0
    for correction in corrections:
        if correction.is_no_op:
            no_ops += 1
            continue
        if correction.key in seen:
            duplicates += 1
            continue
        seen.add(correction.key)
        kept.append(correction)
    return kept, no_ops, duplicates


def _combination_matches(
    model_original: str, model_corrected: str, inside: list[tuple[str, list[str]]]
) -> bool:
    """True if replacing every labeled span inside the model span gives its correction.

    Args:
        model_original: Normalized model span.
        model_corrected: Normalized model replacement.
        inside: ``(labeled span, accepted corrections)`` for each labeled error whose
            span lies inside the model span.
    """
    choices = [accepted for _, accepted in inside]
    for combo in itertools.islice(itertools.product(*choices), MAX_COMBINATIONS):
        text = model_original
        for (span, _), replacement in zip(inside, combo):
            text = text.replace(span, replacement, 1)
        if text == model_corrected:
            return True
    return False


def _single_wide_match(span: str, accepted: list[str], model_corrected: str) -> bool:
    """Fallback for a wide model span: the accepted correction appears, the error doesn't.

    The labeled span may legitimately survive inside a correction that extends it
    (``deux nuit`` → ``deux nuits``), so its presence only disqualifies the match when
    it isn't part of that correction.
    """
    return any(
        alternative in model_corrected
        and (span not in model_corrected or span in alternative)
        for alternative in accepted
    )


def _narrow_match(span: str, accepted: list[str], model_original: str, model_corrected: str) -> bool:
    """For a model span inside the labeled span: substitute it and compare."""
    return span.replace(model_original, model_corrected, 1) in accepted


def match_deterministic(
    record: FeedbackEvalRecord, corrections: list[Correction]
) -> DeterministicResult:
    """Run the deterministic pass for one conversation.

    Args:
        record: The labeled conversation.
        corrections: The model's corrections, raw (deduplicated here).

    Returns:
        Deterministic decisions, judge pairs and corrections with no candidates.
    """
    kept, no_ops, duplicates = prepare_corrections(corrections)
    result = DeterministicResult(
        corrections=kept, no_op_count=no_ops, duplicate_count=duplicates
    )
    learner_text = {
        index: normalize(message.content)
        for index, message in enumerate(record.messages)
        if message.role == "user"
    }
    spans = [normalize(error.original) for error in record.errors]
    accepted = [accepted_corrections(error) for error in record.errors]

    for c_index, correction in enumerate(kept):
        original, corrected = correction.key
        located = {i for i, text in learner_text.items() if original and original in text}
        candidates = [
            e_index
            for e_index, error in enumerate(record.errors)
            if not located or error.message_index in located
        ]
        if not candidates:
            result.no_candidates.append(c_index)
            continue

        span_matched = [
            e for e in candidates if original and (spans[e] in original or original in spans[e])
        ]
        if not span_matched:
            result.judge_pairs.extend(JudgePair(e, c_index) for e in candidates)
            continue

        inside = [e for e in candidates if spans[e] in original]
        combo_ok = bool(inside) and _combination_matches(
            original, corrected, [(spans[e], accepted[e]) for e in inside]
        )
        for e_index in span_matched:
            if spans[e_index] in original:
                matched = (combo_ok and e_index in inside) or _single_wide_match(
                    spans[e_index], accepted[e_index], corrected
                )
            else:
                matched = _narrow_match(spans[e_index], accepted[e_index], original, corrected)
            if matched:
                result.decisions.append(
                    MatchDecision(e_index, c_index, True, True, METHOD_DETERMINISTIC)
                )
            else:
                result.judge_pairs.append(JudgePair(e_index, c_index))
    return result
