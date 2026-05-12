# Glitch Card

Glitch Card is a high-hand metadata variant. One marked card resolves at reveal.

## Engine Notes

- Uses `deck: "glitch"` to mark the ace of hearts with `meta: "glitched"`.
- Uses `wildCards.metas: ["glitched"]` so the card resolves as the holder's best reveal-time identity.
- This is the reveal-scoring layer; pre-reveal flicker display remains a future animation pass.
