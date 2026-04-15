"use client";

import { useState, useEffect, useRef } from "react";
import type { ClientMessage, GameState } from "@/lib/types";
import PokerTable from "./PokerTable";
import ReadyButton from "./ReadyButton";
import ChatPanel from "./ChatPanel";
import { CardFace } from "./CardFace";
import RankChip from "./RankChip";

interface GameBoardProps {
  gameState: GameState;
  myId: string;
  onSend: (msg: ClientMessage) => void;
  onDing: () => void;
  dingNotifications: { id: string; playerName: string }[];
  onFuckoff: () => void;
  fuckoffNotifications: { id: string; playerName: string }[];
}

export default function GameBoard({
  gameState,
  myId,
  onSend,
  onDing,
  dingNotifications,
  onFuckoff,
  fuckoffNotifications,
}: GameBoardProps) {
  const [localRanking, setLocalRanking] = useState<(string | null)[]>(gameState.ranking);
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  useEffect(() => {
    setLocalRanking(gameState.ranking);
  }, [gameState.ranking]);

  // Clear selectedSlot if another player claims the slot before we act
  useEffect(() => {
    if (selectedSlot !== null && localRanking[selectedSlot] !== null) {
      setSelectedSlot(null);
    }
  }, [localRanking, selectedSlot]);

  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastError(message);
    toastTimerRef.current = setTimeout(() => setToastError(null), 3000);
  }
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    const portrait = window.matchMedia("(orientation: portrait) and (max-width: 767px)");
    const landscape = window.matchMedia("(orientation: landscape) and (max-height: 500px)");
    setIsPortrait(portrait.matches);
    setIsMobileLandscape(landscape.matches);
    const onPortrait = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    const onLandscape = (e: MediaQueryListEvent) => setIsMobileLandscape(e.matches);
    portrait.addEventListener("change", onPortrait);
    landscape.addEventListener("change", onLandscape);
    return () => {
      portrait.removeEventListener("change", onPortrait);
      landscape.removeEventListener("change", onLandscape);
    };
  }, []);

  const myPlayer = gameState.players.find((p) => p.id === myId);
  const isCreator = myPlayer?.isCreator ?? false;
  const isReady = myPlayer?.ready ?? false;

  function handleEndGameClick() {
    if (!confirmingEnd) {
      setConfirmingEnd(true);
      confirmTimerRef.current = setTimeout(() => setConfirmingEnd(false), 4000);
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingEnd(false);
      onSend({ type: "endGame" });
    }
  }

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);
  const allReady = gameState.players.every((p) => p.ready);
  const hasUnclaimedSlots = localRanking.some((slot) => slot === null);

  // Incoming requests targeting chips I own
  const rankMap = new Map<string, number>();
  localRanking.forEach((id, i) => {
    if (id !== null) rankMap.set(id, i + 1);
  });
  const incomingRequests = (gameState.acquireRequests ?? []).filter((req) => {
    const recipientHand = gameState.hands.find((h) => h.id === req.recipientHandId);
    return recipientHand?.playerId === myId;
  });

  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  function handleSendChat(text: string) {
    onSend({ type: "chat", text });
  }

  function handleSlotClick(slotIndex: number) {
    if (selectedHandId !== null) {
      // Move into this slot — server now handles occupied own-hand slots atomically
      const occupantId = localRanking[slotIndex];
      const selectedHand = gameState.hands.find((h) => h.id === selectedHandId);
      if (!selectedHand) {
        setSelectedHandId(null);
        setSelectedSlot(null);
        return;
      }

      if (occupantId === null) {
        const newRanking = [...localRanking];
        const currentIdx = newRanking.indexOf(selectedHandId);
        if (currentIdx !== -1) newRanking[currentIdx] = null;
        newRanking[slotIndex] = selectedHandId;
        setLocalRanking(newRanking);
        onSend({ type: "move", handId: selectedHandId, toIndex: slotIndex });
      } else if (occupantId === selectedHandId) {
        // No-op
      } else {
        const occupantHand = gameState.hands.find((h) => h.id === occupantId);
        if (occupantHand?.playerId === myId) {
          // Own-hand occupant: atomic swap (server handles)
          const newRanking = [...localRanking];
          const currentIdx = newRanking.indexOf(selectedHandId);
          newRanking[slotIndex] = selectedHandId;
          if (currentIdx !== -1) {
            newRanking[currentIdx] = occupantId;
          }
          setLocalRanking(newRanking);
          onSend({ type: "move", handId: selectedHandId, toIndex: slotIndex });
        } else if (occupantHand) {
          // Teammate occupant: route to propose
          const alreadyRequested = (gameState.acquireRequests ?? []).some(
            (r) => r.recipientHandId === occupantHand.id && r.initiatorId !== myId
          );
          if (alreadyRequested) {
            const rank = rankMap.get(occupantHand.id);
            showToast(`Rank #${rank} is already being requested by someone else`);
          } else {
            onSend({
              type: "proposeChipMove",
              initiatorHandId: selectedHandId,
              recipientHandId: occupantHand.id,
            });
          }
        }
      }
      setSelectedHandId(null);
      setSelectedSlot(null);
      return;
    }
    if (selectedSlot === slotIndex) {
      setSelectedSlot(null);
      return;
    }
    // Only allow selecting unclaimed slots
    if (localRanking[slotIndex] !== null) return;
    setSelectedSlot(slotIndex);
    setSelectedHandId(null);
  }

  function handleHandClick(handId: string) {
    const hand = gameState.hands.find((h) => h.id === handId);
    const currentSlotIdx = localRanking.indexOf(handId);

    if (selectedSlot !== null) {
      if (hand?.playerId === myId) {
        // Abort if another player claimed this slot before we could act
        if (localRanking[selectedSlot] !== null) {
          setSelectedSlot(null);
          return;
        }
        const newRanking = [...localRanking];
        if (currentSlotIdx !== -1) newRanking[currentSlotIdx] = null;
        newRanking[selectedSlot] = handId;
        setLocalRanking(newRanking);
        onSend({ type: "move", handId, toIndex: selectedSlot });
        setSelectedSlot(null);
        setSelectedHandId(null);
      }
      return;
    }

    if (selectedHandId === null) {
      if (hand?.playerId === myId) {
        setSelectedHandId(handId);
      }
      return;
    }

    if (selectedHandId === handId) {
      setSelectedHandId(null);
      return;
    }

    // Cross-player click: unified propose
    if (hand?.playerId !== myId && hand) {
      const idxA = localRanking.indexOf(selectedHandId);
      const idxB = currentSlotIdx;
      if (idxA === -1 && idxB === -1) {
        showToast("Nothing to move — neither chip is placed");
        setSelectedHandId(null);
        return;
      }
      const alreadyRequested = (gameState.acquireRequests ?? []).some(
        (r) => r.recipientHandId === handId && r.initiatorId !== myId
      );
      if (alreadyRequested) {
        const rank = rankMap.get(handId);
        showToast(
          rank !== undefined
            ? `Rank #${rank} is already being requested by someone else`
            : `Already being requested by someone else`
        );
        setSelectedHandId(null);
        return;
      }
      onSend({
        type: "proposeChipMove",
        initiatorHandId: selectedHandId,
        recipientHandId: handId,
      });
      setSelectedHandId(null);
      return;
    }

    // Clicking own different hand
    const idxA = localRanking.indexOf(selectedHandId);
    if (idxA !== -1 && currentSlotIdx !== -1) {
      // Both ranked → swap (atomic, existing)
      const newRanking = [...localRanking];
      newRanking[idxA] = handId;
      newRanking[currentSlotIdx] = selectedHandId;
      setLocalRanking(newRanking);
      onSend({ type: "swap", handIdA: selectedHandId, handIdB: handId });
    } else if (idxA !== -1 && currentSlotIdx === -1) {
      // Selected ranked, clicked unranked → transfer chip to clicked
      const newRanking = [...localRanking];
      newRanking[idxA] = handId;
      setLocalRanking(newRanking);
      onSend({ type: "transferOwnChip", fromHandId: selectedHandId, toHandId: handId });
    } else if (idxA === -1 && currentSlotIdx !== -1) {
      // Selected unranked, clicked ranked → transfer chip from clicked to selected
      const newRanking = [...localRanking];
      newRanking[currentSlotIdx] = selectedHandId;
      setLocalRanking(newRanking);
      onSend({ type: "transferOwnChip", fromHandId: handId, toHandId: selectedHandId });
    }
    setSelectedHandId(null);
  }

  function handleUnclaim(handId: string) {
    const newRanking = [...localRanking];
    const idx = newRanking.indexOf(handId);
    if (idx !== -1) {
      newRanking[idx] = null;
      setLocalRanking(newRanking);
    }
    setSelectedHandId(null);
    onSend({ type: "unclaim", handId });
  }

  function handleAcceptAcquire(initiatorHandId: string, recipientHandId: string) {
    onSend({ type: "acceptChipMove", initiatorHandId, recipientHandId });
  }

  function handleRejectAcquire(initiatorHandId: string, recipientHandId: string) {
    onSend({ type: "rejectChipMove", initiatorHandId, recipientHandId });
  }

  function handleReady(ready: boolean) {
    onSend({ type: "ready", ready });
  }

  const displayState: GameState = { ...gameState, ranking: localRanking };
  const hasSelection = selectedHandId !== null || selectedSlot !== null;
  const totalHands = localRanking.length;
  const myHands = gameState.hands.filter((h) => h.playerId === myId);

  const phaseLabels = ["preflop", "flop", "turn", "river"] as const;

  if (isPortrait) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-gray-950 gap-6 px-8 text-center">
        <div className="text-7xl animate-wiggle">📱</div>
        <div className="flex flex-col gap-2">
          <p className="text-white text-xl font-black tracking-tight">Rotate your phone</p>
          <p className="text-gray-400 text-sm">This game works best in landscape mode</p>
        </div>
      </div>
    );
  }

  const toastEl = toastError ? (
    <div className="fixed inset-x-0 top-16 z-50 flex justify-center pointer-events-none">
      <div className="bg-red-900/95 border border-red-700 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl">
        {toastError}
      </div>
    </div>
  ) : null;

  // ── Mobile landscape: full-width table (opponents only) + own hands at bottom ──
  if (isMobileLandscape) {
    return (
      <div className="h-[100dvh] flex flex-col bg-gray-950">
        {toastEl}
        {/* Header */}
        <div className="flex-none border-b border-gray-800 bg-gray-950/90 px-3 py-1 flex items-center justify-between">
          <span className="text-sm font-black text-white tracking-tight">DING</span>
          <div className="flex items-center gap-2">
            {phaseLabels.map((phase) => (
              <div key={phase} className={`text-[9px] font-bold uppercase tracking-widest ${gameState.phase === phase ? "text-green-400" : "text-gray-700"}`}>
                {phase === "preflop" ? "pre" : phase}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-[10px] font-bold uppercase tracking-widest">
              {gameState.phase === "preflop" ? "pre-flop" : gameState.phase}
            </span>
            {isCreator && (confirmingEnd
              ? <button onClick={handleEndGameClick} className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full">sure?</button>
              : <button onClick={handleEndGameClick} className="text-[10px] font-bold text-gray-600 hover:text-red-400">end</button>
            )}
          </div>
        </div>

        {/* Table — full width, opponents + board chips only */}
        <div className="flex-1 min-h-0 relative">
          <PokerTable
            gameState={displayState}
            myId={myId}
            hideSelf={true}
            onUnclaim={handleUnclaim}
            selectedHandId={selectedHandId}
            selectedSlot={selectedSlot}
            onHandClick={handleHandClick}
            onSlotClick={handleSlotClick}
            onAcceptAcquire={handleAcceptAcquire}
          />
          <div className="absolute top-2 right-2 z-20 flex gap-1">
            <button onClick={onDing} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 text-lg" aria-label="Ding">🔔</button>
            <button onClick={onFuckoff} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 text-lg" aria-label="Fuck off">🖕</button>
            <button onClick={() => setMobileChatOpen((v) => !v)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 active:scale-90 text-lg" aria-label="Chat">💬</button>
          </div>
          {mobileChatOpen && (
            <div className="absolute inset-x-2 bottom-2 top-12 z-30 bg-gray-950 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
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

        {/* Own hands strip */}
        <div className="flex-none border-t border-gray-800 bg-gray-950 px-3 py-1.5">
          {/* Requests row (if any) */}
          {incomingRequests.length > 0 && (
            <div className="flex gap-3 mb-1.5 overflow-x-auto">
              {incomingRequests.map((req) => {
                const name = gameState.players.find((p) => p.id === req.initiatorId)?.name ?? "?";
                const recipientRank = rankMap.get(req.recipientHandId);
                const initiatorRank = rankMap.get(req.initiatorHandId);
                let label: React.ReactNode;
                if (req.kind === "acquire") {
                  label = (<><span className="font-bold text-white">{name}</span> wants <span className="text-orange-300 font-bold">#{recipientRank}</span></>);
                } else if (req.kind === "offer") {
                  label = (<><span className="font-bold text-white">{name}</span> offers <span className="text-orange-300 font-bold">#{initiatorRank}</span></>);
                } else {
                  label = (<><span className="font-bold text-white">{name}</span> swap <span className="text-orange-300 font-bold">#{initiatorRank}</span>↔<span className="text-orange-300 font-bold">#{recipientRank}</span></>);
                }
                return (
                  <div key={`${req.initiatorHandId}-${req.recipientHandId}`} className="flex items-center gap-1.5 flex-none">
                    <span className="text-[10px] text-gray-300">{label}</span>
                    <button onClick={() => handleAcceptAcquire(req.initiatorHandId, req.recipientHandId)} className="bg-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded">✓</button>
                    <button onClick={() => handleRejectAcquire(req.initiatorHandId, req.recipientHandId)} className="bg-gray-700 text-gray-200 text-[9px] font-bold px-2 py-0.5 rounded">✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hands + ready */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-4">
              {myHands.map((hand) => {
                const rank = rankMap.get(hand.id) ?? null;
                const isSelected = selectedHandId === hand.id;
                return (
                  <div key={hand.id} className="flex items-center gap-1.5">
                    <div
                      className={["flex gap-0.5 rounded p-0.5 cursor-pointer transition-all", isSelected ? "ring-2 ring-yellow-400 bg-yellow-400/10" : "hover:ring-1 hover:ring-green-500/40"].join(" ")}
                      onClick={() => handleHandClick(hand.id)}
                    >
                      {hand.cards.map((card, i) => <CardFace key={i} card={card} tiny />)}
                    </div>
                    {rank !== null ? (
                      <RankChip rank={rank} total={totalHands} isOwn isSelected={isSelected} hasSelection={hasSelection} onClick={() => handleHandClick(hand.id)} onDoubleClick={() => handleUnclaim(hand.id)} small />
                    ) : (
                      <div
                        className={["w-6 h-6 rounded-full border-2 border-dashed transition-all", hasSelection ? "border-yellow-400/60 cursor-pointer hover:border-yellow-400" : "border-gray-700/40"].join(" ")}
                        onClick={hasSelection ? () => handleHandClick(hand.id) : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex-none">
              <ReadyButton isReady={isReady} onToggle={handleReady} allPlayersReady={allReady} disabled={hasUnclaimedSlots} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-950">
      {toastEl}
      {/* Header */}
      <div className="flex-none border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm px-3 py-2 flex items-center justify-between">
        <span className="text-base font-black text-white tracking-tight">DING</span>
        <div className="flex items-center gap-2">
          {phaseLabels.map((phase) => (
            <div
              key={phase}
              className={`flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest transition-colors ${
                gameState.phase === phase ? "text-green-400" : "text-gray-700"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  gameState.phase === phase ? "bg-green-400" : "bg-gray-700"
                }`}
              />
              <span className="hidden sm:inline">{phase === "preflop" ? "pre" : phase}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-[10px] font-bold uppercase tracking-widest">
            {gameState.phase === "preflop" ? "pre-flop" : gameState.phase}
          </span>
          {isCreator && (
            confirmingEnd ? (
              <button
                onClick={handleEndGameClick}
                className="text-[10px] font-black bg-red-600 hover:bg-red-500 active:bg-red-700 text-white px-2 py-0.5 rounded-full transition-all"
              >
                sure?
              </button>
            ) : (
              <button
                onClick={handleEndGameClick}
                className="text-[10px] font-bold text-gray-600 hover:text-red-400 transition-colors"
              >
                end
              </button>
            )
          )}
        </div>
      </div>

      {/* Main area: table + requests panel side by side */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Poker Table */}
        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden">
          <div className="relative w-full aspect-square sm:aspect-auto sm:h-full">
            <PokerTable
              gameState={displayState}
              myId={myId}
              onUnclaim={handleUnclaim}
              selectedHandId={selectedHandId}
              selectedSlot={selectedSlot}
              onHandClick={handleHandClick}
              onSlotClick={handleSlotClick}
              onAcceptAcquire={handleAcceptAcquire}
            />

            {/* Ding + Fuck-off buttons + notifications */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
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

            {/* Instruction hint */}
            {selectedHandId !== null ? (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-yellow-500/90 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  {(() => {
                    const selHand = gameState.hands.find((h) => h.id === selectedHandId);
                    const isRanked = localRanking.indexOf(selectedHandId) !== -1;
                    if (!selHand) return "Place your chip or tap a teammate's hand";
                    if (isRanked) {
                      return "Tap your other hand to move the chip — or tap a teammate's hand to offer/swap";
                    }
                    return "Tap a board slot to place — or tap a teammate's chip to request it";
                  })()}
                </div>
              </div>
            ) : selectedSlot !== null ? (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-yellow-500/90 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  Click your hand to claim this slot
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sidebar — hidden on mobile, visible on sm+. Top half: requests. Bottom half: chat. */}
        <div className="hidden sm:flex flex-none w-64 border-l border-gray-800 bg-gray-950 flex-col overflow-hidden">
          {/* Requests half */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-none px-3 py-2 border-b border-gray-800 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Requests</span>
              {incomingRequests.length > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {incomingRequests.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
              {incomingRequests.length === 0 ? (
                <p className="text-gray-600 text-xs text-center mt-4">No incoming requests</p>
              ) : (
                incomingRequests.map((req) => {
                  const initiatorName =
                    gameState.players.find((p) => p.id === req.initiatorId)?.name ?? "?";
                  const recipientRank = rankMap.get(req.recipientHandId);
                  const initiatorRank = rankMap.get(req.initiatorHandId);
                  // Badge chip rank — show initiator's offered chip for offer, recipient's for acquire, both for swap
                  const badgeRank =
                    req.kind === "offer"
                      ? initiatorRank
                      : req.kind === "acquire"
                      ? recipientRank
                      : initiatorRank;

                  let body: React.ReactNode;
                  if (req.kind === "acquire") {
                    body = (
                      <>
                        <span className="font-bold text-white">{initiatorName}</span>
                        {" wants your "}
                        <span className="font-bold text-orange-300">#{recipientRank}</span>
                        {" chip"}
                      </>
                    );
                  } else if (req.kind === "offer") {
                    body = (
                      <>
                        <span className="font-bold text-white">{initiatorName}</span>
                        {" is offering you their "}
                        <span className="font-bold text-orange-300">#{initiatorRank}</span>
                        {" chip"}
                      </>
                    );
                  } else {
                    body = (
                      <>
                        <span className="font-bold text-white">{initiatorName}</span>
                        {" wants to swap: their "}
                        <span className="font-bold text-orange-300">#{initiatorRank}</span>
                        {" ↔ your "}
                        <span className="font-bold text-orange-300">#{recipientRank}</span>
                      </>
                    );
                  }

                  return (
                    <div
                      key={`${req.initiatorHandId}-${req.recipientHandId}`}
                      className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        {badgeRank !== undefined && (
                          <div
                            className={[
                              "w-8 h-8 rounded-full border-2 font-black text-sm flex items-center justify-center flex-shrink-0",
                              badgeRank === 1
                                ? "bg-amber-500 border-amber-300 text-amber-950"
                                : badgeRank === localRanking.length
                                ? "bg-red-950 border-red-800 text-red-300"
                                : "bg-gray-700 border-gray-500 text-white",
                            ].join(" ")}
                          >
                            {badgeRank}
                          </div>
                        )}
                        <p className="text-sm text-gray-100 leading-snug">{body}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptAcquire(req.initiatorHandId, req.recipientHandId)}
                          className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectAcquire(req.initiatorHandId, req.recipientHandId)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-gray-200 text-xs font-bold py-1.5 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat half */}
          <div className="flex-1 min-h-0 border-t border-gray-800 flex flex-col overflow-hidden">
            <ChatPanel messages={gameState.chatMessages ?? []} myId={myId} onSend={handleSendChat} />
          </div>
        </div>
      </div>

      {/* Mobile-only requests section */}
      {incomingRequests.length > 0 && (
        <div className="sm:hidden flex-none border-t border-gray-800 bg-gray-950 px-3 py-2 flex flex-col gap-2 max-h-40 overflow-y-auto">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
            Requests
            <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5">
              {incomingRequests.length}
            </span>
          </span>
          {incomingRequests.map((req) => {
            const initiatorName = gameState.players.find((p) => p.id === req.initiatorId)?.name ?? "?";
            const recipientRank = rankMap.get(req.recipientHandId);
            const initiatorRank = rankMap.get(req.initiatorHandId);
            const badgeRank =
              req.kind === "offer"
                ? initiatorRank
                : req.kind === "acquire"
                ? recipientRank
                : initiatorRank;

            let body: React.ReactNode;
            if (req.kind === "acquire") {
              body = (
                <>
                  <span className="font-bold text-white">{initiatorName}</span>
                  {" wants your "}
                  <span className="font-bold text-orange-300">#{recipientRank}</span>
                </>
              );
            } else if (req.kind === "offer") {
              body = (
                <>
                  <span className="font-bold text-white">{initiatorName}</span>
                  {" offers "}
                  <span className="font-bold text-orange-300">#{initiatorRank}</span>
                </>
              );
            } else {
              body = (
                <>
                  <span className="font-bold text-white">{initiatorName}</span>
                  {" swap #"}
                  <span className="font-bold text-orange-300">{initiatorRank}</span>
                  {"↔#"}
                  <span className="font-bold text-orange-300">{recipientRank}</span>
                </>
              );
            }

            return (
              <div
                key={`${req.initiatorHandId}-${req.recipientHandId}`}
                className="flex items-center gap-2"
              >
                {badgeRank !== undefined && (
                  <div
                    className={[
                      "w-7 h-7 rounded-full border-2 font-black text-xs flex items-center justify-center flex-shrink-0",
                      badgeRank === 1
                        ? "bg-amber-500 border-amber-300 text-amber-950"
                        : badgeRank === localRanking.length
                        ? "bg-red-950 border-red-800 text-red-300"
                        : "bg-gray-700 border-gray-500 text-white",
                    ].join(" ")}
                  >
                    {badgeRank}
                  </div>
                )}
                <p className="text-xs text-gray-300 flex-1 leading-snug">{body}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAcceptAcquire(req.initiatorHandId, req.recipientHandId)}
                    className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectAcquire(req.initiatorHandId, req.recipientHandId)}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom bar: ready button */}
      <div className="flex-none border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-center">
        <ReadyButton
          isReady={isReady}
          onToggle={handleReady}
          allPlayersReady={allReady}
          disabled={hasUnclaimedSlots}
        />
      </div>
    </div>
  );
}
