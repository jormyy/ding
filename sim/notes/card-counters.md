# Card Counters

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `card-counters`

## What Changed

- Added `modeInfo` payload support.
- Added deck-count info generation.
- Added mode definition and README.

## Evidence

- Unit coverage proves client state exposes remaining deck count.

## Deferred Smoke

- Include in the visibility/info browser smoke batch.
