# Mini Board

Mini Board is a high-hand Ding board variant with four community cards.

The board gets a normal flop and one turn card, then stops:

- Preflop: no community cards visible.
- Flop: three community cards visible.
- Turn: all four community cards visible.
- River: the same four cards remain visible.
- Reveal: all four remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 4`.
- Uses `visibleCommunityCards` of `3 / 4 / 4` across flop, turn, and river.
- Showdown uses each hand's two holes plus the four-card board and selects the best five-card poker hand.
