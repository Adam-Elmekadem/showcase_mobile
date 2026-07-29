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
  serif: undefined as string | undefined, // Georgia isn't bundled on Android; falls back to serif family per-platform.
};
