# Flash River

Flash River is a high-hand information variant where the entire five-card board is visible before any ranking begins.

Reveal schedule:

- Preflop: all five community cards visible.
- Flop: all five remain visible.
- Turn: all five remain visible.
- River: all five remain visible.
- Reveal: all five remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 5`.
- Uses `visibleCommunityCards.preflop: 5`.
- Showdown uses normal high-hand scoring.
