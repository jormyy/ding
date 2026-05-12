# Cell Division

Cell Division is a high-hand structural event. At reveal, every two-card hand splits into two one-card hands.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.reveal = ["splitHandsAtReveal"]`.
- The effect also expands the ranking array so reveal can proceed without a stalled slot count.
