# Pinochle

Status: STATIC PASS with duplicate-normalization caveat; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `pinochle`

## What Changed

- Added `deck: "pinochle"` and the `pinochle` mode definition.
- Reuses duplicate-card normalization in the Ding evaluator.
- Added README documentation.

## Evidence

- Unit coverage proves the deck has 48 cards and every card is rank 9 or higher.

## Deferred Smoke

- Include in the deck-mode browser smoke batch.
