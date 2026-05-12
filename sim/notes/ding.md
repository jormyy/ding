# Classic Ding Playthrough Notes

Status: PASS

Mode id: `ding`
Validated: 2026-05-12

## Coverage

- Minimum-count replay: 2 human browser sessions, 1 hand each.
- Larger-count replay: 3 human browser sessions, 1 hand each.
- Phase path completed: preflop -> flop -> turn -> river -> reveal.
- Reveal order completed worst-ranked first.
- Disconnect check: Charlie was closed at reveal while owning the next flip. Alpha saw Charlie marked offline and successfully flipped Charlie's hand on their behalf; remaining connected seats completed reveal.

## Screenshots

- `sim/screens/ding/preflop.png`
- `sim/screens/ding/flop.png`
- `sim/screens/ding/turn.png`
- `sim/screens/ding/river.png`
- `sim/screens/ding/reveal.png`
- `sim/screens/ding/reveal-results.png`
- `sim/screens/ding/larger-flop.png`
- `sim/screens/ding/larger-turn.png`
- `sim/screens/ding/larger-river.png`
- `sim/screens/ding/larger-reveal.png`
- `sim/screens/ding/larger-reveal-results.png`

## Observations

- Made-hand names rendered in reveal results: e.g. `Two Pair, 9's & 6's`, `Pair, 3's`, `Pair, A's`, and `A High`.
- True ranking matched Classic high-hand scoring in both runs.
- Inversion count was displayed in reveal results and logged as 0 in both playthroughs.
- No chaos-event, hidden-card, wild-card, or player-choice checks apply to this mode.
- No bots were seated.

## Engine Extensions

- None.

## Visual Issues

- None blocking. The existing selector remains a vertical dropdown as expected before the planned lobby-grid milestone.
