/**
 * State versioning + migration.
 *
 * The persisted state from PartyKit DO storage is opaque JSON. Whenever we
 * change the state shape in an incompatible way, we bump STATE_VERSION and
 * teach `migrateState` to convert older payloads forward.
 *
 * Pre-versioning: `state` was persisted without a `__version` field. Loading
 * an unversioned blob is treated as version 0 and migrated to current.
 *
 * Version 2: adds `modeExt: {}` baseline. Old blobs without the field get a
 * fresh empty record; no other shape changes.
 *
 * Migration is best-effort. On unrecoverable shapes we return a fresh state
 * to keep the room alive — clients reconnect and the game restarts cleanly.
 */

import { createInitialState, type ServerGameState } from "../state";
import { DEFAULT_GAME_MODE_ID, isGameModeId } from "../../src/lib/gameMode";

export const STATE_VERSION = 2;

type VersionedState = ServerGameState & { __version?: number };

/**
 * Tag a state with the current version. Called on every persist so the next
 * load knows what shape it's looking at.
 */
export function tagVersion(state: ServerGameState): VersionedState {
  return Object.assign({}, state, { __version: STATE_VERSION }) as VersionedState;
}

/**
 * Load a possibly-old state blob and migrate it forward to the current
 * version. Returns a fresh state on shape errors so the room is never
 * stuck in a broken state.
 */
export function migrateState(raw: unknown): ServerGameState {
  if (!raw || typeof raw !== "object") return createInitialState();
  const v = raw as VersionedState;

  const version = typeof v.__version === "number" ? v.__version : 0;

  if (version === STATE_VERSION) {
    return stripVersion(v);
  }

  if (version > STATE_VERSION) {
    // Forward-incompatible — likely a downgrade. Refuse to run on a future
    // shape rather than silently corrupt it.
    // eslint-disable-next-line no-console
    console.error(
      `[ding][migrate] persisted state is version ${version}, code is ${STATE_VERSION} — starting fresh`
    );
    return createInitialState();
  }

  // version 0 (unversioned) and version 1 (pre-modeExt) both forward-migrate
  // by stamping defaults — `stripVersion` adds the `modeExt: {}` baseline.
  if (version === 0 || version === 1) {
    return stripVersion(v);
  }

  // Defensive: any other version (e.g., negative) — fresh state.
  return createInitialState();
}

function stripVersion(v: VersionedState): ServerGameState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { __version, ...rest } = v;
  const state = rest as ServerGameState;
  if (!state.modeId || !isGameModeId(state.modeId)) state.modeId = DEFAULT_GAME_MODE_ID;
  state.dealChoices = state.dealChoices ?? {};
  state.dealDeck = state.dealDeck ?? [];
  state.burnCards = state.burnCards ?? [];
  state.communityLayout = state.communityLayout ?? undefined;
  state.modeInfo = state.modeInfo ?? [];
  state.pendingChaosEvents = [];
  state.modeExt = state.modeExt ?? {};
  for (const hand of state.hands ?? []) {
    hand.cardCount = hand.cardCount ?? hand.cards?.length ?? 0;
    hand.publicCards = hand.publicCards ?? [];
  }
  return state;
}
