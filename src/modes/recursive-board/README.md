# Recursive Board

Recursive Board is a high-hand board recursion event. At turn, the board duplicates itself.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["mirrorCommunity"]`.
- Displays ten community cards while scoring the canonical first five.
