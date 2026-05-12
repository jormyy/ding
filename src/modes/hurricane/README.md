# Hurricane

Hurricane is a high-hand hole-card event. At river, each hand loses one hole card.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["removeOneHolePerHand"]`.
- Reveal scores with the remaining private card plus board.
