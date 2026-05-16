import type { ClientMessage, GameState } from "@/lib/types";

export interface DealChoiceBoardProps {
  gameState: GameState;
  myId: string;
  onSend: (msg: ClientMessage) => void;
}
