# Darkest Out

Darkest Out is a high-hand Ding variant where every hand exposes its lowest hole card from preflop onward. The higher hole card remains private until reveal.

Players get a reliable low-card anchor for each opponent hand, but the hand's real ceiling can still hide behind the private card.

## Engine Notes

- Uses `deal.publicCards: 1` with `publicCardSelection: "lowest"`.
- The deal engine selects the public card without reordering the private `cards` array, so showdown evaluation still sees the original hand.
- Server masking sends the selected lowest card as a normal public card; all other opponent hole cards remain hidden until reveal.
