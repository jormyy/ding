# One Up

Mode 23 validation completed 2026-05-12.

## Result

Pass. One Up exposes exactly one public hole card per opponent hand from preflop through river, keeps the second opponent hole card hidden until that hand flips during reveal, and completes the normal Ding ranking/reveal/scoring loop at both minimum and larger table sizes.

## Engine Changes

- No engine change was required; this mode already uses `publicCards: 1`.
- Added the per-mode README artifact.

## Minimum Playthrough

- Room: `GFFGEL`
- Players: Alpha, Bravo
- Hands: 2 per player, 4 total
- Alpha full hands: `KD 3H`, `JD QH`
- Bravo full hands: `7H TD`, `5S 3C`
- Board: `TC 8C JC 9S AH`
- Visibility check:
  - Alpha saw only Bravo's public `7H` and `5S` before reveal.
  - Bravo saw only Alpha's public `KD` and `JD` before reveal.
  - Hidden second cards appeared only as each hand flipped.
- Reveal: `Straight, Q High`, `Straight, J High`, then two `A High` hands; score displayed as `0`.

Screenshots:

- `sim/screens/one-up/preflop.png`
- `sim/screens/one-up/flop.png`
- `sim/screens/one-up/turn.png`
- `sim/screens/one-up/river.png`
- `sim/screens/one-up/reveal.png`
- `sim/screens/one-up/reveal-results.png`

## Larger Playthrough

- Room: `JSQB6L`
- Players: Alpha, Bravo, Charlie
- Hands: 2 per player, 6 total
- Alpha full hands: `5H 9D`, `9H 6C`
- Bravo full hands: `TS TD`, `5D 2D`
- Charlie full hands: `2C AC`, `3D KC`
- Board: `8S JC QH 7D 4C`
- Visibility check:
  - Opponent hands showed one public hole card plus one hidden card until reveal.
  - Owner views continued to show both own hole cards.
- Reveal: Bravo #1 made `Pair, 10's`; Charlie #1 `A High`; Charlie #2 `K High`; Alpha's two hands and Bravo #2 were `Q High`; score displayed as `0`.
- Offline reveal check: Bravo was closed during reveal. Alpha flipped Bravo's offline hands while Bravo was marked `OFFLINE`, and the room completed reveal normally.

Screenshots:

- `sim/screens/one-up/larger-preflop.png`
- `sim/screens/one-up/larger-flop.png`
- `sim/screens/one-up/larger-turn.png`
- `sim/screens/one-up/larger-river.png`
- `sim/screens/one-up/larger-reveal.png`
- `sim/screens/one-up/larger-reveal-bravo-offline.png`
- `sim/screens/one-up/larger-reveal-results.png`

## Notes

- No bots were seated.
- No browser errors were reported in the active Ding sessions.
