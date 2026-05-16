/**
 * Codegen: read modes/_manifest.yaml + modes/<id>.yaml, validate via zod,
 * resolve extends:standard sugar, emit catalog.generated.ts.
 *
 *   npm run modes:gen           # writes catalog.generated.ts
 *   npm run modes:check         # exits 1 if regenerating would change it
 *
 * After the codegen step finishes, this script invokes the contract audit
 * (`scripts/audit-handlers.ts --strict`) so a YAML id without a registered
 * runtime handler aborts the build.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { ManifestSchema, resolveMode } from "./schema";
import type { DingGameModeDefinition, GameModeDealRule } from "./types";

const HERE = dirname(fileURLToPath(import.meta.url));
const MODES_DIR = resolve(HERE, "modes");
const OUT_PATH = resolve(HERE, "catalog.generated.ts");

const TOP_KEY_ORDER: (keyof DingGameModeDefinition)[] = [
  "id",
  "name",
  "shortName",
  "summary",
  "detail",
  "family",
  "tags",
  "tier",
  "deal",
  "phaseEffects",
  "wildCards",
  "wildCardsByPhase",
  "excludedRanks",
  "excludedMetas",
  "forceRankByMeta",
  "identityResolution",
  "infoFeatures",
  "syntheticPair",
  "rankTransform",
  "suitTransform",
  "score",
];

const DEAL_KEY_ORDER: (keyof GameModeDealRule)[] = [
  "holeCards",
  "keepCards",
  "dealChoice",
  "publicCards",
  "publicCardSelection",
  "visibleHoleCards",
  "visibleHoleCardDetail",
  "visibleHoleCardIndexes",
  "communityCards",
  "boardLayout",
  "boards",
  "visibleCommunityCards",
  "visibleCommunityIndexes",
  "scoreCommunityCards",
  "visibleCommunityCardDetail",
  "visibleCommunityCardDetails",
  "possibleIdentities",
  "discardedCardsToCommunity",
  "counterfeitHoleCards",
  "deck",
  "constraint",
];

function reorderKeys<T extends Record<string, unknown>>(
  obj: T,
  order: readonly string[],
): T {
  const out: Record<string, unknown> = {};
  for (const k of order) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = obj[k];
    }
  }
  for (const k of Object.keys(obj)) {
    if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = obj[k];
  }
  return out as T;
}

function loadManifest(): readonly string[] {
  const raw = YAML.parse(readFileSync(resolve(MODES_DIR, "_manifest.yaml"), "utf8"));
  const parsed = ManifestSchema.parse(raw);
  return parsed.modes;
}

function loadModeFiles(): Set<string> {
  return new Set(
    readdirSync(MODES_DIR)
      .filter((f) => f.endsWith(".yaml") && f !== "_manifest.yaml")
      .map((f) => f.replace(/\.yaml$/, "")),
  );
}

function loadModes(orderedIds: readonly string[]): DingGameModeDefinition[] {
  const fileIds = loadModeFiles();
  const manifestSet = new Set(orderedIds);
  const missingFromManifest = [...fileIds].filter((id) => !manifestSet.has(id));
  const missingFromFiles = orderedIds.filter((id) => !fileIds.has(id));
  if (missingFromManifest.length > 0) {
    throw new Error(
      `Mode YAML files not listed in _manifest.yaml: ${missingFromManifest.sort().join(", ")}`,
    );
  }
  if (missingFromFiles.length > 0) {
    throw new Error(
      `_manifest.yaml lists ids with no YAML file: ${missingFromFiles.join(", ")}`,
    );
  }

  const seen = new Set<string>();
  const modes: DingGameModeDefinition[] = [];
  for (const id of orderedIds) {
    if (seen.has(id)) {
      throw new Error(`Duplicate mode id in _manifest.yaml: ${id}`);
    }
    seen.add(id);
    const path = resolve(MODES_DIR, `${id}.yaml`);
    const raw = YAML.parse(readFileSync(path, "utf8"));
    let resolved: DingGameModeDefinition;
    try {
      resolved = resolveMode(raw);
    } catch (err) {
      throw new Error(`Failed to validate ${id}.yaml: ${(err as Error).message}`);
    }
    if (resolved.id !== id) {
      throw new Error(
        `Mode id mismatch in ${id}.yaml: file declares id "${resolved.id}", expected "${id}"`,
      );
    }
    modes.push(resolved);
  }
  return modes;
}

function serializeMode(mode: DingGameModeDefinition): string {
  const reordered = reorderKeys(mode as unknown as Record<string, unknown>, TOP_KEY_ORDER);
  reordered.deal = reorderKeys(reordered.deal as Record<string, unknown>, DEAL_KEY_ORDER);
  return JSON.stringify(reordered, null, 2);
}

function buildOutput(modes: readonly DingGameModeDefinition[]): string {
  const header = [
    "// AUTO-GENERATED FROM modes/*.yaml — DO NOT EDIT. Run `npm run modes:gen`.",
    "",
    'import type { DingGameModeDefinition } from "./types";',
    "",
    "export const GAME_MODE_DEFINITIONS: readonly DingGameModeDefinition[] = [",
  ].join("\n");
  const body = modes
    .map((mode) => {
      const json = serializeMode(mode);
      // Indent every line by two spaces so the literal nests inside the array.
      return json
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
    })
    .join(",\n");
  return `${header}\n${body},\n];\n`;
}

function runStrictAudit(): void {
  // Run the contract audit as a subprocess so its registry-import side effects
  // don't bleed into this codegen run. Its `--strict` exit code propagates.
  const script = resolve(HERE, "..", "..", "..", "scripts", "audit-handlers.ts");
  try {
    execFileSync("npx", ["tsx", script, "--strict"], { stdio: "inherit" });
  } catch (err) {
    const e = err as { status?: number };
    const status = typeof e.status === "number" ? e.status : 1;
    process.exit(status);
  }
}

function main(): void {
  const checkOnly = process.argv.includes("--check");
  const ordered = loadManifest();
  const modes = loadModes(ordered);
  const output = buildOutput(modes);

  if (checkOnly) {
    let existing: string;
    try {
      existing = readFileSync(OUT_PATH, "utf8");
    } catch {
      console.error(
        `modes:check failed: ${OUT_PATH} does not exist. Run \`npm run modes:gen\`.`,
      );
      process.exit(1);
    }
    if (existing !== output) {
      console.error(
        `modes:check failed: ${OUT_PATH} is out of date. Run \`npm run modes:gen\`.`,
      );
      process.exit(1);
    }
    console.log(`modes:check ok (${modes.length} modes).`);
    runStrictAudit();
    return;
  }

  writeFileSync(OUT_PATH, output, "utf8");
  console.log(`Wrote ${OUT_PATH} (${modes.length} modes).`);
  runStrictAudit();
}

main();
