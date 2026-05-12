# Wild Faces

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `wild-faces`

## What Changed

- Added the `wild-faces` mode definition with J/Q/K wild cards.
- Added bounded high-count wild fallback in showdown.
- Added README documentation.

## Evidence

- Unit coverage proves a face-card wild can outrank a plain strong hand.

## Deferred Smoke

- Include in the wild-mode browser smoke batch.
