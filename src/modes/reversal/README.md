# Reversal

Reversal is a high-hand board-event variant. When the river phase begins, the community board reverses in place.

## Engine Notes

- Uses standard two-hole, five-board dealing and high-hand scoring.
- Uses `phaseEffects.river = ["reverseCommunity"]`.
- The same card identities remain in play, but their order flips before the river broadcast.
