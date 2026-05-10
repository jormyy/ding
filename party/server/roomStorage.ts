/**
 * RoomStorage — versioned persistence helpers for DingServer. Centralizes the
 * storage keys and the migration entrypoint so the orchestrator doesn't deal
 * with raw blobs.
 */

import type * as Party from "partykit/server";
import type { ServerGameState } from "../state";
import type { BotMeta } from "../bots";
import { migrateState, tagVersion } from "../state/migrate";

const STORAGE_KEY_STATE = "state";
const STORAGE_KEY_BOT_META = "botMeta";
const STORAGE_KEY_KICKED = "kickedPids";

export class RoomStorage {
  constructor(private room: Party.Room) {}

  async loadState(): Promise<ServerGameState | null> {
    const raw = await this.room.storage.get<unknown>(STORAGE_KEY_STATE);
    if (!raw) return null;
    return migrateState(raw);
  }

  async loadBotMeta(): Promise<Record<string, BotMeta>> {
    const meta = await this.room.storage.get<Record<string, BotMeta>>(STORAGE_KEY_BOT_META);
    return meta ?? {};
  }

  async loadKicked(): Promise<Set<string>> {
    const kicked = await this.room.storage.get<string[]>(STORAGE_KEY_KICKED);
    return new Set(kicked ?? []);
  }

  async saveState(state: ServerGameState): Promise<void> {
    await this.room.storage.put(STORAGE_KEY_STATE, tagVersion(state));
  }

  async saveBotMeta(meta: Record<string, BotMeta>): Promise<void> {
    await this.room.storage.put(STORAGE_KEY_BOT_META, meta);
  }

  async saveKicked(kicked: Set<string>): Promise<void> {
    await this.room.storage.put(STORAGE_KEY_KICKED, Array.from(kicked));
  }
}
