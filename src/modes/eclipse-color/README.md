# Eclipse Color

Eclipse Color is a high-hand board-visibility variant. Community cards reveal only red/black color until the reveal phase.

## Engine Notes

- Uses normal five-card community dealing and high-hand scoring.
- Uses `visibleCommunityCardDetail` to mask visible board cards to `{ color }` for preflop, flop, turn, and river.
- Reveal sends full card identities so made hands and final scoring are normal.
