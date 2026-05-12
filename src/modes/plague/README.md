# Plague

Plague is a high-hand removal event. At turn, the announced rank vanishes.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses deterministic sevens as the announced plague rank.
- Uses `phaseEffects.turn = ["removeSevens"]`.
