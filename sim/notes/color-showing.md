# Color Showing

Mode 28 validation status: PASS.

## Implementation

- Added `color-showing` to `GAME_MODE_DEFINITIONS`.
- Reused the partial-card display layer introduced for `suit-showing` and `rank-showing`.
- Added `visibleHoleCardDetail: "color"` so the server can show red/black hole-card color without leaking ranks or exact suits.
- Added masking/helper coverage for color-only `publicCardHints`.
- Added `src/modes/color-showing/README.md`.

## Browser Playthroughs

### Minimum Table

- Room: `XVVM8L`
- Players: Alpha, Bravo
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo's holes as two `?` rank cards with red/black dot markers through preflop, flop, turn, river, and pre-flip reveal. Bravo saw Alpha's colors with ranks and suits hidden on the same streets.
- Reveal: exact ranks and suits appeared only when each hand flipped.
- Made hands: Alpha `Two Pair, K's & 7's`, Bravo `Pair, K's`.

Screenshots:

- `sim/screens/color-showing/preflop.png`
- `sim/screens/color-showing/flop.png`
- `sim/screens/color-showing/turn.png`
- `sim/screens/color-showing/river.png`
- `sim/screens/color-showing/reveal.png`
- `sim/screens/color-showing/reveal-results.png`

### Larger Table

- Room: `63AR8G`
- Players: Alpha, Bravo, Charlie
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo and Charlie as color-only hints from preflop through river; each player saw exact cards only for their own hand until reveal.
- Offline reveal: Charlie disconnected at reveal while Charlie was the current worst-ranked flip target. Alpha received `Flip the next hand` and flipped Charlie's offline hand successfully.
- Made hands: Bravo `Three of a Kind, Q's`, Alpha `Pair, Q's`, Charlie `Q High`.

Screenshots:

- `sim/screens/color-showing/larger-preflop.png`
- `sim/screens/color-showing/larger-flop.png`
- `sim/screens/color-showing/larger-turn.png`
- `sim/screens/color-showing/larger-river.png`
- `sim/screens/color-showing/larger-reveal.png`
- `sim/screens/color-showing/larger-reveal-charlie-offline.png`
- `sim/screens/color-showing/larger-reveal-results.png`

## Notes

- No bot seats were used.
- No chaos events apply to this mode.
