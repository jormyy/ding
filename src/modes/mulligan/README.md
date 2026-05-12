# Mulligan

Mode 10 of the 200-mode catalogue.

## Rule

Each hand starts with two private cards. During the deal-choice phase, the hand
owner may either lock those cards or spend one mulligan to redraw the full
two-card hand. After the redraw is spent, the owner locks the current two cards
and the game proceeds through the normal preflop -> flop -> turn -> river ->
reveal loop.

## Engine Surface

- Mode id: `mulligan`
- Score rule: `high`
- Deal rule: standard 5-card board, `dealChoice.dealtCards = 2`,
  `dealChoice.keepCards = 2`, `dealChoice.mulligan = true`
- Server-only state: `dealDeck` stores the remaining shuffled deck until the
  deal-choice phase is resolved.

## Validation

Browser validation artifacts live in `sim/screens/mulligan/` and
`sim/notes/mulligan.md`.
