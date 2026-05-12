# Jokers In

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `jokers-in`

## What Changed

- Added card metadata support for joker-marked cards.
- Added `deck: "jokers"` and `wildCards.metas: ["joker"]`.
- Added README documentation.

## Evidence

- Unit coverage proves the joker deck has two joker-marked cards.
- Unit coverage proves joker wild cards can outrank a plain strong hand through wildcard substitution.

## Deferred Smoke

- Include in the wild/deck browser smoke batch.
