# Draw 3, Discard 1 Notes

Status: implemented as an extra non-catalogue variant.

- Deal: three private cards per hand, automatic keep-best-two discard before preflop.
- Scoring: high-hand poker scoring.
- Verification: covered by the shared mode-deal lifecycle tests and full static gates.
- Browser evidence: not part of the sampled 5-mode catalogue canary.

Caveat: this is intentionally automatic keep/discard; player-choice discard lives in `players-choice`.
