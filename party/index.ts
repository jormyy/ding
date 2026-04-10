import type * as Party from "partykit/server";
import type {
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
    score: null,
    allCommunityCards: [],
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

function countInversions(
  playerRanking: string[],
  trueRanking: string[],
  hands: Hand[],
  communityCards: Card[]
): number {
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
  for (let i = 0; i < playerRanking.length; i++) {
    for (let j = i + 1; j < playerRanking.length; j++) {
      const posI = truePosMap.get(playerRanking[i])!;
      const posJ = truePosMap.get(playerRanking[j])!;
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

function maskHandsForConnection(
  hands: Hand[],
  connId: string,
  phase: Phase
): Hand[] {
  return hands.map((hand) => {
    if (hand.playerId === connId) return hand;
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
    const maskedHands = maskHandsForConnection(state.hands, connId, state.phase);
    const clientState: GameState = {
      phase: state.phase,
      players: state.players,
      handsPerPlayer: state.handsPerPlayer,
      communityCards: communityCardsToShow,
      ranking: state.ranking,
      hands: maskedHands,
      revealIndex: state.revealIndex,
      trueRanking: state.trueRanking,
      score: state.score,
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

  onConnect(conn: Party.Connection) {
    // If game is in progress (not lobby), reject connection
    if (this.state.phase !== "lobby") {
      const msg: ServerMessage = {
        type: "error",
        message: "Game already in progress",
      };
      conn.send(JSON.stringify(msg));
      conn.close();
      return;
    }
    this.connections.set(conn.id, conn);
  }

  onClose(conn: Party.Connection) {
    this.connections.delete(conn.id);

    if (this.state.phase === "lobby") {
      // Remove player from list
      this.state.players = this.state.players.filter((p) => p.id !== conn.id);

      // If the creator left and there are still players, assign new creator
      if (
        this.state.players.length > 0 &&
        !this.state.players.some((p) => p.isCreator)
      ) {
        this.state.players[0].isCreator = true;
      }

      broadcastStateTo(this.room, this.state, this.connections);
    } else {
      // Mid-game disconnect
      const player = this.state.players.find((p) => p.id === conn.id);
      const playerName = player?.name ?? "A player";

      const endedMsg: ServerMessage = {
        type: "ended",
        reason: "player_disconnected",
        playerName,
      };

      for (const [, c] of Array.from(this.connections.entries())) {
        c.send(JSON.stringify(endedMsg));
      }

      // Reset state
      this.state = createInitialState();
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }

    const player = this.state.players.find((p) => p.id === sender.id);

    switch (msg.type) {
      case "join": {
        if (player) {
          // Already joined — just re-send state
          broadcastStateTo(this.room, this.state, this.connections);
          return;
        }

        const isCreator = this.state.players.length === 0;
        const newPlayer: Player = {
          id: sender.id,
          name: msg.name,
          isCreator,
          ready: false,
          connected: true,
        };
        this.state.players.push(newPlayer);
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
        if (this.state.players.length < 2) return;

        const deck = shuffleDeck(createDeck());
        const playerIds = this.state.players.map((p) => p.id);
        const { playerHands, communityCards } = dealCards(
          deck,
          playerIds,
          this.state.handsPerPlayer
        );

        // Build hands array
        const hands: Hand[] = [];
        const ranking: string[] = [];

        for (const playerId of playerIds) {
          for (let h = 0; h < this.state.handsPerPlayer; h++) {
            const handId = `${playerId}-${h}`;
            hands.push({
              id: handId,
              playerId,
              cards: playerHands[playerId][h],
              flipped: false,
            });
            ranking.push(handId);
          }
        }

        this.state.hands = hands;
        this.state.ranking = ranking;
        this.state.allCommunityCards = communityCards;
        this.state.communityCards = [];
        this.state.phase = "preflop";
        this.state.revealIndex = 0;
        this.state.trueRanking = null;
        this.state.score = null;

        // Reset ready states
        for (const p of this.state.players) {
          p.ready = false;
        }

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "swap": {
        const swapPhases: Phase[] = ["preflop", "flop", "turn", "river"];
        if (!swapPhases.includes(this.state.phase)) return;

        const handA = this.state.hands.find((h) => h.id === msg.handIdA);
        const handB = this.state.hands.find((h) => h.id === msg.handIdB);
        if (!handA || !handB) return;
        // Sender must own at least one of the hands
        if (handA.playerId !== sender.id && handB.playerId !== sender.id) return;

        const idxA = this.state.ranking.indexOf(msg.handIdA);
        const idxB = this.state.ranking.indexOf(msg.handIdB);
        if (idxA === -1 || idxB === -1) return;

        this.state.ranking[idxA] = msg.handIdB;
        this.state.ranking[idxB] = msg.handIdA;

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "move": {
        const gamePhasess: Phase[] = ["preflop", "flop", "turn", "river"];
        if (!gamePhasess.includes(this.state.phase)) return;

        const hand = this.state.hands.find((h) => h.id === msg.handId);
        if (!hand || hand.playerId !== sender.id) return;

        // Remove from current position
        const currentIndex = this.state.ranking.indexOf(msg.handId);
        if (currentIndex === -1) return;

        this.state.ranking.splice(currentIndex, 1);

        // Clamp toIndex
        const toIndex = Math.max(
          0,
          Math.min(msg.toIndex, this.state.ranking.length)
        );
        this.state.ranking.splice(toIndex, 0, msg.handId);

        broadcastStateTo(this.room, this.state, this.connections);
        break;
      }

      case "ready": {
        const gamePhases: Phase[] = ["preflop", "flop", "turn", "river"];
        if (!gamePhases.includes(this.state.phase)) return;
        if (!player) return;

        player.ready = msg.ready;

        // Check if all players ready
        const allReady = this.state.players.every((p) => p.ready);
        if (allReady) {
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

          if (nextPhase === "reveal") {
            // Compute true ranking
            this.state.trueRanking = computeTrueRanking(
              this.state.hands,
              this.state.allCommunityCards
            );
            this.state.revealIndex = 0;
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
        if (!this.state.trueRanking) return;

        const totalHands = this.state.hands.length;
        const currentRevealIdx =
          this.state.ranking.length - 1 - this.state.revealIndex;
        const handToFlipId = this.state.ranking[currentRevealIdx];

        if (msg.handId !== handToFlipId) return;

        const handToFlip = this.state.hands.find((h) => h.id === handToFlipId);
        if (!handToFlip) return;
        if (handToFlip.playerId !== sender.id) return;

        handToFlip.flipped = true;
        this.state.revealIndex++;

        if (this.state.revealIndex === totalHands) {
          // All flipped — compute score
          this.state.score = countInversions(
            this.state.ranking,
            this.state.trueRanking,
            this.state.hands,
            this.state.allCommunityCards
          );
        }

        broadcastStateTo(this.room, this.state, this.connections);
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
    }
  }
}
