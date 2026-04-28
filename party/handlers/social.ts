import type { ChatMessage, ServerMessage } from "../../src/lib/types";
import {
  MAX_CHAT_MESSAGES,
  MAX_CHAT_LENGTH,
  CHAT_THROTTLE_MS,
  MAX_SIGNAL_LOG,
} from "../../src/lib/constants";
import type { Handler } from "./types";

export const ding: Handler = (state, player) => {
  state.dingLog.push({
    playerId: player.id,
    playerName: player.name,
    phase: state.phase,
    ts: Date.now(),
  });
  if (state.dingLog.length > MAX_SIGNAL_LOG) {
    state.dingLog = state.dingLog.slice(-MAX_SIGNAL_LOG);
  }
  const msg: ServerMessage = { type: "ding", playerName: player.name };
  return { kind: "broadcast-raw-and-state", payload: JSON.stringify(msg) };
};

export const fuckoff: Handler = (state, player) => {
  state.fuckoffLog.push({
    playerId: player.id,
    playerName: player.name,
    phase: state.phase,
    ts: Date.now(),
  });
  if (state.fuckoffLog.length > MAX_SIGNAL_LOG) {
    state.fuckoffLog = state.fuckoffLog.slice(-MAX_SIGNAL_LOG);
  }
  const msg: ServerMessage = { type: "fuckoff", playerName: player.name };
  return { kind: "broadcast-raw-and-state", payload: JSON.stringify(msg) };
};

export const chat: Handler = (state, player, msg, ctx) => {
  if (msg.type !== "chat") return { kind: "ignore" };

  const text = (msg.text ?? "").trim().slice(0, MAX_CHAT_LENGTH);
  if (!text) return { kind: "ignore" };

  const now = Date.now();
  const last = ctx.lastChatAt.get(player.id) ?? 0;
  if (now - last < CHAT_THROTTLE_MS) return { kind: "ignore" };
  ctx.lastChatAt.set(player.id, now);

  const chatMsg: ChatMessage = {
    id: crypto.randomUUID(),
    playerId: player.id,
    playerName: player.name,
    text,
    ts: now,
  };
  state.chatMessages.push(chatMsg);
  if (state.chatMessages.length > MAX_CHAT_MESSAGES) {
    state.chatMessages = state.chatMessages.slice(-MAX_CHAT_MESSAGES);
  }

  return { kind: "broadcast" };
};
