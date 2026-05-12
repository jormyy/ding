# Volcano

Volcano is a high-hand destruction event. At river, the first hole card in every hand is destroyed.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["removeFirstHolePerHand"]`.
- Reveal scores with the remaining cards.
