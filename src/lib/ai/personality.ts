export type Personality = {
  aggression: number;   // 0..1 — how readily it proposes chip moves
  stubbornness: number; // 0..1 — how often it rejects proposals that don't help it
  chaos: number;        // 0..1 — chance of an idle ding each tick
  greed: number;        // 0..1 — how often it proposes swaps when its estimate flips
  thinkMs: [number, number]; // min/max delay per tick — governs visible pacing
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomPersonality(): Personality {
  return {
    aggression: rand(0.3, 0.9),
    stubbornness: rand(0.0, 0.35),
    chaos: rand(0.0, 0.15),
    greed: rand(0.2, 0.8),
    thinkMs: [200 + Math.floor(Math.random() * 200), 600 + Math.floor(Math.random() * 400)],
  };
}

const NAMES = [
  "Bot-Alice", "Bot-Bob", "Bot-Carmen", "Bot-Diego", "Bot-Eve",
  "Bot-Finn", "Bot-Gus", "Bot-Hana", "Bot-Ivy", "Bot-Jax",
  "Bot-Kira", "Bot-Luna", "Bot-Milo", "Bot-Nina", "Bot-Otto",
  "Bot-Pia", "Bot-Quinn", "Bot-Remy", "Bot-Sai", "Bot-Tess",
];

export function pickBotName(taken: Set<string>): string {
  for (const n of NAMES) {
    if (!taken.has(n)) return n;
  }
  // Fallback if all taken
  return "Bot-" + Math.floor(Math.random() * 10000);
}
