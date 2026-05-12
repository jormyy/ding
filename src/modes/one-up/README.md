# One Up

Mode 23 in the 200-mode Ding catalogue.

## Rule

Every hand is dealt two private cards, but one card from each hand is public to the whole table from preflop onward. The second hole card stays hidden from opponents until reveal. The five-card board, trading flow, phase order, reveal order, and cooperative inversion scoring stay identical to Classic Ding.

## Engine Notes

One Up uses the standard deal with `publicCards: 1`. The server keeps full card identities for scoring, while masked client state exposes only the first public card and the hand's `cardCount` to opponents.

## Validation

Browser playthrough artifacts live under:

- `sim/screens/one-up/`
- `sim/notes/one-up.md`
