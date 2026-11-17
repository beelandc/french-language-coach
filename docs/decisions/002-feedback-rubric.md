# 002: French feedback rubric in the feedback prompt

- **Status:** Accepted
- **Date:** 2026-11-17
- **Issue:** #269
- **Decided by:** pre-registered thresholds agreed with the project maintainer before the eval ran, applied as written
- **Related:** [001](001-model-choice.md) (model choice). This record evaluates 001's "#269 rubric A/B" revisit trigger.

## Context

The app's feedback prompt (`FEEDBACK_PROMPT` in `services/llm/base.py`) defines the JSON output and asks the model to "be strict", but it never says what counts as an error, which spans to correct, or what a score means. The eval labels follow [`evals/LABELING.md`](../../evals/LABELING.md), and the models never saw those rules. In 001's baseline run, the models' false corrections were mostly unrequested style suggestions, and their grammar scores were 6–13 points away from the labels.

Issue #269 added one canonical rubric, [`data/feedback_rubric.md`](../../data/feedback_rubric.md). It covers:

- the error taxonomy, kept identical to the eval schema by a test
- what not to correct
- CEFR-aware severity
- the correction format
- score anchors (the grammar bands match the labeling guide)

The app appends the rubric to the feedback prompt when `FEEDBACK_RUBRIC` is on (`services/llm/rubric.py`). The `french-feedback-rubric` Claude Code skill points to the same file. This record decides whether the rubric is on by default and whether it changes 001's feedback model.

## Pre-registered thresholds

These were fixed in the SPDD analysis and prompt artifacts before any eval call (`spdd/analysis/FLC-065-…`, "Revision after #232 merged"). All comparisons are within one `--rubric both` run. "Errors" means detected labeled errors out of 71.

1. **Rubric default.** Keep `FEEDBACK_RUBRIC=true` unless Sonnet+rubric, compared with Sonnet without it, catches ≥ 3 fewer errors OR has grammar MAE ≥ 2.0 higher, AND shows no offsetting gain (≥ 3 more errors caught, or ≥ 4 fewer false corrections).
2. **Haiku switch.** Move feedback to Haiku 5.5 only if Haiku+rubric, compared with Sonnet+rubric, meets all of: detected errors ≥ Sonnet's − 2; grammar MAE ≤ Sonnet's + 1.0 and ≤ 9.59; no-op corrections ≤ 1; false corrections ≤ Sonnet's; final schema validity 100%. If met, confirm with a rerun of those two arms, and switch only if it holds again.

## Decision

| Question | Decision |
|----------|----------|
| Rubric in the feedback prompt | **On by default** (`FEEDBACK_RUBRIC=true`) |
| Feedback model | **Unchanged: Claude Sonnet 5.5** (effort `medium`). The Haiku switch rule wasn't met, so no confirmation rerun was needed |

**Trade-off.** With the rubric, Sonnet 5.5's feedback is far better calibrated: grammar MAE fell from 9.48 to 3.63, and false corrections from 11 to 1, with no loss of recall (69 vs 68 of 71). The price is about 81% more cost per session ($0.0082 → $0.0149), from roughly 3,000 extra input tokens per call. Latency didn't increase.

## Evidence

Run [`feedback_eval_20261117-034654`](../../evals/results/feedback_eval_20261117-034654.md) ([JSON](../../evals/results/feedback_eval_20261117-034654.json)), at commit `9f40fb6` (the rubric implementation, before these docs). It covered 27 of 27 conversations per arm, with rubric SHA-256 `160a8d33c19c…`. Total spend was $1.0227 of a $3 cap. The judge was `mistral/mistral-large-latest`, with 95.5% agreement on 22 validation items.

| Arm | Recall | Precision (false) | False on clean | No-op | Correction accuracy | Grammar MAE (n) | Schema valid final | Cost / conversation | p50 / p95 latency (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Mistral Large + rubric | 71.8% (51/71) | 100.0% (0) | 0 | 0 | 100.0% | 2.82 (22) | 81.5% | $0.004923 | 39,265 / 60,039 |
| Mistral Large, no rubric | 88.7% (63/71) | 86.3% (10) | 6 | 0 | 100.0% | 6.11 (27) | 100.0% | $0.004534 | 30,929 / 43,563 |
| **Sonnet 5.5 + rubric** | **97.2% (69/71)** | **98.6% (1)** | **0** | 1 | 100.0% | **3.63 (27)** | 100.0% | $0.0149 | 4,378 / 5,519 |
| Sonnet 5.5, no rubric | 95.8% (68/71) | 86.1% (11) | 6 | 3 | 100.0% | 9.48 (27) | 100.0% | $0.008214 | 5,110 / 8,690 |
| Haiku 5.5 + rubric | 84.5% (60/71) | 98.4% (1) | 0 | 0 | 96.7% | 4.04 (27) | 100.0% | $0.001199 | 7,119 / 9,428 |
| Haiku 5.5, no rubric | 87.3% (62/71) | 87.3% (9) | 3 | 6 | 100.0% | 12.0 (27) | 100.0% | $0.000549 | 4,291 / 6,530 |

**Grammar MAE by difficulty** (beginner / intermediate / advanced):

| Arm | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Sonnet + rubric | 4.22 | 2.44 | 4.22 |
| Sonnet, no rubric | 15.22 | 6.11 | 7.11 |
| Haiku + rubric | 4.22 | 5.0 | 2.89 |
| Haiku, no rubric | 17.11 | 10.44 | 8.44 |

### Threshold checks

**Rule 1: rubric default (Sonnet+rubric vs Sonnet without).** Result: **stays on**.

| Check | Values | Result |
|---|---|---|
| Fewer errors caught by ≥ 3? | 69 vs 68 (+1) | No regression |
| Grammar MAE higher by ≥ 2.0? | 3.63 vs 9.48 (−5.85) | No regression |
| Offsetting gain (≥ 3 more errors, or ≥ 4 fewer false corrections)? | false corrections 1 vs 11 (−10) | Yes (not needed) |

**Rule 2: Haiku switch (Haiku+rubric vs Sonnet+rubric).** Result: **not met**, feedback stays on Sonnet.

| Check | Values | Result |
|---|---|---|
| Detected ≥ Sonnet's − 2 | 60 vs 69 − 2 = 67 | **FAIL** |
| MAE ≤ Sonnet's + 1.0 | 4.04 ≤ 4.63 | Pass |
| MAE ≤ 9.59 | 4.04 | Pass |
| No-op ≤ 1 | 0 | Pass |
| False ≤ Sonnet's | 1 ≤ 1 | Pass |
| Schema validity 100% | 100.0% | Pass |

Haiku with the rubric matched Sonnet on calibration and precision. It caught 9 fewer errors, mostly at intermediate level (recall 69.6%, against 100.0% for Sonnet), missing prepositions and mood errors.

### What the rubric changed

- **Fewer false corrections, in every model.** On the three clean conversations, every arm with the rubric made **0** false corrections, against 3–6 without it. That's the rubric's "don't correct correct French" and "no stylistic rephrasing" rules at work, the problem 001 described. Sonnet's one remaining false correction is the dataset's deliberate *ne explétif* trap (fb-022: *je crains qu'on me licencie* → *qu'on ne me licencie*), even though the rubric says that form is optional.
- **Better-calibrated grammar scores.** Grammar MAE fell by 5.85 points for Sonnet, 7.96 for Haiku and 3.29 for Mistral (on its valid feedback). The biggest gains are at beginner level, where scores were least calibrated before.
- **Recall barely moved for Sonnet (+1) and fell slightly for Haiku (−2).** Fewer corrections per conversation (Sonnet 2.93 → 2.59) means the rubric mostly removed unneeded corrections, not real ones.
- **No-op corrections** (`corrected` equal to `original`) fell from 3 to 1 for Sonnet and from 6 to 0 for Haiku.
- **Cost and latency.** The rubric adds about 3,000 input tokens per call. Cost per conversation went up 81% for Sonnet and 118% for Haiku. Mistral's +9% is understated, because its 5 timed-out calls cost $0. Latency went down slightly for Sonnet (p50 5.1 → 4.4 s) but up for Haiku (4.3 → 7.1 s) and Mistral (30.9 → 39.3 s).

### Mistral Large with the rubric times out

With the rubric, 5 of 27 Mistral calls (18.5%) hit a `ReadTimeout` at 60 s. That's the Mistral SDK's default HTTP timeout, which the app doesn't override. Those conversations count as missed in recall (71.8%). On the 22 that completed, Mistral caught 51 of 57 errors (89.5%), with no false corrections and a grammar MAE of 2.82. So the rubric improved Mistral's feedback too, but made it slower than the client allows.

Mistral isn't the default provider (001). Anyone who sets `FEEDBACK_PROVIDER=mistral` should either set `FEEDBACK_RUBRIC=false` or expect occasional timeouts. In the app, a timeout fails the feedback request and leaves the session open, so the learner can retry. Raising the Mistral client timeout would be a separate change.

## Consequences

- `FEEDBACK_RUBRIC` defaults to `true`, as shipped by #269. `FEEDBACK_RUBRIC=false` restores the original prompt exactly.
- Feedback stays on Claude Sonnet 5.5. 001's Haiku trigger was tested and not met, so 001's feedback choice stands, now with the rubric.
- Feedback costs about $0.0149 per session instead of $0.0082. That's still negligible for a single-user app, and prompt caching could recover most of it.
- The rubric is now part of the evaluated configuration. Any edit to `data/feedback_rubric.md` changes its SHA-256 and should be followed by a new `--rubric both` run before it's relied on.

## What would change this decision

- **A rubric edit.** Rerun `python3 -m evals.run_feedback_eval --rubric both` and reapply these thresholds.
- **Haiku catching up on recall.** A newer Haiku, or rubric changes that close the intermediate-level gap, so that Haiku+rubric meets rule 2. That would make feedback about 12× cheaper.
- **Prompt caching.** Enabling it for the rubric would change the cost trade-off, not the quality one.
- **A fair Mistral comparison.** With a longer client timeout, Mistral+rubric's numbers on the completed conversations suggest it could compete on quality. It would still be about 9× slower than Sonnet.
- **A v2 dataset** reviewed by a native or C1+ speaker, or real learner transcripts, showing the rubric suppresses corrections a tutor would want.

## Limitations

- **The rubric and the labels share an author.** Both were drafted by Claude Code from the same taxonomy, and the grammar bands are identical by design. Part of the MAE and precision gains is alignment with the labeler's conventions. That alignment is the rubric's purpose (one standard for labels and instructions), but it means these gains aren't independent evidence of better feedback.
- **The dataset tests some of the rubric's rules.** The rubric's examples were checked against the dataset: no labeled span appears in them (`tests/test_feedback_rubric.py`). But some general rules overlap the dataset's deliberate traps, such as the optional *ne explétif* behind fb-022.
- **One run per arm, 27 conversations.** Sonnet without the rubric made 16 false corrections in 001's baseline run and 11 here, which shows the run-to-run variance. The rubric effects on false corrections and MAE are large compared with that. The ±1–2 recall differences aren't meaningful.
- **Single labeler, B1 reviewer.** The same caveats as 001. Advanced-level labels carry the least authority.
- **Unvalidated anchors.** The rubric's vocabulary, fluency and overall anchors have no labels, so this eval doesn't measure them.
- **Judge.** 95.5% agreement on 22 Claude-drafted items, whose human review is still pending.
- **Costs** are estimates from [`data/llm_pricing.json`](../../data/llm_pricing.json) (checked 2026-11-13).

## References

- Run: [`feedback_eval_20261117-034654.md`](../../evals/results/feedback_eval_20261117-034654.md), [`.json`](../../evals/results/feedback_eval_20261117-034654.json)
- Rubric: [`data/feedback_rubric.md`](../../data/feedback_rubric.md); loader `services/llm/rubric.py`; skill `.claude/skills/french-feedback-rubric/`
- Baseline and model choice: [001](001-model-choice.md); harness: [`evals/README.md`](../../evals/README.md)
- Issues: #269 (this record), #231 (harness), #230 (dataset), #232 (001), #270 (the study-coach agent will grade with this rubric)
