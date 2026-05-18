import type { Suit } from "@/lib/types";

const SUIT_TINT: Record<Suit, string> = {
  H: "rgba(254, 226, 226, 0.65)",
  D: "rgba(219, 234, 254, 0.65)",
  C: "rgba(209, 250, 229, 0.55)",
  S: "rgba(228, 228, 231, 0.65)",
};

interface TwoSuitedSplitProps {
  suit: Suit | undefined;
  partnerSuit: Suit | null;
}

export function TwoSuitedSplit({ suit, partnerSuit }: TwoSuitedSplitProps) {
  if (!suit || !partnerSuit) return null;
  const a = SUIT_TINT[suit];
  const b = SUIT_TINT[partnerSuit];
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }}
      aria-hidden
    />
  );
}
