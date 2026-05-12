# Tower

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `tower`

## What Changed

- Added the `tower` mode definition.
- Added `src/modes/tower/README.md`.
- Added unit coverage for the 3 / 3 / 5 reveal schedule.

## Evidence

- Mode definition uses `communityCards: 5`.
- Reveal schedule keeps 3 community cards visible through turn and reveals all 5 at river.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
