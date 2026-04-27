// "Play against the bots": replaces the ctl player with a near-perfect oracle
// player. Bots are normal (no oracle). Tests whether 1 smart human + bots can
// converge — and where the friction lives.

import DingServer, { buildClientState } from "../party/index";
import type { ServerGameState } from "../party/state";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import { randomTraits, type Traits } from "../src/lib/ai/personality";
import type { Archetype } from "../src/lib/ai/archetypes";
import type { ClientMessage } from "../src/lib/types";
import type * as Party from "partykit/server";
import { computeTrueRanking } from "../party/scoring";

const NUM_GAMES = Number(process.argv[process.argv.indexOf("--games") + 1]) || 50;
const NUM_BOTS = Number(process.argv[process.argv.indexOf("--bots") + 1]) || 4;
const HANDS = Number(process.argv[process.argv.indexOf("--hands") + 1]) || 2;

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

// Smart human: at each tick, pick the highest-EV action using TRUE strengths.
// Goal: place own hands optimally, then propose perfect-information swaps.
function smartHumanAct(
  state: ServerGameState,
  pid: string,
  truth: Map<string, number>
): ClientMessage | null {
  if (state.phase === "lobby") return null;
  if (state.phase === "reveal") {
    if (state.score !== null) return null;
    const idx = state.ranking.length - 1 - state.revealIndex;
    const hid = state.ranking[idx];
    if (!hid) return null;
    const owner = state.hands.find((h) => h.id === hid);
    if (owner?.playerId === pid) return { type: "flip", handId: hid };
    return null;
  }

  const me = state.players.find((p) => p.id === pid);
  if (!me) return null;
  const myHands = state.hands.filter((h) => h.playerId === pid);
  if (myHands.length === 0) return null;

  // 1. Always respond to incoming proposals first.
  for (const r of state.acquireRequests) {
    const rh = state.hands.find((h) => h.id === r.recipientHandId);
    if (rh?.playerId !== pid) continue;
    // Compute "after" using applyChipMoveToRanking and check if it's an improvement.
    // Quick proxy: use truth to rank both hands.
    const initT = truth.get(r.initiatorHandId) ?? 0.5;
    const recT = truth.get(r.recipientHandId) ?? 0.5;
    const initSlot = state.ranking.indexOf(r.initiatorHandId);
    const recSlot = state.ranking.indexOf(r.recipientHandId);
    if (r.kind === "swap") {
      // Swap if initT > recT and initSlot > recSlot (initiator's hand is stronger but in worse slot)
      const beforeOk = (initT >= recT) === (initSlot <= recSlot);
      const afterOk = (initT >= recT) === (recSlot <= initSlot);
      if (afterOk && !beforeOk) return { type: "acceptChipMove", initiatorHandId: r.initiatorHandId, recipientHandId: r.recipientHandId };
      else return { type: "rejectChipMove", initiatorHandId: r.initiatorHandId, recipientHandId: r.recipientHandId };
    } else if (r.kind === "acquire") {
      // Initiator unranked, wants my slot. Accept if their hand is stronger than mine
      // for that slot's expected strength.
      const slotImplied = 1 - recSlot / Math.max(1, state.ranking.length - 1);
      if (initT > recT) return { type: "acceptChipMove", initiatorHandId: r.initiatorHandId, recipientHandId: r.recipientHandId };
      void slotImplied;
      return { type: "rejectChipMove", initiatorHandId: r.initiatorHandId, recipientHandId: r.recipientHandId };
    } else if (r.kind === "offer") {
      // Initiator offers their slot. My hand is unranked. Take it if my hand is
      // stronger than theirs (I deserve the better slot).
      if (recT > initT) return { type: "acceptChipMove", initiatorHandId: r.initiatorHandId, recipientHandId: r.recipientHandId };
      return { type: "rejectChipMove", initiatorHandId: r.initiatorHandId, recipientHandId: r.recipientHandId };
    }
  }

  // 2. Place unranked hands at their truth-implied ideal slot.
  const myUnranked = myHands.filter((h) => state.ranking.indexOf(h.id) === -1);
  if (myUnranked.length > 0) {
    // Sort by strength descending — place strongest first.
    myUnranked.sort((a, b) => (truth.get(b.id) ?? 0.5) - (truth.get(a.id) ?? 0.5));
    const h = myUnranked[0];
    const t = truth.get(h.id) ?? 0.5;
    const N = state.ranking.length;
    const ideal = Math.round((1 - t) * (N - 1));
    // Walk outward from ideal to find an empty slot.
    for (let d = 0; d < N; d++) {
      for (const slot of [ideal - d, ideal + d]) {
        if (slot < 0 || slot >= N) continue;
        if (state.ranking[slot] === null) return { type: "move", handId: h.id, toIndex: slot };
      }
    }
  }

  // 3. Look for a beneficial cross-player swap (only if I have ranked hands).
  for (const myH of myHands) {
    const myIdx = state.ranking.indexOf(myH.id);
    if (myIdx === -1) continue;
    const myT = truth.get(myH.id) ?? 0.5;
    for (let s = 0; s < state.ranking.length; s++) {
      if (s === myIdx) continue;
      const otherId = state.ranking[s];
      if (!otherId) continue;
      const otherHand = state.hands.find((x) => x.id === otherId);
      if (!otherHand || otherHand.playerId === pid) continue;
      const otherT = truth.get(otherId) ?? 0.5;
      // Inversion if (myT > otherT) but (myIdx > s) → my stronger hand is in worse slot.
      const inverted = (myT > otherT && myIdx > s) || (myT < otherT && myIdx < s);
      if (!inverted) continue;
      // Already proposed?
      const already = state.acquireRequests.some(
        (r) => r.initiatorHandId === myH.id && r.recipientHandId === otherId
      );
      if (already) continue;
      const taken = state.acquireRequests.some(
        (r) => r.recipientHandId === otherId && r.initiatorId !== pid
      );
      if (taken) continue;
      return { type: "proposeChipMove", initiatorHandId: myH.id, recipientHandId: otherId };
    }
  }

  // 4. Cancel my own bad proposals.
  for (const r of state.acquireRequests) {
    if (r.initiatorId !== pid) continue;
    const initT = truth.get(r.initiatorHandId) ?? 0.5;
    const recT = truth.get(r.recipientHandId) ?? 0.5;
    const initSlot = state.ranking.indexOf(r.initiatorHandId);
    const recSlot = state.ranking.indexOf(r.recipientHandId);
    let stillGood = false;
    if (r.kind === "swap") {
      stillGood = (initT > recT && initSlot > recSlot) || (initT < recT && initSlot < recSlot);
    } else stillGood = true;
    if (!stillGood) return { type: "cancelChipMove", initiatorHandId: r.initiatorHandId, recipientHandId: r.recipientHandId };
  }

  // 5. Ready up if everything looks good.
  const allRanked = state.ranking.every((x) => x !== null);
  if (allRanked && !me.ready) return { type: "ready", ready: true };
  return null;
}

async function runOne(): Promise<{ inversions: number | null; ticks: number; humanInv: number }> {
  const room = makeFakeRoom();
  const server = new DingServer(room);
  const ts = server as unknown as {
    dispatchBotAction: (pid: string, msg: ClientMessage) => void;
    state: ServerGameState;
    botController: { listPlayerIds: () => string[] };
  };
  const ctl = new FakeConn("c");
  server.onConnect(asPartyConnection(ctl));
  const ctlPid = "human";
  server.onMessage(JSON.stringify({ type: "join", name: "Human", pid: ctlPid }), asPartyConnection(ctl));
  for (let i = 0; i < NUM_BOTS; i++) server.onMessage(JSON.stringify({ type: "addBot" }), asPartyConnection(ctl));
  server.onMessage(JSON.stringify({ type: "configure", handsPerPlayer: HANDS }), asPartyConnection(ctl));
  server.onMessage(JSON.stringify({ type: "start" }), asPartyConnection(ctl));

  type Rec = { traits: Traits; memo: BotMemo; archetype: Archetype };
  const recs = new Map<string, Rec>();
  const botPids = ts.botController.listPlayerIds();
  for (const pid of botPids) recs.set(pid, { ...randomTraits(), memo: newBotMemo() });

  const truthOf = (): Map<string, number> => {
    const board = ts.state.allCommunityCards;
    const ranking = computeTrueRanking(ts.state.hands, board);
    const N = ranking.length;
    const m = new Map<string, number>();
    ranking.forEach((id, i) => m.set(id, 1 - i / Math.max(1, N - 1)));
    return m;
  };

  let ticks = 0;
  let streak = 0;
  while (ticks < 1000) {
    const s = ts.state;
    if (s.phase === "reveal" && s.score !== null) break;
    let acted = false;
    // Smart human acts first.
    const truth = truthOf();
    const humanMsg = smartHumanAct(s, ctlPid, truth);
    if (humanMsg) {
      server.onMessage(JSON.stringify(humanMsg), asPartyConnection(ctl));
      acted = true;
    }
    for (const pid of botPids) {
      const rec = recs.get(pid);
      if (!rec) continue;
      const masked = buildClientState(ts.state, pid);
      const msg = decideAction(masked, pid, rec.traits, rec.memo);
      if (msg) {
        ts.dispatchBotAction(pid, msg);
        acted = true;
      }
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
  // Count inversions involving the human's hands specifically.
  let humanInv = 0;
  if (final.trueRanking) {
    const truePos = new Map<string, number>();
    final.trueRanking.forEach((id, i) => truePos.set(id, i));
    const claimed = final.ranking.filter((x): x is string => x !== null);
    const owner = new Map<string, string>();
    for (const h of final.hands) owner.set(h.id, h.playerId);
    for (let i = 0; i < claimed.length; i++) {
      for (let j = i + 1; j < claimed.length; j++) {
        const ti = truePos.get(claimed[i])!;
        const tj = truePos.get(claimed[j])!;
        if (ti > tj && (owner.get(claimed[i]) === ctlPid || owner.get(claimed[j]) === ctlPid)) humanInv++;
      }
    }
  }
  return { inversions: final.score, ticks, humanInv };
}

async function main() {
  console.log(`Running ${NUM_GAMES} games: 1 smart human + ${NUM_BOTS} bots, ${HANDS} hands/player`);
  const invs: number[] = [];
  let wins = 0, timeouts = 0;
  let totalHumanInv = 0;
  const start = Date.now();
  for (let g = 0; g < NUM_GAMES; g++) {
    const r = await runOne();
    if (r.inversions === null) { timeouts++; continue; }
    invs.push(r.inversions);
    totalHumanInv += r.humanInv;
    if (r.inversions === 0) wins++;
  }
  const elapsed = (Date.now() - start) / 1000;
  invs.sort((a, b) => a - b);
  const med = invs[Math.floor(invs.length / 2)];
  console.log(`elapsed: ${elapsed.toFixed(1)}s   timeouts: ${timeouts}`);
  console.log(`win rate: ${(wins / Math.max(1, invs.length) * 100).toFixed(1)}%  (${wins}/${invs.length})`);
  console.log(`median inversions: ${med}`);
  console.log(`mean inversions: ${(invs.reduce((a, b) => a + b, 0) / Math.max(1, invs.length)).toFixed(2)}`);
  console.log(`pairs involving human: ${totalHumanInv} total (${(totalHumanInv / Math.max(1, invs.length)).toFixed(2)}/game)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
