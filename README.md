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

- Create a room or join one with a 4-character room code
- Enter a display name when you join
- Supports up to 8 players (humans or bots)
- The room creator configures hands per player (1–6, capped based on player count) and starts the game once at least 2 players are present

### Phases

**Preflop → Flop → Turn → River → Reveal**

Community cards are progressively revealed:

| Phase | Community Cards | Visibility |
|-------|----------------|------------|
| Preflop | 0 | Hole cards only |
| Flop | 3 | +3 community cards |
| Turn | 4 | +1 community card |
| River | 5 | +1 community card |
| Reveal | 5 | Hands flip one at a time |

Before advancing each phase, every player must fill every slot on the ranking board and ready up.

You can only see your own hole cards. Teammates' hands are face-down until the Reveal phase.

### Ranking Board

Each hand occupies one numbered slot (1 = best, N = worst). You rank all hands at the table — both yours and your teammates'. Every slot must be filled and every player must be ready before the phase advances.

### Chip Moves

There are three ways to move chips between players:

- **Acquire** — Request a teammate's chip for yourself. Your unranked hand takes their slot; their hand becomes unranked.
- **Offer** — Offer one of your ranked chips to a teammate. Your hand becomes unranked; their unranked hand takes your slot.
- **Swap** — Propose exchanging your ranked chip with a teammate's ranked chip. Both hands keep their slots but trade positions.

They can accept or reject. Pending requests clear when the phase advances.

You can also move chips between your own hands directly, or unclaim a chip to return it to the board.

### Reveal

Hands flip one at a time, worst-ranked first (last slot to first slot). Only the hand's owner can flip it when it's their turn. If the owner is disconnected, the first connected player in sorted order can flip on their behalf. After all hands are revealed, the inversion count is calculated.

### Winning

The team **wins** with a **perfect board** — every hand ranked exactly where it belongs according to true poker hand strength. Any inversions mean a loss.

The inversion count is a diagnostic metric showing how many pairwise rankings were wrong, useful for post-game discussion.

### Other Controls

- **Bell (Ding)** — Plays a synthesized chord for everyone in the room
- **Fuck Off** — Plays a text-to-speech reaction for everyone
- **Chat** — Persistent room chat, available throughout the game
- **Lobby kick** — The room creator can remove players before the game starts
- **Add bot** — The room creator can add AI bots (🤖) from the lobby. Bots place their chips, propose trades, ready up each phase, and flip their own hands in reveal. Kick them the same way you kick a human.

---

## Architecture

### High-Level Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Multiplayer | [PartyKit](https://www.partykit.io/) (WebSocket server) |
| Drag and drop | [@dnd-kit](https://dndkit.com/) |
| Hand evaluation | [pokersolver](https://github.com/goldfire/pokersolver) |

### Client-Server Model

**Server as single source of truth.** The PartyKit server (`party/index.ts`) holds the full unmasked game state — all hole cards, community cards, rankings, and chip positions. It validates every player action, computes true poker rankings via pokersolver, and broadcasts a masked view to each client that hides opponents' hole cards until they're flipped in the Reveal phase.

**Optimistic client state.** The Next.js client uses local optimistic state for drag-and-drop responsiveness. The server confirms or corrects after each action. The `useRankingActions` hook manages the optimistic ranking updates and selection state (hand selection vs. slot selection).

**Persistent player identity.** Each player is assigned a UUID (stored in `sessionStorage`) on first join. On reconnect, the server matches by this ID and restores the player's game state, so disconnects mid-round don't lose your seat. Kicked players are tracked by ID and blocked from rejoining.

### State Masking

The server maintains `ServerGameState` with all cards visible. When broadcasting, it calls `buildClientState(playerId)` which:

1. Slices `allCommunityCards` to the correct count for the current phase
2. Strips `cards` from all `Hand` objects except:
   - The requesting player's own hands
   - Hands that have already been flipped during reveal

This ensures no client ever receives hole card data they shouldn't see.

### Message Protocol

**Client → Server (`ClientMessage`):**

| Type | Phase | Description |
|------|-------|-------------|
| `join` | any | Initial connection with name + persistent player ID |
| `configure` | lobby | Creator sets hands per player |
| `start` | lobby | Creator starts the game |
| `kick` | lobby | Creator removes a player |
| `leave` | lobby | Player leaves the room |
| `addBot` | lobby | Creator adds an AI bot |
| `move` | preflop–river | Place a hand at a board slot |
| `swap` | preflop–river | Swap two of your own ranked hands |
| `transferOwnChip` | preflop–river | Move a chip between two of your own hands |
| `unclaim` | preflop–river | Return your chip to the board |
| `proposeChipMove` | preflop–river | Initiate acquire/offer/swap with another player |
| `acceptChipMove` | preflop–river | Accept an incoming proposal |
| `rejectChipMove` | preflop–river | Reject an incoming proposal |
| `cancelChipMove` | preflop–river | Withdraw your own proposal |
| `ready` | preflop–river | Toggle ready state |
| `flip` | reveal | Flip your hand during reveal |
| `playAgain` | reveal | Creator resets to lobby, keeping players + chat |
| `endGame` | any | Creator aborts to lobby, keeping players + chat |
| `ding` | any | Play bell sound |
| `fuckoff` | any | Play reaction sound |
| `chat` | any | Send chat message |

**Server → Client (`ServerMessage`):**

| Type | Description |
|------|-------------|
| `state` | Full (masked) game state broadcast |
| `welcome` | Confirms join, returns assigned player ID |
| `ding` | Another player rang the bell |
| `fuckoff` | Another player sent a reaction |
| `error` | Connection/game error (e.g., "Removed by host") |

### Game Flow

```
Lobby
  ↓ start (creator, ≥2 connected players)
Deal cards → Preflop (0 community cards)
  ↓ all players ready + all slots filled
Flop (3 community cards)
  ↓ all players ready + all slots filled
Turn (4 community cards)
  ↓ all players ready + all slots filled
River (5 community cards)
  ↓ all players ready + all slots filled
Reveal (flip worst→best)
  ↓ all hands flipped
Score calculated (inversion count)
  ↓ playAgain / endGame
Lobby (retains players and chat history)
```

### Chip Move Semantics

The server classifies every `proposeChipMove` into one of three kinds based on the current ranking:

- **Acquire**: initiator is unranked, recipient is ranked. If accepted, initiator takes recipient's slot; recipient becomes unranked.
- **Offer**: initiator is ranked, recipient is unranked. If accepted, initiator becomes unranked; recipient takes initiator's slot.
- **Swap**: both are ranked. If accepted, they trade slots.

If the ranking changes between proposal and acceptance (e.g., the initiator's hand was moved by another action), the proposal is auto-cancelled if the classification no longer matches.

### Scoring

**True ranking** is computed by solving every hand's best 5-card combination against the full community cards using `pokersolver`, then sorting strongest to weakest.

**True ranks** handle ties: hands with identical strength share the same rank number (e.g., two royal flushes both get rank 1, the next hand gets rank 2).

**Inversion count** counts pairwise misorderings between the team's claimed ranking and the true ranking. A perfect board = 0 inversions.

### Responsive Layout

The UI supports four viewport modes:

1. **Desktop** (default) — Full poker table with sidebar chat + requests
2. **Mobile Landscape** (`max-height: 500px`, landscape) — Compressed layout with table on left, requests/chat on right
3. **Mobile Portrait** (`max-width: 767px`, portrait) — Stacked layout with bottom sheet for requests
4. **Portrait Warning** — Blocks gameplay on very small portrait screens; asks user to rotate

Seat positions are computed on an ellipse using `seatLayout.ts`. The current player is always anchored at the bottom center.

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
├── tailwind.config.ts
├── postcss.config.js
│
├── party/                 # PartyKit server
│   ├── index.ts           # Main server class (DingServer)
│   ├── state.ts           # ServerGameState + masking + broadcast
│   ├── scoring.ts         # True ranking, true ranks, inversion count
│   ├── solver.ts          # pokersolver wrapper
│   ├── bots.ts            # BotController (timer-based + fast-tick modes)
│   └── handlers/          # Message handlers
│       ├── index.ts       # Handler dispatch table
│       ├── types.ts       # Handler context + result types
│       ├── lobby.ts       # configure, start, kick, leave, addBot
│       ├── ranking.ts     # move, swap, unclaim, transferOwnChip
│       ├── trading.ts     # propose/accept/reject/cancel chip moves
│       ├── lifecycle.ts   # ready, flip, playAgain, endGame
│       └── social.ts      # ding, fuckoff, chat
│
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── layout.tsx     # Root layout (fonts, viewport)
│   │   ├── page.tsx       # Home page (create/join room)
│   │   ├── globals.css
│   │   └── room/
│   │       └── [code]/
│   │           └── page.tsx  # Room page (lobby/game/reveal)
│   │
│   ├── components/
│   │   ├── GameBoard.tsx      # Orchestrates board layout by viewport
│   │   ├── Lobby.tsx          # Pre-game lobby UI
│   │   ├── PokerTable.tsx     # Poker table + seats + community cards
│   │   ├── Reveal.tsx         # Reveal phase orchestration
│   │   ├── ChatPanel.tsx      # Room chat UI
│   │   ├── ReadyButton.tsx    # Ready toggle button
│   │   ├── NameModal.tsx      # Name entry on first join
│   │   ├── CardFace.tsx       # Single card visual
│   │   ├── RankChip.tsx       # Rank indicator chips
│   │   ├── VolumeControl.tsx  # Sound volume slider
│   │   └── game/              # Game sub-components
│   │       ├── DesktopBoard.tsx
│   │       ├── MobileLandscapeBoard.tsx
│   │       ├── PortraitWarning.tsx
│   │       ├── BoardSlots.tsx
│   │       ├── Seat.tsx
│   │       ├── TableFelt.tsx
│   │       ├── HistoryStrip.tsx
│   │       ├── RequestItem.tsx
│   │       └── reveal/
│   │           └── RevealResults.tsx
│   │
│   ├── hooks/
│   │   ├── useGameBoard.ts      # Main game board hook (layout + actions)
│   │   └── useRankingActions.ts # Optimistic ranking + selection logic
│   │
│   ├── lib/
│   │   ├── types.ts           # Shared TypeScript types
│   │   ├── constants.ts       # Game constants (limits, phases, labels)
│   │   ├── utils.ts           # Room codes, card string conversion
│   │   ├── deckUtils.ts       # Deck creation, shuffle, dealing
│   │   ├── chipMove.ts        # Chip move classification + application
│   │   ├── seatLayout.ts      # Elliptical seat positioning math
│   │   ├── sound.ts           # Web Audio ding + TTS fuckoff
│   │   ├── theme.ts           # Design tokens
│   │   ├── chipColors.ts      # Rank chip color utilities
│   │   └── ai/                # Bot AI system
│       │   ├── strategy.ts      # Main decision pipeline (perception → EV → selection)
│       │   ├── handStrength.ts  # Current made-hand + preflop tier scoring
│       │   ├── handClassifier.ts# Hand texture classification (draws, made hands)
│       │   ├── belief.ts        # Belief state: teammate hand strength inference
│       │   ├── range.ts         # Range belief: weighted hole-card combo distributions
│       │   ├── ev.ts            # Expected-value scoring (inversion reduction)
│       │   ├── personality.ts   # Trait generation + pacing
│       │   ├── archetypes.ts    # Personality archetype presets
│       │   └── trace.ts         # Bot decision trace event types
│   │
│   └── types/
│       └── pokersolver.d.ts   # Type declarations for pokersolver
│
├── tests/
│   ├── unit/                  # Vitest unit tests
│   │   ├── scoring.test.ts
│   │   ├── handStrength.test.ts
│   │   ├── deckUtils.test.ts
│   │   ├── handClassifier.test.ts
│   │   ├── beliefTracking.test.ts
│   │   ├── stubbornness.test.ts
│   │   └── trading.test.ts
│   └── shared/                # Test utilities
│
└── scripts/                   # Simulation & benchmarking
    ├── simulate.ts            # Timer-driven N-game bot simulation
    ├── simulateFast.ts        # Fast simulation + trace harness
    ├── playAgainst.ts         # Human-vs-bot simulation
    ├── beliefAccuracy.ts      # Belief system accuracy benchmark
    └── debugOne.ts            # Single-game debug output
```

---

## AI & Bots

Ding has a sophisticated cooperative AI system. Bots are first-class server-side `Player` records with `isBot: true`. They never open a WebSocket — the `BotController` schedules their actions.

### Decision Pipeline

Every bot tick follows a three-stage pipeline:

```
1. Perception  → Update BeliefState from public placements + trades
2. Evaluation  → Score candidate actions by team-EV (inversion reduction)
3. Selection   → Softmax over top actions, modulated by Traits
```

### Subsystems

**Hand Strength Estimation** (`handStrength.ts`):
- Preflop: strategy-guide tier scoring where every pair beats every non-pair, `23` is bottom, and suits/connectors are ignored
- Postflop: current made-hand scoring, not future-card draw equity
- Monte Carlo `estimateStrength()` remains available for standalone analysis, but the bot's own hand estimates use `currentHandStrength()`

**Hand Classification** (`handClassifier.ts`):
- Detects made hands, draws (flush, straight, gutshot), overcards
- Computes stability score (how much hand rank can change with future cards)
- Used to modulate confidence and readiness timing

**Belief State** (`belief.ts`):
- Maintains a posterior over each teammate hand's strength in [0,1]
- Updates from observed slot placements, weighted by phase reliability
- Tracks slot stability, cross-phase consistency, and churn rate
- Calibrates teammate `skillPrior` at reveal based on placement accuracy
- Includes habit tracking for overvaluation bias

**Range Belief** (`range.ts`):
- Maintains weighted distributions over plausible 2-card hole combos
- Builds per-board percentile maps using pokersolver
- Bayesian updates from placements (Gaussian likelihood)
- Pruned by exclusions (known cards from board, own hands, flipped hands)

**EV Scoring** (`ev.ts`):
- `expectedInversions(ranking, strengthFn)` computes pairwise misorderings + positional alignment + unclaimed penalties
- `scoreAction(state, afterRanking, ...)` returns `teamInversionDelta` and `confidence`
- Trust-blended scoring for evaluating incoming proposals

**Personality** (`personality.ts` + `archetypes.ts`):
- 10 archetypes: anchor, deliberator, helper, quiet, professor, gut, newbie, worrier, optimist, skeptic
- Traits: Big-Five (openness, conscientiousness, extraversion, agreeableness, neuroticism) + Ding-specific (skill, decisiveness, trust, helpfulness, stubbornness) + pacing (think time, hesitation probability)
- Archetype quirks alter strategy thresholds; Ding/Fuckoff remain table-talk and are not bot strategy signals

### Bot Controller

`party/bots.ts` manages bot lifecycles:

- **Timer mode** (`notifyStateChanged`): Schedules per-bot think ticks with delays scaled by personality. Supports hesitation (reconsideration pauses), bot-to-bot trade acceleration (10× faster), and action re-validation after delays.
- **Fast mode** (`fastTickAll`): Direct synchronous ticks for simulation scripts — no timers, no delays.

Bots reconnect transparently if the last human disconnects and reconnects.

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
# Run tests in watch mode
npm test

# Run tests once (CI)
npm run test:run

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

Test configuration is in `vitest.config.ts`. Tests run in a Node environment with path aliases (`@/` → `src/`, `@tests/` → `tests/`).

### Test Coverage Areas

- `scoring.test.ts` — True ranking, tie handling, inversion counting
- `handStrength.test.ts` — Preflop guide tiers, current made-hand scoring, Monte Carlo helper edge cases
- `deckUtils.test.ts` — Deck creation, shuffle randomness, dealing correctness
- `handClassifier.test.ts` — Draw detection, made hand classification
- `beliefTracking.test.ts` — Belief state updates, skill calibration
- `stubbornness.test.ts` — Bot stubbornness behavior in trades
- `trading.test.ts` — Chip move classification and application

---

## Simulation & Benchmarking

Headless harnesses drive N-game batches through the same server/bot plumbing:

```bash
# Full simulation with per-game stats + aggregate metrics
npx tsx scripts/simulate.ts --games 50 --bots 5 --hands 4

# Fast simulation (no timers, synchronous bot ticks)
npx tsx scripts/simulateFast.ts --games 100 --bots 4 --hands 3

# Belief accuracy benchmark
npx tsx scripts/beliefAccuracy.ts

# Debug single game with full state dumps
npx tsx scripts/debugOne.ts

# Human-vs-bot simulation (headless)
npx tsx scripts/playAgainst.ts
```

These are useful for:
- Benchmarking bot performance across archetypes
- Measuring belief system accuracy against ground truth
- Stress-testing the server with large game batches
- Tuning AI parameters (skill scaling, resignation curves, trade thresholds)

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

### Why PartyKit instead of Socket.io?
PartyKit provides managed WebSocket infrastructure with automatic room-scoped state, edge deployment, and simple local dev. No separate server process management.

### Why server-side bots?
Bots live entirely on the server as `Player` records with synthetic connection IDs. They receive the same masked state as humans and dispatch the same `ClientMessage` types through the same handlers. This guarantees fairness and eliminates client-side bot desync.

### Why optimistic client state?
Drag-and-drop feels instant even with network latency. The server validates and corrects, but the UI never blocks on the network for visual feedback.

### Why guide-tier preflop scoring instead of Monte Carlo?
Monte Carlo against random opponents on an empty board produces poor coordination signals. The strategy guide uses explicit tiers: pairs above non-pairs, then high-card tiers, with suits/connectors ignored.

### Why inversion count instead of rank correlation?
Inversions count pairwise mistakes, which is intuitive and locally explainable ("these two hands are swapped"). Rank correlation would obscure which specific hands caused the error.

### Why three chip move kinds?
Acquire/offer/swap emerged from playtesting as the minimal set covering all useful inter-player chip transfers without arbitrary "move any chip anywhere" complexity. The server auto-classifies proposals so players just tap two hands.

### Why personality instead of just skill?
A pure-skill bot would be deterministic and homogeneous. Personality archetypes vary pacing, trust, stubbornness, and a few strategy quirks while keeping decisions grounded in the same measurable EV model.
