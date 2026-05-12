# Memory Hole

Memory Hole is a high-hand board-memory event. At turn, one community card is replaced and hidden.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Reuses `randomReplaceVisibleCommunity` at turn.
- Masks community card slot 0 as hidden through river.
