# Wormhole

Wormhole is a high-hand hole-card event. At river, two hands swap one hole card.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["swapFirstCardsFirstTwoHands"]`.
- The accelerated pass deterministically swaps the first card of the first two hands.
