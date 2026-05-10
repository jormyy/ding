/**
 * LobbySweeper — evicts disconnected lobby players whose grace window has
 * elapsed, transferring creator to the next connected human if needed.
 */

import type { ServerGameState } from "../state";
import { LOBBY_GRACE_MS } from "../../src/lib/constants";

export interface LobbySweepDeps {
  removePlayerFromLobby: (id: string) => void;
}

/**
 * Scan the lobby for ghost players past their grace window and remove them.
 * Returns true if at least one player was evicted.
 */
export function sweepLobbyGhosts(
  state: ServerGameState,
  deps: LobbySweepDeps
): boolean {
  if (state.phase !== "lobby") return false;
  const now = Date.now();
  const stale = state.players.filter(
    (p) =>
      !p.connected &&
      p.disconnectedAt !== null &&
      p.disconnectedAt !== undefined &&
      p.disconnectedAt + LOBBY_GRACE_MS <= now
  );
  for (const p of stale) deps.removePlayerFromLobby(p.id);
  return stale.length > 0;
}
