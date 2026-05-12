# Glitch Card

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `glitch-card`

## What Changed

- Added `glitched` card metadata and a glitch deck factory.
- Reused wildcard metadata substitution for reveal-time resolution.
- Added README documentation.

## Evidence

- Unit coverage proves glitched metadata exists and can resolve into a winning reveal identity.

## Deferred Smoke

- Include in the card-identity browser smoke batch.
