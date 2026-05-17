"use client";

import type React from "react";
import type { GameState } from "@/lib/types";
import ChatPanel from "../ChatPanel";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { findPlayerById } from "@/lib/utils";
import {
  computeRevealRows,
  computeDisplacementLeaderboard,
  computeInversionsData,
} from "@/lib/reveal/leaderboard";
import RevealHeader from "./reveal/RevealHeader";
import RevealRow from "./reveal/RevealRow";
import AccuracySidebar from "./reveal/AccuracySidebar";
import InversionsGraph from "./reveal/InversionsGraph";

/**
 * Banner-row chips that surface phase-effect overrides applied during the
 * round: scoring rule pivots, qualifier outcome, active hierarchy, last-rites
 * absorption, suit-strip, marked-wild board card. Renders nothing when no
 * effect is active so the reveal panel stays uncluttered for vanilla modes.
 */
function ShowdownEffectChips({ gameState }: { gameState: GameState }): React.ReactElement | null {
  const chips: { key: string; bg: string; fg: string; label: string }[] = [];

  if (gameState.qualifierResult && !gameState.qualifierResult.ok) {
    chips.push({
      key: "voided",
      bg: "rgba(220, 38, 38, 0.18)",
      fg: "#fca5a5",
      label: `VOIDED — ${gameState.qualifierResult.failedReason ?? "qualifier failed"}`,
    });
  } else if (gameState.qualifierResult?.ok) {
    chips.push({
      key: "qualified",
      bg: "rgba(34, 197, 94, 0.15)",
      fg: "#86efac",
      label: "Qualifier passed",
    });
  }

  if (gameState.scoreRuleOverride) {
    chips.push({
      key: "score-rule",
      bg: surfaces.goldFaint,
      fg: D.gold,
      label: `Scoring: ${gameState.scoreRuleOverride.toUpperCase()}`,
    });
  }

  if (gameState.handHierarchyId) {
    chips.push({
      key: "hierarchy",
      bg: "rgba(96, 165, 250, 0.14)",
      fg: "#93c5fd",
      label: `Order: ${formatHierarchy(gameState.handHierarchyId)}`,
    });
  }

  if (gameState.suitsStripped) {
    chips.push({
      key: "suits-stripped",
      bg: "rgba(168, 85, 247, 0.14)",
      fg: "#c4b5fd",
      label: "Board suits hidden",
    });
  }

  if (typeof gameState.markedBoardWildIndex === "number") {
    chips.push({
      key: "marked-wild",
      bg: "rgba(245, 158, 11, 0.14)",
      fg: "#fcd34d",
      label: `Wild: board card ${gameState.markedBoardWildIndex + 1}`,
    });
  }

  if (gameState.wildRankByEffect) {
    chips.push({
      key: "wild-rank",
      bg: "rgba(245, 158, 11, 0.14)",
      fg: "#fcd34d",
      label: `Wild rank: ${gameState.wildRankByEffect}`,
    });
  }

  if (gameState.absorbedHandIds && gameState.absorbedHandIds.length > 0) {
    chips.push({
      key: "absorbed",
      bg: "rgba(34, 197, 94, 0.14)",
      fg: "#86efac",
      label: `${gameState.absorbedHandIds.length} hand absorbed into board`,
    });
  }

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-2 pb-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="text-[9px] font-black uppercase tracking-widest rounded-md px-2 py-1"
          style={{ background: chip.bg, color: chip.fg, border: `1px solid ${chip.fg}33` }}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function formatHierarchy(id: string): string {
  switch (id) {
    case "hierarchyByMeta": return "BLESSED > NEUTRAL > CURSED";
    case "cyclicHandHierarchy": return "ROCK > SCISSORS > PAPER > ROCK";
    case "pactMergeFirstLast": return "FIRST + LAST MERGED";
    case "colorTeamAssign": return "RED TEAM > BLACK TEAM";
    case "adjacentRankBonus": return "ADJACENT RANK BONUS";
    case "matchRankInherit": return "MATCH-RANK INHERIT";
    case "forceAdjacentTie": return "ADJACENT SEATS TIE";
    case "crowdedRankPenalty": return "CROWDED RANK PENALTY";
    case "enforceOneCardPerBoardRow": return "ONE CARD PER ROW";
    case "bridgeCardChoice": return "BRIDGE CARD VOTES";
    case "uniqueHandClassRequired": return "UNIQUE CLASS ONLY";
    default: return id.toUpperCase();
  }
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
  isCustom: boolean;
  onCustomOutput: (text: string, rate: number, pitch: number) => void;
}

export default function RevealResults({
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
  isCustom,
  onCustomOutput,
}: RevealResultsProps) {
  const score = gameState.score ?? 0;
  const total = gameState.hands.length;
  const isCreator = findPlayerById(gameState.players, myId)?.isCreator ?? false;

  const rows = computeRevealRows(gameState, myId);
  const { ranked, best, worst, maxOff, myEntry } = computeDisplacementLeaderboard(gameState, myId);
  const inversionsData = computeInversionsData(gameState, myId);

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ background: D.cardBg, fontFamily: '"Inter", system-ui, sans-serif', color: D.text }}
    >
      <div style={{ position: "absolute", inset: 0, background: `url('/felt.png') repeat, ${D.feltLight}`, backgroundSize: "256px 256px", opacity: 0.18, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 30%, ${surfaces.goldPanel} 0%, transparent 60%)`, pointerEvents: "none", zIndex: 0 }} />

      <RevealHeader
        gameState={gameState}
        score={score}
        total={total}
        isCreator={isCreator}
        onPlayAgain={onPlayAgain}
        onDing={onDing}
        onFuckoff={onFuckoff}
        onToggleMobileChat={onToggleMobileChat}
        dingNotifications={dingNotifications}
        fuckoffNotifications={fuckoffNotifications}
        isCustom={isCustom}
        onCustomOutput={onCustomOutput}
      />

      <div className="flex-1 min-h-0 relative z-10 overflow-hidden" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 14 }}>
        {/* LEFT: Final hands list */}
        <div
          className="flex flex-col gap-1 min-h-0 overflow-hidden"
          style={{
            background: surfaces.disabledBg,
            border: `1px solid ${D.panelBorder}`,
            borderRadius: 12,
            padding: 10,
          }}
        >
          <div
            className="flex-none grid gap-2 px-2.5 pb-1 text-[8px] font-black uppercase tracking-widest"
            style={{ gridTemplateColumns: "28px 58px minmax(0,1fr) 62px 48px 20px", color: surfaces.goldEmphasis }}
          >
            <div>True</div>
            <div>Hole</div>
            <div>Hand · Player</div>
            <div className="text-center">Ranked</div>
            <div className="text-center">Δ</div>
            <div className="text-center">✓</div>
          </div>
          <ShowdownEffectChips gameState={gameState} />
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
            {rows.map((row) => (
              <RevealRow key={row.handId} row={row} total={total} />
            ))}
          </div>
        </div>

        {/* RIGHT: Inversions graph + accuracy */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          <InversionsGraph data={inversionsData} />
          <AccuracySidebar ranked={ranked} best={best} worst={worst} maxOff={maxOff} myEntry={myEntry} />
        </div>

        {mobileChatOpen && (
          <div className="sm:hidden absolute inset-x-2 bottom-2 top-16 z-40 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <button onClick={onToggleMobileChat} className="absolute top-1.5 right-2 z-10 text-gray-500 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center">✕</button>
            <ChatPanel messages={gameState.chatMessages} myId={myId} onSend={onSendChat} />
          </div>
        )}
      </div>
    </div>
  );
}
