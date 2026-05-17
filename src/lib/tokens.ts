/**
 * Single source of truth for visual design tokens — colors, gradients, and
 * typography that the felt/gold chrome depends on.
 *
 * Consumed by:
 *   - tailwind.config.ts          (color palette in `theme.extend.colors`)
 *   - src/lib/theme.ts            (legacy `D` re-exported from here)
 *   - src/lib/chipColors.ts       (rank chip palette)
 *   - any ad-hoc inline-style use
 *
 * Mode-agnostic by design: this is the shared house style every gamemode
 * inherits. Mode-specific accents (e.g. card faces) belong in the mode folder.
 */

export const colors = {
  // Brand gold scale (used for rim, top-rail, accents, rank-1 chip)
  gold: "#c9a54a",
  goldBright: "#f5e6b8",
  goldTop: "#f0d278",

  // Felt & ink (room background, dark text on gold)
  ink: "#2a1a08",
  cardBg: "#0a1813",
  // Mid-tone felt under the felt.png texture overlay (play area background).
  feltLight: "#0a3820",

  // Body/secondary text on dark felt
  text: "#f5e6b8",
  sub: "#9fc5a8",
  muted: "#6a8a72",

  // Status accents
  accent: "#2fb873",
  danger: "#c06060",
  // Warning / secondary-emphasis (used by "opt-in penalty", "right neighbor",
  // sacrificed/contributed card borders, table-picks vote header).
  warning: "#f08a6c",

  // Rank chip palette — all ranks share the neutral "mid" styling. The
  // top/bottom variants were retired when chipColors.ts unified the palette.
  rankMidBg: "#4a5568",
  rankMidBorder: "#8a9ab0",
  rankMidText: "#ffffff",
} as const;

export const gradients = {
  panel:
    "linear-gradient(180deg, rgba(20,60,36,0.92) 0%, rgba(10,40,22,0.96) 100%)",
  /** Slightly more saturated panel — used on the deal-choice + desktop board headers. */
  panelBold:
    "linear-gradient(180deg, rgba(20,60,36,0.95) 0%, rgba(10,40,22,0.98) 100%)",
  /** Gold press-affordance fill for primary CTAs (Start, Ready, Play Again, browse-mode chips). */
  goldButton: `linear-gradient(180deg, ${colors.goldTop}, ${colors.gold})`,
} as const;

/**
 * Composed box-shadow strings used by raised gold buttons (Lobby Start, Ready
 * pill, page CTA, reveal play-again). The 3px rail underline + soft drop is
 * the signature press-affordance shape; centralized so a rail-color change
 * propagates everywhere.
 */
export const shadows = {
  goldButton: `0 3px 0 #78350f, 0 6px 16px rgba(0,0,0,0.35)`,
} as const;

export const overlays = {
  panelBorder: "rgba(201,165,74,0.28)",
} as const;

/**
 * Translucent fills used as ephemeral state backgrounds (selected, disabled,
 * win/loss flash). Names describe the *role*, not the hue — pick by what the
 * pixel means, not what color it happens to be.
 */
export const surfaces = {
  goldPanel: "rgba(201,165,74,0.08)",
  accentLight: "rgba(47,184,115,0.18)",
  dangerLight: "rgba(240,138,108,0.18)",
  disabledBg: "rgba(0,0,0,0.22)",
  subtleBorder: "rgba(255,255,255,0.08)",
  neutralFaint: "rgba(255,255,255,0.06)",
  dealChoicePanelBg: "rgba(10,40,22,0.9)",
  goldMid: "rgba(201,165,74,0.2)",
  dividerLine: "rgba(255,255,255,0.1)",
  panelDeep: "rgba(0,0,0,0.28)",
  disabledOverlay: "rgba(255,255,255,0.04)",
  faintFill: "rgba(255,255,255,0.05)",
  tagBg: "rgba(255,255,255,0.07)",
  dimmed: "rgba(255,255,255,0.2)",
  goldLight: "rgba(201,165,74,0.18)",
  goldEmphasis: "rgba(201,165,74,0.55)",
  whiteBorder: "rgba(255,255,255,0.15)",
  goldFaint: "rgba(201,165,74,0.15)",
  accentBorder: "rgba(47,184,115,0.35)",
  panelOverlay: "rgba(10,30,18,0.6)",
  // Translucent dark background for icon-button overlays sitting on the felt.
  darkIconBg: "rgba(0,0,0,0.35)",

  // Accent (green) variants used for selected/correct/winner state. Note
  // accentLight (0.18) and accentBorder (0.35) already cover the common range;
  // these fill in the gaps below/above.
  accentFaint: "rgba(47,184,115,0.10)",
  accentSoft: "rgba(47,184,115,0.14)",
  accentGlow: "rgba(47,184,115,0.5)",
  accentStrong: "rgba(47,184,115,0.6)",

  // Danger-urgent (red) palette for round/game timers approaching expiry.
  dangerUrgentBg: "rgba(192,96,96,0.25)",
  dangerUrgentBorder: "rgba(192,96,96,0.5)",
  dangerUrgentBgFaint: "rgba(192,96,96,0.15)",
  dangerUrgentBorderFaint: "rgba(192,96,96,0.35)",

  // Warning (matches colors.warning #f08a6c) — opt-in penalty surface.
  warningBg: "rgba(240,138,108,0.22)",
  warningBorder: "rgba(240,138,108,0.32)",
} as const;

/** Shadow / scrim rgba fragments — composable inside boxShadow/textShadow
 *  expressions, or used as standalone dark fills for modal backdrops. */
export const shades = {
  shadowSoft: "rgba(0,0,0,0.3)",
  shadowMedium: "rgba(0,0,0,0.5)",
} as const;

export const typography = {
  serif: "var(--font-playfair), Georgia, serif",
} as const;

/**
 * Tailwind-shaped color export — matches the legacy `colors` block in
 * tailwind.config.ts so the config can spread these directly into
 * `theme.extend.colors`.
 */
export const tailwindColors = {
  gold: {
    DEFAULT: colors.gold,
    bright: colors.goldBright,
    top: colors.goldTop,
  },
  ink: colors.ink,
  // Felt color scale comes from Tailwind's default green hues; we keep the
  // explicit numeric scale here so the config doesn't need to chase Tailwind
  // defaults.
  felt: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  danger: {
    DEFAULT: colors.danger,
  },
  sub: colors.sub,
  muted: colors.muted,
  accent: colors.accent,
} as const;
