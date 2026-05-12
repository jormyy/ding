# Wild Rank Roulette

Status: STATIC PASS with phase-rotation caveat; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `wild-rank-roulette`

## What Changed

- Added the `wild-rank-roulette` mode definition.
- Reuses the reveal-phase sevens wild-rank configuration until the display/event rotation layer lands.
- Added README documentation.

## Evidence

- Unit coverage proves the configured reveal wild rank affects showdown.

## Deferred Smoke

- Include in the wild-mode browser smoke batch after phase-visible rank rotation is deepened.
