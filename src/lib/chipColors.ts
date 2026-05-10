import { colors } from "./tokens";

// Tailwind class string for rank chip background/border/text.
// All ranks share the same neutral styling — no special case for top/bottom.
export function chipClassNames(_rank: number, _total: number): string {
  return "bg-gray-700 border-gray-500 text-white";
}

// Hex colour values for rank chip (used where Tailwind classes can't apply,
// e.g. inline SVG fill or `style={{ background }}`). Sourced from tokens.
export function chipColors(
  _rank: number,
  _total: number
): { bg: string; border: string; color: string } {
  return {
    bg: colors.rankMidBg,
    border: colors.rankMidBorder,
    color: colors.rankMidText,
  };
}
