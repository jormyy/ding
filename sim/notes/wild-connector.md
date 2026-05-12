# Wild Connector

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `wild-connector`

## What Changed

- Added `syntheticPair: "adjacent"` scoring support.
- Added the `wild-connector` mode definition and README.

## Evidence

- Unit coverage proves a connected hand gains enough synthetic pair strength to outrank its comparator.

## Deferred Smoke

- Include in the card-identity browser smoke batch.
