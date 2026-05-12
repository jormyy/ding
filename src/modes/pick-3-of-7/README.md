# Pick 3 of 7

Mode 9 of the 200-mode catalogue.

## Rule

Each hand is dealt seven private candidate cards. During the deal-choice phase,
the hand owner selects exactly three cards to keep. Those three cards become the
hand for the normal preflop -> flop -> turn -> river -> reveal loop.

## Engine Surface

- Mode id: `pick-3-of-7`
- Score rule: `high`
- Deal rule: standard 5-card board, `dealChoice.dealtCards = 7`,
  `dealChoice.keepCards = 3`
- Phase extension: reuses the `dealChoice` phase introduced for Player's Choice.

## Validation

Browser validation artifacts live in `sim/screens/pick-3-of-7/` and
`sim/notes/pick-3-of-7.md`.
