# Tiny Board

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `tiny-board`

## What Changed

- Added the `tiny-board` mode definition.
- Added `src/modes/tiny-board/README.md`.
- Added unit coverage for the 3-card board schedule.

## Evidence

- Mode definition uses `communityCards: 3`.
- Reveal schedule shows all 3 board cards from flop through reveal.
- Unit coverage asserts flop and river visible counts are 3.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
