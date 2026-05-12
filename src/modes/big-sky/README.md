# Big Sky

Big Sky is a high-hand Ding board variant with seven community cards.

The board reveals faster and larger than Classic Ding:

- Preflop: no community cards visible.
- Flop: four community cards visible.
- Turn: five community cards visible.
- River: all seven community cards visible.
- Reveal: all seven remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 7`.
- Uses `visibleCommunityCards` of `4 / 5 / 7` across flop, turn, and river.
- Showdown uses each hand's two holes plus the seven-card board and selects the best five-card poker hand.
