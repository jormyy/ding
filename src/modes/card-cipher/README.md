# Card Cipher

Card Cipher is a high-hand rank-encoding event. At river, ranks are shifted by the river card.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.river = ["cipherRanksWithRiver"]`.
- The implementation uses modular rank-index shifting as the playable cipher.
