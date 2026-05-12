# Mirror Match

Mode 15 of the 200-mode catalogue.

## Rule

Every hand receives the same first hole card. The second hole card is dealt
normally from the remaining deck. The rest of the game follows Classic Ding with
normal high-hand scoring.

## Engine Surface

- Mode id: `mirror-match`
- Score rule: `high`
- Deal rule: standard 5-card board, `deal.constraint = "sharedFirstCard"`
- Phase extension: none

The constrained deal path removes one shared anchor card from the shuffled deck,
copies it into every hand's first card slot, then deals the rest of each hand and
the board from the remaining deck.

## Validation

Browser validation artifacts live in `sim/screens/mirror-match/` and
`sim/notes/mirror-match.md`.
