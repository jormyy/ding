# Wild Edge

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `wild-edge`

## What Changed

- Added the `wild-edge` mode definition with twos and aces as wild ranks.
- Reuses bounded high-count wild evaluation.
- Added README documentation.

## Evidence

- Unit coverage proves an edge wild hand can outrank a pair comparator.

## Deferred Smoke

- Include in the wild-mode browser smoke batch.
