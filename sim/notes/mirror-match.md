# Mirror Match

Status: PASS

Mode id: `mirror-match`

Validation date: 2026-05-12

## Coverage

- 2-player minimum run completed preflop, flop, turn, river, reveal, and results.
- 3-player larger run completed preflop, flop, turn, river, reveal, and results.
- Disconnected-owner reveal path verified by closing Bravo during reveal; Alpha flipped Bravo's offline hand and the table completed reveal.

## Observations

- Mirror Match deals every hand with the same first hole card. The shared anchor is removed from the deck before the board is dealt.
- 2-player deal:
  - Alpha: `8S 2H`.
  - Bravo: `8S AS`.
- 2-player reveal result reflected normal high-hand scoring:
  - Alpha: Two Pair, 9's & 2's, true #1.
  - Bravo: Pair, 9's, true #2.
  - Team score was 0.
- 3-player deal:
  - Alpha: `10C QC`.
  - Bravo: `10C 4H`.
  - Charlie: `10C AD`.
- 3-player reveal result reflected the shared-card flush possibility:
  - Alpha: Flush, Ac High, true #1.
  - Charlie: Pair, A's, true #2.
  - Bravo: Pair, 4's, true #3.
  - Team score was 1 because the table ranked Charlie over Alpha through the streets; the inversion count and delta display were correct.

## Screenshots

- `sim/screens/mirror-match/preflop.png`
- `sim/screens/mirror-match/flop.png`
- `sim/screens/mirror-match/turn.png`
- `sim/screens/mirror-match/river.png`
- `sim/screens/mirror-match/reveal.png`
- `sim/screens/mirror-match/reveal-results.png`
- `sim/screens/mirror-match/larger-preflop.png`
- `sim/screens/mirror-match/larger-flop.png`
- `sim/screens/mirror-match/larger-turn.png`
- `sim/screens/mirror-match/larger-river.png`
- `sim/screens/mirror-match/larger-reveal.png`
- `sim/screens/mirror-match/larger-reveal-bravo-offline.png`
- `sim/screens/mirror-match/larger-reveal-results.png`

## Engine Extensions Touched

- Extended constrained-deal support with `deal.constraint: "sharedFirstCard"`.
- Added `mirror-match` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

- None observed in the 720px-height browser runs.

## Bot Quirks

- None. Validation was human-driven through agent-browser sessions.
