/**
 * Semantic design tokens for Youth Dance Music Mobile.
 * Synced from artifacts/youth-dance-music/src/index.css to keep both
 * artifacts visually identical.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#1F2329",
    tint: "#1973E8",

    // Core surfaces
    background: "#F8F9FA",
    foreground: "#1F2329",

    // Cards / elevated surfaces
    card: "#FFFFFF",
    cardForeground: "#1F2329",
    cardBorder: "#EAECEF",

    // Primary action color (matches web --primary 217 91% 45%)
    primary: "#1973E8",
    primaryForeground: "#FFFFFF",

    // Secondary
    secondary: "#E1E5E9",
    secondaryForeground: "#1F2329",

    // Muted / subdued
    muted: "#E8EBEE",
    mutedForeground: "#697077",

    // Accent
    accent: "#E5E9ED",
    accentForeground: "#1F2329",

    // Destructive (matches web --destructive 0 72% 51%)
    destructive: "#DC3838",
    destructiveForeground: "#FFFFFF",
    destructiveSurface: "#FCE9E9",

    // Success (matches web --success 142 76% 36%)
    success: "#16A34A",
    successForeground: "#FFFFFF",
    successSurface: "#DCFCE7",

    // Warning (matches web --warning 38 92% 50%)
    warning: "#F59E0B",
    warningForeground: "#1A1A1A",
    warningSurface: "#FEF3C7",

    // Borders and inputs
    border: "#DDE0E4",
    input: "#CACFD4",
  },
  dark: {
    text: "#E5E9ED",
    tint: "#1973E8",

    background: "#171A1F",
    foreground: "#E5E9ED",

    card: "#1F2329",
    cardForeground: "#E5E9ED",
    cardBorder: "#262A30",

    primary: "#1973E8",
    primaryForeground: "#FFFFFF",

    secondary: "#363A40",
    secondaryForeground: "#E5E9ED",

    muted: "#2B2F35",
    mutedForeground: "#979CA1",

    accent: "#2E3239",
    accentForeground: "#E5E9ED",

    destructive: "#DC3838",
    destructiveForeground: "#FFFFFF",
    destructiveSurface: "#3A1E1E",

    success: "#16A34A",
    successForeground: "#FFFFFF",
    successSurface: "#143626",

    warning: "#F59E0B",
    warningForeground: "#1A1A1A",
    warningSurface: "#3B2E12",

    border: "#33373D",
    input: "#3A3F45",
  },

  // Border radius (in px). Matches web --radius: .5rem (8px).
  radius: 8,
};

export default colors;
