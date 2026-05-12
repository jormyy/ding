# Suit Showing

Suit Showing is a high-hand Ding variant where every hole card's suit is visible to the whole table from preflop onward, while ranks stay private until reveal.

Players can reason about flush texture and blocker distribution early, but they still cannot know exact rank strength until hands flip.

## Engine Notes

- Uses `deal.visibleHoleCards` with `visibleHoleCardDetail: "suit"`.
- Server masking sends `publicCardHints` instead of fake `publicCards`, so evaluation still uses the true private cards.
- The client renders suit hints as partial card faces with `?` rank markers.
