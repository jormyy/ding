# Mirror Board

Status: STATIC PASS with evaluator limitation documented; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `mirror-board`

## What Changed

- Added the server-side `mirrorCommunity` phase effect.
- Added ten-card river/reveal board display support for a five-card base board.
- Added `scoreCommunityCards` so duplicate display slots do not crash `pokersolver`.
- Added the `mirror-board` mode definition and README.

## Evidence

- Unit coverage advances turn to river and proves the board duplicates to ten displayed cards.
- Full lifecycle coverage passes with scoring constrained to the canonical first five cards.

## Deferred Smoke

- Include in the next parallel board-chaos smoke batch.
