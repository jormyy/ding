# Bottom Half

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `bottom-half`

## What Changed

- Added the `bottom-half` mode definition with `deck: "bottomHalf"`.
- Added README documentation.

## Evidence

- Unit coverage proves the deck has 32 cards and every card is rank 9 or lower.

## Deferred Smoke

- Include in the deck-mode browser smoke batch.
