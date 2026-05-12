# Triad Playthrough Notes

Status: PASS

Mode id: `triad`
Validated: 2026-05-12

## Coverage

- Minimum-count replay: 2 human browser sessions, 1 hand each.
- Larger-count replay: 3 human browser sessions, 1 hand each.
- Phase path completed: preflop -> flop -> turn -> river -> reveal.
- Reveal order completed worst-ranked first.
- Disconnect check: Bravo was closed at reveal while owning the next flip. Alpha saw Bravo marked offline and successfully flipped Bravo's hand on their behalf; the remaining connected seats completed reveal.

## Screenshots

- `sim/screens/triad/preflop.png`
- `sim/screens/triad/flop.png`
- `sim/screens/triad/turn.png`
- `sim/screens/triad/river.png`
- `sim/screens/triad/reveal.png`
- `sim/screens/triad/reveal-results.png`
- `sim/screens/triad/larger-preflop.png`
- `sim/screens/triad/larger-flop.png`
- `sim/screens/triad/larger-turn.png`
- `sim/screens/triad/larger-river.png`
- `sim/screens/triad/larger-reveal.png`
- `sim/screens/triad/larger-reveal-results.png`

## Observations

- Every hand rendered exactly three private hole cards during play and reveal.
- Made-hand names rendered in reveal results, including `Full House, J's over 8's`, `Two Pair, 8's & 2's`, and `Pair, 8's`.
- True ranking matched standard high poker scoring with three-card holes and the shared board.
- Inversion count was displayed in reveal results and logged as 0 in both playthroughs.
- No chaos-event, hidden-card, wild-card, or player-choice checks apply to this mode.
- No bots were seated.

## Engine Extensions

- None.

## Visual Issues

- None blocking.
