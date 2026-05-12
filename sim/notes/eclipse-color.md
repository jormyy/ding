# Eclipse Color

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `eclipse-color`

## What Changed

- Reused community-card display masking via `visibleCommunityCardDetail`.
- Added the `eclipse-color` mode definition.
- Added `src/modes/eclipse-color/README.md`.
- Added unit coverage proving board cards expose only color until reveal.

## Evidence

- `buildClientState()` masks visible community cards to `{ color }` for this mode before reveal.
- Reveal phase returns full community card identities.
- Static gates passed after implementation: `npx tsc --noEmit`, `npm run test:run`, and `git diff --check`.

## Deferred Smoke

- Include in the next parallel visibility-mode smoke batch.
