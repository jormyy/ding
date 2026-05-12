# Trickster Card

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `trickster-card`

## What Changed

- Added `trickster` card metadata and deck factory.
- Reused forced-last metadata ranking support.
- Added README documentation.

## Evidence

- Unit coverage proves the trickster holder is forced to the bottom of true ranking.

## Deferred Smoke

- Include in the card-metadata browser smoke batch.
