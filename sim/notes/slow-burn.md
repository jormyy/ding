# Slow Burn

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `slow-burn`

## What Changed

- Added `src/modes/slow-burn/README.md`.

## Evidence

- Existing mode definition uses `communityCards: 5`.
- Existing reveal schedule shows 1 card on flop, 3 on turn, and all 5 at river.
- Covered by the all-modes deal/start/reveal unit path.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
