# Trade-Up

Mode 11 of the 200-mode catalogue.

## Rule

Each hand starts with two private cards. During the deal-choice phase, every
owner selects one card to pass to the left neighbor. The pass resolves
simultaneously around the table, so each selected card replaces the selected
slot in the left neighbor's matching hand index.

For two players, this behaves as a one-card swap. For larger tables, it is a
single clockwise card ring.

## Engine Surface

- Mode id: `trade-up`
- Score rule: `high`
- Deal rule: standard 5-card board, `dealChoice.dealtCards = 2`,
  `dealChoice.keepCards = 1`, `dealChoice.tradeUp = true`
- Phase extension: reuses `dealChoice`, with a trade-up resolution branch.

## Validation

Browser validation artifacts live in `sim/screens/trade-up/` and
`sim/notes/trade-up.md`.
