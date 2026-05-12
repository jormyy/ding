import { GAME_MODE_DEFINITIONS } from "./catalog";
import { DEFAULT_GAME_MODE_ID, type DingGameModeDefinition } from "./types";

const modeById = new Map(GAME_MODE_DEFINITIONS.map((mode) => [mode.id, mode]));

export function listGameModes(): readonly DingGameModeDefinition[] {
  return GAME_MODE_DEFINITIONS;
}

export function isGameModeId(id: string): boolean {
  return modeById.has(id);
}

export function getGameModeDefinition(id: string | undefined): DingGameModeDefinition {
  return modeById.get(id ?? "") ?? modeById.get(DEFAULT_GAME_MODE_ID)!;
}
