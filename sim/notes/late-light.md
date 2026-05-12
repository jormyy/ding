# Late Light

Mode 25 validation status: PASS.

## Implementation

- Added `late-light` to `GAME_MODE_DEFINITIONS`.
- Added phase-gated hole-card visibility through `deal.visibleHoleCards`.
- Server masking now derives dynamic `publicCards` at broadcast time, so opponent cards stay private through turn and become public at river.
- Added `src/modes/late-light/README.md`.

## Browser Playthroughs

### Minimum Table

- Room: `K9ZTL8`
- Players: Alpha, Bravo
- Result: score `0`, Perfect.
- Visibility: Alpha saw Bravo hidden through preflop/flop/turn; at river Bravo's `10H 6S` appeared before reveal.
- Reveal: worst-first flips completed normally.
- Made hands: Bravo `K High`, Alpha `K High`; kicker ordering put Bravo first.

Screenshots:

- `sim/screens/late-light/preflop.png`
- `sim/screens/late-light/flop.png`
- `sim/screens/late-light/turn.png`
- `sim/screens/late-light/river.png`
- `sim/screens/late-light/reveal.png`
- `sim/screens/late-light/reveal-results.png`

### Larger Table

- Room: `2ZHYD8`
- Players: Alpha, Bravo, Charlie
- Result: score `0`, Perfect.
- Visibility: opponent cards stayed hidden through turn; at river both Bravo and Charlie hole cards were public in Alpha's view.
- Offline reveal: Bravo disconnected at reveal while Bravo was the current worst-ranked flip target. Alpha received `Flip the next hand` and flipped Bravo's offline hand successfully.
- Made hands: Alpha `Pair, 7's`, Charlie `A High`, Bravo `Q High`.

Screenshots:

- `sim/screens/late-light/larger-preflop.png`
- `sim/screens/late-light/larger-flop.png`
- `sim/screens/late-light/larger-turn.png`
- `sim/screens/late-light/larger-river.png`
- `sim/screens/late-light/larger-reveal.png`
- `sim/screens/late-light/larger-reveal-bravo-offline.png`
- `sim/screens/late-light/larger-reveal-results.png`

## Notes

- No bot seats were used.
- No visual issues observed.
- No chaos events apply to this mode.
