# Trade-Up

Status: PASS

Mode id: `trade-up`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed deal choice, preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed deal choice, preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Alpha flipped Bravo's offline hand and the table completed reveal.

## Observations

- Deal-choice prompt presented `Trade one card left`, required exactly one selected card, and locked with a `Trade` button.
- 2-player pass behaved as a one-card swap:
  - Alpha selected `5C` from `QC 5C`.
  - Bravo selected `10C` from `10C 10H`.
  - Preflop showed Alpha with `QC 10C` and Bravo with `5C 10H`.
- 3-player pass behaved as a simultaneous ring:
  - Alpha selected `10C` from `10C AS`.
  - Bravo selected `6S` from `6S 9C`.
  - Charlie selected `10D` from `10D 7C`.
  - Preflop showed Alpha with `10D AS`, Bravo with `10C 9C`, and Charlie with `6S 7C`.
- Standard high-hand scoring stayed intact after the trade-up phase.
- 2-player reveal result matched the expected true order:
  - Alpha: Two Pair, Q's & 10's, ranked #1.
  - Bravo: Pair, 10's, ranked #2.
- 3-player reveal result matched the expected true order:
  - Alpha: Pair, 10's, ranked #1 by ace kicker.
  - Bravo: Pair, 10's, ranked #2 by lower kicker.
  - Charlie: Pair, 6's, ranked #3.
- Team score was 0 in both runs.

## Screenshots

- `sim/screens/trade-up/deal-choice.png`
- `sim/screens/trade-up/preflop.png`
- `sim/screens/trade-up/flop.png`
- `sim/screens/trade-up/turn.png`
- `sim/screens/trade-up/river.png`
- `sim/screens/trade-up/reveal.png`
- `sim/screens/trade-up/reveal-results.png`
- `sim/screens/trade-up/larger-deal-choice.png`
- `sim/screens/trade-up/larger-preflop.png`
- `sim/screens/trade-up/larger-flop.png`
- `sim/screens/trade-up/larger-turn.png`
- `sim/screens/trade-up/larger-river.png`
- `sim/screens/trade-up/larger-reveal.png`
- `sim/screens/trade-up/larger-reveal-bravo-offline.png`
- `sim/screens/trade-up/larger-reveal-results.png`

## Engine Extensions Touched

- Extended extension #1: deal-choice now supports simultaneous trade-up passes.
- Added `dealChoice.tradeUp` mode configuration.
- Added `DealChoiceProgress.tradeUp` so the deal-choice prompt can render trade-specific copy.
- Added the trade-up resolution branch that passes selected card slots around the table by hand index.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
