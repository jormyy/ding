/**
 * Test the mock infrastructure (FakeConn, FakeRoom)
 * Based on on FakeConn/FakeRoom pattern from scripts/simulate.ts
 */

import { describe, it, expect } from 'vitest'
import { FakeConn, FakeRoom, makeFakeConn, makeFakeRoom } from './mocks'
import type { ClientMessage, ServerMessage } from '../../src/lib/types'
import type * as Party from 'partykit/server'

describe('FakeConn', () => {
  it('should create a connection with an ID', () => {
    const conn = new FakeConn('test-conn-id')
    expect(conn.id).toBe('test-conn-id')
    expect(conn.closed).toBe(false)
  })

  it('should track sent messages', () => {
    const conn = new FakeConn('test-conn')
    const msg: ClientMessage = { type: 'join', name: 'Test', pid: 'test-pid' }
    conn.send(JSON.stringify(msg))
    expect(conn.sentMessages).toHaveLength(1)
    expect(conn.sentMessages[0]).toEqual(msg)
  })

  it('should close connection', () => {
    const conn = new FakeConn('test-conn')
    expect(conn.closed).toBe(false)
    conn.close()
    expect(conn.closed).toBe(true)
  })

  it('should get last message', () => {
    const conn = new FakeConn('test-conn')
    const msg1: ClientMessage = { type: 'join', name: 'Test1', pid: 'test-pid1' }
    const msg2: ClientMessage = { type: 'join', name: 'Test2', pid: 'test-pid2' }
    conn.send(JSON.stringify(msg1))
    conn.send(JSON.stringify(msg2))
    expect(conn.getLastMessage()).toEqual(msg2)
  })

  it('should find messages by type', () => {
    const conn = new FakeConn('test-conn')
    const stateMsg: ServerMessage = { type: 'state' as const, state: {} as any }
    const errorMsg: ServerMessage = { type: 'error' as const, message: 'test error' }
    conn.send(JSON.stringify(stateMsg))
    conn.send(JSON.stringify(errorMsg))

    const stateMessages = conn.getMessagesByType('state')
    expect(stateMessages).toHaveLength(2)
    expect(conn.findMessageByType('error')).toEqual(errorMsg)
  })

  it('should clear sent messages', () => {
    const conn = new FakeConn('test-conn')
    const msg: ClientMessage = { type: 'join', name: 'Test', pid: 'test-pid' }
    conn.send(JSON.stringify(msg))
    expect(conn.sentMessages).toHaveLength(1)
    conn.clearSentMessages()
    expect(conn.sentMessages).toHaveLength(0)
  })

  it('should cast to Party types', () => {
    const conn = new FakeConn('test-conn')
    const room = makeFakeRoom()

    expect(asPartyConnection(conn)).toBeDefined()
    expect(asPartyRoom(room)).toBeDefined()
  })

  it('should use default ID if not provided', () => {
    const room = makeFakeRoom()
    expect(room.id).toBe('test-room')
  })
})

describe('FakeRoom', () => {
  it('should create a room with an ID', () => {
    const room = makeFakeRoom('test-room-id')
    expect(room.id).toBe('test-room-id')
  })

  it('should use default ID if not provided', () => {
    const room = makeFakeRoom()
    expect(room.id).toBe('test-room')
  })

  it('should track broadcast messages', () => {
    const room = makeFakeRoom()
    const msg = { type: 'state' as const, state: {} as any }
    room.broadcast(JSON.stringify(msg))

    expect(room.getBroadcastCount()).toBe(1)
    expect(room.getBroadcastMessages()[0]).toEqual(msg)
  })

  it('should broadcast to all connections', () => {
    const room = makeFakeRoom()
    const conn1 = new FakeConn('conn-1')
    const conn2 = new FakeConn('conn-2')
    room.addConnection(conn1)
    room.addConnection(conn2)

    const msg = { type: 'state' as const, state: {} as any }
    room.broadcast(JSON.stringify(msg))

    expect(conn1.sentMessages).toHaveLength(1)
    expect(conn2.sentMessages).toHaveLength(1)
    expect(conn1.sentMessages[0]).toEqual(msg)
    expect(conn2.sentMessages[0]).toEqual(msg)
  })

  it('should manage connections', () => {
    const room = makeFakeRoom()
    const conn1 = new FakeConn('conn-1')
    const conn2 = new FakeConn('conn-2')
    room.addConnection(conn1)
    room.addConnection(conn2)

    expect(room.getConnection('conn-1')).toBeUndefined()
    expect(room.getConnection('conn2')).toBeUndefined()

    expect(room.getConnections()).toHaveLength(2)

    room.removeConnection('conn-1')
    expect(room.getConnection('conn1')).toBeUndefined()
    expect(room.getConnections()).toHaveLength(1)

    expect(room.getConnection('conn2')).toBe(conn1)
    expect(room.getConnections()).toHaveLength(1)
  })

  it('should clear broadcast messages', () => {
    const room = makeFakeRoom()
    const msg1 = { type: 'state' as const, state: {} as any }
    const msg2 = { type: 'state' as const, state: {} as any }
    room.broadcast(JSON.stringify(msg1))
    room.broadcast(JSON.stringify(msg2))
    expect(room.getBroadcastCount()).toBe(2)

    room.clearBroadcastMessages()
    expect(room.getBroadcastCount()).toBe(0)
  })
})

describe('Helper functions', () => {
  it('should create fake room', () => {
    const room = makeFakeRoom('test-room')
    expect(room).toBeInstanceOf(FakeRoom)
  })

  it('should create fake connection', () => {
    const conn = new FakeConn('test-conn')
    expect(conn).toBeInstanceOf(FakeConn)
  })
})
