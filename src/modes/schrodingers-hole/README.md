# Schrodinger's Hole

Schrodinger's Hole is a high-hand identity variant. Hole cards carry alternate unresolved identities until reveal scoring.

## Engine Notes

- Uses `deal.possibleIdentities: "holes"`.
- Uses `identityResolution: "bestPossible"` so showdown evaluates the strongest available identity assignment.
- Client card rendering shows uncertain cards with question marks.
