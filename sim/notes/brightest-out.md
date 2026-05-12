# Brightest Out

Mode 29 validation status: PASS.

## Implementation

- Added `publicCardSelection` to `GameModeDealRule`.
- Added deal-engine support for selecting public cards by `first`, `highest`, or `lowest` without reordering the hand's true cards.
- Added `brightest-out` to `GAME_MODE_DEFINITIONS` with `publicCards: 1` and `publicCardSelection: "highest"`.
- Added unit coverage proving the selected public card is the highest hole card.
- Added `src/modes/brightest-out/README.md`.

## Browser Playthroughs

### Minimum Table

- Room: `EGLSQL`
- Players: Alpha, Bravo
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo's `K♥` as the only public hole card; Bravo's owner view confirmed the hidden card was `4♣`, so the exposed card was the highest. Bravo saw Alpha's `J♥`; Alpha's owner view confirmed the hidden card was `7♠`.
- Reveal: exact hidden cards appeared only when each hand flipped.
- Made hands: Bravo `A High`, Alpha `A High`; Bravo ranked first on kicker.

Screenshots:

- `sim/screens/brightest-out/preflop.png`
- `sim/screens/brightest-out/flop.png`
- `sim/screens/brightest-out/turn.png`
- `sim/screens/brightest-out/river.png`
- `sim/screens/brightest-out/reveal.png`
- `sim/screens/brightest-out/reveal-results.png`

### Larger Table

- Room: `HREAYA`
- Players: Alpha, Bravo, Charlie
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo's `10♠` and Charlie's `A♥`; owner views confirmed Bravo held `10♠ 10♦` and Charlie held `A♥ K♦`. Bravo and Charlie saw Alpha's `4♠`, with Alpha holding `4♠ 4♦`.
- Offline reveal: Alpha disconnected at reveal while Alpha was the current worst-ranked flip target. Bravo received `Flip the next hand` and flipped Alpha's offline hand successfully.
- Made hands: Charlie `Two Pair, A's & K's`, Bravo `Pair, 10's`, Alpha `Pair, 4's`.

Screenshots:

- `sim/screens/brightest-out/larger-preflop.png`
- `sim/screens/brightest-out/larger-flop.png`
- `sim/screens/brightest-out/larger-turn.png`
- `sim/screens/brightest-out/larger-river.png`
- `sim/screens/brightest-out/larger-reveal.png`
- `sim/screens/brightest-out/larger-reveal-alpha-offline.png`
- `sim/screens/brightest-out/larger-reveal-results.png`

## Notes

- No bot seats were used.
- No chaos events apply to this mode.
