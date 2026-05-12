# Hidden Turn

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `hidden-turn`

## What Changed

- Added the `hidden-turn` mode definition.
- Added `src/modes/hidden-turn/README.md`.
- Added unit coverage for the 3 / 3 / 5 reveal schedule.

## Evidence

- Flop shows three community cards.
- Turn still shows only three community cards.
- River/reveal show all five.

## Deferred Smoke

- Include in the next parallel visibility-mode smoke batch.
