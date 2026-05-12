# Crawl

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `crawl`

## What Changed

- Added the `crawl` mode definition.
- Added `src/modes/crawl/README.md`.
- Added unit coverage for the 1 / 2 / 3 / 5 reveal schedule.

## Evidence

- Mode definition uses `communityCards: 5`.
- Reveal schedule shows 1 card at preflop, 2 at flop, 3 at turn, and all 5 at river.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
