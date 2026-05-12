# Suited Hole

Mode 17 of the 200-mode catalogue.

## Rule

Every two-card hand is dealt with matching suits. The rest of the game follows
Classic Ding with normal high-hand scoring.

## Engine Surface

- Mode id: `suited-hole`
- Score rule: `high`
- Deal rule: standard 5-card board, `deal.constraint = "sameSuit"`
- Phase extension: none

The constrained deal path scans the active deck for the first available
same-suit pair for each hand, removes both real cards, and then deals the board
from the remaining deck. This preserves normal card uniqueness while making
flush paths easier for the table to reason about.

## Validation

Browser validation artifacts live in `sim/screens/suited-hole/` and
`sim/notes/suited-hole.md`.
