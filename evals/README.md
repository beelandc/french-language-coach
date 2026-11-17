# evals/

Offline evaluation data and tooling for the French Language Coach. Nothing in the app imports this directory.

The first dataset is the ground truth for end-of-session **feedback quality** (issue #230). The [feedback eval harness](#feedback-eval-harness-231) (#231) runs each configured model (Mistral Large, Claude Sonnet 5.5, Claude Haiku 5.5) over it and compares the models' corrections and grammar scores with these labels, alongside cost and latency.

## Layout

```
evals/
├── __init__.py
├── schema.py                 # Pydantic models for a record + load_dataset()
├── run_feedback_eval.py      # Eval harness CLI: configs, guardrails, run loop (#231)
├── matching.py               # Deterministic matching of corrections to labeled errors (#231)
├── judge.py                  # LLM judge, judge-validation set loader, agreement (#231)
├── scoring.py                # Per-conversation scores and per-model metrics (#231)
├── report.py                 # JSON + Markdown reports (#231)
├── run_study_plan_eval.py    # Study-plan eval CLI: study coach plans vs labeled errors (#270)
├── datasets/
│   ├── feedback_v1.jsonl     # 27 labeled conversations, one JSON object per line
│   ├── judge_validation_v1.jsonl # 22 hand verdicts used to check the judge (#231)
│   └── study_plan_targets_v1.json # Target lessons per labeled grammar error, 10 records (#270)
├── results/                  # Dated eval reports (feedback_eval_<YYYYMMDD-HHMMSS>.json/.md)
├── LABELING.md               # Error categories, span rules, grammar-score rubric
├── METHODOLOGY.md            # How the harness scores a model: matching, judge, metrics (#231)
└── README.md                 # This file
```

## Record format

Each line is one learner conversation in the app's message format (assistant first), with the errors a good tutor should catch and a labeled grammar score:

```json
{"id": "fb-001", "scenario_id": "cafe_order", "difficulty": "beginner",
 "messages": [{"role": "assistant", "content": "..."}, {"role": "user", "content": "..."}],
 "errors": [{"message_index": 3, "category": "contraction", "original": "à le comptoir",
             "corrected": "au comptoir", "note": "à + le contracts to au"}],
 "grammar_score": 80}
```

`original` is a verbatim span of the learner message at `message_index`; `corrected` replaces it. Optional fields: `alternatives` (other acceptable corrections) and `note` on an error, `notes` on a record. [`LABELING.md`](LABELING.md) defines the fields, the 15 error categories and the scoring rubric.

Load and validate it from the repo root:

```python
from evals.schema import load_dataset

records = load_dataset()  # evals/datasets/feedback_v1.jsonl by default
```

`tests/test_feedback_dataset.py` validates every line in CI (the pytest workflow runs when anything under `evals/` changes).

## Composition (feedback_v1)

27 conversations, 9 per difficulty level, 3 to 5 learner turns each. Each of the 10 scenarios appears 2 or 3 times. 3 conversations are clean (no errors): `fb-007` (beginner), `fb-016` (intermediate) and `fb-027` (advanced).

| Scenario | Beginner | Intermediate | Advanced |
|----------|:-:|:-:|:-:|
| `cafe_order` | ✓ | ✓ | ✓ (clean) |
| `ask_directions` | ✓ | ✓ | ✓ |
| `hotel_checkin` | ✓ | ✓ | ✓ |
| `shopping` | ✓ | ✓ | ✓ |
| `doctor_visit` | ✓ | ✓ | ✓ |
| `train_travel` | ✓ | ✓ (clean) | ✓ |
| `apartment_rental` | ✓ | ✓ | ✓ |
| `restaurant_dining` | ✓ | | ✓ |
| `museum_visit` | ✓ (clean) | ✓ | |
| `job_interview` | | ✓ | ✓ |

71 labeled errors: 63 grammatical and 8 vocabulary (register, anglicism, lexical).

| Category | Count | | Category | Count |
|----------|------:|-|----------|------:|
| `tense_mood` | 16 | | `contraction` | 4 |
| `agreement` | 13 | | `conjugation` | 3 |
| `preposition` | 8 | | `auxiliary` | 2 |
| `anglicism` | 6 | | `word_order` | 2 |
| `gender` | 5 | | `lexical` | 1 |
| `pronoun` | 5 | | `register` | 1 |
| `article` | 5 | | `negation`, `spelling` | 0 |

Errors follow the level: gender, articles and contractions at beginner level; être/avoir, participle agreement and prepositions at intermediate level; subjunctive, *si* clauses, pronoun order, register and anglicisms at advanced level. Grammar scores range from 76 to 98. Several advanced conversations also contain correct forms that look like errors (*savoir s'il serait possible*, *au cas où il y aurait*, *je me suis rendu compte*), noted in the record's `notes`, to catch false corrections.

## How it was produced

- **Conversations** were drafted by **Claude Code (Claude Opus 5.5)** in November 2026 under issue #230. They are synthetic: the learner turns were written to read like typed learner French at each level, with errors planted to reflect typical mistakes at that level. Assistant turns are written as correct, natural French in each scenario's persona.
- **Labels and grammar scores** were proposed by the same model, following [`LABELING.md`](LABELING.md). After drafting, every learner turn was reread and every error labeled, not only the planted ones.
- **Human review:** the project maintainer reviews and corrects the labels and scores. The maintainer self-assesses their French at about **B1** (CEFR): a good grasp of core grammar, moods and tenses and a decent vocabulary, with comprehension stronger than production. They are not a native speaker or a trained annotator.

### Review status

| Version | Human review | Date | Changes from review |
|---------|--------------|------|---------------------|
| feedback_v1 | CB | 11/15/26 | N/A |

## Limits

Read eval results with these in mind:

- **Synthetic, not real learners.** Real learner errors are messier and less evenly spread across categories. Typed text only; no speech.
- **One drafter, one reviewer.** There is no inter-annotator agreement measure. The labels are one model's proposal checked by one person.
- **Reviewer proficiency.** A B1 reviewer can reliably confirm beginner and most intermediate labels. Advanced-level judgments (subjunctive edge cases, register, idiomatic anglicisms) carry less authority. The advanced errors were kept to well-established rules where possible, and judgment calls are flagged in `note`. #231 should report results **per difficulty level** so this can be taken into account.
- **Possible bias toward Claude.** The conversations, labels and preferred corrections come from a Claude model, and #231 compares Claude models with Mistral. Claude models may agree more often with labels written in Claude's own style (which errors to flag, how to phrase a correction). Mitigations: the human review, the `alternatives` field, and an LLM judge for paraphrased corrections in #231. This is disclosed, not eliminated.
- **Small.** 27 conversations and 71 errors give wide uncertainty; small differences between models aren't meaningful.
- **Grammar scores are a single judgment** on a rubric, not a measurement. Compare models on mean absolute error, not exact matches.
- **Partial labels.** Only errors and a grammar score are labeled; there are no labels for vocabulary, fluency or overall scores, strengths or focus area.
- **Not every category is used.** `negation` and `spelling` have no examples in v1.

A native or C1+ speaker's review of the advanced conversations would be the most valuable improvement for a v2.

## Feedback eval harness (#231)

`run_feedback_eval.py` runs each selected model over the dataset and reports error recall, precision, correction accuracy, grammar-score error, schema validity, cost and latency, side by side.

**It makes real, paid API calls, so no CI workflow runs it** (`tests/test_eval_runner.py` checks that no workflow mentions it). Its unit tests use fake providers.

### Running it

From the repo root, with `MISTRAL_API_KEY` and `ANTHROPIC_API_KEY` set in `.env`:

```bash
python3 -m evals.run_feedback_eval --dry-run          # plan + upper-bound cost estimate, no calls
python3 -m evals.run_feedback_eval --limit 3          # smoke run: 3 conversations per model
python3 -m evals.run_feedback_eval                    # full run, default models
python3 -m evals.run_feedback_eval --models all       # adds the Claude Opus 5.5 ceiling run
python3 -m evals.run_feedback_eval --rubric both      # each model with and without the feedback rubric (#269)
```

| Flag | Default | Meaning |
|------|---------|---------|
| `--models` | `mistral-large,claude-sonnet,claude-haiku` | Comma-separated keys, or `all` (adds `claude-opus`) |
| `--rubric` | `on` | Feedback prompt with the rubric (`on`, the app default), without it (`off`, keys `<key>:no-rubric`), or `both` arms per model, run in turn on the same conversations (#269) |
| `--limit N` | all | At most N conversations per model, taken in turn from each difficulty level (`--limit 4` → fb-001, fb-010, fb-019, fb-002) |
| `--ids` | all | Comma-separated record ids (applied before `--limit`) |
| `--max-spend-usd X` | `5.00` | Spend cap for the whole run (models + judge) |
| `--dry-run` | off | Show the plan and an upper-bound cost estimate; no calls, no reports |
| `--judge-provider`, `--judge-model` | `mistral`, `mistral-large-latest` | Judge model, e.g. `anthropic` / `claude-opus-5-5` as a sensitivity check |
| `--skip-judge-validation` | off | Don't measure judge agreement (the report says so) |
| `--claude-effort` | app default (`medium`) | Claude feedback effort: `low`, `medium`, `high`, `xhigh`, `max` |
| `--export-judge-sample N` | `0` | Also write up to N judge-decided pairs as `<report>_judge_sample.jsonl`, for hand review and a future validation set |
| `--dataset`, `--judge-validation`, `--output-dir` | v1 files, `evals/results/` | Paths |

Exit codes: `0` completed, `1` setup error or a model stopped after repeated provider errors, `2` stopped by the spend cap, `130` interrupted (Ctrl-C). Argument errors exit with `2` (argparse).

**Configurations** (`EVAL_CONFIGS`): `mistral-large` (`mistral-large-latest`, the current baseline), `claude-sonnet` (`claude-sonnet-5-5`), `claude-haiku` (`claude-haiku-5-5`), and `claude-opus` (`claude-opus-5-5`, only with `--models all` or by name). Each runs through the app's own provider layer (`LLMService.get_feedback`): the same prompt, schema-constrained or JSON-mode output, strict validation and single corrective retry as the app. With `--rubric`, each arm's `FEEDBACK_RUBRIC` is set by the flag, whatever `.env` says, and a missing rubric file stops the run in preflight (#269).

**Cost.** The first smoke run (`--limit 3`, three models, with judge validation) cost **$0.08**: about $0.004 per conversation for Mistral Large, $0.009 for Sonnet 5.5 and $0.0006 for Haiku 5.5, plus $0.035 for the judge-validation pass. The first full default run (27 conversations × 3 models, 2026-11-16) cost **$0.43** and took 23 minutes, most of it Mistral Large (about 26 s per feedback call, against 4–5 s for the Claude models). `--dry-run` prints a deliberately pessimistic upper bound (about $3 for a full default run).

### Guardrails

- **Spend cap.** Before every feedback request and every judge call, the harness adds the spend recorded so far to a projection of the next call: the largest cost seen so far for that model, or, before the first call, an estimate from the prompt length plus 8,000 output tokens (1,000 for the judge). If the sum would exceed the cap, it stops, writes a partial report (`status: stopped_spend_cap`) and exits with `2`.
- **Preflight, before any call:** every model (and the judge) must have a price in `data/llm_pricing.json`, otherwise the cap can't be enforced; every model's API key must be set (errors name the variable, never its value); the judge-validation set must load and have at least 10 items.
- **Repeated provider errors.** After 3 provider errors in a row (bad key, outage), a model is marked `aborted_errors` and the run moves on.
- **Isolated recording.** Calls are recorded in an in-memory database, never in the app's `french_coach.db`, so eval runs don't show up in the metrics dashboard or comparison report (#236, #238). Cost and latency come from those `llm_calls` records.
- Calls are sequential, so latency isn't affected by concurrency.

### Matching corrections to labeled errors

The models return `example_corrections` as `{original, corrected, explanation}` with no message index, so each correction is first located and then compared with the labeled errors. [`METHODOLOGY.md`](METHODOLOGY.md) walks through these steps with worked examples (model spans, wider and narrower spans, the fallback, the judge's inputs and outputs):

1. **Normalize** both sides for matching only: Unicode NFC, curly apostrophes and quotes to ASCII, lowercase, collapsed whitespace, no space before `? ! ; :`, and surrounding punctuation stripped. Duplicate corrections are dropped, and corrections that change nothing are counted as no-ops.
2. **Locate.** The candidates are the labeled errors in the learner messages that contain the correction's `original`, or every labeled error in the conversation if it isn't found verbatim.
3. **Deterministic match.** The spans overlap (one contains the other), and the model's replacement yields the labeled `corrected` form or one of its `alternatives` in place of the labeled span. A wider model span can cover several labeled errors at once.
4. **LLM judge** for everything else: a span match with a different fix, or a correction whose span matches no candidate. The judge sees the learner message, the labeled error and the correction, but not which model wrote it. It answers whether the correction addresses the labeled error and whether the fix is acceptable French. Replies are parsed strictly, with one re-ask; a second failure counts as a judge error (not matched). Verdicts are cached within a run.
5. A labeled error is **detected** if any correction addresses it, and **correctly fixed** if any of those fixes is acceptable. A correction that addresses no labeled error is a **false correction**.

### Metrics

Reported per model, overall and per difficulty level:

| Metric | Definition |
|--------|------------|
| Error recall | Detected labeled errors ÷ labeled errors, over every attempted conversation. A conversation with invalid feedback or a provider error misses all its errors, so failing never helps a model |
| Precision (false corrections) | Corrections that address a labeled error ÷ all corrections, over valid feedback. The false-correction count is shown, plus the count on the clean conversations |
| Correction accuracy | Correctly fixed ÷ detected labeled errors |
| Grammar MAE | Mean \|model `grammar_score` − label\| over valid feedback (n shown) |
| Schema validity | Valid on the first attempt, and valid after the one retry, ÷ attempted conversations |
| Cost per conversation | Mean summed `estimated_cost_usd` of a conversation's feedback calls, retry included. Judge cost is reported separately |
| p50 / p95 latency | Nearest-rank percentiles of per-conversation latency (attempts summed); per-call percentiles are in the Details table |

### Judge choice

The default judge is **Mistral Large** (`mistral-large-latest`), chosen in the #231 SPDD analysis and confirmed by the maintainer. The dataset's conversations, labels and preferred corrections were drafted by a Claude model (see [Limits](#limits)), so a Claude judge would stack a second Claude-favoring bias on top. Mistral Large shares a provider only with the Mistral baseline. Third-party judges would need a new provider, which is out of scope. To mitigate self-preference, the judge:

- only rules on pairs the deterministic pass can't decide,
- is never told which model wrote a correction,
- has a narrow task (does this correction fix this labeled error?),
- reports its validation agreement broken down by the style of the drafted correction (Mistral-like, Claude-like or neutral), so a one-sided bias would show.

Rerun with `--judge-provider anthropic --judge-model claude-opus-5-5` as a sensitivity check. Every report states the judge, which tested models share its provider, and this reasoning.

### Judge validation

`datasets/judge_validation_v1.jsonl` holds 22 hand-judged pairs: a labeled error from `feedback_v1`, a drafted tutor correction, and the verdict (`addresses_error`, `correction_acceptable`). They cover correct paraphrases with different spans, correct fixes that differ from the label, wrong or partial fixes on the right span, and unrelated corrections in the same message. 10 are negative. Every run judges all of them first and reports the agreement rate, per-field agreement, agreement by correction style, and each disagreement with the judge's reason. `tests/test_eval_judge.py` validates the file in CI.

The items and verdicts were **drafted by Claude Code (Claude Opus 5.5)** for the maintainer to review, the same process as the dataset. They aren't hand verdicts on real model outputs. `--export-judge-sample` collects real judged pairs to review for a v2 set.

| Version | Human review | Date | Changes from review |
|---------|--------------|------|---------------------|
| judge_validation_v1 | Pending | | |

In the first smoke run, the judge agreed with the drafted verdicts on 20 of 22 items (90.9%). Both disagreements were wrong fixes the judge called "not addressed", so the judge prompt was clarified: a wrong fix of the right mistake still addresses it. A rerun then agreed on 21 of 22 (95.5%), and the first full run on 20 of 22 (90.9%): the judge's verdict on jv-014 ("Je l'ai essayé" → "Je l'ai essayer") varies from run to run. The other disagreement, jv-016 ("Si on aurait su" → "Si on aurait pu savoir"), is a judgment call worth a look in the review. Because the prompt was changed after seeing these items, the agreement figure is somewhat optimistic until the set is extended with items the prompt hasn't been tuned on.

### Reports

Each run (completed, stopped by the cap, or interrupted) writes `results/feedback_eval_<YYYYMMDD-HHMMSS>.json` and `.md`, named by UTC start time, with `-2`, `-3` appended on a collision:

- **JSON** (`schema_version` 2 since #269): run metadata (status, git commit, dataset path and SHA-256, options including `rubric`), the feedback rubric's path and SHA-256 (`rubric`, `null` when no arm used it), a `rubric` flag per model, the judge and its rationale, prices with their `checked_on` dates, **total spend** split into feedback per model, judge matching and judge validation, judge agreement, and per model its metrics plus every conversation (raw corrections, per-error match details, false corrections, outcome, cost, latency, attempts).
- **Markdown**: the same results as tables (summary, per difficulty, details, spend, judge, prices) and the caveats.

The harness never commits anything. Commit a run's reports when they're meant to be cited. #232 published the first full run, [`feedback_eval_20261116-042618`](results/feedback_eval_20261116-042618.md), in the README's [Evaluation](../README.md#evaluation) section and in [decision record 001](../docs/decisions/001-model-choice.md), which sets the app's default models.

## Study-plan eval (#270)

Checks the [study coach](../README.md#study-coach-issue-270): does a plan cite real lessons, and does it target the errors the learner made?

- **Records:** 10 conversations from `feedback_v1.jsonl` (listed in `datasets/study_plan_targets_v1.json`), chosen so every grammar category labeled in the dataset appears at least once.
- **Input:** each record's messages plus feedback synthesized from its labels (corrections = labeled errors, focus area = the most frequent grammar category). This measures the study coach on its own, not feedback quality.
- **Targets:** for each labeled grammar error, the lesson ids that count as targeting it. Vocabulary errors (register, anglicism, lexical) and spelling have no lesson and aren't scored. The targets were written by the implementing AI assistant from a category-to-lesson map, narrowed by each error's note and the lessons' sections, so they're a judgment call; review them before trusting small differences.
- **Measures (thresholds fixed before the first run):**
  - `lesson_ids_valid`: share of cited lesson ids that exist. Threshold 100%.
  - `grammar_errors_covered`: share of targeted errors whose plan cites at least one target lesson. Threshold at least 80%. A failed run counts as covering nothing.
  - Cost per run (from summed usage and `data/llm_pricing.json`), latency, model calls per run and cards proposed are reported but not scored.

```bash
python3 -m evals.run_study_plan_eval --dry-run    # no API calls: records + cost estimate
python3 -m evals.run_study_plan_eval --limit 2    # paid: first two records
python3 -m evals.run_study_plan_eval              # paid: all 10 (Sonnet 5.5, about $1 estimated)
python3 -m evals.run_study_plan_eval --model claude-haiku-5-5
```

It needs `ANTHROPIC_API_KEY` and goes through `LLMService.get_study_plan` (same prompt, tools, iteration cap and validation as the app), without recording to the app's database. Reports are written to `results/study_plan_eval_<YYYYMMDD-HHMMSS>.json` and `.md`. `tests/test_study_plan_eval.py` checks the targets file against the dataset and the lessons, and tests the scoring without API calls.

## Versioning

A version is frozen once it is merged and eval results exist for it (feedback_v1 can still change during its initial human review). After that, fixes and additions go into a new file (`feedback_v2.jsonl`) so results stay comparable across runs. See [`LABELING.md`](LABELING.md#adding-or-changing-records).
