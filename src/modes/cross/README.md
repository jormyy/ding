# Cross

Cross is a high-hand Ding board-shape variant with five community cards arranged as a plus sign.

The center card is shared by both scoring lines:

- Board 1 is the horizontal line.
- Board 2 is the vertical line.
- Each hand scores against whichever line makes it stronger.

## Engine Notes

- Uses `deal.communityCards: 5`.
- Uses `deal.boards.cardIndexes` to define two scoring lines over the flattened board.
- The current client receives the cross as a flattened community-card list; scoring interprets the line indexes.
- Showdown evaluates every hand on both lines and keeps that hand's best solved result.
