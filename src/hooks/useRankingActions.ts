"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ClientMessage, GameState } from "@/lib/types";
import { TOAST_DURATION_MS } from "@/lib/constants";

export interface RankingActions {
  localRanking: (string | null)[];
  selectedHandId: string | null;
  selectedSlot: number | null;
  setSelectedHandId: (id: string | null) => void;
  setSelectedSlot: (idx: number | null) => void;
  handleSlotClick: (slotIndex: number) => void;
  handleHandClick: (handId: string) => void;
  handleUnclaim: (handId: string) => void;
  handleAcceptAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  handleRejectAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  handleCancelAcquire: (initiatorHandId: string, recipientHandId: string) => void;
  toastError: string | null;
  hasSelection: boolean;
}

export function useRankingActions(
  gameState: GameState,
  myId: string,
  onSend: (msg: ClientMessage) => void
): RankingActions {
  const [localRanking, setLocalRanking] = useState<(string | null)[]>(gameState.ranking);
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalRanking(gameState.ranking);
  }, [gameState.ranking]);

  useEffect(() => {
    if (selectedSlot !== null && localRanking[selectedSlot] !== null) {
      setSelectedSlot(null);
    }
  }, [localRanking, selectedSlot]);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastError(message);
    toastTimerRef.current = setTimeout(() => setToastError(null), TOAST_DURATION_MS);
  }, []);

  const rankMap = new Map<string, number>();
  localRanking.forEach((id, i) => {
    if (id !== null) rankMap.set(id, i + 1);
  });

  const handleSlotClick = useCallback((slotIndex: number) => {
    if (selectedHandId !== null) {
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
          const newRanking = [...localRanking];
          const currentIdx = newRanking.indexOf(selectedHandId);
          newRanking[slotIndex] = selectedHandId;
          if (currentIdx !== -1) {
            newRanking[currentIdx] = occupantId;
          }
          setLocalRanking(newRanking);
          onSend({ type: "move", handId: selectedHandId, toIndex: slotIndex });
        } else if (occupantHand) {
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
    if (localRanking[slotIndex] !== null) return;
    setSelectedSlot(slotIndex);
    setSelectedHandId(null);
  }, [selectedHandId, localRanking, gameState.hands, gameState.acquireRequests, myId, onSend, showToast]);

  const handleHandClick = useCallback((handId: string) => {
    const hand = gameState.hands.find((h) => h.id === handId);
    const currentSlotIdx = localRanking.indexOf(handId);

    if (selectedSlot !== null) {
      if (hand?.playerId === myId) {
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

    const idxA = localRanking.indexOf(selectedHandId);
    if (idxA !== -1 && currentSlotIdx !== -1) {
      const newRanking = [...localRanking];
      newRanking[idxA] = handId;
      newRanking[currentSlotIdx] = selectedHandId;
      setLocalRanking(newRanking);
      onSend({ type: "swap", handIdA: selectedHandId, handIdB: handId });
    } else if (idxA !== -1 && currentSlotIdx === -1) {
      const newRanking = [...localRanking];
      newRanking[idxA] = handId;
      setLocalRanking(newRanking);
      onSend({ type: "transferOwnChip", fromHandId: selectedHandId, toHandId: handId });
    } else if (idxA === -1 && currentSlotIdx !== -1) {
      const newRanking = [...localRanking];
      newRanking[currentSlotIdx] = selectedHandId;
      setLocalRanking(newRanking);
      onSend({ type: "transferOwnChip", fromHandId: handId, toHandId: selectedHandId });
    }
    setSelectedHandId(null);
  }, [selectedSlot, selectedHandId, localRanking, gameState.hands, gameState.acquireRequests, myId, onSend, showToast]);

  const handleUnclaim = useCallback((handId: string) => {
    const newRanking = [...localRanking];
    const idx = newRanking.indexOf(handId);
    if (idx !== -1) {
      newRanking[idx] = null;
      setLocalRanking(newRanking);
    }
    setSelectedHandId(null);
    onSend({ type: "unclaim", handId });
  }, [localRanking, onSend]);

  const handleAcceptAcquire = useCallback((initiatorHandId: string, recipientHandId: string) => {
    onSend({ type: "acceptChipMove", initiatorHandId, recipientHandId });
  }, [onSend]);

  const handleRejectAcquire = useCallback((initiatorHandId: string, recipientHandId: string) => {
    onSend({ type: "rejectChipMove", initiatorHandId, recipientHandId });
  }, [onSend]);

  const handleCancelAcquire = useCallback((initiatorHandId: string, recipientHandId: string) => {
    onSend({ type: "cancelChipMove", initiatorHandId, recipientHandId });
  }, [onSend]);

  return {
    localRanking,
    selectedHandId,
    selectedSlot,
    setSelectedHandId,
    setSelectedSlot,
    handleSlotClick,
    handleHandClick,
    handleUnclaim,
    handleAcceptAcquire,
    handleRejectAcquire,
    handleCancelAcquire,
    toastError,
    hasSelection: selectedHandId !== null || selectedSlot !== null,
  };
}
