# Two-Step River

Two-Step River is a high-hand board-visibility variant with six community cards. The final river packet has two cards, but only one is visible before reveal.

## Engine Notes

- Uses `deal.communityCards: 6`.
- Uses `visibleCommunityCards` of `3 / 4 / 5 / 6` from flop through reveal.
- Showdown uses all six community cards and normal high-hand scoring.
