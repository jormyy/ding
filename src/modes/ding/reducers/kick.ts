/**
 * `kick` reducer — creator removes a player from the lobby (adds them to
 * kickedPids so rejoin is blocked).
 */
export { kick as reduceKick } from "../../../../party/handlers/lobby";
