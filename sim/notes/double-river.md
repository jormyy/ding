# Double River

Status: STATIC PASS; browser smoke partially completed before accelerated loop pivot.
Date: 2026-05-12
Mode: `double-river`

## What Changed

- Added `src/modes/double-river/README.md`.
- Added unit coverage for the six-card river schedule.

## Evidence

- Existing mode definition uses `communityCards: 6`.
- Existing reveal schedule shows 3 cards on flop, 4 on turn, and all 6 on river/reveal.
- Unit coverage asserts `visibleCommunityCardCount("double-river", "turn") === 4` and river is 6.
- Browser room `NUSFPV` completed a 2-player preflop -> flop -> turn -> river -> reveal run with score 0.
- 3-player browser room `GLWNX3` reached turn before the validation strategy was changed to chunk-level smoke.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
