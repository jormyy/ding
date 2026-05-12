# Anti-Wild

Anti-Wild is a high-hand rank-exclusion variant. One announced rank is removed from scoring.

## Engine Notes

- Uses standard two-hole, five-board dealing.
- Sevens are currently the banned rank.
- Uses `excludedRanks: ["7"]`, filtering matching hand and board cards before showdown.
