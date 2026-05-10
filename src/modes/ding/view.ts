/**
 * Ding's client-side mode view — registers the mode in the client registry
 * with its phase metadata. The actual UI components remain in
 * `src/components/{Lobby,GameBoard,Reveal}.tsx` until the carve-up to
 * `src/modes/ding/{board,table,seat,reveal-ui}/` lands.
 */

import { registerMode, type GameModeView } from "../registry";
import { dingPhases } from "./phases";
import { DING_MODE_ID } from "./index";

const view: GameModeView = {
  id: DING_MODE_ID,
  phases: dingPhases.map((p) => ({
    phase: p.id,
    label: p.label,
    step: p.stepLabel ?? p.label,
    short: p.short,
    history: p.history,
  })),
};

registerMode(view);

export const dingView = view;
