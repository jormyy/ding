// Fast headless harness — drives N games of bots without real-time setTimeouts.
//
// Why a separate harness: scripts/simulate.ts plays in real-time (each game
// takes minutes because BotController uses setTimeout). For benchmarking we
// only care about the bot brain's *decisions*, not pacing. This harness
// instantiates DingServer + BotController identically but the BotController's
// timer-based scheduling is bypassed: we round-robin tick each bot ourselves.
//
// Usage: npx tsx scripts/simulateFast.ts --games 100 --bots 4 --hands 2 --nSims 80

import DingServer, { buildClientState } from "../party/index";
import type { ServerGameState } from "../party/state";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import { randomTraits, type Traits } from "../src/lib/ai/personality";
import type { Archetype } from "../src/lib/ai/archetypes";
import type { ClientMessage } from "../src/lib/types";
import type * as Party from "partykit/server";

function argOr(name: string, fallback: number): number {
  const i = process.argv.indexOf("--" + name);
  if (i === -1) return fallback;
  return Number(process.argv[i + 1]);
}
function argFlag(name: string): boolean {
  return process.argv.indexOf("--" + name) !== -1;
}

const NUM_GAMES = argOr("games", 50);
const NUM_BOTS = argOr("bots", 4); // bots added via addBot
const HANDS = argOr("hands", 2);
const NSIMS = argOr("nSims", 80);
const VERBOSE = argFlag("verbose");
const SEED_BASE = argOr("seed", 0);
const ORACLE = argFlag("oracle");

class FakeConn {
  public closed = false;
  constructor(public id: string) {}
  send(_msg: string) {}
  close() { this.closed = true; }
}
function asPartyConnection(c: FakeConn): Party.Connection { return c as unknown as Party.Connection; }
function makeFakeRoom(): Party.Room {
  return {
    id: "sim-room", internalID: "sim-room",
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
  unclaims: number; dings: number; fuckoffs: number;
};
function freshStats(): Stats {
  return { proposals: 0, accepts: 0, rejects: 0, cancels: 0, readies: 0, flips: 0, moves: 0, swaps: 0, unclaims: 0, dings: 0, fuckoffs: 0 };
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
    case "fuckoff": s.fuckoffs++; break;
  }
}

// Minimal seeded shuffle override would require touching deckUtils. Skip —
// each game uses a fresh DingServer instance, so the deck is freshly shuffled
// (Math.random) each time.
void SEED_BASE;

type SimResult = {
  inversions: number | null;
  stats: Stats;
  integrityFailures: number;
  archetypes: Archetype[];
  ticks: number;
  // Diagnostic: ranking error broken down by class.
  ownInversions: number;        // misordered pairs where both hands are owned by the same bot (controllable)
  crossInversions: number;      // misordered pairs across players (cooperation)
};

async function runOneGame(gameIdx: number): Promise<SimResult> {
  const stats = freshStats();
  let integrityFailures = 0;

  const room = makeFakeRoom();
  const server = new DingServer(room);
  const typedServer = server as unknown as {
    dispatchBotAction: (pid: string, msg: ClientMessage) => void;
    state: ServerGameState;
    botController: {
      listPlayerIds: () => string[];
      isBot: (pid: string) => boolean;
    };
  };
  const origDispatch = typedServer.dispatchBotAction.bind(server);
  typedServer.dispatchBotAction = (pid: string, msg: ClientMessage) => {
    bump(stats, msg.type);
    origDispatch(pid, msg);
  };

  // Set up players: a "ctl" creator (also a bot brain) + NUM_BOTS bots.
  const ctl = new FakeConn("ctl-" + gameIdx);
  server.onConnect(asPartyConnection(ctl));
  const ctlPid = "ctl-pid-" + gameIdx;
  server.onMessage(JSON.stringify({ type: "join", name: "Ctl", pid: ctlPid }), asPartyConnection(ctl));
  for (let i = 0; i < NUM_BOTS; i++) {
    server.onMessage(JSON.stringify({ type: "addBot" }), asPartyConnection(ctl));
  }
  server.onMessage(JSON.stringify({ type: "configure", handsPerPlayer: HANDS }), asPartyConnection(ctl));
  server.onMessage(JSON.stringify({ type: "start" }), asPartyConnection(ctl));

  // Per-bot record, keyed by pid. The control "human" gets one too — same
  // brain; we just dispatch via onMessage instead of dispatchBotAction so
  // it goes through the human path.
  type Rec = { traits: Traits; memo: BotMemo; archetype: Archetype; isCtl: boolean };
  const recs = new Map<string, Rec>();
  recs.set(ctlPid, { ...randomTraits(), memo: newBotMemo(), isCtl: true });
  // Pull bot pids and reuse their existing traits/memos via reflection.
  // We cannot access BotController's internals directly here, but we can mirror
  // by giving each bot a fresh memo + new random traits — driving them through
  // dispatchBotAction. The brain is *stateful* across calls (memo), so we keep
  // our own memo per pid.
  const botPids = typedServer.botController.listPlayerIds();
  for (const pid of botPids) {
    recs.set(pid, { ...randomTraits(), memo: newBotMemo(), isCtl: false });
  }

  const archetypes = Array.from(recs.values()).map((r) => r.archetype);

  // Round-robin tick loop. Each iteration: every bot tries to act once.
  // A "wave" is one full pass. We bound ticks to avoid infinite loops.
  const MAX_TICKS = 4000;
  let ticks = 0;
  let tickWithoutActionStreak = 0;

  // For oracle mode, we precompute true ranking of each phase's hands and
  // overwrite each bot's belief.handStrength + memo.estimates so they have
  // perfect info. Recomputed every tick so phase transitions update the board.
  const setOracleBeliefs = (): void => {
    if (!ORACLE) return;
    const s2 = typedServer.state;
    const phasesWithCards = ["preflop", "flop", "turn", "river", "reveal"];
    if (!phasesWithCards.includes(s2.phase)) return;
    if (s2.hands.length === 0) return;
    // Use server's true ranking computer with current visible board cards.
    // We import via require to avoid circular imports.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { computeTrueRanking } = require("../party/scoring");
    // Use allCommunityCards so "oracle" really means full-information truth,
    // not the partial visibility a real player would have at preflop/flop.
    const board = s2.allCommunityCards.length > 0 ? s2.allCommunityCards : s2.communityCards;
    const ranking: string[] = computeTrueRanking(s2.hands, board);
    const N = ranking.length;
    const trueStrength = new Map<string, number>();
    for (let i = 0; i < ranking.length; i++) {
      // Map true rank to an absolute strength uniform in [0,1].
      trueStrength.set(ranking[i], 1 - i / Math.max(1, N - 1));
    }
    for (const [pid, rec] of recs) {
      // Pin estimatesPhase so decideAction doesn't clear our injected oracle
      // estimates on its phase-change check.
      rec.memo.estimatesPhase = s2.phase;
      for (const h of s2.hands) {
        const ts = trueStrength.get(h.id);
        if (ts === undefined) continue;
        if (h.playerId === pid) {
          rec.memo.estimates.set(h.id, ts);
        } else {
          // Set the per-teammate belief so perceiveState's update doesn't
          // overwrite oracle truth. We pin concentration high (mean is fixed,
          // weight ~ infinity).
          let tb = rec.memo.belief.perTeammate.get(h.playerId);
          if (!tb) {
            tb = { hands: new Map(), churnRate: 0, skillPrior: 1.0 };
            rec.memo.belief.perTeammate.set(h.playerId, tb);
          }
          tb.skillPrior = 1.0;
          let hb = tb.hands.get(h.id);
          if (!hb) {
            hb = { mean: ts, concentration: 999, lastSlot: null, slotStableFor: 999 };
            tb.hands.set(h.id, hb);
          } else {
            hb.mean = ts;
            hb.concentration = 999;
            hb.slotStableFor = 999;
          }
          rec.memo.belief.handStrength.set(h.id, ts);
          rec.memo.belief.handConfidence.set(h.id, 1.0);
        }
      }
    }
  };

  while (ticks < MAX_TICKS) {
    const s = typedServer.state;
    if (s.phase === "reveal" && s.score !== null) break;
    setOracleBeliefs();

    // Integrity: per-tick pulse of the ranking-duplicate check (only count
    // each unique violation, not per-tick).
    const claimed = s.ranking.filter((x): x is string => x !== null);
    if (new Set(claimed).size !== claimed.length) integrityFailures++;
    if (s.hands.length > 0 && s.ranking.length !== s.hands.length) integrityFailures++;

    // Iterate all current players (creator first, then bots, in stable order).
    let actedThisWave = false;
    const order = [ctlPid, ...botPids];
    for (const pid of order) {
      const rec = recs.get(pid);
      if (!rec) continue;
      const player = s.players.find((p) => p.id === pid);
      if (!player) continue;
      const masked = buildClientState(s, pid);
      const msg = decideAction(masked, pid, rec.traits, rec.memo, { nSims: NSIMS });
      if (!msg) continue;
      // Skip purely-expressive actions for benchmark speed (still counted).
      if (rec.isCtl) {
        bump(stats, msg.type);
        server.onMessage(JSON.stringify(msg), asPartyConnection(ctl));
      } else {
        typedServer.dispatchBotAction(pid, msg);
      }
      actedThisWave = true;
      // After each action, re-fetch state — phase may have advanced and
      // memo invariants may be different. Continue the wave anyway.
    }
    ticks++;
    tickWithoutActionStreak = actedThisWave ? 0 : tickWithoutActionStreak + 1;

    // Deadlock breaker: nobody acted for 5 waves -> attempt mass ready, else
    // bail.
    if (tickWithoutActionStreak >= 5) {
      const sNow = typedServer.state;
      if (sNow.phase === "reveal" && sNow.score !== null) break;
      // Force-ready everyone with all hands placed and table fully ranked.
      const fullyRanked = sNow.ranking.every((x) => x !== null);
      if (fullyRanked) {
        let nudged = false;
        for (const p of sNow.players) {
          if (p.connected && !p.ready) {
            // synthesize a ready
            if (p.id === ctlPid) {
              server.onMessage(JSON.stringify({ type: "ready", ready: true }), asPartyConnection(ctl));
            } else {
              typedServer.dispatchBotAction(p.id, { type: "ready", ready: true });
            }
            stats.readies++;
            nudged = true;
          }
        }
        if (nudged) { tickWithoutActionStreak = 0; continue; }
      }
      // Reveal phase stuck — try to flip the next hand for whoever owns it.
      if (sNow.phase === "reveal" && sNow.score === null) {
        const ri = sNow.ranking.length - 1 - sNow.revealIndex;
        const hid = sNow.ranking[ri];
        if (hid) {
          const owner = sNow.hands.find((h) => h.id === hid);
          if (owner) {
            if (owner.playerId === ctlPid) server.onMessage(JSON.stringify({ type: "flip", handId: hid }), asPartyConnection(ctl));
            else typedServer.dispatchBotAction(owner.playerId, { type: "flip", handId: hid });
            stats.flips++;
            tickWithoutActionStreak = 0;
            continue;
          }
        }
      }
      break; // give up
    }
  }

  const finalState = typedServer.state;

  // Diagnostic: split inversions into "controllable" (own pairs) vs cross-player.
  let ownInv = 0, crossInv = 0;
  if (finalState.trueRanking) {
    const truePos = new Map<string, number>();
    finalState.trueRanking.forEach((id, i) => truePos.set(id, i));
    const claimed = finalState.ranking.filter((x): x is string => x !== null);
    const handOwner = new Map<string, string>();
    for (const h of finalState.hands) handOwner.set(h.id, h.playerId);
    for (let i = 0; i < claimed.length; i++) {
      for (let j = i + 1; j < claimed.length; j++) {
        const ti = truePos.get(claimed[i])!;
        const tj = truePos.get(claimed[j])!;
        if (ti > tj) {
          if (handOwner.get(claimed[i]) === handOwner.get(claimed[j])) ownInv++;
          else crossInv++;
        }
      }
    }
  }

  if (VERBOSE) {
    // eslint-disable-next-line no-console
    console.log(`  archetypes: ${archetypes.join(",")}`);
  }
  return {
    inversions: finalState.score,
    stats,
    integrityFailures,
    archetypes,
    ticks,
    ownInversions: ownInv,
    crossInversions: crossInv,
  };
}

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
  console.log(`Running ${NUM_GAMES} games (FAST): ${NUM_BOTS} bots + 1 ctrl, ${HANDS} hands/player, nSims=${NSIMS}`);
  const inversions: number[] = [];
  const allStats: Stats[] = [];
  const archetypeWins = new Map<Archetype, { wins: number; games: number }>();
  let totalIntegrityFails = 0;
  let wins = 0;
  let timeouts = 0;
  let totalOwnInv = 0, totalCrossInv = 0;
  const startMs = Date.now();
  for (let g = 0; g < NUM_GAMES; g++) {
    const r = await runOneGame(g);
    totalIntegrityFails += r.integrityFailures;
    for (const a of r.archetypes) {
      const cur = archetypeWins.get(a) ?? { wins: 0, games: 0 };
      cur.games++;
      if (r.inversions === 0) cur.wins++;
      archetypeWins.set(a, cur);
    }
    if (r.inversions === null) {
      timeouts++;
      // eslint-disable-next-line no-console
      console.log(`[${g}] TIMEOUT ticks=${r.ticks} mv=${r.stats.moves} pr=${r.stats.proposals} ac=${r.stats.accepts} rj=${r.stats.rejects} rdy=${r.stats.readies}`);
      continue;
    }
    if (r.inversions === 0) wins++;
    inversions.push(r.inversions);
    allStats.push(r.stats);
    totalOwnInv += r.ownInversions;
    totalCrossInv += r.crossInversions;
    // eslint-disable-next-line no-console
    console.log(`[${g}] inv=${r.inversions} (own=${r.ownInversions} cross=${r.crossInversions}) ticks=${r.ticks} mv=${r.stats.moves} sw=${r.stats.swaps} pr=${r.stats.proposals} ac=${r.stats.accepts} rj=${r.stats.rejects} rdy=${r.stats.readies} dn=${r.stats.dings}`);
  }
  const elapsedSec = (Date.now() - startMs) / 1000;
  const completed = inversions.length;
  const winRate = completed === 0 ? 0 : (wins / completed) * 100;
  const medInv = median(inversions);
  const meanProp = mean(allStats.map((s) => s.proposals));
  const acceptRate = allStats.reduce((a, s) => a + s.accepts, 0) / Math.max(1, allStats.reduce((a, s) => a + s.proposals, 0));
  const totalMoves = allStats.reduce((a, s) => a + s.moves, 0);
  const totalSwaps = allStats.reduce((a, s) => a + s.swaps, 0);
  const totalUnclaims = allStats.reduce((a, s) => a + s.unclaims, 0);
  const totalDings = allStats.reduce((a, s) => a + s.dings, 0);
  const totalFuckoffs = allStats.reduce((a, s) => a + s.fuckoffs, 0);
  // eslint-disable-next-line no-console
  console.log("\n=== aggregate ===");
  // eslint-disable-next-line no-console
  console.log(`elapsed                  ${elapsedSec.toFixed(1)}s (${(elapsedSec / NUM_GAMES).toFixed(2)}s/game)`);
  // eslint-disable-next-line no-console
  console.log(`games completed         ${completed} / ${NUM_GAMES}  (timeouts: ${timeouts})`);
  // eslint-disable-next-line no-console
  console.log(`win rate (0 inversions) ${winRate.toFixed(1)}%   wins=${wins}`);
  // eslint-disable-next-line no-console
  console.log(`median inversions       ${medInv.toFixed(1)}`);
  // eslint-disable-next-line no-console
  console.log(`mean proposals / game   ${meanProp.toFixed(2)}`);
  // eslint-disable-next-line no-console
  console.log(`acceptance rate         ${(acceptRate * 100).toFixed(1)}%`);
  // eslint-disable-next-line no-console
  console.log(`integrity failures      ${totalIntegrityFails}`);
  // eslint-disable-next-line no-console
  console.log(`inv split (own/cross)   ${totalOwnInv} / ${totalCrossInv}`);
  // eslint-disable-next-line no-console
  console.log(`mechanic coverage       moves=${totalMoves} swaps=${totalSwaps} unclaims=${totalUnclaims} dings=${totalDings} fuckoffs=${totalFuckoffs}`);
  // eslint-disable-next-line no-console
  console.log(`\n=== per-archetype win rates ===`);
  const sorted = Array.from(archetypeWins.entries()).sort((a, b) => (b[1].wins / Math.max(1, b[1].games)) - (a[1].wins / Math.max(1, a[1].games)));
  for (const [a, st] of sorted) {
    const wr = st.games > 0 ? (st.wins / st.games) * 100 : 0;
    // eslint-disable-next-line no-console
    console.log(`  ${a.padEnd(14)} ${wr.toFixed(1)}%   (${st.wins}/${st.games})`);
  }
  process.exit(totalIntegrityFails > 0 ? 1 : 0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
