# Meteor

Meteor is a high-hand board event. At turn, one visible community card is replaced.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Reuses `phaseEffects.turn = ["randomReplaceVisibleCommunity"]`.
- Replacement comes from the remaining `dealDeck`.
