# Anti-Wild

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `anti-wild`

## What Changed

- Added `excludedRanks` support.
- Added the `anti-wild` mode definition with sevens excluded from scoring.
- Added README documentation.

## Evidence

- Unit coverage proves banned-rank cards are removed before showdown scoring.

## Deferred Smoke

- Include in the wild/rank-mode browser smoke batch.
