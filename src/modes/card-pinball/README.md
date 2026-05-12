# Card Pinball

Card Pinball is a high-hand card-movement event. A community card bounces into a hole slot each street.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Reuses `swapFirstHoleWithFirstCommunity` at flop, turn, and river.
- Targeting is deterministic for repeatable tests.
