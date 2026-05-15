/**
 * Audit + contract enforcement for the gamemode catalog.
 *
 * Three responsibilities:
 *
 *   1. Strict contract enforcement (run with `--strict`, used as a codegen
 *      gate): every PhaseEffectId / DealChoiceVariant / InfoFeatureId that
 *      any YAML references must resolve to a registered runtime handler.
 *      Exit non-zero with a clear, single-line-per-violation report.
 *
 *   2. Coverage reporting (default mode, for humans): print a table of
 *      effect | impl-status | mode-count | example-modes so you can spot
 *      stubs, dead code, and missing fallbacks at a glance.
 *
 *   3. Dead-code warnings: ids registered in the runtime registries but
 *      not referenced by any YAML. Warned in both modes, never fatal.
 *
 * Imports the runtime registries directly (via `party/effects` and
 * `src/lib/gameMode/dealChoices` side-effect imports), so the audit reflects
 * the actual handler set rather than a regex over source files.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

// Populate registries by importing them and their side-effect index files.
import "../party/effects";
import { registeredPhaseEffectIds } from "../party/effects/registry";
import {
  DISPATCHED_QUALIFIER_EFFECTS,
  DISPATCHED_HIERARCHY_EFFECTS,
} from "../party/handlers/phaseEffects";
import "../src/lib/gameMode/dealChoices";
import { registeredDealChoiceVariants } from "../src/lib/gameMode/dealChoices/registry";
import { resolveDealChoiceVariant } from "../src/lib/gameMode/dealChoiceVariant";
import { getGameModeDefinition } from "../src/lib/gameMode/registry";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const MODES_DIR = resolve(ROOT, "src", "lib", "gameMode", "modes");
const TYPES = readFileSync(resolve(ROOT, "src", "lib", "gameMode", "types.ts"), "utf8");
const INFO_HANDLER = readFileSync(
  resolve(ROOT, "party", "handlers", "infoFeatures.ts"),
  "utf8",
);

const STRICT = process.argv.includes("--strict");

function extractEnum(source: string, name: string): string[] {
  const re = new RegExp(`export type ${name} =([\\s\\S]*?);`, "m");
  const m = source.match(re);
  if (!m) throw new Error(`No enum ${name}`);
  return Array.from(m[1].matchAll(/"([^"]+)"/g)).map((m2) => m2[1]);
}

const phaseEffects = extractEnum(TYPES, "PhaseEffectId");
const infoFeatures = extractEnum(TYPES, "InfoFeatureId");

// Build mode usage maps from YAML.
const modeFiles = readdirSync(MODES_DIR)
  .filter((f) => f.endsWith(".yaml") && f !== "_manifest.yaml")
  .map((f) => f.replace(/\.yaml$/, ""));

interface ModeRef<T extends string> {
  modeId: string;
  id: T;
  /** phase key for phase-effects, or "<info-feature>" for info features. */
  context: string;
}

const phaseEffectUsage = new Map<string, string[]>();
const infoFeatureUsage = new Map<string, string[]>();
const phaseEffectRefs: ModeRef<string>[] = [];
const infoFeatureRefs: ModeRef<string>[] = [];

for (const id of modeFiles) {
  const yaml = YAML.parse(
    readFileSync(resolve(MODES_DIR, `${id}.yaml`), "utf8"),
  ) as {
    phaseEffects?: Record<string, string[]>;
    infoFeatures?: string[];
  };
  if (yaml.phaseEffects) {
    for (const [phase, list] of Object.entries(yaml.phaseEffects)) {
      for (const eff of list ?? []) {
        if (!phaseEffectUsage.has(eff)) phaseEffectUsage.set(eff, []);
        phaseEffectUsage.get(eff)!.push(id);
        phaseEffectRefs.push({ modeId: id, id: eff, context: phase });
      }
    }
  }
  for (const inf of yaml.infoFeatures ?? []) {
    if (!infoFeatureUsage.has(inf)) infoFeatureUsage.set(inf, []);
    infoFeatureUsage.get(inf)!.push(id);
    infoFeatureRefs.push({ modeId: id, id: inf, context: "infoFeatures" });
  }
}

// -------- Runtime registry snapshots ------------------------------------

const registeredEffectIds = new Set<string>(registeredPhaseEffectIds());
const qualifierIds = new Set<string>(DISPATCHED_QUALIFIER_EFFECTS as readonly string[]);
const hierarchyIds = new Set<string>(DISPATCHED_HIERARCHY_EFFECTS as readonly string[]);
const handledPhaseEffects = new Set<string>([
  ...registeredEffectIds,
  ...qualifierIds,
  ...hierarchyIds,
]);

const registeredDealChoiceIds = new Set<string>(registeredDealChoiceVariants());

// -------- Strict contract enforcement -----------------------------------

const errors: string[] = [];

// (1) Every YAML phase-effect id must have a runtime handler.
for (const ref of phaseEffectRefs) {
  if (!handledPhaseEffects.has(ref.id)) {
    errors.push(
      `Missing phase-effect handler: ${ref.modeId}.yaml [phaseEffects.${ref.context}] references "${ref.id}" but no handler is registered. Add party/effects/${ref.id}.ts + one import line in party/effects/index.ts.`,
    );
  }
}

// (2) Every active deal-choice variant per mode must resolve to a registered handler.
for (const id of modeFiles) {
  const mode = getGameModeDefinition(id);
  const variant = resolveDealChoiceVariant(mode);
  if (!registeredDealChoiceIds.has(variant)) {
    errors.push(
      `Missing dealChoice handler: ${id}.yaml resolves to variant "${variant}" but no apply handler is registered. Add src/lib/gameMode/dealChoices/${variant}.ts + one import line in src/lib/gameMode/dealChoices/index.ts.`,
    );
  }
}

// (3) Every YAML info-feature id must be a known InfoFeatureId. (Zod already
//     enforces this at the schema layer; we re-check here so contract drift
//     surfaces in this script's output too.)
const infoFeatureSet = new Set(infoFeatures);
for (const ref of infoFeatureRefs) {
  if (!infoFeatureSet.has(ref.id)) {
    errors.push(
      `Unknown info-feature id: ${ref.modeId}.yaml references "${ref.id}" but the id is not in InfoFeatureId. Add it to types.ts or fix the YAML.`,
    );
  }
}

// -------- Dead-code warnings --------------------------------------------

const warnings: string[] = [];

const unusedRegisteredEffects = [...registeredEffectIds].filter(
  (id) => !(phaseEffectUsage.get(id)?.length ?? 0),
);
if (unusedRegisteredEffects.length) {
  warnings.push(
    `Registered phase-effect handlers with no YAML user: ${unusedRegisteredEffects.sort().join(", ")}`,
  );
}

const unusedDealChoiceVariants = [...registeredDealChoiceIds].filter(
  (id) =>
    !modeFiles.some(
      (modeId) => resolveDealChoiceVariant(getGameModeDefinition(modeId)) === id,
    ),
);
if (unusedDealChoiceVariants.length) {
  warnings.push(
    `Registered dealChoice variants with no YAML user: ${unusedDealChoiceVariants.sort().join(", ")}`,
  );
}

// -------- Output --------------------------------------------------------

if (STRICT) {
  if (warnings.length) {
    for (const w of warnings) console.warn(`[audit] warn: ${w}`);
  }
  if (errors.length) {
    console.error(`[audit] ${errors.length} contract violation(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`[audit] ok (${phaseEffects.length} phase effects, ${infoFeatures.length} info features, ${registeredDealChoiceIds.size} dealChoice variants).`);
  process.exit(0);
}

// Non-strict default: print the human-readable tables.

function classifyInfoFeature(feat: string): "live" | "narrative" | "generic" {
  const escaped = feat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const liveRe = new RegExp(`["']${escaped}["']\\s*:\\s*\\(`);
  const narrRe = new RegExp(`["']${escaped}["']\\s*:\\s*\\{`);
  if (liveRe.test(INFO_HANDLER)) return "live";
  if (narrRe.test(INFO_HANDLER)) return "narrative";
  return "generic";
}

console.log("=== PHASE EFFECTS ===");
console.log("status | count | id (example modes)");
console.log("-".repeat(80));
const noopPhase: string[] = [];
const unusedPhase: string[] = [];
for (const eff of phaseEffects) {
  const users = phaseEffectUsage.get(eff) ?? [];
  const handled = handledPhaseEffects.has(eff);
  const status = handled ? "impl" : "MISS";
  const count = users.length;
  const examples = users.slice(0, 3).join(", ");
  console.log(
    `${status.padEnd(5)} | ${String(count).padStart(3)} | ${eff} (${examples})`,
  );
  if (count === 0) unusedPhase.push(eff);
  if (!handled && count > 0) noopPhase.push(eff);
}

console.log("\n=== INFO FEATURES ===");
const genericInfo: string[] = [];
const unusedInfo: string[] = [];
const liveInfo: string[] = [];
const narrativeInfo: string[] = [];
for (const feat of infoFeatures) {
  const users = infoFeatureUsage.get(feat) ?? [];
  const status = classifyInfoFeature(feat);
  const count = users.length;
  const examples = users.slice(0, 3).join(", ");
  console.log(
    `${status.padEnd(9)} | ${String(count).padStart(3)} | ${feat} (${examples})`,
  );
  if (count === 0) unusedInfo.push(feat);
  if (status === "live") liveInfo.push(feat);
  if (status === "narrative") narrativeInfo.push(feat);
  if (status === "generic" && count > 0) genericInfo.push(feat);
}

console.log("\n=== SUMMARY ===");
console.log(`Phase effects: ${phaseEffects.length} total`);
console.log(`  unhandled + used: ${noopPhase.length}`);
console.log(`  unused: ${unusedPhase.length}`);
if (unusedPhase.length) console.log(`    ${unusedPhase.join(", ")}`);
console.log(`Info features: ${infoFeatures.length} total`);
console.log(`  live (compute-from-state): ${liveInfo.length}`);
console.log(`  narrative (per-phase chip): ${narrativeInfo.length}`);
console.log(`  generic fallback (mode summary): ${genericInfo.length}`);
if (genericInfo.length) console.log(`    ${genericInfo.join(", ")}`);
console.log(`  unused: ${unusedInfo.length}`);
if (unusedInfo.length) console.log(`    ${unusedInfo.join(", ")}`);

if (warnings.length) {
  console.log("\n=== WARNINGS ===");
  for (const w of warnings) console.log(`  ${w}`);
}
