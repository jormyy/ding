# Dark River

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `dark-river`

## What Changed

- Added per-card community display masking via `visibleCommunityCardDetails`.
- Added the `dark-river` mode definition.
- Added `src/modes/dark-river/README.md`.
- Added unit coverage proving only the fifth board card is masked to suit on river and full at reveal.

## Evidence

- `buildClientState()` returns the first four river board cards as full cards and the fifth as `{ suit }`.
- Reveal phase returns full community card identities.

## Deferred Smoke

- Include in the next parallel visibility-mode smoke batch.
