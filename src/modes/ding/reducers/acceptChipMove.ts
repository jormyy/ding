/**
 * `acceptChipMove` reducer — recipient accepts a pending proposal. Re-checks
 * the kind against the current ranking before applying (it can drift if the
 * intervening placements changed).
 */
export { acceptChipMove as reduceAcceptChipMove } from "../../../../party/handlers/trading";
