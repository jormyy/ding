import {
  classifyChipMoveKind,
  applyChipMoveToRanking,
  clearRequestsForHands,
} from "../../src/lib/chipMove";
import type { Handler } from "./types";
import { inGamePhase } from "./types";

export const proposeChipMove: Handler = (state, player, msg) => {
  if (msg.type !== "proposeChipMove") return { kind: "ignore" };
  if (!inGamePhase(state)) return { kind: "ignore" };

  const initiatorHand = state.hands.find((h) => h.id === msg.initiatorHandId);
  const recipientHand = state.hands.find((h) => h.id === msg.recipientHandId);
  if (!initiatorHand || !recipientHand) return { kind: "ignore" };
  if (initiatorHand.playerId !== player.id) return { kind: "ignore" };
  if (recipientHand.playerId === player.id) return { kind: "ignore" };

  const kind = classifyChipMoveKind(state.ranking, msg.initiatorHandId, msg.recipientHandId);
  if (kind === null) return { kind: "ignore" };

  const collidesOnRecipient = state.acquireRequests.some(
    (r) => r.recipientHandId === msg.recipientHandId && r.initiatorId !== player.id
  );
  if (collidesOnRecipient) return { kind: "ignore" };

  state.acquireRequests = state.acquireRequests.filter(
    (r) =>
      !(
        r.initiatorId === player.id &&
        r.initiatorHandId === msg.initiatorHandId &&
        r.recipientHandId === msg.recipientHandId
      )
  );

  state.acquireRequests.push({
    kind,
    initiatorId: player.id,
    initiatorHandId: msg.initiatorHandId,
    recipientHandId: msg.recipientHandId,
  });

  return { kind: "broadcast" };
};

export const acceptChipMove: Handler = (state, player, msg) => {
  if (msg.type !== "acceptChipMove") return { kind: "ignore" };
  if (!inGamePhase(state)) return { kind: "ignore" };

  const recipientHand = state.hands.find((h) => h.id === msg.recipientHandId);
  const initiatorHand = state.hands.find((h) => h.id === msg.initiatorHandId);
  if (!recipientHand || !initiatorHand) return { kind: "ignore" };
  if (recipientHand.playerId !== player.id) return { kind: "ignore" };

  const reqIdx = state.acquireRequests.findIndex(
    (r) =>
      r.initiatorHandId === msg.initiatorHandId &&
      r.recipientHandId === msg.recipientHandId
  );
  if (reqIdx === -1) return { kind: "ignore" };

  const proposal = state.acquireRequests[reqIdx];
  const currentKind = classifyChipMoveKind(state.ranking, msg.initiatorHandId, msg.recipientHandId);

  if (currentKind === null || currentKind !== proposal.kind) {
    state.acquireRequests.splice(reqIdx, 1);
    return { kind: "broadcast" };
  }

  state.ranking = applyChipMoveToRanking(
    state.ranking,
    currentKind,
    msg.initiatorHandId,
    msg.recipientHandId
  );

  state.acquireRequests = clearRequestsForHands(
    state.acquireRequests,
    [msg.initiatorHandId, msg.recipientHandId]
  );

  player.ready = false;
  const initiatorPlayer = state.players.find((p) => p.id === proposal.initiatorId);
  if (initiatorPlayer) initiatorPlayer.ready = false;

  return { kind: "broadcast" };
};

export const rejectChipMove: Handler = (state, player, msg) => {
  if (msg.type !== "rejectChipMove") return { kind: "ignore" };

  const recipientHand = state.hands.find((h) => h.id === msg.recipientHandId);
  if (!recipientHand) return { kind: "ignore" };
  if (recipientHand.playerId !== player.id) return { kind: "ignore" };

  state.acquireRequests = state.acquireRequests.filter(
    (r) =>
      !(
        r.initiatorHandId === msg.initiatorHandId &&
        r.recipientHandId === msg.recipientHandId
      )
  );

  return { kind: "broadcast" };
};

export const cancelChipMove: Handler = (state, player, msg) => {
  if (msg.type !== "cancelChipMove") return { kind: "ignore" };

  const before = state.acquireRequests.length;
  state.acquireRequests = state.acquireRequests.filter(
    (r) =>
      !(
        r.initiatorId === player.id &&
        r.initiatorHandId === msg.initiatorHandId &&
        r.recipientHandId === msg.recipientHandId
      )
  );
  if (state.acquireRequests.length === before) return { kind: "ignore" };

  return { kind: "broadcast" };
};
