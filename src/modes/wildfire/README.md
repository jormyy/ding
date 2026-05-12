# Wildfire

Wildfire is a high-hand rank-removal event. At river, ranks adjacent to the river card burn away.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["removeAdjacentToRiver"]`.
- The river card itself remains; its neighboring ranks are removed.
