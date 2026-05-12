# Two-Step River

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `two-step-river`

## What Changed

- Added the `two-step-river` mode definition.
- Added `src/modes/two-step-river/README.md`.
- Added unit coverage for the 3 / 4 / 5 / 6 reveal schedule.

## Evidence

- Mode definition uses `communityCards: 6`.
- River shows five community cards.
- Reveal shows and scores all six community cards.

## Deferred Smoke

- Include in the next parallel visibility-mode smoke batch.
