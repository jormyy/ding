// Headless audit harness — drives N games with bots against DingServer.
//
// Usage: npx tsx scripts/simulate.ts --games 50 --bots 5 --hands 4
//
// Uses synthetic Party.Connection + Party.Room stubs. The simulator plays
// the "creator" slot (a faux-human) while DingServer's BotController drives
// the remaining bots. The creator ticks itself using the same decideAction
// brain, so the whole table is AI.

import DingServer, { buildClientState, type ServerGameState } from "../party/index";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import { randomPersonality, type Personality } from "../src/lib/ai/personality";
import type { ClientMessage, ServerMessage } from "../src/lib/types";

// ---- arg parsing ----
function argOr(name: string, fallback: number): number {
  const i = process.argv.indexOf("--" + name);
  if (i === -1) return fallback;
  return Number(process.argv[i + 1]);
}

const NUM_GAMES = argOr("games", 10);
const NUM_BOTS = argOr("bots", 4);        // bots added via addBot
const HANDS = argOr("hands", 2);
const NSIMS = argOr("nSims", 20);          // lower = faster sim
const VERBOSE = process.argv.includes("--verbose");

// ---- fake partykit stubs ----
class FakeConn {
  public closed = false;
  constructor(public id: string) {}
  send(_msg: string) {
    // Discard — we inspect state directly.
  }
  close() {
    this.closed = true;
  }
}

function makeFakeRoom(): {
  id: string;
  broadcast: (msg: string) => void;
  broadcastCount: () => number;
} {
  let count = 0;
  return {
    id: "sim-room",
    broadcast: (_msg: string) => {
      count++;
    },
    broadcastCount: () => count,
  };
}

// ---- stats ----
type Stats = {
  proposals: number;
  accepts: number;
  rejects: number;
  cancels: number;
  readies: number;
  flips: number;
  moves: number;
  swaps: number;
  unclaims: number;
  dings: number;
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

// ---- one game ----
async function runOneGame(gameIdx: number): Promise<{
  inversions: number | null;
  stats: Stats;
  integrityFailures: number;
}> {
  const stats = freshStats();
  let integrityFailures = 0;

  const room = makeFakeRoom();
  const server = new DingServer(room as never);

  // Wrap the bot dispatch to count actions
  const anyServer = server as unknown as {
    dispatchBotAction: (pid: string, msg: ClientMessage) => void;
    state: ServerGameState;
  };
  const origDispatch = anyServer.dispatchBotAction.bind(server);
  anyServer.dispatchBotAction = (pid: string, msg: ClientMessage) => {
    bump(stats, msg.type);
    origDispatch(pid, msg);
  };

  // Control "human" — creator, auto-plays like a bot.
  const ctl = new FakeConn("ctl-" + gameIdx);
  server.onConnect(ctl as never);
  server.onMessage(
    JSON.stringify({ type: "join", name: "Ctl", pid: "ctl-pid-" + gameIdx } as ClientMessage),
    ctl as never
  );

  for (let i = 0; i < NUM_BOTS; i++) {
    server.onMessage(JSON.stringify({ type: "addBot" } as ClientMessage), ctl as never);
  }

  server.onMessage(
    JSON.stringify({ type: "configure", handsPerPlayer: HANDS } as ClientMessage),
    ctl as never
  );

  server.onMessage(JSON.stringify({ type: "start" } as ClientMessage), ctl as never);

  const ctlPersonality: Personality = randomPersonality();
  const ctlMemo: BotMemo = newBotMemo();

  // Ctl-tick + timeout reaper loop
  const started = Date.now();
  const deadlineMs = 60000;

  while (true) {
    // Let bot setTimeouts fire
    await new Promise((r) => setTimeout(r, 50));

    // Integrity check
    const s = anyServer.state;
    const claimed = s.ranking.filter((x: string | null): x is string => x !== null);
    const unique = new Set(claimed);
    if (unique.size !== claimed.length) integrityFailures++;
    if (s.hands.length > 0 && s.ranking.length !== s.hands.length) {
      integrityFailures++;
    }

    // Done?
    if (s.phase === "reveal" && s.score !== null) break;

    // Drive control bot
    const masked = buildClientState(s, "ctl-pid-" + gameIdx);
    const msg = decideAction(masked, "ctl-pid-" + gameIdx, ctlPersonality, ctlMemo, {
      nSims: NSIMS,
    });
    if (msg) {
      bump(stats, msg.type);
      server.onMessage(JSON.stringify(msg), ctl as never);
    }

    if (Date.now() - started > deadlineMs) {
      // eslint-disable-next-line no-console
      console.warn(
        `[game ${gameIdx}] TIMEOUT diag phase=${s.phase} revealIdx=${s.revealIndex}/${s.hands.length} ` +
          `readyState=${s.players.map((p) => p.ready ? "R" : "-").join("")} ` +
          `ranking=[${s.ranking.map((r) => r ?? "_").join(",")}]`
      );
      return { inversions: null, stats, integrityFailures };
    }
  }

  const finalState = anyServer.state;
  return {
    inversions: finalState.score,
    stats,
    integrityFailures,
  };
}

// ---- aggregate ----
function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}
function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log(
    `Running ${NUM_GAMES} games: ${NUM_BOTS} bots + 1 ctrl, ${HANDS} hands/player, nSims=${NSIMS}`
  );

  const inversions: number[] = [];
  const allStats: Stats[] = [];
  let totalIntegrityFails = 0;
  let wins = 0;
  let timeouts = 0;

  for (let g = 0; g < NUM_GAMES; g++) {
    const { inversions: inv, stats, integrityFailures } = await runOneGame(g);
    totalIntegrityFails += integrityFailures;
    if (inv === null) {
      timeouts++;
      // eslint-disable-next-line no-console
      console.log(`[${g}] TIMEOUT  proposals=${stats.proposals} accepts=${stats.accepts} readies=${stats.readies}`);
      continue;
    }
    if (inv === 0) wins++;
    inversions.push(inv);
    allStats.push(stats);
    // eslint-disable-next-line no-console
    console.log(
      `[${g}] inv=${inv}  proposals=${stats.proposals} accepts=${stats.accepts} rejects=${stats.rejects} cancels=${stats.cancels} readies=${stats.readies} flips=${stats.flips} moves=${stats.moves} swaps=${stats.swaps} unclaims=${stats.unclaims} dings=${stats.dings}`
    );
  }

  const completed = inversions.length;
  const winRate = completed === 0 ? 0 : (wins / completed) * 100;
  const medInv = median(inversions);
  const meanProp = mean(allStats.map((s) => s.proposals));
  const acceptRate =
    allStats.reduce((a, s) => a + s.accepts, 0) /
    Math.max(1, allStats.reduce((a, s) => a + s.proposals, 0));

  const totalMoves = allStats.reduce((a, s) => a + s.moves, 0);
  const totalSwaps = allStats.reduce((a, s) => a + s.swaps, 0);
  const totalUnclaims = allStats.reduce((a, s) => a + s.unclaims, 0);
  const totalAcquires = allStats.reduce((a, s) => a + s.accepts, 0); // rough

  // eslint-disable-next-line no-console
  console.log("\n=== aggregate ===");
  // eslint-disable-next-line no-console
  console.log(`games completed         ${completed} / ${NUM_GAMES}  (timeouts: ${timeouts})`);
  // eslint-disable-next-line no-console
  console.log(`win rate (0 inversions) ${winRate.toFixed(1)}%`);
  // eslint-disable-next-line no-console
  console.log(`median inversions       ${medInv.toFixed(1)}`);
  // eslint-disable-next-line no-console
  console.log(`mean proposals / game   ${meanProp.toFixed(2)}`);
  // eslint-disable-next-line no-console
  console.log(`acceptance rate         ${(acceptRate * 100).toFixed(1)}%`);
  // eslint-disable-next-line no-console
  console.log(`integrity failures      ${totalIntegrityFails}`);
  // eslint-disable-next-line no-console
  console.log(
    `mechanic coverage       moves=${totalMoves} swaps=${totalSwaps} unclaims=${totalUnclaims} accepts=${totalAcquires}`
  );

  process.exit(totalIntegrityFails > 0 ? 1 : 0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
