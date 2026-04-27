// Measure how accurate a bot's belief about OTHER players' hand strengths
// becomes as the game progresses — specifically, after they've observed
// placements, churn, and swaps.
//
// At each phase boundary, we ask: for each teammate hand the bot has a
// belief about, how close is the bot's mean estimate to the oracle truth?

import DingServer, { buildClientState } from "../party/index";
import type { ServerGameState } from "../party/state";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import { randomTraits, type Traits } from "../src/lib/ai/personality";
import type { Archetype } from "../src/lib/ai/archetypes";
import type { ClientMessage } from "../src/lib/types";
import type * as Party from "partykit/server";
import { computeTrueRanking } from "../party/scoring";

const NUM_GAMES = Number(process.argv[process.argv.indexOf("--games") + 1]) || 100;
const NUM_BOTS = 4;
const HANDS = 2;

class FakeConn { closed = false; constructor(public id: string) {} send() {} close() { this.closed = true; } }
function asPartyConnection(c: FakeConn): Party.Connection { return c as unknown as Party.Connection; }
function makeFakeRoom(): Party.Room {
  return {
    id: "r", internalID: "r", env: {} as Record<string, unknown>,
    context: {} as Party.ExecutionContext, broadcast: () => {},
    getConnections: () => ({ next: () => ({ done: true, value: undefined }) }) as unknown as Iterable<Party.Connection<unknown>>,
    getConnection: () => undefined, getMyAlarm: () => Promise.resolve(null),
    setAlarm: () => Promise.resolve(), deleteAlarm: () => Promise.resolve(),
    storage: {} as unknown as Party.Storage,
  };
}

type PhaseSnapshot = { phase: string; mae: number; conf: number; n: number };

async function runOne(): Promise<PhaseSnapshot[]> {
  const room = makeFakeRoom();
  const server = new DingServer(room);
  const ts = server as unknown as {
    dispatchBotAction: (pid: string, msg: ClientMessage) => void;
    state: ServerGameState;
    botController: { listPlayerIds: () => string[] };
  };
  const ctl = new FakeConn("c");
  server.onConnect(asPartyConnection(ctl));
  const ctlPid = "ctl";
  server.onMessage(JSON.stringify({ type: "join", name: "Ctl", pid: ctlPid }), asPartyConnection(ctl));
  for (let i = 0; i < NUM_BOTS; i++) server.onMessage(JSON.stringify({ type: "addBot" }), asPartyConnection(ctl));
  server.onMessage(JSON.stringify({ type: "configure", handsPerPlayer: HANDS }), asPartyConnection(ctl));
  server.onMessage(JSON.stringify({ type: "start" }), asPartyConnection(ctl));

  type Rec = { traits: Traits; memo: BotMemo; archetype: Archetype; isCtl: boolean };
  const recs = new Map<string, Rec>();
  recs.set(ctlPid, { ...randomTraits(), memo: newBotMemo(), isCtl: true });
  const botPids = ts.botController.listPlayerIds();
  for (const pid of botPids) recs.set(pid, { ...randomTraits(), memo: newBotMemo(), isCtl: false });

  // Sample: pick one bot and track its belief accuracy.
  const observerPid = botPids[0];
  const observer = recs.get(observerPid)!;

  const truthAtPhase = (phase: string): Map<string, number> => {
    // Use the FULL board at all phases — that's the "would-be-correct" answer
    // the bot is converging toward.
    const ranking = computeTrueRanking(ts.state.hands, ts.state.allCommunityCards);
    const N = ranking.length;
    const m = new Map<string, number>();
    ranking.forEach((id, i) => m.set(id, 1 - i / Math.max(1, N - 1)));
    void phase;
    return m;
  };

  const snapshots: PhaseSnapshot[] = [];
  let lastPhaseSeen = "";

  let ticks = 0;
  let streak = 0;
  while (ticks < 1000) {
    const s = ts.state;
    if (s.phase === "reveal" && s.score !== null) break;

    // Snapshot belief accuracy at the start of each game phase (preflop,
    // flop, turn, river — once per phase, before any action).
    if (["preflop", "flop", "turn", "river"].includes(s.phase) && s.phase !== lastPhaseSeen) {
      lastPhaseSeen = s.phase;
      const truth = truthAtPhase(s.phase);
      let totalErr = 0;
      let totalConf = 0;
      let n = 0;
      for (const h of s.hands) {
        if (h.playerId === observerPid) continue; // skip own
        const truthVal = truth.get(h.id);
        if (truthVal === undefined) continue;
        const beliefVal = observer.memo.belief.handStrength.get(h.id);
        const conf = observer.memo.belief.handConfidence.get(h.id) ?? 0;
        if (beliefVal === undefined) continue; // bot hasn't formed belief yet
        totalErr += Math.abs(beliefVal - truthVal);
        totalConf += conf;
        n++;
      }
      snapshots.push({ phase: s.phase, mae: n > 0 ? totalErr / n : NaN, conf: n > 0 ? totalConf / n : NaN, n });
    }

    let acted = false;
    for (const pid of [ctlPid, ...botPids]) {
      const rec = recs.get(pid);
      if (!rec) continue;
      const masked = buildClientState(ts.state, pid);
      const msg = decideAction(masked, pid, rec.traits, rec.memo);
      if (!msg) continue;
      if (rec.isCtl) {
        server.onMessage(JSON.stringify(msg), asPartyConnection(ctl));
      } else {
        ts.dispatchBotAction(pid, msg);
      }
      acted = true;
    }
    ticks++;
    streak = acted ? 0 : streak + 1;
    if (streak >= 5) {
      const sn = ts.state;
      if (sn.ranking.every((x) => x !== null)) {
        for (const p of sn.players) {
          if (p.connected && !p.ready) {
            if (p.id === ctlPid) server.onMessage(JSON.stringify({ type: "ready", ready: true }), asPartyConnection(ctl));
            else ts.dispatchBotAction(p.id, { type: "ready", ready: true });
          }
        }
        streak = 0;
      } else if (sn.phase === "reveal" && sn.score === null) {
        const ri = sn.ranking.length - 1 - sn.revealIndex;
        const hid = sn.ranking[ri];
        if (hid) {
          const owner = sn.hands.find((h) => h.id === hid);
          if (owner) {
            if (owner.playerId === ctlPid) server.onMessage(JSON.stringify({ type: "flip", handId: hid }), asPartyConnection(ctl));
            else ts.dispatchBotAction(owner.playerId, { type: "flip", handId: hid });
          }
        }
        streak = 0;
      } else break;
    }
  }

  return snapshots;
}

async function main() {
  console.log(`Running ${NUM_GAMES} games — measuring belief accuracy of one observer bot per game.`);
  const byPhase = new Map<string, { errs: number[]; confs: number[] }>();
  for (let g = 0; g < NUM_GAMES; g++) {
    const snaps = await runOne();
    for (const s of snaps) {
      if (!isFinite(s.mae)) continue;
      let bucket = byPhase.get(s.phase);
      if (!bucket) { bucket = { errs: [], confs: [] }; byPhase.set(s.phase, bucket); }
      bucket.errs.push(s.mae);
      bucket.confs.push(s.conf);
    }
  }
  console.log("\nBelief accuracy per phase (lower MAE = closer to truth, higher conf = more certain):");
  console.log("phase     |  mean MAE  |  median MAE | mean conf | samples");
  console.log("----------|------------|-------------|-----------|--------");
  for (const phase of ["preflop", "flop", "turn", "river"]) {
    const b = byPhase.get(phase);
    if (!b || b.errs.length === 0) { console.log(`${phase.padEnd(10)}|     —      |      —      |     —     |   0`); continue; }
    const sortedE = [...b.errs].sort((a, b) => a - b);
    const meanE = b.errs.reduce((a, b) => a + b, 0) / b.errs.length;
    const medE = sortedE[Math.floor(sortedE.length / 2)];
    const meanC = b.confs.reduce((a, b) => a + b, 0) / b.confs.length;
    console.log(`${phase.padEnd(10)}|   ${meanE.toFixed(3)}    |    ${medE.toFixed(3)}    |   ${meanC.toFixed(2)}    |  ${b.errs.length}`);
  }
  console.log("\nReference: a totally uninformed prior (mean=0.5 for every hand) gives MAE ≈ 0.27 against uniform truth.");
  console.log("Random ranking gives MAE ≈ 0.34. So MAE < 0.20 means signal extraction is working.");
}

main().catch((e) => { console.error(e); process.exit(1); });
