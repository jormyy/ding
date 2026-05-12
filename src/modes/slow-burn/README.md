# Slow Burn

Slow Burn is a high-hand board-reveal variant where the board grows slowly.

Reveal schedule:

- Preflop: no community cards visible.
- Flop: one community card visible.
- Turn: three community cards visible.
- River: all five community cards visible.
- Reveal: all five remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 5`.
- Uses `visibleCommunityCards` of `1 / 3 / 5` across flop, turn, and river.
- Showdown uses normal high-hand scoring.
