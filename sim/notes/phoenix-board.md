# Phoenix Board

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `phoenix-board`

## What Changed

- Added `discardedCardsToCommunity` deal support.
- Added the `phoenix-board` mode definition and README.
- Adjusted static deal coverage to allow bonus community cards in discard-to-board modes.

## Evidence

- Unit coverage proves automatic keep-card discards are appended to the community board.

## Deferred Smoke

- Include in the next parallel deal-and-board smoke batch.
