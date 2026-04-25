// Tailwind class string for rank chip background/border/text
export function chipClassNames(rank: number, total: number): string {
  if (rank === 1) return "bg-amber-500 border-amber-300 text-amber-950";
  if (rank === total) return "bg-red-950 border-red-800 text-red-300";
  return "bg-gray-700 border-gray-500 text-white";
}

// Hex colour values for rank chip (used where Tailwind classes can't apply)
export function chipColors(
  rank: number,
  total: number
): { bg: string; border: string; color: string } {
  if (rank === 1) return { bg: "#c9a54a", border: "#f0d278", color: "#2a1a08" };
  if (rank === total) return { bg: "#4a1014", border: "#a84040", color: "#ffb0b4" };
  return { bg: "#4a5568", border: "#8a9ab0", color: "#fff" };
}
