import type * as Party from "partykit/server";
import type {
  AcquireRequestKind,
  Card,
  ChatMessage,
  ClientMessage,
  Hand,
  Phase,
  Player,
  ServerMessage,
} from "../src/lib/types";
import { cardToPokersolverStr } from "../src/lib/utils";
import { createDeck, dealCards, shuffleDeck } from "../src/lib/deckUtils";
import {
  MAX_PLAYERS,
  MAX_TOTAL_HANDS,
  MAX_CHAT_MESSAGES,
  MAX_CHAT_LENGTH,
  CHAT_THROTTLE_MS,
  PHASE_ORDER,
  GAME_PHASES,
} from "../src/lib/constants";
import { BotController } from "./bots";
import {
  ServerGameState,
  createInitialState,
  buildClientState,
  broadcastStateTo,
  assertRankingInvariant,
} from "./state";
import {
  computeTrueRanking,
  computeTrueRanks,
  countInversions,
} from "./scoring";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Hand: PokerHand } = require("pokersolver");

export { buildClientState } from "./state";
export type { ServerGameState } from "./state";

export default class DingServer implements Party.Server {
  private state: ServerGameState;
  private connections: Map<string, Party.Connection> = new Map();
  private lastChatAt: Map<string, number> = new Map();
  private kickedPids: Set<string> = new Set();
  private botController: BotController;

  constructor(readonly room: Party.Room) {
    this.state = createInitialState();
    this.botController = new BotController({
      getState: () => this.state,
      dispatch: (playerId, msg) => this.dispatchBotAction(playerId, msg),
      mask: (playerId) => buildClientState(this.state, playerId),
    });
  }

  private getPlayerByConn(connId: string): Player | undefined {
    return this.state.players.find((p) => p.connId === connId);
  }

  private removePlayerFromLobby(targetId: string): void {
    if (this.state.phase !== "lobby") return;
    const idx = this.state.players.findIndex((p) => p.id === targetId);
    if (idx === -1) return;
    const [removed] = this.state.players.splice(idx, 1);
    if (removed.isCreator && this.state.players.length > 0) {
      const nextHuman = this.state.players.find((p) => p.connected && !p.isBot);
      const next = nextHuman ?? this.state.players[0];
      next.isCreator = true;
    }
    this.lastChatAt.delete(targetId);
    if (removed.isBot) {
      this.botController.removeBot(removed.id);
    }
  }

  private broadcast(): void {
    assertRankingInvariant(this.state);
    broadcastStateTo(this.room, this.state, this.connections);
    this.botController.notifyStateChanged();
  }

  private dispatchBotAction(playerId: string, msg: ClientMessage): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return;
    this.handlePlayerAction(player, msg);
  }

  onConnect(conn: Party.Connection) {
    this.connections.set(conn.id, conn);
  }

  onClose(conn: Party.Connection) {
    this.connections.delete(conn.id);

    const player = this.getPlayerByConn(conn.id);
    if (player) {
      if (this.state.phase === "lobby") {
        player.connected = false;
        if (player.isCreator) {
          const nextConnected = this.state.players.find(
            (p) => p.connected && !p.isBot
          );
          if (nextConnected) {
            player.isCreator = false;
            nextConnected.isCreator = true;
          }
        }
      } else {
        player.connected = false;
        player.ready = false;
      }
      this.broadcast();
    }

    if (this.connections.size === 0) {
      this.botController.dispose();
      this.botController = new BotController({
        getState: () => this.state,
        dispatch: (playerId, msg) => this.dispatchBotAction(playerId, msg),
        mask: (playerId) => buildClientState(this.state, playerId),
      });
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message) as ClientMessage;
    } catch {
      return;
    }

    if (msg.type === "join") {
      this.handleJoin(msg, sender);
      return;
    }

    const player = this.getPlayerByConn(sender.id);
    if (!player) return;
    this.handlePlayerAction(player, msg, sender);
  }

  private handleJoin(
    msg: Extract<ClientMessage, { type: "join" }>,
    sender: Party.Connection
  ): void {
    if (this.kickedPids.has(msg.pid)) {
      const errMsg: ServerMessage = { type: "error", message: "Removed by host" };
      sender.send(JSON.stringify(errMsg));
      sender.close();
      return;
    }

    const existingPlayer = this.state.players.find((p) => p.id === msg.pid);
    if (existingPlayer) {
      existingPlayer.connId = sender.id;
      existingPlayer.connected = true;
      sender.send(JSON.stringify({ type: "welcome", playerId: existingPlayer.id } as ServerMessage));
      this.broadcast();
      return;
    }

    const existingByConn = this.getPlayerByConn(sender.id);
    if (existingByConn) {
      sender.send(JSON.stringify({ type: "welcome", playerId: existingByConn.id } as ServerMessage));
      this.broadcast();
      return;
    }

    if (this.state.phase !== "lobby") {
      const errMsg: ServerMessage = {
        type: "error",
        message: "Game already in progress",
      };
      sender.send(JSON.stringify(errMsg));
      sender.close();
      return;
    }

    if (this.state.players.length >= MAX_PLAYERS) {
      const errMsg: ServerMessage = {
        type: "error",
        message: `Room is full (max ${MAX_PLAYERS} players)`,
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
    this.broadcast();
  }

  private handlePlayerAction(
    player: Player,
    msg: ClientMessage,
    sender?: Party.Connection
  ): void {
    switch (msg.type) {
      case "join": {
        return;
      }

      case "configure": {
        if (!player.isCreator || this.state.phase !== "lobby") return;
        const playerCount = this.state.players.length;
        const maxHands = Math.floor(MAX_TOTAL_HANDS / playerCount);
        const n = Math.max(1, Math.min(maxHands, msg.handsPerPlayer));
        this.state.handsPerPlayer = n;
        this.broadcast();
        break;
      }

      case "addBot": {
        if (!player.isCreator || this.state.phase !== "lobby") return;
        if (this.state.players.length >= MAX_PLAYERS) return;
        const newCount = this.state.players.length + 1;
        if (Math.floor(MAX_TOTAL_HANDS / newCount) < this.state.handsPerPlayer) return;
        const botPlayer = this.botController.addBot();
        botPlayer.isBot = true;
        this.state.players.push(botPlayer);
        this.broadcast();
        break;
      }

      case "start": {
        if (!player.isCreator || this.state.phase !== "lobby") return;
        const connectedPlayers = this.state.players.filter((p) => p.connected);
        if (connectedPlayers.length < 2) return;

        this.state.players = connectedPlayers;

        const deck = shuffleDeck(createDeck());
        const playerIds = this.state.players.map((p) => p.id);
        const { playerHands, communityCards } = dealCards(
          deck,
          playerIds,
          this.state.handsPerPlayer
        );

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

        for (const p of this.state.players) {
          p.ready = false;
        }

        this.broadcast();
        break;
      }

      case "swap": {
        if (!GAME_PHASES.includes(this.state.phase)) return;

        const handA = this.state.hands.find((h) => h.id === msg.handIdA);
        const handB = this.state.hands.find((h) => h.id === msg.handIdB);
        if (!handA || !handB) return;
        if (handA.playerId !== player.id || handB.playerId !== player.id) return;

        const idxA = this.state.ranking.indexOf(msg.handIdA);
        const idxB = this.state.ranking.indexOf(msg.handIdB);
        if (idxA === -1 || idxB === -1) return;

        this.state.ranking[idxA] = msg.handIdB;
        this.state.ranking[idxB] = msg.handIdA;
        player.ready = false;

        this.broadcast();
        break;
      }

      case "proposeChipMove": {
        if (!GAME_PHASES.includes(this.state.phase)) return;

        const initiatorHand = this.state.hands.find((h) => h.id === msg.initiatorHandId);
        const recipientHand = this.state.hands.find((h) => h.id === msg.recipientHandId);
        if (!initiatorHand || !recipientHand) return;

        if (initiatorHand.playerId !== player.id) return;
        if (recipientHand.playerId === player.id) return;

        const idxInitiator = this.state.ranking.indexOf(msg.initiatorHandId);
        const idxRecipient = this.state.ranking.indexOf(msg.recipientHandId);

        let kind: AcquireRequestKind;
        if (idxInitiator === -1 && idxRecipient !== -1) {
          kind = "acquire";
        } else if (idxInitiator !== -1 && idxRecipient === -1) {
          kind = "offer";
        } else if (idxInitiator !== -1 && idxRecipient !== -1) {
          kind = "swap";
        } else {
          return;
        }

        const collidesOnRecipient = this.state.acquireRequests.some(
          (r) =>
            r.recipientHandId === msg.recipientHandId &&
            r.initiatorId !== player.id
        );
        if (collidesOnRecipient) return;

        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) =>
            !(
              r.initiatorId === player.id &&
              r.initiatorHandId === msg.initiatorHandId &&
              r.recipientHandId === msg.recipientHandId
            )
        );

        this.state.acquireRequests.push({
          kind,
          initiatorId: player.id,
          initiatorHandId: msg.initiatorHandId,
          recipientHandId: msg.recipientHandId,
        });

        this.broadcast();
        break;
      }

      case "acceptChipMove": {
        if (!GAME_PHASES.includes(this.state.phase)) return;

        const recipientHand = this.state.hands.find((h) => h.id === msg.recipientHandId);
        const initiatorHand = this.state.hands.find((h) => h.id === msg.initiatorHandId);
        if (!recipientHand || !initiatorHand) return;
        if (recipientHand.playerId !== player.id) return;

        const reqIdx = this.state.acquireRequests.findIndex(
          (r) =>
            r.initiatorHandId === msg.initiatorHandId &&
            r.recipientHandId === msg.recipientHandId
        );
        if (reqIdx === -1) return;

        const proposal = this.state.acquireRequests[reqIdx];
        const idxInitiator = this.state.ranking.indexOf(msg.initiatorHandId);
        const idxRecipient = this.state.ranking.indexOf(msg.recipientHandId);

        let currentKind: AcquireRequestKind | null;
        if (idxInitiator === -1 && idxRecipient !== -1) {
          currentKind = "acquire";
        } else if (idxInitiator !== -1 && idxRecipient === -1) {
          currentKind = "offer";
        } else if (idxInitiator !== -1 && idxRecipient !== -1) {
          currentKind = "swap";
        } else {
          currentKind = null;
        }

        if (currentKind === null || currentKind !== proposal.kind) {
          this.state.acquireRequests.splice(reqIdx, 1);
          this.broadcast();
          return;
        }

        if (currentKind === "acquire") {
          this.state.ranking[idxRecipient] = msg.initiatorHandId;
          if (idxInitiator !== -1) this.state.ranking[idxInitiator] = null;
        } else if (currentKind === "offer") {
          this.state.ranking[idxInitiator] = msg.recipientHandId;
        } else {
          this.state.ranking[idxInitiator] = msg.recipientHandId;
          this.state.ranking[idxRecipient] = msg.initiatorHandId;
        }

        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) =>
            r.initiatorHandId !== msg.initiatorHandId &&
            r.initiatorHandId !== msg.recipientHandId &&
            r.recipientHandId !== msg.initiatorHandId &&
            r.recipientHandId !== msg.recipientHandId
        );

        player.ready = false;
        const initiatorPlayer = this.state.players.find(
          (p) => p.id === proposal.initiatorId
        );
        if (initiatorPlayer) initiatorPlayer.ready = false;

        this.broadcast();
        break;
      }

      case "rejectChipMove": {
        const recipientHand = this.state.hands.find((h) => h.id === msg.recipientHandId);
        if (!recipientHand) return;
        if (recipientHand.playerId !== player.id) return;

        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) =>
            !(
              r.initiatorHandId === msg.initiatorHandId &&
              r.recipientHandId === msg.recipientHandId
            )
        );

        this.broadcast();
        break;
      }

      case "cancelChipMove": {
        const before = this.state.acquireRequests.length;
        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) =>
            !(
              r.initiatorId === player.id &&
              r.initiatorHandId === msg.initiatorHandId &&
              r.recipientHandId === msg.recipientHandId
            )
        );
        if (this.state.acquireRequests.length === before) return;

        this.broadcast();
        break;
      }

      case "transferOwnChip": {
        if (!GAME_PHASES.includes(this.state.phase)) return;

        const fromHand = this.state.hands.find((h) => h.id === msg.fromHandId);
        const toHand = this.state.hands.find((h) => h.id === msg.toHandId);
        if (!fromHand || !toHand) return;
        if (fromHand.playerId !== player.id || toHand.playerId !== player.id) return;
        if (msg.fromHandId === msg.toHandId) return;

        const idxFrom = this.state.ranking.indexOf(msg.fromHandId);
        const idxTo = this.state.ranking.indexOf(msg.toHandId);
        if (idxFrom === -1 || idxTo !== -1) return;

        this.state.ranking[idxFrom] = msg.toHandId;

        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) =>
            r.initiatorHandId !== msg.fromHandId &&
            r.initiatorHandId !== msg.toHandId &&
            r.recipientHandId !== msg.fromHandId &&
            r.recipientHandId !== msg.toHandId
        );

        player.ready = false;
        this.broadcast();
        break;
      }

      case "unclaim": {
        if (!GAME_PHASES.includes(this.state.phase)) return;

        const hand = this.state.hands.find((h) => h.id === msg.handId);
        if (!hand || hand.playerId !== player.id) return;

        const idx = this.state.ranking.indexOf(msg.handId);
        if (idx === -1) return;

        this.state.ranking[idx] = null;
        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) => r.initiatorHandId !== msg.handId && r.recipientHandId !== msg.handId
        );
        player.ready = false;

        this.broadcast();
        break;
      }

      case "move": {
        if (!GAME_PHASES.includes(this.state.phase)) return;

        const hand = this.state.hands.find((h) => h.id === msg.handId);
        if (!hand || hand.playerId !== player.id) return;

        const toIndex = Math.max(
          0,
          Math.min(msg.toIndex, this.state.ranking.length - 1)
        );

        const occupantId = this.state.ranking[toIndex];
        const currentIndex = this.state.ranking.indexOf(msg.handId);

        if (occupantId === null) {
          if (currentIndex !== -1) {
            this.state.ranking[currentIndex] = null;
          }
          this.state.ranking[toIndex] = msg.handId;
        } else if (occupantId === msg.handId) {
          return;
        } else {
          const occupantHand = this.state.hands.find((h) => h.id === occupantId);
          if (!occupantHand) return;
          if (occupantHand.playerId === player.id) {
            if (currentIndex !== -1) {
              this.state.ranking[currentIndex] = occupantId;
            }
            this.state.ranking[toIndex] = msg.handId;
          } else {
            return;
          }
        }

        this.state.acquireRequests = this.state.acquireRequests.filter(
          (r) =>
            r.initiatorHandId !== msg.handId &&
            r.recipientHandId !== msg.handId
        );

        player.ready = false;

        this.broadcast();
        break;
      }

      case "ready": {
        if (!GAME_PHASES.includes(this.state.phase)) return;

        if (msg.ready) {
          const unrankedHands = this.state.hands.filter(
            (h) => !this.state.ranking.includes(h.id)
          );
          const onlyOfflineUnranked = unrankedHands.every((h) => {
            const owner = this.state.players.find((p) => p.id === h.playerId);
            return owner ? !owner.connected : true;
          });
          if (!onlyOfflineUnranked) return;
        }

        player.ready = msg.ready;

        const allReady = this.state.players.every((p) => !p.connected || p.ready);
        if (allReady) {
          for (const hand of this.state.hands) {
            const idx = this.state.ranking.indexOf(hand.id);
            if (!this.state.rankHistory[hand.id]) {
              this.state.rankHistory[hand.id] = [];
            }
            this.state.rankHistory[hand.id].push(idx === -1 ? null : idx + 1);
          }

          const currentIndex = PHASE_ORDER.indexOf(this.state.phase as Phase);
          const nextPhase = PHASE_ORDER[currentIndex + 1];

          this.state.acquireRequests = [];

          if (nextPhase === "reveal") {
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
            this.state.ranking = Array(this.state.hands.length).fill(null);
          }

          this.state.phase = nextPhase;

          for (const p of this.state.players) {
            p.ready = false;
          }
        }

        this.broadcast();
        break;
      }

      case "flip": {
        if (this.state.phase !== "reveal") return;
        if (this.state.score !== null) return;

        const totalHands = this.state.hands.length;
        if (this.state.revealIndex >= totalHands) return;

        const currentRevealIdx =
          this.state.ranking.length - 1 - this.state.revealIndex;
        const handToFlipId = this.state.ranking[currentRevealIdx];
        if (!handToFlipId) return;

        const handToFlip = this.state.hands.find((h) => h.id === handToFlipId);
        if (!handToFlip) return;

        const owner = this.state.players.find((p) => p.id === handToFlip.playerId);
        if (owner?.connected) {
          if (handToFlip.playerId !== player.id) return;
        }

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

        this.broadcast();
        break;
      }

      case "ding": {
        const dingMsg: ServerMessage = { type: "ding", playerName: player.name };
        this.room.broadcast(JSON.stringify(dingMsg));
        break;
      }

      case "fuckoff": {
        const foMsg: ServerMessage = { type: "fuckoff", playerName: player.name };
        this.room.broadcast(JSON.stringify(foMsg));
        break;
      }

      case "chat": {
        const text = (msg.text ?? "").trim().slice(0, MAX_CHAT_LENGTH);
        if (!text) return;

        const now = Date.now();
        const last = this.lastChatAt.get(player.id) ?? 0;
        if (now - last < CHAT_THROTTLE_MS) return;
        this.lastChatAt.set(player.id, now);

        const chatMsg: ChatMessage = {
          id: crypto.randomUUID(),
          playerId: player.id,
          playerName: player.name,
          text,
          ts: now,
        };
        this.state.chatMessages.push(chatMsg);
        if (this.state.chatMessages.length > MAX_CHAT_MESSAGES) {
          this.state.chatMessages = this.state.chatMessages.slice(-MAX_CHAT_MESSAGES);
        }

        this.broadcast();
        break;
      }

      case "playAgain": {
        if (this.state.phase !== "reveal") return;
        if (!player.isCreator) return;

        const players = this.state.players.map((p) => ({
          ...p,
          ready: false,
        }));
        const chat = this.state.chatMessages;

        this.state = createInitialState();
        this.state.players = players;
        this.state.chatMessages = chat;

        this.broadcast();
        break;
      }

      case "endGame": {
        if (this.state.phase === "lobby") return;
        if (!player.isCreator) return;

        const players = this.state.players.map((p) => ({
          ...p,
          ready: false,
        }));
        const chat = this.state.chatMessages;

        this.state = createInitialState();
        this.state.players = players;
        this.state.chatMessages = chat;

        this.broadcast();
        break;
      }

      case "kick": {
        if (!player.isCreator || this.state.phase !== "lobby") return;
        if (msg.playerId === player.id) return;
        const target = this.state.players.find((p) => p.id === msg.playerId);
        if (!target) return;
        this.kickedPids.add(target.id);
        if (!target.isBot) {
          const targetConn = this.connections.get(target.connId);
          if (targetConn) {
            const errMsg: ServerMessage = { type: "error", message: "Removed by host" };
            targetConn.send(JSON.stringify(errMsg));
            targetConn.close();
          }
        }
        this.removePlayerFromLobby(target.id);
        this.broadcast();
        break;
      }

      case "leave": {
        if (this.state.phase !== "lobby") return;
        this.removePlayerFromLobby(player.id);
        this.broadcast();
        if (sender) sender.close();
        break;
      }
    }
  }
}
