# Black Hole

Black Hole is a high-hand board event. At river, the last community card vanishes.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["removeLastCommunity"]`.
- Reveal scores against the reduced board.
