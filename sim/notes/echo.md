# Echo

Status: PASS

Mode id: `echo`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Charlie flipped Bravo's offline hand and the table completed reveal.

## Observations

- Echo deals every hand as a two-card pocket pair: both hole cards share rank and use different suits.
- 2-player deal:
  - Alpha: `6H 6D`.
  - Bravo: `2H 2C`.
- 2-player reveal result matched the expected true order:
  - Alpha: Two Pair, 6's & 4's, ranked #1.
  - Bravo: Two Pair, 4's & 2's, ranked #2.
- 3-player deal:
  - Alpha: `JC JS`.
  - Bravo: `10H 10S`.
  - Charlie: `6C 6H`.
- 3-player reveal result matched the expected true order:
  - Alpha: Two Pair, K's & J's, ranked #1.
  - Bravo: Two Pair, K's & 10's, ranked #2.
  - Charlie: Two Pair, K's & 6's, ranked #3.
- Team score was 0 in both runs.

## Screenshots

- `sim/screens/echo/preflop.png`
- `sim/screens/echo/flop.png`
- `sim/screens/echo/turn.png`
- `sim/screens/echo/river.png`
- `sim/screens/echo/reveal.png`
- `sim/screens/echo/reveal-results.png`
- `sim/screens/echo/larger-preflop.png`
- `sim/screens/echo/larger-flop.png`
- `sim/screens/echo/larger-turn.png`
- `sim/screens/echo/larger-river.png`
- `sim/screens/echo/larger-reveal.png`
- `sim/screens/echo/larger-reveal-bravo-offline.png`
- `sim/screens/echo/larger-reveal-results.png`

## Engine Extensions Touched

- Added constrained-deal support with `deal.constraint: "pocketPair"`.
- Added `echo` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
