# Half-Lit Holes

Half-Lit Holes is a high-hand visibility variant. One hole-card slot is visible at each street, alternating between first and second.

## Engine Notes

- Uses standard two-hole, five-board dealing and high-hand scoring.
- Uses phase-specific `visibleHoleCardIndexes` so preflop/turn expose slot 0 and flop/river expose slot 1.
- Reveal exposes both hole cards.
