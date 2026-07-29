export const colors = {
  primary: "#0C5BAA",
  primaryPressed: "#084B8C",
  primarySoft: "#EAF3FC",
  background: "#F6F8FB",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#DCE3EC",
  borderStrong: "#CBD5E1",
  success: "#15803D",
  successSoft: "#DCFCE7",
  danger: "#B42318",
  dangerSoft: "#FEECEC",
  warning: "#A15C00",
  warningSoft: "#FFF4D6",
  white: "#FFFFFF",
  overlay: "rgba(15, 23, 42, 0.48)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 8,
} as const;

export const typography = {
  screenTitle: { fontSize: 24, fontWeight: "800" as const, color: colors.text },
  sectionTitle: { fontSize: 17, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  caption: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
} as const;

export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 720,
} as const;
