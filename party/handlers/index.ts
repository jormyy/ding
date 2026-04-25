import type { ClientMessage } from "../../src/lib/types";
import type { Handler } from "./types";
import { configure, addBot, start, kick, leave } from "./lobby";
import { move, swap, unclaim, transferOwnChip } from "./ranking";
import { proposeChipMove, acceptChipMove, rejectChipMove, cancelChipMove } from "./trading";
import { ready, flip, playAgain, endGame } from "./lifecycle";
import { ding, fuckoff, chat } from "./social";

const ignore: Handler = () => ({ kind: "ignore" });

export const handlerMap: Record<ClientMessage["type"], Handler> = {
  join: ignore,
  configure,
  addBot,
  start,
  kick,
  leave,
  move,
  swap,
  unclaim,
  transferOwnChip,
  proposeChipMove,
  acceptChipMove,
  rejectChipMove,
  cancelChipMove,
  ready,
  flip,
  playAgain,
  endGame,
  ding,
  fuckoff,
  chat,
};
