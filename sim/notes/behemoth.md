# Behemoth

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `behemoth`

## What Changed

- Added the `behemoth` mode definition.
- Added `src/modes/behemoth/README.md`.
- Added unit coverage for the 9-card board schedule.

## Evidence

- Mode definition uses `communityCards: 9`.
- Reveal schedule shows 3 cards on flop, 4 on turn, and all 9 on river/reveal.
- Unit coverage asserts turn visible count is 4 and river visible count is 9.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
