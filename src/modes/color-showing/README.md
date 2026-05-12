# Color Showing

Color Showing is a high-hand Ding variant where every hole card's color is visible to the whole table from preflop onward, while ranks and exact suits stay private until reveal.

Players can reason about broad red/black texture and possible flush blockers, but all rank strength and exact suit identity remain hidden until hands flip.

## Engine Notes

- Uses `deal.visibleHoleCards` with `visibleHoleCardDetail: "color"`.
- Server masking sends `publicCardHints` instead of fake `publicCards`, so evaluation still uses the true private cards.
- The client renders color hints as partial card faces with `?` ranks and a red or black marker.
