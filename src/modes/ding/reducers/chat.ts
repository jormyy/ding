/**
 * `chat` reducer — append a chat message (rate-limited per player); cap
 * server-side history at MAX_CHAT_MESSAGES.
 */
export { chat as reduceChat } from "../../../../party/handlers/social";
