# Suited Hole

Status: PASS

Mode 17 of the 200-mode catalogue. Browser validated on 2026-05-12 with
agent-browser sessions `ding-m017-a`, `ding-m017-b`, and `ding-m017-c`.

## Coverage

- 2-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- 3-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- Disconnected reveal: Bravo was closed during reveal in the 3-player room; Alpha
  was able to flip Bravo's offline hand and the remaining connected players
  completed reveal.

## Observations

2-player deal:

- Alpha: `7H 5H`
- Bravo: `5S QS`
- Board: `10C 3D 5C 5D 10H`
- Result: score `0`, displayed as perfect. Both hands evaluated as full house
  5's over 10's; ranked order was accepted as non-inverted because the true
  ranks tied.

3-player deal:

- Alpha: `QS KS`
- Bravo: `8D 4D`
- Charlie: `9C 8C`
- Board: `6D AC 3D QH 10C`
- Result: score `0`, displayed as perfect. Final true order was Alpha pair Q,
  Charlie A-high, Bravo A-high.

Every observed private hand satisfied the same-suit constraint.

## Screenshots

- `sim/screens/suited-hole/preflop.png`
- `sim/screens/suited-hole/flop.png`
- `sim/screens/suited-hole/turn.png`
- `sim/screens/suited-hole/river.png`
- `sim/screens/suited-hole/reveal.png`
- `sim/screens/suited-hole/reveal-results.png`
- `sim/screens/suited-hole/larger-preflop.png`
- `sim/screens/suited-hole/larger-flop.png`
- `sim/screens/suited-hole/larger-turn.png`
- `sim/screens/suited-hole/larger-river.png`
- `sim/screens/suited-hole/larger-reveal.png`
- `sim/screens/suited-hole/larger-reveal-bravo-offline.png`
- `sim/screens/suited-hole/larger-reveal-results.png`

## Engine Extensions Touched

- Added `deal.constraint = "sameSuit"` to the existing constrained deal path.
- Added `suited-hole` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

None observed.

## Bot Quirks

No bots were seated. Bot behavior is out of scope for this validation gate.
