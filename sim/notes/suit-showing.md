# Suit Showing

Mode 26 validation status: PASS.

## Implementation

- Added `suit-showing` to `GAME_MODE_DEFINITIONS`.
- Added `DisplayedCard` / `publicCardHints` as the display-layer primitive for partial card identities.
- Added `visibleHoleCardDetail: "suit"` so the server can show hole-card suits without leaking ranks.
- Updated `CardFace` and `SeatHand` to render partial card faces as `?` rank markers plus the visible suit.
- Added `src/modes/suit-showing/README.md`.

## Browser Playthroughs

### Minimum Table

- Room: `B7WQY4`
- Players: Alpha, Bravo
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo's holes as two `?` rank cards with spade suits through preflop, flop, turn, and river. Bravo saw Alpha's hearts/spades only.
- Reveal: true ranks appeared only when hands flipped.
- Made hands: Alpha `Two Pair, K's & 2's`, Bravo `Pair, 2's`.

Screenshots:

- `sim/screens/suit-showing/preflop.png`
- `sim/screens/suit-showing/flop.png`
- `sim/screens/suit-showing/turn.png`
- `sim/screens/suit-showing/river.png`
- `sim/screens/suit-showing/reveal.png`
- `sim/screens/suit-showing/reveal-results.png`

### Larger Table

- Room: `5DDY3G`
- Players: Alpha, Bravo, Charlie
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo as spade/heart suit hints and Charlie as club/spade suit hints, with ranks hidden through river.
- Offline reveal: Charlie disconnected at reveal while Charlie was the current worst-ranked flip target. Alpha received `Flip the next hand` and flipped Charlie's offline hand successfully.
- Made hands: Alpha `Two Pair, Q's & 2's`, Bravo `Pair, 2's`, Charlie `Pair, 2's`.

Screenshots:

- `sim/screens/suit-showing/larger-preflop.png`
- `sim/screens/suit-showing/larger-flop.png`
- `sim/screens/suit-showing/larger-turn.png`
- `sim/screens/suit-showing/larger-river.png`
- `sim/screens/suit-showing/larger-reveal.png`
- `sim/screens/suit-showing/larger-reveal-charlie-offline.png`
- `sim/screens/suit-showing/larger-reveal-results.png`

## Notes

- No bot seats were used.
- No chaos events apply to this mode.
- One two-player river ranking attempt briefly produced an acquire request when both sessions touched the same rank slot; rejecting the request and placing the hand from its owner session cleared it. No mode bug observed.
