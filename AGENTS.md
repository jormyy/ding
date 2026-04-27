# AGENTS.md — Developer Guide for Ding

This file contains context for coding agents and developers working on Ding. It complements `README.md` (which targets users and contributors) with build steps, conventions, and architecture notes you need to modify the codebase.

## Quick Start

```bash
npm install
npm run dev          # Next.js (:3000) + PartyKit (:1999)
```

Open http://localhost:3000. The PartyKit dev server runs on :1999 automatically.

```bash
npm test             # Vitest watch mode
npm run test:run     # One-shot (for CI)
```

## Tech Constraints

- **Next.js 14 App Router**. All pages are Server Components by default. Any client-side interactivity must use `"use client"`.
- **PartyKit server** runs on a separate port. The client connects via `PartySocket` using `NEXT_PUBLIC_PARTYKIT_HOST`.
- **No database**. All game state lives in-memory on the PartyKit server. Chat history is kept in `ServerGameState.chatMessages` (capped at 100).
- **TypeScript strict**. Use explicit types on exports, especially in `src/lib/types.ts` and `party/handlers/`.

## Project Conventions

### File Organization

- `src/app/` — Next.js pages only. No business logic.
- `src/components/` — React components. Sub-folders group by feature (`game/`, `reveal/`).
- `src/hooks/` — Custom hooks that compose state + side effects.
- `src/lib/` — Pure functions, types, constants, and AI logic. No React imports.
- `party/` — Server-only code. Must not import React or browser APIs.
- `tests/unit/` — Co-located by feature area. Import paths use `../../src/...` or `../../party/...`.
- `scripts/` — Standalone Node scripts using `tsx`. Import paths use relative or `../../src/`.

### Naming

- React components: `PascalCase.tsx`
- Hooks: `camelCase.ts`, exported as `useXxx`
- Server handlers: `camelCase.ts` in `party/handlers/`, exported as handler functions
- AI modules: domain-named (`belief.ts`, `ev.ts`, `range.ts`)
- Types: PascalCase, exported from `src/lib/types.ts` or co-located if module-internal

### State Mutation Rules

**Server (`party/`):** Mutate `ServerGameState` in place. Handlers return `{ kind: "broadcast" | "broadcast-raw" | "broadcast-close-self" | "ignore" }`. Never create deep copies unless masking for clients.

**Client (`src/hooks/`):** Optimistic updates are fine — `useRankingActions` clones arrays with spread. Server state is the source of truth; `useEffect` syncs `localRanking` from `gameState.ranking`.

### WebSocket Message Flow

```
Client action
  → PartySocket.send(JSON.stringify(msg))
  → DingServer.onMessage()
  → handlerMap[msg.type](state, player, msg, ctx)
  → state mutated
  → broadcastStateTo() → buildClientState() per connection
  → conn.send(JSON.stringify({ type: "state", state: maskedState }))
  → Client setGameState()
```

Bots bypass the socket: `BotController.dispatch()` calls `DingServer.handlePlayerAction()` directly.

## Architecture Deep Dive

### The Ranking Array

`GameState.ranking` is a `(string | null)[]` where:
- Index `0` = slot 1 (best)
- Index `N-1` = slot N (worst)
- `null` = unclaimed slot

Every phase (preflop → flop → turn → river) resets the ranking to all `null`s. The reveal phase preserves the final ranking.

**Invariant:** At most one copy of each `handId` may appear in `ranking`. Duplicate detection is in `assertRankingInvariant()`.

### Hand IDs

Hand IDs follow `${playerId}-${handIndex}` (e.g. `"abc-0"`, `"abc-1"`). This is stable for the lifetime of a game.

### Connection Lifecycle

1. **Join**: Client opens `PartySocket` → sends `join` with `pid` (from `sessionStorage`) + `name`
2. **Reconnect**: If `pid` exists in `state.players`, update `connId` and mark `connected = true`
3. **Disconnect**: `onClose` marks `connected = false`; in lobby, creator may transfer; in-game, `ready = false`
4. **Kick**: `kickedPids` blocks rejoin; bot removal calls `botController.removeBot()`

### Phase Transitions

`party/handlers/lifecycle.ts` → `ready` handler:

1. Validates all hands are ranked (or only offline players are unranked)
2. Sets `player.ready = msg.ready`
3. If all connected players ready:
   - Snapshots current ranks into `rankHistory[handId]`
   - Clears `acquireRequests`
   - Computes `trueRanking`/`trueRanks` if entering reveal
   - Otherwise resets `ranking` to all `null`
   - Advances `phase`
   - Clears all `ready` flags

### Reveal Mechanics

`revealIndex` counts how many hands have been flipped. The current flip target is:

```ts
const currentRevealIdx = state.ranking.length - 1 - state.revealIndex;
const handToFlipId = state.ranking[currentRevealIdx];
```

This means we flip **worst-ranked first** (last slot → first slot). Ties in `trueRanking` are handled by `computeTrueRanks` — tied hands share a rank number but still occupy sequential slots in `trueRanking`.

### Bot Action Validation

`BotController.isStillValid()` re-validates a previously-decided action before emitting it. This prevents bots from acting on stale state after a delay. Key checks:
- `move`: target slot still empty or occupied by same hand
- `swap`: both hands still placed
- `propose/accept/reject/cancel`: request still exists (or doesn't, for propose)
- `ready`/`flip`/`ding`/`fuckoff`: always valid

## AI Subsystem Guide

### Adding a New Bot Archetype

1. Add the archetype name to `Archetype` union in `src/lib/ai/archetypes.ts`
2. Add trait patch in `archetypePatch()`
3. Optionally adjust `pickArchetype()` weights

Archetype patches override base traits. See `personality.ts` for the base defaults.

### Tuning Bot Behavior

Key levers in `src/lib/ai/strategy.ts`:

- `canPropose()` — trade proposal thresholds. `proposeBar` default is `0.3 + resignation * 1.0 + stubbornness * 0.25`.
- `resignation` curve — controls when bots give up and just ready. Faster resignation = less trading, faster phases.
- `overDecisionCap` (60 decisions) — soft cap on voluntary churn per phase.
- `nSims` in `decideAction()` — `20 + 60 * skill`. Higher = better hand estimates but slower ticks.

Key levers in `src/lib/ai/mood.ts`:

- `onTeammateChurn()` concern bump — controls how much bot distress increases when teammates reorder hands.
- `moodAdjustedTraits()` — concern slows bots down and raises stubbornness.

### Belief System Internals

`perceiveState()` in `belief.ts` is the core update loop. It:

1. Builds `currentSlot` map from `state.ranking`
2. Detects churn (slot changes) and decays confidence
3. Folds current placements into posterior means via `updateFromPlacement()`
4. Refreshes range percentiles against current board
5. Blends scalar belief with range-derived strength

**Phase trust weights** (`phaseTrust()`):
- Preflop: 0.25 (placements are noisy)
- Flop: 0.6
- Turn: 0.85
- River/Reveal: 1.0 (placements are gospel)

**Range weights** (`phaseRangeWeight`):
- River: 0.65
- Turn: 0.55
- Flop: 0.40
- Preflop: 0.18 (heuristic nudge only)

### Running Simulations

Use the simulation scripts to validate AI changes:

```bash
# Benchmark 50 games, 5 bots, 4 hands each
npx tsx scripts/simulate.ts --games 50 --bots 5 --hands 4

# Quick smoke test
npx tsx scripts/fast-sim.ts --games 10 --bots 3 --hands 2
```

Watch for:
- Average inversion count (lower is better)
- Average phase duration (too fast = bots aren't trading enough)
- Bot-to-bot trade acceptance rate

## Common Tasks

### Adding a New Game Phase

1. Add phase to `Phase` union in `src/lib/types.ts`
2. Add to `PHASE_ORDER` and `COMMUNITY_CARDS_FOR_PHASE` in `src/lib/constants.ts`
3. Add label to `PHASE_STEP_LABELS` if it needs UI display
4. Update `inGamePhase()` in `party/handlers/types.ts`
5. Update `ready` handler in `party/handlers/lifecycle.ts` for phase transition logic
6. Update `decideAction()` in `src/lib/ai/strategy.ts` if bots need phase-specific behavior

### Adding a New Client Message Type

1. Add union variant to `ClientMessage` in `src/lib/types.ts`
2. Add handler in `party/handlers/` (or extend existing)
3. Register in `handlerMap` in `party/handlers/index.ts`
4. Add UI trigger in components/hooks
5. Add tests in `tests/unit/` if logic is non-trivial

### Adding a New Server Message Type

1. Add union variant to `ServerMessage` in `src/lib/types.ts`
2. Send from server handler (usually `{ kind: "broadcast-raw", payload: JSON.stringify(msg) }`)
3. Handle in client `RoomPage` message listener

### Changing Card Dealing Rules

Edit `dealCards()` in `src/lib/deckUtils.ts`. Currently:
- 2 cards per hand, dealt player-by-player
- 1 burn + 3 flop + 1 burn + 1 turn + 1 burn + 1 river

Changing this will affect `handStrength.ts` Monte Carlo (assumes 2 hole cards) and `handClassifier.ts` (assumes 5-card evaluation).

## Testing Guidelines

### Unit Test Patterns

```ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../src/lib/myModule'

describe('myFunction', () => {
  it('should handle the happy path', () => {
    expect(myFunction(input)).toBe(expected)
  })

  it('should handle edge case', () => {
    expect(myFunction(edgeCase)).toBe(something)
  })
})
```

### AI Test Patterns

When testing bot behavior, construct a `GameState` and call `decideAction()` directly:

```ts
import { decideAction, newBotMemo } from '../../src/lib/ai/strategy'
import { randomTraits } from '../../src/lib/ai/personality'

const state = { /* ...minimal GameState... */ }
const { traits } = randomTraits()
const memo = newBotMemo()
const action = decideAction(state, 'bot-1', traits, memo)
```

Use `fastTickAll()` in `BotController` for integration-style bot tests without timers.

### Handler Test Patterns

Import handler functions directly and pass a minimal `ServerGameState`:

```ts
import { move } from '../../party/handlers/ranking'

const state = createInitialState()
// ...set up hands, ranking, players...
const result = move(state, player, { type: 'move', handId: 'p1-0', toIndex: 0 })
expect(result.kind).toBe('broadcast')
```

## Deployment Checklist

Before deploying:

- [ ] `npm run build` passes (Next.js static generation)
- [ ] `npm run test:run` passes
- [ ] `npm run lint` passes
- [ ] PartyKit host is configured in production environment
- [ ] `partykit.json` `name` field is correct for production

## Troubleshooting

**"Game already in progress" on join:**
The room is not in `lobby` phase. Only lobby joins are allowed for new players. Use `endGame` or `playAgain` to return to lobby.

**Bots not acting:**
Check `BotController` — if `connections.size === 0`, the controller is disposed and recreated. Ensure at least one human is connected, or use `fastTickAll()` in scripts.

**Ranking invariant errors in console:**
`assertRankingInvariant()` fires when duplicates exist or length mismatches. Usually caused by a handler mutating `ranking` without clearing old slots.

**Preflop estimates look wrong:**
`preflopStrength()` in `handStrength.ts` uses Chen-style heuristics. Check the gap/suited/pair logic if AA doesn't score near 1.0.

**Memory growth in long-running rooms:**
Chat is capped at 100 messages. `rankHistory` grows by one array per phase per hand — for 22 hands × 4 phases = 88 numbers max. State is otherwise bounded.
