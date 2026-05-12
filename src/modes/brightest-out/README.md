# Brightest Out

Brightest Out is a high-hand Ding variant where every hand exposes its highest hole card from preflop onward. The lower hole card remains private until reveal.

Players get a reliable high-card anchor for each opponent hand, but kickers, pairs, and suit texture can still hide behind the private card.

## Engine Notes

- Uses `deal.publicCards: 1` with `publicCardSelection: "highest"`.
- The deal engine selects the public card without reordering the private `cards` array, so showdown evaluation still sees the original hand.
- Server masking sends the selected highest card as a normal public card; all other opponent hole cards remain hidden until reveal.
