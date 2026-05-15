/**
 * `modeExt` — typed extension slot on `ServerGameState` keyed by feature id.
 *
 * Why this exists
 * ---------------
 * New mode features (auction pools, bid logs, mission targets) used to add a
 * field directly to `ServerGameState`. After ~8 of those, the shape sprawls;
 * worse, every reader/writer has to know about every field. `modeExt` gives
 * each feature its own namespaced pocket so the state shape stays flat at
 * the engine layer and features stay isolated.
 *
 * Usage
 * -----
 *   // Lazy init the feature's pocket on first read.
 *   const log = getModeExt(state, "bridge-bid", () => ({ entries: [] }));
 *
 *   // Expose it to clients (default: omitted from broadcast).
 *   registerModeExtMasker("bridge-bid", (value, viewerId) => publicView(value));
 *
 * Invariants
 * ----------
 * - Additive only. Existing Ding fields stay on `ServerGameState` proper;
 *   `modeExt` is for *new* feature state, not for migrating old fields.
 * - Private by default. Without a registered masker, the value is never
 *   broadcast. Features opt-in explicitly when they have something safe
 *   to expose.
 */
import type { ServerGameState } from "../../../party/state";

export function getModeExt<T>(state: ServerGameState, key: string, init: () => T): T {
  if (state.modeExt[key] === undefined) state.modeExt[key] = init();
  return state.modeExt[key] as T;
}

/** Returns whatever should be exposed to `viewerId`, or `undefined` to omit. */
export type ModeExtMasker = (value: unknown, viewerId: string) => unknown | undefined;

const modeExtMaskers = new Map<string, ModeExtMasker>();

export function registerModeExtMasker(key: string, masker: ModeExtMasker): void {
  modeExtMaskers.set(key, masker);
}

/** Build the client-facing snapshot of `modeExt` from the server state. */
export function maskModeExt(
  modeExt: Record<string, unknown>,
  viewerId: string,
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  let any = false;
  for (const [key, value] of Object.entries(modeExt)) {
    const masker = modeExtMaskers.get(key);
    if (!masker) continue;
    const masked = masker(value, viewerId);
    if (masked === undefined) continue;
    out[key] = masked;
    any = true;
  }
  return any ? out : undefined;
}
