# Royal Spark

Mode 22 in the 200-mode Ding catalogue.

## Rule

Every hand is dealt two private cards from the high-rank band: 8, 9, T, J, Q, K, or A. The five-card board, trading flow, phase order, reveal order, and cooperative inversion scoring stay identical to Classic Ding.

## Engine Notes

Royal Spark uses the constrained-deal path with `constraint: "highRanks"`. The dealer draws both hole cards for every hand from the 28-card high-rank band before dealing the normal board and burns from the remaining deck.

Because only 28 cards can satisfy the hole-card constraint, `getMaxTotalHandsForMode()` caps total hands for this mode at 14 before applying player-count distribution. This keeps lobby hand-count options within dealable capacity.

## Validation

Browser playthrough artifacts live under:

- `sim/screens/royal-spark/`
- `sim/notes/royal-spark.md`
