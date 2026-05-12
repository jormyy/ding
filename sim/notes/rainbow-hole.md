# Rainbow Hole

Status: PASS

Mode id: `rainbow-hole`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Alpha flipped Bravo's offline hand and the table completed reveal.

## Observations

- Rainbow Hole deals every two-card hand with different suits.
- 2-player deal:
  - Alpha: `QC 7H`.
  - Bravo: `10H 3C`.
- 2-player reveal result matched the expected true order:
  - Alpha: Three of a Kind, Q's, ranked #1.
  - Bravo: Pair, Q's, ranked #2.
  - Team score was 0.
- 3-player deal:
  - Alpha: `JH 4D`.
  - Bravo: `2H 6C`.
  - Charlie: `2S JC`.
- 3-player reveal result matched the expected true order:
  - Alpha: Pair, 4's, ranked #1.
  - Charlie: A High, ranked #2.
  - Bravo: A High, ranked #3.
  - Team score was 0.

## Screenshots

- `sim/screens/rainbow-hole/preflop.png`
- `sim/screens/rainbow-hole/flop.png`
- `sim/screens/rainbow-hole/turn.png`
- `sim/screens/rainbow-hole/river.png`
- `sim/screens/rainbow-hole/reveal.png`
- `sim/screens/rainbow-hole/reveal-results.png`
- `sim/screens/rainbow-hole/larger-preflop.png`
- `sim/screens/rainbow-hole/larger-flop.png`
- `sim/screens/rainbow-hole/larger-turn.png`
- `sim/screens/rainbow-hole/larger-river.png`
- `sim/screens/rainbow-hole/larger-reveal.png`
- `sim/screens/rainbow-hole/larger-reveal-bravo-offline.png`
- `sim/screens/rainbow-hole/larger-reveal-results.png`

## Engine Extensions Touched

- Extended constrained-deal support with `deal.constraint: "differentSuits"`.
- Added `rainbow-hole` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
