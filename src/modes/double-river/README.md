# Double River

Double River is a high-hand Ding board variant. Each hand still has two private cards, but the board has six community cards instead of five.

The reveal schedule stays familiar until the final street:

- Preflop: no community cards visible.
- Flop: three community cards visible.
- Turn: four community cards visible.
- River: two final community cards arrive together, showing all six.
- Reveal: all six board cards remain visible for final scoring.

## Engine Notes

- Uses `deal.communityCards: 6`.
- Uses `visibleCommunityCards.river: 6` and `visibleCommunityCards.reveal: 6`.
- Showdown still uses best five-card poker hands from each hand's two holes plus the six-card board.
