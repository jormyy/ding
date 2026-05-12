# Look-Then-Choose

Mode 13 of the 200-mode catalogue.

## Rule

Each hand sees three private candidate cards from the deck during the deal-choice
phase. The owner chooses any two to keep, then normal preflop ranking begins.

This uses the same card-selection surface as Player's Choice, but the mode copy
frames the extra candidate as a deck peek rather than a discard-heavy deal.

## Engine Surface

- Mode id: `look-then-choose`
- Score rule: `high`
- Deal rule: standard 5-card board, `dealChoice.dealtCards = 3`,
  `dealChoice.keepCards = 2`
- Phase extension: reuses the `dealChoice` phase introduced for Player's Choice.
- Client action: `chooseDealCards`

## Validation

Browser validation artifacts live in `sim/screens/look-then-choose/` and
`sim/notes/look-then-choose.md`.
