# Inheritance

Status: PASS

Mode id: `inheritance`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed deal choice, preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed deal choice, preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Alpha flipped Bravo's offline hand and the table completed reveal.

## Observations

- Deal-choice prompt presented `Keep one, inherit one`, required exactly one selected card, and locked with an `Inherit` button.
- 2-player inheritance behaved as keep-one plus exchanged discard:
  - Alpha kept `AD` from `8D AD`.
  - Bravo kept `10D` from `10D 8C`.
  - Preflop showed Alpha with `AD 8C` and Bravo with `10D 8D`.
- 3-player inheritance behaved as a simultaneous discard ring:
  - Alpha kept `8D` from `4D 8D`.
  - Bravo kept `QC` from `QC 2S`.
  - Charlie kept `QH` from `QH JS`.
  - Preflop showed Alpha with `8D JS`, Bravo with `QC 4D`, and Charlie with `QH 2S`.
- Standard high-hand scoring stayed intact after the inheritance phase.
- 2-player reveal result matched the expected true order:
  - Alpha: Two Pair, A's & 4's, ranked #1.
  - Bravo: Two Pair, 10's & 4's, ranked #2.
- 3-player reveal result matched the expected true order:
  - Charlie: Three of a Kind, 2's, ranked #1.
  - Bravo: Pair, 2's, ranked #2 by queen kicker.
  - Alpha: Pair, 2's, ranked #3 by jack kicker.
- Team score was 0 in both runs.

## Screenshots

- `sim/screens/inheritance/deal-choice.png`
- `sim/screens/inheritance/preflop.png`
- `sim/screens/inheritance/flop.png`
- `sim/screens/inheritance/turn.png`
- `sim/screens/inheritance/river.png`
- `sim/screens/inheritance/reveal.png`
- `sim/screens/inheritance/reveal-results.png`
- `sim/screens/inheritance/larger-deal-choice.png`
- `sim/screens/inheritance/larger-preflop.png`
- `sim/screens/inheritance/larger-flop.png`
- `sim/screens/inheritance/larger-turn.png`
- `sim/screens/inheritance/larger-river.png`
- `sim/screens/inheritance/larger-reveal.png`
- `sim/screens/inheritance/larger-reveal-bravo-offline.png`
- `sim/screens/inheritance/larger-reveal-results.png`

## Engine Extensions Touched

- Extended extension #1: deal-choice now supports inheritance passes.
- Added `dealChoice.inheritance` mode configuration.
- Added `DealChoiceProgress.inheritance` so the deal-choice prompt can render inheritance-specific copy.
- Added the inheritance resolution branch that keeps each selected card and fills the second hole card from the right neighbor's discarded card.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
