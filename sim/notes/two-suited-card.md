# Two-Suited Card

Status: STATIC PASS with evaluator caveat; browser smoke deferred to chunk-level parallel run.
Date: 2026-05-12
Mode: `two-suited-card`

## What Changed

- Added `twoSuited` card metadata and deck factory.
- Reused metadata wildcard substitution as the first playable suit-flex layer.
- Added README documentation.

## Evidence

- Unit coverage proves two-suited metadata exists and can improve reveal strength.

## Deferred Smoke

- Include in the card-identity browser smoke batch after exact two-suit-only evaluation is deepened.
