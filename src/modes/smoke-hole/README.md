# Smoke Hole

Smoke Hole is a high-hand visibility variant. Hole cards are blurred down to suit-only hints until turn.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses phase-specific `visibleHoleCardDetail`: suit-only on preflop/flop, full from turn onward.
- Server masking sends `publicCardHints` for suit-only cards and real `publicCards` once the smoke clears.
