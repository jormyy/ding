# Royal Spark

Mode 22 validation completed 2026-05-12.

## Result

Pass. Royal Spark deals only high-rank hole cards (8 through A), preserves the normal Ding ranking/trading/reveal loop, and completes reveal at both minimum and larger table sizes.

## Engine Changes

- Added `highRanks` constrained deal support.
- Added `royal-spark` mode definition.
- Capped constrained hand capacity at 28 high-rank cards so lobby hand-count options stay dealable.

## Minimum Playthrough

- Room: `G3ZXKL`
- Players: Alpha, Bravo
- Hands: 2 per player, 4 total
- Alpha: `9H TS`, `JD AH`
- Bravo: `AD KH`, `8H TD`
- Board: `5S 3C 2S 4D 6D`
- Reveal: all hands made `Straight, 6 High`; score displayed as `0`, with inversion history logged.

Screenshots:

- `sim/screens/royal-spark/preflop.png`
- `sim/screens/royal-spark/flop.png`
- `sim/screens/royal-spark/turn.png`
- `sim/screens/royal-spark/river.png`
- `sim/screens/royal-spark/reveal.png`
- `sim/screens/royal-spark/reveal-results.png`

## Larger Playthrough

- Room: `NRW35K`
- Players: Alpha, Bravo, Charlie
- Hands: 2 per player, 6 total
- Alpha: `JS 8H`, `9C 8C`
- Bravo: `QH 8D`, `QC KD`
- Charlie: `JD TC`, `9S JC`
- Board: `7C 4D 5H 6H 4C`
- Reveal: true ordering showed Alpha #2 as `Straight, 9 High`, Alpha #1 and Bravo #1 as `Straight, 8 High`, then the pair-of-4 hands; final score displayed as `2 inversions`.
- Offline reveal check: Charlie was closed during reveal. Alpha flipped Charlie's remaining hands while Charlie was marked `OFFLINE`, and the room completed reveal normally.
- Lobby capacity check: for 3 players, hand counts 5 and 6 were disabled, consistent with the 28-card high-rank constraint.

Screenshots:

- `sim/screens/royal-spark/larger-preflop.png`
- `sim/screens/royal-spark/larger-flop.png`
- `sim/screens/royal-spark/larger-turn.png`
- `sim/screens/royal-spark/larger-river.png`
- `sim/screens/royal-spark/larger-reveal.png`
- `sim/screens/royal-spark/larger-reveal-charlie-offline.png`
- `sim/screens/royal-spark/larger-reveal-results.png`

## Notes

- No bots were seated.
- No browser errors were reported in the active Ding sessions.
