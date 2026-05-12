# Quantum Shuffle

Quantum Shuffle is a high-hand redistribution event. At turn, all hole cards are gathered and redealt.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["shuffleAllHoleCards"]`.
- The accelerated pass uses deterministic rotation for repeatable tests.
