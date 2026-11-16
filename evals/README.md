# evals/

Offline evaluation data for the French Language Coach. Nothing in the app imports this directory.

The first dataset is the ground truth for end-of-session **feedback quality** (issue #230). The eval harness (#231) will run each configured model (Mistral Large, Claude Sonnet 5.5, Claude Haiku 5.5) over it and compare the models' corrections and grammar scores with these labels, alongside cost and latency.

## Layout

```
evals/
├── __init__.py
├── schema.py                 # Pydantic models for a record + load_dataset()
├── datasets/
│   └── feedback_v1.jsonl     # 27 labeled conversations, one JSON object per line
├── LABELING.md               # Error categories, span rules, grammar-score rubric
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
| feedback_v1 | **Pending** | | |

Update this table when the review is done (date, and what was changed or confirmed).

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

## Versioning

A version is frozen once it is merged and eval results exist for it (feedback_v1 can still change during its initial human review). After that, fixes and additions go into a new file (`feedback_v2.jsonl`) so results stay comparable across runs. See [`LABELING.md`](LABELING.md#adding-or-changing-records).
