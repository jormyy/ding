# Twin Spark

Mode 21 of the 200-mode catalogue.

## Rule

Every two-card hand is dealt from the low rank band. Low means rank 2 through
7. The rest of the game follows Classic Ding with normal high-hand scoring.

## Engine Surface

- Mode id: `twin-spark`
- Score rule: `high`
- Deal rule: standard 5-card board, `deal.constraint = "lowRanks"`
- Phase extension: none

The constrained deal path scans the active deck for the first available pair
where both cards are in the 2-7 rank band, removes both real cards, and then
deals the board from the remaining deck.

## Validation

Browser validation artifacts live in `sim/screens/twin-spark/` and
`sim/notes/twin-spark.md`.
