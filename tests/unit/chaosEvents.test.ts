import { describe, expect, it } from "vitest";
import DingServer from "../../party/index";
import { asPartyConnection, asPartyRoom, makeFakeConn, makeFakeRoom, simulateClientMessage } from "../shared/mocks";

function latestState(conn: { sentMessages: unknown[] }) {
  for (let index = conn.sentMessages.length - 1; index >= 0; index--) {
    const msg = conn.sentMessages[index] as { type?: string; state?: unknown };
    if (msg.type === "state") return msg.state as { phase: string; hands: { id: string; playerId: string }[]; ranking: (string | null)[] };
  }
  return null;
}

describe("chaos event broadcasts", () => {
  it("broadcasts and logs typed chaos events when phase effects fire", () => {
    const room = makeFakeRoom("chaos-events");
    const server = new DingServer(asPartyRoom(room));
    const alpha = makeFakeConn("alpha-conn");
    const bravo = makeFakeConn("bravo-conn");
    room.addConnection(alpha);
    room.addConnection(bravo);
    server.onConnect(asPartyConnection(alpha));
    server.onConnect(asPartyConnection(bravo));

    simulateClientMessage(alpha, server, { type: "join", pid: "alpha", name: "Alpha" });
    simulateClientMessage(bravo, server, { type: "join", pid: "bravo", name: "Bravo" });
    simulateClientMessage(alpha, server, { type: "configure", modeId: "lightning", handsPerPlayer: 1 });
    simulateClientMessage(alpha, server, { type: "start" });

    for (const phase of ["preflop", "flop", "turn"] as const) {
      const state = latestState(alpha);
      expect(state?.phase).toBe(phase);
      for (const [index, hand] of state?.hands.entries() ?? []) {
        simulateClientMessage(hand.playerId === "alpha" ? alpha : bravo, server, {
          type: "move",
          handId: hand.id,
          toIndex: index,
        });
      }
      simulateClientMessage(alpha, server, { type: "ready", ready: true });
      simulateClientMessage(bravo, server, { type: "ready", ready: true });
    }

    const chaos = alpha.getMessagesByType("chaos-event");
    expect(chaos).toContainEqual({
      type: "chaos-event",
      event: "incrementFirstHolePerHand",
      affected: ["community", "alpha-0", "bravo-0"],
      phase: "river",
      modeId: "lightning",
    });
    const riverState = latestState(alpha) as { botActionLog: { action: { type: string; event?: string } }[]; phase: string };
    expect(riverState.phase).toBe("river");
    expect(riverState.botActionLog.some((entry) =>
      entry.action.type === "chaos-event" && entry.action.event === "incrementFirstHolePerHand"
    )).toBe(true);
  });
});
