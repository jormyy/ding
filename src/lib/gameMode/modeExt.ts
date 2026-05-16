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
 * Invariants
 * ----------
 * - Additive only. Existing Ding fields stay on `ServerGameState` proper;
 *   `modeExt` is for *new* feature state, not for migrating old fields.
 * - Private by default. Without a registered masker, the value is never
 *   broadcast. Features opt-in explicitly when they have something safe
 *   to expose.
 */

/** Returns whatever should be exposed to `viewerId`, or `undefined` to omit. */
export type ModeExtMasker = (value: unknown, viewerId: string) => unknown | undefined;

const modeExtMaskers = new Map<string, ModeExtMasker>();

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
