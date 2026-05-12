# Card Convergence

Card Convergence is a high-hand rank event. At river, sevens converge into aces.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["convergeSevensToAces"]`.
- Applies to hands, board, burn cards, and remaining deck.
