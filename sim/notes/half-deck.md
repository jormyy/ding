# Half Deck

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `half-deck`

## What Changed

- Added `deck: "half"` and the `half-deck` mode definition.
- The deck factory samples a random 26-card subset before the normal lobby shuffle.
- Added README documentation.

## Evidence

- Unit coverage proves the deck has 26 cards and all modes complete a server lifecycle.

## Deferred Smoke

- Include in the deck-mode browser smoke batch.
