// Matches the web app's design tokens (see app/globals.css @theme block).
export const colors = {
  ink: "#101017",
  inkSoft: "#191922",
  paper: "#ededf3",
  paperMuted: "#c9c9d6",
  green: "#21998b",
  greenDeep: "#106e63",
  orange: "#e04667",
  surface: "#161723",
  surface2: "#1e1e2d",
  muted: "#88889d",
  line: "rgba(237,237,243,0.13)",
  gold: "#d8b75f",
  border: "#2f2f3e",
  borderStrong: "#3d3d53",
};

export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
  full: 999,
};

export const font = {
  // Noto Kufi Arabic — matches the web app's bilingual body font exactly
  // (see app/globals.css's Google Fonts import). Set as the app-wide <Text>
  // default in app/_layout.tsx.
  body: "NotoKufiArabic_600SemiBold",
  bodyRegular: "NotoKufiArabic_400Regular",
  bodyMedium: "NotoKufiArabic_500Medium",
  bodyBold: "NotoKufiArabic_700Bold",
  // Bebas Neue — Latin-only display face reserved for the wordmark, page
  // headings, section labels, and stat/rating numbers. Never used for Arabic
  // text (no Arabic glyphs) or for long-form body copy (all-caps condensed
  // faces only read well as short punchy labels).
  display: "BebasNeue_400Regular",
};
