import type * as Party from "partykit/server";
import type {
  AcquireRequest,
  Card,
  ClientMessage,
  GameState,
  Hand,
  Phase,
  Player,
  ServerMessage,
} from "../src/lib/types";
import { cardToPokersolverStr } from "../src/lib/utils";
import { createDeck, dealCards, shuffleDeck } from "../src/lib/deckUtils";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Hand: PokerHand } = require("pokersolver");

// Full server-side state (cards are never masked here)
interface ServerGameState extends GameState {
  // hands here contain ALL cards (unmasked)
  allCommunityCards: Card[]; // all 5, we slice for broadcast
  acquireRequests: AcquireRequest[];
}

function createInitialState(): ServerGameState {
  return {
    phase: "lobby",
    players: [],
    handsPerPlayer: 1,
    communityCards: [],
    ranking: [],
    hands: [],
    revealIndex: 0,
    trueRanking: null,
    trueRanks: null,
    score: null,
    rankHistory: {},
    allCommunityCards: [],
    acquireRequests: [],
  };
}

function computeTrueRanking(
  hands: Hand[],
  communityCards: Card[]
): string[] {
  // Solve each hand with pokersolver
  const solvedHands: Array<{ id: string; solved: ReturnType<typeof PokerHand.solve> }> = hands.map((h) => {
    const cardStrs = [
      ...h.cards.map(cardToPokersolverStr),
      ...communityCards.map(cardToPokersolverStr),
    ];
    return { id: h.id, solved: PokerHand.solve(cardStrs) };
  });

  // Sort from best to worst
  // pokersolver: higher rank = better hand
  solvedHands.sort((a, b) => {
    const winners = PokerHand.winners([a.solved, b.solved]);
    if (winners.length === 2) return 0; // tie
    if (winners[0] === a.solved) return -1; // a is better
    return 1; // b is better
  });

  return solvedHands.map((h) => h.id);
}

function computeTrueRanks(
  trueRanking: string[],
  hands: Hand[],
  communityCards: Card[]
): Record<string, number> {
  const solvedMap = new Map<string, ReturnType<typeof PokerHand.solve>>();
  for (const hand of hands) {
    const cardStrs = [
      ...hand.cards.map(cardToPokersolverStr),
      ...communityCards.map(cardToPokersolverStr),
    ];
    solvedMap.set(hand.id, PokerHand.solve(cardStrs));
  }

  const ranks: Record<string, number> = {};
  let rank = 1;
  for (let i = 0; i < trueRanking.length; i++) {
    if (i === 0) {
      ranks[trueRanking[i]] = rank;
    } else {
      const prev = solvedMap.get(trueRanking[i - 1])!;
      const curr = solvedMap.get(trueRanking[i])!;
      const winners = PokerHand.winners([prev, curr]);
      if (winners.length !== 2) rank++; // not a tie
      ranks[trueRanking[i]] = rank;
    }
  }
  return ranks;
}

function countInversions(
  playerRanking: (string | null)[],
  trueRanking: string[],
  hands: Hand[],
  communityCards: Card[]
): number {
  // Only score claimed slots
  const claimedRanking = playerRanking.filter((id): id is string => id !== null);
  // Build solved map for tie detection
  const solvedMap = new Map<string, ReturnType<typeof PokerHand.solve>>();
  for (const hand of hands) {
    const cardStrs = [
      ...hand.cards.map(cardToPokersolverStr),
      ...communityCards.map(cardToPokersolverStr),
    ];
    solvedMap.set(hand.id, PokerHand.solve(cardStrs));
  }

  // Build true position map (ties share same rank)
  const truePosMap = new Map<string, number>();
  let pos = 0;
  for (let i = 0; i < trueRanking.length; i++) {
    if (i === 0) {
      truePosMap.set(trueRanking[i], pos);
    } else {
      const prev = solvedMap.get(trueRanking[i - 1])!;
      const curr = solvedMap.get(trueRanking[i])!;
      const winners = PokerHand.winners([prev, curr]);
      if (winners.length === 2) {
        // tie — same position
        truePosMap.set(trueRanking[i], pos);
      } else {
        pos++;
        truePosMap.set(trueRanking[i], pos);
      }
    }
  }

  let inversions = 0;
  for (let i = 0; i < claimedRanking.length; i++) {
    for (let j = i + 1; j < claimedRanking.length; j++) {
      const posI = truePosMap.get(claimedRanking[i])!;
      const posJ = truePosMap.get(claimedRanking[j])!;
      // i should come before j (lower index = better = lower true pos number)
      // inversion if posI > posJ (i is actually worse than j)
      if (posI > posJ) {
        inversions++;
      }
      // if equal (tied) — not an inversion
    }
  }
  return inversions;
}

function maskHandsForPlayer(
  hands: Hand[],
  playerId: string,
  phase: Phase
): Hand[] {
  return hands.map((hand) => {
    if (hand.playerId === playerId) return hand;
    if (hand.flipped && phase === "reveal") return hand; // revealed to everyone
    return { ...hand, cards: [] };
  });
}

function broadcastStateTo(
  room: Party.Room,
  state: ServerGameState,
  connections: Map<string, Party.Connection>
) {
  const communityCardsToShow =
    state.phase === "preflop"
      ? []
      : state.phase === "flop"
      ? state.allCommunityCards.slice(0, 3)
      : state.phase === "turn"
      ? state.allCommunityCards.slice(0, 4)
      : state.phase === "river" || state.phase === "reveal"
      ? state.allCommunityCards.slice(0, 5)
      : [];

  for (const [connId, conn] of Array.from(connections.entries())) {
    const player = state.players.find((p) => p.connId === connId);
    const maskedHands = maskHandsForPlayer(state.hands, player?.id ?? "", state.phase);
    const clientState: GameState = {
      phase: state.phase,
      players: state.players,
      handsPerPlayer: state.handsPerPlayer,
      communityCards: communityCardsToShow,
      ranking: state.ranking,
      hands: maskedHands,
      revealIndex: state.revealIndex,
      trueRanking: state.trueRanking,
      trueRanks: state.trueRanks,
      score: state.score,
      rankHistory: state.rankHistory,
      acquireRequests: state.acquireRequests,
    };
    const msg: ServerMessage = { type: "state", state: clientState };
    conn.send(JSON.stringify(msg));
  }
}

export default class DingServer implements Party.Server {
  private state: ServerGameState;
  private connections: Map<string, Party.Connection> = new Map();

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
  }

  private getPlayerByConn(connId: string): Player | undefined {
    return this.state.players.find((p) => p.connId === connId);
  }

  onConnect(conn: Party.Connection) {
    // Accept all connections — game/lobby validation happens in the join handler
    this.connections.set(conn.id, conn);
  }

  onClose(conn: Party.Connection) {
    this.connections.delete(conn.id);

    const player = this.getPlayerByConn(conn.id);
    if (!player) return;

    if (this.state.phase === "lobby") {
      // Mark disconnected rather than removing, so others can see they left
      player.connected = false;

      // If the creator disconnected and others are still connected, reassign
      if (player.isCreator) {
        const nextConnected = this.state.players.find((p) => p.connected);
        if (nextConnected) {
          player.isCreator = false;
          nextConnected.isCreator = true;
        }
      }

      broadcastStateTo(this.room, this.state, this.connections);
    } else {
      // Mid-game disconnect — mark disconnected and continue, don't end the game
      player.connected = false;
      player.ready = false; // reset ready so the phase doesn't get stuck

      broadcastStateTo(this.room, this.state, this.connections);
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }

    const player = this.getPlayerByConn(sender.id);

    switch (msg.type) {
      case "join": {
        // Check if this is a reconnecting player (matched by persistent ID)
        const existingPlayer = this.state.players.find((p) => p.id === msg.pid);
        if (existingPlayer) {
          existingPlayer.connId = sender.id;
          existingPlayer.connected = true;
          sender.send(JSON.stringify({ type: "welcome", playerId: existingPlayer.id } as ServerMessage));
          broadcastStateTo(this.room, this.state, this.connections);
          return;
        }

        if (player) {
          // Already joined with this connection — re-send welcome + state
          sender.send(JSON.stringify({ type: "welcome", playerId: player.id } as ServerMessage));
          broadcastStateTo(this.room, this.state, this.connections);
          return;
        }

        // New player — only allowed in lobby
        if (this.state.phase !== "lobby") {
          const errMsg: ServerMessage = {
            type: "error",
            message: "Game already in progress",
          };
          sender.send(JSON.stringify(errMsg));
          sender.close();
          return;
        }

        const isCreator = this.state.players.length === 0;
        const newPlayer: Player = {
          id: msg.pid,
          connId: sender.id,
          name: msg.name,
          isCreator,
          ready: false,
          connected: true,
        };
        this.state.players.push(newPlayer);
        sender.send(JSON.stringify({ type: "welcome", playerId: newPlayer.id } as ServerMessage));
        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "configure": {
        if (!player?.isCreator || this.state.phase !== "lobby") return;
        const n = Math.max(1, Math.min(3, msg.handsPerPlayer));
        this.state.handsPerPlayer = n;
        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "start": {
        if (!player?.isCreator || this.state.phase !== "lobby") return;
        const connectedPlayers = this.state.players.filter((p) => p.connected);
        if (connectedPlayers.length < 2) return;

        // Drop disconnected players before starting
        this.state.players = connectedPlayers;

        const deck = shuffleDeck(createDeck());
        const playerIds = this.state.players.map((p) => p.id);
        const { playerHands, communityCards } = dealCards(
          deck,
          playerIds,
          this.state.handsPerPlayer
        );

        // Build hands array — ranking starts as all-null (slots on the board)
        const hands: Hand[] = [];

        for (const playerId of playerIds) {
          for (let h = 0; h < this.state.handsPerPlayer; h++) {
            const handId = `${playerId}-${h}`;
            hands.push({
              id: handId,
              playerId,
              cards: playerHands[playerId][h],
              flipped: false,
            });
          }
        }

        const totalHands = hands.length;

        this.state.hands = hands;
        this.state.ranking = Array(totalHands).fill(null);
        this.state.rankHistory = {};
        this.state.allCommunityCards = communityCards;
        this.state.communityCards = [];
        this.state.phase = "preflop";
        this.state.revealIndex = 0;
        this.state.trueRanking = null;
        this.state.trueRanks = null;
        this.state.score = null;

        // Reset ready states
        for (const p of this.state.players) {
          p.ready = false;
        }

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "swap": {
        // Only allowed for swapping your own hands (handsPerPlayer > 1)
        const swapPhases: Phase[] = ["preflop", "flop", "turn", "river"];
        if (!swapPhases.includes(this.state.phase)) return;

        const handA = this.state.hands.find((h) => h.id === msg.handIdA);
        const handB = this.state.hands.find((h) => h.id === msg.handIdB);
        if (!handA || !handB) return;
        // Sender must own BOTH hands
        if (!player || handA.playerId !== player.id || handB.playerId !== player.id) return;

        const idxA = this.state.ranking.indexOf(msg.handIdA);
        const idxB = this.state.ranking.indexOf(msg.handIdB);
        if (idxA === -1 || idxB === -1) return;

        this.state.ranking[idxA] = msg.handIdB;
        this.state.ranking[idxB] = msg.handIdA;

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "requestAcquire": {
        const gamePhases: Phase[] = ["preflop", "flop", "turn", "river"];
        if (!gamePhases.includes(this.state.phase)) return;

        const requesterHand = this.state.hands.find((h) => h.id === msg.requesterHandId);
        const targetHand = this.state.hands.find((h) => h.id === msg.targetHandId);
        if (!requesterHand || !targetHand) return;

        // Sender must own the requester hand
        if (!player || requesterHand.playerId !== player.id) return;

        // Can't request your own chip
        if (targetHand.playerId === player.id) return;

        // Target must have a chip in the ranking
        if (this.state.ranking.indexOf(msg.targetHandId) === -1) return;

        // Replace any existing request from this player for the same target chip
        // so only their latest requesting hand is active
        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) => !(r.requesterId === player.id && r.targetHandId === msg.targetHandId)
        );

        this.state.acquireRequests.push({
          requesterId: player.id,
          requesterHandId: msg.requesterHandId,
          targetHandId: msg.targetHandId,
        });

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "acceptAcquire": {
        const gamePhases: Phase[] = ["preflop", "flop", "turn", "river"];
        if (!gamePhases.includes(this.state.phase)) return;

        const targetHand = this.state.hands.find((h) => h.id === msg.targetHandId);
        if (!targetHand) return;

        // Only the owner of the targeted hand can accept
        if (!player || targetHand.playerId !== player.id) return;

        // Request must exist
        const reqIdx = this.state.acquireRequests.findIndex(
          (r) => r.requesterHandId === msg.requesterHandId && r.targetHandId === msg.targetHandId
        );
        if (reqIdx === -1) return;

        // Target must still have a chip
        const idxTarget = this.state.ranking.indexOf(msg.targetHandId);
        if (idxTarget === -1) return;

        // Capture requester's current position BEFORE mutating the array
        const idxRequester = this.state.ranking.indexOf(msg.requesterHandId);

        // Move requester's hand into target's rank slot
        this.state.ranking[idxTarget] = msg.requesterHandId;

        // Requester's old slot (if any) goes back to the board
        if (idxRequester !== -1) {
          this.state.ranking[idxRequester] = null;
        }

        // Clear all pending requests for this target hand
        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) => r.targetHandId !== msg.targetHandId
        );

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "rejectAcquire": {
        const targetHand = this.state.hands.find((h) => h.id === msg.targetHandId);
        if (!targetHand) return;

        // Only the owner of the targeted hand can reject
        if (!player || targetHand.playerId !== player.id) return;

        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) => !(r.requesterHandId === msg.requesterHandId && r.targetHandId === msg.targetHandId)
        );

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "move": {
        const gamePhasess: Phase[] = ["preflop", "flop", "turn", "river"];
        if (!gamePhasess.includes(this.state.phase)) return;

        const hand = this.state.hands.find((h) => h.id === msg.handId);
        if (!hand || !player || hand.playerId !== player.id) return;

        const toIndex = Math.max(
          0,
          Math.min(msg.toIndex, this.state.ranking.length - 1)
        );

        // Only move to unclaimed (null) slots
        if (this.state.ranking[toIndex] !== null) return;

        // Remove from current slot if already claimed
        const currentIndex = this.state.ranking.indexOf(msg.handId);
        if (currentIndex !== -1) {
          this.state.ranking[currentIndex] = null;
        }

        this.state.ranking[toIndex] = msg.handId;

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "ready": {
        const gamePhases: Phase[] = ["preflop", "flop", "turn", "river"];
        if (!gamePhases.includes(this.state.phase)) return;
        if (!player) return;

        // Don't allow readying up while any rank slots are unclaimed
        if (msg.ready && this.state.ranking.some((slot) => slot === null)) return;

        player.ready = msg.ready;

        // Check if all connected players ready (skip disconnected)
        const allReady = this.state.players.every((p) => !p.connected || p.ready);
        if (allReady) {
          // Snapshot rank history for the current phase
          for (const hand of this.state.hands) {
            const idx = this.state.ranking.indexOf(hand.id);
            if (!this.state.rankHistory[hand.id]) {
              this.state.rankHistory[hand.id] = [];
            }
            this.state.rankHistory[hand.id].push(idx === -1 ? null : idx + 1);
          }

          // Advance phase
          const phaseOrder: Phase[] = [
            "preflop",
            "flop",
            "turn",
            "river",
            "reveal",
          ];
          const currentIndex = phaseOrder.indexOf(this.state.phase as Phase);
          const nextPhase = phaseOrder[currentIndex + 1];

          // Clear all pending acquire requests on phase change
          this.state.acquireRequests = [];

          if (nextPhase === "reveal") {
            // Keep the river ranking intact — it drives flip order and scoring
            // Compute true ranking and per-hand true ranks (ties share same number)
            this.state.trueRanking = computeTrueRanking(
              this.state.hands,
              this.state.allCommunityCards
            );
            this.state.trueRanks = computeTrueRanks(
              this.state.trueRanking,
              this.state.hands,
              this.state.allCommunityCards
            );
            this.state.revealIndex = 0;
          } else {
            // Reset ranking — coins go back to the board at the start of each phase
            this.state.ranking = Array(this.state.hands.length).fill(null);
          }

          this.state.phase = nextPhase;

          // Reset ready states
          for (const p of this.state.players) {
            p.ready = false;
          }
        }

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "flip": {
        if (this.state.phase !== "reveal") return;
        if (this.state.score !== null) return; // already done

        const totalHands = this.state.hands.length;
        if (this.state.revealIndex >= totalHands) return;

        // Server determines which hand is up — no client validation needed
        const currentRevealIdx =
          this.state.ranking.length - 1 - this.state.revealIndex;
        const handToFlipId = this.state.ranking[currentRevealIdx];

        // Nulls should not exist at reveal (auto-filled), but guard anyway
        if (!handToFlipId) return;

        const handToFlip = this.state.hands.find((h) => h.id === handToFlipId);
        if (!handToFlip) return;

        // Must be the owner of this hand
        const senderPlayer = this.getPlayerByConn(sender.id);
        if (!senderPlayer || handToFlip.playerId !== senderPlayer.id) return;

        handToFlip.flipped = true;
        this.state.revealIndex++;

        if (this.state.revealIndex === totalHands) {
          this.state.score = countInversions(
            this.state.ranking,
            this.state.trueRanking!,
            this.state.hands,
            this.state.allCommunityCards
          );
        }

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "ding": {
        if (!player) return;
        const dingMsg: ServerMessage = { type: "ding", playerName: player.name };
        this.room.broadcast(JSON.stringify(dingMsg));
        break;
      }

      case "playAgain": {
        if (this.state.phase !== "reveal") return;
        if (!player?.isCreator) return;

        // Keep players, reset everything else
        const players = this.state.players.map((p) => ({
          ...p,
          ready: false,
        }));

        this.state = createInitialState();
        this.state.players = players;

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "endGame": {
        if (this.state.phase === "lobby") return;
        if (!player?.isCreator) return;

        const players = this.state.players.map((p) => ({
          ...p,
          ready: false,
        }));

        this.state = createInitialState();
        this.state.players = players;

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }
    }
  }
}
