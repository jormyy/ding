# Twin Suits

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `twin-suits`

## What Changed

- Added `suitTransform: "color"` scoring support.
- Added the `twin-suits` mode definition and README.

## Evidence

- Unit coverage proves red cards can evaluate as a shared flush suit.

## Deferred Smoke

- Include in the suit-identity browser smoke batch.
