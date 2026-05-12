# Phoenix Board

Phoenix Board is a high-hand deal-and-board variant. Each hand is dealt three cards, keeps its strongest two, and the discarded cards return as bonus community cards.

## Engine Notes

- Uses `holeCards: 3`, `keepCards: 2`, and `discardedCardsToCommunity: true`.
- The regular five-card board is dealt first; automatic keep-card discards are appended as bonus community cards.
- Reveal can show the expanded board, while earlier streets show the regular five-card schedule.
