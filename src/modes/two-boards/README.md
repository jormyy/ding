# Two Boards

Two Boards is a high-hand Ding board variant with two parallel five-card boards.

The table still ranks every hand cooperatively, but each hand scores against whichever board makes that hand strongest:

- Preflop: no community cards visible.
- Flop: six community cards visible, three per board.
- Turn: eight community cards visible, four per board.
- River: all ten community cards visible, five per board.
- Reveal: all ten remain visible for final scoring.

## Engine Notes

- Uses `deal.communityCards: 10`.
- Uses `deal.boards: { count: 2, cardsPerBoard: 5, scoring: "best" }`.
- The current client receives the boards as one flattened community-card list; scoring splits them into board 1 and board 2.
- `computeShowdownForMode()` evaluates every hand on each board and keeps that hand's best solved result.
