# Solitaire Suite

Solitaire Suite is a seven-hole-card Ding variant where each hand can often make a strong five-card hand before the board matters.

## Rules

- Mode id: `solitaire-suite`
- Deal: 7 private hole cards per hand.
- Board: 5 shared community cards.
- Visibility: hole cards are private until reveal; community cards reveal 0 / 3 / 4 / 5 across preflop / flop / turn / river.
- Scoring: standard high poker hand using the seven hole cards plus the shared board.
- Team score: pairwise inversions between the table's final ranking and the true high-hand ranking.

## Validation

See `sim/notes/solitaire-suite.md` and `sim/screens/solitaire-suite/`.
