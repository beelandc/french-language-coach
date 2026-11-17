"""French feedback rubric loading and feedback prompt composition (issue #269).

The rubric lives in one canonical file, ``settings.FEEDBACK_RUBRIC_FILE`` (default
``data/feedback_rubric.md``). It is shared by the app's feedback prompt, the
``french-feedback-rubric`` Claude Code skill and (through its taxonomy) the eval labels.
This module reads it from disk; there is no copy in code. The study-coach agent (#270)
is expected to reuse :func:`load_feedback_rubric`.

With ``settings.FEEDBACK_RUBRIC`` off, the feedback system prompt is exactly
:data:`services.llm.base.FEEDBACK_PROMPT`, the prompt used before this issue.
"""

import hashlib
from functools import lru_cache
from pathlib import Path

from config import Settings
from services.llm.base import FEEDBACK_PROMPT

REPO_ROOT = Path(__file__).resolve().parents[2]

#: Joins the base feedback prompt and the rubric text. The rubric is in English; the
#: feedback itself stays in French, in the JSON structure the base prompt defines.
RUBRIC_PREAMBLE = (
    "\n\nApplique la grille d'évaluation suivante (rédigée en anglais) pour repérer, "
    "classer et corriger les erreurs de l'apprenant et pour attribuer les scores. "
    "Les explications et tout le texte du JSON restent en français, et la structure "
    "JSON demandée ci-dessus ne change pas.\n\n"
)


class FeedbackRubricError(RuntimeError):
    """The rubric file is missing, unreadable or empty."""


def _resolve(path: str) -> Path:
    """Resolve a relative path against the repository root."""
    candidate = Path(path)
    return candidate if candidate.is_absolute() else REPO_ROOT / candidate


@lru_cache(maxsize=None)
def load_feedback_rubric(path: str) -> str:
    """Return the rubric text from ``path``, normalized and cached.

    A leading BOM is removed, line endings become ``\\n`` and trailing whitespace is
    stripped, so the prompt and its hash don't depend on the editor or OS.

    Args:
        path: Rubric file, absolute or relative to the repository root.

    Raises:
        FeedbackRubricError: The file is missing, unreadable or empty.
    """
    file_path = _resolve(path)
    try:
        text = file_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        raise FeedbackRubricError(
            f"feedback rubric file {path!r} could not be read ({file_path}): {exc}"
        ) from exc
    text = text.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n").rstrip()
    if not text:
        raise FeedbackRubricError(f"feedback rubric file {path!r} is empty ({file_path})")
    return text


def feedback_rubric_sha256(path: str) -> str:
    """SHA-256 of the normalized rubric text, to identify the version used in a run."""
    return hashlib.sha256(load_feedback_rubric(path).encode("utf-8")).hexdigest()


def build_feedback_system_prompt(settings: Settings) -> str:
    """Return the feedback system prompt for ``settings``.

    ``FEEDBACK_PROMPT`` alone when ``settings.FEEDBACK_RUBRIC`` is off; otherwise
    ``FEEDBACK_PROMPT`` + :data:`RUBRIC_PREAMBLE` + the rubric file's text.

    Raises:
        FeedbackRubricError: The rubric is enabled but its file can't be used.
    """
    if not settings.FEEDBACK_RUBRIC:
        return FEEDBACK_PROMPT
    return FEEDBACK_PROMPT + RUBRIC_PREAMBLE + load_feedback_rubric(settings.FEEDBACK_RUBRIC_FILE)
