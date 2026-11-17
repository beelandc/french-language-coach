# Error taxonomy: where it lives

The error taxonomy is the **"Error taxonomy"** section of [`data/feedback_rubric.md`](../../../../data/feedback_rubric.md). Read it there. **Don't copy it into this skill**: that file is the single source of truth, also loaded by the app's feedback prompt (`services/llm/rubric.py`).

It defines 15 categories, each marked as counting toward the grammar score or not. The same IDs are used by:

- the eval labels: `ErrorCategory` and `GRAMMATICAL_CATEGORIES` in `evals/schema.py`, defined for labelers in `evals/LABELING.md`
- this skill's corrections table (the Category column)

`tests/test_feedback_rubric.py` fails in CI if the rubric's category IDs or its grammar-score split drift from `evals/schema.py`, and if this page stops pointing at an existing file.
