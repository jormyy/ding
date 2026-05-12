# Darkest Out

Status: PASS
Date: 2026-05-12
Mode: `darkest-out`

## What Changed

- Added `Darkest Out` to `GAME_MODE_DEFINITIONS`.
- Reused `publicCardSelection: "lowest"` so each hand exposes its lowest hole card from preflop onward.
- Added a unit test proving the lowest card, not the first dealt card, is selected as public.
- Added `src/modes/darkest-out/README.md`.

## Browser Playthroughs

Minimum room: `JH28VN`

- Players: Alpha, Bravo
- Screenshots:
  - `sim/screens/darkest-out/preflop.png`
  - `sim/screens/darkest-out/flop.png`
  - `sim/screens/darkest-out/turn.png`
  - `sim/screens/darkest-out/river.png`
  - `sim/screens/darkest-out/reveal.png`
  - `sim/screens/darkest-out/reveal-results.png`
- Visibility check:
  - Alpha owned `4C 9C`; Bravo saw only `4C`.
  - Bravo owned `7H JH`; Alpha saw only `7H`.
- Result: score 0. Alpha showed `Pair, 9's`; Bravo showed `Q High`.

Larger room: `AXMRLX`

- Players: Alpha, Bravo, Charlie
- Screenshots:
  - `sim/screens/darkest-out/larger-preflop.png`
  - `sim/screens/darkest-out/larger-flop.png`
  - `sim/screens/darkest-out/larger-turn.png`
  - `sim/screens/darkest-out/larger-river.png`
  - `sim/screens/darkest-out/larger-reveal.png`
  - `sim/screens/darkest-out/larger-reveal-bravo-offline.png`
  - `sim/screens/darkest-out/larger-reveal-results.png`
- Visibility check:
  - Alpha owned `8H JD`; opponents saw only `8H`.
  - Bravo owned `TH 9H`; opponents saw only `9H`.
  - Charlie owned `7H 8D`; opponents saw only `7H`.
- Offline reveal check:
  - Bravo disconnected at reveal while holding the worst-ranked hand.
  - Alpha could flip Bravo's offline hand.
  - Charlie and Alpha then completed reveal normally.
- Result: score 0. Final true order was Alpha `Two Pair, J's & 5's`, Charlie `Two Pair, 7's & 5's`, Bravo `Pair, 5's`.

## Notes

- No bots were seated.
- No mode-specific visual defects observed.
- No new architecture gap found.
