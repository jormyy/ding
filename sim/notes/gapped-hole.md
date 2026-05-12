# Gapped Hole

Status: PASS

Mode 19 of the 200-mode catalogue. Browser validated on 2026-05-12 with
agent-browser sessions `ding-m019-a`, `ding-m019-b`, and `ding-m019-c`.

## Coverage

- 2-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- 3-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- Disconnected reveal: Bravo was closed during reveal in the 3-player room;
  Alpha was able to flip Bravo's offline hand and the remaining connected
  players completed reveal.

## Observations

2-player deal:

- Alpha: `JC KD`
- Bravo: `QC 10D`
- Board: `4S 9S 9C 4D 9H`
- Result: score `0`, displayed as perfect. Both hands played the board full
  house, `9's over 4's`, and tied true rank, so either final order was
  non-inverted.

3-player deal:

- Alpha: `KS JD`
- Bravo: `10C 8H`
- Charlie: `9D 7C`
- Board: `3H 5D 2C 7D 6H`
- Result: score `0`, displayed as perfect. Final order was Charlie pair 7,
  Alpha K high, Bravo 10 high.

Every observed private hand satisfied the exact two-rank-gap constraint.

## Screenshots

- `sim/screens/gapped-hole/preflop.png`
- `sim/screens/gapped-hole/flop.png`
- `sim/screens/gapped-hole/turn.png`
- `sim/screens/gapped-hole/river.png`
- `sim/screens/gapped-hole/reveal.png`
- `sim/screens/gapped-hole/reveal-results.png`
- `sim/screens/gapped-hole/larger-preflop.png`
- `sim/screens/gapped-hole/larger-flop.png`
- `sim/screens/gapped-hole/larger-turn.png`
- `sim/screens/gapped-hole/larger-river.png`
- `sim/screens/gapped-hole/larger-reveal.png`
- `sim/screens/gapped-hole/larger-reveal-bravo-offline.png`
- `sim/screens/gapped-hole/larger-reveal-results.png`

## Engine Extensions Touched

- Added `deal.constraint = "gappedRanks"` to the existing constrained deal path.
- Generalized the connected-rank pair drawer into an exact rank-gap pair drawer.
- Added `gapped-hole` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

None observed.

## Bot Quirks

No bots were seated. Bot behavior is out of scope for this validation gate.
