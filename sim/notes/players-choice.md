# Player's Choice

Mode id: `players-choice`

Status: PASS

## Runs

- Minimum run: 2 players, 1 hand each, room `KPSDDX`
- Larger run: 3 players, 1 hand each, same room after `Deal again`

## Validation

- Deal-choice phase appeared before preflop.
- Each player was dealt 3 private cards and selected 2 to keep.
- Opponent choice progress showed locked/waiting status without exposing their selected card indexes.
- After all players submitted, the game advanced to preflop with 2-card hands.
- Completed preflop, flop, turn, river, and reveal in both runs.
- Reveal showed made hand names using normal high-hand scoring:
  - Minimum run: Alpha `Pair, J's`; Bravo `A High`; score `0`.
  - Larger run: Bravo `Straight, J High`; Charlie `Two Pair, 10's & 9's`; Alpha `Pair, 10's`; score `0`.
- Disconnected-owner reveal check passed: Bravo was closed at reveal in the larger run, showed as offline, and Alpha flipped Bravo's final hand on their behalf.

## Artifacts

Screenshots live in `sim/screens/players-choice/`.

Key screenshots:
- `deal-choice.png`
- `preflop.png`
- `flop.png`
- `turn.png`
- `river.png`
- `reveal.png`
- `reveal-results.png`
- `larger-deal-choice.png`
- `larger-reveal-bravo-offline.png`
- `larger-reveal-results.png`

## Engine Work

- Added `dealChoice` to `GameModeDealRule`.
- Added `dealChoice` phase between lobby start and preflop.
- Added `GameState.dealChoices` with per-hand keep progress.
- Added `chooseDealCards` client message and reducer.
- Added deal-choice client prompt.

## Bot Notes

No bots were seated. Bot behavior is out of scope for this validation gate.
