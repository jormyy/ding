# Triple Deck

Status: STATIC PASS with duplicate-normalization caveat; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `triple-deck`

## What Changed

- Added `deck: "triple"` and the `triple-deck` mode definition.
- Reuses duplicate-card normalization in the Ding evaluator.
- Added README documentation.

## Evidence

- Unit coverage proves the deck has 156 cards and all modes complete a server lifecycle.

## Deferred Smoke

- Include in the deck-mode browser smoke batch.
