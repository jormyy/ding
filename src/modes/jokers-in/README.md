# Jokers In

Jokers In is a high-hand deck-and-wild variant. Two jokers are mixed into the deck and evaluate as wild cards at showdown.

## Engine Notes

- Uses `deck: "jokers"` for a 54-card deck.
- Jokers are represented as normal card identities with `meta: "joker"` for display and evaluator matching.
- Uses `wildCards.metas: ["joker"]`; the showdown evaluator substitutes each joker for the best available identity.
