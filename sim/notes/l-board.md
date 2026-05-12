# L-Board

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `l-board`

## What Changed

- Reused explicit board-line metadata via `deal.boards.cardIndexes`.
- Added the `l-board` mode definition with three overlapping five-card scoring paths over seven community cards.
- Added `src/modes/l-board/README.md`.
- Added unit coverage proving a hand can win by using its best L path.

## Evidence

- Mode definition uses `communityCards: 7` and three `cardIndexes` scoring paths.
- Reveal schedule shows 4 cards on flop, 5 on turn, and all 7 on river/reveal.
- Unit coverage asserts the visible-card schedule and path-based scoring.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
