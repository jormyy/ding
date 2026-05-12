# Blackout

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `blackout`

## What Changed

- Added `src/modes/blackout/README.md`.

## Evidence

- Existing mode definition uses `communityCards: 5`.
- Existing reveal schedule keeps community cards hidden through turn and reveals all 5 at river.
- Existing unit coverage asserts `visibleCommunityCardCount("blackout", "turn") === 0`.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
