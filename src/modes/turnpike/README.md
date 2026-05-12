# Turnpike

Turnpike is a high-hand board-reveal variant where most of the board arrives on the flop.

Reveal schedule:

- Preflop: no community cards visible.
- Flop: four community cards visible.
- Turn: the same four cards remain visible.
- River: all five community cards visible.
- Reveal: all five remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 5`.
- Uses `visibleCommunityCards` of `4 / 4 / 5` across flop, turn, and river.
- Showdown uses normal high-hand scoring.
