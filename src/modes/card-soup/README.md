# Card Soup

Card Soup is a high-hand redraw event. At turn, hole cards mix with the burn pile and redraw.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["mixHolesWithBurn"]`.
- The mix is deterministic for repeatable tests.
