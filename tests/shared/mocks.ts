/**
 * Mock implementations of PartyKit Connection and Room for testing
 * Based on FakeConn/FakeRoom pattern from scripts/simulate.ts
 */

import type * as Party from 'partykit/server'
import type { ClientMessage, ServerMessage } from '../../src/lib/types'

/**
 * Fake Connection that tracks sent messages and close state
 */
export class FakeConn {
  id: string
  sentMessages: any[] = []
  closed = false

  constructor(id: string) {
    this.id = id
  }

  send(data: string): void {
    try {
      const parsed = JSON.parse(data)
      this.sentMessages.push(parsed)
    } catch {
      this.sentMessages.push(data)
    }
  }

  close(): void {
    this.closed = true
  }

  getLastMessage(): any {
    return this.sentMessages[this.sentMessages.length - 1]
  }

  getMessagesByType(type: string): any[] {
    return this.sentMessages.filter((m) => m.type === type)
  }

  findMessageByType(type: string): any | undefined {
    return this.sentMessages.find((m) => m.type === type)
  }

  clearSentMessages(): void {
    this.sentMessages = []
  }
}

/**
 * Fake Room that tracks connections and broadcasts
 */
export class FakeRoom {
  id: string
  connections: Map<string, FakeConn> = new Map()
  broadcastMessages: any[] = []

  constructor(id = 'test-room') {
    this.id = id
  }

  addConnection(conn: FakeConn): void {
    this.connections.set(conn.id, conn)
  }

  removeConnection(id: string): void {
    this.connections.delete(id)
  }

  getConnection(id: string): FakeConn | undefined {
    return this.connections.get(id)
  }

  getConnections(): FakeConn[] {
    return Array.from(this.connections.values())
  }

  broadcast(data: string): void {
    try {
      const parsed = JSON.parse(data)
      this.broadcastMessages.push(parsed)
    } catch {
      this.broadcastMessages.push(data)
    }

    // Send to all connections
    for (const conn of this.connections.values()) {
      conn.send(data)
    }
  }

  getBroadcastMessages(): any[] {
    return this.broadcastMessages
  }

  /**
   * Get count of broadcast messages
   */
  getBroadcastCount(): number {
    return this.broadcastMessages.length
  }

  clearBroadcastMessages(): void {
    this.broadcastMessages = []
  }
}

/**
 * Helper to create a FakeRoom instance
 */
export function makeFakeRoom(id?: string): FakeRoom {
  return new FakeRoom(id)
}

/**
 * Helper to create a FakeConn instance
 */
export function makeFakeConn(id: string): FakeConn {
  return new FakeConn(id)
}

/**
 * Type assertion helper to treat FakeConn as PartyKit Connection
 */
export function asPartyConnection(conn: FakeConn): Party.Connection {
  return conn as unknown as Party.Connection
}

/**
 * Type assertion helper to treat FakeRoom as PartyKit Room
 */
export function asPartyRoom(room: FakeRoom): Party.Room {
  return room as unknown as Party.Room
}

/**
 * Helper to simulate a client sending a message to the server
 */
export function simulateClientMessage(
  conn: FakeConn,
  server: any,
  message: ClientMessage
) {
  const serialized = JSON.stringify(message)
  server.onMessage(serialized, asPartyConnection(conn))
}

/**
 * Helper to wait for a condition to be true
 */
export function waitForCondition(
  condition: () => boolean,
  timeoutMs = 5000,
  intervalMs = 50
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval)
        resolve()
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval)
        reject(new Error(`Condition not met within ${timeoutMs}ms`))
      }
    }, intervalMs)
  })
}
