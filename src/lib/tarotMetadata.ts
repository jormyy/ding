/**
 * Rider-Waite Major Arcana names, indexed 0..21.
 * Used by the card-art layer (alt text, wordmark) and any future tarot tooltip.
 */
export const TAROT_NAMES = [
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World",
] as const;

export function arcanaIndex(variant: number | undefined): number {
  const v = variant ?? 0;
  return ((v % 22) + 22) % 22;
}
