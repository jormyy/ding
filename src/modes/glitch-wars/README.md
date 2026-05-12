# Glitch Wars

Glitch Wars is a high-hand board-suit event. At turn, one board card absorbs another card's suit.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["firstCommunityAbsorbsSecondSuit"]`.
- Deterministic first/second board cards represent the fight winner and loser.
