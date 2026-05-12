# Open Book

Mode 24 in the 200-mode Ding catalogue.

## Rule

Every hand is dealt two hole cards and both are public to the whole table from preflop onward. The five-card board, trading flow, phase order, reveal order, and cooperative inversion scoring stay identical to Classic Ding.

## Engine Notes

Open Book uses the standard deal with `publicCards: 2`. The server still owns full hand state, while masked client state exposes both hole cards and `cardCount` for every hand before reveal.

## Validation

Browser playthrough artifacts live under:

- `sim/screens/open-book/`
- `sim/notes/open-book.md`
