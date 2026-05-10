/**
 * ConnectionManager — owns the live WebSocket map and lookups by both
 * connection id and player id. Extracted from DingServer so the orchestrator
 * doesn't have to thread `connections` everywhere.
 */

import type * as Party from "partykit/server";
import type { Player } from "../../src/lib/types";

export class ConnectionManager {
  private connections: Map<string, Party.Connection> = new Map();

  add(conn: Party.Connection): void {
    this.connections.set(conn.id, conn);
  }

  remove(connId: string): void {
    this.connections.delete(connId);
  }

  /** Number of currently-live connections. */
  size(): number {
    return this.connections.size;
  }

  /** Get the underlying Map (for compatibility with broadcast helpers that take it directly). */
  raw(): Map<string, Party.Connection> {
    return this.connections;
  }

  /** Find the player matching a given connection. */
  playerByConn(players: Player[], connId: string): Player | undefined {
    return players.find((p) => p.connId === connId);
  }
}
