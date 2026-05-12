# Drought

Drought is a high-hand removal event. At turn, face cards are removed from hands and board.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["removeFaceCards"]`.
- Hands may shrink; reveal still proceeds with the remaining cards.
