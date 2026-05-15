/**
 * Render CardFace via ReactDOMServer for every CardMeta and assert the
 * expected visual treatments land in the output HTML.
 *
 * Covers Stage 3 axis (c): special-card UI renders. Doesn't need a live
 * deal — just confirms CardFace produces the expected markup contract.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CardFace } from "../src/components/CardFace";
import type { CardMeta, DisplayedCard } from "../src/lib/types";

// react import is used implicitly by JSX
void React;

const METAS: NonNullable<CardMeta>[] = [
  "joker",
  "tarot",
  "blessed",
  "cursed",
  "marked",
  "counterfeit",
  "glitched",
  "twoSuited",
  "trickster",
];

interface Check {
  label: string;
  pass: boolean;
  reason?: string;
}

const EXPECTED: Record<
  NonNullable<CardMeta>,
  { glyph?: string; cssMarker: string; rankSymbol?: { rank: string; symbol?: string } }
> = {
  joker:        { cssMarker: 'data-meta="joker"',       rankSymbol: { rank: "W", symbol: "J" } },
  tarot:        { cssMarker: 'data-meta="tarot"',       rankSymbol: { rank: "W", symbol: "T" } },
  blessed:      { glyph: "✦",  cssMarker: "card-meta-blessed" },
  cursed:       { glyph: "⊕",  cssMarker: "card-meta-cursed" },
  marked:       { glyph: "•",  cssMarker: "ring-slate-700" },
  counterfeit:  { glyph: "≈",  cssMarker: "ring-rose-400" },
  glitched:     { glyph: "▦",  cssMarker: "card-meta-glitched" },
  twoSuited:    { glyph: "⇆",  cssMarker: 'data-meta="twoSuited"' },
  trickster:    { glyph: "♕",  cssMarker: "ring-fuchsia-500" },
};

function checkMeta(meta: NonNullable<CardMeta>): Check[] {
  const card: DisplayedCard = { rank: "A", suit: "H", meta } as DisplayedCard;
  const html = renderToStaticMarkup(<CardFace card={card} />);
  const exp = EXPECTED[meta];
  const checks: Check[] = [];
  if (exp.glyph) {
    checks.push({
      label: `${meta}: corner glyph ${JSON.stringify(exp.glyph)}`,
      pass: html.includes(exp.glyph),
      reason: html.includes(exp.glyph) ? undefined : `glyph missing from HTML`,
    });
  }
  if (exp.cssMarker) {
    checks.push({
      label: `${meta}: css marker ${JSON.stringify(exp.cssMarker)}`,
      pass: html.includes(exp.cssMarker),
      reason: html.includes(exp.cssMarker) ? undefined : `marker missing from HTML`,
    });
  }
  if (exp.rankSymbol) {
    checks.push({
      label: `${meta}: rank=${exp.rankSymbol.rank} symbol=${exp.rankSymbol.symbol}`,
      pass: html.includes(`>${exp.rankSymbol.rank}<`) && (!exp.rankSymbol.symbol || html.includes(`>${exp.rankSymbol.symbol}<`)),
    });
  }
  if (meta === "twoSuited") {
    // partner suit symbol should also be present
    const partnerSymbols = ["♥", "♦", "♣", "♠"];
    const partnerPresent = partnerSymbols.filter((s) => html.includes(s)).length;
    checks.push({
      label: `${meta}: shows both suit halves`,
      pass: partnerPresent >= 2,
      reason: partnerPresent < 2 ? `only ${partnerPresent} suit symbol(s) in HTML` : undefined,
    });
  }
  return checks;
}

function main() {
  let total = 0;
  let fails = 0;
  for (const meta of METAS) {
    const checks = checkMeta(meta);
    for (const c of checks) {
      total++;
      if (!c.pass) {
        fails++;
        console.log(`✗ ${c.label}${c.reason ? " — " + c.reason : ""}`);
      } else {
        console.log(`✓ ${c.label}`);
      }
    }
  }
  console.log(`\n${total - fails}/${total} checks passed.`);
  if (fails > 0) process.exit(1);
}

main();
