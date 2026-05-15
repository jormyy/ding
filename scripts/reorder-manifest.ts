/**
 * Reorder src/lib/gameMode/modes/_manifest.yaml by canonical family.
 *
 * Family order matches the tier the lobby surfaces them in:
 *   1. core           (ding only)
 *   2. visibility     (one-up, open-book, late-light, ...)
 *   3. deck-swap      (short-deck, stripped, double-deck, ...)
 *   4. identity-token (cursed-card, blessed-card, tarot, ...)
 *   5. wild           (jokers-in, wild-suit, wild-rank, ...)
 *   6. constrained-deal (suited-hole, royal-deal, ...)
 *   7. select-stage   (mulligan / trade-up / inheritance / peek-keep / expose / exotic)
 *   8. big-hands      (single-spark, tiny-board, triad, behemoth, ...)
 *   9. phase-tempo    (slow-burn, blackout, flash-flop, ...)
 *  10. positional     (tornado, wormhole, ...)
 *  11. relational     (solomon-cut, last-rites, ...)
 *  12. mission        (mission-flush, second-place-cup, ...)
 *  13. score-pivot    (red-tide, coinflip, ...)
 *  14. weather        (storms, plagues, replacements)
 *  15. late-detonation (river/reveal twists not otherwise classified)
 *  16. multi-board    (multiverse, twin-boards, bridge)
 *  17. info-overlay   (whispers, hints, periscope)
 *  18. insanity       (catch-all)
 *
 * Within a family, modes are sorted by id.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODES_DIR = resolve(HERE, "..", "src", "lib", "gameMode", "modes");
const MANIFEST = resolve(MODES_DIR, "_manifest.yaml");

const FAMILY_ORDER = [
  "core",
  "visibility",
  "deck-swap",
  "identity-token",
  "wild",
  "constrained-deal",
  "select-stage",
  "big-hands",
  "phase-tempo",
  "positional",
  "relational",
  "mission",
  "score-pivot",
  "weather",
  "late-detonation",
  "multi-board",
  "info-overlay",
  "insanity",
] as const;

function familyOf(tags: string[]): string {
  // Pick the first family-tag in canonical order; sub-mechanic tags
  // (mulligan/trade-up/inheritance/peek-keep/expose-choice) collapse to
  // select-stage which is in FAMILY_ORDER.
  for (const fam of FAMILY_ORDER) {
    if (tags.includes(fam)) return fam;
  }
  return "insanity"; // fallback
}

function main() {
  const files = readdirSync(MODES_DIR)
    .filter((f) => f.endsWith(".yaml") && f !== "_manifest.yaml")
    .map((f) => f.replace(/\.yaml$/, ""))
    .sort();

  const rows: { id: string; family: string; tags: string[] }[] = [];
  for (const id of files) {
    const yaml = YAML.parse(
      readFileSync(resolve(MODES_DIR, `${id}.yaml`), "utf8"),
    ) as { tags?: string[] };
    const tags = yaml.tags ?? [];
    rows.push({ id, family: familyOf(tags), tags });
  }

  // Sort by family-index, then by id within family
  const familyIndex = new Map(FAMILY_ORDER.map((f, i) => [f, i]));
  rows.sort((a, b) => {
    const fi = (familyIndex.get(a.family) ?? 99) - (familyIndex.get(b.family) ?? 99);
    if (fi !== 0) return fi;
    // Within a family, put `ding` first if present, otherwise alphabetic
    if (a.id === "ding") return -1;
    if (b.id === "ding") return 1;
    return a.id.localeCompare(b.id);
  });

  // Build manifest with section headers per family
  const lines: string[] = [
    "# Ordered list of mode ids. catalog.generated.ts emits modes in this order.",
    "# Sorted by canonical family (see TAGS.md), then by id within family.",
    "modes:",
  ];
  let currentFamily = "";
  for (const row of rows) {
    if (row.family !== currentFamily) {
      lines.push(`  # ${row.family}`);
      currentFamily = row.family;
    }
    lines.push(`  - ${row.id}`);
  }
  const next = lines.join("\n") + "\n";

  const prev = readFileSync(MANIFEST, "utf8");
  if (next !== prev) {
    writeFileSync(MANIFEST, next, "utf8");
    console.log(`Rewrote _manifest.yaml (${rows.length} modes).`);
  } else {
    console.log("_manifest.yaml already in canonical order.");
  }
}

main();
