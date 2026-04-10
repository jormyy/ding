"use client";

import { useRef, useState, useEffect } from "react";
import type { AcquireRequest, GameState, Hand, Player } from "@/lib/types";
import { CardFace, CardBack } from "./CardFace";
import RankChip, { HistoryChip } from "./RankChip";

const PHASE_LABELS = ["Pre", "Flop", "Turn", "River"];

interface PokerTableProps {
  gameState: GameState;
  myId: string;
  // Game phase chip interaction:
  selectedHandId?: string | null;
  selectedSlot?: number | null;
  onHandClick?: (handId: string) => void;
  onSlotClick?: (slotIndex: number) => void;
  // Acquire requests:
  onAcceptAcquire?: (requesterHandId: string, targetHandId: string) => void;
  // Reveal phase:
  onFlip?: (handId: string) => void;
}

function getSeatPosition(
  playerIndex: number,
  totalPlayers: number,
  selfIndex: number,
  xRadius = 41,
  yRadius = 38
): { x: number; y: number } {
  const step = 360 / totalPlayers;
  // Self always at 90° (bottom center). Angle 0° = right, 90° = bottom.
  const angleDeg = ((playerIndex - selfIndex) * step + 90 + 3600) % 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + xRadius * Math.cos(angleRad),
    y: 50 + yRadius * Math.sin(angleRad),
  };
}

interface SeatProps {
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
  currentFlipHandId: string | null;
  onFlip: ((handId: string) => void) | null;
  isMobile: boolean;
  rankHistory: Record<string, (number | null)[]>;
  acquireRequests: AcquireRequest[];
  players: Player[];
  onAcceptAcquire: (requesterHandId: string, targetHandId: string) => void;
}

function Seat({
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
  currentFlipHandId,
  onFlip,
  isMobile,
  rankHistory,
  acquireRequests,
  players,
  onAcceptAcquire,
}: SeatProps) {
  const isFlipTurn =
    currentFlipHandId !== null &&
    hands.some((h) => h.id === currentFlipHandId);
  const canFlip = isFlipTurn && isMe;

  const nameMaxW = isMobile ? "max-w-[72px]" : "max-w-[120px]";
  const cardProps = isMobile ? { tiny: true as const } : { small: true as const };

  return (
    <div
      className={[
        "flex flex-col items-center rounded-xl border transition-all",
        isMobile ? "gap-1 px-1.5 py-1.5" : "gap-1.5 px-2 py-2",
        isMe
          ? "bg-green-950/70 border-green-700/50 shadow-lg shadow-green-900/30"
          : "bg-gray-950/70 border-gray-700/30",
        isFlipTurn
          ? "border-yellow-500/80 shadow-lg shadow-yellow-500/20 animate-[pulse_2s_ease-in-out_infinite]"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Player name */}
      <div className="text-center leading-tight">
        <div
          className={`text-[10px] font-bold truncate ${nameMaxW} ${
            isMe ? "text-green-300" : "text-gray-300"
          }`}
        >
          {player.name}
        </div>
        {isMe && (
          <div className="text-green-700 text-[8px] uppercase tracking-wider">
            you
          </div>
        )}
        {player.ready && !isReveal && (
          <div className="text-green-500 text-[8px] font-bold">✓</div>
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
            <div className="text-[8px] text-yellow-400 font-semibold">
              flipping...
            </div>
          )}
        </div>
      )}

      {/* Hands — stacked vertically on mobile when multiple */}
      <div className={handsPerPlayer > 1 && isMobile ? "flex flex-col gap-1" : "flex gap-2"}>
        {hands.map((hand, handIdx) => {
          const rank = rankMap.get(hand.id) ?? null;
          const isSelected = selectedHandId === hand.id;
          const isDropTarget = hasSelection && !isSelected;
          const isHighlighted = hand.id === currentFlipHandId;
          const history = rankHistory[hand.id] ?? [];
          const isClickableArea = !isReveal && (isMe || hasSelection);

          return (
            <div
              key={hand.id}
              className={
                handsPerPlayer > 1 && isMobile
                  ? "flex flex-row items-center gap-1"
                  : "flex flex-col items-center gap-1"
              }
            >
              {handsPerPlayer > 1 && !isMobile && (
                <div className="text-[9px] text-gray-600 font-medium">
                  #{handIdx + 1}
                </div>
              )}

              {/* Card pair — clickable as drop target */}
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
                    ? hand.cards.map((card, i) => (
                        <CardFace key={i} card={card} {...cardProps} />
                      ))
                    : [0, 1].map((i) => <CardBack key={i} {...cardProps} />)
                  : isMe && hand.cards.length > 0
                  ? hand.cards.map((card, i) => (
                      <CardFace key={i} card={card} {...cardProps} />
                    ))
                  : [0, 1].map((i) => <CardBack key={i} {...cardProps} />)}
              </div>

              {/* Rank chip (current) + history chips */}
              {!isReveal && (() => {
                const handRequests = acquireRequests.filter((r) => r.targetHandId === hand.id);
                return (
                  <div className="flex flex-col items-center gap-0.5">
                    {/* Current rank chip with optional request badge */}
                    {rank !== null ? (
                      <div className="relative">
                        <RankChip
                          rank={rank}
                          total={totalHands}
                          isOwn={isMe}
                          isSelected={isSelected}
                          hasSelection={hasSelection}
                          onClick={() => onHandClick(hand.id)}
                          small={isMobile}
                        />
                        {handRequests.length > 0 && (
                          <div className="absolute -top-1.5 -right-1.5 min-w-[13px] h-[13px] bg-orange-500 rounded-full text-[7px] font-black text-white flex items-center justify-center px-0.5 pointer-events-none">
                            {handRequests.length}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty placeholder when unclaimed */
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

                    {/* Phase history chips */}
                    {history.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {history.map((r, phaseIdx) => (
                          <HistoryChip
                            key={phaseIdx}
                            rank={r}
                            total={totalHands}
                            phaseLabel={PHASE_LABELS[phaseIdx] ?? ""}
                          />
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
                    <HistoryChip
                      key={phaseIdx}
                      rank={r}
                      total={totalHands}
                      phaseLabel={PHASE_LABELS[phaseIdx] ?? ""}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PokerTable({
  gameState,
  myId,
  selectedHandId = null,
  selectedSlot = null,
  onHandClick = () => {},
  onSlotClick = () => {},
  onAcceptAcquire = () => {},
  onFlip,
}: PokerTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = containerWidth < 500;
  // On mobile the container is constrained to a square, so we use a wide oval
  const xRadius = isMobile ? 43 : 41;
  const yRadius = isMobile ? 28 : 38;

  const isReveal = gameState.phase === "reveal";
  const hasSelection = selectedHandId !== null || selectedSlot !== null;

  const rankMap = new Map<string, number>();
  gameState.ranking.forEach((id, i) => {
    if (id !== null) rankMap.set(id, i + 1);
  });

  const handsByPlayer = new Map<string, Hand[]>();
  for (const hand of gameState.hands) {
    if (!handsByPlayer.has(hand.playerId))
      handsByPlayer.set(hand.playerId, []);
    handsByPlayer.get(hand.playerId)!.push(hand);
  }

  const players = gameState.players;
  const selfIndex = Math.max(
    0,
    players.findIndex((p) => p.id === myId)
  );
  const n = players.length;

  const currentFlipHandId =
    isReveal && gameState.score === null
      ? (gameState.ranking[gameState.ranking.length - 1 - gameState.revealIndex] ?? null)
      : null;

  // Community card sizing: tiny on mobile
  const commCardProps = isMobile
    ? { tiny: true as const }
    : { small: true as const };
  const commCardW = isMobile ? 26 : 36;
  const commCardH = isMobile ? 38 : 52;
  // Mobile: wide landscape oval (20% top/bottom, 5% left/right) in the square container
  const feltInset = isMobile ? "20% 5%" : "10% 16%";

  // Board slots: indices where ranking is null
  const boardSlots = gameState.ranking
    .map((id, i) => (id === null ? i : null))
    .filter((i): i is number => i !== null);

  const totalHands = gameState.ranking.length;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Table felt */}
      <div
        className="absolute rounded-[50%] overflow-hidden pointer-events-none"
        style={{
          inset: feltInset,
          background:
            "radial-gradient(ellipse at 50% 35%, #166534 0%, #14532d 50%, #052e16 100%)",
          boxShadow:
            "inset 0 0 80px rgba(0,0,0,0.6), 0 8px 40px rgba(0,0,0,0.7)",
          border: isMobile ? "5px solid #78350f" : "8px solid #78350f",
          outline: "3px solid #92400e33",
        }}
      >
        {/* Rail inner line */}
        <div className="absolute inset-3 rounded-[50%] border border-green-700/20 pointer-events-none" />
      </div>

      {/* Community cards + board rank slots — on the table surface */}
      <div
        className="absolute flex flex-col items-center justify-center gap-1"
        style={{ inset: feltInset }}
      >
        <div className="text-green-500/40 text-[8px] uppercase tracking-[0.2em] font-bold select-none pointer-events-none">
          {gameState.phase === "preflop"
            ? "pre-flop"
            : gameState.phase === "flop"
            ? "flop"
            : gameState.phase === "turn"
            ? "turn"
            : gameState.phase === "river"
            ? "river"
            : "reveal"}
        </div>
        <div className="flex gap-1 pointer-events-none">
          {Array.from({ length: 5 }).map((_, i) => {
            const card = gameState.communityCards[i];
            return card ? (
              <div key={i} className="drop-shadow-lg">
                <CardFace card={card} {...commCardProps} />
              </div>
            ) : (
              <div
                key={i}
                className="rounded border border-dashed border-green-700/25"
                style={{ width: commCardW, height: commCardH }}
              />
            );
          })}
        </div>

        {/* Board rank slots — unclaimed chips shown on the table */}
        {!isReveal && boardSlots.length > 0 && (
          <div className="flex gap-1 flex-wrap justify-center mt-0.5">
            {boardSlots.map((slotIndex) => {
              const rank = slotIndex + 1;
              const isFirst = rank === 1;
              const isLast = rank === totalHands;
              const isSlotSelected = selectedSlot === slotIndex;

              let chipBg = "bg-gray-700 border-gray-500 text-white";
              if (isFirst) chipBg = "bg-amber-500 border-amber-300 text-amber-950";
              else if (isLast) chipBg = "bg-red-950 border-red-800 text-red-300";

              const chipSize = isMobile ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";

              return (
                <button
                  key={slotIndex}
                  onClick={() => onSlotClick(slotIndex)}
                  className={[
                    "rounded-full font-black flex items-center justify-center border-2 select-none transition-all duration-150 cursor-pointer",
                    chipSize,
                    chipBg,
                    isSlotSelected
                      ? "scale-125 ring-[3px] ring-yellow-400 ring-offset-[2px] ring-offset-green-900 shadow-lg shadow-yellow-400/40"
                      : "hover:scale-110",
                    selectedHandId !== null && !isSlotSelected
                      ? "ring-1 ring-yellow-400/40 hover:ring-yellow-400/70"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {rank}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Player seats */}
      {players.map((player, i) => {
        const { x, y } = getSeatPosition(i, n, selfIndex, xRadius, yRadius);
        const playerHands = handsByPlayer.get(player.id) ?? [];
        const isMe = player.id === myId;

        return (
          <div
            key={player.id}
            className="absolute"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: isMe ? 10 : 5,
            }}
          >
            <Seat
              player={player}
              hands={playerHands}
              isMe={isMe}
              rankMap={rankMap}
              totalHands={totalHands}
              handsPerPlayer={gameState.handsPerPlayer}
              isReveal={isReveal}
              selectedHandId={selectedHandId}
              hasSelection={hasSelection}
              onHandClick={onHandClick}
              currentFlipHandId={currentFlipHandId}
              onFlip={onFlip ?? null}
              isMobile={isMobile}
              rankHistory={gameState.rankHistory ?? {}}
              acquireRequests={gameState.acquireRequests ?? []}
              players={players}
              onAcceptAcquire={onAcceptAcquire}
            />
          </div>
        );
      })}
    </div>
  );
}
