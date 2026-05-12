# Tower

Tower is a high-hand Ding board-visibility variant. Five community cards are dealt, but only the top three are visible until river.

Reveal schedule:

- Preflop: no community cards visible.
- Flop: three community cards visible.
- Turn: the same three cards remain visible.
- River: all five community cards visible.
- Reveal: all five remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 5`.
- Uses `visibleCommunityCards` of `3 / 3 / 5` across flop, turn, and river.
- Showdown uses normal high-hand scoring.
