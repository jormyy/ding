# Rank Showing

Mode 27 validation status: PASS.

## Implementation

- Added `rank-showing` to `GAME_MODE_DEFINITIONS`.
- Reused the partial-display layer introduced for `suit-showing`.
- Added `visibleHoleCardDetail: "rank"` so the server exposes hole-card ranks without leaking suits.
- Added masking and helper coverage for rank-only `publicCardHints`.
- Added `src/modes/rank-showing/README.md`.

## Browser Playthroughs

### Minimum Table

- Room: `AGBMBG`
- Players: Alpha, Bravo
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo's holes as rank plus `?` suit through preflop, flop, turn, river, and pre-flip reveal. Bravo saw Alpha's ranks with suits hidden on the same streets.
- Reveal: exact suits appeared only when each hand flipped.
- Made hands: Bravo `Pair, 9's`, Alpha `Pair, 9's`; Bravo ranked first on kicker.

Screenshots:

- `sim/screens/rank-showing/preflop.png`
- `sim/screens/rank-showing/flop.png`
- `sim/screens/rank-showing/turn.png`
- `sim/screens/rank-showing/river.png`
- `sim/screens/rank-showing/reveal.png`
- `sim/screens/rank-showing/reveal-results.png`

### Larger Table

- Room: `5PNK2J`
- Players: Alpha, Bravo, Charlie
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo's `8`/`9` ranks and Charlie's `A`/`5` ranks with suits hidden through river; each player saw exact suits only on their own cards until reveal.
- Offline reveal: Alpha disconnected at reveal while Alpha was the current worst-ranked flip target. Bravo received `Flip the next hand` and flipped Alpha's offline hand successfully.
- Made hands: Charlie, Alpha, and Bravo all showed `Two Pair, K's & 4's`; Charlie ranked first with the ace kicker, while Alpha and Bravo tied below Charlie.

Screenshots:

- `sim/screens/rank-showing/larger-preflop.png`
- `sim/screens/rank-showing/larger-flop.png`
- `sim/screens/rank-showing/larger-turn.png`
- `sim/screens/rank-showing/larger-river.png`
- `sim/screens/rank-showing/larger-reveal.png`
- `sim/screens/rank-showing/larger-reveal-alpha-offline.png`
- `sim/screens/rank-showing/larger-reveal-results.png`

## Notes

- No bot seats were used.
- No chaos events apply to this mode.
- During the minimum-table turn, an accidental opponent slot click created an acquire request. Rejecting it and placing each hand from its owner session cleared the state; no mode defect observed.
