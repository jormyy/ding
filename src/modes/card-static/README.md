# Card Static

Card Static is a high-hand flicker event. Cards shift rank as the hand progresses.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `staticFlickerFirstCards` at flop, turn, and river.
- The deterministic first-card flicker replaces per-card random 10% flicker in this pass.
