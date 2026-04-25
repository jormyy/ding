import type { ChatMessage, ServerMessage } from "../../src/lib/types";
import {
  MAX_CHAT_MESSAGES,
  MAX_CHAT_LENGTH,
  CHAT_THROTTLE_MS,
} from "../../src/lib/constants";
import type { Handler } from "./types";

export const ding: Handler = (_state, player) => {
  const msg: ServerMessage = { type: "ding", playerName: player.name };
  return { kind: "broadcast-raw", payload: JSON.stringify(msg) };
};

export const fuckoff: Handler = (_state, player) => {
  const msg: ServerMessage = { type: "fuckoff", playerName: player.name };
  return { kind: "broadcast-raw", payload: JSON.stringify(msg) };
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
