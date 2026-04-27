// Fast headless simulation — drives N games with bots against DingServer
// WITHOUT setTimeout delays. Each bot ticks once per loop iteration.
//
// Usage: npx tsx scripts/fast-sim.ts --games 100 --bots 4 --hands 2 --nSims 10

import DingServer, { buildClientState } from "../party/index";
import type { ServerGameState } from "../party/state";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import { randomTraits, type Traits } from "../src/lib/ai/personality";
import type { ClientMessage, Player } from "../src/lib/types";
import type * as Party from "partykit/server";

const NUM_GAMES = arg("games", 20);
const NUM_BOTS = arg("bots", 4);
const HANDS = arg("hands", 2);
const NSIMS = arg("nSims", 10);

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf("--" + name);
  if (i === -1) return fallback;
  return Number(process.argv[i + 1]);
}

// ---- fake partykit stubs ----
class FakeConn {
  closed = false;
  constructor(public id: string) {}
  send(_msg: string) {}
  close() { this.closed = true; }
}
function asPartyConnection(c: FakeConn): Party.Connection {
  return c as unknown as Party.Connection;
}
function makeFakeRoom(): Party.Room {
  return {
    id: "sim-room",
    internalID: "sim-room",
    env: {} as Record<string, unknown>,
    context: {} as Party.ExecutionContext,
    broadcast: () => {},
    getConnections: () => ({ next: () => ({ done: true, value: undefined }) }) as unknown as Iterable<Party.Connection<unknown>>,
    getConnection: () => undefined,
    getMyAlarm: () => Promise.resolve(null),
    setAlarm: () => Promise.resolve(),
    deleteAlarm: () => Promise.resolve(),
    storage: {} as unknown as Party.Storage,
  };
}

type Stats = {
  proposals: number; accepts: number; rejects: number; cancels: number;
  readies: number; flips: number; moves: number; swaps: number;
  unclaims: number; dings: number;
};
function freshStats(): Stats {
  return {
    proposals: 0, accepts: 0, rejects: 0, cancels: 0,
    readies: 0, flips: 0, moves: 0, swaps: 0, unclaims: 0, dings: 0,
  };
}
function bump(s: Stats, type: ClientMessage["type"]): void {
  switch (type) {
    case "proposeChipMove": s.proposals++; break;
    case "acceptChipMove": s.accepts++; break;
    case "rejectChipMove": s.rejects++; break;
    case "cancelChipMove": s.cancels++; break;
    case "ready": s.readies++; break;
    case "flip": s.flips++; break;
    case "move": s.moves++; break;
    case "swap": s.swaps++; break;
    case "unclaim": s.unclaims++; break;
    case "ding": s.dings++; break;
  }
}

async function runOneGame(gameIdx: number): Promise<{
  inversions: number | null;
  stats: Stats;
  ticks: number;
}> {
  const stats = freshStats();
  let ticks = 0;

  const room = makeFakeRoom();
  const server = new DingServer(room);
  const typed = server as unknown as {
    dispatchBotAction: (pid: string, msg: ClientMessage) => void;
    botController: { fastTickAll: () => number };
    state: ServerGameState;
  };
  const origDispatch = typed.dispatchBotAction.bind(server);
  typed.dispatchBotAction = (pid: string, msg: ClientMessage) => {
    bump(stats, msg.type);
    origDispatch(pid, msg);
  };

  // Creator
  const ctl = new FakeConn("ctl-" + gameIdx);
  server.onConnect(asPartyConnection(ctl));
  server.onMessage(
    JSON.stringify({ type: "join", name: "Ctl", pid: "ctl-pid-" + gameIdx }),
    asPartyConnection(ctl)
  );
  for (let i = 0; i < NUM_BOTS; i++) {
    server.onMessage(JSON.stringify({ type: "addBot" }), asPartyConnection(ctl));
  }
  server.onMessage(
    JSON.stringify({ type: "configure", handsPerPlayer: HANDS }),
    asPartyConnection(ctl)
  );
  server.onMessage(JSON.stringify({ type: "start" }), asPartyConnection(ctl));

  const ctlTraits: Traits = randomTraits().traits;
  const ctlMemo: BotMemo = newBotMemo();
  const ctlPid = "ctl-pid-" + gameIdx;

  // Fast loop: no setTimeout
  const maxTicks = 2000;
  let stallTicks = 0;

  while (ticks < maxTicks) {
    ticks++;
    let actedThisRound = false;

    // Ctl acts
    const masked = buildClientState(typed.state, ctlPid);
    const msg = decideAction(masked, ctlPid, ctlTraits, ctlMemo, { nSims: NSIMS });
    if (msg) {
      bump(stats, msg.type);
      server.onMessage(JSON.stringify(msg), asPartyConnection(ctl));
      actedThisRound = true;
    }

    // All bots act fast
    const botActed = typed.botController.fastTickAll() as number;
    if (botActed > 0) actedThisRound = true;

    // Done?
    if (typed.state.phase === "reveal" && typed.state.score !== null) break;

    // Stall detection: if nothing happens for many ticks, force phase advance
    if (!actedThisRound) {
      stallTicks++;
    } else {
      stallTicks = 0;
    }

    // Emergency force-ready after extended idle
    if (stallTicks > 30) {
      const allRanked = typed.state.ranking.every((s: string | null) => s !== null);
      if (allRanked && typed.state.phase !== "lobby" && typed.state.phase !== "reveal") {
        for (const pid of (typed.botController.listPlayerIds() as string[])) {
          const p = typed.state.players.find((pl: Player) => pl.id === pid);
          if (p && !p.ready) {
            typed.dispatchBotAction(pid, { type: "ready", ready: true });
          }
        }
        const ctlPlayer = typed.state.players.find((p: Player) => p.id === ctlPid);
        if (ctlPlayer && !ctlPlayer.ready) {
          server.onMessage(JSON.stringify({ type: "ready", ready: true }), asPartyConnection(ctl));
        }
      }
      stallTicks = 0;
    }
  }

  if (ticks >= maxTicks) {
    console.warn(`[game ${gameIdx}] MAX TICKS phase=${typed.state.phase} ready=${typed.state.players.map(p => p.ready ? "R" : "-").join("")}`);
    return { inversions: null, stats, ticks };
  }

  return { inversions: typed.state.score, stats, ticks };
}

function mean(xs: number[]): number {
  return xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
}
function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

async function main() {
  console.log(`Fast sim: ${NUM_GAMES} games, ${NUM_BOTS} bots + ctl, ${HANDS} hands/player, nSims=${NSIMS}`);
  const start = Date.now();

  const inversions: number[] = [];
  const allStats: Stats[] = [];
  let wins = 0;
  let timeouts = 0;
  let totalTicks = 0;

  for (let g = 0; g < NUM_GAMES; g++) {
    const { inversions: inv, stats, ticks } = await runOneGame(g);
    totalTicks += ticks;
    if (inv === null) {
      timeouts++;
      console.log(`[${g}] TIMEOUT @${ticks}t  p=${stats.proposals} a=${stats.accepts} r=${stats.readies} m=${stats.moves}`);
      continue;
    }
    if (inv === 0) wins++;
    inversions.push(inv);
    allStats.push(stats);
    console.log(
      `[${g}] inv=${inv}  @${ticks}t  p=${stats.proposals} a=${stats.accepts} r=${stats.readies} m=${stats.moves} s=${stats.swaps} d=${stats.dings}`
    );
  }

  const elapsed = (Date.now() - start) / 1000;
  const completed = inversions.length;
  const winRate = completed === 0 ? 0 : (wins / completed) * 100;
  const medInv = median(inversions);
  const avgTicks = completed === 0 ? 0 : totalTicks / (completed + timeouts);

  console.log("\n=== aggregate ===");
  console.log(`completed / total    ${completed} / ${NUM_GAMES}  (timeouts: ${timeouts})`);
  console.log(`win rate (0 inv)     ${winRate.toFixed(1)}%`);
  console.log(`median inversions    ${medInv.toFixed(1)}`);
  console.log(`mean proposals/game  ${mean(allStats.map(s => s.proposals)).toFixed(2)}`);
  console.log(`avg ticks/game       ${avgTicks.toFixed(0)}`);
  console.log(`elapsed              ${elapsed.toFixed(1)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
