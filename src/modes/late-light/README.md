# Late Light

Late Light is a high-hand Ding variant where every hand keeps its two hole cards private through turn.

At river, both hole cards from every hand become public before players lock the final ranking. Reveal still follows the standard worst-first flip flow, but by then the table has already seen every private card.

## Engine Notes

- Uses `deal.visibleHoleCards` to expose zero hole cards through turn, then two at river and reveal.
- Scoring uses the standard high-hand evaluator.
- No custom reducers or client view are required; the server mask builds phase-aware `publicCards` for opponent hands.
