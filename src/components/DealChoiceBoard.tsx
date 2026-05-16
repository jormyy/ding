"use client";

import { useState } from "react";
import type { ClientMessage, GameState, Hand } from "@/lib/types";
import { getGameModeDefinition } from "@/lib/gameMode";
import { D } from "@/lib/theme";
import { surfaces } from "@/lib/tokens";
import { CardFace } from "./CardFace";
import { resolveDealChoiceVariant } from "@/lib/gameMode/dealChoiceVariant";
import PeekBoardBoard from "./dealChoice/PeekBoardBoard";
import SacrificeBoard from "./dealChoice/SacrificeBoard";
import OptInHole3Board from "./dealChoice/OptInHole3Board";
import BlindPoolBoard from "./dealChoice/BlindPoolBoard";
import AuctionBoard from "./dealChoice/AuctionBoard";
import RecruitBoard from "./dealChoice/RecruitBoard";
import SolomonBoard from "./dealChoice/SolomonBoard";
import TablePicksBoard from "./dealChoice/TablePicksBoard";

interface DealChoiceBoardProps {
  gameState: GameState;
  myId: string;
  code?: string;
  onSend: (msg: ClientMessage) => void;
}

export default function DealChoiceBoard({
  gameState,
  myId,
  code,
  onSend,
}: DealChoiceBoardProps) {
  const mode = getGameModeDefinition(gameState.modeId);
  const myHands = gameState.hands.filter((hand) => hand.playerId === myId);
  const choices = gameState.dealChoices ?? {};
  const isTradeUp = mode.deal.dealChoice?.tradeUp === true;
  const isInheritance = mode.deal.dealChoice?.inheritance === true;
  const isExposeChoice = mode.deal.publicCardSelection === "playerChoice";
  const variant = resolveDealChoiceVariant(mode);

  return (
    <div className="h-[100dvh] flex flex-col" style={{ background: "#0a1813" }}>
      <div
        className="flex-none flex items-center gap-3 px-4"
        style={{
          height: 54,
          background:
            "linear-gradient(180deg, rgba(20,60,36,0.95) 0%, rgba(10,40,22,0.98) 100%)",
          borderBottom: "1px solid rgba(201,165,74,0.2)",
        }}
      >
        <span className="font-serif font-black" style={{ fontSize: 22, color: "#f5e6b8" }}>
          Ding
        </span>
        {code && (
          <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: D.gold }}>
            Room {code}
          </span>
        )}
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
          style={{
            color: "#f5e6b8",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {mode.shortName}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => onSend({ type: "endGame" })}
          className="text-[11px] font-bold transition-colors"
          style={{ color: "#c06060" }}
        >
          End
        </button>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          background: "url('/felt.png') repeat, #0a3820",
          backgroundSize: "256px 256px",
        }}
      >
        <div className="min-h-full flex items-center justify-center p-4">
          <div
            className="w-full max-w-5xl grid gap-4 lg:grid-cols-[1fr_280px]"
            style={{ color: "#f5e6b8" }}
          >
            <div
              className="rounded-lg p-4"
              style={{
                background: "rgba(6,30,16,0.94)",
                border: `1px solid ${D.panelBorder}`,
                boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: D.accent }}>
                    Deal choice
                  </div>
                  <h1 className="font-serif font-black text-2xl leading-tight">
                    {variantHeadline(variant, { isTradeUp, isInheritance, isExposeChoice })}
                  </h1>
                </div>
                <div className="text-xs font-bold text-right" style={{ color: D.sub }}>
                  {readyCount(gameState)}/{gameState.hands.length} locked
                </div>
              </div>

              {variant === "peekBoard" && (
                <PeekBoardBoard gameState={gameState} myId={myId} onSend={onSend} />
              )}
              {variant === "sacrificeForPeek" && (
                <SacrificeBoard gameState={gameState} myId={myId} onSend={onSend} />
              )}
              {variant === "optInHole3WithPenalty" && (
                <OptInHole3Board gameState={gameState} myId={myId} onSend={onSend} />
              )}
              {variant === "blindPool" && (
                <BlindPoolBoard gameState={gameState} myId={myId} onSend={onSend} />
              )}
              {variant === "auction" && (
                <AuctionBoard gameState={gameState} myId={myId} onSend={onSend} />
              )}
              {variant === "recruit" && (
                <RecruitBoard gameState={gameState} myId={myId} onSend={onSend} />
              )}
              {variant === "solomon" && (
                <SolomonBoard gameState={gameState} myId={myId} onSend={onSend} />
              )}
              {variant === "tablePicks" && (
                <TablePicksBoard gameState={gameState} myId={myId} onSend={onSend} />
              )}
              {(variant === "peekKeep" || variant === "mulligan" || variant === "tradeUp" ||
                variant === "inheritance" || variant === "exposeChoice") && (
                <div className="grid gap-3">
                  {myHands.map((hand, index) => (
                    <ChoiceHandRow
                      key={`${hand.id}-${hand.cards.map((card) => `${card.rank}${card.suit}`).join("-")}`}
                      hand={hand}
                      handNumber={index + 1}
                      keepCards={choices[hand.id]?.keepCards ?? 0}
                      submitted={choices[hand.id]?.submitted ?? false}
                      canMulligan={choices[hand.id]?.canMulligan ?? false}
                      mulliganUsed={choices[hand.id]?.mulliganUsed ?? false}
                      tradeUp={choices[hand.id]?.tradeUp ?? false}
                      inheritance={choices[hand.id]?.inheritance ?? false}
                      exposeChoice={isExposeChoice}
                      initialSelected={choices[hand.id]?.selectedIndexes ?? []}
                      onChoose={(indexes) => onSend({ type: "chooseDealCards", handId: hand.id, indexes })}
                      onMulligan={() => onSend({ type: "mulliganHand", handId: hand.id })}
                    />
                  ))}
                </div>
              )}
            </div>

            <div
              className="rounded-lg p-4 flex flex-col gap-3"
              style={{
                background: "rgba(6,30,16,0.9)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: D.sub }}>
                Table status
              </div>
              {gameState.players.map((player) => {
                const hands = gameState.hands.filter((hand) => hand.playerId === player.id);
                const locked = hands.filter((hand) => choices[hand.id]?.submitted).length;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 rounded px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <span className="text-sm font-bold truncate">
                      {player.name}
                      {player.id === myId && <span style={{ color: D.accent }}> (you)</span>}
                    </span>
                    <span className="text-xs font-black" style={{ color: locked === hands.length ? D.accent : D.sub }}>
                      {locked}/{hands.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoiceHandRow({
  hand,
  handNumber,
  keepCards,
  submitted,
  canMulligan,
  mulliganUsed,
  tradeUp,
  inheritance,
  exposeChoice,
  initialSelected,
  onChoose,
  onMulligan,
}: {
  hand: Hand;
  handNumber: number;
  keepCards: number;
  submitted: boolean;
  canMulligan: boolean;
  mulliganUsed: boolean;
  tradeUp: boolean;
  inheritance: boolean;
  exposeChoice: boolean;
  initialSelected: readonly number[];
  onChoose: (indexes: number[]) => void;
  onMulligan: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialSelected));
  const selectedIndexes = [...selected].sort((a, b) => a - b);
  const canSubmit = selectedIndexes.length === keepCards && !submitted;
  const canRedraw = canMulligan && !mulliganUsed && !submitted;

  function toggle(index: number) {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else if (next.size < keepCards) {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div
      className="grid gap-3 md:grid-cols-[120px_1fr_140px] md:items-center rounded-lg p-3"
      style={{ background: "rgba(10,40,22,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: D.sub }}>
          Hand #{handNumber}
        </div>
        <div className="text-sm font-black" style={{ color: D.goldBright }}>
          {selected.size}/{keepCards} {tradeUp ? "picked" : exposeChoice ? "exposed" : "kept"}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {hand.cards.map((card, index) => {
          const isSelected = selected.has(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => toggle(index)}
              disabled={submitted}
              className="rounded-lg p-1 transition-all disabled:cursor-default"
              style={{
                background: isSelected ? "rgba(201,165,74,0.2)" : surfaces.disabledBg,
                border: isSelected ? "2px solid #c9a54a" : "2px solid rgba(255,255,255,0.08)",
                opacity: submitted && !isSelected ? 0.35 : 1,
              }}
              aria-pressed={isSelected}
              aria-label={`Card ${index + 1}`}
            >
              <CardFace card={card} small />
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        {canMulligan && (
          <button
            type="button"
            disabled={!canRedraw}
            onClick={onMulligan}
            className="h-8 rounded-md text-[11px] font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed"
            style={{
              background: mulliganUsed ? "rgba(255,255,255,0.06)" : surfaces.dangerLight,
              color: mulliganUsed ? D.sub : "#f08a6c",
              border: "1px solid rgba(240,138,108,0.32)",
            }}
            aria-label={`Mulligan hand ${handNumber}`}
          >
            {mulliganUsed ? "Redrawn" : "Mulligan"}
          </button>
        )}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onChoose(selectedIndexes)}
          className="h-10 rounded-md text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed"
          style={{
            background: submitted
              ? surfaces.accentLight
              : `linear-gradient(180deg, ${D.goldTop}, ${D.gold})`,
            color: submitted ? D.accent : D.ink,
            border: submitted ? "1px solid rgba(47,184,115,0.35)" : "none",
          }}
        >
          {submitted ? "Locked" : tradeUp ? "Trade" : inheritance ? "Inherit" : exposeChoice ? "Expose" : "Keep"}
        </button>
      </div>
    </div>
  );
}

function readyCount(gameState: GameState): number {
  return Object.values(gameState.dealChoices ?? {}).filter((choice) => choice.submitted).length;
}

function variantHeadline(
  variant: ReturnType<typeof resolveDealChoiceVariant>,
  flags: { isTradeUp: boolean; isInheritance: boolean; isExposeChoice: boolean },
): string {
  switch (variant) {
    case "tradeUp": return "Trade one card left";
    case "inheritance": return "Keep one, inherit one";
    case "exposeChoice": return "Pick a card to expose";
    case "auction": return "Auction row — claim cards in ready order";
    case "blindPool": return "Drop one in the pool, draw one back blind";
    case "peekBoard": return "Peek the future, then lock your hand";
    case "sacrificeForPeek": return "Sacrifice a hole to peek the flop";
    case "recruit": return "Keep two, then steal one from the right neighbor";
    case "solomon": return "Split into pairs — left neighbor picks";
    case "tablePicks": return "Other players vote on your hand";
    case "optInHole3WithPenalty": return "Take a 3rd hole at the cost of one rank";
    case "draftFromFlop": return "Draft from the flop";
    case "mulligan":
    case "peekKeep":
    default:
      if (flags.isTradeUp) return "Trade one card left";
      if (flags.isInheritance) return "Keep one, inherit one";
      if (flags.isExposeChoice) return "Pick a card to expose";
      return "Keep your starting cards";
  }
}
