# Gapped Hole

Mode 19 of the 200-mode catalogue.

## Rule

Every two-card hand is dealt with ranks two apart. The rest of the game follows
Classic Ding with normal high-hand scoring.

## Engine Surface

- Mode id: `gapped-hole`
- Score rule: `high`
- Deal rule: standard 5-card board, `deal.constraint = "gappedRanks"`
- Phase extension: none

The constrained deal path scans the active deck for the first available pair
whose rank values differ by exactly two, removes both real cards, and then deals
the board from the remaining deck. Rank distance uses the normal 2-through-A
order and does not wrap.

## Validation

Browser validation artifacts live in `sim/screens/gapped-hole/` and
`sim/notes/gapped-hole.md`.
