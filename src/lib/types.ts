export type Suit = "H" | "D" | "C" | "S";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K"
  | "A";

export type Card = { rank: Rank; suit: Suit };

export type Hand = {
  id: string; // e.g. "playerId-0", "playerId-1"
  playerId: string;
  cards: Card[]; // [] when sent to non-owners
  flipped: boolean; // revealed during reveal phase
};

export type Player = {
  id: string;      // persistent player ID (stable across reconnects)
  connId: string;  // current WebSocket connection ID (changes on reconnect)
  name: string;
  isCreator: boolean; // first to join — has start/configure controls
  ready: boolean;
  connected: boolean;
  isBot?: boolean;
};

export type Phase =
  | "lobby"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "reveal";

export type GameState = {
  phase: Phase;
  players: Player[];
  handsPerPlayer: number; // 1–6 (max 6 for 2p, max 4 for ≤4p, max 3 otherwise)
  communityCards: Card[]; // grows each phase
  ranking: (string | null)[]; // array of handIds, index 0 = best; null = unclaimed slot on board
  hands: Hand[]; // cards stripped for non-owners (except in reveal after flipped)
  revealIndex: number; // during reveal: index in TRUE ranking (worst→best) currently being flipped
  trueRanking: string[] | null; // null until reveal phase
  trueRanks: Record<string, number> | null; // handId -> true rank (ties share same number), null until reveal
  score: number | null; // inversion count, null until all flipped
  rankHistory: Record<string, (number | null)[]>; // handId -> [rank at end of preflop, flop, turn, river]
  acquireRequests: AcquireRequest[]; // pending chip move proposals (acquire/offer/swap)
  chatMessages: ChatMessage[]; // persistent room chat history
};

export type AcquireRequestKind = "acquire" | "offer" | "swap";

export type AcquireRequest = {
  kind: AcquireRequestKind;
  initiatorId: string;       // player who started the proposal
  initiatorHandId: string;   // the initiator's hand involved
  recipientHandId: string;   // the other player's hand involved (recipient accepts/rejects)
};

export type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  ts: number;
};

export type ClientMessage =
  | { type: "join"; name: string; pid: string }
  | { type: "configure"; handsPerPlayer: number } // lobby only, creator only
  | { type: "start" } // lobby only, creator only
  | { type: "move"; handId: string; toIndex: number } // preflop→river, own hands only
  | { type: "swap"; handIdA: string; handIdB: string } // swap own hands' positions (handsPerPlayer > 1)
  | { type: "transferOwnChip"; fromHandId: string; toHandId: string } // atomic chip transfer between two of your own hands
  | { type: "proposeChipMove"; initiatorHandId: string; recipientHandId: string } // server decides kind (acquire/offer/swap)
  | { type: "acceptChipMove"; initiatorHandId: string; recipientHandId: string }
  | { type: "rejectChipMove"; initiatorHandId: string; recipientHandId: string }
  | { type: "cancelChipMove"; initiatorHandId: string; recipientHandId: string } // initiator withdraws their own proposal
  | { type: "ready"; ready: boolean } // preflop→river
  | { type: "flip"; handId: string } // reveal phase, own hand only
  | { type: "unclaim"; handId: string } // return own chip back to the board
  | { type: "playAgain" } // reveal phase, creator only
  | { type: "endGame" } // any game phase, creator only — returns to lobby
  | { type: "ding" } // ring the bell
  | { type: "fuckoff" } // broadcast fuck-off reaction
  | { type: "chat"; text: string } // room chat message
  | { type: "kick"; playerId: string } // lobby only, creator only
  | { type: "leave" } // lobby only
  | { type: "addBot" }; // lobby only, creator only — server picks a name

export type ServerMessage =
  | { type: "state"; state: GameState }
  | { type: "welcome"; playerId: string }
  | { type: "ended"; reason: "player_disconnected"; playerName: string }
  | { type: "ding"; playerName: string }
  | { type: "fuckoff"; playerName: string }
  | { type: "error"; message: string };
