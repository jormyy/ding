# Mini Board

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `mini-board`

## What Changed

- Added the `mini-board` mode definition.
- Added `src/modes/mini-board/README.md`.
- Added unit coverage for the 4-card board schedule.

## Evidence

- Mode definition uses `communityCards: 4`.
- Reveal schedule shows 3 cards on flop and all 4 from turn through reveal.
- Unit coverage asserts turn and river visible counts are 4.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
