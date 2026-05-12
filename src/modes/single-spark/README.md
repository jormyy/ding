# Single Spark

Single Spark is a one-hole-card Ding variant where the shared board carries more of the hand strength.

## Rules

- Mode id: `single-spark`
- Deal: 1 private hole card per hand.
- Board: 5 shared community cards.
- Visibility: the single hole card is private until reveal; community cards reveal 0 / 3 / 4 / 5 across preflop / flop / turn / river.
- Scoring: standard high poker hand using the one hole card plus the shared board.
- Team score: pairwise inversions between the table's final ranking and the true high-hand ranking.

## Validation

See `sim/notes/single-spark.md` and `sim/screens/single-spark/`.
