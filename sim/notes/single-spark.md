# Single Spark Playthrough Notes

Status: PASS

Mode id: `single-spark`
Validated: 2026-05-12

## Coverage

- Minimum-count replay: 2 human browser sessions, 1 hand each.
- Larger-count replay: 3 human browser sessions, 1 hand each.
- Phase path completed: preflop -> flop -> turn -> river -> reveal.
- Reveal order completed worst-ranked first.
- Disconnect check: Alpha was closed at reveal while owning the next flip. Bravo saw Alpha marked offline and successfully flipped Alpha's hand on their behalf; the remaining seats completed reveal.

## Screenshots

- `sim/screens/single-spark/preflop.png`
- `sim/screens/single-spark/flop.png`
- `sim/screens/single-spark/turn.png`
- `sim/screens/single-spark/river.png`
- `sim/screens/single-spark/reveal.png`
- `sim/screens/single-spark/reveal-results.png`
- `sim/screens/single-spark/larger-preflop.png`
- `sim/screens/single-spark/larger-flop.png`
- `sim/screens/single-spark/larger-turn.png`
- `sim/screens/single-spark/larger-river.png`
- `sim/screens/single-spark/larger-reveal.png`
- `sim/screens/single-spark/larger-reveal-results.png`

## Observations

- Every hand rendered exactly one private hole card during play and reveal.
- Made-hand names rendered in reveal results, including `Pair, 10's`, `Pair, K's`, and `K High`.
- True ranking matched high-hand scoring with one-card holes and the shared board.
- Inversion count was displayed in reveal results and logged as 0 in both playthroughs.
- No chaos-event, hidden-card, wild-card, or player-choice checks apply to this mode.
- No bots were seated.

## Engine Extensions

- None.

## Visual Issues

- None blocking.
