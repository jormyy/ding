# Schrodinger's Board

Schrodinger's Board is a high-hand board-identity variant. The board has alternate unresolved versions.

## Engine Notes

- Uses `deal.possibleIdentities: "board"`.
- Uses `identityResolution: "bestPossible"`.
- The evaluator enumerates possible identities and keeps the strongest result per hand.
