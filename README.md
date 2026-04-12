# Ding

A multiplayer poker-based prediction game where players work together to rank hands across multiple betting rounds.

## How to Play

### Setup

- Create a room or join one with a 4-character room code
- The room creator can configure how many hands each player gets (1–6, limits apply based on player count)
- The game starts once the creator hits Start with at least 2 players

### Phases

Each game progresses through the standard poker betting rounds:

**Preflop → Flop → Turn → River → Reveal**

At each phase, community cards are revealed (0, 3, 4, then 5 cards). Before advancing, every player must rank all hands on the ranking board — slot 1 being the best hand, slot N being the worst.

You can only see your own hole cards. Teammates' hands are face-down until the Reveal phase.

### Ranking Board

Each hand occupies one numbered slot. You rank all hands at the table — both yours and your teammates'. Every slot must be filled before anyone can ready up and advance.

### Chip Requests

You can request a teammate's chip from any slot. They can accept or reject. If accepted, their chip moves to your position and your old chip opens up. Pending requests clear when the phase advances.

### Reveal

Hands flip one at a time, from worst-ranked to best-ranked. Only the hand's owner can flip it when it's their turn. Once all hands are revealed, scores are calculated.

### Winning

Ding is a collaborative game. The team **wins** by achieving a **perfect board** — every hand ranked exactly where it belongs. Any mistakes (inversions) mean the team loses.

The inversion count shown at the results screen is a diagnostic metric showing how many pair-orderings were wrong, useful for post-game discussion, but it doesn't change the outcome: perfect board or loss.

### Ding

Hit the bell button to play a sound for everyone in the room.

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

The PartyKit server is the single source of truth for all game state. It holds unmasked card data, validates all player actions, computes true poker rankings via pokersolver, and broadcasts masked state to each client (hiding opponent hole cards until reveal).

The Next.js client handles rendering and user interactions. Local optimistic state is used for drag-and-drop responsiveness; the server confirms or corrects after each action.

## Development

```bash
npm install
npm run dev
```

This starts both the Next.js dev server and the PartyKit dev server concurrently.

## Deployment

The Next.js app can be deployed to any standard host (e.g. Vercel). The PartyKit server deploys separately:

```bash
npx partykit deploy
```
