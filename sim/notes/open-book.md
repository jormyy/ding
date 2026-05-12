# Open Book

Mode 24 validation completed 2026-05-12.

## Result

Pass. Open Book exposes both hole cards for every opponent hand from preflop onward, preserves the normal ranking/trading/reveal loop, and completes reveal at both minimum and larger table sizes.

## Engine Changes

- No engine change was required; this mode already uses `publicCards: 2`.
- Added the per-mode README artifact.

## Minimum Playthrough

- Room: `PS4TCB`
- Players: Alpha, Bravo
- Hands: 2 per player, 4 total
- Alpha full hands: `9C 9S`, `3D 9H`
- Bravo full hands: `2S 4D`, `9D QD`
- Board: `QH 7C 3H 6D JS`
- Visibility check:
  - Alpha saw both cards of both Bravo hands from preflop.
  - Bravo saw both cards of both Alpha hands from preflop.
- Reveal: Bravo #2 made `Pair, Q's`, Alpha #1 `Pair, 9's`, Alpha #2 `Pair, 3's`, Bravo #1 `Q High`; score displayed as `0`.

Screenshots:

- `sim/screens/open-book/preflop.png`
- `sim/screens/open-book/flop.png`
- `sim/screens/open-book/turn.png`
- `sim/screens/open-book/river.png`
- `sim/screens/open-book/reveal.png`
- `sim/screens/open-book/reveal-results.png`

## Larger Playthrough

- Room: `RZP9XM`
- Players: Alpha, Bravo, Charlie
- Hands: 2 per player, 6 total
- Alpha full hands: `8S 9H`, `QD JD`
- Bravo full hands: `6H KC`, `KH KS`
- Charlie full hands: `KD 6D`, `6S JH`
- Board: `TC 8H QS 9S 7C`
- Visibility check:
  - All sessions showed both cards of every opponent hand at preflop and through the streets.
  - Owner views continued to show both own cards.
- Reveal: Alpha #2 and Charlie #2 made `Straight, Q High`; Bravo #1 and Charlie #1 made `Straight, 10 High`; Alpha #1 made `Two Pair, 9's & 8's`; Bravo #2 made `Pair, K's`; score displayed as `0`.
- Offline reveal check: Bravo was closed during reveal. Alpha flipped Bravo's offline hands while Bravo was marked `OFFLINE`, and the room completed reveal normally.

Screenshots:

- `sim/screens/open-book/larger-preflop.png`
- `sim/screens/open-book/larger-flop.png`
- `sim/screens/open-book/larger-turn.png`
- `sim/screens/open-book/larger-river.png`
- `sim/screens/open-book/larger-reveal.png`
- `sim/screens/open-book/larger-reveal-bravo-offline.png`
- `sim/screens/open-book/larger-reveal-results.png`

## Notes

- No bots were seated.
- No browser errors were reported in the active Ding sessions.
