# Flash Flop

Flash Flop is a high-hand information variant where the flop is visible before preflop ranking.

Reveal schedule:

- Preflop: three community cards visible.
- Flop: the same three cards remain visible.
- Turn: four community cards visible.
- River: all five community cards visible.
- Reveal: all five remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 5`.
- Uses `visibleCommunityCards.preflop: 3`.
- Showdown uses normal high-hand scoring.
