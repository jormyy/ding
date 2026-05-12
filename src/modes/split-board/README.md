# Split Board

Split Board is a high-hand Ding board variant with two three-card board halves.

Each hand scores on whichever half makes that hand stronger:

- Preflop: no community cards visible.
- Flop: all six community cards visible, split into two three-card halves.
- Turn: the same six cards remain visible.
- River: the same six cards remain visible.
- Reveal: all six remain visible for final scoring.

## Engine Notes

- Uses `deal.communityCards: 6`.
- Uses `deal.boards: { count: 2, cardsPerBoard: 3, scoring: "best" }`.
- The current client receives the halves as one flattened community-card list; scoring splits them into board 1 and board 2.
- `computeShowdownForMode()` evaluates every hand on each half and keeps that hand's best solved result.
