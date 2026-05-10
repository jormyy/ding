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
- **No database**. All game state lives in-memory on the PartyKit server, persisted via `room.storage` for hibernation. Chat history is capped at 100 messages; the bot action log is capped at 100 entries.
- **TypeScript strict + noUnusedLocals + noUnusedParameters + noImplicitReturns**. Tests are excluded from typecheck via `tsconfig.json`'s `exclude`.

## Project Conventions

### File Organization

- `src/app/` — Next.js pages only. No business logic.
- `src/components/` — Mode-agnostic React components (chrome, shells, dispatch).
- `src/contexts/` — React contexts (e.g. `GameSession.tsx` for socket lifecycle + identity).
- `src/hooks/` — Custom hooks that compose state + side effects.
- `src/lib/` — Pure functions, types, constants, AI, and the `gameMode` contract. No React imports.
- `src/modes/<id>/` — Per-mode implementation: phases, reducers, evaluator, scaler, reveal helpers, view registration. Adding a second mode lands here.
- `src/modes/registry.ts` — Client-side mode registry consulted by `GameModeRouter`.
- `party/` — Server-only code. Must not import React or browser APIs.
- `party/pipeline/dispatch.ts` — The single funnel for state mutations.
- `party/server/` — Extracted server modules (ConnectionManager, RoomStorage, AlarmScheduler, LobbySweeper).
- `party/state/` — Invariants + state migration (`STATE_VERSION`, `migrateState`).
- `tests/unit/` — Co-located by feature area. Excluded from production typecheck.
- `scripts/` — Standalone Node scripts using `tsx`. Shared harness in `scripts/lib/harness.ts`.

### Naming

- React components: `PascalCase.tsx`
- Hooks: `camelCase.ts`, exported as `useXxx`
- Reducers: `camelCase.ts` in `src/modes/ding/reducers/`, exported as `reduce<MessageType>` (e.g. `reduceMove`); registered in `dingReducers` table
- Server modules: `camelCase.ts` in `party/server/` exporting a class or named functions
- AI modules: domain-named (`belief.ts`, `ev.ts`, `range.ts`)
- Types: PascalCase, exported from `src/lib/types.ts` (cross-wire types) or `party/types.ts` (server-only)

### State Mutation Rules

**Server (`party/`):** Reducers mutate `ServerGameState` in place and return one of:

```ts
{ kind: "ignore" }
{ kind: "broadcast" }
{ kind: "broadcast-raw"; payload: string }
{ kind: "broadcast-raw-and-state"; payload: string }
{ kind: "broadcast-close-self" }
```

The dispatcher (`party/pipeline/dispatch.ts`) routes through `dingReducers`, bumps `state.gen` on every non-`ignore` result, appends a bot-action log entry for bot-originated actions (capped at `BOT_ACTION_LOG_CAP = 100`), and runs invariants on every applied action.

Never deep-clone `ServerGameState` outside masking (`buildClientState` clones what it needs to strip).

**Client (`src/hooks/useRankingActions.ts`):** Optimistic updates clone arrays with spread. Server state is the source of truth; `useEffect` syncs `localRanking` from `gameState.ranking` on every server broadcast.

### WebSocket Message Flow

```
Client action
  → PartySocket.send(JSON.stringify(msg))
  → DingServer.onMessage()
  → handlePlayerAction(player, msg, sender, isBot=false)
  → dispatchAction({state, player, msg, handlerCtx, sender, isBot})
        ├─ dingReducers[msg.type](state, player, msg, ctx)   // mutates state in place
        ├─ if changed: state.gen++
        ├─ if isBot:   append BotActionLogEntry (cap 100)
        └─ if changed: runInvariants(state)
  → broadcast()
        ├─ auditBotActionLog(state)        // when score is computed
        ├─ applyRoundTimerIfExpired()      // server-side timer enforcement
        ├─ MaskBroadcaster.broadcast()     // per-player JSON byte-compare
        ├─ botController.notifyStateChanged()
        ├─ persistState() (fire-and-forget)
        └─ alarmScheduler.schedule()       // dirty-bit gated
```

Bots bypass the socket: `BotController.dispatch` calls `DingServer.handlePlayerAction(player, msg, undefined, true)` directly, which routes through the same dispatcher with `isBot=true`.

## Architecture Deep Dive

### The Ranking Array

`GameState.ranking` is a `(string | null)[]` where:
- Index `0` = slot 1 (best)
- Index `N-1` = slot N (worst)
- `null` = unclaimed slot

Every phase (preflop → flop → turn → river) resets the ranking to all `null`s. The reveal phase preserves the final ranking.

**Invariants** (run after every applied action by `dispatchAction` via `runInvariants` in `party/state/invariants.ts`):
- `noDuplicateRanking` — at most one copy of each `handId` in `ranking`; `ranking.length === hands.length` once any hands exist
- `noOrphanAcquireRequests` — every `acquireRequest` references hands that still exist
- `uniquePlayerIds` — no duplicate `Player.id`

Violations are logged to console; transactional rollback is a future addition.

### Hand IDs

Hand IDs follow `${playerId}-${handIndex}` (e.g. `"abc-0"`, `"abc-1"`). Stable for the lifetime of a game.

### State Versioning

`party/state/migrate.ts` defines `STATE_VERSION` and `migrateState(raw)`. The server tags every persisted blob with `__version` via `tagVersion(state)`. On load, `RoomStorage.loadState` calls `migrateState`, which forward-migrates older shapes (currently version 0 → 1 is a stamp-only upgrade since the shape was identical). Future shape changes bump `STATE_VERSION` and chain into the migration switch.

### Connection Lifecycle

1. **Join**: Client opens `PartySocket` → sends `join` with `pid` (from `sessionStorage`) + `name`
2. **Reconnect**: If `pid` exists in `state.players`, update `connId` and mark `connected = true`
3. **Disconnect**: `onClose` calls `forgetPlayerInBroadcaster(pid)` and marks `connected = false`; in lobby, creator may transfer; in-game, `ready = false`
4. **Kick**: `kickedPids` blocks rejoin; bot removal calls `botController.removeBot()`
5. **Lobby ghost sweep**: `LobbySweeper.sweepLobbyGhosts` evicts players past `LOBBY_GRACE_MS = 30s`, fires from both action boundaries (opportunistic) and the DO alarm (idle backstop)

### Phase Transitions

`party/handlers/lifecycle.ts` → `ready` handler (registered as `reduceReady`):

1. Validates all hands are ranked (or only offline players are unranked)
2. Sets `player.ready = msg.ready`
3. If all connected players ready → `advancePhaseIfAllReady`:
   - Snapshots current ranks into `rankHistory[handId]`
   - Clears `acquireRequests`
   - If entering reveal: solves all hands via `dingEvaluator`, populates `madeHandName`, computes `trueRanking`/`trueRanks`, resets `revealIndex`
   - Otherwise resets `ranking` to all `null`
   - Advances `phase`
   - Clears all `ready` flags

### Reveal Mechanics

`revealIndex` counts how many hands have been flipped. The current flip target is:

```ts
const currentRevealIdx = state.ranking.length - 1 - state.revealIndex;
const handToFlipId = state.ranking[currentRevealIdx];
```

Flip flow goes **worst-ranked first** (last slot → first slot). Owner flips their own hand by default; if the owner is disconnected, any other connected player can flip on their behalf so reveal doesn't stall. Ties in `trueRanking` are handled by `dingEvaluator.trueRanks` — tied hands share a rank number but still occupy sequential slots.

### Bot Action Validation

`BotController.isStillValid()` re-validates a previously-decided action before emitting it. This prevents bots from acting on stale state after a delay. Key checks:
- `move`: target slot still empty or occupied by same hand
- `swap`: both hands still placed
- `propose/accept/reject/cancel`: request still exists (or doesn't, for propose)
- `ready`/`flip`/`ding`/`fuckoff`: always valid

## GameMode Contract

`src/lib/gameMode/types.ts` defines `GameMode<S, A>`:

```ts
interface GameMode<S extends BaseGameState, A extends BaseAction> {
  readonly id: string;
  readonly version: number;
  readonly phases: ReadonlyArray<PhaseSpec<S, A>>;
  initialState(): S;
  migrate?(raw: unknown, fromVersion: number): S;
  validateAction(s, actor, a): ValidationResult;
  applyAction(draft, actor, a, ctx): ApplyResult<S>;
  canAdvancePhase(s): boolean;
  advancePhase(draft): { from: string; to: string } | null;
  scoreFinalState(s): { score: number; trueRanking: string[]; trueRanks: Record<string, number> };
  readonly invariants: ReadonlyArray<(s) => InvariantViolation | null>;
  readonly maskingRules: ReadonlyArray<MaskingRule<S>>;
  readonly voluntaryActions: ReadonlySet<A["type"]>;
  evaluator?: HandEvaluator;        // poker-style modes
  strengthScaler?: StrengthScaler;  // poker-style modes
}
```

Today the contract is partially wired: the engine consumes `dingReducers` (per-action reducers in `src/modes/ding/reducers/`) and the mode-side `dingEvaluator` / `dingScaler`. `validateAction`/`applyAction`/`scoreFinalState` migration is incremental — moving each action's logic from `party/handlers/` into a per-action `validate + apply` pair under `src/modes/ding/reducers/<type>.ts` lands one type at a time without breaking the dispatcher signature.

## AI Subsystem Guide

### Decision Pipeline Layout

- `src/lib/ai/strategy.ts` — `decideAction` orchestrator. Allocates a `PerTickCaches` at the top, threads it through every `scoreAction` call.
- `src/lib/ai/context.ts` — `PerTickCaches { strengthByHand: Map<string, number> }`, reused across one tick.
- `src/lib/ai/evaluation/modifiers/index.ts` — `utilityFor`, `anchorBonus`, `isAnchorMoveCandidate`, `spreadPenalty`, `orderPreservationBonus`, `isProportionateProposal`.
- `src/lib/ai/evaluation/strengthFallback.ts` — `getEstimate` (cached own-hand strength via `currentHandStrength`).
- `src/lib/ai/selection/readyGate.ts` — `canPropose` gate (proposeBar floor, table-size cap, resignation cutoff).
- `src/lib/ai/belief.ts` — `perceiveState`, scalar belief over teammate hand strength; routes percentile/abs-strength builds through `dingScaler` for memoization.
- `src/lib/ai/range.ts` — Combo-level range belief; consumed by belief.ts.
- `src/lib/ai/ev.ts` — `expectedInversions`, `scoreAction` (with optional `caches`), ranking previews.

### Adding a New Bot Archetype

1. Add the archetype name to `Archetype` union in `src/lib/ai/archetypes.ts`
2. Add trait patch in `archetypePatch()`
3. Optionally adjust `pickArchetype()` weights

Archetype patches override base traits. See `personality.ts` for the base defaults.

### Tuning Bot Behavior

Key levers:

- `canPropose()` in `src/lib/ai/selection/readyGate.ts` — trade proposal thresholds. `proposeBar` has a 0.75 floor and rises with resignation/stubbornness.
- `resignation` curve in `decideAction` — when bots give up and just ready. Faster resignation = less trading, faster phases.
- `overDecisionCap` (60 decisions) — soft cap on voluntary churn per phase.
- `currentHandStrength()` in `src/lib/ai/handStrength.ts` — own-hand scoring follows the strategy guide: preflop tiers, then current made hand only.
- Anchor / spread / order-preservation modifiers in `src/lib/ai/evaluation/modifiers/index.ts`.

### Belief System Internals

`perceiveState()` in `belief.ts` is the core update loop:

1. Builds `currentSlot` map from `state.ranking`
2. Detects churn (slot changes) and decays confidence
3. Folds current placements into posterior means via `updateFromPlacement()`
4. Refreshes range percentiles against current board (via `dingScaler.buildPercentileMap`, which memoizes by `(excludedSet, boardSig)`)
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
- Preflop: 0 (preflop placements do not constrain teammate ranges)

### Running Simulations

```bash
# Benchmark 50 games, 5 bots, 4 hands each
npx tsx scripts/simulate.ts --games 50 --bots 5 --hands 4

# Quick smoke test
npx tsx scripts/simulateFast.ts --games 10 --bots 3 --hands 2

# Capture / compare AI baseline (gate around AI refactors)
npx tsx scripts/aiParity.ts --capture --out tmp/ai-baseline.json --games 100
npx tsx scripts/aiParity.ts --compare --in  tmp/ai-baseline.json --games 100
```

`aiParity` compares aggregate metrics (win rate, median inversions, accept rate, per-archetype win rate) within tolerance. Tolerances are loose today (5pp on rates, ±2 on median inversions) because the harness is unseeded; tighten by seeding `randomTraits()` and the deck shuffler.

Watch for in any sim:
- Average inversion count (lower is better)
- Average phase duration (too fast = bots aren't trading enough)
- Bot-to-bot trade acceptance rate

## Common Tasks

### Adding a New GameMode

1. Create `src/modes/<id>/index.ts` exporting the mode's public surface (evaluator, scaler, phases, reducers)
2. Implement `GameMode<S, A>` from `src/lib/gameMode/types.ts`
3. Register the client-side view: `src/modes/<id>/view.ts` calls `registerMode({ id, phases, … })`
4. Side-effect import the view from `src/components/GameModeRouter.tsx` so it's available at startup
5. The server stamps `state.modeId = "<id>"` in `createInitialState`; clients route via `getMode(state.modeId)`

### Adding a New Game Phase

1. Add phase to `Phase` union in `src/lib/types.ts`
2. Add to `PHASE_ORDER` and `COMMUNITY_CARDS_FOR_PHASE` in `src/lib/constants.ts`
3. Add entry to `PHASES_META` (the `PHASE_LABELS`/`PHASE_STEP_LABELS`/etc. arrays derive from it)
4. Add a `PhaseSpec` entry to `dingPhases` in `src/modes/ding/phases.ts`
5. Update `inGamePhase()` in `party/handlers/types.ts` if the new phase accepts in-game messages
6. Update `advancePhaseIfAllReady` in `party/handlers/lifecycle.ts` for transition logic
7. Update `decideAction()` in `src/lib/ai/strategy.ts` if bots need phase-specific behavior

### Adding a New Client Message Type

1. Add union variant to `ClientMessage` in `src/lib/types.ts`
2. Add a handler in `party/handlers/<area>.ts`
3. Create `src/modes/ding/reducers/<type>.ts` re-exporting the handler as `reduce<Type>`
4. Register the reducer in `dingReducers` (`src/modes/ding/reducers/index.ts`)
5. Optional: add a typed factory in `src/lib/clientMsg.ts`
6. Add UI trigger in components/hooks
7. Add tests in `tests/unit/` if logic is non-trivial

### Adding a New Server Message Type

1. Add union variant to `ServerMessage` in `src/lib/types.ts`
2. Send from server handler (usually `{ kind: "broadcast-raw", payload: JSON.stringify(msg) }` or `broadcast-raw-and-state`)
3. Handle in client `GameSessionProvider` message listener (`src/contexts/GameSession.tsx`)

### Changing Card Dealing Rules

Edit `dealCards()` in `src/lib/deckUtils.ts`. Currently:
- 2 cards per hand, dealt player-by-player
- 1 burn + 3 flop + 1 burn + 1 turn + 1 burn + 1 river

Changing this will affect `currentHandStrength()` / `estimateStrength()` in `handStrength.ts` (assume 2 hole cards) and `handClassifier.ts` (assumes 5-card evaluation).

### Bumping STATE_VERSION

When the persisted state shape changes incompatibly:

1. Bump `STATE_VERSION` in `party/state/migrate.ts`
2. Add a case to `migrateState` that converts the previous version to the new shape
3. Older blobs forward-migrate on load; rooms persisted with a future version refuse to load (start fresh)

## Testing Guidelines

### Unit Test Patterns

```ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../src/lib/myModule'

describe('myFunction', () => {
  it('handles the happy path', () => {
    expect(myFunction(input)).toBe(expected)
  })

  it('handles edge case', () => {
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

### Reducer / Handler Test Patterns

Import the reducer (or underlying handler) and pass a minimal `ServerGameState`:

```ts
import { reduceMove } from '../../src/modes/ding/reducers/move'
// or directly:
import { move } from '../../party/handlers/ranking'

const state = createInitialState()
// ...set up hands, ranking, players...
const result = reduceMove(state, player, { type: 'move', handId: 'p1-0', toIndex: 0 }, ctx)
expect(result.kind).toBe('broadcast')
```

## Deployment Checklist

Before deploying:

- [ ] `npm run build` passes
- [ ] `npm run test:run` passes
- [ ] `npx tsc --noEmit` passes (catches strictness regressions)
- [ ] simulateFast canary green: `npx tsx scripts/simulateFast.ts --games 50 --bots 4 --hands 2` (zero integrity failures)
- [ ] PartyKit host is configured in production environment (`NEXT_PUBLIC_PARTYKIT_HOST`)
- [ ] `partykit.json` `name` field is correct for production

## Troubleshooting

**"Game already in progress" on join:**
The room is not in `lobby` phase. Only lobby joins are allowed for new players. Use `endGame` or `playAgain` to return to lobby.

**Bots not acting:**
Check `BotController` — if `connections.size === 0`, the controller is disposed and recreated on the next human reconnect. Ensure at least one human is connected, or use `fastTickAll()` in scripts.

**Ranking invariant errors in console:**
`runInvariants()` logs `[ding][invariant] <rule>: <message>` when ranking has duplicates, length mismatches, orphan acquire requests, or duplicate player ids. Usually caused by a reducer mutating `ranking` without clearing old slots.

**Preflop estimates look wrong:**
`preflopTierStrength()` in `handStrength.ts` uses the strategy-guide tiers: pairs above non-pairs, high-card tiers below that, suits/connectors ignored, and `23` bottom.

**Memory growth in long-running rooms:**
- Chat is capped at 100 messages
- Bot action log is capped at 100 entries (`BOT_ACTION_LOG_CAP` in `dispatch.ts`)
- `MaskBroadcaster.lastJsonByPlayer` shrinks on disconnect via `forgetPlayerInBroadcaster`
- `rankHistory` grows by one array per phase per hand — for 22 hands × 4 phases = 88 numbers max
- Scaler caches (`percentileCache`, `absStrengthCache`) are bounded by `MAX_CACHE_ENTRIES = 256` with FIFO eviction

**Lobby overflow / scroll appears:**
The lobby is height-bounded (`h-[100dvh]`) and designed to fit 720px viewports. If you add a new settings group, prefer the `SettingRow` + `PillToggle` helpers inside `Lobby.tsx` and keep the per-row footprint near 50px.
