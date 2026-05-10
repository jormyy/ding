import { colors } from "./tokens";

// Tailwind class string for rank chip background/border/text.
// Uses Tailwind's default amber/red/gray scales — kept literal here because
// JIT can't pick up classes from a string template.
export function chipClassNames(rank: number, total: number): string {
  if (rank === 1) return "bg-amber-500 border-amber-300 text-amber-950";
  if (rank === total) return "bg-red-950 border-red-800 text-red-300";
  return "bg-gray-700 border-gray-500 text-white";
}

// Hex colour values for rank chip (used where Tailwind classes can't apply,
// e.g. inline SVG fill or `style={{ background }}`). Sourced from tokens.
export function chipColors(
  rank: number,
  total: number
): { bg: string; border: string; color: string } {
  if (rank === 1) {
    return {
      bg: colors.rankTopBg,
      border: colors.rankTopBorder,
      color: colors.rankTopText,
    };
  }
  if (rank === total) {
    return {
      bg: colors.rankBottomBg,
      border: colors.rankBottomBorder,
      color: colors.rankBottomText,
    };
  }
  return {
    bg: colors.rankMidBg,
    border: colors.rankMidBorder,
    color: colors.rankMidText,
  };
}
