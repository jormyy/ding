# Hidden Turn

Hidden Turn is a high-hand board-visibility variant. The flop is visible, but the turn card stays hidden until river.

## Engine Notes

- Uses normal five-card community dealing and high-hand scoring.
- Uses `visibleCommunityCards` of `3 / 3 / 5` across flop, turn, and river.
- This implementation withholds the hidden turn card rather than rendering an explicit facedown placeholder.
