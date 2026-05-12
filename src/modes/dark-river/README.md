# Dark River

Dark River is a high-hand board-visibility variant. The river card reveals only its suit until the reveal phase.

## Engine Notes

- Uses normal five-card community dealing and high-hand scoring.
- Uses `visibleCommunityCardDetails.river[4] = "suit"` to mask only the fifth board card.
- Reveal sends full card identities so made hands and final scoring are normal.
