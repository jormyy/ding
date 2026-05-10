/**
 * `flip` reducer — reveal the next hand during the reveal phase. Reveal
 * proceeds worst-rank → best-rank; when the last hand flips, score is
 * computed from the inversion count.
 */
export { flip as reduceFlip } from "../../../../party/handlers/lifecycle";
