/**
 * Tests for the lobby-ghost sweeper introduced in the scaling-fix PR.
 *
 * Disconnected lobby players linger for LOBBY_GRACE_MS so transient drops
 * (page refresh, brief network blip) restore the seat without re-joining.
 * After the grace window they're evicted so the lobby can't be ghost-locked
 * at MAX_PLAYERS.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import DingServer from '../../party/index'
import { LOBBY_GRACE_MS, MAX_PLAYERS } from '../../src/lib/constants'
import {
  FakeRoom,
  FakeConn,
  makeFakeRoom,
  makeFakeConn,
  asPartyRoom,
  asPartyConnection,
  simulateClientMessage,
} from '../shared/mocks'

type ServerWithInternals = {
  state: { players: Array<{ id: string; connected: boolean; disconnectedAt?: number | null }> }
  sweepLobbyGhosts: () => boolean
}

describe('Lobby ghost sweeper', () => {
  let server: DingServer
  let room: FakeRoom
  let internals: ServerWithInternals

  beforeEach(() => {
    room = makeFakeRoom('ghost-room')
    server = new DingServer(asPartyRoom(room))
    internals = server as unknown as ServerWithInternals
  })

  function joinPlayer(connId: string, pid: string, name: string): FakeConn {
    const conn = makeFakeConn(connId)
    room.addConnection(conn)
    server.onConnect(asPartyConnection(conn))
    simulateClientMessage(conn, server, { type: 'join', pid, name })
    return conn
  }

  it('removes lobby players whose grace window has elapsed', () => {
    const c1 = joinPlayer('c1', 'p1', 'Alice')
    joinPlayer('c2', 'p2', 'Bob')
    joinPlayer('c3', 'p3', 'Carol')

    expect(internals.state.players.length).toBe(3)

    // Disconnect Alice — sets disconnectedAt to now.
    server.onClose(asPartyConnection(c1))
    const alice = internals.state.players.find((p) => p.id === 'p1')
    expect(alice?.connected).toBe(false)
    expect(alice?.disconnectedAt).toBeTypeOf('number')

    // Pretend the grace window has just-barely elapsed.
    alice!.disconnectedAt = Date.now() - LOBBY_GRACE_MS - 1

    const removed = internals.sweepLobbyGhosts()
    expect(removed).toBe(true)
    expect(internals.state.players.find((p) => p.id === 'p1')).toBeUndefined()
    expect(internals.state.players.length).toBe(2)
  })

  it('keeps disconnected players still inside the grace window', () => {
    const c1 = joinPlayer('c1', 'p1', 'Alice')
    joinPlayer('c2', 'p2', 'Bob')

    server.onClose(asPartyConnection(c1))
    // disconnectedAt is "now" — well within grace.

    const removed = internals.sweepLobbyGhosts()
    expect(removed).toBe(false)
    expect(internals.state.players.length).toBe(2)
  })

  it('keeps connected players regardless of disconnectedAt', () => {
    const c1 = joinPlayer('c1', 'p1', 'Alice')
    joinPlayer('c2', 'p2', 'Bob')

    // Manually craft a stale disconnectedAt while still connected — guard
    // must check `connected: false`, not just the timestamp.
    const alice = internals.state.players.find((p) => p.id === 'p1')!
    alice.disconnectedAt = Date.now() - LOBBY_GRACE_MS - 5000
    expect(alice.connected).toBe(true)

    const removed = internals.sweepLobbyGhosts()
    expect(removed).toBe(false)
    expect(internals.state.players.length).toBe(2)
  })

  it('clears disconnectedAt on reconnect within the grace window', () => {
    const c1 = joinPlayer('c1', 'p1', 'Alice')
    server.onClose(asPartyConnection(c1))
    expect(internals.state.players[0].disconnectedAt).toBeTypeOf('number')

    // Reconnect with the same pid (different conn id mimics a new socket).
    const c1b = makeFakeConn('c1b')
    room.addConnection(c1b)
    server.onConnect(asPartyConnection(c1b))
    simulateClientMessage(c1b, server, { type: 'join', pid: 'p1', name: 'Alice' })

    const alice = internals.state.players[0]
    expect(alice.connected).toBe(true)
    expect(alice.disconnectedAt).toBeNull()
  })

  it('opportunistic sweep frees a seat when the lobby is full', () => {
    // Fill to MAX_PLAYERS.
    const conns: FakeConn[] = []
    for (let i = 0; i < MAX_PLAYERS; i++) {
      conns.push(joinPlayer(`c${i}`, `p${i}`, `P${i}`))
    }
    expect(internals.state.players.length).toBe(MAX_PLAYERS)

    // Drop one player and stale-out their disconnectedAt.
    server.onClose(asPartyConnection(conns[0]))
    const ghost = internals.state.players.find((p) => p.id === 'p0')!
    ghost.disconnectedAt = Date.now() - LOBBY_GRACE_MS - 1

    // A 9th tab tries to join — handleJoin should sweep the ghost first
    // and accept the new player rather than waiting 30 seconds.
    const newConn = makeFakeConn('cnew')
    room.addConnection(newConn)
    server.onConnect(asPartyConnection(newConn))
    simulateClientMessage(newConn, server, { type: 'join', pid: 'pnew', name: 'New' })

    expect(internals.state.players.length).toBe(MAX_PLAYERS)
    expect(internals.state.players.find((p) => p.id === 'pnew')).toBeDefined()
    expect(internals.state.players.find((p) => p.id === 'p0')).toBeUndefined()
    expect(newConn.closed).toBe(false)
  })

  it('does not sweep mid-game (only runs in lobby)', () => {
    const c1 = joinPlayer('c1', 'p1', 'Alice')
    joinPlayer('c2', 'p2', 'Bob')

    // Force a non-lobby phase via internals.
    ;(server as unknown as { state: { phase: string } }).state.phase = 'preflop'

    server.onClose(asPartyConnection(c1))
    const alice = internals.state.players.find((p) => p.id === 'p1')!
    alice.disconnectedAt = Date.now() - LOBBY_GRACE_MS - 1

    const removed = internals.sweepLobbyGhosts()
    expect(removed).toBe(false)
    expect(internals.state.players.length).toBe(2)
  })
})
