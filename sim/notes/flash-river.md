# Flash River

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `flash-river`

## What Changed

- Added the `flash-river` mode definition.
- Added `src/modes/flash-river/README.md`.
- Added unit coverage for full-board preflop visibility.

## Evidence

- Mode definition uses `communityCards: 5`.
- Reveal schedule shows all 5 community cards starting at preflop.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
