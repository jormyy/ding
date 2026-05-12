# Random Replace

Random Replace is a high-hand board-event variant. When the turn phase begins, one visible community card is replaced by a fresh card from the remaining deck.

## Engine Notes

- Uses standard two-hole, five-board dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["randomReplaceVisibleCommunity"]`.
- The effect mutates `allCommunityCards` before the turn broadcast, so clients and reveal scoring agree on the new board.
