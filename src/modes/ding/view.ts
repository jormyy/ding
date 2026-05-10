/**
 * Ding's client-side mode view — registers the mode in the client registry
 * with its phase metadata. The actual UI components remain in
 * `src/components/{Lobby,GameBoard,Reveal}.tsx` until the carve-up to
 * `src/modes/ding/{board,table,seat,reveal-ui}/` lands.
 */

import { registerMode, type GameModeView } from "../registry";
import { dingPhases } from "./phases";
import { listGameModes } from "../../lib/gameModes";

function buildView(id: string): GameModeView {
  return {
    id,
    phases: dingPhases.map((p) => ({
      phase: p.id,
      label: p.label,
      step: p.stepLabel ?? p.label,
      short: p.short,
      history: p.history,
    })),
  };
}

for (const mode of listGameModes()) {
  registerMode(buildView(mode.id));
}

const view: GameModeView = {
  id: "ding",
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
