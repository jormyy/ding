import type { Suit } from "@/lib/types";
import { isRed } from "@/lib/deckUtils";

interface JokerArtProps {
  suit: Suit | undefined;
}

export function JokerArt({ suit }: JokerArtProps) {
  const red = suit ? isRed(suit) : false;
  const label = red ? "Red Joker" : "Black Joker";
  const file = red ? "joker-red.svg" : "joker-black.svg";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/cardArt/joker/${file}`}
      alt={label}
      className="card-art-img"
      draggable={false}
    />
  );
}
