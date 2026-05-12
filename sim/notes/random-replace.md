# Random Replace

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `random-replace`

## What Changed

- Added declarative phase-effect registration to mode definitions.
- Added the server-side `randomReplaceVisibleCommunity` effect.
- Added the `random-replace` mode definition and README.

## Evidence

- Unit coverage advances flop to turn and proves a visible board card is replaced from `dealDeck`.

## Deferred Smoke

- Include in the next parallel board-chaos smoke batch.
