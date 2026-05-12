# Behemoth

Behemoth is a high-hand Ding board variant with nine community cards.

The early streets stay readable, then the river floods the table:

- Preflop: no community cards visible.
- Flop: three community cards visible.
- Turn: four community cards visible.
- River: all nine community cards visible.
- Reveal: all nine remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 9`.
- Uses `visibleCommunityCards` of `3 / 4 / 9` across flop, turn, and river.
- Showdown uses each hand's two holes plus the nine-card board and selects the best five-card poker hand.
