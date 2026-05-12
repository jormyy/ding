# Polar Hole

Mode 20 of the 200-mode catalogue.

## Rule

Every two-card hand is dealt with one high card and one low card. High means
rank 8 through Ace; low means rank 2 through 7. The rest of the game follows
Classic Ding with normal high-hand scoring.

## Engine Surface

- Mode id: `polar-hole`
- Score rule: `high`
- Deal rule: standard 5-card board, `deal.constraint = "polarRanks"`
- Phase extension: none

The constrained deal path scans the active deck for the first available pair
that crosses the high/low boundary, removes both real cards, and then deals the
board from the remaining deck.

## Validation

Browser validation artifacts live in `sim/screens/polar-hole/` and
`sim/notes/polar-hole.md`.
