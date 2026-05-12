# Earthquake

Earthquake is a high-hand board event. At turn, the community board rotates in place.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["shuffleCommunity"]`.
- The effect is deterministic in this pass for testability.
