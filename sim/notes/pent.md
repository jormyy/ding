# Pent Playthrough Notes

Status: PASS

Mode id: `pent`
Validated: 2026-05-12

## Coverage

- Minimum-count replay: 2 human browser sessions, 1 hand each.
- Larger-count replay: 3 human browser sessions, 1 hand each.
- Phase path completed: preflop -> flop -> turn -> river -> reveal.
- Reveal order completed worst-ranked first.
- Disconnect check: Bravo was closed at reveal while owning the next flip. Alpha saw Bravo marked offline and successfully flipped Bravo's hand on their behalf; the remaining connected seats completed reveal.

## Screenshots

- `sim/screens/pent/preflop.png`
- `sim/screens/pent/flop.png`
- `sim/screens/pent/turn.png`
- `sim/screens/pent/river.png`
- `sim/screens/pent/reveal.png`
- `sim/screens/pent/reveal-results.png`
- `sim/screens/pent/larger-preflop.png`
- `sim/screens/pent/larger-flop.png`
- `sim/screens/pent/larger-turn.png`
- `sim/screens/pent/larger-river.png`
- `sim/screens/pent/larger-reveal.png`
- `sim/screens/pent/larger-reveal-results.png`

## Observations

- Every hand rendered exactly five private hole cards during play and reveal.
- Made-hand names rendered in reveal results, including `Straight, 7 High`, `Two Pair, 6's & 4's`, `Full House, 9's over 5's`, `Flush, Jc High`, and `Two Pair, 9's & 2's`.
- True ranking matched standard high poker scoring with five-card holes and the shared board.
- Minimum replay ended at 0 inversions. Larger replay ended at 1 inversion after the table ranked Charlie's two pair above Bravo's flush; reveal correctly ordered Bravo above Charlie.
- No chaos-event, hidden-card, wild-card, or player-choice checks apply to this mode.
- No bots were seated.

## Engine Extensions

- None.

## Visual Issues

- None blocking.
