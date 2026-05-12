# Cursed Card

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `cursed-card`

## What Changed

- Added `cursed` card metadata and a cursed deck factory.
- Added forced-last metadata ranking support.
- Added the `cursed-card` mode definition and README.

## Evidence

- Unit coverage proves the cursed card exists in the deck and forces its holder to the bottom of true ranking.

## Deferred Smoke

- Include in the card-metadata browser smoke batch.
