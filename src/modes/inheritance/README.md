# Inheritance

Mode 12 of the 200-mode catalogue.

## Rule

Each hand starts with two private cards. During the deal-choice phase, every
owner chooses one card to keep. The unkept card is discarded to the left
neighbor, so each final hand starts preflop with:

- one card the owner kept
- one discarded card from the right neighbor

For two players, this behaves as a keep-one plus exchanged-discard start. For
larger tables, the discarded cards move in a simultaneous ring.

## Engine Surface

- Mode id: `inheritance`
- Score rule: `high`
- Deal rule: standard 5-card board, `dealChoice.dealtCards = 2`,
  `dealChoice.keepCards = 1`, `dealChoice.inheritance = true`
- Phase extension: reuses `dealChoice`, with an inheritance resolution branch.

## Validation

Browser validation artifacts live in `sim/screens/inheritance/` and
`sim/notes/inheritance.md`.
