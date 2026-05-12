# Tarot

Tarot is a high-hand deck-and-wild variant. Two tarot-marked arcana cards are mixed into the standard deck and evaluate as wild cards at showdown.

## Engine Notes

- Uses `deck: "tarot"` for a 54-card deck.
- Tarot cards are represented as normal card identities with `meta: "tarot"` for display and evaluator matching.
- Uses `wildCards.metas: ["tarot"]`; the showdown evaluator substitutes each tarot card for the best available identity.
