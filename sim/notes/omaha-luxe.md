# Omaha Luxe Playthrough Notes

Status: PASS

Mode id: `omaha-luxe`
Validated: 2026-05-12

## Coverage

- Minimum-count replay: 2 human browser sessions, 1 hand each.
- Larger-count replay: 3 human browser sessions, 1 hand each.
- Phase path completed: preflop -> flop -> turn -> river -> reveal.
- Reveal order completed worst-ranked first.
- Disconnect check: Bravo was closed at reveal while owning the next flip. Alpha saw Bravo marked offline and successfully flipped Bravo's hand on their behalf; the remaining connected seats completed reveal.

## Screenshots

- `sim/screens/omaha-luxe/preflop.png`
- `sim/screens/omaha-luxe/flop.png`
- `sim/screens/omaha-luxe/turn.png`
- `sim/screens/omaha-luxe/river.png`
- `sim/screens/omaha-luxe/reveal.png`
- `sim/screens/omaha-luxe/reveal-results.png`
- `sim/screens/omaha-luxe/larger-preflop.png`
- `sim/screens/omaha-luxe/larger-flop.png`
- `sim/screens/omaha-luxe/larger-turn.png`
- `sim/screens/omaha-luxe/larger-river.png`
- `sim/screens/omaha-luxe/larger-reveal.png`
- `sim/screens/omaha-luxe/larger-reveal-results.png`

## Observations

- Every hand rendered exactly four private hole cards during play and reveal.
- Made-hand names rendered in reveal results, including `Straight, 7 High`, `Two Pair, J's & 10's`, `Straight, 6 High`, `Two Pair, J's & 6's`, and `Pair, A's`.
- True ranking matched standard high poker scoring with four-card holes and the shared board.
- Minimum replay ended at 0 inversions. Larger replay ended at 1 inversion after the table ranked Alpha's pair of Aces above Bravo's two pair; reveal correctly ordered Bravo above Alpha.
- No chaos-event, hidden-card, wild-card, or player-choice checks apply to this mode.
- No bots were seated.

## Engine Extensions

- None.

## Visual Issues

- None blocking.
