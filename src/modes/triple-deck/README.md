# Triple Deck

Triple Deck is a high-hand deck variant. Three full decks are merged before the deal.

## Engine Notes

- Uses `deck: "triple"` for a 156-card deck.
- Duplicate card identities may appear in a hand plus board.
- The Ding evaluator normalizes duplicate identities for `pokersolver`; exact duplicate semantics remain a later evaluator deepening area.
