# 001: Model choice for chat and feedback

- **Status:** Accepted
- **Date:** 2026-11-16
- **Issue:** #232 (milestone "Model evaluation (Claude vs Mistral)", #228–#232)
- **Decided by:** the project maintainer

## Context

The README used to argue that Mistral was the right model for a French-learning app, citing general French benchmarks. The model-evaluation milestone set out to test that claim on this app's own workload rather than assume it. The workload is end-of-session feedback: given a learner's conversation, catch their errors, correct them, and score their grammar.

- #228 added a provider layer, so chat and feedback can each run on Mistral or Claude.
- #229 made feedback output schema-validated, with one corrective retry.
- #230 built a hand-labeled dataset of 27 learner conversations with 71 labeled errors ([`evals/README.md`](../../evals/README.md)).
- #231 built a harness that runs each model through the app's own feedback path and scores it against the labels ([`evals/METHODOLOGY.md`](../../evals/METHODOLOGY.md)).

Chat (the scenario role-play) has no quality eval.

## Decision

| Feature | Provider / model | Effort | Cost | Latency | Basis |
|---------|------------------|--------|------|---------|-------|
| Feedback | `anthropic` / `claude-sonnet-5-5` | `medium` | $0.008381 per session | p50 5.1 s / p95 9.0 s | Eval run [20261116-042618](../../evals/results/feedback_eval_20261116-042618.md) |
| Chat | `anthropic` / `claude-sonnet-5-5` | `low` | about $0.0019 per turn | mean 1.9 s | Local manual testing only (n=5); chat quality **not measured** |

These are now the defaults in `config.py` and `.env.example`.

### Trade-offs

- **Feedback:** Sonnet 5.5 caught the most errors (95.8% recall vs 88.7% for Mistral Large) and returned feedback about five times faster (p50 5.1 s vs 26.0 s), at about 1.9× the cost. In exchange, it made more unrequested style suggestions and its grammar scores were less well calibrated (mean absolute error 9.59 vs 6.19, worst at beginner level).
- **Chat:** Sonnet 5.5 was chosen for responsiveness: in local manual testing, its turns averaged 1.9 s against 9.0 s for Mistral Large (n=5 and n=9). Its French conversational quality wasn't measured, so this neither confirms nor refutes Mistral's reputation for natural French.

## Evidence

All feedback figures come from the committed run [`evals/results/feedback_eval_20261116-042618.md`](../../evals/results/feedback_eval_20261116-042618.md) ([JSON](../../evals/results/feedback_eval_20261116-042618.json)): 27 of 27 conversations per model, total spend $0.4258, judge `mistral/mistral-large-latest`.

| Model | Recall | Precision (false) | Correction accuracy | Grammar MAE (n) | Schema valid 1st / final | Cost / conversation | p50 / p95 latency (ms) |
|---|---|---|---|---|---|---|---|
| Mistral Large (`mistral-large-latest`) | 88.7% (63/71) | 88.7% (8) | 100.0% | 6.19 (27) | 100.0% / 100.0% | $0.004373 | 25,968 / 36,195 |
| Claude Sonnet 5.5 (effort medium) | 95.8% (68/71) | 81.0% (16) | 100.0% | 9.59 (27) | 100.0% / 100.0% | $0.008381 | 5,143 / 8,980 |
| Claude Haiku 5.5 (effort medium) | 87.3% (62/71) | 88.4% (8) | 98.4% | 12.63 (27) | 100.0% / 100.0% | $0.000546 | 4,386 / 7,736 |

Recall counts every attempted conversation; precision and grammar MAE use valid feedback only. [`evals/README.md`](../../evals/README.md#metrics) defines each metric.

**By difficulty** (recall / grammar MAE, 9 conversations per level):

| Model | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Mistral Large | 95.8% / 9.44 | 87.0% / 4.67 | 83.3% / 4.44 |
| Claude Sonnet 5.5 | 100.0% / 14.44 | 95.7% / 6.11 | 91.7% / 8.22 |
| Claude Haiku 5.5 | 91.7% / 17.89 | 91.3% / 8.78 | 79.2% / 11.22 |

### What the false corrections are

A "false correction" is a correction that addresses none of the labeled errors. Sonnet made 16, against 8 each for Mistral Large and Haiku. Read one by one, nearly all 32, from all three models, are style or register suggestions on French that was already correct, not wrong fixes. Only a few are doubtful. So Sonnet's lower precision mostly means more unrequested advice, which costs a learner less than a missed error or a wrong fix would.

*This is a qualitative reading by Claude Code of the run's JSON report, reviewed by the maintainer. It is not a measured metric.*

| Model | Record | Learner wrote | Suggested | Reading |
|---|---|---|---|---|
| Mistral Large | fb-007 | Où sont les toilettes | Où se trouvent les toilettes | Style; the original is correct |
| Claude Sonnet 5.5 | fb-016 | j'ai raté ma correspondance | j'ai loupé ma correspondance | Synonym swap; the original is correct |
| Claude Sonnet 5.5 | fb-022 | je crains qu'on me licencie | je crains qu'on ne me licencie | Optional formal *ne explétif*; the original is correct (a deliberate trap, noted in the record) |
| Claude Haiku 5.5 | fb-007 | Le musée ferme à quelle heure ? | À quelle heure le musée ferme-t-il ? | More formal register; the original is correct for typed chat |
| Claude Haiku 5.5 | fb-018 | vous êtes très gentille | vous êtes très gentil | Doubtful: the transcript doesn't give the museum attendant's gender, and *gentille* is correct if she's a woman |

### Where the other models did better

- **Mistral Large** had the best-calibrated grammar scores, overall (MAE 6.19) and at every difficulty level. Its precision was about the same as Haiku's and above Sonnet's, and it cost about half as much as Sonnet. It caught fewer errors than Sonnet, though (63 vs 68 of 71), and its p50 latency of 26 s is a long wait at the end of a session.
- **Claude Haiku 5.5** was the cheapest by far (about 15× cheaper than Sonnet, 8× cheaper than Mistral) and the fastest. But it had the worst grammar MAE (17.89 at beginner level), the lowest advanced-level recall (79.2%), and 8 corrections that changed nothing (`original` equal to `corrected`), which a learner would see.

### Provenance

The run's recorded commit, `d4521f5`, exists only on the #231 feature branch, because PR #266 was squash-merged into `main` as `be4efaf`. The only code difference since then is a `print(..., flush=True)` change in the harness, so the results apply to `main`. If that branch is deleted, PR #266 is the reference.

## Consequences

- `config.py` and `.env.example` default both features to `anthropic` / `claude-sonnet-5-5` (effort `low` for chat and `medium` for feedback, unchanged).
- `ANTHROPIC_API_KEY` is now required by default. `MISTRAL_API_KEY` is needed only for features set to Mistral and for the eval harness's default judge.
- Explicit values in `.env` override the defaults. An `.env` copied from the old `.env.example` keeps running on Mistral until its `CHAT_*` / `FEEDBACK_*` lines are changed or removed.
- Both features now depend on one provider. To switch back, set `CHAT_PROVIDER=mistral`, `CHAT_MODEL=mistral-large-latest`, `FEEDBACK_PROVIDER=mistral` and `FEEDBACK_MODEL=mistral-large-latest` in `.env`. No code changes are needed.
- Costs rise: feedback from about $0.0044 to $0.0084 per session, and chat from about $0.0008 to $0.0019 per turn (local figures). That's negligible for a single-user app, and visible on the `/admin/metrics` dashboard.

## What would change this decision

- **#269 (feedback rubric).** If Haiku 5.5 with the rubric matches Sonnet's recall, with acceptable grammar MAE and no no-op corrections, move feedback to Haiku: about 15× cheaper and slightly faster. If the rubric changes the ranking in some other way, revisit feedback.
- **A chat quality eval** showing Mistral Large clearly better at natural, in-character French role-play would move chat back to Mistral, despite the latency.
- **A larger or better-reviewed dataset** (a v2 reviewed by a native or C1+ speaker) that reverses the recall ordering between Sonnet and Mistral.
- **Price or latency changes** that close the roughly 5× feedback latency gap, or change the relative cost by more than 2×.

## Limitations

- **Small dataset.** 27 synthetic conversations with 71 labeled errors. Small differences between models aren't meaningful. The decision rests on the large gaps: latency (about 5×) and recall (5 more errors caught out of 71).
- **Single labeler.** The conversations, labels and preferred corrections were drafted by one model (Claude Code) and reviewed by one maintainer who self-assesses at about B1. There's no inter-annotator agreement measure, and advanced-level labels carry the least authority.
- **Possible bias toward Claude.** Claude-drafted labels may favor Claude-style corrections. Mitigations: human review, `alternatives` in the labels, and a Mistral judge for paraphrased corrections.
- **Judge agreement.** The judge agreed with hand verdicts on 20 of 22 items (90.9%). Those verdicts were drafted by Claude Code, their human review is still pending, and the judge prompt was adjusted after seeing them, so the figure is somewhat optimistic.
- **One run per model.** Outputs are non-deterministic, and a rerun can differ.
- **Recall is capped** for every model, because the app's prompt asks for example corrections, not every error.
- **Chat not evaluated.** The chat choice rests on 14 local calls, not on a quality measure.
- **Costs are estimates** from [`data/llm_pricing.json`](../../data/llm_pricing.json) (prices checked 2026-11-13), not invoices.

## References

- Run report: [`feedback_eval_20261116-042618.md`](../../evals/results/feedback_eval_20261116-042618.md), [`.json`](../../evals/results/feedback_eval_20261116-042618.json), [judge sample](../../evals/results/feedback_eval_20261116-042618_judge_sample.jsonl)
- Dataset, labeling and harness: [`evals/README.md`](../../evals/README.md), [`evals/LABELING.md`](../../evals/LABELING.md), [`evals/METHODOLOGY.md`](../../evals/METHODOLOGY.md)
- Issues: #228 (provider layer), #229 (feedback validation), #230 (dataset), #231 (harness), #232 (this record), #269 (feedback rubric)
