/**
 * Hand IDs follow the format `${playerId}-${handIndex}`. Both server and
 * client parse the trailing index for routing (per-player hand row, neighbor
 * resolution at deal-choice). Keep callers in sync via this helper.
 */
export function handIndexFromId(handId: string): number {
  const raw = handId.slice(handId.lastIndexOf("-") + 1);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
