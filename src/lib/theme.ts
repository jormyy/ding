import { colors, gradients, overlays, typography } from "./tokens";

/**
 * Flat alias over tokens for terse component imports. Prefer this over
 * importing colors/gradients/overlays separately at component sites.
 */
export const D = {
  gold: colors.gold,
  goldBright: colors.goldBright,
  goldTop: colors.goldTop,
  ink: colors.ink,
  text: colors.text,
  sub: colors.sub,
  muted: colors.muted,
  accent: colors.accent,
  danger: colors.danger,
  warning: colors.warning,
  panel: gradients.panel,
  panelBold: gradients.panelBold,
  goldButton: gradients.goldButton,
  panelBorder: overlays.panelBorder,
  cardBg: colors.cardBg,
  feltLight: colors.feltLight,
  serif: typography.serif,
} as const;
