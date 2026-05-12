# Cascade

Cascade is a high-hand board-visibility variant. The oldest visible community cards become unknown as streets advance, then reveal restores the full board.

## Engine Notes

- Uses standard two-hole, five-board dealing and high-hand scoring.
- Uses `visibleCommunityCardDetails` with `hidden` per-card display overrides.
- Reveal ignores display masks and sends the true card identities for final scoring.
