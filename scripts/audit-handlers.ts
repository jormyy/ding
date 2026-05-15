/**
 * Audit phase-effect + info-feature handler coverage.
 *
 * For each PhaseEffectId in types.ts:
 *   - is it referenced by any YAML?
 *   - is it implemented in party/handlers/phaseEffects.ts (mutates state)
 *     or stubbed (narrative-only / no-op)?
 *
 * Same for InfoFeatureId in party/handlers/infoFeatures.ts.
 *
 * Output: a table of effect | impl-status | mode-count | example-modes.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const MODES_DIR = resolve(ROOT, "src", "lib", "gameMode", "modes");
const TYPES = readFileSync(resolve(ROOT, "src", "lib", "gameMode", "types.ts"), "utf8");
const PHASE_HANDLER = readFileSync(
  resolve(ROOT, "party", "handlers", "phaseEffects.ts"),
  "utf8",
);
const INFO_HANDLER = readFileSync(
  resolve(ROOT, "party", "handlers", "infoFeatures.ts"),
  "utf8",
);

// Extract PhaseEffectId enum members
function extractEnum(source: string, name: string): string[] {
  const re = new RegExp(`export type ${name} =([\\s\\S]*?);`, "m");
  const m = source.match(re);
  if (!m) throw new Error(`No enum ${name}`);
  return Array.from(m[1].matchAll(/"([^"]+)"/g)).map((m2) => m2[1]);
}

const phaseEffects = extractEnum(TYPES, "PhaseEffectId");
const infoFeatures = extractEnum(TYPES, "InfoFeatureId");

// Build mode usage maps
const modeFiles = readdirSync(MODES_DIR)
  .filter((f) => f.endsWith(".yaml") && f !== "_manifest.yaml")
  .map((f) => f.replace(/\.yaml$/, ""));

const phaseEffectUsage = new Map<string, string[]>();
const infoFeatureUsage = new Map<string, string[]>();
for (const id of modeFiles) {
  const yaml = YAML.parse(
    readFileSync(resolve(MODES_DIR, `${id}.yaml`), "utf8"),
  ) as {
    phaseEffects?: Record<string, string[]>;
    infoFeatures?: string[];
  };
  if (yaml.phaseEffects) {
    for (const list of Object.values(yaml.phaseEffects)) {
      for (const eff of list ?? []) {
        if (!phaseEffectUsage.has(eff)) phaseEffectUsage.set(eff, []);
        phaseEffectUsage.get(eff)!.push(id);
      }
    }
  }
  for (const inf of yaml.infoFeatures ?? []) {
    if (!infoFeatureUsage.has(inf)) infoFeatureUsage.set(inf, []);
    infoFeatureUsage.get(inf)!.push(id);
  }
}

// Read the QUALIFIER_EFFECTS / HIERARCHY_EFFECTS lists from the handler — these
// effects are dispatched generically before the switch and are therefore
// implemented even though they lack a body inside the case block.
function extractList(name: string): Set<string> {
  const re = new RegExp(`const ${name}: readonly [A-Za-z]+\\[\\] = \\[([\\s\\S]*?)\\];`, "m");
  const m = PHASE_HANDLER.match(re);
  if (!m) return new Set();
  return new Set(Array.from(m[1].matchAll(/"([^"]+)"/g)).map((m2) => m2[1]));
}
const QUALIFIER_EFFECTS = extractList("QUALIFIER_EFFECTS");
const HIERARCHY_EFFECTS = extractList("HIERARCHY_EFFECTS");

// Detect handler status. For phaseEffects: case "X": followed by ONLY a
// comment + break is no-op; any other body is impl. Effects that appear in
// the generic-dispatch lists (qualifier / hierarchy) are also impl.
function classifyPhaseEffect(eff: string): "impl" | "noop" {
  if (QUALIFIER_EFFECTS.has(eff) || HIERARCHY_EFFECTS.has(eff)) return "impl";
  const re = new RegExp(`case "${eff}":([\\s\\S]*?)(?=case "|^\\s*\\})`, "m");
  const m = PHASE_HANDLER.match(re);
  if (!m) return "noop";
  const body = m[1].trim();
  // No-op = only a comment + break, no statement-level call
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("//"));
  // Filter out 'break;' alone
  const significant = lines.filter((l) => l !== "break;" && !l.startsWith("case "));
  return significant.length === 0 ? "noop" : "impl";
}

function classifyInfoFeature(feat: string): "live" | "narrative" | "generic" {
  // featureHandlers: lines like `"foo": (state, phase) => ...`
  // narrativeSpecs:  lines like `"foo": { label: ...`
  // First grep for "foo":; if followed by ( it's live; if { it's narrative;
  // if not present anywhere, generic fallback.
  const escaped = feat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const liveRe = new RegExp(`["']${escaped}["']\\s*:\\s*\\(`);
  const narrRe = new RegExp(`["']${escaped}["']\\s*:\\s*\\{`);
  if (liveRe.test(INFO_HANDLER)) return "live";
  if (narrRe.test(INFO_HANDLER)) return "narrative";
  return "generic";
}

// Print phase-effect table
console.log("=== PHASE EFFECTS ===");
console.log("status | count | id (example modes)");
console.log("-".repeat(80));
const noopPhase: string[] = [];
const unusedPhase: string[] = [];
for (const eff of phaseEffects) {
  const users = phaseEffectUsage.get(eff) ?? [];
  const status = classifyPhaseEffect(eff);
  const count = users.length;
  const examples = users.slice(0, 3).join(", ");
  console.log(
    `${status.padEnd(5)} | ${String(count).padStart(3)} | ${eff} (${examples})`,
  );
  if (count === 0) unusedPhase.push(eff);
  if (status === "noop" && count > 0) noopPhase.push(eff);
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
console.log(`  no-op + used: ${noopPhase.length}`);
console.log(`  unused: ${unusedPhase.length}`);
if (unusedPhase.length) console.log(`    ${unusedPhase.join(", ")}`);
console.log(`Info features: ${infoFeatures.length} total`);
console.log(`  live (compute-from-state): ${liveInfo.length}`);
console.log(`  narrative (per-phase chip): ${narrativeInfo.length}`);
console.log(`  generic fallback (mode summary): ${genericInfo.length}`);
if (genericInfo.length) console.log(`    ${genericInfo.join(", ")}`);
console.log(`  unused: ${unusedInfo.length}`);
if (unusedInfo.length) console.log(`    ${unusedInfo.join(", ")}`);
