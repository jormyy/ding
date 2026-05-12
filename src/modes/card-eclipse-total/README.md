# Card Eclipse Total

Card Eclipse Total is a high-hand rank-removal event. At river, the highest rank in play vanishes.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["removeHighestRankInPlay"]`.
- Removes the rank from hands and board.
