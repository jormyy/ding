# Counterfeit

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `counterfeit`

## What Changed

- Added `counterfeit` card metadata.
- Added `counterfeitHoleCards` deal support and `excludedMetas` showdown filtering.
- Added the `counterfeit` mode definition and README.

## Evidence

- Unit coverage proves every dealt hand receives a counterfeit first hole card and that counterfeit cards are ignored by showdown scoring.

## Deferred Smoke

- Include in the card-metadata browser smoke batch.
