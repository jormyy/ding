# Big Sky

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `big-sky`

## What Changed

- Added `src/modes/big-sky/README.md`.

## Evidence

- Existing mode definition uses `communityCards: 7`.
- Existing reveal schedule shows 4 cards on flop, 5 on turn, and all 7 on river/reveal.
- Unit coverage asserts the river-visible count is 7.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
