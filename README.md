# Ding

A multiplayer collaborative poker game where players work together to rank all hands in order of true strength across multiple betting rounds.

## How to Play

### Setup

- Create a room or join one with a 4-character room code
- Enter a display name when you join
- The room creator configures hands per player (1–6, capped based on player count) and starts the game once at least 2 players are present

### Phases

**Preflop → Flop → Turn → River → Reveal**

Community cards are progressively revealed (0, 3, 4, then 5 cards). Before advancing each phase, every player must fill every slot on the ranking board and ready up.

You can only see your own hole cards. Teammates' hands are face-down until the Reveal phase.

### Ranking Board

Each hand occupies one numbered slot (1 = best, N = worst). You rank all hands at the table — both yours and your teammates'. Every slot must be filled and every player must be ready before the phase advances.

### Chip Moves

There are three ways to move chips between players:

- **Acquire** — Request a teammate's chip for yourself
- **Offer** — Offer one of your chips to a teammate
- **Swap** — Propose exchanging your chip with a teammate's chip

They can accept or reject. Pending requests clear when the phase advances.

You can also move chips between your own hands directly, or unclaim a chip to return it to the board.

### Reveal

Hands flip one at a time, worst-ranked first. Only the hand's owner can flip it when it's their turn. After all hands are revealed, the inversion count is calculated.

### Winning

The team **wins** with a **perfect board** — every hand ranked exactly where it belongs according to true poker hand strength. Any inversions mean a loss.

The inversion count is a diagnostic metric showing how many pairwise rankings were wrong, useful for post-game discussion.

### Other Controls

- **Bell (Ding)** — Plays a synthesized chord for everyone in the room
- **Chat** — Persistent room chat, available throughout the game
- **Lobby kick** — The room creator can remove players before the game starts
- **Add bot** — The room creator can add AI bots (🤖) from the lobby. Bots place their chips, propose trades, ready up each phase, and flip their own hands in reveal. Kick them the same way you kick a human.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Multiplayer | [PartyKit](https://www.partykit.io/) (WebSocket server) |
| Drag and drop | [@dnd-kit](https://dndkit.com/) |
| Hand evaluation | [pokersolver](https://github.com/goldfire/pokersolver) |

### Architecture

**Server as single source of truth.** The PartyKit server (`party/index.ts`) holds the full unmasked game state — all hole cards, community cards, rankings, and chip positions. It validates every player action, computes true poker rankings via pokersolver, and broadcasts a masked view to each client that hides opponents' hole cards until they're flipped in the Reveal phase.

**Optimistic client state.** The Next.js client uses local optimistic state for drag-and-drop responsiveness. The server confirms or corrects after each action.

**Persistent player identity.** Each player is assigned a UUID (stored in sessionStorage) on first join. On reconnect, the server matches by this ID and restores the player's game state, so disconnects mid-round don't lose your seat. Kicked players are tracked by ID and blocked from rejoining.

**Reveal ordering.** The true ranking is computed from final 5-card hands plus community cards. Hands flip worst-to-best (last slot to first slot). Inversion count = number of pairwise ordering mistakes in the team's ranking vs. the true ranking.

**AI bots.** Bots live server-side as first-class `Player` records with `isBot: true` and synthetic connection IDs — they never open a WebSocket. A `BotController` (`party/bots.ts`) schedules per-bot think ticks after every state change; each tick calls a pure `decideAction` (`src/lib/ai/strategy.ts`) over the same masked view a human sees, and dispatches any resulting `ClientMessage` through the same action handler humans use. Strength estimates come from a Monte Carlo rollout (`src/lib/ai/handStrength.ts`) with a preflop heuristic fast path. Personalities (`aggression`, `stubbornness`, `chaos`, `greed`, pacing) add drama without changing the math brain.

A headless harness (`scripts/simulate.ts`) drives N-game batches through the same `DingServer`/`BotController` plumbing and prints per-game stats plus aggregate metrics:

```bash
npx tsx scripts/simulate.ts --games 50 --bots 5 --hands 4
```

## Development

```bash
npm install
npm run dev
```

Starts both the Next.js dev server (localhost:3000) and the PartyKit dev server (localhost:1999) concurrently.

## Deployment

Deploy the Next.js app to any standard host (e.g. Vercel). Deploy the PartyKit server separately:

```bash
npm run party:deploy
```
