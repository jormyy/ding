"use client";

import type { GameState, Hand, Player } from "@/lib/types";
import { CardFace, CardBack } from "./CardFace";
import RankChip from "./RankChip";

interface PokerTableProps {
  gameState: GameState;
  myId: string;
  // Game phase chip interaction:
  selectedHandId?: string | null;
  onHandClick?: (handId: string) => void;
  // Reveal phase:
  onFlip?: (handId: string) => void;
}

function getSeatPosition(
  playerIndex: number,
  totalPlayers: number,
  selfIndex: number
): { x: number; y: number } {
  const step = 360 / totalPlayers;
  // Self always at 90° (bottom center). Angle 0° = right, 90° = bottom.
  const angleDeg = ((playerIndex - selfIndex) * step + 90 + 3600) % 360;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + 41 * Math.cos(angleRad),
    y: 50 + 38 * Math.sin(angleRad),
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
}: SeatProps) {
  const isFlipTurn =
    currentFlipHandId !== null &&
    hands.some((h) => h.id === currentFlipHandId);
  const canFlip = isFlipTurn && isMe;

  return (
    <div
      className={[
        "flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl border transition-all",
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
          className={`text-[11px] font-bold truncate max-w-[120px] ${
            isMe ? "text-green-300" : "text-gray-300"
          }`}
        >
          {player.name}
        </div>
        {isMe && (
          <div className="text-green-700 text-[9px] uppercase tracking-wider">
            you
          </div>
        )}
        {player.ready && !isReveal && (
          <div className="text-green-500 text-[9px] font-bold">✓ ready</div>
        )}
      </div>

      {/* Reveal flip prompt */}
      {isReveal && isFlipTurn && (
        <div className="flex flex-col items-center gap-0.5">
          {canFlip && currentFlipHandId ? (
            <button
              onClick={() => onFlip?.(currentFlipHandId)}
              className="text-[10px] font-black bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-0.5 rounded-full transition-all active:scale-95"
            >
              FLIP!
            </button>
          ) : (
            <div className="text-[9px] text-yellow-400 font-semibold">
              flipping...
            </div>
          )}
        </div>
      )}

      {/* Hands */}
      <div className="flex gap-2">
        {hands.map((hand, handIdx) => {
          const rank = rankMap.get(hand.id) ?? handIdx + 1;
          const isSelected = selectedHandId === hand.id;
          const isDropTarget = hasSelection && !isSelected;
          const isHighlighted = hand.id === currentFlipHandId;

          return (
            <div key={hand.id} className="flex flex-col items-center gap-1">
              {handsPerPlayer > 1 && (
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
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={
                  !isReveal && isDropTarget
                    ? () => onHandClick(hand.id)
                    : undefined
                }
              >
                {isReveal
                  ? hand.flipped && hand.cards.length > 0
                    ? hand.cards.map((card, i) => (
                        <CardFace key={i} card={card} small />
                      ))
                    : [0, 1].map((i) => <CardBack key={i} small />)
                  : isMe && hand.cards.length > 0
                  ? hand.cards.map((card, i) => (
                      <CardFace key={i} card={card} small />
                    ))
                  : [0, 1].map((i) => <CardBack key={i} small />)}
              </div>

              {/* Rank chip — game phase only */}
              {!isReveal && (
                <RankChip
                  rank={rank}
                  total={totalHands}
                  isOwn={isMe}
                  isSelected={isSelected}
                  hasSelection={hasSelection}
                  onClick={() => onHandClick(hand.id)}
                />
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
  onHandClick = () => {},
  onFlip,
}: PokerTableProps) {
  const isReveal = gameState.phase === "reveal";
  const hasSelection = selectedHandId !== null;

  const rankMap = new Map<string, number>(
    gameState.ranking.map((id, i) => [id, i + 1])
  );

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
      ? gameState.ranking[gameState.ranking.length - 1 - gameState.revealIndex]
      : null;

  return (
    <div className="relative w-full h-full">
      {/* Table felt */}
      <div
        className="absolute rounded-[50%] overflow-hidden pointer-events-none"
        style={{
          inset: "10% 16%",
          background:
            "radial-gradient(ellipse at 50% 35%, #166534 0%, #14532d 50%, #052e16 100%)",
          boxShadow:
            "inset 0 0 80px rgba(0,0,0,0.6), 0 8px 40px rgba(0,0,0,0.7)",
          border: "8px solid #78350f",
          outline: "3px solid #92400e33",
        }}
      >
        {/* Rail inner line */}
        <div className="absolute inset-3 rounded-[50%] border border-green-700/20 pointer-events-none" />
      </div>

      {/* Community cards — on the table surface, pointer-events on */}
      <div
        className="absolute pointer-events-none flex flex-col items-center justify-center gap-1.5"
        style={{ inset: "10% 16%" }}
      >
        <div className="text-green-500/40 text-[9px] uppercase tracking-[0.2em] font-bold select-none">
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
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => {
            const card = gameState.communityCards[i];
            return card ? (
              <div key={i} className="drop-shadow-lg">
                <CardFace card={card} small />
              </div>
            ) : (
              <div
                key={i}
                className="rounded border border-dashed border-green-700/25"
                style={{ width: 36, height: 52 }}
              />
            );
          })}
        </div>
      </div>

      {/* Player seats */}
      {players.map((player, i) => {
        const { x, y } = getSeatPosition(i, n, selfIndex);
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
              totalHands={gameState.hands.length}
              handsPerPlayer={gameState.handsPerPlayer}
              isReveal={isReveal}
              selectedHandId={selectedHandId}
              hasSelection={hasSelection}
              onHandClick={onHandClick}
              currentFlipHandId={currentFlipHandId}
              onFlip={onFlip ?? null}
            />
          </div>
        );
      })}
    </div>
  );
}
