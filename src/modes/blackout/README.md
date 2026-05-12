# Blackout

Blackout is a high-hand board-visibility variant where no community cards are visible until river.

Reveal schedule:

- Preflop: no community cards visible.
- Flop: no community cards visible.
- Turn: no community cards visible.
- River: all five community cards visible.
- Reveal: all five remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 5`.
- Uses `visibleCommunityCards` of `0 / 0 / 5` across flop, turn, and river.
- Showdown uses normal high-hand scoring.
