import { createTheme, type Theme } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

// Slate-based palette for both modes. No red used for chrome/surfaces.
export function buildTheme(mode: ThemeMode): Theme {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? "#60a5fa" : "#2563eb" },
      background: {
        default: isDark ? "#0b1120" : "#f8fafc",
        paper: isDark ? "#1e293b" : "#ffffff",
      },
      text: {
        primary: isDark ? "#e2e8f0" : "#0f172a",
        secondary: isDark ? "#94a3b8" : "#64748b",
      },
      divider: isDark ? "#334155" : "#e5e7eb",
    },
    shape: { borderRadius: 8 },
  });
}
