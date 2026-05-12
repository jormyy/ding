# Echo

Mode 14 of the 200-mode catalogue.

## Rule

Every hand is dealt as a pocket pair: both hole cards share the same rank and
use different suits. The rest of the game follows Classic Ding with normal
high-hand scoring.

## Engine Surface

- Mode id: `echo`
- Score rule: `high`
- Deal rule: standard 5-card board, `deal.constraint = "pocketPair"`
- Phase extension: none

The constrained deal path removes two same-rank cards from the shuffled deck for
each hand before the normal burn/flop/turn/river board deal consumes the
remaining deck.

## Validation

Browser validation artifacts live in `sim/screens/echo/` and
`sim/notes/echo.md`.
