# Wild Suit

Wild Suit is a high-hand wild-card variant. One announced suit is wild at showdown.

## Engine Notes

- Uses standard two-hole, five-board dealing.
- Hearts are currently the announced wild suit.
- Uses `wildCards.suits: ["H"]`; high-count wild cases use a bounded evaluator fallback to keep rooms playable.
