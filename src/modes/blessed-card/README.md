# Blessed Card

Blessed Card is a high-hand card-metadata variant. One marked card upgrades the hand holding it.

## Engine Notes

- Uses `deck: "blessed"` to mark the ace of hearts with `meta: "blessed"` before shuffle.
- Uses `forceRankByMeta.first: "blessed"` so any hand holding the blessed card sorts above unblessed hands at reveal.
- If the blessed card lands on the board, no hand holds it and no forced rank applies.
