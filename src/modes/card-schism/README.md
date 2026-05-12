# Card Schism

Card Schism is a high-hand deck event. At turn, remaining event draws come from the high half of the deck.

## Engine Notes

- Uses standard dealing and high-hand scoring.
- Uses `phaseEffects.turn = ["schismDeckHighOnly"]`.
- The deck filter affects later phase effects that draw from `dealDeck`.
