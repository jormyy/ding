# Connected Hole

Status: PASS

Mode 18 of the 200-mode catalogue. Browser validated on 2026-05-12 with
agent-browser sessions `ding-m018-a`, `ding-m018-b`, and `ding-m018-c`.

## Coverage

- 2-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- 3-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- Disconnected reveal: Charlie was closed during reveal in the 3-player room;
  Alpha was able to flip Charlie's offline hand and the remaining connected
  players completed reveal.

## Observations

2-player deal:

- Alpha: `7C 6D`
- Bravo: `10C JD`
- Board: `2D 4D 5C 5D AH`
- Result: score `0`, displayed as perfect. Final order was Bravo over Alpha,
  both with pair 5 and Bravo holding stronger kickers.

3-player deal:

- Alpha: `6H 5S`
- Bravo: `JC 10C`
- Charlie: `KC AH`
- Board: `JH 2H 9C 3H JD`
- Result: score `0`, displayed as perfect. Final order was Bravo trips J,
  Charlie pair J, Alpha pair J.

Every observed private hand satisfied the adjacent-rank constraint.

## Screenshots

- `sim/screens/connected-hole/preflop.png`
- `sim/screens/connected-hole/flop.png`
- `sim/screens/connected-hole/turn.png`
- `sim/screens/connected-hole/river.png`
- `sim/screens/connected-hole/reveal.png`
- `sim/screens/connected-hole/reveal-results.png`
- `sim/screens/connected-hole/larger-preflop.png`
- `sim/screens/connected-hole/larger-flop.png`
- `sim/screens/connected-hole/larger-turn.png`
- `sim/screens/connected-hole/larger-river.png`
- `sim/screens/connected-hole/larger-reveal.png`
- `sim/screens/connected-hole/larger-reveal-charlie-offline.png`
- `sim/screens/connected-hole/larger-reveal-results.png`

## Engine Extensions Touched

- Added `deal.constraint = "connectedRanks"` to the existing constrained deal path.
- Added `connected-hole` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

None observed.

## Bot Quirks

No bots were seated. Bot behavior is out of scope for this validation gate.
