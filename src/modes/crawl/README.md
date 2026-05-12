# Crawl

Crawl is a high-hand slow-board variant. The board starts with one visible card and inches forward before finishing at river.

Reveal schedule:

- Preflop: one community card visible.
- Flop: two community cards visible.
- Turn: three community cards visible.
- River: all five community cards visible.
- Reveal: all five remain visible for scoring.

## Engine Notes

- Uses `deal.communityCards: 5`.
- Uses `visibleCommunityCards` of `1 / 2 / 3 / 5` from preflop through river.
- Showdown uses normal high-hand scoring.
