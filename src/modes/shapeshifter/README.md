# Shapeshifter

Shapeshifter is a high-hand identity event. One community card changes rank each street.

## Engine Notes

- Uses `incrementFirstCommunityRank` at flop, turn, and river.
- The first community card shifts deterministically by one rank.
- Reveal scores the shifted card.
