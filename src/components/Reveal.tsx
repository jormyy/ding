"use client";

import { useState } from "react";
import type { ClientMessage, GameState, Hand } from "@/lib/types";
import PokerTable from "./PokerTable";
import ChatPanel from "./ChatPanel";

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
  const myPlayer = gameState.players.find((p) => p.id === myId);
  const isCreator = myPlayer?.isCreator ?? false;
  const [viewingBoard, setViewingBoard] = useState(false);
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

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: "#0a1813" }}>
      {/* Header */}
      <div
        className="flex-none px-4 py-2 flex items-center justify-between"
        style={{
          background: "linear-gradient(180deg, rgba(20,60,36,0.95) 0%, rgba(10,40,22,0.98) 100%)",
          borderBottom: "1px solid rgba(201,165,74,0.2)",
          height: 54,
        }}
      >
        <span className="font-serif font-black" style={{ fontSize: 22, color: "#f5e6b8" }}>Ding</span>
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#c9a54a" }}>
          The Reveal
        </span>
        {allFlipped ? (
          <button
            onClick={() => setViewingBoard((v) => !v)}
            className="text-xs font-bold px-3 py-1 rounded-lg transition-colors"
            style={{ border: "1px solid rgba(201,165,74,0.3)", color: "#9fc5a8" }}
          >
            {viewingBoard ? "Results" : "Board"}
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Main area: table + chat sidebar */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden relative">
          <div className="relative w-full aspect-square sm:aspect-auto sm:h-full"
               style={{ background: "url('/felt.png') repeat, #0a3820", backgroundSize: "256px 256px" }}>
            <PokerTable
              gameState={gameState}
              myId={myId}
              onFlip={handleFlip}
            />

            {/* Ding + Fuck-off buttons + notifications */}
            <div className="absolute top-3 right-3 z-40 flex flex-col items-end gap-1.5">
              <button
                onClick={onDing}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none"
                aria-label="Ding"
              >
                🔔
              </button>
              <button
                onClick={onFuckoff}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none"
                aria-label="Fuck off"
              >
                🖕
              </button>
              {/* Mobile-only chat toggle */}
              <button
                onClick={() => setMobileChatOpen((v) => !v)}
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 transition-all text-xl select-none"
                aria-label="Chat"
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

          {/* Score overlay */}
          {allFlipped && !viewingBoard && (
            <div className="absolute inset-0 flex items-center justify-center z-30 p-4" style={{ background: "rgba(5,18,10,0.85)", backdropFilter: "blur(6px)" }}>
              <ScorePanel
                gameState={gameState}
                isCreator={isCreator}
                onPlayAgain={handlePlayAgain}
              />
            </div>
          )}

          {/* Mobile chat sheet */}
          {mobileChatOpen && (
            <div className="sm:hidden absolute inset-x-2 bottom-2 top-14 z-40 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <button
                onClick={() => setMobileChatOpen(false)}
                className="absolute top-1.5 right-2 z-10 text-gray-500 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center"
                aria-label="Close chat"
              >
                ✕
              </button>
              <ChatPanel messages={gameState.chatMessages ?? []} myId={myId} onSend={handleSendChat} />
            </div>
          )}
        </div>

        {/* Desktop chat sidebar — full height */}
        <div className="hidden sm:flex flex-none w-64 flex-col overflow-hidden" style={{ borderLeft: "1px solid rgba(201,165,74,0.18)", background: "#0a1813" }}>
          <ChatPanel messages={gameState.chatMessages ?? []} myId={myId} onSend={handleSendChat} />
        </div>
      </div>
    </div>
  );
}

interface ScorePanelProps {
  gameState: GameState;
  isCreator: boolean;
  onPlayAgain: () => void;
}

function ScorePanel({ gameState, isCreator, onPlayAgain }: ScorePanelProps) {
  const score = gameState.score ?? 0;
  const isPerfect = score === 0;

  const handMap = new Map<string, Hand>(gameState.hands.map((h) => [h.id, h]));
  const trueRanks = gameState.trueRanks;

  function getHandLabel(hand: Hand): string {
    const name =
      gameState.players.find((p) => p.id === hand.playerId)?.name ?? "?";
    if (gameState.handsPerPlayer === 1) return name;
    const idx = parseInt(hand.id.split("-").pop() ?? "0", 10);
    return `${name} (${idx + 1})`;
  }

  function getTieGroup(handId: string): [number, number] | null {
    if (!trueRanks || !gameState.trueRanking) return null;
    const myTrueRank = trueRanks[handId];
    // Find where this tie group starts in the true ranking (0-indexed position)
    const firstPos = gameState.trueRanking.findIndex((id) => trueRanks[id] === myTrueRank);
    const tieGroupSize = Object.values(trueRanks).filter((r) => r === myTrueRank).length;
    return [firstPos, tieGroupSize];
  }

  function isCorrectPlacement(handId: string, playerIndex: number): boolean {
    const group = getTieGroup(handId);
    if (!group) return false;
    const [firstPos, tieGroupSize] = group;
    const playerRank = playerIndex + 1;
    return playerRank >= firstPos + 1 && playerRank <= firstPos + tieGroupSize;
  }

  // Per-player total displacement: sum over each of the player's claimed hands
  // of the distance from the claimed slot to the nearest edge of that hand's
  // true tie-group (0 when placed inside the group).
  const displacementByPlayer = new Map<string, number>();
  if (trueRanks && gameState.trueRanking) {
    gameState.ranking.forEach((handId, i) => {
      if (!handId) return;
      const hand = handMap.get(handId);
      if (!hand) return;
      const group = getTieGroup(handId);
      if (!group) return;
      const [firstPos, tieGroupSize] = group;
      const playerRank = i + 1;
      let dist = 0;
      if (playerRank < firstPos + 1) {
        dist = firstPos + 1 - playerRank;
      } else if (playerRank > firstPos + tieGroupSize) {
        dist = playerRank - (firstPos + tieGroupSize);
      }
      displacementByPlayer.set(
        hand.playerId,
        (displacementByPlayer.get(hand.playerId) ?? 0) + dist
      );
    });
  }

  const leaderboard = Array.from(displacementByPlayer.entries())
    .map(([playerId, total]) => ({
      playerId,
      name: gameState.players.find((p) => p.id === playerId)?.name ?? "?",
      total,
    }))
    .sort((a, b) => a.total - b.total);

  // Competition ranking: ties share a rank, next slot skips.
  const ranked = leaderboard.map((entry) => ({
    ...entry,
    rank: leaderboard.findIndex((e) => e.total === entry.total) + 1,
  }));

  const minTotal = leaderboard.length > 0 ? leaderboard[0].total : 0;
  const maxTotal =
    leaderboard.length > 0 ? leaderboard[leaderboard.length - 1].total : 0;
  const allPerfectLeaderboard = leaderboard.length > 0 && maxTotal === 0;

  const D = {
    gold: "#c9a54a", goldBright: "#f5e6b8", goldTop: "#f0d278",
    ink: "#2a1a08", rail: "#78350f",
    panel: "linear-gradient(180deg, rgba(20,60,36,0.92) 0%, rgba(10,40,22,0.96) 100%)",
    panelBorder: "rgba(201,165,74,0.28)",
    sub: "#9fc5a8", muted: "#6a8a72", accent: "#2fb873", danger: "#c06060",
  };

  return (
    <div
      className="rounded-2xl p-6 shadow-2xl w-full max-w-lg max-h-[88dvh] overflow-y-auto flex flex-col gap-5"
      style={{ background: D.panel, border: `1px solid ${D.panelBorder}` }}
    >
      {/* Score */}
      <div className="text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: D.gold }}>The Reveal</div>
        <div
          className="font-serif font-black leading-none my-2"
          style={{
            fontSize: 80,
            background: `linear-gradient(180deg, ${D.goldBright} 0%, ${D.gold} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {score}
        </div>
        <div className="text-base font-semibold" style={{ color: D.goldBright }}>
          {isPerfect
            ? "Perfect! Zero inversions."
            : score === 1
            ? "1 inversion — one swap from perfect"
            : `${score} inversions`}
        </div>
      </div>

      {/* True vs player ranking */}
      {gameState.trueRanking && (
        <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.35)" }}>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: D.gold }}>True Ranking</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: D.muted }}>Your order</div>
              <div className="space-y-1">
                {gameState.ranking.map((handId, i) => {
                  if (!handId) return null;
                  const hand = handMap.get(handId);
                  if (!hand) return null;
                  const correct = isCorrectPlacement(handId, i);
                  return (
                    <div
                      key={handId}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                      style={correct
                        ? { background: "rgba(47,184,115,0.12)", border: "1px solid rgba(47,184,115,0.3)" }
                        : { background: "rgba(192,96,96,0.12)", border: "1px solid rgba(192,96,96,0.25)" }}
                    >
                      <span className="w-4" style={{ color: D.muted }}>{i + 1}.</span>
                      <span className="font-medium truncate flex-1" style={{ color: D.goldBright }}>{getHandLabel(hand)}</span>
                      <span style={{ color: correct ? D.accent : D.danger }}>{correct ? "✓" : "✗"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: D.muted }}>True order</div>
              <div className="space-y-1">
                {gameState.trueRanking.map((handId, i) => {
                  const hand = handMap.get(handId);
                  if (!hand) return null;
                  const displayRank = trueRanks?.[handId] ?? i + 1;
                  return (
                    <div
                      key={handId}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <span className="w-4" style={{ color: D.muted }}>{displayRank}.</span>
                      <span className="font-medium truncate flex-1" style={{ color: D.goldBright }}>{getHandLabel(hand)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-player leaderboard */}
      {leaderboard.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.35)" }}>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] mb-3" style={{ color: D.gold }}>Player Accuracy</div>
          <div className="grid grid-cols-2 gap-2">
            {ranked.map((entry) => {
              const isBest = entry.total === minTotal;
              const isWorst = entry.total === maxTotal && !allPerfectLeaderboard;
              return (
                <div
                  key={entry.playerId}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={allPerfectLeaderboard || isBest
                    ? { background: "rgba(47,184,115,0.12)", border: "1px solid rgba(47,184,115,0.3)" }
                    : isWorst
                    ? { background: "rgba(192,96,96,0.1)", border: "1px solid rgba(192,96,96,0.2)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-xs font-black w-5" style={{ color: isBest ? D.gold : isWorst ? D.danger : D.muted }}>#{entry.rank}</span>
                  <span className="flex-1 text-sm font-bold truncate" style={{ color: D.goldBright }}>{entry.name}</span>
                  <span className="text-sm font-black tabular-nums font-serif" style={{ color: isBest ? D.goldBright : isWorst ? D.danger : D.sub }}>
                    {entry.total} off
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Play again */}
      {isCreator ? (
        <button
          onClick={onPlayAgain}
          className="w-full py-4 rounded-xl font-black text-sm tracking-wide transition-all active:scale-95"
          style={{
            background: `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`,
            color: D.ink,
            boxShadow: `0 3px 0 ${D.rail}, 0 6px 16px rgba(0,0,0,0.35)`,
          }}
        >
          Deal again
        </button>
      ) : (
        <p className="text-center text-sm" style={{ color: D.muted }}>
          Waiting for host to start another game…
        </p>
      )}
    </div>
  );
}
