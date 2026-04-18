"use client";

import { useState } from "react";
import type { ClientMessage, GameState, Hand, Card } from "@/lib/types";
import PokerTable from "./PokerTable";
import ChatPanel from "./ChatPanel";
import { CardFace } from "./CardFace";
import { cardToPokersolverStr } from "@/lib/utils";

const D = {
  gold: "#c9a54a",
  goldBright: "#f5e6b8",
  goldTop: "#f0d278",
  ink: "#2a1a08",
  rail: "#78350f",
  text: "#f5e6b8",
  sub: "#9fc5a8",
  muted: "#6a8a72",
  accent: "#2fb873",
  danger: "#c06060",
  panel: "linear-gradient(180deg, rgba(20,60,36,0.92) 0%, rgba(10,40,22,0.96) 100%)",
  panelBorder: "rgba(201,165,74,0.28)",
  cardBg: "#0a1813",
  serif: 'var(--font-playfair), Georgia, serif',
};

function getMadeHandName(holeCards: Card[], community: Card[]): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Hand: PokerHand } = require("pokersolver");
    const allCards = [...holeCards, ...community].map(cardToPokersolverStr);
    const solved = PokerHand.solve(allCards);
    return solved.descr as string;
  } catch {
    return "";
  }
}

// Inline chip for display (no interactivity)
function DisplayChip({
  rank,
  total,
  mine,
  size = 28,
}: {
  rank: number;
  total: number;
  mine?: boolean;
  size?: number;
}) {
  const isFirst = rank === 1;
  const isLast = rank === total;
  let bg = "#4a5568";
  let border = "#8a9ab0";
  let color = "#fff";
  if (isFirst) { bg = "#c9a54a"; border = "#f0d278"; color = "#2a1a08"; }
  else if (isLast) { bg = "#4a1014"; border = "#a84040"; color = "#ffb0b4"; }
  else if (mine) { bg = "#2fb873"; border = "#6ae09a"; color = "#04221a"; }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        border: `2px solid ${border}`,
        color,
        fontWeight: 900,
        fontSize: size * 0.46,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: D.serif,
      }}
    >
      {rank}
    </div>
  );
}

function HistoryStrip({
  ranks,
  total,
}: {
  ranks: (number | null)[];
  total: number;
}) {
  const labels = ["P", "F", "T", "R"];
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {labels.map((lab, i) => {
        const r = ranks[i] ?? null;
        const isFirst = r === 1;
        const isLast = r !== null && r === total;
        const bg = r === null
          ? "rgba(255,255,255,0.05)"
          : isFirst
          ? "#c9a54a"
          : isLast
          ? "#6a1822"
          : "rgba(255,255,255,0.1)";
        const col = r === null
          ? "rgba(255,255,255,0.2)"
          : isFirst
          ? "#2a1a08"
          : isLast
          ? "#e06070"
          : "rgba(245,230,184,0.85)";
        const bdr = r === null
          ? "rgba(255,255,255,0.1)"
          : isFirst
          ? "#f0d278"
          : isLast
          ? "#a84040"
          : "rgba(255,255,255,0.2)";
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                fontSize: 7,
                color: "rgba(201,165,74,0.55)",
                fontWeight: 900,
                letterSpacing: 0.4,
              }}
            >
              {lab}
            </div>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: bg,
                border: `1px solid ${bdr}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 900,
                color: col,
              }}
            >
              {r ?? "–"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RevealProps {
  gameState: GameState;
  myId: string;
  onSend: (msg: ClientMessage) => void;
  onDing: () => void;
  dingNotifications: { id: string; playerName: string }[];
  onFuckoff: () => void;
  fuckoffNotifications: { id: string; playerName: string }[];
}

export default function Reveal({
  gameState,
  myId,
  onSend,
  onDing,
  dingNotifications,
  onFuckoff,
  fuckoffNotifications,
}: RevealProps) {
  const allFlipped = gameState.score !== null;
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  function handleFlip(handId: string) {
    onSend({ type: "flip", handId });
  }

  function handlePlayAgain() {
    onSend({ type: "playAgain" });
  }

  function handleSendChat(text: string) {
    onSend({ type: "chat", text });
  }

  if (allFlipped) {
    return (
      <RevealResults
        gameState={gameState}
        myId={myId}
        onPlayAgain={handlePlayAgain}
        onDing={onDing}
        onFuckoff={onFuckoff}
        dingNotifications={dingNotifications}
        fuckoffNotifications={fuckoffNotifications}
        mobileChatOpen={mobileChatOpen}
        onToggleMobileChat={() => setMobileChatOpen((v) => !v)}
        onSendChat={handleSendChat}
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: "#0a1813" }}>
      <div
        className="flex-none px-4 py-2 flex items-center justify-between"
        style={{
          background: D.panel,
          borderBottom: `1px solid ${D.panelBorder}`,
          height: 54,
        }}
      >
        <span className="font-black" style={{ fontSize: 22, color: D.goldBright, fontFamily: D.serif }}>Ding</span>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: D.gold }}>
          The Reveal
        </span>
        <div className="w-16" />
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden relative">
          <div
            className="relative w-full aspect-square sm:aspect-auto sm:h-full"
            style={{ background: "url('/felt.png') repeat, #0a3820", backgroundSize: "256px 256px" }}
          >
            <PokerTable gameState={gameState} myId={myId} onFlip={handleFlip} />

            <div className="absolute top-3 right-3 z-40 flex flex-col items-end gap-1.5">
              <button
                onClick={onDing}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none"
              >
                🔔
              </button>
              <button
                onClick={onFuckoff}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none"
              >
                🖕
              </button>
              <button
                onClick={() => setMobileChatOpen((v) => !v)}
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none"
              >
                💬
              </button>
              <div className="flex flex-col items-end gap-1 pointer-events-none">
                {dingNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="bg-gray-900/90 border border-gray-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap"
                  >
                    {n.playerName} dings
                  </div>
                ))}
                {fuckoffNotifications.map((n) => (
                  <div
                    key={n.id}
                    className="bg-red-900/90 border border-red-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap"
                  >
                    {n.playerName} says fuck off
                  </div>
                ))}
              </div>
            </div>
          </div>

          {mobileChatOpen && (
            <div className="sm:hidden absolute inset-x-2 bottom-2 top-14 z-40 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <button
                onClick={() => setMobileChatOpen(false)}
                className="absolute top-1.5 right-2 z-10 text-gray-500 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
              <ChatPanel messages={gameState.chatMessages ?? []} myId={myId} onSend={handleSendChat} />
            </div>
          )}
        </div>

        <div
          className="hidden sm:flex flex-none w-64 flex-col overflow-hidden"
          style={{ borderLeft: `1px solid ${D.panelBorder}`, background: D.cardBg }}
        >
          <ChatPanel messages={gameState.chatMessages ?? []} myId={myId} onSend={handleSendChat} />
        </div>
      </div>
    </div>
  );
}

interface RevealResultsProps {
  gameState: GameState;
  myId: string;
  onPlayAgain: () => void;
  onDing: () => void;
  onFuckoff: () => void;
  dingNotifications: { id: string; playerName: string }[];
  fuckoffNotifications: { id: string; playerName: string }[];
  mobileChatOpen: boolean;
  onToggleMobileChat: () => void;
  onSendChat: (text: string) => void;
}

function RevealResults({
  gameState,
  myId,
  onPlayAgain,
  onDing,
  onFuckoff,
  dingNotifications,
  fuckoffNotifications,
  mobileChatOpen,
  onToggleMobileChat,
  onSendChat,
}: RevealResultsProps) {
  const score = gameState.score ?? 0;
  const trueRanks = gameState.trueRanks!;
  const trueRanking = gameState.trueRanking!;
  const total = gameState.hands.length;

  const myPlayer = gameState.players.find((p) => p.id === myId);
  const isCreator = myPlayer?.isCreator ?? false;

  const handMap = new Map<string, Hand>(gameState.hands.map((h) => [h.id, h]));

  // Build sorted rows by true rank (trueRanking is already in best→worst order)
  const rows = trueRanking.map((handId) => {
    const hand = handMap.get(handId)!;
    const player = gameState.players.find((p) => p.id === hand.playerId);
    const trueRank = trueRanks[handId];

    const guessedIdx = gameState.ranking.indexOf(handId);
    const guessedRank = guessedIdx === -1 ? null : guessedIdx + 1;

    // Correct if guessed within the tie group window
    const tieGroupMin = trueRanking.findIndex((id) => trueRanks[id] === trueRank) + 1;
    const tieGroupSize = Object.values(trueRanks).filter((r) => r === trueRank).length;
    const correct =
      guessedRank !== null &&
      guessedRank >= tieGroupMin &&
      guessedRank <= tieGroupMin + tieGroupSize - 1;

    const delta = guessedRank !== null ? guessedRank - trueRank : null;

    const madeHand =
      hand.flipped && hand.cards.length > 0
        ? getMadeHandName(hand.cards, gameState.communityCards)
        : "";

    const history = gameState.rankHistory?.[handId] ?? [null, null, null, null];
    const mine = hand.playerId === myId;

    return { handId, hand, player, trueRank, guessedRank, delta, correct, madeHand, history, mine };
  });

  // Displacement per player for accuracy leaderboard
  const displacementByPlayer = new Map<string, number>();
  gameState.ranking.forEach((handId, i) => {
    if (!handId) return;
    const hand = handMap.get(handId);
    if (!hand) return;
    const tR = trueRanks[handId];
    const tieMin = trueRanking.findIndex((id) => trueRanks[id] === tR) + 1;
    const tieSize = Object.values(trueRanks).filter((r) => r === tR).length;
    const claimed = i + 1;
    let dist = 0;
    if (claimed < tieMin) dist = tieMin - claimed;
    else if (claimed > tieMin + tieSize - 1) dist = claimed - (tieMin + tieSize - 1);
    displacementByPlayer.set(
      hand.playerId,
      (displacementByPlayer.get(hand.playerId) ?? 0) + dist
    );
  });

  const leaderboard = Array.from(displacementByPlayer.entries())
    .map(([playerId, off]) => ({
      playerId,
      name: gameState.players.find((p) => p.id === playerId)?.name ?? "?",
      off,
      mine: playerId === myId,
    }))
    .sort((a, b) => a.off - b.off);

  const ranked = leaderboard.map((entry, idx) => ({
    ...entry,
    rank: leaderboard.findIndex((e) => e.off === entry.off) + 1,
    isMe: idx === leaderboard.findIndex((e) => e.playerId === myId),
  }));

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  const maxOff = Math.max(...ranked.map((r) => r.off), 1);
  const myEntry = ranked.find((r) => r.mine);

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: D.cardBg, fontFamily: '"Inter", system-ui, sans-serif', color: D.text }}
    >
      {/* Felt texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "url('/felt.png') repeat, #0a3820",
          backgroundSize: "256px 256px",
          opacity: 0.18,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 30%, rgba(201,165,74,0.08) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <div
        className="flex-none relative z-10 flex items-center gap-4 px-5"
        style={{
          height: 62,
          background: D.panel,
          borderBottom: `1px solid ${D.panelBorder}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* Title */}
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.35em]" style={{ color: D.gold }}>
            The Reveal
          </div>
          <div
            className="font-black leading-none"
            style={{ fontSize: 20, color: D.goldBright, fontFamily: D.serif }}
          >
            {gameState.players.length} players · {total} hands
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />

        {/* Score */}
        <div className="flex items-baseline gap-2">
          <div
            className="font-black leading-none"
            style={{
              fontSize: 48,
              fontFamily: D.serif,
              background: `linear-gradient(180deg, ${D.goldBright} 0%, ${D.gold} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {score}
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: D.goldBright }}>
              {score === 0 ? "Perfect!" : score === 1 ? "inversion" : "inversions"}
            </div>
            <div className="text-[10px]" style={{ color: D.muted }}>
              {score === 0 ? "Zero swaps from perfect" : "hands out of order"}
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: "rgba(255,255,255,0.1)" }} />

        {/* Board */}
        <div className="flex items-center gap-2">
          <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: D.gold }}>
            Board
          </div>
          <div className="flex gap-1">
            {gameState.communityCards.map((c, i) => (
              <CardFace key={i} card={c} tiny />
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Reactions */}
        <div className="flex gap-2">
          <button
            onClick={onDing}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg select-none transition-all active:scale-90"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            🔔
          </button>
          <button
            onClick={onFuckoff}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg select-none transition-all active:scale-90"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            🖕
          </button>
          <button
            onClick={onToggleMobileChat}
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-full text-lg select-none"
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            💬
          </button>
        </div>

        {/* Notifications */}
        <div className="flex flex-col items-end gap-1 pointer-events-none absolute top-14 right-4 z-50">
          {dingNotifications.map((n) => (
            <div
              key={n.id}
              className="bg-gray-900/90 border border-gray-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap"
            >
              {n.playerName} dings
            </div>
          ))}
          {fuckoffNotifications.map((n) => (
            <div
              key={n.id}
              className="bg-red-900/90 border border-red-700 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-fade-out whitespace-nowrap"
            >
              {n.playerName} says fuck off
            </div>
          ))}
        </div>

        {/* Deal again */}
        {isCreator ? (
          <button
            onClick={onPlayAgain}
            className="flex-none px-5 py-2.5 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95"
            style={{
              background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`,
              color: D.ink,
              boxShadow: `0 3px 0 ${D.rail}, 0 6px 16px rgba(0,0,0,0.35)`,
            }}
          >
            Deal again →
          </button>
        ) : (
          <div className="text-xs" style={{ color: D.muted }}>
            Waiting for host…
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 relative z-10 flex overflow-hidden">
        {/* Main table */}
        <div className="flex-1 min-w-0 flex flex-col p-4 gap-3 overflow-hidden">
          {/* Column headers */}
          <div
            className="flex-none px-2 grid gap-2 text-[9px] font-black uppercase tracking-widest"
            style={{
              gridTemplateColumns: "30px 60px 1fr 76px 66px 28px",
              color: "rgba(201,165,74,0.55)",
            }}
          >
            <div>True</div>
            <div>Hole</div>
            <div>Made hand</div>
            <div>Streets</div>
            <div>Guessed</div>
            <div />
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {rows.map((row) => (
              <div
                key={row.handId}
                className="grid gap-2 items-center px-2 py-1.5 rounded-lg"
                style={{
                  gridTemplateColumns: "30px 60px 1fr 76px 66px 28px",
                  background: row.mine
                    ? `${D.gold}1a`
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${row.mine ? D.gold + "55" : "rgba(255,255,255,0.05)"}`,
                }}
              >
                {/* True rank chip */}
                <DisplayChip rank={row.trueRank} total={total} mine={row.mine} size={26} />

                {/* Hole cards */}
                <div className="flex gap-1">
                  {row.hand.cards.length > 0 ? (
                    row.hand.cards.map((c, j) => <CardFace key={j} card={c} tiny />)
                  ) : (
                    <>
                      <div
                        className="rounded-sm"
                        style={{
                          width: 26,
                          height: 38,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px dashed rgba(255,255,255,0.15)",
                        }}
                      />
                      <div
                        className="rounded-sm"
                        style={{
                          width: 26,
                          height: 38,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px dashed rgba(255,255,255,0.15)",
                        }}
                      />
                    </>
                  )}
                </div>

                {/* Player + made hand */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="font-bold text-sm truncate"
                      style={{ color: row.mine ? D.goldBright : D.text }}
                    >
                      {row.player?.name ?? "?"}
                    </span>
                    {row.mine && (
                      <span className="text-[9px] font-bold flex-none" style={{ color: D.accent }}>
                        (you)
                      </span>
                    )}
                  </div>
                  {row.madeHand && (
                    <div
                      className="text-[11px] truncate italic"
                      style={{ color: D.sub, fontFamily: D.serif }}
                    >
                      {row.madeHand}
                    </div>
                  )}
                </div>

                {/* Street history */}
                <HistoryStrip ranks={row.history} total={total} />

                {/* Guessed rank */}
                <div className="flex items-center gap-1.5">
                  {row.guessedRank !== null ? (
                    <>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: row.correct
                            ? "rgba(47,184,115,0.15)"
                            : "rgba(192,96,96,0.15)",
                          border: `1px solid ${row.correct ? D.accent + "77" : D.danger + "77"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 900,
                          color: row.correct ? D.accent : D.danger,
                          flexShrink: 0,
                        }}
                      >
                        {row.guessedRank}
                      </div>
                      {!row.correct && row.delta !== null && (
                        <div
                          className="text-[10px] font-black tabular-nums"
                          style={{ color: D.danger }}
                        >
                          {row.delta > 0 ? "+" : ""}
                          {row.delta}
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        border: "1.5px dashed rgba(255,255,255,0.15)",
                      }}
                    />
                  )}
                </div>

                {/* ✓/✗ */}
                <div
                  className="text-base font-black text-center"
                  style={{ color: row.correct ? D.accent : D.danger }}
                >
                  {row.correct ? "✓" : "✗"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accuracy sidebar */}
        <div
          className="flex-none w-64 flex flex-col gap-3 p-4 overflow-hidden"
          style={{
            borderLeft: `1px solid ${D.panelBorder}`,
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: D.gold }}>
            Player Accuracy
          </div>

          {/* Best / Worst callouts */}
          {ranked.length >= 2 && (
            <div className="flex gap-2">
              <div
                className="flex-1 p-2.5 rounded-xl"
                style={{
                  background: `linear-gradient(180deg, ${D.gold}22, ${D.gold}08)`,
                  border: `1px solid ${D.gold}77`,
                }}
              >
                <div className="text-[7px] font-black uppercase tracking-widest" style={{ color: D.gold }}>
                  🏆 Sharpest
                </div>
                <div className="text-sm font-black mt-0.5" style={{ color: D.goldBright }}>
                  {best.name}
                </div>
                <div className="text-[10px]" style={{ color: D.sub }}>
                  {best.off === 0 ? "perfect · 0 off" : `${best.off} off`}
                </div>
              </div>
              {worst.off > 0 && (
                <div
                  className="flex-1 p-2.5 rounded-xl"
                  style={{
                    background: "linear-gradient(180deg, rgba(192,96,96,0.16), rgba(192,96,96,0.04))",
                    border: `1px solid ${D.danger}77`,
                  }}
                >
                  <div className="text-[7px] font-black uppercase tracking-widest" style={{ color: D.danger }}>
                    💥 Furthest
                  </div>
                  <div className="text-sm font-black mt-0.5" style={{ color: "#ffb0b4" }}>
                    {worst.name}
                  </div>
                  <div className="text-[10px]" style={{ color: D.sub }}>
                    {worst.off} off
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard */}
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
            {ranked.map((entry, i) => {
              const pct = maxOff > 0 ? Math.min(100, (entry.off / maxOff) * 100) : 0;
              const barColor =
                entry.off === 0
                  ? `linear-gradient(90deg, ${D.gold}, ${D.goldBright})`
                  : entry.off >= maxOff
                  ? D.danger
                  : D.accent;
              const labelColor =
                entry.off === 0 ? D.gold : entry.off >= maxOff ? D.danger : D.sub;
              return (
                <div
                  key={entry.playerId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md"
                  style={{
                    background: entry.mine ? `${D.gold}12` : "transparent",
                    border: entry.mine ? `1px solid ${D.gold}44` : "1px solid transparent",
                  }}
                >
                  <div
                    className="text-[10px] font-black text-right"
                    style={{ width: 16, color: labelColor }}
                  >
                    #{entry.rank}
                  </div>
                  <div
                    className="text-xs font-bold truncate"
                    style={{ width: 48, color: entry.mine ? D.goldBright : D.text }}
                  >
                    {entry.name}
                  </div>
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{ height: 5, background: "rgba(255,255,255,0.06)" }}
                  >
                    <div
                      style={{
                        width: `${100 - pct}%`,
                        height: "100%",
                        background: barColor,
                        borderRadius: 9999,
                      }}
                    />
                  </div>
                  <div
                    className="text-[11px] font-black text-right tabular-nums"
                    style={{ width: 32, color: labelColor, fontFamily: D.serif }}
                  >
                    {entry.off} off
                  </div>
                </div>
              );
            })}
          </div>

          {/* Your result summary */}
          {myEntry && (
            <div
              className="p-2.5 rounded-lg text-xs leading-relaxed"
              style={{
                background:
                  myEntry.off === 0
                    ? "rgba(47,184,115,0.1)"
                    : "rgba(201,165,74,0.08)",
                border: `1px solid ${myEntry.off === 0 ? D.accent + "44" : D.panelBorder}`,
                color: D.sub,
              }}
            >
              {myEntry.off === 0 ? (
                <>
                  <span className="font-black" style={{ color: D.accent }}>
                    You nailed it
                  </span>{" "}
                  — perfect ranking!
                </>
              ) : myEntry.rank === 1 ? (
                <>
                  <span className="font-black" style={{ color: D.goldBright }}>
                    Tied for 1st
                  </span>{" "}
                  — {myEntry.off} off total.
                </>
              ) : (
                <>
                  You ranked{" "}
                  <span className="font-black" style={{ color: D.goldBright }}>
                    #{myEntry.rank}
                  </span>{" "}
                  — {myEntry.off} off total.
                </>
              )}
            </div>
          )}

          {/* Legend */}
          <div
            className="text-[9px] flex gap-3"
            style={{ color: D.muted }}
          >
            <span>
              <span className="font-black" style={{ color: D.accent }}>✓</span> correct
            </span>
            <span>
              <span className="font-black" style={{ color: D.danger }}>✗</span> swapped
            </span>
          </div>
        </div>

        {/* Mobile chat sheet */}
        {mobileChatOpen && (
          <div className="sm:hidden absolute inset-x-2 bottom-2 top-16 z-40 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <button
              onClick={onToggleMobileChat}
              className="absolute top-1.5 right-2 z-10 text-gray-500 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
            <ChatPanel messages={gameState.chatMessages ?? []} myId={myId} onSend={onSendChat} />
          </div>
        )}
      </div>
    </div>
  );
}
