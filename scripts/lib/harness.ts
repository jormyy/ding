/**
 * Shared simulation harness — replaces the FakeConn / makeFakeRoom / arg
 * parsing copy-paste that used to live in five different scripts.
 *
 * Used by: simulate.ts, simulateFast.ts, playAgainst.ts, beliefAccuracy.ts,
 * debugOne.ts.
 */

import type * as Party from "partykit/server";
import type { ClientMessage } from "../../src/lib/types";

// ---- Fake PartyKit room (no-op storage, no-op broadcast) -----------------

export class FakeConn {
  public closed = false;
  constructor(public id: string) {}
  send(_msg: string): void {
    // intentional no-op: the harness doesn't need wire output
  }
  close(): void {
    this.closed = true;
  }
}

export function asPartyConnection(c: FakeConn): Party.Connection {
  return c as unknown as Party.Connection;
}

/**
 * Build a no-op `Party.Room`. Storage methods are stubs so DO-alarm code
 * doesn't crash. The room is thrown away after each game in batch scripts.
 */
export function makeFakeRoom(id = "sim-room"): Party.Room {
  const storage = {
    get: async () => undefined,
    put: async () => {},
    delete: async () => false,
    deleteAll: async () => {},
    list: async () => new Map(),
    getAlarm: async () => null,
    setAlarm: async () => {},
    deleteAlarm: async () => {},
    transaction: async (cb: (txn: unknown) => Promise<void>) => {
      await cb({});
    },
  };
  return {
    id,
    internalID: id,
    env: {} as Record<string, unknown>,
    context: {} as Party.ExecutionContext,
    broadcast: () => {},
    getConnections: () =>
      ({ next: () => ({ done: true, value: undefined }) }) as unknown as Iterable<
        Party.Connection<unknown>
      >,
    getConnection: () => undefined,
    getMyAlarm: () => Promise.resolve(null),
    setAlarm: () => Promise.resolve(),
    deleteAlarm: () => Promise.resolve(),
    storage: storage as unknown as Party.Storage,
  };
}

// ---- CLI argument parsing ------------------------------------------------

/** `--name 5` → 5 ; missing → fallback. */
export function argOr(name: string, fallback: number): number {
  const i = process.argv.indexOf("--" + name);
  if (i === -1) return fallback;
  return Number(process.argv[i + 1]);
}

/** `--name` present → true. */
export function argFlag(name: string): boolean {
  return process.argv.indexOf("--" + name) !== -1;
}

/** `--name foo` → "foo" ; missing → null. */
export function argStr(name: string): string | null {
  const i = process.argv.indexOf("--" + name);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  return v ?? null;
}

// ---- Action stats ledger -------------------------------------------------

export type ActionStats = {
  proposals: number;
  accepts: number;
  rejects: number;
  cancels: number;
  readies: number;
  flips: number;
  moves: number;
  swaps: number;
  unclaims: number;
  dings: number;
  fuckoffs: number;
};

export function freshActionStats(): ActionStats {
  return {
    proposals: 0,
    accepts: 0,
    rejects: 0,
    cancels: 0,
    readies: 0,
    flips: 0,
    moves: 0,
    swaps: 0,
    unclaims: 0,
    dings: 0,
    fuckoffs: 0,
  };
}

/** Increment the appropriate counter for an outgoing client message. */
export function bumpActionStats(stats: ActionStats, type: ClientMessage["type"]): void {
  switch (type) {
    case "proposeChipMove":
      stats.proposals++;
      break;
    case "acceptChipMove":
      stats.accepts++;
      break;
    case "rejectChipMove":
      stats.rejects++;
      break;
    case "cancelChipMove":
      stats.cancels++;
      break;
    case "ready":
      stats.readies++;
      break;
    case "flip":
      stats.flips++;
      break;
    case "move":
      stats.moves++;
      break;
    case "swap":
      stats.swaps++;
      break;
    case "unclaim":
      stats.unclaims++;
      break;
    case "ding":
      stats.dings++;
      break;
    case "fuckoff":
      stats.fuckoffs++;
      break;
  }
}

// ---- Numeric helpers -----------------------------------------------------

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
