# Blessed Card

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `blessed-card`

## What Changed

- Added `blessed` card metadata and a blessed deck factory.
- Added forced-first metadata ranking support.
- Added the `blessed-card` mode definition and README.

## Evidence

- Unit coverage proves the blessed card exists in the deck and forces its holder to the top of true ranking.

## Deferred Smoke

- Include in the card-metadata browser smoke batch.
