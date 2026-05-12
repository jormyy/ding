import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import WebSocket from "ws";

import type { ClientMessage, GameState, ServerMessage } from "../src/lib/types";

type PhaseName = "dealChoice" | "preflop" | "flop" | "turn" | "river" | "reveal";

const modeId = arg("--mode");
const room = arg("--room");
const alphaPid = arg("--alpha-pid");
const session = process.env.AGENT_BROWSER_SESSION;

if (!modeId || !room || !alphaPid || !session) {
  throw new Error("Usage: AGENT_BROWSER_SESSION=<name> npx tsx scripts/browserCanary.ts --mode <id> --room <code> --alpha-pid <pid>");
}

const outDir = join("sim", "screens", modeId);
mkdirSync(outDir, { recursive: true });
const capturedPhases: string[] = [];

class RoomClient {
  state: GameState | null = null;
  playerId: string | null = null;
  private socket: WebSocket;
  private waiters: Array<() => void> = [];

  constructor(
    readonly pid: string,
    readonly name: string
  ) {
    this.socket = new WebSocket(`ws://localhost:1999/parties/main/${room}`);
    this.socket.addEventListener("open", () => {
      this.send({ type: "join", pid: this.pid, name: this.name });
    });
    this.socket.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data)) as ServerMessage;
      if (msg.type === "welcome") this.playerId = msg.playerId;
      if (msg.type === "state") this.state = msg.state;
      this.flushWaiters();
    });
  }

  send(msg: ClientMessage): void {
    this.socket.send(JSON.stringify(msg));
  }

  close(): void {
    this.socket.close();
  }

  async waitFor(predicate: (state: GameState) => boolean, label: string, timeoutMs = 10_000): Promise<GameState> {
    const started = Date.now();
    for (;;) {
      if (this.state && predicate(this.state)) return this.state;
      if (Date.now() - started > timeoutMs) throw new Error(`Timed out waiting for ${label}`);
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
        setTimeout(resolve, 50);
      });
    }
  }

  private flushWaiters(): void {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) waiter();
  }
}

async function main(): Promise<void> {
  const alpha = new RoomClient(alphaPid, "Alpha");
  const bravo = new RoomClient(`canary-${room.toLowerCase()}-bravo`, "Bravo");
  const clients = [alpha, bravo];

  try {
    await alpha.waitFor((state) => state.players.length >= 2 && state.phase === "lobby", "two lobby players");
    alpha.send({ type: "configure", modeId, handsPerPlayer: 1 });
    await alpha.waitFor((state) => state.modeId === modeId && state.handsPerPlayer === 1, "mode configured");
    alpha.send({ type: "start" });
    await alpha.waitFor((state) => state.phase !== "lobby", "game start");

    if (alpha.state?.phase === "dealChoice") {
      await chooseDealCards(alpha, clients);
      await alpha.waitFor((state) => state.phase === "preflop", "deal-choice completion");
      screenshot("deal-choice");
    }

    for (const phase of ["preflop", "flop", "turn", "river"] satisfies PhaseName[]) {
      await alpha.waitFor((state) => state.phase === phase, phase);
      screenshot(phase);
      await rankAndReady(alpha, clients);
    }

    await alpha.waitFor((state) => state.phase === "reveal", "reveal");
    screenshot("reveal");
    await flipAll(alpha, clients);
    const finalState = await alpha.waitFor((state) => state.phase === "reveal" && state.score !== null, "score");
    screenshot("reveal-results");

    writeFileSync(
      join(outDir, "canary.json"),
      `${JSON.stringify(
        {
          modeId,
          room,
          score: finalState.score,
          trueRanking: finalState.trueRanking,
          trueRanks: finalState.trueRanks,
          phases: capturedPhases,
        },
        null,
        2
      )}\n`
    );
    console.log(`[canary] ${modeId} completed with score=${finalState.score}`);
  } finally {
    for (const client of clients) client.close();
  }
}

async function chooseDealCards(alpha: RoomClient, clients: RoomClient[]): Promise<void> {
  const state = await alpha.waitFor((candidate) => candidate.phase === "dealChoice", "deal choice");
  for (const hand of state.hands) {
    const owner = clientForHand(clients, hand.playerId);
    const choice = state.dealChoices?.[hand.id];
    if (!owner || !choice) continue;
    const indexes = Array.from({ length: choice.keepCards }, (_value, index) => index);
    owner.send({ type: "chooseDealCards", handId: hand.id, indexes });
  }
}

async function rankAndReady(alpha: RoomClient, clients: RoomClient[]): Promise<void> {
  const state = alpha.state;
  if (!state) throw new Error("No state to rank");
  for (let index = 0; index < state.hands.length; index++) {
    const hand = state.hands[index];
    const owner = clientForHand(clients, hand.playerId);
    if (owner) owner.send({ type: "move", handId: hand.id, toIndex: index });
  }
  await alpha.waitFor((candidate) => candidate.ranking.every(Boolean), "filled ranking");
  for (const client of clients) client.send({ type: "ready", ready: true });
}

async function flipAll(alpha: RoomClient, clients: RoomClient[]): Promise<void> {
  for (;;) {
    const state = alpha.state;
    if (!state) throw new Error("No state to flip");
    if (state.score !== null) return;
    const currentRevealIdx = state.ranking.length - 1 - state.revealIndex;
    const handId = state.ranking[currentRevealIdx];
    if (!handId) {
      alpha.send({ type: "flip", handId: "" });
    } else {
      const hand = state.hands.find((candidate) => candidate.id === handId);
      const owner = hand ? clientForHand(clients, hand.playerId) : null;
      (owner ?? alpha).send({ type: "flip", handId });
    }
    await alpha.waitFor((candidate) => candidate.revealIndex > state.revealIndex || candidate.score !== null, "next flip");
  }
}

function screenshot(name: string): void {
  execFileSync("agent-browser", ["screenshot", join(outDir, `${name}.png`), "--full"], {
    env: { ...process.env, AGENT_BROWSER_SESSION: session },
    stdio: "inherit",
  });
  capturedPhases.push(name);
}

function clientForHand(clients: RoomClient[], playerId: string): RoomClient | null {
  return clients.find((client) => client.playerId === playerId || client.pid === playerId) ?? null;
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
