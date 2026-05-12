# Twin Suits

Twin Suits is a high-hand suit-identity variant. Red suits merge and black suits merge for showdown.

## Engine Notes

- Uses standard dealing.
- Uses `suitTransform: "color"` to evaluate hearts/diamonds as one suit and clubs/spades as one suit.
- Exact duplicate identity handling still routes through the existing solver normalization layer.
