# Cursed Card

Cursed Card is a high-hand card-metadata variant. One marked card downgrades the hand holding it.

## Engine Notes

- Uses `deck: "cursed"` to mark the ace of hearts with `meta: "cursed"` before shuffle.
- Uses `forceRankByMeta.last: "cursed"` so any hand holding the cursed card sorts below uncursed hands at reveal.
- If the cursed card lands on the board, no hand holds it and no forced rank applies.
