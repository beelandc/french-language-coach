---
name: french-feedback-rubric
description: Review, correct, grade or score a French learner's writing or conversation transcript (including feedback dataset records and app session transcripts) with this project's French feedback rubric - error taxonomy, CEFR-aware severity, correction format and score anchors. Use when asked to review learner French, check feedback or labels, or explain how the app grades feedback.
---

# French feedback rubric review

Review learner French the way the app's end-of-session feedback does, using the same standard.

## 1. Read the rubric first

Read **`data/feedback_rubric.md`** (from the repo root) before reviewing. It is the canonical rubric: error taxonomy, what not to correct, CEFR-aware severity, correction format, score anchors, strengths and focus area. The app's feedback prompt loads the same file (`services/llm/rubric.py`).

Apply it as written. Don't restate it in your reply, and never copy it into another file. To change the standard, edit `data/feedback_rubric.md` (the tests in `tests/test_feedback_rubric.py` keep its taxonomy in line with `evals/schema.py`).

## 2. Workflow

1. **Get the transcript.** If none was given, ask for it: pasted text, a session's messages, or a record id in `evals/datasets/feedback_v1.jsonl`.
2. **Find the learner turns** (`user`, or the person learning French). Review only those. If there are none, say so; don't invent errors.
3. **Level.** Use the level you're given (a scenario difficulty maps roughly to beginner A1–A2, intermediate B1, advanced B2+). Otherwise, infer it from the learner's turns and say what you inferred.
4. **Errors.** Go through each learner turn in full. For each error, record the turn, the verbatim `original` span, `corrected`, the category, the severity and a one-line reason, following the rubric's correction format. Check the "What not to correct" section before flagging anything that looks unusual.
5. **Scores.** Give grammar, vocabulary, fluency and overall scores with the rubric's anchors. The grammar score is absolute, not adjusted for level.
6. **Strengths and one focus area**, per the rubric.

## 3. Output

For a person, in English unless asked otherwise:

1. **Summary**: two or three sentences: level (given or inferred), overall impression, the main issue.
2. **Corrections table**, most severe first:

   | Turn | Original | Corrected | Category | Severity | Why |
   |---|---|---|---|---|---|

   Write "No errors found" instead of an empty table.
3. **Scores**: grammar, vocabulary, fluency, overall, each with a one-line justification tied to the anchors.
4. **Strengths**: specific and evidenced.
5. **Focus area**: one thing to practise.
6. **Not corrected** (optional): forms that look wrong but are correct, with a short note.

If asked for the app's format, also return JSON matching `FeedbackResponse` in `schemas/session.py` (`grammar_score`, `vocabulary_score`, `fluency_score`, `overall_score`, `strengths`, `focus_area`, `example_corrections[]` with `original`, `corrected`, `explanation`), with explanations in French, as the app produces them.

## References

- `references/taxonomy.md`: where the taxonomy lives and how it stays in sync
- `references/examples.md`: worked reviews at three levels, in the output format above

This is a project skill. It needs this repository, because the rubric lives in `data/feedback_rubric.md`.
