# Confirm Flop

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `confirm-flop`

## What Changed

- Added the `confirm-flop` mode definition.
- Added `src/modes/confirm-flop/README.md`.
- Added unit coverage for the 0 / 4 / 5 reveal schedule.

## Evidence

- Flop shows zero community cards.
- Turn shows four community cards.
- River/reveal show all five.

## Deferred Smoke

- Include in the next parallel visibility-mode smoke batch.
