# Mirror Board

Mirror Board is a high-hand board-shape variant. At river, the five-card board is duplicated into ten displayed community slots.

## Engine Notes

- Uses standard two-hole, five-board dealing before the river phase effect.
- Uses `phaseEffects.river = ["mirrorCommunity"]` and a ten-card river/reveal display schedule.
- `pokersolver` rejects duplicate card identities, so current scoring uses `scoreCommunityCards: 5` until duplicate-card evaluator support lands.
