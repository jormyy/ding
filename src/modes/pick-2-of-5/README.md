# Pick 2 of 5

Mode 8 of the 200-mode catalogue.

## Rule

Each hand is dealt five private cards during the deal-choice phase. The hand's
owner chooses any two cards to keep, then the game advances into the standard
preflop -> flop -> turn -> river -> reveal loop.

## Engine Surface

- Mode id: `pick-2-of-5`
- Score rule: `high`
- Deal rule: standard five-card board, with
  `dealChoice: { dealtCards: 5, keepCards: 2, selectionPhase: true }`
- Phase extension: reuses the `dealChoice` phase introduced for Player's Choice.
- Client action: `chooseDealCards`

The table sees each player's submitted status while selected card indexes stay
visible only to the hand owner.

## Validation Notes

Browser validation artifacts live in `sim/screens/pick-2-of-5/` and
`sim/notes/pick-2-of-5.md`.
