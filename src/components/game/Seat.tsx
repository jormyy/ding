"use client";

import type { AcquireRequest, Hand, Player } from "@/lib/types";
import { CardFace, CardBack } from "../CardFace";
import RankChip, { HistoryChip } from "../RankChip";
import { PHASE_HISTORY_LABELS } from "@/lib/constants";

export interface SeatProps {
  player: Player;
  hands: Hand[];
  isMe: boolean;
  rankMap: Map<string, number>;
  totalHands: number;
  handsPerPlayer: number;
  isReveal: boolean;
  selectedHandId: string | null;
  hasSelection: boolean;
  onHandClick: (handId: string) => void;
  onUnclaim: (handId: string) => void;
  currentFlipHandId: string | null;
  onFlip: ((handId: string) => void) | null;
  isMobile: boolean;
  rankHistory: Record<string, (number | null)[]>;
  acquireRequests: AcquireRequest[];
  stackHands?: boolean;
}

export default function Seat({
  player,
  hands,
  isMe,
  rankMap,
  totalHands,
  handsPerPlayer,
  isReveal,
  selectedHandId,
  hasSelection,
  onHandClick,
  onUnclaim,
  currentFlipHandId,
  onFlip,
  isMobile,
  rankHistory,
  acquireRequests,
  stackHands = true,
}: SeatProps) {
  const isFlipTurn =
    currentFlipHandId !== null && hands.some((h) => h.id === currentFlipHandId);
  // Owner flips their own hand. If owner is disconnected, any other connected
  // player can flip on their behalf so reveal doesn't stall — the server
  // enforces the same rule.
  const canFlip = isFlipTurn && (isMe || !player.connected);

  const nameMaxW = isMobile ? "max-w-[60px]" : "max-w-[120px]";
  const cardProps = isMobile ? { tiny: true as const } : { small: true as const };
  const tightPadding = isMobile && handsPerPlayer > 1;

  return (
    <div
      className={[
        "flex flex-col items-center rounded-xl transition-all",
        tightPadding ? "gap-0.5 px-1 py-1" : isMobile ? "gap-1 px-1.5 py-1.5" : "gap-1.5 px-2 py-2",
        isFlipTurn ? "animate-[pulse_2s_ease-in-out_infinite]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: isMe
          ? "linear-gradient(180deg, rgba(20,70,40,0.85) 0%, rgba(8,34,20,0.95) 100%)"
          : "rgba(6,28,16,0.72)",
        border: isFlipTurn
          ? "1.5px solid rgba(255,215,0,0.8)"
          : isMe
          ? "1.5px solid #c9a54a"
          : "1.5px solid rgba(255,255,255,0.08)",
        boxShadow: isMe
          ? "0 6px 18px rgba(201,165,74,0.2)"
          : "0 2px 6px rgba(0,0,0,0.3)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Player name */}
      <div className="flex items-center gap-1 leading-tight">
        {player.ready && !isReveal && (
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#2fb873" }} />
        )}
        <div
          className={`text-[10px] font-black truncate uppercase tracking-wide ${nameMaxW}`}
          style={{ color: isMe ? "#f5e6b8" : !player.connected ? "rgba(159,197,168,0.5)" : "#9fc5a8" }}
        >
          {player.name}
        </div>
        {!player.connected && (
          <span
            className="text-[8px] font-black uppercase tracking-widest flex-shrink-0"
            style={{ color: "#c06060" }}
            title="Disconnected"
          >
            offline
          </span>
        )}
      </div>

      {/* Reveal flip prompt */}
      {isReveal && isFlipTurn && (
        <div className="flex flex-col items-center gap-0.5">
          {canFlip && currentFlipHandId ? (
            <button
              onClick={() => onFlip?.(currentFlipHandId)}
              className="text-[10px] font-black bg-yellow-500 hover:bg-yellow-400 text-black px-2 py-0.5 rounded-full transition-all active:scale-95"
            >
              FLIP!
            </button>
          ) : (
            <div className="text-[8px] text-yellow-400 font-semibold">flipping...</div>
          )}
        </div>
      )}

      {/* Hands */}
      {(() => {
        const renderHand = (hand: Hand, handIdx: number) => {
          const rank = rankMap.get(hand.id) ?? null;
          const isSelected = selectedHandId === hand.id;
          const isDropTarget = hasSelection && !isSelected;
          const isHighlighted = hand.id === currentFlipHandId;
          const history = rankHistory[hand.id] ?? [];
          const isClickableArea = !isReveal && (isMe || hasSelection);

          return (
            <div key={hand.id} className="flex flex-col items-center gap-1">
              {handsPerPlayer > 1 && !isMobile && (
                <div className="text-[9px] text-gray-600 font-medium">#{handIdx + 1}</div>
              )}

              {/* Card pair */}
              <div
                className={[
                  "flex gap-0.5 rounded-lg p-0.5 transition-all",
                  isHighlighted ? "ring-2 ring-yellow-400 bg-yellow-400/10" : "",
                  isDropTarget && !isReveal
                    ? "cursor-pointer ring-1 ring-yellow-400/40 hover:ring-yellow-400/60"
                    : "",
                  isClickableArea && rank === null && !isReveal
                    ? "cursor-pointer hover:ring-1 hover:ring-green-500/40"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={
                  !isReveal && (isDropTarget || (isClickableArea && rank === null))
                    ? () => onHandClick(hand.id)
                    : undefined
                }
              >
                {isReveal
                  ? hand.flipped && hand.cards.length > 0
                    ? hand.cards.map((card, i) => <CardFace key={i} card={card} {...cardProps} />)
                    : [0, 1].map((i) => <CardBack key={i} {...cardProps} />)
                  : isMe && hand.cards.length > 0
                  ? hand.cards.map((card, i) => <CardFace key={i} card={card} {...cardProps} />)
                  : [0, 1].map((i) => <CardBack key={i} {...cardProps} />)}
              </div>

              {/* Rank chip + history */}
              {!isReveal && (() => {
                const handRequests = acquireRequests.filter(
                  (r) => r.initiatorHandId === hand.id || r.recipientHandId === hand.id
                );
                return (
                  <div className="flex flex-col items-center gap-0.5">
                    {rank !== null ? (
                      <div className="relative">
                        <RankChip
                          rank={rank}
                          total={totalHands}
                          isOwn={isMe}
                          isSelected={isSelected}
                          hasSelection={hasSelection}
                          onClick={() => onHandClick(hand.id)}
                          onDoubleClick={isMe ? () => onUnclaim(hand.id) : undefined}
                          small={isMobile}
                        />
                        {handRequests.length > 0 && (
                          <div className="absolute -top-1.5 -right-1.5 min-w-[13px] h-[13px] bg-orange-500 rounded-full text-[7px] font-black text-white flex items-center justify-center px-0.5 pointer-events-none">
                            {(() => {
                              const req = handRequests[0];
                              const initRank = rankMap.get(req.initiatorHandId);
                              const recRank = rankMap.get(req.recipientHandId);
                              if (req.kind === "swap" && initRank && recRank) return `${initRank}↔${recRank}`;
                              if (req.kind === "offer" && initRank) return `${initRank}→`;
                              if (req.kind === "acquire" && recRank) return `→${recRank}`;
                              return "!";
                            })()}
                          </div>
                        )}
                        {isMe && isSelected && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onUnclaim(hand.id); }}
                            title="Return to board"
                            aria-label="Return chip to the board"
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-500 text-[9px] text-white font-bold flex items-center justify-center shadow"
                          >↺</button>
                        )}
                      </div>
                    ) : (
                      <div
                        className={[
                          "rounded-full border-2 border-dashed flex items-center justify-center transition-all",
                          isMobile ? "w-6 h-6" : "w-8 h-8",
                          hasSelection && isMe
                            ? "border-yellow-400/60 cursor-pointer hover:border-yellow-400 hover:bg-yellow-400/10"
                            : "border-gray-700/40",
                        ].join(" ")}
                        onClick={hasSelection && isMe ? () => onHandClick(hand.id) : undefined}
                      />
                    )}
                    {history.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {history.map((r, phaseIdx) => (
                          <HistoryChip key={phaseIdx} rank={r} total={totalHands} phaseLabel={PHASE_HISTORY_LABELS[phaseIdx] ?? ""} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* History chips during reveal */}
              {isReveal && history.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {history.map((r, phaseIdx) => (
                    <HistoryChip key={phaseIdx} rank={r} total={totalHands} phaseLabel={PHASE_HISTORY_LABELS[phaseIdx] ?? ""} />
                  ))}
                </div>
              )}
            </div>
          );
        };

        // Opponents with 3+ hands use a 2-row grid; everyone else is a single row
        const useDoubleRow = !isMe && stackHands && hands.length >= 3;
        if (useDoubleRow) {
          const split = Math.ceil(hands.length / 2);
          const topRow = hands.slice(0, split);
          const bottomRow = hands.slice(split);
          const gap = tightPadding ? "gap-0.5" : "gap-1";
          return (
            <div className="flex flex-col gap-0.5 items-center">
              <div className={`flex flex-row ${gap}`}>{topRow.map((h, i) => renderHand(h, i))}</div>
              <div className={`flex flex-row ${gap}`}>{bottomRow.map((h, i) => renderHand(h, split + i))}</div>
            </div>
          );
        }
        return (
          <div className={tightPadding ? "flex flex-row gap-0.5" : "flex flex-row gap-1"}>
            {hands.map((hand, handIdx) => renderHand(hand, handIdx))}
          </div>
        );
      })()}
    </div>
  );
}
