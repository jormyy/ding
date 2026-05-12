# Solitaire Suite Playthrough Notes

Status: PASS

Mode id: `solitaire-suite`
Validated: 2026-05-12

## Coverage

- Minimum-count replay: 2 human browser sessions, 1 hand each.
- Larger-count replay: 3 human browser sessions, 1 hand each.
- Phase path completed: preflop -> flop -> turn -> river -> reveal.
- Reveal order completed worst-ranked first.
- Disconnect check: Bravo was closed at reveal while owning the next flip. Alpha saw Bravo marked offline and successfully flipped Bravo's hand on their behalf; the remaining connected seats completed reveal.

## Screenshots

- `sim/screens/solitaire-suite/preflop.png`
- `sim/screens/solitaire-suite/flop.png`
- `sim/screens/solitaire-suite/turn.png`
- `sim/screens/solitaire-suite/river.png`
- `sim/screens/solitaire-suite/reveal.png`
- `sim/screens/solitaire-suite/reveal-results.png`
- `sim/screens/solitaire-suite/larger-preflop.png`
- `sim/screens/solitaire-suite/larger-flop.png`
- `sim/screens/solitaire-suite/larger-turn.png`
- `sim/screens/solitaire-suite/larger-river.png`
- `sim/screens/solitaire-suite/larger-reveal.png`
- `sim/screens/solitaire-suite/larger-reveal-results.png`

## Observations

- Every hand rendered exactly seven private hole cards during play and reveal.
- Made-hand names rendered in reveal results, including `Straight Flush, Qh High`, `Four of a Kind, K's`, `Full House, Q's over K's`, `Full House, 2's over 7's`, and `Straight, K High`.
- True ranking matched standard high poker scoring with seven-card holes and the shared board.
- Minimum replay ended at 1 inversion after the table ranked Alpha's four of a kind above Bravo's straight flush; reveal correctly ordered Bravo above Alpha.
- Larger replay ended at 0 inversions.
- No chaos-event, hidden-card, wild-card, or player-choice checks apply to this mode.
- No bots were seated.

## Engine Extensions

- None.

## Visual Issues

- None blocking.
