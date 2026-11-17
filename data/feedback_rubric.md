# French feedback rubric

> One grading standard for learner French in this project. It is used by the app's end-of-session feedback prompt (`services/llm/rubric.py`), by the `french-feedback-rubric` Claude Code skill, and it shares its error taxonomy with the eval labels (`evals/LABELING.md`, `evals/schema.py`).
> Version 1 (issue #269). Canonical: edit this file, don't copy it. Tests keep the taxonomy in line with the eval schema.
> Review status: drafted by Claude Code, pending maintainer review. The vocabulary, fluency and overall anchors are unvalidated, since there are no labels for them.

## Scope

- Review only the learner's turns (`user`). Never correct the other speaker (`assistant`).
- The learner types in a chat. Apply written norms for grammar (keep *ne* in negations), but accept informal constructions that are correct French.
- Correct what a good tutor would correct: real errors that a teacher would mark. Nothing else. A correct sentence that could be phrased more elegantly is not an error.

## Error taxonomy

Classify every error in exactly one category.

| Category | Counts toward grammar score | Definition | Example (wrong → right) | Typical CEFR level |
|---|---|---|---|---|
| `gender` | Yes | Wrong noun gender, shown by an article, determiner or pronoun | un fourchette → une fourchette | A1–A2 |
| `agreement` | Yes | An adjective, past participle or noun number that doesn't agree | les fleurs sont joli → les fleurs sont jolies; les clés que j'ai perdu → les clés que j'ai perdues | A2–B1 |
| `conjugation` | Yes | Wrong verb form: subject–verb agreement, a wrong stem or ending, or an inflected form where an infinitive is needed | ils prend le métro → ils prennent le métro; je peux venu → je peux venir | A1–B1 |
| `tense_mood` | Yes | Wrong tense or mood: subjunctive, conditional in a *si* clause, imparfait vs passé composé, infinitive constructions | il faut que tu viens → il faut que tu viennes; si j'aurais le temps → si j'avais le temps | B1–B2 |
| `auxiliary` | Yes | *avoir* where *être* is required in a compound tense, or the reverse | j'ai tombé dans la rue → je suis tombé dans la rue | A2–B1 |
| `article` | Yes | Wrong or missing article, including partitives and *de* after a negation or a quantity | il n'y a pas des chaises → il n'y a pas de chaises; je bois café le matin → je bois du café le matin | A1–A2 |
| `contraction` | Yes | Missing contraction or elision (*au, aux, du, des, j', n', l'*) | je parle de les vacances → je parle des vacances; je aime le jazz → j'aime le jazz | A1 |
| `preposition` | Yes | Wrong or missing preposition, including verb or adjective + preposition, and countries and cities | je pense de toi → je pense à toi; je vais en Portugal → je vais au Portugal | A2–B2 |
| `pronoun` | Yes | Wrong pronoun, wrong pronoun order, or a missing or redundant *y* / *en* | je lui ai vu hier → je l'ai vu hier; je veux lui le donner → je veux le lui donner | B1–B2 |
| `negation` | Yes | A malformed negation: word order, or a missing *ne* in writing | je mange pas de viande → je ne mange pas de viande; il a ne pas fini → il n'a pas fini | A1–A2 |
| `word_order` | Yes | Words in the wrong place, other than pronouns | une maison belle → une belle maison | A2–B1 |
| `spelling` | Yes | A misspelling that changes the word or its meaning (*a/à, ou/où, la/là, du/dû, ce/se*) | je ne sais pas ou il habite → je ne sais pas où il habite | A1–B1 |
| `register` | No | Too familiar or too formal for the situation, including *tu* / *vous* | « Salut, tu peux m'aider ? » to a hotel receptionist → « Bonjour, pourriez-vous m'aider ? » | B1–C1 |
| `anglicism` | No | A word or structure calqued from English | je réalise que j'ai oublié → je me rends compte que j'ai oublié; c'est supposé être facile → c'est censé être facile | B1–C1 |
| `lexical` | No | A wrong word choice that isn't an anglicism, including fixed expressions | je connais nager → je sais nager; j'ai faim de savoir → j'ai hâte de savoir | A2–B2 |

- **Most specific category.** When two categories could apply, choose the more specific one. For example, *pas des* after a negation is an `article` error (the partitive becomes *de*), not a `contraction` error.
- **One error per correction.** If one span holds two linked errors (for example, a gender error that also makes the adjective wrong), make one correction that fixes the whole span, classified by the root cause.

## What not to correct

These are correct, so don't flag them:

- **Correct but unusual or optional forms**, e.g. the optional *ne explétif* (*avant qu'il parte* and *avant qu'il ne parte* are both correct), or *après que* + indicative (*après qu'il est parti* is the standard form).
- **Accents that don't change the word.** A missing or wrong accent is an error only when it changes the word or its meaning (the `spelling` pairs above).
- **Informal but correct typed French**: questions without inversion (*Tu viens à quelle heure ?*), *c'est mieux de…*, *on* for *nous*.
- **Stylistic rephrasing.** Don't replace a correct word with a synonym, make a correct sentence more formal, or add words the learner didn't need.
- **Register that fits the scenario.** Relaxed French in a casual scenario is fine. Flag register only when it is wrong for the situation.

## Severity (CEFR-aware)

Give each error a severity. It decides the order of the corrections and the focus area. It does **not** change the absolute grammar scale below.

| Severity | When |
|---|---|
| High | The error obscures the meaning, or it breaks a rule well below the learner's level (e.g. article gender from a learner writing at B1 or above) |
| Medium | It breaks a rule at about the learner's level |
| Low | It involves a structure above the learner's level, or it has no effect on meaning. Still correct it, gently |

If the learner's level isn't given, infer it from their own turns: range of tenses, sentence length, vocabulary. The "Typical CEFR level" column says when each structure is usually mastered. Within a score band, an error's impact on meaning weighs more than how often it occurs.

## Correction format

- `original` is copied **verbatim** from one learner turn, including accents and punctuation.
- Use the **smallest span** that makes `corrected` a drop-in replacement: *je parle de les vacances* → *je parle des vacances*, not the whole sentence. For a missing word, include its neighbors so the span isn't empty.
- **One error per correction**, most severe first. List each distinct error once.
- `explanation` names the rule in one or two sentences, in the language the caller asks for. If more than one correction is right, give the most natural one, and you may mention another in the explanation.
- Never return a correction whose `corrected` text equals `original`.

## Scores

**Grammar** is judged on an absolute scale, not adjusted for the learner's level. Only the categories marked "Yes" above count.

| Score | Description |
|---|---|
| 95–100 | No grammatical errors |
| 85–94 | 1–2 minor grammatical errors; meaning always clear |
| 70–84 | 3–4 errors, or one that obscures meaning |
| 50–69 | Errors in most learner turns; meaning mostly recoverable |
| 30–49 | Frequent errors; meaning sometimes unclear |
| 0–29 | Grammar prevents communication |

Within a band, adjust for how much the learner wrote (errors per sentence) and how serious the errors are. A *si* + conditional error weighs more than a missing plural *-s*. A conversation with no grammatical errors scores 90 or more, even if it has vocabulary issues.

**Vocabulary** (range and precision of word choice; `register`, `anglicism` and `lexical` issues count here):

| Score | Description |
|---|---|
| 90–100 | Precise, varied words for the situation; no vocabulary issues |
| 75–89 | Adequate and mostly precise; one or two vocabulary issues |
| 60–74 | Limited range or several imprecise words, anglicisms or register slips |
| 40–59 | Frequent wrong words; meaning sometimes depends on guessing |
| 0–39 | Vocabulary too limited to express the task |

**Fluency** (connected, natural turns of appropriate length for the scenario):

| Score | Description |
|---|---|
| 90–100 | Natural, connected turns that move the conversation forward |
| 75–89 | Clear and connected, with some stiff or very short turns |
| 60–74 | Understandable but fragmented, or relies on the other speaker |
| 40–59 | Mostly isolated words or phrases |
| 0–39 | Very little connected French |

**Overall** is a holistic judgment of the learner's French in this conversation, normally within a few points of the mean of the three scores above.

## Strengths and focus area

- **Strengths** are specific and evidenced by the learner's turns (e.g. "correct passé composé with *être* for movement verbs"), not generic praise.
- **Focus area** is the single highest-impact issue to practise: choose by severity, then by how often it recurs. Phrase it as something to practise, not as a list of mistakes. With no errors, suggest the next structure to try at the learner's level.
