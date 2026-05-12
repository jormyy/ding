# Flash Flop

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `flash-flop`

## What Changed

- Added `src/modes/flash-flop/README.md`.

## Evidence

- Existing mode definition uses `communityCards: 5`.
- Existing reveal schedule shows three community cards already visible at preflop.
- Existing unit coverage asserts `visibleCommunityCardCount("flash-flop", "preflop") === 3`.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
