# Identity Crisis

Identity Crisis is a high-hand identity event. At turn, a hole card and board card swap identities.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["swapFirstHoleWithFirstCommunity"]`.
- The swap is deterministic for repeatable tests.
