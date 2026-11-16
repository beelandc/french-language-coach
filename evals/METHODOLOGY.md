# How the feedback eval scores a model

This explains how the feedback eval harness (`run_feedback_eval.py`, issue #231) decides whether a model's feedback caught the errors in a conversation: the deterministic matching, the LLM judge, and how their decisions become metrics. For how to run the harness, its flags and its guardrails, see [`README.md`](README.md#feedback-eval-harness-231). For how the labels were written, see [`LABELING.md`](LABELING.md).

Every example below comes from `datasets/feedback_v1.jsonl`, and each matching example behaves as described in the current code.

## Contents

1. [The question being answered](#1-the-question-being-answered)
2. [Vocabulary: labeled span and model span](#2-vocabulary-labeled-span-and-model-span)
3. [Deterministic matching](#3-deterministic-matching)
4. [The LLM judge](#4-the-llm-judge)
5. [From decisions to metrics](#5-from-decisions-to-metrics)
6. [A worked example, end to end](#6-a-worked-example-end-to-end)
7. [Design choices and known limits](#7-design-choices-and-known-limits)
8. [Where it lives in the code](#8-where-it-lives-in-the-code)

## 1. The question being answered

For each conversation, a model returns feedback that includes a list of corrections (`example_corrections`). The dataset lists the errors a good tutor should catch. Scoring comes down to one question, asked about every pair of (labeled error, model correction):

> **Is this correction about that labeled error, and if so, is its fix right?**

Clear cases are settled by rules (no LLM, free, reproducible). The rest go to an LLM judge.

```
model corrections ──► normalize, drop duplicates and no-ops
                          │
                          ▼
                  locate each correction in the conversation
                          │
          ┌───────────────┼──────────────────────────┐
          ▼               ▼                          ▼
   spans overlap,   spans overlap, fix         no labeled error to
   fix check passes check fails, or no         compare with
          │         overlap at all                   │
          ▼               ▼                          ▼
   detected +       LLM judge decides          false correction
   correct fix      (addresses? acceptable?)
          │               │                          │
          └───────────────┴─────────► metrics ◄──────┘
```

## 2. Vocabulary: labeled span and model span

### The label

Each labeled error stores the wrong text, the **labeled span**, and its fix. In `fb-001` the learner wrote *"Sur place. Je vais m'asseoir à le comptoir."*:

```json
{"original": "à le comptoir", "corrected": "au comptoir", "category": "contraction"}
```

Some errors also list `alternatives`, other fixes that are just as correct. In `fb-002`, `"avec le train"` can become `"en train"` or `"par le train"`. The fix and its alternatives together are the error's **accepted corrections**.

### The model's correction

The feedback prompt asks for corrections in the same shape:

```json
{"original": "...", "corrected": "...", "explanation": "..."}
```

The **model span** is the model's `original`: the piece of the learner's text it chose to quote as wrong.

The model decides how much text to quote. Nothing makes it quote the same amount as the label, and it doesn't say which message the text came from. For the error above, all three of these are reasonable answers:

| The model quoted | Compared with the labeled span `"à le comptoir"` | Name |
|---|---|---|
| `"à le comptoir"` | identical | **same span** |
| `"Je vais m'asseoir à le comptoir"` | contains the labeled span, plus more | **wider model span** |
| `"à le"` | sits inside the labeled span | **narrower model span** |

A wider span is the most common case: models often quote the whole clause or sentence. Comparing the strings exactly would wrongly reject the wider and narrower versions, so the deterministic matching is built to accept all three.

## 3. Deterministic matching

Function: `match_deterministic()` in `matching.py`.

### Step 1: Normalize

Both sides are rewritten into a standard form, **for comparison only** (reports keep the raw text):

- Unicode NFC (so a decomposed `é` equals a precomposed one)
- curly apostrophes `’ ‘ ʼ` become `'`; curly and French quotes `“ ” « »` become `"`
- lowercase
- runs of whitespace (including non-breaking spaces) collapse to one space
- the space French puts before `? ! ; :` is removed
- punctuation and spaces at either end are stripped: `. , ; : ! ? " ( ) …` (apostrophes are kept, since they carry elision)

So `"Je n’ai pas."` and `"je n'ai pas"` compare as equal.

### Step 2: Drop duplicates and no-ops

- **Duplicates.** Two corrections that are the same after normalization count once.
- **No-ops.** A correction whose `original` and `corrected` are the same after normalization, e.g. `"Bonjour" → "Bonjour !"`, changes nothing. It is counted in `no_op_corrections` but is neither a true nor a false correction. Models sometimes return these to show correct sentences.

### Step 3: Locate the correction and find its candidates

The model doesn't say which message it is quoting, so the harness searches the **learner messages** (not the tutor's) for the model span:

- **Found.** The **candidates** are the labeled errors in the message(s) that contain it.
- **Not found verbatim** (the model paraphrased the learner). Every labeled error in the conversation is a candidate.
- **Found, but that message has no labeled errors.** There is nothing to compare with, so the correction is a **false correction** immediately, without a judge call. Example: `"Je n'aime pas le jus." → "Je n'aime pas le jus d'orange."` in `fb-001`: correct French changed into other correct French.

A correction on a clean conversation (`fb-007`, `fb-016`, `fb-027`) always ends up false, because those conversations have no labeled errors.

### Step 4: Do the spans overlap?

For each candidate, the spans **overlap** if one contains the other (after normalization). That covers same, wider and narrower spans. Partial overlaps, where each span sticks out on a different side, don't count.

### Step 5: Does the model's fix give the labeled fix?

This check runs only when the spans overlap. How it works depends on which span is bigger.

#### Same span

The model's fix must equal one of the accepted corrections.

```
label:  "avec le train" → "en train"   (alternative: "par le train")
model:  "avec le train" → "par le train"
        "par le train" is an accepted correction                           ✅
```

#### Wider model span

Put the labeled fix into the model's span, then check whether the result equals what the model wrote:

```
label:  "Je ne ai pas" → "Je n'ai pas"
model:  "Je ne ai pas de monnaie" → "Je n’ai pas de monnaie"

model span with the labeled fix applied:  "je n'ai pas de monnaie"
model's corrected text (normalized):      "je n'ai pas de monnaie"         ✅ equal
```

**One wider span covering two errors.** In `fb-009` one learner sentence holds two labeled errors: `"beaucoup des livres" → "beaucoup de livres"` and `"une grosse vélo" → "un gros vélo"`. All the labeled errors inside the model span are applied together:

```
model:  "J'ai beaucoup des livres et une grosse vélo."
      → "J'ai beaucoup de livres et un gros vélo."

model span with both labeled fixes applied:
        "j'ai beaucoup de livres et un gros vélo"                          ✅✅ equal
```

One correction matches both errors. Every combination of accepted corrections is tried, so an alternative for either error also works.

**Fallback: the model changed something extra.** A model sometimes fixes the error and also rewords something nearby. Then the comparison above fails, and a looser check is used for each labeled error on its own:

> the labeled fix (or an alternative) appears in the model's corrected text, **and** the labeled error no longer appears in it.

```
label:  "Je dois travaillé" → "Je dois travailler"
model:  "Je dois travaillé ce soir" → "Je dois travailler ce soir, merci"

applying the labeled fix gives "je dois travailler ce soir", not equal      ✗
fallback: "je dois travailler" appears, "je dois travaillé" is gone          ✅
```

One exception: in `"deux nuit" → "deux nuits"`, the fix itself contains the error text `"deux nuit"`. So "the error no longer appears" is ignored when the error text is part of the fix.

The fallback also handles a model that fixes only one of two errors:

```
model:  "J'ai beaucoup des livres et une grosse vélo."
      → "J'ai beaucoup de livres et une grosse vélo."

"beaucoup des livres": "beaucoup de livres" appears, the error is gone       ✅
"une grosse vélo":     "un gros vélo" doesn't appear                        → judge
```

#### Narrower model span

Do it the other way round: put the model's fix into the labeled span, and check whether the result is an accepted correction.

```
label:  "à le comptoir" → "au comptoir"
model:  "à le" → "au"

labeled span with the model's fix applied:  "au comptoir"                  ✅ accepted
```

### Step 6: Outcomes

| Situation | Outcome |
|---|---|
| Spans overlap and the fix check passes | **Detected, correct fix.** Method `deterministic`, no LLM call. |
| Spans overlap but the fix check fails | **Judge pair.** Usually a wrong fix, or a correct fix the label doesn't list. |
| The correction overlaps none of its candidates | **Judge pairs**, one with **each** candidate. |
| No candidates at all | **False correction**, no judge call. |

In the first full run (81 conversations, three models), the rules settled almost every correction. The judge decided 14 pairs in total.

## 4. The LLM judge

Class: `Judge` in `judge.py`.

### Why it's needed

The rules recognize the labeled fix and its listed alternatives. They can't recognize:

- **A correct fix worded differently.** Label `"Ça faisait du sens" → "C'était logique"` (alternative `"Ça avait du sens"`); a model wrote `"Cela avait du sens"`. That's a correct fix, but "cela" isn't "ça".
- **A wrong fix of the right mistake.** `"une croissant" → "une croissante"` overlaps the label but fixes it wrongly.
- **A correction about something else in the same message.** `"une équipe où je peux évoluer" → "…où je pourrais évoluer"` in a message whose labeled error is `"des nouvelles technologies"`.

### What the judge sees

One call per pair. The system prompt (`JUDGE_SYSTEM_PROMPT`) sets the task, and the message carries the pair:

```
Learner message:
Bonjour ! Je voudrais un café crème et une croissant, s'il vous plaît.

Labeled error:
- category: gender
- erroneous span: une croissant
- accepted corrections: un croissant
- labeler note: croissant is masculine

Tutor's correction:
- original: une croissant
- corrected: une croissante
- explanation: ...
```

The judge is **never told which model wrote the correction** ("tutor" is all it sees). This limits self-preference, since the judge (Mistral Large by default) could otherwise favor its own provider's output. See [Judge choice](README.md#judge-choice).

### What it answers

Only this JSON object:

```json
{"addresses_error": true, "correction_acceptable": false, "reason": "one short sentence"}
```

- **`addresses_error`**: is the correction aimed at **this** mistake? Quoting a different amount of text, rewriting the sentence, explaining it badly, or fixing it wrongly all still count as aimed at it. A correction about a different word or a different mistake does not.
- **`correction_acceptable`**: is its fix of that mistake correct, natural French? It doesn't have to match the label word for word. It's forced to `false` when `addresses_error` is `false`.

| Correction | addresses | acceptable | Result |
|---|---|---|---|
| `"une croissant" → "une croissante"` | ✅ | ❌ | error detected, wrong fix |
| `"Ça faisait du sens…" → "Cela avait du sens…"` | ✅ | ✅ | error detected, correct fix |
| `"je peux évoluer" → "je pourrais évoluer"` (vs `"des nouvelles technologies"`) | ❌ | ❌ | false correction |

The rule that "a wrong fix still addresses the mistake" was made explicit after the first smoke run. Without it, the judge called wrong fixes "not addressed", which turned them into "missed error + false correction" and left correction accuracy stuck at 100%.

### Strict parsing, one re-ask, judge errors

- **Parsing.** Code fences and any text around the JSON object are stripped, and the object is validated strictly. `"true"` as a string is rejected; extra keys are ignored.
- **Re-ask.** If the reply can't be parsed, the judge is asked once more: its bad reply is sent back with "Reply with only the JSON object."
- **Judge error.** A second unparseable reply, or an API failure, becomes a **judge error**: the pair counts as **not matched**, so the error stays missed and the correction can end up false. Judge errors are counted in every report, so a flaky judge is visible rather than silently changing the scores.
- **Cache.** Verdicts are cached for the run, keyed on the record, the labeled error and the normalized correction. If two models return the same correction for the same error, the judge is asked once.

Judge calls go through the same provider layer as everything else and are recorded separately from the feedback calls being tested, so the report shows the judge's cost on its own line.

### How far to trust the judge

Before scoring any model, each run sends the judge the 22 items in `datasets/judge_validation_v1.jsonl`: drafted corrections with hand verdicts. It reports how often the judge agrees, overall and by the style the correction imitates (Mistral-like, Claude-like, neutral). See [Judge validation](README.md#judge-validation) for the items, their review status, and the agreement seen so far. The judge's verdicts can vary between runs on borderline items (jv-014 flipped between runs), which is one reason the agreement rate is reported on every run.

## 5. From decisions to metrics

Function: `score_conversation()` in `scoring.py`. Every pair decision (rules or judge) feeds three simple rules:

- A **labeled error is detected** if any correction addresses it.
- A detected error is **correctly fixed** if any correction that addresses it has an acceptable fix.
- A **model correction is a true correction** if it addresses at least one labeled error. Otherwise it is a **false correction**.

One correction can address several errors (the wider span in `fb-009`), and several corrections can address one error. Neither is double-counted.

The headline metrics, per model, overall and per difficulty level:

| Metric | Formula | Over |
|---|---|---|
| Error recall | detected errors ÷ labeled errors | every attempted conversation; invalid feedback misses all its errors |
| Precision | true corrections ÷ all corrections | conversations with valid feedback; the false-correction count is shown next to it |
| Correction accuracy | correctly fixed errors ÷ detected errors | detected errors |
| Grammar MAE | mean of \|model `grammar_score` − label\| | conversations with valid feedback |

Schema validity, cost and latency come from the provider layer's call records, not from matching. See [Metrics](README.md#metrics).

## 6. A worked example, end to end

`fb-001` has three labeled errors:

| # | Labeled span | Fix |
|---|---|---|
| 0 | `une croissant` | `un croissant` |
| 1 | `à le comptoir` | `au comptoir` |
| 2 | `Je ne ai pas` | `Je n'ai pas` |

Suppose a model returns four corrections:

| Correction | What happens | Decision |
|---|---|---|
| A. `"une croissant" → "un croissant"` | same span as error 0; fix equals the label | **rules:** error 0 detected, correct fix |
| B. `"à le comptoir" → "à la comptoir"` | same span as error 1; fix isn't accepted | **judge:** addresses ✅, acceptable ❌ → error 1 detected, wrong fix |
| C. `"Je n'aime pas le jus." → "Je n'aime pas le jus d'orange."` | found in a message with no labeled error | **false correction** (no judge call) |
| D. `"Sur place" → "Sur place"` | nothing changes | **no-op** (ignored) |

Result for this conversation:

- Error 0: detected, correct. Error 1: detected, wrong fix. Error 2: **missed** (no correction touched it).
- **Recall** 2/3, **precision** 2/3 (A and B true, C false, D not counted), **correction accuracy** 1/2.

## 7. Design choices and known limits

- **Rules first, judge second.** Rules are free, fast and give the same answer every time, and they handle most corrections. The judge is used only where wording genuinely varies, which keeps its cost low and its errors from touching the clear-cut cases.
- **The labels are treated as complete** (`LABELING.md`, rule 6). A correction that matches no labeled error is false, even when it's a reasonable stylistic suggestion. That is intentional, since the app shows these as *corrections*, but it means a model that offers more stylistic suggestions gets lower precision. Most false corrections in the first full run were stylistic rewrites of correct French.
- **The fallback checks only the labeled part.** If a model fixes the labeled error but introduces a new mistake elsewhere in the same quote, the fix still counts as correct. Correction accuracy measures the labeled error, not the whole quote.
- **Overlap works on characters, not words.** A very short model span could in principle overlap a labeled span by accident. The fix check usually catches that, a mismatch goes to the judge, and labels deliberately include a little surrounding context (`LABELING.md`, rule 2), which makes accidental overlaps rare.
- **Partial overlaps go to the judge.** If the two spans overlap without one containing the other, the rules don't decide.
- **Judge bias and drift.** The judge is blind to the model, has a narrow task and is measured against hand verdicts on every run. Its verdicts can still vary between runs on borderline items, and the validation verdicts were drafted by a Claude model for the maintainer to review (see [Limits](README.md#limits)).
- **Recall is limited by the prompt.** The app's feedback prompt asks for *example* corrections, not every error, so no model is asked to be exhaustive.

## 8. Where it lives in the code

| Step | Code |
|---|---|
| Normalization | `matching.py`: `normalize()` |
| Duplicates and no-ops | `matching.py`: `prepare_corrections()`, `Correction.is_no_op` |
| Locate, overlap, fix check, judge pairs | `matching.py`: `match_deterministic()` |
| Wider span, all labeled errors at once | `matching.py`: `_combination_matches()` |
| Wider span fallback | `matching.py`: `_single_wide_match()` |
| Narrower span | `matching.py`: `_narrow_match()` |
| Judge prompt and request | `judge.py`: `JUDGE_SYSTEM_PROMPT`, `build_judge_message()` |
| Verdict parsing | `judge.py`: `parse_verdict()`, `JudgeVerdict` |
| Re-ask, judge errors, cache | `judge.py`: `Judge.judge()` |
| Judge validation and agreement | `judge.py`: `run_judge_validation()`, `compute_agreement()` |
| Pair decisions to per-conversation scores | `scoring.py`: `score_conversation()` |
| Metrics | `scoring.py`: `compute_metrics()`, `aggregate_metrics()` |
| Orchestration (feedback call, then matching, then judge) | `run_feedback_eval.py`: `_run_config()` |

The tests exercise every case in this document: `tests/test_eval_matching.py` (normalization, spans, the fallback, candidates), `tests/test_eval_judge.py` (parsing, re-ask, judge errors, cache, validation) and `tests/test_eval_scoring.py` (metrics, including the worked example's shape).
