# Post-fix code review

Reviewer: independent agent, no prior conversation context.
Reviewed: 6b3e4b905a3ff6b0dbc8089ab5af0db68ebe2192 (HEAD) + uncommitted working-tree diff (the fix lands unstaged on top of HEAD)
Plan items reviewed: 22

## Verdict per item

1. State slots — ✓. Declared on `GameState` (`src/lib/types.ts:237-261`: scoreRuleOverride, qualifierResult, handHierarchyId, absorbedHandIds, wildRankByEffect, lockedHandIds, suitsStripped, markedBoardWildIndex, phaseSubstep, metaTargetCard, metaKind). Engine-only `mutationVersion` + `pendingQualifier` on `ServerGameState` (`party/state.ts:61,66`). `buildClientState` plumbs all 11 client slots through (`party/state.ts:224-234`).
2. MaskBroadcaster cache key includes mutationVersion — ✓. `party/state.ts:279,299,305-306` cache entry is `{payload, version}`; version mismatch forces resend.
3. Qualifier registry has 12 entries matching `QualifierId` — ✓. `src/lib/gameMode/qualifiers.ts:80-198` 12 keys; `types.ts:78-90` 12 IDs.
4. Hierarchy registry has 11 entries matching `HierarchyId` — ✓. `src/lib/gameMode/hierarchies.ts:70-259` 11 keys; `types.ts:93-104` 11 IDs.
5. `computeShowdownForMode` accepts `ShowdownContext`; lifecycle passes ctx — ✓. `showdown.ts:69-80`; `lifecycle.ts:51-55` passes `{scoreRuleOverride, pendingQualifier, handHierarchyId}`.
6. Inverted-deck label uses original-rank label — ⚠. `showdown.ts:501-511` appends `(original: A,K,...)` as a SUFFIX, not a prefix as plan said. Functionally correct; cosmetic deviation.
7. Pandemonium fix — ✓. `lifecycle.ts:45-49` collapses possibleIdentities on hands/publicCards/allCommunityCards BEFORE `computeShowdownForMode` at L51.
8. Phase-effect dispatcher — ✓. `phaseEffects.ts:30-66` declares qualifier/hierarchy ID lists; L76-88 dispatches generically (sets `pendingQualifier` / `handHierarchyId`, bumps version, continues). Score-rule cases at L228,231,239,249 set `scoreRuleOverride`. Five tier-reinforcement cases (`blessedTierBump`, `cursedTierDemote`, `chosenJokerImprint`, `markedTwinWild`, `optedTierPenalty`) are no-ops at L314-323.
9. `hostageRankBecomesWild` sets `wildRankByEffect` AND tags board cards — ✓. `phaseEffects.ts:701-715` sets `state.wildRankByEffect` + tags `dealDeck` AND `allCommunityCards` with `meta: "joker"`.
10. `mutationVersion` bumps on every effect — ✓. Qualifier/hierarchy branches bump at L79/L85 then `continue`; all other effects fall through to the unconditional `state.mutationVersion++` at L332.
11. Constraint property tests — ✓. `scripts/verify-mechanics.ts:397-489` 13 constraints × 100 trials via seeded shuffle + `dealCardsForMode`. Live run: `Passing 328/328 ... Property tests: all constraints, qualifiers, hierarchies pass`.
12. New BoardLayout kinds — ⚠. `types.ts:232-238` adds compass/wheel/staircase/plus; `schema.ts:457-475` validates them; `TableFelt.tsx:146-220` renders all four. BUT no YAML uses any of them — bridge keeps `dual` and island-chain keeps `grid` (`bridge.yaml:14`, `island-chain.yaml:13-24`), contradicting the plan claim "bridge.yaml and island-chain.yaml gained boardLayout" (they gained existing kinds, not new ones).
13. meta-legend info-feature — ✓. `lobby.ts:73,95-130` installs `metaTargetCard`+`metaKind` at deal time, keyed off `mode.deal.deck` plus wild/forceRankByMeta fallback. `infoFeatures.ts:74-84` renders the legend chip. 23 YAMLs reference `meta-legend` (matches plan).
14. RevealRow effect chips — ✓. `RevealResults.tsx:23-100` `ShowdownEffectChips` renders VOIDED + qualifier-ok + scoreRuleOverride + handHierarchyId + suitsStripped + markedBoardWildIndex + wildRankByEffect + absorbedHandIds; mounted at L211 above the table.
15. CardFace honors `suitStripped` — ✓. `CardFace.tsx:48,57,87` adds the prop and renders "·" for the suit glyph when set.
16. Last-rites visibility — ✓. `phaseEffects.ts:691-699` appends absorbed cards to `allCommunityCards` and pushes the donor handId into `absorbedHandIds`. `visibility.ts:16-22` reveal-phase short-circuits to `Math.max(maxVisible, mode.deal.communityCards)` (note: this caps by `maxVisible`, which may still clip beyond `communityCards` — see Gaps).
17. DealChoice registry shape — ✓. `src/components/dealChoice/registry.ts` exports `resolveDealChoiceVariant` + `dealChoiceVariantIsImplemented`; 5 variants implemented, 9 stub-fall-back to `peekKeep` (matches the explicit deferral).
18. Mulligan auto-keep — ✓. `dealChoice.ts:59` sets `choice.submitted = true` after redeal.
19. Try-It debounce + optimistic update — ✓. `ModeBrowser.tsx:199-215` 300ms cooldown per mode + immediate `setFocusedId`.
20. Cleanup — ⚠. `debug-one-up.ts`, `find-duplicates.ts`, `regression-sample.ts`, `stage3-reports/`, `Stage-4-fixes.md` all deleted. BUT none were moved to `~/vault/projects/ding/audit-history/` — that directory does not exist. `Stage-3-results.md` still lives in `scripts/`.
21. HANDLERS.md regenerated — ✓. `src/lib/gameMode/HANDLERS.md` rewritten; mentions new engine state slots and registry dispatch.
22. verify-mechanics baseline — ✓. Live run: `Passing: 328/328, Failing: 0`.

## Gaps surfaced

- **Renderer wiring for phaseSubstep is missing** (the plan flags this as deferred, which is honest, but the engine `phaseEffects.ts:283-288` already writes `flop1/2/3` substeps; the visibility layer never reads `state.phaseSubstep`. The chips are invisible and `flopOneAtATime` produces a state-only effect.)
- **Plan/code drift around audit archives**: plan said move stage docs to `~/vault/projects/ding/audit-history/`; they were just deleted. Stage-3-results.md remains in `scripts/`.
- **New BoardLayout kinds are dead code** at the YAML layer — types/schema/TableFelt all support compass/wheel/staircase/plus, but no mode adopts them. Either wire them into the modes that motivated them, or trim until used.
- **Inverted-deck label cosmetic drift**: implementation suffixes `(original: A,K,...)` rather than prefixing the original rank as plan promised. Functionally fine.
- **Last-rites reveal visibility caps at `maxVisibleCommunityCards(mode)`**. After `absorbLastHandToBoard` appends 2 hole cards to a 5-card board, `allCommunityCards.length` is 7 but `visibility.ts:21` returns `Math.max(maxVisible, mode.deal.communityCards) = 5`. The reveal hides the absorbed cards even though the chip claims absorption. Either drop the `min(maxVisible)` clamp at reveal or recompute `maxVisible` from current `allCommunityCards.length`.
- **`finalizeWithCtx` tie reconstruction is lossy** (`showdown.ts:229-231`): when the hierarchy reorders, tie groups are recomputed by adjacency only — two hands that pre-hierarchy tied but end up non-adjacent post-hierarchy will silently split. Low-impact today but worth a TODO.
- **`coinflipScoreRule` uses `Math.random()`** at `phaseEffects.ts:248` — not seedable, so verify-mechanics property tests can't pin it. Consider threading the engine RNG.
- **Qualifier `requireAdjacentTie`** (`qualifiers.ts:121-132`) compares only `ranking[0]` and `ranking[1]` top-cards; the comment admits "approximation". Documented but worth a follow-up.

## Overall

The fix lands the architecturally heavy lifting cleanly: state slots, two registries (qualifier 12 / hierarchy 11), context-aware showdown, mutationVersion-keyed mask cache, phase-effect dispatcher with generic qualifier/hierarchy paths, reveal chips, suitStripped card rendering, mulligan auto-keep, debounced Try-It, regenerated HANDLERS.md, and a green 328/328 + property-test gate. Caveats are localized: the new BoardLayout kinds are unused, audit archives were deleted instead of moved, label/chip cosmetics drift slightly, phaseSubstep renderer wiring stays deferred (as advertised), and last-rites reveal still clamps community-card visibility below `allCommunityCards.length`. Ship-worthy as a checkpoint; the gaps above are fast follow-ups, not regressions.
