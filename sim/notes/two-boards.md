# Two Boards

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `two-boards`

## What Changed

- Added board-group metadata to `GameModeDealRule`.
- Added the `two-boards` mode definition with two five-card boards.
- Added high-hand multi-board scoring for modes with `deal.boards.scoring: "best"`.
- Added `src/modes/two-boards/README.md`.
- Added unit coverage proving a hand can win by using its better second board.

## Evidence

- Mode definition uses `communityCards: 10` and `boards: { count: 2, cardsPerBoard: 5, scoring: "best" }`.
- Reveal schedule shows 6 cards on flop, 8 on turn, and all 10 on river/reveal.
- Unit coverage asserts the visible-card schedule.
- Unit coverage asserts `computeShowdownForMode("two-boards", ...)` ranks a royal-flush hand first because it uses board 2.
- Static gates passed after implementation: `npx tsc --noEmit`, `npm run test:run`, and `git diff --check`.

## Deferred Smoke

- Include in the next parallel board-mode smoke batch.
