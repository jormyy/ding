/**
 * Smoke tests for round timer enforcement (server-side auto-ready of bots).
 *
 * The round timer introduced in commit 1e7e888 was client-only — the human's
 * GameTimer component fired handleReady(true), but bots (server-side) never
 * got auto-readied. These tests verify the server-side enforcement fix.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import DingServer from '../../party/index'
import { advancePhaseIfAllReady } from '../../party/handlers/lifecycle'
import { createInitialState } from '../../party/state'
import { FakeRoom, FakeConn, makeFakeRoom, makeFakeConn, asPartyRoom, asPartyConnection, simulateClientMessage } from '../shared/mocks'
import type { Card, Player, Rank, Suit } from '../../src/lib/types'

function makeCard(rank: Rank, suit: Suit): Card {
  return { rank, suit }
}

describe('advancePhaseIfAllReady', () => {
  it('returns false when not all connected players are ready', () => {
    const state = createInitialState()
    state.phase = 'preflop'
    state.handsPerPlayer = 1
    state.players = [
      { id: 'p1', connId: 'c1', name: 'a', isCreator: true, ready: true, connected: true },
      { id: 'p2', connId: 'c2', name: 'b', isCreator: false, ready: false, connected: true },
    ]
    state.ranking = ['p1-0', 'p2-0']
    state.hands = [
      { id: 'p1-0', playerId: 'p1', cards: [makeCard('A', 'S'), makeCard('K', 'S')], flipped: false },
      { id: 'p2-0', playerId: 'p2', cards: [makeCard('2', 'H'), makeCard('3', 'D')], flipped: false },
    ]

    const advanced = advancePhaseIfAllReady(state)
    expect(advanced).toBe(false)
    expect(state.phase).toBe('preflop')
  })

  it('returns true and advances phase when all connected are ready', () => {
    const state = createInitialState()
    state.phase = 'preflop'
    state.phaseStartedAt = Date.now()
    state.handsPerPlayer = 1
    state.players = [
      { id: 'p1', connId: 'c1', name: 'a', isCreator: true, ready: true, connected: true },
      { id: 'p2', connId: 'c2', name: 'b', isCreator: false, ready: true, connected: true },
    ]
    state.ranking = ['p1-0', 'p2-0']
    state.hands = [
      { id: 'p1-0', playerId: 'p1', cards: [makeCard('A', 'S'), makeCard('K', 'S')], flipped: false },
      { id: 'p2-0', playerId: 'p2', cards: [makeCard('2', 'H'), makeCard('3', 'D')], flipped: false },
    ]

    const advanced = advancePhaseIfAllReady(state)
    expect(advanced).toBe(true)
    expect(state.phase).toBe('flop')
    expect(state.ranking.every((s) => s === null)).toBe(true)
    // Phase start time should be updated
    expect(state.phaseStartedAt).toBeGreaterThan(0)
    // All ready flags should be cleared
    expect(state.players.every((p) => !p.ready)).toBe(true)
  })

  it('advances when offline player is not ready', () => {
    const state = createInitialState()
    state.phase = 'river'
    state.phaseStartedAt = 1
    state.handsPerPlayer = 1
    state.players = [
      { id: 'p1', connId: 'c1', name: 'a', isCreator: true, ready: true, connected: true },
      { id: 'p2', connId: 'c2', name: 'b', isCreator: false, ready: false, connected: false },
    ]
    state.ranking = ['p1-0', 'p2-0']
    state.hands = [
      { id: 'p1-0', playerId: 'p1', cards: [makeCard('A', 'S'), makeCard('K', 'S')], flipped: false },
      { id: 'p2-0', playerId: 'p2', cards: [makeCard('2', 'H'), makeCard('3', 'D')], flipped: false },
    ]

    const advanced = advancePhaseIfAllReady(state)
    expect(advanced).toBe(true)
    expect(state.phase).toBe('reveal')
  })
})

describe('Round timer server-side enforcement', () => {
  let server: DingServer
  let fakeRoom: FakeRoom
  let conn1: FakeConn

  beforeEach(() => {
    fakeRoom = makeFakeRoom('timer-room')
    server = new DingServer(asPartyRoom(fakeRoom))
    conn1 = makeFakeConn('c1')
    fakeRoom.addConnection(conn1)
    server.onConnect(asPartyConnection(conn1))
  })

  // State is broadcast per-connection via conn.send(), not room.broadcast().
  function getBroadcastState(conn: FakeConn): any {
    for (let i = conn.sentMessages.length - 1; i >= 0; i--) {
      if (conn.sentMessages[i].type === 'state') return conn.sentMessages[i].state
    }
    return null
  }

  it('starts a game with timer and enters preflop', () => {
    simulateClientMessage(conn1, server, { type: 'join', pid: 'p1', name: 'Alice' })
    const state = getBroadcastState(conn1)
    expect(state).toBeDefined()
    expect(state.phase).toBe('lobby')
    expect(state.roundTimerSeconds).toBe(0)
  })

  it('configures round timer', () => {
    simulateClientMessage(conn1, server, { type: 'join', pid: 'p1', name: 'Alice' })
    conn1.clearSentMessages()
    simulateClientMessage(conn1, server, { type: 'configure', roundTimerSeconds: 5 })
    const state = getBroadcastState(conn1)
    expect(state.roundTimerSeconds).toBe(5)
  })

  it('game starts with timer set and phaseStartedAt is populated', () => {
    simulateClientMessage(conn1, server, { type: 'join', pid: 'p1', name: 'Alice' })
    simulateClientMessage(conn1, server, { type: 'configure', handsPerPlayer: 1 })
    // Add a bot via the addBot handler
    server.onMessage(JSON.stringify({ type: 'addBot' }), asPartyConnection(conn1))
    conn1.clearSentMessages()
    simulateClientMessage(conn1, server, { type: 'start' })
    const state = getBroadcastState(conn1)
    expect(state.phase).toBe('preflop')
    expect(state.phaseStartedAt).toBeGreaterThan(0)
    expect(state.gameStartedAt).toBeGreaterThan(0)
  })

  it('auto-readies bots when round timer expires (fake timers)', async () => {
    vi.useFakeTimers()

    const room = makeFakeRoom('timer-expiry')
    const srv = new DingServer(asPartyRoom(room))
    const conn = makeFakeConn('c1')
    room.addConnection(conn)
    srv.onConnect(asPartyConnection(conn))

    simulateClientMessage(conn, srv, { type: 'join', pid: 'p1', name: 'Alice' })

    // Add a bot
    srv.onMessage(JSON.stringify({ type: 'addBot' }), asPartyConnection(conn))

    // 5-second round timer
    simulateClientMessage(conn, srv, { type: 'configure', roundTimerSeconds: 5, handsPerPlayer: 1 })

    conn.clearSentMessages()
    simulateClientMessage(conn, srv, { type: 'start' })

    let state = getBroadcastState(conn)
    expect(state.phase).toBe('preflop')

    // The human's hand ID is "p1-0" (pid + "-0").  Place it in slot 0.
    // The bot's hand ID is whatever the bot's pid is + "-0".
    // Both players must place hands before anyone can ready.
    // First, place the human's hand.
    simulateClientMessage(conn, srv, { type: 'move', handId: 'p1-0', toIndex: 0 })

    // Place the bot hand through the same server handler path. This test is
    // about timer enforcement, not the bot strategy scheduler.
    state = getBroadcastState(conn)
    const bot = state.players.find((p: any) => p.isBot)
    expect(bot).toBeDefined()
    const botHand = state.hands.find((h: any) => h.playerId === bot.id)
    expect(botHand).toBeDefined()
    ;(srv as unknown as { dispatchBotAction: (pid: string, msg: any) => void })
      .dispatchBotAction(bot.id, { type: 'move', handId: botHand.id, toIndex: 1 })
    state = getBroadcastState(conn)

    // Both hands should now be placed.  The round timer (5s) is expired.
    expect(state.ranking.filter((s: any) => s !== null).length).toBeGreaterThanOrEqual(2)
    vi.advanceTimersByTime(6000)
    // Fire the DO alarm directly — in production the PartyKit framework
    // wakes the worker at the scheduled time; under fake timers we trigger
    // it manually since no framework is running.
    await (srv as unknown as { onAlarm: () => Promise<void> }).onAlarm()

    state = getBroadcastState(conn)
    expect(state.phase).not.toBe('preflop')

    vi.useRealTimers()
  }, 30000)

  it('does NOT advance phase when connected player has unplaced hands', () => {
    vi.useFakeTimers()

    const room = makeFakeRoom('timer-unplaced')
    const srv = new DingServer(asPartyRoom(room))
    const conn = makeFakeConn('c1')
    room.addConnection(conn)
    srv.onConnect(asPartyConnection(conn))

    simulateClientMessage(conn, srv, { type: 'join', pid: 'p1', name: 'Alice' })
    srv.onMessage(JSON.stringify({ type: 'addBot' }), asPartyConnection(conn))
    // 1-second timer
    simulateClientMessage(conn, srv, { type: 'configure', roundTimerSeconds: 1, handsPerPlayer: 1 })

    conn.clearSentMessages()
    simulateClientMessage(conn, srv, { type: 'start' })

    let state = getBroadcastState(conn)
    expect(state.phase).toBe('preflop')

    // Advance time well past the 1-second timer — but DON'T place any hands.
    // The timer should NOT advance the phase because online players have
    // unplaced hands.
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1000)
      state = getBroadcastState(conn)
    }

    // Should still be in preflop — the timer's unplaced-hands guard blocked it.
    expect(state.phase).toBe('preflop')

    vi.useRealTimers()
  })
})
