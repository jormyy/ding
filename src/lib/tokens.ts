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
  rail: "#78350f",
  cardBg: "#0a1813",

  // Body/secondary text on dark felt
  text: "#f5e6b8",
  sub: "#9fc5a8",
  muted: "#6a8a72",

  // Status accents
  accent: "#2fb873",
  danger: "#c06060",
  dangerLight: "#ffb0b4",

  // Card surfaces
  cardBack: "#1e293b",
  cardFace: "#fafafa",

  // Rank chip palette (top / middle / bottom)
  rankTopBg: "#c9a54a",
  rankTopBorder: "#f0d278",
  rankTopText: "#2a1a08",
  rankBottomBg: "#4a1014",
  rankBottomBorder: "#a84040",
  rankBottomText: "#ffb0b4",
  rankMidBg: "#4a5568",
  rankMidBorder: "#8a9ab0",
  rankMidText: "#ffffff",
} as const;

export const gradients = {
  panel:
    "linear-gradient(180deg, rgba(20,60,36,0.92) 0%, rgba(10,40,22,0.96) 100%)",
} as const;

export const overlays = {
  panelBorder: "rgba(201,165,74,0.28)",
} as const;

export const typography = {
  serif: "var(--font-playfair), Georgia, serif",
  sans: "var(--font-inter), system-ui, sans-serif",
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
  rail: colors.rail,
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
  card: {
    back: colors.cardBack,
    face: colors.cardFace,
  },
  danger: {
    DEFAULT: colors.danger,
    light: colors.dangerLight,
  },
  sub: colors.sub,
  muted: colors.muted,
  accent: colors.accent,
} as const;
