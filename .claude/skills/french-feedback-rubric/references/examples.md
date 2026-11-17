# Worked reviews

Three reviews in the skill's output format, one per level, applying [`data/feedback_rubric.md`](../../../../data/feedback_rubric.md). The transcripts were written for these examples. They are **not** from the eval dataset (`tests/test_feedback_rubric.py` checks that no labeled dataset span appears here), so the examples don't leak eval answers. "Turn" is the message index, counting from 0, like `message_index` in the dataset.

---

## 1. Beginner: at a bakery

```
assistant: Bonjour ! Qu'est-ce que je vous sers ?
user:      Bonjour, je voudrais un baguette et deux pain au chocolat, s'il vous plaît.
assistant: Très bien. Autre chose ?
user:      Oui, je veux aussi de le jus d'orange. C'est combien ?
assistant: Ça fait six euros cinquante.
user:      Voilà. Merci, bonne journée !
```

**Summary.** The level was given as beginner (about A1–A2), which matches the learner's short, clear turns. The task is handled well. The main issues are noun gender and plural, plus one missing contraction.

| Turn | Original | Corrected | Category | Severity | Why |
|---|---|---|---|---|---|
| 1 | un baguette | une baguette | `gender` | Medium | *Baguette* is feminine, so the article is *une*. An A1 rule, at the learner's level |
| 1 | deux pain au chocolat | deux pains au chocolat | `agreement` | Medium | After *deux*, the noun takes the plural *-s* (only *pain* changes) |
| 3 | de le jus d'orange | du jus d'orange | `contraction` | Medium | The partitive *de* + *le* always contracts to *du* |

**Scores.**
- Grammar 76: three errors in three short turns (70–84 band), none of which obscures the meaning.
- Vocabulary 80: adequate for the task, with a limited range.
- Fluency 80: clear, connected turns, kept short.
- Overall 79.

**Strengths.** Polite, complete requests (*je voudrais…, s'il vous plaît*). A natural question about the price, and a natural way to end the exchange.

**Focus area.** Learn each noun with its article and practise plurals after numbers: *une baguette, deux baguettes, un pain, deux pains*.

**Not corrected.** *Je veux aussi* is correct. *Je voudrais* is softer, but this is a matter of style, not an error.

---

## 2. Intermediate: telling a friend about the weekend

```
assistant: Alors, ce week-end, c'était comment ?
user:      C'était super ! Samedi, nous sommes allés à la montagne avec mes cousins. Quand nous sommes arrivés au sommet, il a fait très froid, mais on a marché pendant cinq heures.
assistant: Cinq heures ! Vous n'étiez pas trop fatigués ?
user:      Si, un peu. Ma cousine a tombé deux fois, mais elle n'était pas blessée. Le soir, nous avons mangé dans un restaurant que mon oncle nous a recommandé.
assistant: Et dimanche ?
user:      Je suis resté chez moi. Je réalise que je travaille trop le week-end !
```

**Summary.** No level was given. I inferred about B1 from the confident passé composé, the mix of tenses and the subordinate clauses. The story is easy to follow. The errors are in past-tense choices.

| Turn | Original | Corrected | Category | Severity | Why |
|---|---|---|---|---|---|
| 3 | a tombé | est tombée | `auxiliary` | Medium | *Tomber* takes *être* in the passé composé, so the participle agrees with *ma cousine* (an agreement error follows from the auxiliary error) |
| 1 | il a fait très froid | il faisait très froid | `tense_mood` | Medium | A background description in a past narrative takes the imparfait |
| 5 | Je réalise que | Je me rends compte que | `anglicism` | Low | *Réaliser* in the sense of "to realize" is a common calque. In careful French, use *se rendre compte* |

**Scores.**
- Grammar 86: two grammatical errors and the meaning is always clear (85–94 band). The anglicism doesn't count here.
- Vocabulary 84: varied and precise, with one anglicism.
- Fluency 88: natural, connected turns that keep the story going.
- Overall 86.

**Strengths.** Correct *être* with *aller* and *rester* (*nous sommes allés*, *je suis resté*), including agreement. A relative clause handled well (*un restaurant que mon oncle nous a recommandé*). *Si* used correctly to answer a negative question.

**Focus area.** The verbs that take *être* in the passé composé (*tomber, arriver, rester, partir…*), and agreeing the participle with the subject.

**Not corrected.**
- *On a marché*: *on* for *nous* is normal in informal French.
- *Que mon oncle nous a recommandé*: *que* refers to *un restaurant* (masculine singular), so *recommandé* is already correct.

---

## 3. Advanced: job interview

```
assistant: Pourquoi souhaitez-vous rejoindre notre équipe ?
user:      Je cherche un poste où je pourrai mettre à profit mon expérience en gestion de projet. Bien que mon poste actuel me plaît, j'ai envie de nouveaux défis.
assistant: Qu'est-ce qui vous attire chez nous en particulier ?
user:      Votre approche de l'innovation. J'ai lu l'article que votre directrice a publié le mois dernier, et je l'ai trouvé passionnant. Si j'aurais vu l'annonce plus tôt, j'aurais postulé l'année dernière.
assistant: Et quelles sont vos attentes salariales ?
user:      Je pense à un salaire autour de 50 000 euros, mais je suis ouvert à discuter.
```

**Summary.** The level was given as advanced (B2+), which fits the varied structures and the register. The errors are in mood, plus one calque.

| Turn | Original | Corrected | Category | Severity | Why |
|---|---|---|---|---|---|
| 3 | Si j'aurais vu | Si j'avais vu | `tense_mood` | High | In a *si* clause about the past, use the plus-que-parfait, never the conditional. This is a B1 rule, well below this learner's level |
| 1 | Bien que mon poste actuel me plaît | Bien que mon poste actuel me plaise | `tense_mood` | Medium | *Bien que* is followed by the subjunctive |
| 5 | je suis ouvert à discuter | je suis prêt à en discuter | `anglicism` | Low | A calque of "open to discussing". *Prêt à en discuter* or *ouvert à la discussion* is idiomatic |

**Scores.**
- Grammar 85: two grammatical errors and the meaning is clear (85–94 band). The score sits at the bottom of the band because the *si* + conditional error is serious.
- Vocabulary 88: precise professional vocabulary (*mettre à profit*, *attentes salariales*), with one calque.
- Fluency 92: fluent, well-structured answers, in a register suited to an interview.
- Overall 88.

**Strengths.** Formal register held throughout. A correct future in a relative clause (*où je pourrai*). A conditional perfect in the main clause (*j'aurais postulé*).

**Focus area.** Mood after conjunctions and in *si* clauses: *bien que* + subjunctive, and *si* + imparfait or plus-que-parfait, never the conditional.

**Not corrected.**
- *De nouveaux défis*: *de* replaces *des* before a plural adjective, so this is correct.
- *Je l'ai trouvé passionnant*: *l'* stands for *l'article* (masculine), so the agreement is correct.
