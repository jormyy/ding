# Trickster Card

Trickster Card is a high-hand metadata variant. The designated card always counts as the hand's worst.

## Engine Notes

- Uses `deck: "trickster"` to mark the ace of hearts with `meta: "trickster"`.
- Uses `forceRankByMeta.last: "trickster"` so the holder sorts below non-trickster hands at reveal.
- If the card lands on the board, no hand is forced down.
