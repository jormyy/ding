# Mirror Universe

Mirror Universe is a high-hand rank event. At river, ranks invert across hands and board.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["invertAllRanks"]`.
- The actual card identities mutate before reveal scoring.
