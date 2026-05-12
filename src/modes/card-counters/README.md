# Card Counters

Card Counters is a high-hand information variant. The table sees how many cards remain in the deck.

## Engine Notes

- Uses standard two-hole, five-board dealing and high-hand scoring.
- Uses `modeInfo` with `deck-count` to expose `dealDeck.length` on every broadcast.
- The info payload is symmetric and public to every player.
