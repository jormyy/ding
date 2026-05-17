import { GAME_MODE_DEFINITIONS } from "./catalog.generated";
import { DEFAULT_GAME_MODE_ID, type DingGameModeDefinition } from "./types";
import { idMap } from "../utils";

const modeById = idMap(GAME_MODE_DEFINITIONS);

export function listGameModes(): readonly DingGameModeDefinition[] {
  return GAME_MODE_DEFINITIONS;
}

export function isGameModeId(id: string): boolean {
  return modeById.has(id);
}

export function getGameModeDefinition(id: string | undefined): DingGameModeDefinition {
  return modeById.get(id ?? "") ?? modeById.get(DEFAULT_GAME_MODE_ID)!;
}
