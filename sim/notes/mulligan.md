# Mulligan

Status: PASS

Mode id: `mulligan`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed deal choice, mulligan redraw, preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed deal choice, preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Alpha flipped Bravo's offline hand and the table completed reveal.

## Observations

- Deal-choice prompt presented a `Mulligan` action for each hand before locking.
- Alpha spent the redraw in the 2-player run; the hand cards changed from `4S 9H` to `5S 5H`, and the redraw button changed to disabled `Redrawn`.
- The `Keep` action required both current cards to be selected before preflop.
- Standard high-hand scoring stayed intact after the mulligan phase.
- 2-player reveal result matched the expected true order:
  - Alpha: Pair, 5's, ranked #1.
  - Bravo: K High, ranked #2.
- 3-player reveal result matched the expected true order:
  - Charlie: Pair, A's, ranked #1.
  - Alpha: Pair, J's, ranked #2.
  - Bravo: Pair, 2's, ranked #3.
- Team score was 0 in both runs.

## Screenshots

- `sim/screens/mulligan/deal-choice.png`
- `sim/screens/mulligan/mulligan-redraw.png`
- `sim/screens/mulligan/preflop.png`
- `sim/screens/mulligan/flop.png`
- `sim/screens/mulligan/turn.png`
- `sim/screens/mulligan/river.png`
- `sim/screens/mulligan/reveal.png`
- `sim/screens/mulligan/reveal-results.png`
- `sim/screens/mulligan/larger-deal-choice.png`
- `sim/screens/mulligan/larger-preflop.png`
- `sim/screens/mulligan/larger-flop.png`
- `sim/screens/mulligan/larger-turn.png`
- `sim/screens/mulligan/larger-river.png`
- `sim/screens/mulligan/larger-reveal.png`
- `sim/screens/mulligan/larger-reveal-bravo-offline.png`
- `sim/screens/mulligan/larger-reveal-results.png`

## Engine Extensions Touched

- Extended extension #1: deal-choice now supports one-time full-hand redraws.
- Added server-only `dealDeck` state for deal-choice mutations.
- Added `mulliganHand` client message and reducer.
- Tightened mode hand-cap math for mulligan modes so the deck can support every possible redraw.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
