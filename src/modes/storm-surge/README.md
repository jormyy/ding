# Storm Surge

Storm Surge is a high-hand board event. At each street, the oldest community card is swept away.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `stormSurge` at flop, turn, and river.
- The board can shrink, but reveal still evaluates the remaining cards.
