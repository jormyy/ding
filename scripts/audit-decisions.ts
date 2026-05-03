// Audit a JSONL trace produced by `simulateFast.ts --trace path.jsonl`.
//
// Each check is a hypothesis about non-human play. We collect counts per check
// (overall + per archetype) and print the worst-N examples per check with full
// context, so a human can spot-check the actual game state behind the flag.
//
// Usage: npx tsx scripts/audit-decisions.ts trace.jsonl [--worst N]

import * as fs from "fs";
import { applyChipMoveToRanking } from "../src/lib/chipMove";

// ── Trace event shapes (mirror src/lib/ai/trace.ts, plus harness fields) ──

type DecisionEvent = {
  type: "decision";
  gameId: number;
  tick: number;
  archetype?: string;
  phase: string;
  myPlayerId: string;
  decisionCount: number;
  resignation: number;
  candidates: Array<{
    msgType: string;
    utility: number;
    teamInversionDelta: number;
    confidence: number;
    meta?: Record<string, unknown>;
  }>;
  pickedIndex: number;
  picked: { type: string; [k: string]: unknown };
  reason: string;
  myHands: Array<{ handId: string; ownStrength: number; slot: number }>;
  ranking: (string | null)[];
  beliefSnapshot: Array<{ handId: string; mean: number; confidence: number }>;
  acquireRequests: Array<{ kind: string; initiatorId: string; initiatorHandId: string; recipientHandId: string }>;
  pickedMeta?: Record<string, unknown>;
};

type PhaseBoundaryEvent = {
  type: "phaseBoundary";
  gameId: number;
  tick: number;
  archetype?: string;
  phase: string;
  myPlayerId: string;
  beliefs: Array<{ handId: string; mean: number; confidence: number }>;
};

type TruthEvent = {
  type: "truth";
  gameId: number;
  tick: number;
  phase: string;
  trueRanking: string[];
  truePercentile: Record<string, number>;
  ranking: (string | null)[];
  handPlayers: Record<string, string>;
  trueStrength: Record<string, number>;
};

type Event = DecisionEvent | PhaseBoundaryEvent | TruthEvent;

// ── Helpers ──

function parseArgs(): { path: string; worst: number } {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    // eslint-disable-next-line no-console
    console.error("usage: audit-decisions <trace.jsonl> [--worst N]");
    process.exit(1);
  }
  const path = args[0];
  let worst = 20;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--worst") worst = Number(args[++i]);
  }
  return { path, worst };
}

function loadEvents(path: string): Event[] {
  const text = fs.readFileSync(path, "utf8");
  const out: Event[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t) as Event);
    } catch {
      // skip malformed lines
    }
  }
  return out;
}

function expectedInversionsTrue(
  ranking: (string | null)[],
  truePos: Map<string, number>,
): number {
  // Count pairwise inversions using true rank positions. Ignore null slots.
  let inv = 0;
  const filled: Array<{ id: string; slot: number; truePos: number }> = [];
  for (let i = 0; i < ranking.length; i++) {
    const id = ranking[i];
    if (!id) continue;
    const tp = truePos.get(id);
    if (tp === undefined) continue;
    filled.push({ id, slot: i, truePos: tp });
  }
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const a = filled[i], b = filled[j];
      // a is at a lower (better) slot than b but a is actually weaker.
      if (a.slot < b.slot && a.truePos > b.truePos) inv++;
      if (a.slot > b.slot && a.truePos < b.truePos) inv++;
    }
  }
  return inv;
}

// ── Issue model ──

type Issue = {
  check: string;
  severity: number; // higher = worse, used to rank examples
  context: Record<string, unknown>;
  archetype: string;
};

type CheckFn = (
  decision: DecisionEvent,
  truth: TruthEvent | undefined,
) => Issue[];

const checks: Array<{ name: string; fn: CheckFn }> = [];

function addCheck(name: string, fn: CheckFn): void {
  checks.push({ name, fn });
}

// 1. Own-hand misplacement: bot owns a hand whose final placed slot is far
// from where its current strength would suggest. Targets AA at slot 5/6.
addCheck("ownHandMisplacement", (d, truth) => {
  if (d.picked.type !== "move") return [];
  const meta = d.pickedMeta as { handId?: string; slot?: number; ownStrength?: number } | undefined;
  if (!meta?.handId || meta.slot === undefined || meta.ownStrength === undefined) return [];
  const N = d.ranking.length;
  if (N <= 1) return [];
  const idealSlot = (1 - meta.ownStrength) * (N - 1);
  const delta = Math.abs(meta.slot - idealSlot) / (N - 1);
  if (delta > 0.20) {
    return [{
      check: "ownHandMisplacement",
      severity: delta,
      archetype: d.archetype ?? "?",
      context: {
        gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
        handId: meta.handId, slot: meta.slot, ownStrength: meta.ownStrength,
        idealSlot: Math.round(idealSlot * 100) / 100, deltaFraction: Math.round(delta * 100) / 100,
        reason: d.reason, truthAvailable: !!truth,
      },
    }];
  }
  return [];
});

// 2. First-chip-of-phase looks weird: bot's first own-hand placement of a
// phase puts a weak hand into a top slot, or a strong hand into a bottom slot,
// when other slots were available. Targets the "weird first chip" smell.
addCheck("firstChipWeird", (d) => {
  if (d.picked.type !== "move") return [];
  const meta = d.pickedMeta as { handId?: string; slot?: number; ownStrength?: number; isUnrankedPlacement?: boolean } | undefined;
  if (!meta?.handId || meta.slot === undefined || meta.ownStrength === undefined) return [];
  if (!meta.isUnrankedPlacement) return [];
  // First chip of phase: ranking entirely null AND no other own hand placed.
  const anyPlaced = d.ranking.some((s) => s !== null);
  if (anyPlaced) return [];
  const N = d.ranking.length;
  if (N <= 2) return [];
  // Define "top half" as slots 0..floor(N/2)-1, "bottom half" as the rest.
  const isTop = meta.slot < Math.floor(N / 2);
  const isBottom = meta.slot >= Math.ceil(N / 2);
  const weak = meta.ownStrength < 0.3;
  const strong = meta.ownStrength > 0.7;
  if ((weak && isTop) || (strong && isBottom)) {
    return [{
      check: "firstChipWeird",
      severity: weak && isTop ? (0.3 - meta.ownStrength) + 0.5 : (meta.ownStrength - 0.7) + 0.5,
      archetype: d.archetype ?? "?",
      context: {
        gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
        handId: meta.handId, slot: meta.slot, ownStrength: meta.ownStrength,
        N, isWeakInTop: weak && isTop, isStrongInBottom: strong && isBottom,
      },
    }];
  }
  return [];
});

// 3. EV-bad accept: the picked accept strictly worsens true inversions.
addCheck("evBadAccept", (d, truth) => {
  if (!truth || d.picked.type !== "acceptChipMove") return [];
  const truePos = new Map<string, number>();
  truth.trueRanking.forEach((id, i) => truePos.set(id, i));
  const cur = expectedInversionsTrue(d.ranking, truePos);
  const meta = d.pickedMeta as { initiatorHandId?: string; recipientHandId?: string; kind?: string } | undefined;
  if (!meta?.initiatorHandId || !meta.recipientHandId || !meta.kind) return [];
  const after = applyChipMoveToRanking(d.ranking, meta.kind as "acquire" | "offer" | "swap", meta.initiatorHandId, meta.recipientHandId);
  const next = expectedInversionsTrue(after, truePos);
  if (next > cur) {
    return [{
      check: "evBadAccept",
      severity: next - cur,
      archetype: d.archetype ?? "?",
      context: {
        gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
        cur, next, delta: next - cur, kind: meta.kind,
        initiatorHandId: meta.initiatorHandId, recipientHandId: meta.recipientHandId,
      },
    }];
  }
  return [];
});

// 4. EV-bad reject: bot rejected a proposal that would have reduced true
// inversions, when its own confidence > 0.5.
addCheck("evBadReject", (d, truth) => {
  if (!truth || d.picked.type !== "rejectChipMove") return [];
  const meta = d.pickedMeta as { initiatorHandId?: string; recipientHandId?: string; kind?: string; confidence?: number } | undefined;
  if (!meta?.initiatorHandId || !meta.recipientHandId || !meta.kind) return [];
  if ((meta.confidence ?? 0) <= 0.5) return [];
  const truePos = new Map<string, number>();
  truth.trueRanking.forEach((id, i) => truePos.set(id, i));
  const cur = expectedInversionsTrue(d.ranking, truePos);
  const after = applyChipMoveToRanking(d.ranking, meta.kind as "acquire" | "offer" | "swap", meta.initiatorHandId, meta.recipientHandId);
  const next = expectedInversionsTrue(after, truePos);
  if (next < cur) {
    return [{
      check: "evBadReject",
      severity: cur - next,
      archetype: d.archetype ?? "?",
      context: {
        gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
        cur, next, missedDelta: cur - next, confidence: meta.confidence,
        kind: meta.kind, initiatorHandId: meta.initiatorHandId, recipientHandId: meta.recipientHandId,
      },
    }];
  }
  return [];
});

// 5. Cooperative-override-driven accept: blendedDelta < 0 but acceptBoost
// pushed the accept utility positive. Targets fix #1 directly.
addCheck("coopOverrideAccept", (d) => {
  if (d.picked.type !== "acceptChipMove") return [];
  const meta = d.pickedMeta as { blendedDelta?: number; acceptBoost?: number } | undefined;
  if (meta?.blendedDelta === undefined || meta.acceptBoost === undefined) return [];
  if (meta.blendedDelta < 0 && meta.acceptBoost > Math.abs(meta.blendedDelta)) {
    return [{
      check: "coopOverrideAccept",
      severity: Math.abs(meta.blendedDelta) + meta.acceptBoost,
      archetype: d.archetype ?? "?",
      context: {
        gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
        blendedDelta: meta.blendedDelta, acceptBoost: meta.acceptBoost,
      },
    }];
  }
  return [];
});

// 6. Final-state placement insanity: at river-final-tick, bot owns at least
// one hand whose final slot disagrees with truth percentile by >0.30.
// Detected at the LAST decision per (gameId, myPlayerId, phase=river).
// This is a post-pass check (not per-decision); we'll handle it specially below.

// 7. Premature ready: bot ready'd while ranking still has ≥1 inversion vs
// truth AND decisionCount < 30 AND resignation > 0.7.
addCheck("prematureReady", (d, truth) => {
  if (d.picked.type !== "ready") return [];
  if (!truth) return [];
  if (d.decisionCount >= 30) return [];
  if (d.resignation <= 0.7) return [];
  const truePos = new Map<string, number>();
  truth.trueRanking.forEach((id, i) => truePos.set(id, i));
  const inv = expectedInversionsTrue(d.ranking, truePos);
  if (inv >= 1) {
    return [{
      check: "prematureReady",
      severity: inv * (d.resignation - 0.7) * 4,
      archetype: d.archetype ?? "?",
      context: {
        gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
        inv, decisionCount: d.decisionCount, resignation: d.resignation, reason: d.reason,
      },
    }];
  }
  return [];
});

// 8. False ding: bot semantic-dings on a hand with truth percentile <0.5.
addCheck("falseDing", (d, truth) => {
  if (d.picked.type !== "ding") return [];
  if (!truth) return [];
  const handId = (d.picked as { handId?: string }).handId;
  if (!handId) return [];
  const pct = truth.truePercentile[handId];
  if (pct === undefined) return [];
  if (pct < 0.5) {
    return [{
      check: "falseDing",
      severity: 0.5 - pct,
      archetype: d.archetype ?? "?",
      context: {
        gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
        handId, truePercentile: pct,
      },
    }];
  }
  return [];
});

// 9. Wasted proposal: bot proposes a chip move whose post-move true inversions
// are worse than current.
addCheck("wastedProposal", (d, truth) => {
  if (d.picked.type !== "proposeChipMove") return [];
  if (!truth) return [];
  const truePos = new Map<string, number>();
  truth.trueRanking.forEach((id, i) => truePos.set(id, i));
  const init = (d.picked as { initiatorHandId?: string }).initiatorHandId;
  const rec = (d.picked as { recipientHandId?: string }).recipientHandId;
  if (!init || !rec) return [];
  // Find the kind from the candidates' meta, fall back to "acquire".
  let kind: "acquire" | "offer" | "swap" = "swap";
  for (const c of d.candidates) {
    const m = c.meta as { kind?: string } | undefined;
    if (c.msgType === "proposeChipMove" && m?.kind) {
      kind = m.kind as "acquire" | "offer" | "swap";
      break;
    }
  }
  // Heuristic from current placement: if both ranked → swap; if init unranked → acquire; if rec unranked → offer.
  const initSlot = d.ranking.indexOf(init);
  const recSlot = d.ranking.indexOf(rec);
  if (initSlot === -1 && recSlot !== -1) kind = "acquire";
  else if (initSlot !== -1 && recSlot === -1) kind = "offer";
  else if (initSlot !== -1 && recSlot !== -1) kind = "swap";
  const cur = expectedInversionsTrue(d.ranking, truePos);
  const after = applyChipMoveToRanking(d.ranking, kind, init, rec);
  const next = expectedInversionsTrue(after, truePos);
  if (next > cur) {
    return [{
      check: "wastedProposal",
      severity: next - cur,
      archetype: d.archetype ?? "?",
      context: {
        gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
        cur, next, delta: next - cur, kind, init, rec,
      },
    }];
  }
  return [];
});

// 10. Anchor missed: bot holds a hand with strength ≥0.85 and the top slot
// is empty/wrongly filled, yet bot does nothing for ≥2 ticks. We approximate
// by flagging any decision where top slot is empty AND bot's own hand has
// strength ≥0.85 AND picked != move-to-slot-0.
addCheck("anchorMissed", (d) => {
  // Only trigger when the bot HAS an own hand >=0.85 and slot 0 is empty/wrong.
  let strongHand: { id: string; strength: number; slot: number } | null = null;
  for (const h of d.myHands) {
    if (h.ownStrength >= 0.85) {
      if (!strongHand || h.ownStrength > strongHand.strength) {
        strongHand = { id: h.handId, strength: h.ownStrength, slot: h.slot };
      }
    }
  }
  if (!strongHand) return [];
  if (strongHand.slot === 0) return [];
  // If picked is moving the strong hand to slot 0 — fine.
  if (d.picked.type === "move") {
    const m = d.picked as { handId?: string; toIndex?: number };
    if (m.handId === strongHand.id && m.toIndex === 0) return [];
  }
  // If picked is proposing/swapping the strong hand to slot 0 — fine.
  if (d.picked.type === "proposeChipMove") {
    const m = d.picked as { initiatorHandId?: string; recipientHandId?: string };
    const top = d.ranking[0];
    if (m.initiatorHandId === strongHand.id && top === m.recipientHandId) return [];
  }
  return [{
    check: "anchorMissed",
    severity: strongHand.strength,
    archetype: d.archetype ?? "?",
    context: {
      gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
      strongHandId: strongHand.id, strongStrength: strongHand.strength,
      curSlot: strongHand.slot, top0: d.ranking[0], picked: d.picked,
    },
  }];
});

// ── Final-state placement insanity (post-pass check) ──

function postPassFinalState(events: Event[]): Issue[] {
  // For each (gameId, myPlayerId), find the LAST decision in phase=river,
  // then compare each owned hand's slot against truth percentile.
  // We need a mapping from (gameId) → river truth.
  const truthByGame = new Map<number, TruthEvent>();
  for (const e of events) {
    if (e.type === "truth" && (e.phase === "river" || e.phase === "reveal")) {
      const cur = truthByGame.get(e.gameId);
      // Prefer the latest reveal/river truth
      if (!cur || e.phase === "reveal") truthByGame.set(e.gameId, e);
    }
  }
  // Last decision per (gameId, myPlayerId, phase=river).
  const lastByKey = new Map<string, DecisionEvent>();
  for (const e of events) {
    if (e.type !== "decision") continue;
    if (e.phase !== "river") continue;
    const k = e.gameId + "|" + e.myPlayerId;
    const cur = lastByKey.get(k);
    if (!cur || e.tick > cur.tick) lastByKey.set(k, e);
  }
  const issues: Issue[] = [];
  for (const [, d] of lastByKey) {
    const truth = truthByGame.get(d.gameId);
    if (!truth) continue;
    for (const h of d.myHands) {
      if (h.slot === -1) continue;
      const N = d.ranking.length;
      if (N <= 1) continue;
      const ownPct = 1 - h.slot / (N - 1);
      const truePct = truth.truePercentile[h.handId];
      if (truePct === undefined) continue;
      const delta = Math.abs(ownPct - truePct);
      if (delta > 0.30) {
        issues.push({
          check: "finalStatePlacement",
          severity: delta,
          archetype: d.archetype ?? "?",
          context: {
            gameId: d.gameId, tick: d.tick, phase: d.phase, myPlayerId: d.myPlayerId,
            handId: h.handId, slot: h.slot, ownStrength: h.ownStrength,
            ownPercentile: Math.round(ownPct * 100) / 100,
            truePercentile: Math.round(truePct * 100) / 100,
            deltaFraction: Math.round(delta * 100) / 100,
          },
        });
      }
    }
  }
  return issues;
}

// 11. Belief-vs-truth drift: at phaseBoundary, bot's belief mean for a
// teammate hand is >0.30 from that hand's true percentile despite having
// (implicitly) seen prior placements. We approximate by requiring this is
// not the preflop boundary.
function postPassBeliefDrift(events: Event[]): Issue[] {
  const truthByGamePhase = new Map<string, TruthEvent>();
  for (const e of events) {
    if (e.type === "truth") truthByGamePhase.set(e.gameId + "|" + e.phase, e);
  }
  const issues: Issue[] = [];
  for (const e of events) {
    if (e.type !== "phaseBoundary") continue;
    if (e.phase === "preflop") continue; // no prior phase to inform belief
    if (e.phase === "lobby") continue;
    const truth = truthByGamePhase.get(e.gameId + "|" + e.phase);
    if (!truth) continue;
    for (const b of e.beliefs) {
      const truePct = truth.truePercentile[b.handId];
      if (truePct === undefined) continue;
      const delta = Math.abs(b.mean - truePct);
      if (delta > 0.30) {
        issues.push({
          check: "beliefDrift",
          severity: delta,
          archetype: e.archetype ?? "?",
          context: {
            gameId: e.gameId, tick: e.tick, phase: e.phase, myPlayerId: e.myPlayerId,
            handId: b.handId, beliefMean: Math.round(b.mean * 100) / 100,
            truePercentile: Math.round(truePct * 100) / 100,
            deltaFraction: Math.round(delta * 100) / 100,
            confidence: Math.round(b.confidence * 100) / 100,
          },
        });
      }
    }
  }
  return issues;
}

// ── Driver ──

function pad(s: string, n: number): string { return (s + " ".repeat(n)).slice(0, n); }
function padNum(n: number, w: number): string { return (" ".repeat(w) + String(n)).slice(-w); }

function main(): void {
  const { path, worst } = parseArgs();
  // eslint-disable-next-line no-console
  console.log(`Loading ${path} ...`);
  const events = loadEvents(path);
  const decisions = events.filter((e): e is DecisionEvent => e.type === "decision");
  const truthByGamePhase = new Map<string, TruthEvent>();
  for (const e of events) {
    if (e.type === "truth") truthByGamePhase.set(e.gameId + "|" + e.phase, e);
  }
  // eslint-disable-next-line no-console
  console.log(`Loaded ${events.length} events: ${decisions.length} decisions, ${truthByGamePhase.size} truth snapshots.`);

  const issuesByCheck = new Map<string, Issue[]>();
  const incCheck = (name: string): Issue[] => {
    let arr = issuesByCheck.get(name);
    if (!arr) { arr = []; issuesByCheck.set(name, arr); }
    return arr;
  };

  // Run per-decision checks.
  for (const d of decisions) {
    const truth = truthByGamePhase.get(d.gameId + "|" + d.phase);
    for (const c of checks) {
      const out = c.fn(d, truth);
      if (out.length > 0) incCheck(c.name).push(...out);
    }
  }
  // Post-pass checks.
  const fin = postPassFinalState(events);
  if (fin.length > 0) issuesByCheck.set("finalStatePlacement", fin);
  const drift = postPassBeliefDrift(events);
  if (drift.length > 0) issuesByCheck.set("beliefDrift", drift);

  // Counts table.
  // eslint-disable-next-line no-console
  console.log(`\n=== check counts ===`);
  // eslint-disable-next-line no-console
  console.log(`${pad("check", 28)} ${pad("count", 8)}`);
  const checkNames = Array.from(issuesByCheck.keys()).sort();
  for (const name of checkNames) {
    const arr = issuesByCheck.get(name) ?? [];
    // eslint-disable-next-line no-console
    console.log(`${pad(name, 28)} ${padNum(arr.length, 8)}`);
  }

  // Per-archetype counts.
  // eslint-disable-next-line no-console
  console.log(`\n=== per-archetype counts ===`);
  const archetypes = new Set<string>();
  for (const arr of issuesByCheck.values()) for (const i of arr) archetypes.add(i.archetype);
  // header
  const archs = Array.from(archetypes).sort();
  // eslint-disable-next-line no-console
  console.log(pad("check", 28) + archs.map((a) => pad(a, 12)).join(""));
  for (const name of checkNames) {
    const arr = issuesByCheck.get(name) ?? [];
    const cells = archs.map((a) => padNum(arr.filter((i) => i.archetype === a).length, 12));
    // eslint-disable-next-line no-console
    console.log(pad(name, 28) + cells.join(""));
  }

  // Worst N per check.
  for (const name of checkNames) {
    const arr = (issuesByCheck.get(name) ?? []).slice().sort((a, b) => b.severity - a.severity).slice(0, worst);
    if (arr.length === 0) continue;
    // eslint-disable-next-line no-console
    console.log(`\n=== worst ${arr.length} for ${name} ===`);
    for (const i of arr) {
      // eslint-disable-next-line no-console
      console.log(`  [sev ${i.severity.toFixed(3)}] arch=${i.archetype}  ${JSON.stringify(i.context)}`);
    }
  }
}

main();
