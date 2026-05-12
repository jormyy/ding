# Hint Card

Hint Card is a high-hand information variant. At turn, one deck card is briefly shown.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `modeInfo` with `hint-card` during the turn phase.
- The hint reads from `dealDeck[0]` and is not added to scoring.
