"use client";

import { useState, useEffect, useRef } from "react";
import type { AcquireRequest, ClientMessage, GameState, Hand } from "@/lib/types";
import { END_GAME_CONFIRM_MS } from "@/lib/constants";
import { filterHandsByPlayer, findHandById, findPlayerById } from "@/lib/utils";
import { useRankingActions } from "./useRankingActions";

export interface UseBoardReturn {
  // From useRankingActions
  localRanking: (string | null)[];
  selectedHandId: string | null;
  selectedSlot: number | null;
  handleSlotClick: (i: number) => void;
  handleHandClick: (handId: string) => void;
  handleUnclaim: (handId: string) => void;
  handleAcceptAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  handleRejectAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  handleCancelAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  hasSelection: boolean;
  toastError: string | null;
  // Derived from gameState
  displayState: GameState;
  totalHands: number;
  myHands: Hand[];
  allReady: boolean;
  hasUnclaimedSlots: boolean;
  rankMap: Map<string, number>;
  incomingRequests: AcquireRequest[];
  outgoingRequests: AcquireRequest[];
  isCreator: boolean;
  isReady: boolean;
  // Layout state
  isPortrait: boolean;
  isMobileLandscape: boolean;
  mobileChatOpen: boolean;
  setMobileChatOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  // Actions
  confirmingEnd: boolean;
  handleEndGameClick: () => void;
  handleReady: (ready: boolean) => void;
  handleSendChat: (text: string) => void;
}

export function useGameBoard(
  gameState: GameState,
  myId: string,
  onSend: (msg: ClientMessage) => void
): UseBoardReturn {
  const {
    localRanking, selectedHandId, selectedSlot,
    handleSlotClick, handleHandClick, handleUnclaim,
    handleAcceptAcquire, handleRejectAcquire, handleCancelAcquire,
    hasSelection, toastError,
  } = useRankingActions(gameState, myId, onSend);

  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

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

  useEffect(() => {
    return () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); };
  }, []);

  const myPlayer = findPlayerById(gameState.players, myId);
  const isCreator = myPlayer?.isCreator ?? false;
  const isReady = myPlayer?.ready ?? false;

  function handleEndGameClick() {
    if (!confirmingEnd) {
      setConfirmingEnd(true);
      confirmTimerRef.current = setTimeout(() => setConfirmingEnd(false), END_GAME_CONFIRM_MS);
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingEnd(false);
      onSend({ type: "endGame" });
    }
  }

  function handleReady(ready: boolean) {
    onSend({ type: "ready", ready });
  }

  function handleSendChat(text: string) {
    onSend({ type: "chat", text });
  }

  const allReady = gameState.players.every((p) => p.ready);
  const hasUnclaimedSlots = localRanking.some((slot) => slot === null);

  // Spacebar resolves the phase's primary action.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (gameState.phase === "reveal" && gameState.score === null) {
        const nextHandId = gameState.ranking[gameState.ranking.length - 1 - gameState.revealIndex];
        const hand = findHandById(gameState.hands, nextHandId);
        const owner = findPlayerById(gameState.players, hand?.playerId);
        if (hand && (hand.playerId === myId || !owner?.connected)) {
          onSend({ type: "flip", handId: hand.id });
        }
        return;
      }
      const ready = myPlayer?.ready ?? false;
      if (ready || !hasUnclaimedSlots) {
        handleReady(!ready);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameState.hands, gameState.phase, gameState.players, gameState.ranking, gameState.revealIndex, gameState.score, hasUnclaimedSlots, myId, myPlayer?.ready, onSend]);

  const rankMap = new Map<string, number>();
  localRanking.forEach((id, i) => { if (id !== null) rankMap.set(id, i + 1); });

  const incomingRequests = gameState.acquireRequests.filter((req) => {
    const recipientHand = findHandById(gameState.hands, req.recipientHandId);
    return recipientHand?.playerId === myId;
  });
  const outgoingRequests = gameState.acquireRequests.filter((req) => req.initiatorId === myId);

  const displayState: GameState = { ...gameState, ranking: localRanking };
  const totalHands = localRanking.length;
  const myHands = filterHandsByPlayer(gameState.hands, myId);

  return {
    localRanking, selectedHandId, selectedSlot,
    handleSlotClick, handleHandClick, handleUnclaim,
    handleAcceptAcquire, handleRejectAcquire, handleCancelAcquire,
    hasSelection, toastError,
    displayState, totalHands, myHands, allReady, hasUnclaimedSlots,
    rankMap, incomingRequests, outgoingRequests, isCreator, isReady,
    isPortrait, isMobileLandscape, mobileChatOpen, setMobileChatOpen,
    confirmingEnd, handleEndGameClick, handleReady, handleSendChat,
  };
}
