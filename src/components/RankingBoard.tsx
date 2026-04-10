"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { GameState, Hand, Player } from "@/lib/types";
import { HandCard } from "./HandCard";

interface RankingBoardProps {
  gameState: GameState;
  myId: string;
  onMove: (handId: string, toIndex: number) => void;
}

function getPlayerName(players: Player[], playerId: string): string {
  return players.find((p) => p.id === playerId)?.name ?? "Unknown";
}

function getHandLabel(
  hand: Hand,
  players: Player[],
  handsPerPlayer: number
): string {
  const playerName = getPlayerName(players, hand.playerId);
  if (handsPerPlayer === 1) return playerName;

  // Extract hand index from id (e.g. "playerId-1" -> 1)
  const parts = hand.id.split("-");
  const handIndex = parseInt(parts[parts.length - 1], 10);
  return `${playerName} (${handIndex + 1})`;
}

export default function RankingBoard({
  gameState,
  myId,
  onMove,
}: RankingBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Build hand map for quick lookup
  const handMap = new Map<string, Hand>(
    gameState.hands.map((h) => [h.id, h])
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const newIndex = gameState.ranking.indexOf(over.id as string);
    if (newIndex === -1) return;

    onMove(active.id as string, newIndex);
  }

  const orderedHands = gameState.ranking
    .filter((id): id is string => id !== null)
    .map((id) => handMap.get(id))
    .filter(Boolean) as Hand[];

  const myHandIds = new Set(
    gameState.hands
      .filter((h) => h.playerId === myId)
      .map((h) => h.id)
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">
          Best
        </span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={gameState.ranking.filter((id): id is string => id !== null)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orderedHands.map((hand, idx) => {
              const isOwn = hand.playerId === myId;
              return (
                <HandCard
                  key={hand.id}
                  hand={hand}
                  position={idx}
                  isOwn={isOwn}
                  isDraggable={isOwn}
                  playerName={getPlayerName(
                    gameState.players,
                    hand.playerId
                  )}
                  handLabel={getHandLabel(
                    hand,
                    gameState.players,
                    gameState.handsPerPlayer
                  )}
                  totalHands={gameState.hands.length}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-px bg-gray-800" />
        <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">
          Worst
        </span>
      </div>
    </div>
  );
}
