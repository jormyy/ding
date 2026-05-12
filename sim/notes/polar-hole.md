# Polar Hole

Status: PASS

Mode 20 of the 200-mode catalogue. Browser validated on 2026-05-12 with
agent-browser sessions `ding-m020-a`, `ding-m020-b`, and `ding-m020-c`.

## Coverage

- 2-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- 3-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- Disconnected reveal: Bravo was closed during reveal in the 3-player room;
  Alpha was able to flip Bravo's offline hand and the remaining connected
  players completed reveal.

## Observations

2-player deal:

- Alpha: `8H 4H`
- Bravo: `8S 5D`
- Board: `2C 9S 7C 9D 7D`
- Result: score `0`, displayed as perfect. Both hands made two pair,
  `9's & 7's`; the final order remained non-inverted because the true ranks
  tied.

3-player deal:

- Alpha: `9C 3C`
- Bravo: `10C 2D`
- Charlie: `JD 7D`
- Board: `QD 4D 9S JH 7H`
- Result: score `0`, displayed as perfect. Final order was Charlie two pair,
  Alpha pair 9, Bravo Q high.

Every observed private hand satisfied the one-high-card plus one-low-card
constraint. High means 8 through Ace; low means 2 through 7.

## Screenshots

- `sim/screens/polar-hole/preflop.png`
- `sim/screens/polar-hole/flop.png`
- `sim/screens/polar-hole/turn.png`
- `sim/screens/polar-hole/river.png`
- `sim/screens/polar-hole/reveal.png`
- `sim/screens/polar-hole/reveal-results.png`
- `sim/screens/polar-hole/larger-preflop.png`
- `sim/screens/polar-hole/larger-flop.png`
- `sim/screens/polar-hole/larger-turn.png`
- `sim/screens/polar-hole/larger-river.png`
- `sim/screens/polar-hole/larger-reveal.png`
- `sim/screens/polar-hole/larger-reveal-bravo-offline.png`
- `sim/screens/polar-hole/larger-reveal-results.png`

## Engine Extensions Touched

- Added `deal.constraint = "polarRanks"` to the existing constrained deal path.
- Added a constrained pair drawer that crosses the 2-7 / 8-A rank boundary.
- Added `polar-hole` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

None observed.

## Bot Quirks

No bots were seated. Bot behavior is out of scope for this validation gate.
