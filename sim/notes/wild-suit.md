# Wild Suit

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `wild-suit`

## What Changed

- Added `wildCards.suits` support.
- Added the `wild-suit` mode definition and README.

## Evidence

- Unit coverage proves a heart wild card can outrank a plain strong hand.
- Full lifecycle coverage passes with bounded high-count wild fallback.

## Deferred Smoke

- Include in the wild-mode browser smoke batch.
