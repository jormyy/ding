# Player's Choice

Mode 7 of the 200-mode catalogue.

## Rule

Each hand is dealt three private cards during a deal-choice phase. The hand's
owner chooses any two cards to keep, then the game advances into the normal
preflop -> flop -> turn -> river -> reveal loop.

## Engine Surface

- Mode id: `players-choice`
- Score rule: `high`
- Deal rule: standard five-card board, with
  `dealChoice: { dealtCards: 3, keepCards: 2, selectionPhase: true }`
- Phase extension: `dealChoice` sits between lobby start and preflop.
- Client action: `chooseDealCards`

The server stores per-hand choice progress in `GameState.dealChoices`. Opponent
selection indexes are masked, but their submitted status remains visible so the
table can see who is still choosing.

## Validation Notes

Browser validation artifacts live in `sim/screens/players-choice/` and
`sim/notes/players-choice.md`.
