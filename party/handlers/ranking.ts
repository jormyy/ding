import { clearRequestsForHands } from "../../src/lib/chipMove";
import type { Handler } from "./types";
import { inGamePhase } from "./types";

export const move: Handler = (state, player, msg) => {
  if (msg.type !== "move") return { kind: "ignore" };
  if (!inGamePhase(state)) return { kind: "ignore" };

  const hand = state.hands.find((h) => h.id === msg.handId);
  if (!hand || hand.playerId !== player.id) return { kind: "ignore" };

  const toIndex = Math.max(0, Math.min(msg.toIndex, state.ranking.length - 1));
  const occupantId = state.ranking[toIndex];
  const currentIndex = state.ranking.indexOf(msg.handId);

  if (occupantId === null) {
    if (currentIndex !== -1) state.ranking[currentIndex] = null;
    state.ranking[toIndex] = msg.handId;
  } else if (occupantId === msg.handId) {
    return { kind: "ignore" };
  } else {
    const occupantHand = state.hands.find((h) => h.id === occupantId);
    if (!occupantHand) return { kind: "ignore" };
    if (occupantHand.playerId === player.id) {
      if (currentIndex !== -1) state.ranking[currentIndex] = occupantId;
      state.ranking[toIndex] = msg.handId;
    } else {
      return { kind: "ignore" };
    }
  }

  state.acquireRequests = clearRequestsForHands(state.acquireRequests, [msg.handId]);
  player.ready = false;
  return { kind: "broadcast" };
};

export const swap: Handler = (state, player, msg) => {
  if (msg.type !== "swap") return { kind: "ignore" };
  if (!inGamePhase(state)) return { kind: "ignore" };

  const handA = state.hands.find((h) => h.id === msg.handIdA);
  const handB = state.hands.find((h) => h.id === msg.handIdB);
  if (!handA || !handB) return { kind: "ignore" };
  if (handA.playerId !== player.id || handB.playerId !== player.id) return { kind: "ignore" };

  const idxA = state.ranking.indexOf(msg.handIdA);
  const idxB = state.ranking.indexOf(msg.handIdB);
  if (idxA === -1 || idxB === -1) return { kind: "ignore" };

  state.ranking[idxA] = msg.handIdB;
  state.ranking[idxB] = msg.handIdA;
  player.ready = false;
  return { kind: "broadcast" };
};

export const unclaim: Handler = (state, player, msg) => {
  if (msg.type !== "unclaim") return { kind: "ignore" };
  if (!inGamePhase(state)) return { kind: "ignore" };

  const hand = state.hands.find((h) => h.id === msg.handId);
  if (!hand || hand.playerId !== player.id) return { kind: "ignore" };

  const idx = state.ranking.indexOf(msg.handId);
  if (idx === -1) return { kind: "ignore" };

  state.ranking[idx] = null;
  state.acquireRequests = clearRequestsForHands(state.acquireRequests, [msg.handId]);
  player.ready = false;
  return { kind: "broadcast" };
};

export const transferOwnChip: Handler = (state, player, msg) => {
  if (msg.type !== "transferOwnChip") return { kind: "ignore" };
  if (!inGamePhase(state)) return { kind: "ignore" };

  const fromHand = state.hands.find((h) => h.id === msg.fromHandId);
  const toHand = state.hands.find((h) => h.id === msg.toHandId);
  if (!fromHand || !toHand) return { kind: "ignore" };
  if (fromHand.playerId !== player.id || toHand.playerId !== player.id) return { kind: "ignore" };
  if (msg.fromHandId === msg.toHandId) return { kind: "ignore" };

  const idxFrom = state.ranking.indexOf(msg.fromHandId);
  const idxTo = state.ranking.indexOf(msg.toHandId);
  if (idxFrom === -1 || idxTo !== -1) return { kind: "ignore" };

  state.ranking[idxFrom] = msg.toHandId;
  state.acquireRequests = clearRequestsForHands(
    state.acquireRequests,
    [msg.fromHandId, msg.toHandId]
  );
  player.ready = false;
  return { kind: "broadcast" };
};
