# Ding

A multiplayer collaborative poker game. Players work together to rank every hand at the table in true poker-strength order across preflop → flop → turn → river → reveal. A perfect ranking wins; any inversion loses.

## Quick start

```bash
npm install
npm run dev          # Next.js (:3000) + PartyKit (:1999)
```

Open http://localhost:3000, share the 6-character room code, ready up, play. Up to 8 players (humans or bots).

## How it plays

- Creator picks hands per player (1–6, capped so total ≤ 22), an optional game timer, and an optional round timer.
- Each phase: fill every slot on the ranking board (1 = best, N = worst), then ready up. Disconnected players don't block the phase.
- Move chips between players with **acquire** / **offer** / **swap** proposals. The recipient accepts or rejects; the initiator can cancel.
- Reveal flips hands worst-rank first. Owner flips by default; if the owner is offline, anyone can flip on their behalf so reveal doesn't stall.
- Score = inversion count (pairwise misorderings). 0 = perfect.

## Stack

| Layer        | Tech                                                      |
| ------------ | --------------------------------------------------------- |
| Framework    | Next.js 14 (App Router)                                   |
| Multiplayer  | [PartyKit](https://www.partykit.io/) (WebSocket server)   |
| Hand eval    | [pokersolver](https://github.com/goldfire/pokersolver)    |
| Styling      | Tailwind CSS                                              |

## Architecture in one paragraph

The PartyKit server is the single source of truth (`party/index.ts` is a thin orchestrator over `ConnectionManager`, `RoomStorage`, `AlarmScheduler`, `LobbySweeper`). Every player and bot action flows through one dispatcher (`party/pipeline/dispatch.ts`) that routes to a per-action reducer (`src/modes/ding/reducers.ts`), bumps `state.gen`, runs invariants, and lets `MaskBroadcaster` send each connection a per-player masked view (skipped when byte-identical to the previous broadcast). Mode-specific logic — phases, hand evaluation, strength scoring, reveal — lives behind a `GameMode` plugin contract (`src/lib/gameMode/types.ts`) under `src/modes/ding/`. Adding a second mode is one folder + one registry line.

The client mounts a `GameSessionProvider` (socket lifecycle + identity + notifications) and routes phases through `GameModeRouter`. The lobby is height-bounded and fits a 720px viewport without scrolling.

## Project layout

```
party/        PartyKit server (orchestrator + pipeline + state + handlers)
src/app/      Next.js App Router pages
src/components/, src/contexts/, src/hooks/   UI + hooks
src/lib/      Shared types, constants, design tokens, AI, gameMode/ subsystem
src/modes/    Per-mode implementations (ding/ today)
```

## Common commands

```bash
npm run dev          # both dev servers
npm run build        # production build
npm run party:deploy # deploy PartyKit
```

## Where to look next

- **`AGENTS.md`** — full developer guide: pipeline, GameMode contract, AI internals, common tasks, troubleshooting.
- **`src/lib/gameMode/`** — the GameMode contract, the 328-mode catalogue (declarative YAML + codegen), and shared deal/showdown/visibility helpers. The dealChoice variant registry lives at `src/lib/gameMode/dealChoices/`; per-mechanic phase-effect handlers live under `party/effects/`. `npm run modes:check` is the umbrella gate: codegen drift + handler-contract audit + `verify-mechanics --strict`.
- **`src/modes/ding/`** — Ding-specific runtime implementation.

## Deployment

Deploy the Next.js app to any standard host (e.g. Vercel). Deploy the PartyKit server separately:

```bash
npm run party:deploy
```

Set `NEXT_PUBLIC_PARTYKIT_HOST` in your production environment to point at the deployed PartyKit host.
