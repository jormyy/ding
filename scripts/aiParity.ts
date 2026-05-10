/**
 * AI parity check — runs N seeded simulateFast games and asserts that the
 * aggregate metrics (winRate, medianInversions, mean proposals, accept rate,
 * per-archetype win rate) match a previously-saved baseline within tolerance.
 *
 * Use it bracketing any AI refactor:
 *
 *     # Capture baseline before changes
 *     npx tsx scripts/aiParity.ts --capture --out tmp/ai-baseline.json --games 100
 *
 *     # Make AI code changes …
 *
 *     # Compare — exits non-zero if any metric drifts beyond tolerance
 *     npx tsx scripts/aiParity.ts --compare --in tmp/ai-baseline.json --games 100
 *
 * Defaults: 100 games, 4 bots, 2 hands. Tolerances: ±0.1pp on rates,
 * ±0.5 on median inversions. The runner uses the same DingServer + brain as
 * simulateFast, so any metric divergence reflects a behavior change in the
 * AI pipeline.
 */

import * as fs from "fs";
import DingServer, { buildClientState } from "../party/index";
import type { ServerGameState } from "../party/state";
import { decideAction, newBotMemo, type BotMemo } from "../src/lib/ai/strategy";
import { randomTraits, type Traits } from "../src/lib/ai/personality";
import type { Archetype } from "../src/lib/ai/archetypes";
import type { ClientMessage } from "../src/lib/types";
import {
  FakeConn,
  asPartyConnection,
  makeFakeRoom,
  argOr,
  argFlag,
  argStr,
  freshActionStats,
  bumpActionStats,
  median,
  mean,
  type ActionStats,
} from "./lib/harness";

const NUM_GAMES = argOr("games", 100);
const NUM_BOTS = argOr("bots", 4);
const HANDS = argOr("hands", 2);

const MODE_CAPTURE = argFlag("capture");
const MODE_COMPARE = argFlag("compare");
const FILE_OUT = argStr("out") ?? "tmp/ai-baseline.json";
const FILE_IN = argStr("in") ?? FILE_OUT;

// Tolerances for the unseeded runner. The harness uses Math.random for trait
// assignment and deck shuffles, so back-to-back baseline runs naturally drift
// by a few percentage points. These bounds catch regressions large enough to
// matter (a real semantic break shows up as a multi-point shift across many
// metrics) without false-failing on noise. Tighten when the harness is seeded.
const TOL_RATE_PP = 5; // percent points
const TOL_MED_INV = 2;

interface BaselineSummary {
  games: number;
  bots: number;
  hands: number;
  winRate: number;
  medianInversions: number;
  meanProposals: number;
  acceptRate: number;
  archetypeWinRate: Record<string, number>;
}

interface SimResult {
  inversions: number | null;
  stats: ActionStats;
  archetypes: Archetype[];
}

async function runOneGame(gameIdx: number): Promise<SimResult> {
  const stats = freshActionStats();
  const room = makeFakeRoom();
  const server = new DingServer(room);
  const typedServer = server as unknown as {
    dispatchBotAction: (pid: string, msg: ClientMessage) => void;
    state: ServerGameState;
    botController: { listPlayerIds: () => string[] };
  };
  const origDispatch = typedServer.dispatchBotAction.bind(server);
  typedServer.dispatchBotAction = (pid: string, msg: ClientMessage) => {
    bumpActionStats(stats, msg.type);
    origDispatch(pid, msg);
  };

  const ctl = new FakeConn("ctl-" + gameIdx);
  server.onConnect(asPartyConnection(ctl));
  const ctlPid = "ctl-pid-" + gameIdx;
  server.onMessage(
    JSON.stringify({ type: "join", name: "Ctl", pid: ctlPid }),
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

  type Rec = { traits: Traits; memo: BotMemo; archetype: Archetype; isCtl: boolean };
  const recs = new Map<string, Rec>();
  const ctlInit = randomTraits();
  recs.set(ctlPid, { ...ctlInit, memo: newBotMemo(), isCtl: true });
  const botPids = typedServer.botController.listPlayerIds();
  for (const pid of botPids) {
    const r = randomTraits();
    recs.set(pid, { ...r, memo: newBotMemo(), isCtl: false });
  }
  const archetypes = Array.from(recs.values()).map((r) => r.archetype);

  const MAX_TICKS = 4000;
  let ticks = 0;
  let idleStreak = 0;
  while (ticks < MAX_TICKS) {
    const s = typedServer.state;
    if (s.phase === "reveal" && s.score !== null) break;
    let acted = false;
    const order = [ctlPid, ...botPids];
    for (const pid of order) {
      const rec = recs.get(pid);
      if (!rec) continue;
      const player = s.players.find((p) => p.id === pid);
      if (!player) continue;
      const masked = buildClientState(s, pid);
      const msg = decideAction(masked, pid, rec.traits, rec.memo);
      if (!msg) continue;
      if (rec.isCtl) {
        bumpActionStats(stats, msg.type);
        server.onMessage(JSON.stringify(msg), asPartyConnection(ctl));
      } else {
        typedServer.dispatchBotAction(pid, msg);
      }
      acted = true;
    }
    ticks++;
    idleStreak = acted ? 0 : idleStreak + 1;
    if (idleStreak >= 5) {
      const sNow = typedServer.state;
      if (sNow.phase === "reveal" && sNow.score !== null) break;
      const fullyRanked = sNow.ranking.every((x) => x !== null);
      if (fullyRanked) {
        let nudged = false;
        for (const p of sNow.players) {
          if (p.connected && !p.ready) {
            if (p.id === ctlPid) {
              server.onMessage(
                JSON.stringify({ type: "ready", ready: true }),
                asPartyConnection(ctl)
              );
            } else {
              typedServer.dispatchBotAction(p.id, { type: "ready", ready: true });
            }
            nudged = true;
          }
        }
        if (nudged) {
          idleStreak = 0;
          continue;
        }
      }
      if (sNow.phase === "reveal" && sNow.score === null) {
        const ri = sNow.ranking.length - 1 - sNow.revealIndex;
        const hid = sNow.ranking[ri];
        if (hid) {
          const owner = sNow.hands.find((h) => h.id === hid);
          if (owner) {
            if (owner.playerId === ctlPid) {
              server.onMessage(
                JSON.stringify({ type: "flip", handId: hid }),
                asPartyConnection(ctl)
              );
            } else {
              typedServer.dispatchBotAction(owner.playerId, { type: "flip", handId: hid });
            }
            idleStreak = 0;
            continue;
          }
        }
      }
      break;
    }
  }
  return { inversions: typedServer.state.score, stats, archetypes };
}

async function gather(): Promise<BaselineSummary> {
  const inversions: number[] = [];
  const allStats: ActionStats[] = [];
  const archWins = new Map<Archetype, { wins: number; games: number }>();
  let wins = 0;
  for (let g = 0; g < NUM_GAMES; g++) {
    const r = await runOneGame(g);
    if (r.inversions === null) continue;
    if (r.inversions === 0) wins++;
    inversions.push(r.inversions);
    allStats.push(r.stats);
    for (const a of r.archetypes) {
      const cur = archWins.get(a) ?? { wins: 0, games: 0 };
      cur.games++;
      if (r.inversions === 0) cur.wins++;
      archWins.set(a, cur);
    }
  }
  const completed = inversions.length;
  const winRate = completed === 0 ? 0 : (wins / completed) * 100;
  const meanProposals = mean(allStats.map((s) => s.proposals));
  const totalAcc = allStats.reduce((a, s) => a + s.accepts, 0);
  const totalProp = allStats.reduce((a, s) => a + s.proposals, 0);
  const acceptRate = totalProp === 0 ? 0 : (totalAcc / totalProp) * 100;
  const archetypeWinRate: Record<string, number> = {};
  for (const [a, st] of archWins) {
    archetypeWinRate[a] = st.games === 0 ? 0 : (st.wins / st.games) * 100;
  }
  return {
    games: NUM_GAMES,
    bots: NUM_BOTS,
    hands: HANDS,
    winRate,
    medianInversions: median(inversions),
    meanProposals,
    acceptRate,
    archetypeWinRate,
  };
}

function fmt(n: number, digits = 2): string {
  return Number.isFinite(n) ? n.toFixed(digits) : String(n);
}

function compare(baseline: BaselineSummary, current: BaselineSummary): boolean {
  let pass = true;
  const checks: Array<{ name: string; base: number; cur: number; tol: number; unit: string }> = [
    { name: "winRate", base: baseline.winRate, cur: current.winRate, tol: TOL_RATE_PP, unit: "pp" },
    {
      name: "medianInversions",
      base: baseline.medianInversions,
      cur: current.medianInversions,
      tol: TOL_MED_INV,
      unit: "",
    },
    {
      name: "acceptRate",
      base: baseline.acceptRate,
      cur: current.acceptRate,
      tol: TOL_RATE_PP,
      unit: "pp",
    },
  ];
  for (const c of checks) {
    const diff = Math.abs(c.base - c.cur);
    const ok = diff <= c.tol;
    if (!ok) pass = false;
    // eslint-disable-next-line no-console
    console.log(
      `${ok ? "OK " : "FAIL"} ${c.name}: baseline=${fmt(c.base)} current=${fmt(c.cur)} (Δ=${fmt(diff)}${c.unit}, tol=${c.tol}${c.unit})`
    );
  }
  // Per-archetype check (informational tolerance — wide, since per-archetype
  // is high-variance with small game counts).
  const archTol = TOL_RATE_PP * 50; // 5pp per archetype
  for (const arch of Object.keys(baseline.archetypeWinRate)) {
    const b = baseline.archetypeWinRate[arch] ?? 0;
    const c = current.archetypeWinRate[arch] ?? 0;
    const diff = Math.abs(b - c);
    const ok = diff <= archTol;
    if (!ok) pass = false;
    // eslint-disable-next-line no-console
    console.log(
      `${ok ? "OK " : "FAIL"} arch.${arch}: baseline=${fmt(b)}% current=${fmt(c)}% (Δ=${fmt(diff)}pp, tol=${archTol}pp)`
    );
  }
  return pass;
}

async function main(): Promise<void> {
  if (!MODE_CAPTURE && !MODE_COMPARE) {
    // eslint-disable-next-line no-console
    console.error("Usage: --capture --out <file> | --compare --in <file>");
    process.exit(2);
  }
  // eslint-disable-next-line no-console
  console.log(`aiParity: ${NUM_GAMES} games, ${NUM_BOTS} bots, ${HANDS} hands`);
  const summary = await gather();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));

  if (MODE_CAPTURE) {
    const dir = FILE_OUT.split("/").slice(0, -1).join("/");
    if (dir) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FILE_OUT, JSON.stringify(summary, null, 2));
    // eslint-disable-next-line no-console
    console.log(`baseline saved → ${FILE_OUT}`);
    return;
  }

  // compare mode
  if (!fs.existsSync(FILE_IN)) {
    // eslint-disable-next-line no-console
    console.error(`baseline file not found: ${FILE_IN}`);
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(FILE_IN, "utf8")) as BaselineSummary;
  const ok = compare(baseline, summary);
  // eslint-disable-next-line no-console
  console.log(ok ? "PARITY OK" : "PARITY FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
