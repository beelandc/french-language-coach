# Decision records

Short records of significant project decisions: what was decided, on what evidence, at what cost, and what would change it. One file per decision, `NNN-short-title.md`, numbered in order. Earlier records aren't rewritten when a decision changes. A later record supersedes them, and the old one's status says so.

| Record | Decision | Status |
|--------|----------|--------|
| [001](001-model-choice.md) | Claude Sonnet 5.5 for chat and feedback | Accepted (2026-11-16) |
| [002](002-feedback-rubric.md) | French feedback rubric on by default; feedback stays on Sonnet 5.5 | Accepted (2026-11-17) |

## Format

1. **Header**: status (Proposed, Accepted, Superseded by NNN), date, issue, who decided
2. **Context**: the question and what was measured
3. **Decision**: the choice, with its cost and latency where relevant, and the trade-off in one or two sentences
4. **Evidence**: the data, with links to the committed artifacts it comes from
5. **Consequences**: what changes, and how to reverse it
6. **What would change this decision**: concrete evidence that would reopen it
7. **Limitations**: how far the evidence can be trusted

The feedback rubric's with/without comparison (#269) is in 002. It tested 001's Haiku trigger, which wasn't met.
