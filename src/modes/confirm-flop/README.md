# Confirm Flop

Confirm Flop is a high-hand board-visibility variant. The flop is hidden, then the flop and turn appear together.

## Engine Notes

- Uses normal five-card community dealing and high-hand scoring.
- Uses `visibleCommunityCards` of `0 / 4 / 5` across flop, turn, and river.
- This implementation hides the unconfirmed flop rather than rendering explicit facedown placeholders.
