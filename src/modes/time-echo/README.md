# Time Echo

Time Echo is a high-hand time event. At river, the board reverts to the flop.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["revertBoardToFlop"]`.
- Reveal scores against the first three community cards plus holes.
