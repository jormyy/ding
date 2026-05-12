# Twin Spark

Status: PASS

Mode 21 of the 200-mode catalogue. Browser validated on 2026-05-12 with
agent-browser sessions `ding-m021-a`, `ding-m021-b`, and `ding-m021-c`.

## Coverage

- 2-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- 3-player room, 1 hand per player, full preflop -> flop -> turn -> river -> reveal.
- Disconnected reveal: Alpha was closed during reveal in the 3-player room;
  Charlie was able to flip Alpha's offline hand and the remaining connected
  players completed reveal.
- Capacity check: the 3-player lobby disabled 5 and 6 hands per player because
  the low-rank band only contains 24 cards.

## Observations

2-player deal:

- Alpha: `2S 4D`
- Bravo: `5S 3S`
- Board: `JC KH QD 10H 10S`
- Result: score `0`, displayed as perfect. Both hands made pair 10; final
  ordering was non-inverted.

3-player deal:

- Alpha: `4H 7H`
- Bravo: `7S 2S`
- Charlie: `6S 6D`
- Board: `10D 10S KS 8H 2C`
- Result: score `0`, displayed as perfect. Final order was Charlie two pair
  10s and 6s, Bravo two pair 10s and 2s, Alpha pair 10s.

Every observed private hand stayed fully inside the 2-7 low-rank band.

## Screenshots

- `sim/screens/twin-spark/preflop.png`
- `sim/screens/twin-spark/flop.png`
- `sim/screens/twin-spark/turn.png`
- `sim/screens/twin-spark/river.png`
- `sim/screens/twin-spark/reveal.png`
- `sim/screens/twin-spark/reveal-results.png`
- `sim/screens/twin-spark/larger-preflop.png`
- `sim/screens/twin-spark/larger-flop.png`
- `sim/screens/twin-spark/larger-turn.png`
- `sim/screens/twin-spark/larger-river.png`
- `sim/screens/twin-spark/larger-reveal.png`
- `sim/screens/twin-spark/larger-reveal-alpha-offline.png`
- `sim/screens/twin-spark/larger-reveal-results.png`

## Engine Extensions Touched

- Added `deal.constraint = "lowRanks"` to the existing constrained deal path.
- Added a reusable rank-band constrained pair drawer.
- Added constrained hand-card capacity for low-rank modes so the lobby cannot
  request more low-band hands than the deck can supply.
- Added `twin-spark` to `GAME_MODE_DEFINITIONS`.

## Visual Issues

None observed.

## Bot Quirks

No bots were seated. Bot behavior is out of scope for this validation gate.
