# Classic Ding

Classic Ding is the baseline cooperative ranking mode.

## Rules

- Mode id: `ding`
- Deal: 2 private hole cards per hand.
- Board: 5 shared community cards.
- Visibility: hole cards are private until reveal; community cards reveal 0 / 3 / 4 / 5 across preflop / flop / turn / river.
- Scoring: standard high poker hand. The strongest hand belongs in rank slot 1.
- Team score: pairwise inversions between the table's final ranking and the true high-hand ranking.

## Validation

`npm run modes:check` runs the full gate (codegen drift + handler-contract audit + `verify-mechanics --strict` over every catalogue mode). The mechanic-verification report lands at `scripts/Stage-3-results.md`.
