# Rainbow Hole

Mode 16 of the 200-mode catalogue.

## Rule

Every two-card hand is dealt with different suits. The rest of the game follows
Classic Ding with normal high-hand scoring.

## Engine Surface

- Mode id: `rainbow-hole`
- Score rule: `high`
- Deal rule: standard 5-card board, `deal.constraint = "differentSuits"`
- Phase extension: none

The constrained deal path draws each hand's first card, then removes the next
available card with a different suit from the active deck. Board cards are dealt
from the remaining deck after all hands are constructed.

## Validation

Browser validation artifacts live in `sim/screens/rainbow-hole/` and
`sim/notes/rainbow-hole.md`.
