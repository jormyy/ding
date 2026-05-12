# Cross

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `cross`

## What Changed

- Added explicit board-line metadata via `deal.boards.cardIndexes`.
- Added the `cross` mode definition with two scoring lines over five community cards.
- Added `src/modes/cross/README.md`.
- Added unit coverage proving a hand can win by using the better cross line.

## Evidence

- Mode definition uses `communityCards: 5` and two `cardIndexes` scoring lines.
- Reveal schedule follows 3 / 4 / 5 visible community cards.
- Unit coverage asserts the visible-card schedule and line-based scoring.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
