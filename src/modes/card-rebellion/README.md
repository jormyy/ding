# Card Rebellion

Card Rebellion is a high-hand hand-movement event. At turn, hands rotate around the table.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["rotateHoleCardsClockwise"]`.
- Deterministic rotation represents resemblance-driven swaps in this pass.
