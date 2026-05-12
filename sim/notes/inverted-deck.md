# Inverted Deck

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `inverted-deck`

## What Changed

- Added `rankTransform: "inverted"` support for showdown evaluation.
- Added the `inverted-deck` mode definition.
- Added README documentation.

## Evidence

- Unit coverage proves a hand containing a two outranks an ace-high comparator under inverted evaluation.

## Deferred Smoke

- Include in the deck/rank-identity browser smoke batch.
