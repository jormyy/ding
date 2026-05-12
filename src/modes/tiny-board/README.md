# Tiny Board

Tiny Board is a high-hand Ding board variant with only three community cards.

The flop is the complete board:

- Preflop: no community cards visible.
- Flop: all three community cards visible.
- Turn: the same three cards remain visible.
- River: the same three cards remain visible.
- Reveal: all three remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 3`.
- Uses `visibleCommunityCards` of `3 / 3 / 3` across flop, turn, and river.
- Showdown uses each hand's two holes plus the three-card board, which creates exactly five available cards per hand.
