# Pick 2 of 5

Status: PASS

Mode id: `pick-2-of-5`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed deal choice, preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed deal choice, preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Alpha flipped Bravo's offline hand and the table completed reveal.

## Observations

- Deal-choice prompt presented five private candidate cards per hand and required exactly two selections before preflop.
- Kept cards were trimmed correctly before ranking started.
- Standard high-hand scoring stayed intact after the choice phase.
- 3-player reveal result matched the expected true order:
  - Alpha: Four of a Kind, J's, ranked #1.
  - Bravo: Two Pair, K's & J's, ranked #2.
  - Charlie: Two Pair, Q's & J's, ranked #3.
- Team score was 0 with a perfect ranking.

## Screenshots

- `sim/screens/pick-2-of-5/deal-choice.png`
- `sim/screens/pick-2-of-5/preflop.png`
- `sim/screens/pick-2-of-5/flop.png`
- `sim/screens/pick-2-of-5/turn.png`
- `sim/screens/pick-2-of-5/river.png`
- `sim/screens/pick-2-of-5/reveal.png`
- `sim/screens/pick-2-of-5/reveal-results.png`
- `sim/screens/pick-2-of-5/larger-deal-choice.png`
- `sim/screens/pick-2-of-5/larger-preflop.png`
- `sim/screens/pick-2-of-5/larger-flop.png`
- `sim/screens/pick-2-of-5/larger-turn.png`
- `sim/screens/pick-2-of-5/larger-river.png`
- `sim/screens/pick-2-of-5/larger-reveal.png`
- `sim/screens/pick-2-of-5/larger-reveal-bravo-offline.png`
- `sim/screens/pick-2-of-5/larger-reveal-results.png`

## Engine Extensions Touched

- Reuses extension #1: `dealChoice`.
- No new architecture extension was required for this mode.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
