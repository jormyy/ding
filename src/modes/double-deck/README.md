# Double Deck

Double Deck is a high-hand deck variant. Two full decks are merged before the deal.

## Engine Notes

- Uses `deck: "double"` for a 104-card deck.
- Duplicate card identities may appear in a hand plus board.
- The Ding evaluator normalizes duplicate identities for `pokersolver` so duplicate-deck games complete instead of crashing.
