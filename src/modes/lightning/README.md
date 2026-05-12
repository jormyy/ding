# Lightning

Lightning is a high-hand rank event. At river, the first hole card in every hand upgrades one rank.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["incrementFirstHolePerHand"]`.
- Aces stay capped at ace.
