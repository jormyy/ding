# Pick 3 of 7

Status: PASS

Mode id: `pick-3-of-7`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed deal choice, preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed deal choice, preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Alpha flipped Bravo's offline hand and the table completed reveal.

## Observations

- Deal-choice prompt presented seven private candidate cards per hand and required exactly three selections before preflop.
- Kept cards were trimmed correctly before ranking started.
- Standard high-hand scoring stayed intact after the choice phase.
- 2-player reveal result matched the expected true order:
  - Alpha: Full House, 8's over J's, ranked #1.
  - Bravo: Two Pair, Q's & J's, ranked #2.
- 3-player reveal result matched the expected true order:
  - Alpha: Flush, Ah High, ranked #1.
  - Charlie: Flush, Kh High, ranked #2.
  - Bravo: Pair, 3's, ranked #3.
- Team score was 0 in both runs.

## Screenshots

- `sim/screens/pick-3-of-7/deal-choice.png`
- `sim/screens/pick-3-of-7/preflop.png`
- `sim/screens/pick-3-of-7/flop.png`
- `sim/screens/pick-3-of-7/turn.png`
- `sim/screens/pick-3-of-7/river.png`
- `sim/screens/pick-3-of-7/reveal.png`
- `sim/screens/pick-3-of-7/reveal-results.png`
- `sim/screens/pick-3-of-7/larger-deal-choice.png`
- `sim/screens/pick-3-of-7/larger-preflop.png`
- `sim/screens/pick-3-of-7/larger-flop.png`
- `sim/screens/pick-3-of-7/larger-turn.png`
- `sim/screens/pick-3-of-7/larger-river.png`
- `sim/screens/pick-3-of-7/larger-reveal.png`
- `sim/screens/pick-3-of-7/larger-reveal-bravo-offline.png`
- `sim/screens/pick-3-of-7/larger-reveal-results.png`

## Engine Extensions Touched

- Reuses extension #1: `dealChoice`.
- No new architecture extension was required for this mode.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
