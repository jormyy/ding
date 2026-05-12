# Two-Suited Card

Two-Suited Card is a high-hand suit-identity variant. One marked card can satisfy multiple suit identities.

## Engine Notes

- Uses `deck: "twoSuited"` to mark the ace of hearts with `meta: "twoSuited"`.
- Current evaluator treats the marked card as suit-flexible through the wildcard metadata path.
- Exact two-suit-only substitution remains a later evaluator refinement.
