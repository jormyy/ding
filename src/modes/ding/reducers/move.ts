/**
 * `move` reducer — place a hand at a target slot. Validates ownership and
 * slot occupancy; same-owner displacements are allowed and do the swap in
 * place. Different-owner targets reject the move (use proposeChipMove instead).
 */
export { move as reduceMove } from "../../../../party/handlers/ranking";
