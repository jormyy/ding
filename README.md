# Ding

A multiplayer collaborative poker game where players work together to rank all hands in order of true strength across multiple betting rounds.

## Table of Contents

- [How to Play](#how-to-play)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [AI & Bots](#ai--bots)
- [Development](#development)
- [Testing](#testing)
- [Simulation & Benchmarking](#simulation--benchmarking)
- [Deployment](#deployment)
- [Key Design Decisions](#key-design-decisions)

---

## How to Play

### Setup

- Create a room or join one with a 6-character room code
- Enter a display name when you join
- Supports up to 8 players (humans or bots)
- The room creator configures hands per player (1–6, capped so total hands ≤ 22), an optional game timer, and an optional round timer; the game starts once at least 2 connected players are present

### Phases

**Preflop → Flop → Turn → River → Reveal**

Community cards are progressively revealed:

| Phase   | Community Cards | Visibility               |
| ------- | --------------- | ------------------------ |
| Preflop | 0               | Hole cards only          |
| Flop    | 3               | +3 community cards       |
| Turn    | 4               | +1 community card        |
| River   | 5               | +1 community card        |
| Reveal  | 5               | Hands flip one at a time |

Before advancing each phase, every connected player must fill every slot on the ranking board and ready up. Disconnected players' unranked hands don't block the phase.

You can only see your own hole cards. Teammates' hands are face-down until the Reveal phase.

### Ranking Board

Each hand occupies one numbered slot (1 = best, N = worst). You rank all hands at the table — both yours and your teammates'. Every slot must be filled and every connected player must be ready before the phase advances.

### Chip Moves

There are three ways to move chips between players:

- **Acquire** — Request a teammate's chip for yourself. Your unranked hand takes their slot; their hand becomes unranked.
- **Offer** — Offer one of your ranked chips to a teammate. Your hand becomes unranked; their unranked hand takes your slot.
- **Swap** — Propose exchanging your ranked chip with a teammate's ranked chip. Both hands keep their slots but trade positions.

The recipient can accept or reject. The initiator can cancel their own pending proposal. Pending requests clear when the phase advances.

You can also move chips between your own hands directly (`transferOwnChip`), swap two of your own ranked hands, or unclaim a chip to return it to the board.

### Reveal

Hands flip one at a time, worst-ranked first (last slot to first slot). Only the hand's owner can flip when it's their turn. If the owner is disconnected, any other connected player can flip on their behalf so reveal doesn't stall. After all hands are revealed, the inversion count is calculated.

### Winning

The team **wins** with a **perfect board** — every hand ranked exactly where it belongs according to true poker hand strength. Any inversions mean a loss.

The inversion count is a diagnostic metric showing how many pairwise rankings were wrong, useful for post-game discussion.

### Other Controls

- **Bell (Ding)** — Plays a synthesized chord for everyone in the room
- **Fuck Off** — Plays a text-to-speech reaction for everyone (the sender doesn't hear themselves)
- **Custom Output** — Players whose name starts with `-=` get an extra control to broadcast a typed phrase via TTS
- **Chat** — Persistent room chat (capped at 100 messages, 1s throttle per sender)
- **Lobby kick** — The room creator can remove players (and bots) before the game starts; kicked human pids are blocked from rejoining the room
- **Add bot** — The room creator can add AI bots (🤖) from the lobby. Bots place their chips, propose trades, ready up each phase, and flip their own hands in reveal.

---

## Architecture

### High-Level Stack

| Layer           | Technology                                                |
| --------------- | --------------------------------------------------------- |
| Framework       | [Next.js 14](https://nextjs.org/) (App Router)            |
| Language        | TypeScript (strict + `noUnusedLocals/Parameters/Returns`) |
| Styling         | Tailwind CSS                                              |
| Multiplayer     | [PartyKit](https://www.partykit.io/) (WebSocket server)   |
| Hand evaluation | [pokersolver](https://github.com/goldfire/pokersolver)    |
| Tests           | Vitest                                                    |

### GameMode Engine

The engine is a thin orchestrator over a `GameMode<S, A>` plugin contract (`src/lib/gameMode/types.ts`). All Ding-specific logic lives behind that contract in `src/modes/ding/`. The server stamps `state.modeId` onto every broadcast; the client routes through `getMode(state.modeId)` (`src/modes/registry.ts`) to find the right view. Adding a second mode is one folder under `src/modes/` plus one registration line.

The contract surfaces:

- `phases`, `validateAction`, `applyAction`, `canAdvancePhase`, `advancePhase`, `scoreFinalState`
- `invariants`, `maskingRules`, `voluntaryActions`
- Optional `evaluator` (HandEvaluator) and `strengthScaler` (StrengthScaler) for poker-style modes

### Client-Server Model

**Server as single source of truth.** `DingServer` (`party/index.ts`) is a thin orchestrator over four server modules:

- `ConnectionManager` — owns the WebSocket map and player-by-conn lookups
- `RoomStorage` — versioned persistence with forward-migration via `STATE_VERSION`
- `AlarmScheduler` — DO alarm scheduling, dirty-bit gated to avoid redundant writes
- `LobbySweeper` — evicts disconnected lobby players past their grace window

Player actions go through the **pipeline dispatcher** (`party/pipeline/dispatch.ts`) which:

1. Routes the message to a per-action reducer (`src/modes/ding/reducers/<type>.ts` → registered in `dingReducers`)
2. Bumps `state.gen` (the bot-action fingerprint) on any non-`ignore` result
3. Appends a bot-action log entry (capped at 100) for bot-originated actions
4. Runs invariants (`party/state/invariants.ts`) on every applied action

Broadcasts go through `MaskBroadcaster` (`party/state.ts`), which builds a per-player masked view, JSON-serializes it, and skips `conn.send` when the payload is byte-identical to the previous broadcast for that player.

**Optimistic client state.** The Next.js client uses local optimistic state for selection + ranking responsiveness. The `useRankingActions` hook manages optimistic ranking updates and selection state (hand selection vs. slot selection); `useEffect` syncs `localRanking` from `gameState.ranking` on every server update.

**Persistent player identity.** Each player is assigned a UUID stored in `sessionStorage` on first join. On reconnect, the server matches by this ID and restores the player's seat. Kicked human pids are tracked in `kickedPids` and blocked from rejoining.

### State Masking

The server holds `ServerGameState` (extends `GameState` with the unmasked `allCommunityCards` and the `gen` counter). When broadcasting, `buildClientState(playerId)`:

1. Slices `allCommunityCards` to the correct count for the current phase
2. Strips `cards` from all `Hand` objects except the requesting player's own hands and any reveal-phase flipped hands
3. Strips `actorHoleCards` from `botActionLog` entries the viewer didn't author (revealed at reveal phase)

This ensures no client ever receives hole-card data they shouldn't see.

### Message Protocol

**Client → Server (`ClientMessage`):**

| Type              | Phase          | Description                                 |
| ----------------- | -------------- | ------------------------------------------- |
| `join`            | any            | Initial connection with name + persistent player ID |
| `configure`       | lobby          | Creator sets hands per player + timers      |
| `start`           | lobby          | Creator starts the game                     |
| `kick`            | lobby          | Creator removes a player                    |
| `leave`           | lobby          | Player leaves the room                      |
| `addBot`          | lobby          | Creator adds an AI bot                      |
| `move`            | preflop–river  | Place a hand at a board slot                |
| `swap`            | preflop–river  | Swap two of your own ranked hands           |
| `transferOwnChip` | preflop–river  | Move a chip between two of your own hands   |
| `unclaim`         | preflop–river  | Return your chip to the board               |
| `proposeChipMove` | preflop–river  | Initiate acquire/offer/swap with another player |
| `acceptChipMove`  | preflop–river  | Accept an incoming proposal                 |
| `rejectChipMove`  | preflop–river  | Reject an incoming proposal                 |
| `cancelChipMove`  | preflop–river  | Withdraw your own proposal                  |
| `ready`           | preflop–river  | Toggle ready state                          |
| `flip`            | reveal         | Flip your hand during reveal                |
| `playAgain`       | reveal         | Creator resets to lobby, keeping players + chat |
| `endGame`         | non-lobby      | Creator aborts to lobby, keeping players + chat |
| `ding`            | any            | Play bell sound for everyone                |
| `fuckoff`         | any            | Play reaction sound for everyone else       |
| `chat`            | any            | Send chat message (rate-limited per sender) |
| `customOutput`    | any            | Broadcast a TTS phrase (`-=`-prefixed names) |

**Server → Client (`ServerMessage`):**

| Type           | Description                                          |
| -------------- | ---------------------------------------------------- |
| `state`        | Full (masked) game state broadcast                   |
| `welcome`      | Confirms join, returns assigned player ID            |
| `ding`         | Another player rang the bell                         |
| `fuckoff`      | Another player sent a reaction                       |
| `customOutput` | Another player sent a custom TTS phrase              |
| `error`        | Connection/game error (e.g., "Removed by host")      |

### Game Flow

```
Lobby
  ↓ start (creator, ≥2 connected players)
Deal cards → Preflop (0 community cards)
  ↓ all connected players ready + all slots filled
Flop (3 community cards)
  ↓ all connected players ready + all slots filled
Turn (4 community cards)
  ↓ all connected players ready + all slots filled
River (5 community cards)
  ↓ all connected players ready + all slots filled
Reveal (flip worst→best)
  ↓ all hands flipped
Score calculated (inversion count)
  ↓ playAgain / endGame
Lobby (retains players, chat, and timer settings)
```

### Chip Move Semantics

The server classifies every `proposeChipMove` into one of three kinds based on the current ranking:

- **Acquire**: initiator is unranked, recipient is ranked. If accepted, initiator takes recipient's slot; recipient becomes unranked.
- **Offer**: initiator is ranked, recipient is unranked. If accepted, initiator becomes unranked; recipient takes initiator's slot.
- **Swap**: both are ranked. If accepted, they trade slots.

If the ranking changes between proposal and acceptance (e.g., the initiator's hand was moved by another action), the proposal is auto-cancelled if the classification no longer matches.

### Scoring

Scoring runs through the mode's `HandEvaluator` (`src/modes/ding/evaluator.ts`), which is the only file that imports pokersolver:

- **True ranking** sorts hands strongest → weakest using pokersolver's best-5-of-7 evaluation.
- **True ranks** handle ties: hands with identical strength share the same rank number (e.g., two royal flushes both get rank 1, the next hand gets rank 2).
- **Inversion count** counts pairwise misorderings between the team's claimed ranking and the true ranking. A perfect board = 0 inversions.

### Strength Scaler

`src/modes/ding/scaler.ts` implements the AI-facing `StrengthScaler` and memoizes `buildPercentileMap` / `buildAbsoluteStrengthMap` by `(excludedSet, boardSig)`. Within a phase the percentile build (1,225 pokersolver evaluations) collapses to a single uncached call shared across all bots.

### Responsive Layout

The UI supports four viewport modes:

1. **Desktop** (default) — Full poker table with sidebar chat + requests
2. **Mobile Landscape** (`max-height: 500px`, landscape) — Compressed layout with table on left, requests/chat on right
3. **Mobile Portrait** (`max-width: 767px`, portrait) — Stacked layout with bottom sheet for requests
4. **Portrait Warning** — Blocks gameplay on very small portrait screens; asks user to rotate

Seat positions are computed on an ellipse via `seatLayout.ts`. The current player is always anchored at the bottom center.

The lobby is height-bounded (`h-[100dvh]`) and fits inside a 720px viewport without scrolling: empty seats collapse into a single "N seats open" line, settings groups use compact pill toggles, and the felt showpiece is hidden under the `md` breakpoint so the right rail's roster + settings + Start button always remain visible.

---

## Project Structure

```
ding/
├── README.md              # This file
├── AGENTS.md              # Developer onboarding guide
├── package.json
├── next.config.js
├── partykit.json          # PartyKit deployment config
├── tsconfig.json
├── vitest.config.ts
├── tailwind.config.ts     # consumes src/lib/tokens.ts
├── postcss.config.js
│
├── party/                              # PartyKit server
│   ├── index.ts                        # DingServer (thin orchestrator)
│   ├── state.ts                        # ServerGameState + masking + MaskBroadcaster
│   ├── types.ts                        # Server-only types (BotActionLogEntry, BotActionAudit)
│   ├── scoring.ts                      # Legacy scoring (still exported for scripts)
│   ├── solver.ts                       # Legacy pokersolver wrapper
│   ├── bots.ts                         # BotController (timer + fast-tick modes)
│   ├── botAudit.ts                     # Post-game audit of bot actions
│   ├── pipeline/
│   │   └── dispatch.ts                 # The single funnel: validate → apply → bump gen → log → invariants
│   ├── server/
│   │   ├── connectionManager.ts        # WebSocket map + lookups
│   │   ├── roomStorage.ts              # Versioned persist + migration
│   │   ├── alarmScheduler.ts           # DO alarms with dirty-bit gating
│   │   └── lobbySweeper.ts             # Evict disconnected lobby ghosts
│   ├── state/
│   │   ├── invariants.ts               # Composable invariant rules
│   │   └── migrate.ts                  # STATE_VERSION + migrateState
│   └── handlers/                       # Message handlers (consumed by reducers)
│       ├── types.ts                    # Handler context + result types
│       ├── lobby.ts                    # configure, start, kick, leave, addBot
│       ├── ranking.ts                  # move, swap, unclaim, transferOwnChip
│       ├── trading.ts                  # propose/accept/reject/cancel chip moves
│       ├── lifecycle.ts                # ready, flip, playAgain, endGame
│       └── social.ts                   # ding, fuckoff, chat, customOutput
│
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # Root layout (fonts, viewport)
│   │   ├── page.tsx                    # Home page (create/join room)
│   │   ├── globals.css
│   │   └── room/[code]/page.tsx        # Room shell (~40 LOC; mounts GameSession)
│   │
│   ├── contexts/
│   │   └── GameSession.tsx             # Socket lifecycle + identity + notifications
│   │
│   ├── components/
│   │   ├── GameModeRouter.tsx          # Phase-driven view dispatch
│   │   ├── NotificationToasts.tsx      # Single ding/fuckoff toast strip
│   │   ├── LoadingScreen.tsx
│   │   ├── ConnectionErrorScreen.tsx
│   │   ├── Lobby.tsx                   # Lobby UI (height-bounded, fits 720px)
│   │   ├── GameBoard.tsx               # Layout orchestrator by viewport
│   │   ├── PokerTable.tsx              # Felt + seats + community cards
│   │   ├── Reveal.tsx                  # Reveal phase orchestration
│   │   ├── ChatPanel.tsx               # memoized chat rows
│   │   ├── ReadyButton.tsx
│   │   ├── NameModal.tsx               # Focus-trapped name entry
│   │   ├── CardFace.tsx
│   │   ├── RankChip.tsx                # memoized
│   │   ├── VolumeControl.tsx
│   │   ├── CustomOutputButton.tsx
│   │   └── game/
│   │       ├── DesktopBoard.tsx        # Composes 6 desktop/* children
│   │       ├── MobileLandscapeBoard.tsx
│   │       ├── PortraitWarning.tsx
│   │       ├── Seat.tsx                # Composes seat/* children
│   │       ├── seat/
│   │       │   ├── SeatNameRow.tsx
│   │       │   ├── SeatFlipPrompt.tsx
│   │       │   ├── SeatHand.tsx
│   │       │   ├── SeatRankChip.tsx
│   │       │   ├── SeatHistoryStrip.tsx
│   │       │   └── SeatHandSlot.tsx
│   │       ├── desktop/
│   │       │   ├── BoardHeader.tsx
│   │       │   ├── BoardChromeDock.tsx
│   │       │   ├── BoardInstructionHint.tsx
│   │       │   ├── MyHandsDock.tsx
│   │       │   ├── ReadyPill.tsx
│   │       │   └── RequestsSidebar.tsx
│   │       ├── BoardSlots.tsx
│   │       ├── DisplayChip.tsx
│   │       ├── FeltBackground.tsx
│   │       ├── GameTimer.tsx
│   │       ├── HistoryStrip.tsx
│   │       ├── RequestItem.tsx         # memoized
│   │       ├── RequestItemDesktop.tsx
│   │       ├── RequestItemMobileLandscape.tsx
│   │       ├── RequestItemMobilePortrait.tsx
│   │       ├── requestLabel.ts
│   │       ├── TableFelt.tsx
│   │       ├── RevealResults.tsx
│   │       └── reveal/
│   │           ├── RevealHeader.tsx
│   │           ├── RevealRow.tsx
│   │           ├── InversionsGraph.tsx
│   │           ├── AccuracySidebar.tsx
│   │           └── BotActionAuditPanel.tsx
│   │
│   ├── hooks/
│   │   ├── useGameBoard.ts             # Main game board hook (layout + actions)
│   │   └── useRankingActions.ts        # Optimistic ranking + selection logic
│   │
│   ├── lib/
│   │   ├── types.ts                    # Shared client/server types
│   │   ├── constants.ts                # Limits, phases, PHASES_META
│   │   ├── tokens.ts                   # Single design-token source (gold, felt, ranks)
│   │   ├── theme.ts                    # Legacy `D` alias re-exported from tokens
│   │   ├── chipColors.ts               # Rank-chip palette (consumes tokens)
│   │   ├── utils.ts                    # Room codes, card string conversion
│   │   ├── deckUtils.ts                # Deck creation, shuffle, dealing
│   │   ├── chipMove.ts                 # Chip move classification + application
│   │   ├── seatLayout.ts               # Elliptical seat positioning math
│   │   ├── sound.ts                    # Web Audio ding + TTS fuckoff/customOutput
│   │   ├── reveal/leaderboard.ts       # Per-player accuracy rows
│   │   ├── gameMode/
│   │   │   └── types.ts                # GameMode contract (HandEvaluator, StrengthScaler, …)
│   │   └── ai/                         # Bot AI system
│   │       ├── strategy.ts             # decideAction orchestrator
│   │       ├── context.ts              # Per-tick caches (PerTickCaches)
│   │       ├── handStrength.ts         # Current made-hand + preflop tier scoring
│   │       ├── handClassifier.ts       # Hand texture classification
│   │       ├── belief.ts               # Belief state (teammate strength inference)
│   │       ├── range.ts                # Range belief (combo distributions)
│   │       ├── ev.ts                   # Expected-value scoring (inversion reduction)
│   │       ├── personality.ts          # Trait generation + pacing
│   │       ├── archetypes.ts           # Personality archetype presets
│   │       ├── trace.ts                # Bot decision trace event types
│   │       ├── evaluation/
│   │       │   ├── modifiers/index.ts  # utility/anchor/spread/order-pres/proportionate
│   │       │   └── strengthFallback.ts # getEstimate (cached own-hand strength)
│   │       └── selection/
│   │           └── readyGate.ts        # canPropose gate
│   │
│   ├── modes/
│   │   ├── registry.ts                 # Client-side mode registry
│   │   └── ding/
│   │       ├── index.ts                # Public exports + DING_MODE_ID
│   │       ├── view.ts                 # Registers Ding's GameModeView
│   │       ├── phases.ts               # PhaseSpec[] for Ding
│   │       ├── evaluator.ts            # HandEvaluator (only file importing pokersolver)
│   │       ├── scaler.ts               # StrengthScaler with board-sig memo
│   │       ├── reveal.ts               # Reveal helpers (flip order, score)
│   │       ├── trading.ts              # Re-export of chipMove helpers
│   │       └── reducers/               # One reducer per ClientMessage + dingReducers table
│   │           ├── index.ts
│   │           ├── types.ts
│   │           └── {move,swap,unclaim,transferOwnChip,
│   │                proposeChipMove,acceptChipMove,rejectChipMove,cancelChipMove,
│   │                ready,flip,playAgain,endGame,
│   │                configure,addBot,start,kick,leave,
│   │                ding,fuckoff,chat,customOutput}.ts
│   │
│   └── types/
│       └── pokersolver.d.ts            # Type declarations for pokersolver
│
├── tests/
│   ├── unit/                           # Vitest unit tests
│   │   ├── scoring.test.ts
│   │   ├── handStrength.test.ts
│   │   ├── deckUtils.test.ts
│   │   ├── handClassifier.test.ts
│   │   ├── beliefTracking.test.ts
│   │   ├── botAudit.test.ts
│   │   ├── botPersonality.test.ts
│   │   ├── botStrategy.test.ts
│   │   ├── lobbyGhosts.test.ts
│   │   ├── roundTimer.test.ts
│   │   ├── stubbornness.test.ts
│   │   └── trading.test.ts
│   └── shared/                         # Test factories + assertions + mocks
│
└── scripts/                            # Simulation & benchmarking
    ├── lib/harness.ts                  # FakeConn, makeFakeRoom, argOr, action stats, median/mean
    ├── simulate.ts                     # Timer-driven N-game bot simulation
    ├── simulateFast.ts                 # Fast simulation + trace harness
    ├── playAgainst.ts                  # Human-vs-bot simulation
    ├── beliefAccuracy.ts               # Belief system accuracy benchmark
    ├── debugOne.ts                     # Single-game debug output
    └── aiParity.ts                     # Capture/compare AI behavior baselines
```

---

## AI & Bots

Bots are first-class server-side `Player` records with `isBot: true`. They never open a WebSocket — `BotController` schedules their actions and routes them through the same `dispatchAction` pipeline as humans.

### Decision Pipeline

Every bot tick follows three stages:

```
1. Perception  → Update BeliefState from public placements + trades
2. Evaluation  → Score candidate actions by team-EV (inversion reduction)
3. Selection   → Softmax over top actions, modulated by Traits
```

A `PerTickCaches` object created at the top of `decideAction` (`src/lib/ai/context.ts`) memoizes per-hand strength lookups so repeated `scoreAction` calls within the tick don't recompute the same values.

### Subsystems

**Hand Strength Estimation** (`src/lib/ai/handStrength.ts`):
- Preflop: strategy-guide tier scoring where every pair beats every non-pair, `23` is bottom, suits/connectors ignored
- Postflop: current made-hand scoring, not future-card draw equity
- Monte Carlo `estimateStrength()` remains for standalone analysis but the bot's own hand estimates use `currentHandStrength()`

**Hand Classification** (`src/lib/ai/handClassifier.ts`):
- Detects made hands, draws (flush, straight, gutshot), overcards
- Computes stability score (how much hand rank can change with future cards)

**Belief State** (`src/lib/ai/belief.ts`):
- Maintains a posterior over each teammate hand's strength in [0, 1]
- Updates from observed slot placements, weighted by phase reliability
- Tracks slot stability, cross-phase consistency, churn rate
- Calibrates teammate `skillPrior` at reveal based on placement accuracy
- Routes percentile/abs-strength builds through `dingScaler` so bots share the cached map

**Range Belief** (`src/lib/ai/range.ts`):
- Maintains weighted distributions over plausible 2-card hole combos
- Builds per-board percentile maps (cached by the scaler)
- Bayesian updates from placements (Gaussian likelihood)
- Pruned by exclusions (board cards, own hands, flipped hands)

**EV Scoring** (`src/lib/ai/ev.ts`):
- `expectedInversions(ranking, strengthFn)` — pairwise misorderings + positional alignment + unclaimed penalties
- `scoreAction(state, afterRanking, …, caches?)` — `teamInversionDelta` + `confidence`; per-tick cache memoizes `strengthOf` lookups
- Trust-blended scoring for evaluating incoming proposals

**Score Modifiers** (`src/lib/ai/evaluation/modifiers/index.ts`):
- `utilityFor`, `anchorBonus`, `isAnchorMoveCandidate`, `spreadPenalty`, `orderPreservationBonus`, `isProportionateProposal`

**Selection Gates** (`src/lib/ai/selection/readyGate.ts`):
- `canPropose` — hard cap on outgoing proposals + EV/confidence floor

**Personality** (`src/lib/ai/personality.ts` + `archetypes.ts`):
- 10 archetypes: anchor, deliberator, helper, quiet, professor, gut, newbie, worrier, optimist, skeptic
- Traits: Big-Five (openness, conscientiousness, extraversion, agreeableness, neuroticism) + Ding-specific (skill, decisiveness, trust, helpfulness, stubbornness) + pacing (think time, hesitation probability)
- Archetype quirks alter strategy thresholds; Ding/Fuckoff remain table-talk and are not bot strategy signals

### Bot Controller

`party/bots.ts` manages bot lifecycles:

- **Timer mode** (`notifyStateChanged`): per-bot think ticks with personality-scaled delays. Supports hesitation, bot-to-bot trade acceleration (10× faster), and action re-validation after delays.
- **Fast mode** (`fastTickAll`): direct synchronous ticks for simulation scripts — no timers, no delays.

Bots reconnect transparently if all humans disconnect and one reconnects.

---

## Development

```bash
# Install dependencies
npm install

# Start dev servers (Next.js on :3000, PartyKit on :1999)
npm run dev

# Start PartyKit dev server only
npm run party:dev
```

### Environment Variables

- `NEXT_PUBLIC_PARTYKIT_HOST` — PartyKit host (default: `localhost:1999` for dev)

---

## Testing

```bash
# Watch mode
npm test

# One-shot (CI)
npm run test:run

# Vitest UI
npm run test:ui

# Coverage report
npm run test:coverage
```

Test configuration is in `vitest.config.ts`. Tests run in a Node environment with path aliases (`@/` → `src/`, `@tests/` → `tests/`). The TypeScript build (`tsconfig.json`) excludes `tests/` so production strictness flags don't gate on test fixtures.

### Test Coverage Areas

- `scoring.test.ts` — True ranking, tie handling, inversion counting
- `handStrength.test.ts` — Preflop guide tiers, current made-hand scoring, Monte Carlo helper edge cases
- `deckUtils.test.ts` — Deck creation, shuffle randomness, dealing correctness
- `handClassifier.test.ts` — Draw detection, made hand classification
- `beliefTracking.test.ts` — Belief state updates, skill calibration
- `botAudit.test.ts` — Post-game bot action audit verdicts
- `botPersonality.test.ts` — Trait generation + archetype patches
- `botStrategy.test.ts` — `decideAction` end-to-end shape checks
- `lobbyGhosts.test.ts` — Disconnected lobby player eviction
- `roundTimer.test.ts` — Round-timer auto-ready
- `stubbornness.test.ts` — Bot stubbornness behavior in trades
- `trading.test.ts` — Chip move classification and application

---

## Simulation & Benchmarking

Headless harnesses drive N-game batches through the same server/bot plumbing. Shared utilities (`FakeConn`, `makeFakeRoom`, arg parsing, action-stat ledgers, `median`/`mean`) live in `scripts/lib/harness.ts`.

```bash
# Full simulation with per-game stats + aggregate metrics
npx tsx scripts/simulate.ts --games 50 --bots 5 --hands 4

# Fast simulation (no timers, synchronous bot ticks)
npx tsx scripts/simulateFast.ts --games 100 --bots 4 --hands 3

# Belief accuracy benchmark
npx tsx scripts/beliefAccuracy.ts --games 100

# Debug single game with full state dumps
npx tsx scripts/debugOne.ts

# Human-vs-bot simulation (headless)
npx tsx scripts/playAgainst.ts --games 50 --bots 4 --hands 2

# Capture / compare AI behavior baseline (use to gate AI refactors)
npx tsx scripts/aiParity.ts --capture --out tmp/ai-baseline.json --games 100
npx tsx scripts/aiParity.ts --compare --in  tmp/ai-baseline.json --games 100
```

These are useful for:
- Benchmarking bot performance across archetypes
- Measuring belief system accuracy against ground truth
- Stress-testing the server with large game batches
- Tuning AI parameters (skill scaling, resignation curves, trade thresholds)
- Verifying AI refactors don't shift aggregate metrics beyond tolerance

---

## Deployment

Deploy the Next.js app to any standard host (e.g. Vercel).

Deploy the PartyKit server separately:

```bash
npm run party:deploy
```

Update `NEXT_PUBLIC_PARTYKIT_HOST` in your production environment to point to the deployed PartyKit host.

---

## Key Design Decisions

### Why a GameMode plugin contract?
The audit surfaced ~25 files with hardcoded poker semantics. Defining `GameMode<S, A>` lets the engine handle lobby/connection/persistence/broadcast generically and keeps Ding-specific logic (phases, evaluator, scaler, reducers, reveal) behind one folder. A second mode is one folder under `src/modes/` plus one registration line.

### Why PartyKit instead of Socket.io?
PartyKit provides managed WebSocket infrastructure with automatic room-scoped state, edge deployment, and simple local dev. No separate server process management. DO alarms replace `setInterval` for timer enforcement so the room hibernates cleanly.

### Why server-side bots?
Bots live entirely on the server as `Player` records with synthetic connection IDs. They receive the same masked state as humans and dispatch the same `ClientMessage` types through the same reducer table. This guarantees fairness and eliminates client-side bot desync.

### Why optimistic client state?
Selection + ranking feels instant even with network latency. The server validates and corrects, but the UI never blocks on the network for visual feedback.

### Why guide-tier preflop scoring instead of Monte Carlo?
Monte Carlo against random opponents on an empty board produces poor coordination signals. The strategy guide uses explicit tiers: pairs above non-pairs, then high-card tiers, with suits/connectors ignored.

### Why inversion count instead of rank correlation?
Inversions count pairwise mistakes, which is intuitive and locally explainable ("these two hands are swapped"). Rank correlation would obscure which specific hands caused the error.

### Why three chip move kinds?
Acquire/offer/swap emerged from playtesting as the minimal set covering all useful inter-player chip transfers without arbitrary "move any chip anywhere" complexity. The server auto-classifies proposals so players just tap two hands.

### Why personality instead of just skill?
A pure-skill bot would be deterministic and homogeneous. Personality archetypes vary pacing, trust, stubbornness, and a few strategy quirks while keeping decisions grounded in the same measurable EV model.

### Why a per-player JSON byte-compare in the broadcaster?
In chatty rooms most actions don't change every player's masked view. Comparing the serialized payload to the last one for that player and skipping `conn.send` on a hit removes the dominant cost.

### Why memoize `buildPercentileMap` by `(excludedSet, boardSig)`?
Each call evaluates 1,225 pokersolver hands. Within a phase the board doesn't change, so multiple bots calling perceiveState in the same tick collapse to a single uncached build.
