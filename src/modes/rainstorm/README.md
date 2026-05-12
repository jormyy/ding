# Rainstorm

Rainstorm is a high-hand board event. Each street replaces one visible community card.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Reuses `randomReplaceVisibleCommunity` at flop, turn, and river.
- Replacements are drawn from `dealDeck`.
