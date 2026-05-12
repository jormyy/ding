# Inverted Deck

Inverted Deck is a high-hand rank-identity variant. Aces are low and twos rank above kings.

## Engine Notes

- Uses the standard deck and normal dealing.
- Uses `rankTransform: "inverted"` for showdown evaluation.
- Made-hand names are prefixed with `Inverted:` so the reveal explains why normal rank instincts may be wrong.
