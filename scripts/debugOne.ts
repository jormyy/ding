// Debug a single oracle game: trace every proposal/accept/reject and the
// inversion delta the bots saw. Helps diagnose why oracle bots can't converge.

import DingServer, { buildClientState } from "../party/index";
import type { ServerGameState } from "../party/state";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import { randomTraits, type Traits } from "../src/lib/ai/personality";
import type { Archetype } from "../src/lib/ai/archetypes";
import type { ClientMessage } from "../src/lib/types";
import type * as Party from "partykit/server";
import { computeTrueRanking } from "../party/scoring";
import { scoreAction, rankingAfterChipMove } from "../src/lib/ai/ev";

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

async function main() {
  const room = makeFakeRoom();
  const server = new DingServer(room);
  const ts = server as unknown as {
    dispatchBotAction: (pid: string, msg: ClientMessage) => void;
    state: ServerGameState;
    botController: { listPlayerIds: () => string[]; isBot: (pid: string) => boolean };
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

  // Print player line-up.
  console.log("Players:");
  for (const p of ts.state.players) {
    const a = recs.get(p.id);
    console.log(`  ${p.id} (${p.name}) ${a?.archetype ?? ""}${p.isBot ? " [BOT]" : ""}`);
  }

  const ORACLE = false;
  const setOracle = () => {
    if (!ORACLE) return;
    const s = ts.state;
    if (!["preflop", "flop", "turn", "river", "reveal"].includes(s.phase)) return;
    if (s.hands.length === 0) return;
    const ranking = computeTrueRanking(s.hands, s.communityCards);
    const N = ranking.length;
    const trueStrength = new Map<string, number>();
    ranking.forEach((id, i) => trueStrength.set(id, 1 - i / Math.max(1, N - 1)));
    for (const [pid, rec] of recs) {
      for (const h of s.hands) {
        const v = trueStrength.get(h.id);
        if (v === undefined) continue;
        if (h.playerId === pid) rec.memo.estimates.set(h.id, v);
        else {
          let tb = rec.memo.belief.perTeammate.get(h.playerId);
          if (!tb) {
            tb = { hands: new Map(), churnRate: 0, skillPrior: 1.0 };
            rec.memo.belief.perTeammate.set(h.playerId, tb);
          }
          tb.skillPrior = 1.0;
          let hb = tb.hands.get(h.id);
          if (!hb) hb = { mean: v, concentration: 999, lastSlot: null, slotStableFor: 999 };
          else { hb.mean = v; hb.concentration = 999; hb.slotStableFor = 999; }
          tb.hands.set(h.id, hb);
          rec.memo.belief.handStrength.set(h.id, v);
          rec.memo.belief.handConfidence.set(h.id, 1.0);
        }
      }
    }
  };

  const phaseLabel = () => `[${ts.state.phase}]`;

  const origDispatch = ts.dispatchBotAction.bind(server);
  ts.dispatchBotAction = (pid: string, msg: ClientMessage) => {
    const before = ts.state;
    if (msg.type === "proposeChipMove") {
      const sCopy = before;
      const after = rankingAfterChipMove(sCopy.ranking, msg.initiatorHandId, msg.recipientHandId, "swap");
      const rec = recs.get(pid)!;
      const sc = scoreAction(sCopy, after, pid, rec.memo.belief, rec.memo.estimates);
      console.log(`${phaseLabel()} ${pid.slice(0,8)} PROPOSE ${msg.initiatorHandId.slice(0,4)}→${msg.recipientHandId.slice(0,4)} delta=${sc.teamInversionDelta.toFixed(2)} conf=${sc.confidence.toFixed(2)}`);
    } else if (msg.type === "acceptChipMove") {
      console.log(`${phaseLabel()} ${pid.slice(0,8)} ACCEPT ${msg.initiatorHandId.slice(0,4)}→${msg.recipientHandId.slice(0,4)}`);
    } else if (msg.type === "rejectChipMove") {
      console.log(`${phaseLabel()} ${pid.slice(0,8)} REJECT ${msg.initiatorHandId.slice(0,4)}→${msg.recipientHandId.slice(0,4)}`);
    } else if (msg.type === "cancelChipMove") {
      console.log(`${phaseLabel()} ${pid.slice(0,8)} CANCEL ${msg.initiatorHandId.slice(0,4)}→${msg.recipientHandId.slice(0,4)}`);
    } else if (msg.type === "ready") {
      console.log(`${phaseLabel()} ${pid.slice(0,8)} READY`);
    } else if (msg.type === "move") {
      const hand = before.hands.find((h) => h.id === msg.handId);
      const cards = hand ? hand.cards.map((c) => `${c.rank}${c.suit}`).join("") : "?";
      console.log(`${phaseLabel()} ${pid.slice(0,8)} MOVE ${msg.handId.slice(0,4)}(${cards})→slot${msg.toIndex}`);
    } else if (msg.type === "swap") {
      console.log(`${phaseLabel()} ${pid.slice(0,8)} SWAP ${msg.handIdA.slice(0,4)}↔${msg.handIdB.slice(0,4)}`);
    }
    origDispatch(pid, msg);
  };

  let ticks = 0;
  let streak = 0;
  while (ticks < 300) {
    const s = ts.state;
    if (s.phase === "reveal" && s.score !== null) break;
    setOracle();
    let acted = false;
    for (const pid of [ctlPid, ...botPids]) {
      const rec = recs.get(pid);
      if (!rec) continue;
      const masked = buildClientState(s, pid);
      const msg = decideAction(masked, pid, rec.traits, rec.memo);
      if (!msg) continue;
      if (rec.isCtl) {
        if (msg.type === "ready") console.log(`${phaseLabel()} CTL READY`);
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

  const final = ts.state;
  console.log(`\nFinal inversions: ${final.score} (ticks=${ticks})`);
  console.log("Final ranking:");
  for (let i = 0; i < final.ranking.length; i++) {
    const hid = final.ranking[i];
    if (!hid) { console.log(`  slot ${i}: EMPTY`); continue; }
    const h = final.hands.find((x) => x.id === hid)!;
    const cards = h.cards.map((c) => `${c.rank}${c.suit}`).join("");
    const owner = final.players.find((p) => p.id === h.playerId)!;
    console.log(`  slot ${i}: ${hid.slice(0,4)} ${cards} (${owner.name})`);
  }
  if (final.trueRanking) {
    console.log("True ranking:");
    final.trueRanking.forEach((hid, i) => {
      const h = final.hands.find((x) => x.id === hid)!;
      const cards = h.cards.map((c) => `${c.rank}${c.suit}`).join("");
      const owner = final.players.find((p) => p.id === h.playerId)!;
      console.log(`  slot ${i}: ${hid.slice(0,4)} ${cards} (${owner.name})`);
    });
  }
  console.log("Community:", final.communityCards.map((c) => `${c.rank}${c.suit}`).join(""));
}

main().catch((e) => { console.error(e); process.exit(1); });
