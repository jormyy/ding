# Rank Showing

Rank Showing is a high-hand Ding variant where every hole card's rank is visible to the whole table from preflop onward, while suits stay private until reveal.

Players can reason about pairs, kickers, and straight texture early, but flush potential remains hidden until hands flip.

## Engine Notes

- Uses `deal.visibleHoleCards` with `visibleHoleCardDetail: "rank"`.
- Server masking sends `publicCardHints` instead of fake `publicCards`, so evaluation still uses the true private cards.
- The client renders rank hints as partial card faces with `?` suit markers.
