# Cascade

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `cascade`

## What Changed

- Added `hidden` community-card display detail.
- Added per-card hidden masks for flop, turn, and river.
- Added the `cascade` mode definition and README.

## Evidence

- Unit coverage proves river display masks the three oldest community cards as hidden.

## Deferred Smoke

- Include in the next parallel board-visibility smoke batch.
