"use client";

import { useRef, useState, useEffect } from "react";
import type { GameState, Hand } from "@/lib/types";
import { getSeatPosition, computeTableLayout } from "@/lib/seatLayout";
import Seat from "./game/Seat";
import TableFelt from "./game/TableFelt";
import BoardSlots from "./game/BoardSlots";

interface PokerTableProps {
  gameState: GameState;
  myId: string;
  hideSelf?: boolean;
  onUnclaim?: (handId: string) => void;
  selectedHandId?: string | null;
  selectedSlot?: number | null;
  onHandClick?: (handId: string) => void;
  onSlotClick?: (slotIndex: number) => void;
  onFlip?: (handId: string) => void;
}

export default function PokerTable({
  gameState,
  myId,
  hideSelf = false,
  onUnclaim = () => {},
  selectedHandId = null,
  selectedSlot = null,
  onHandClick = () => {},
  onSlotClick = () => {},
  onFlip,
}: PokerTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    setContainerHeight(el.clientHeight);
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = Math.min(containerWidth, containerHeight) < 500;
  const isLandscape = containerWidth > containerHeight;

  const isReveal = gameState.phase === "reveal";
  const hasSelection = selectedHandId !== null || selectedSlot !== null;

  const rankMap = new Map<string, number>();
  gameState.ranking.forEach((id, i) => { if (id !== null) rankMap.set(id, i + 1); });

  const handsByPlayer = new Map<string, Hand[]>();
  for (const hand of gameState.hands) {
    if (!handsByPlayer.has(hand.playerId)) handsByPlayer.set(hand.playerId, []);
    handsByPlayer.get(hand.playerId)!.push(hand);
  }

  const players = gameState.players;
  const selfIndex = Math.max(0, players.findIndex((p) => p.id === myId));
  const n = players.length;

  const { xRadius, yRadius, opponentScale } = computeTableLayout({
    playerCount: n,
    handsPerPlayer: gameState.handsPerPlayer,
    isMobile,
    isLandscape,
  });

  const feltInset = isMobile ? (isLandscape ? "8% 20%" : "20% 5%") : "10% 16%";
  const totalHands = gameState.ranking.length;

  const currentFlipHandId =
    isReveal && gameState.score === null
      ? (gameState.ranking[gameState.ranking.length - 1 - gameState.revealIndex] ?? null)
      : null;

  const boardSlots = gameState.ranking
    .map((id, i) => (id === null ? i : null))
    .filter((i): i is number => i !== null);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <TableFelt
        phase={gameState.phase}
        communityCards={gameState.communityCards}
        isMobile={isMobile}
        isLandscape={isLandscape}
        feltInset={feltInset}
      >
        {!isReveal && boardSlots.length > 0 && (
          <BoardSlots
            ranking={gameState.ranking}
            selectedSlot={selectedSlot}
            selectedHandId={selectedHandId}
            onSlotClick={onSlotClick}
            totalHands={totalHands}
            isMobile={isMobile}
          />
        )}
      </TableFelt>

      {players.map((player, i) => {
        const { x, y } = getSeatPosition(i, n, selfIndex, xRadius, yRadius);
        const playerHands = handsByPlayer.get(player.id) ?? [];
        const isMe = player.id === myId;

        if (hideSelf && isMe) return null;

        const dx = Math.abs(x - 50);
        const dy = Math.abs(y - 50);
        const isTopZone = !isMe && dy > dx && y < 50;
        const sc = opponentScale !== 1 ? ` scale(${opponentScale})` : "";
        const seatStyle: React.CSSProperties = isMe
          ? { left: `${x}%`, top: `${y}%`, transform: `translate(-${x}%, -${y}%)`, zIndex: 10 }
          : isTopZone
          ? { top: 0, left: `${x}%`, transform: `translate(-50%, 0%)${sc}`, zIndex: 5 }
          : { left: `${x}%`, top: `${y}%`, transform: `translate(-${x}%, -${y}%)${sc}`, zIndex: 5 };

        return (
          <div key={player.id} className="absolute" style={seatStyle}>
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
              onUnclaim={onUnclaim}
              currentFlipHandId={currentFlipHandId}
              onFlip={onFlip ?? null}
              isMobile={isMobile}
              rankHistory={gameState.rankHistory}
              acquireRequests={gameState.acquireRequests}
              stackHands={!isTopZone}
            />
          </div>
        );
      })}
    </div>
  );
}
