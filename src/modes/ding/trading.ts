/**
 * Ding's chip-move semantics. Re-exports the legacy chipMove helpers under a
 * stable mode-local path so the engine can reach trading logic via the mode
 * folder. The implementation will move here in a later step; for now this
 * just centralizes the import surface.
 */

export {
  classifyChipMoveKind,
  applyChipMoveToRanking,
  clearRequestsForHands,
} from "../../lib/chipMove";
