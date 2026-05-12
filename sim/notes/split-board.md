# Split Board

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `split-board`

## What Changed

- Added the `split-board` mode definition with two three-card board halves.
- Reused the multi-board `deal.boards.scoring: "best"` evaluator path.
- Added `src/modes/split-board/README.md`.
- Added unit coverage proving a hand can win by using the better second half.

## Evidence

- Mode definition uses `communityCards: 6` and `boards: { count: 2, cardsPerBoard: 3, scoring: "best" }`.
- Reveal schedule shows all 6 board cards from flop through reveal.
- Unit coverage asserts the visible-card schedule and split-half scoring.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
