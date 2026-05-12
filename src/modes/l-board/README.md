# L-Board

L-Board is a high-hand Ding board-shape variant with seven community cards arranged as a bent path.

The current implementation treats the L as three overlapping five-card scoring paths through the bend. Each hand scores against whichever path makes it strongest.

## Engine Notes

- Uses `deal.communityCards: 7`.
- Uses `deal.boards.cardIndexes` to define three overlapping five-card scoring paths over the flattened board.
- The current client receives the L as a flattened community-card list; scoring interprets the path indexes.
- Showdown evaluates every hand on all paths and keeps that hand's best solved result.
