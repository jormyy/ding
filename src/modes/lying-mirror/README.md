# Lying Mirror

Lying Mirror is a high-hand information variant. A fake flop is shown alongside the real flop.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `modeInfo` with `lying-mirror` during flop to expose three fake cards from `dealDeck`.
- The fake flop does not enter `allCommunityCards` or scoring.
