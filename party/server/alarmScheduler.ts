/**
 * AlarmScheduler — computes when the DO alarm should next fire. Considers:
 *
 *   1. round-timer expiry (if set and we're in a play phase),
 *   2. lobby-ghost grace expiry (if any disconnected lobby players are waiting).
 *
 * If nothing pending, deletes the alarm entirely so the DO can hibernate.
 */

import type * as Party from "partykit/server";
import type { ServerGameState } from "../state";
import { LOBBY_GRACE_MS } from "../../src/lib/constants";

export class AlarmScheduler {
  /**
   * Track the last computed alarm timestamp so we don't issue redundant
   * `setAlarm` storage writes when the target hasn't changed.
   */
  private lastTarget: number | null = null;

  constructor(private room: Party.Room) {}

  async schedule(state: ServerGameState): Promise<void> {
    const candidates: number[] = [];
    const { phase, phaseStartedAt, roundTimerSeconds } = state;
    if (
      phaseStartedAt !== null &&
      roundTimerSeconds > 0 &&
      phase !== "lobby" &&
      phase !== "reveal"
    ) {
      candidates.push(phaseStartedAt + roundTimerSeconds * 1000);
    }
    if (phase === "lobby") {
      for (const p of state.players) {
        if (
          !p.connected &&
          p.disconnectedAt !== null &&
          p.disconnectedAt !== undefined
        ) {
          candidates.push(p.disconnectedAt + LOBBY_GRACE_MS);
        }
      }
    }
    try {
      if (candidates.length === 0) {
        if (this.lastTarget !== null) {
          await this.room.storage.deleteAlarm();
          this.lastTarget = null;
        }
        return;
      }
      const next = Math.max(Date.now() + 100, Math.min(...candidates));
      // Dirty-bit gate: skip the storage write if the target is unchanged.
      if (this.lastTarget === next) return;
      await this.room.storage.setAlarm(next);
      this.lastTarget = next;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[ding] AlarmScheduler.schedule failed", err);
    }
  }

  /** Force-refresh on next call; use when state was replaced (playAgain). */
  invalidate(): void {
    this.lastTarget = null;
  }
}
