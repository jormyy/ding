# Card Singularity

Card Singularity is a high-hand merging event. At turn, each hand's first two hole cards collapse into one averaged-rank card.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["singularityAverageFirstTwoHoles"]`.
- Hand count stays stable; cards within each hand may shrink.
