# Look-Then-Choose

Status: PASS

Mode id: `look-then-choose`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed deal choice, preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed deal choice, preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Alpha flipped Bravo's offline hand and the table completed reveal.

## Observations

- Deal-choice prompt showed three private candidate cards and required exactly two selected cards before locking.
- 2-player selection:
  - Alpha kept `3D AC` from `3D AC 2H`.
  - Bravo kept `AS KS` from `AS 5C KS`.
  - Preflop showed only the selected two-card hands.
- 3-player selection:
  - Alpha kept `8C 8H` from `8C 8H 4D`.
  - Bravo kept `3D 3C` from `3D 3C AC`.
  - Charlie kept `10S KS` from `10S KS 8S`.
  - Preflop showed only the selected two-card hands.
- Standard high-hand scoring stayed intact after the look-then-choose phase.
- 2-player reveal result matched the expected true order:
  - Alpha: Pair, 3's, ranked #1.
  - Bravo: A High, ranked #2.
- 3-player reveal result matched the expected true order:
  - Charlie: Pair, K's, ranked #1.
  - Alpha: Pair, 8's, ranked #2.
  - Bravo: Pair, 3's, ranked #3.
- Team score was 0 in both runs.

## Screenshots

- `sim/screens/look-then-choose/deal-choice.png`
- `sim/screens/look-then-choose/preflop.png`
- `sim/screens/look-then-choose/flop.png`
- `sim/screens/look-then-choose/turn.png`
- `sim/screens/look-then-choose/river.png`
- `sim/screens/look-then-choose/reveal.png`
- `sim/screens/look-then-choose/reveal-results.png`
- `sim/screens/look-then-choose/larger-deal-choice.png`
- `sim/screens/look-then-choose/larger-preflop.png`
- `sim/screens/look-then-choose/larger-flop.png`
- `sim/screens/look-then-choose/larger-turn.png`
- `sim/screens/look-then-choose/larger-river.png`
- `sim/screens/look-then-choose/larger-reveal.png`
- `sim/screens/look-then-choose/larger-reveal-bravo-offline.png`
- `sim/screens/look-then-choose/larger-reveal-results.png`

## Engine Extensions Touched

- Reused extension #1: deal-choice with three private candidates and two selected keep cards.
- Added `look-then-choose` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
