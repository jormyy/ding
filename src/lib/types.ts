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
  id: string;
  name: string;
  isCreator: boolean; // first to join — has start/configure controls
  ready: boolean;
  connected: boolean;
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
  handsPerPlayer: number; // 1–3
  communityCards: Card[]; // grows each phase
  ranking: string[]; // array of handIds, index 0 = best
  hands: Hand[]; // cards stripped for non-owners (except in reveal after flipped)
  revealIndex: number; // during reveal: index in TRUE ranking (worst→best) currently being flipped
  trueRanking: string[] | null; // null until reveal phase
  score: number | null; // inversion count, null until all flipped
};

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "configure"; handsPerPlayer: number } // lobby only, creator only
  | { type: "start" } // lobby only, creator only
  | { type: "move"; handId: string; toIndex: number } // preflop→river, own hands only
  | { type: "swap"; handIdA: string; handIdB: string } // swap two hands' positions
  | { type: "ready"; ready: boolean } // preflop→river
  | { type: "flip"; handId: string } // reveal phase, own hand only
  | { type: "playAgain" }; // reveal phase, creator only

export type ServerMessage =
  | { type: "state"; state: GameState }
  | { type: "ended"; reason: "player_disconnected"; playerName: string }
  | { type: "error"; message: string };
