# Dark Flop

Dark Flop is a high-hand board-visibility variant. The flop is hidden when the game enters flop, then the board catches up at turn.

## Engine Notes

- Uses normal five-card community dealing and high-hand scoring.
- Uses `visibleCommunityCards` of `0 / 4 / 5` across flop, turn, and river.
- This implementation hides the dark flop rather than rendering explicit facedown board placeholders.
