/**
 * Shared types for Ding reducers. Today these alias the legacy `Handler` /
 * `HandlerResult` shapes from `party/handlers/types.ts`; once the mode owns
 * its own `validateAction` / `applyAction` split, these will narrow.
 */

export type {
  Handler as Reducer,
  HandlerCtx as ReducerCtx,
  HandlerResult as ReducerResult,
} from "../../../../party/handlers/types";

export { inGamePhase } from "../../../../party/handlers/types";
