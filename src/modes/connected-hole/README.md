# Connected Hole

Mode 18 of the 200-mode catalogue.

## Rule

Every two-card hand is dealt with adjacent ranks. The rest of the game follows
Classic Ding with normal high-hand scoring.

## Engine Surface

- Mode id: `connected-hole`
- Score rule: `high`
- Deal rule: standard 5-card board, `deal.constraint = "connectedRanks"`
- Phase extension: none

The constrained deal path scans the active deck for the first available pair
whose rank values differ by exactly one, removes both real cards, and then deals
the board from the remaining deck. Rank adjacency uses the normal 2-through-A
order, so `K-A` qualifies and `A-2` does not wrap.

## Validation

Browser validation artifacts live in `sim/screens/connected-hole/` and
`sim/notes/connected-hole.md`.
