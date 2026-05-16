# Ding Mode Taxonomy

Each mode in the catalog is classified along three axes, all schema-enforced
in `src/lib/gameMode/schema.ts` and centrally defined in `tagVocabulary.ts`:

1. **`family`** — required, exactly one. The single most load-bearing mechanic
   group; the answer to "what kind of thing is this mode?".
2. **`tier`** — required, exactly one. Chaos level on a 5-step curve.
3. **`tags`** — 0–3 sub-tags from the canonical enum that refine the mode
   further. Sub-tags can cross families (a `tempo` mode can carry `weather`
   when environment is a secondary aspect).

Codegen rejects YAMLs that drift; new mechanics either map to an existing
slot or get a new sub-tag added here and propagated across the catalog.

## Axis 1: family (6 values)

| Family | What it captures |
|---|---|
| `info` | What players see or know about cards and game state. |
| `selection` | Pre-deal or mid-game card choice (peek, mulligan, trade, inherit, expose, auction, …). |
| `tempo` | When phases happen and when twists fire. |
| `environment` | Board, world, or deck-level effects. |
| `identity` | Player roles, seats, tokens, objectives. |
| `hand` | What hands look like and how they score. |

Families are mutually exclusive. When a mode spans two, pick the one a player
would name first when describing it; the other becomes a sub-tag.

### Priority order for ambiguous modes

The codemod uses this order — selection wins above all because the deal-choice
is the defining moment of a hand. Below it, the priority orders the most
structurally-defining mechanic first:

1. `selection` (any dealChoice mechanic)
2. `environment` (multi-board, deck-swap)
3. `identity` (mission)
4. `tempo` (phase-tempo)
5. `identity` (relational, positional, identity-token)
6. `environment` (weather, constrained-deal)
7. `tempo` (late-detonation)
8. `hand` (big-hands, wild, score-pivot)
9. `info` (info-public, info-private, info-overlay)

## Axis 2: tier (5 values)

| Tier | Definition |
|---|---|
| `standard` | 1 mechanic, low surprise — closest to baseline poker. |
| `twist` | 1 mechanic with a clear hook. |
| `wild` | 2 mechanics or 1 large-effect mechanic. |
| `chaos` | 3+ mechanics or compounding effects. |
| `insanity` | Multiple twists stack; designed to overwhelm. |

`select` is **not** a tier — selection-family modes redistribute to twist /
wild / chaos / insanity based on how many non-selection mechanics they carry.

## Axis 3: sub-tags (21 values, 0–3 per mode)

Grouped by their "home" family. A sub-tag may be applied to modes outside its
home family when the trait is a secondary aspect.

### info family
| Tag | Meaning |
|---|---|
| `info-public` | All players see the same extra card info (public reveal schedule). |
| `info-private` | Owner or a subset peek at info hidden from others. |
| `info-overlay` | Informational chip only — board state unchanged. |

### selection family
| Tag | Mechanic |
|---|---|
| `peek-keep` | Owner sees N candidates and keeps a subset. |
| `mulligan` | Owner can take a one-time full redraw. |
| `trade-up` | Owner passes one card to a neighbor before preflop. |
| `inheritance` | Owner keeps one card; another comes from a neighbor's discard. |
| `expose-choice` | Owner chooses which hole card is publicly visible. |

Exotic dealChoice variants (`auction`, `blindPool`, `peekBoard`,
`sacrificeForPeek`, `recruit`, `solomon`, `tablePicks`,
`optInHole3WithPenalty`) carry no sub-tag — their family is `selection`,
sub-tag list empty.

### tempo family
| Tag | Meaning |
|---|---|
| `phase-tempo` | Phase order or pacing diverges from the baseline schedule. |
| `late-detonation` | Twist fires at river or reveal after most decisions are locked. |

### environment family
| Tag | Meaning |
|---|---|
| `weather` | Atmospheric mid-game effect hitting all hands equally. |
| `multi-board` | Two or more separately scored boards. |
| `constrained-deal` | Hand composition constraint at deal (pocket pair, same suit, …). |
| `deck-swap` | Deck composition replaced (short, stripped, double, …). |

### identity family
| Tag | Meaning |
|---|---|
| `identity-token` | Cards carry hidden identity metadata (joker, tarot, cursed, …). |
| `positional` | Seat-relative effects: clockwise rotations, neighbor swaps. |
| `relational` | One hand's contents affect another's score, qualifier, or inheritance. |
| `mission` | Alternate qualifier or score rule — round only counts when a property holds. |

### hand family
| Tag | Meaning |
|---|---|
| `big-hands` | Non-baseline deal shape (Omaha-style, tiny-board, behemoth). |
| `wild` | Designated ranks/suits substitute at showdown. |
| `score-pivot` | Mid-hand scoring rule swap (red, black, lowball, invert). |

## Migration notes (2026-05-16)

The previous flat 23-tag vocabulary collapsed into this two-axis structure:

- `core` (singleton) — **dropped**. `ding` is now `family: hand`, no tags.
- `insanity` — **dropped** (redundant with `tier: insanity`).
- `select-stage` — **dropped** (now the `selection` family marker).
- `visibility` — **split** into `info-public` / `info-private`; the codemod
  defaulted everything to `info-public` since prior usages were broadcast
  reveals. Hand-correct any private-peek modes as you spot them.
- `info-overlay` — kept, now a sub-tag under `info` family.
- All other tags map 1:1 to themselves as sub-tags.

The `tier: select` value was retired. The 41 modes that lived there
redistributed to twist (26) / wild (9) / chaos (5) / insanity (1) based on
how many non-selection mechanics they carried.

## Authoring a new mode

1. Look at the mode's defining mechanic. Pick the family using the priority
   list above.
2. Pick the tier by counting effective mechanics (each non-base behavior =
   one mechanic; insanity is reserved for stacking twists or surreal
   single-effect modes).
3. Pick 0–3 sub-tags from the canonical 21. If the mode does something the
   enum can't describe, add a new sub-tag to `tagVocabulary.ts` and document
   it here.

The vocabulary is for the catalog as a whole — never for one mode.
