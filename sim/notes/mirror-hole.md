# Mirror Hole

Status: STATIC PASS with display-layer caveat; browser smoke deferred.
Date: 2026-05-12
Mode: `mirror-hole`

## What Changed

- Added the mode definition.
- Added symmetric `modeInfo` for the mirror-hole rule.

## Evidence

- Unit coverage proves the info payload is present.

## Caveat

- Exact per-viewer left-neighbor masking is deferred.
