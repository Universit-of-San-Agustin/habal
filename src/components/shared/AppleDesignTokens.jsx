/**
 * HABAL Apple-Style Design Tokens
 * Centralized design system constants for consistent theming
 */

export const COLORS = {
  // Primary Brand
  primary:      "#007AFF",
  primaryDark:  "#0051D5",
  primaryBg:    "#E5F1FF",
  primaryLight: "#EBF5FF",

  // Semantic
  success:      "#34C759",
  successDark:  "#248A3D",
  successBg:    "#E8F5E9",
  warning:      "#FF9500",
  warningDark:  "#C93400",
  warningBg:    "#FFF4E5",
  error:        "#FF3B30",
  errorDark:    "#C7291E",
  errorBg:      "#FFEBEE",
  info:         "#5AC8FA",
  infoDark:     "#0084C7",
  infoBg:       "#E3F5FF",

  // Grays (Apple scale)
  gray50:       "#FAFAFA",
  gray100:      "#F5F5F7",
  gray200:      "#E5E5EA",
  gray300:      "#D1D1D6",
  gray400:      "#C7C7CC",
  gray500:      "#AEAEB2",
  gray600:      "#8E8E93",
  gray700:      "#636366",
  gray800:      "#48484A",
  gray900:      "#1C1C1E",

  // Backgrounds
  bgPrimary:    "#FFFFFF",
  bgSecondary:  "#F5F5F7",
  bgTertiary:   "#FAFAFA",
};

export const SHADOWS = {
  sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
  md: "0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  lg: "0 10px 20px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.04)",
  xl: "0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06)",
};

export const RADIUS = {
  sm:   "8px",
  md:   "12px",
  lg:   "16px",
  xl:   "20px",
  "2xl": "24px",
  full: "9999px",
};

export const SPACING = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
};

// Legacy compatibility exports
export const PRIMARY = COLORS.primary;
export const PRIMARY_DARK = COLORS.primaryDark;
export const PRIMARY_BG = COLORS.primaryBg;
export const GREEN = COLORS.success;
export const AMBER = COLORS.warning;
export const RED = COLORS.error;

export default COLORS;