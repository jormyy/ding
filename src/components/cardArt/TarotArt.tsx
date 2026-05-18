import { TAROT_NAMES, arcanaIndex } from "@/lib/tarotMetadata";

interface TarotArtProps {
  variant: number;
}

export function TarotArt({ variant }: TarotArtProps) {
  const idx = arcanaIndex(variant);
  const padded = idx.toString().padStart(2, "0");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/cardArt/tarot/major-${padded}.jpg`}
      alt={TAROT_NAMES[idx]}
      className="card-art-img"
      draggable={false}
    />
  );
}
