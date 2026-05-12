# Tarot

Status: STATIC PASS; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `tarot`

## What Changed

- Added card metadata support for tarot-marked cards.
- Added `deck: "tarot"` and `wildCards.metas: ["tarot"]`.
- Added README documentation.

## Evidence

- Unit coverage proves the tarot deck has two tarot-marked cards.
- Unit coverage proves tarot wild cards can outrank a plain strong hand through wildcard substitution.

## Deferred Smoke

- Include in the wild/deck browser smoke batch.
