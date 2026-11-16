# Labeling Guide: Feedback Dataset

How conversations in `evals/datasets/feedback_*.jsonl` are labeled (issue #230). The schema in `evals/schema.py` enforces the structural rules below; `tests/test_feedback_dataset.py` runs it on every line in CI. The judgment rules (what counts as an error, what score to give) are up to the labeler, and this guide is how we keep them consistent.

## What a record holds

| Field | Meaning |
|-------|---------|
| `id` | `fb-NNN`, unique, sequential, never reused |
| `scenario_id` | A scenario id from `scenarios.py` |
| `difficulty` | `beginner`, `intermediate` or `advanced` (the scenario level the learner chose) |
| `messages` | The conversation as `{"role": "user" \| "assistant", "content": ...}`, assistant first, roles alternating |
| `errors` | The errors a good tutor should catch in the learner (`user`) turns; `[]` for a clean conversation |
| `grammar_score` | 0–100, see [Grammar score](#grammar-score) |
| `notes` | Optional remarks on the whole record (judgment calls, correct forms deliberately left unlabeled) |

Each error:

| Field | Meaning |
|-------|---------|
| `message_index` | Index into `messages` of the learner turn that contains the error |
| `category` | One of the categories below |
| `original` | The erroneous span, copied **verbatim** from the message |
| `corrected` | What replaces `original`; applying it must give correct French |
| `alternatives` | Optional: other correct replacements for the same span |
| `note` | Optional: a short English explanation, or why the label is a judgment call |

These names mirror the app's feedback output (`example_corrections[].original` / `.corrected` and `grammar_score` in `schemas/session.py`), so the eval harness (#231) can compare them directly.

## Error categories

The first twelve are **grammatical** and count toward `grammar_score`. The last three are vocabulary issues: a good tutor should still point them out, so they're labeled, but they don't lower the grammar score.

| Category | Definition | Wrong → right | Grammar score |
|----------|------------|---------------|---------------|
| `gender` | Wrong noun gender, shown by the article or determiner | une croissant → un croissant | Yes |
| `agreement` | Adjective, past participle or noun number that doesn't agree | deux nuit → deux nuits; je l'ai essayé (la robe) → je l'ai essayée | Yes |
| `conjugation` | Wrong verb form, including subject–verb agreement and an inflected form where an infinitive is needed | combien coûte les deux → combien coûtent les deux; je dois travaillé → je dois travailler | Yes |
| `tense_mood` | Wrong tense or mood: subjunctive, conditional in a *si* clause, imparfait vs passé composé, infinitive constructions | bien que je n'avais pas → bien que je n'aie pas; si j'aurais su → si j'avais su | Yes |
| `auxiliary` | *avoir* where *être* is required in a compound tense, or the reverse | j'ai venu → je suis venu | Yes |
| `article` | Wrong or missing article, including partitives and *de* after negation or quantities | je n'ai pas une carte → je n'ai pas de carte | Yes |
| `contraction` | Missing contraction or elision (*au, aux, du, des, j', n', l'*) | à le comptoir → au comptoir; je ne ai pas → je n'ai pas | Yes |
| `preposition` | Wrong or missing preposition, including verb/adjective + preposition | intéressé à → intéressé par; pendant cinq ans (ongoing) → depuis cinq ans | Yes |
| `pronoun` | Wrong pronoun, pronoun order, or missing/redundant *y*/*en* | le me faire monter → me le faire monter; lui prêter un → lui en prêter un | Yes |
| `negation` | Malformed negation (word order, a missing *ne* in writing) | je pas ai → je n'ai pas | Yes |
| `word_order` | Words in the wrong place, other than pronouns | un parc grand → un grand parc | Yes |
| `spelling` | Misspelling that changes the word or its meaning (*a/à, ou/où, la/là, du/dû*) | il habite a Paris → il habite à Paris | Yes |
| `register` | Too familiar (or too formal) for the situation, including *tu*/*vous* | « Ouais » in a job interview → « Oui » | No |
| `anglicism` | A word or structure calqued from English | appliquer pour un poste → postuler à un poste; ça fait du sens → c'est logique | No |
| `lexical` | Wrong word choice that isn't an anglicism, including fixed expressions | je suis froid → j'ai froid | No |

When two categories could apply, choose the most specific one, e.g. *de le lait* after a negation is an `article` error (the partitive should become *de*), not a `contraction` error.

## Span and correction rules

1. **Verbatim.** `original` must appear exactly in the message, including accents and punctuation. Use the ASCII apostrophe (`'`) and plain spaces everywhere in the file, so spans match predictably.
2. **Smallest useful span.** Include the error plus just enough context to be unambiguous and to make `corrected` a drop-in replacement: `à le comptoir` → `au comptoir`, not the whole sentence.
3. **Missing words.** Include the neighboring words so the span isn't empty: `je vais Paris` → `je vais à Paris`.
4. **One error per label.** If one span holds two errors (e.g. *une grosse vélo*, where gender drives the adjective), use one label with the most specific category, correct the whole span (`un gros vélo`), and name the other category in `note`.
5. **Alternatives.** If more than one correction is right for the same span, put the main one in `corrected` and the others in `alternatives` (`avec la carte` → `par carte`, alternative `avec ma carte`). The harness accepts any of them.
6. **Label every error.** After drafting, reread each learner turn in full and label everything a good tutor would correct, not only the errors planted on purpose. An unlabeled error would make a model's correct correction count as a false one.
7. **Don't label correct French.** Some forms look wrong but aren't (*savoir s'il serait possible*, *au cas où il y aurait*, *je me suis rendu compte*). Leave them unlabeled, and say so in the record's `notes` when they're deliberate traps.

### Accents

Missing or wrong accents count only when they change the word or its meaning (`spelling`: *a/à, ou/où, la/là, du/dû*). Otherwise, learner turns are written with correct accents, because the dataset tests grammar feedback, not typing.

### Spoken forms

Learner turns are typed chat, so the dataset applies written norms for grammar (keep *ne* in negations), but it doesn't label informal-but-correct constructions (*c'est mieux de…*, a question without inversion) as errors. Note any borderline label (e.g. *des nouvelles* vs *de nouvelles*) as a judgment call in its `note`.

## Grammar score

`grammar_score` judges the learner's **grammar** in that conversation on an **absolute** scale. It isn't adjusted for difficulty level: the app's feedback prompt asks models for a grammar score without telling them the level, so the label has to work the same way. Only grammatical categories count.

| Score | Description |
|-------|-------------|
| 95–100 | No grammatical errors |
| 85–94 | 1–2 minor grammatical errors; meaning always clear |
| 70–84 | 3–4 errors, or one that obscures meaning |
| 50–69 | Errors in most learner turns; meaning mostly recoverable |
| 30–49 | Frequent errors; meaning sometimes unclear |
| 0–29 | Grammar prevents communication |

Within a band, adjust for how much the learner wrote (errors per sentence) and how serious the errors are; a *si + conditionnel* error weighs more than a missing plural *-s*. Record any judgment call in `notes`.

## Clean conversations

A clean conversation has `errors: []` and `grammar_score` of 90 or more (enforced by the schema). Its learner turns are correct French at the scenario's level, so a good tutor should make few or no corrections. These records measure false corrections.

## Adding or changing records

1. Once a version is merged and eval results exist for it, don't change its labels in place: fixes and additions go into a new file (`feedback_v2.jsonl`), so results stay comparable across runs.
2. Use the next `fb-NNN` id.
3. Follow the rules above, then run `python3 -m pytest tests/test_feedback_dataset.py -v --cov-fail-under=0`.
4. Update the composition table and review status in `evals/README.md`.
