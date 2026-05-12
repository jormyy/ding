# Burn Reveal

Burn Reveal is a high-hand information variant. Burn cards are public.

## Engine Notes

- `dealCardsForMode()` now records burn cards in the deal result.
- Server state stores `burnCards`.
- Uses `modeInfo` with `burn-reveal` to expose the burn-card list.
