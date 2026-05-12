# Double Deck

Status: STATIC PASS with duplicate-normalization caveat; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `double-deck`

## What Changed

- Added `deck: "double"` and the `double-deck` mode definition.
- Added duplicate-card normalization in the Ding evaluator so `pokersolver` can solve duplicate-deck hands.
- Added README documentation.

## Evidence

- Unit coverage proves the deck has 104 cards and duplicate identities no longer crash showdown.

## Deferred Smoke

- Include in the deck-mode browser smoke batch.
