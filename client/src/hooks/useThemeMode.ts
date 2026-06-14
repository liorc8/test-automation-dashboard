import { createContext, useContext } from "react";
import type { ThemeMode } from "../theme";

export interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
}

export const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: "light",
  toggleMode: () => {},
});

/** Access the current theme mode and a toggle from anywhere in the app. */
export function useThemeMode(): ThemeModeContextValue {
  return useContext(ThemeModeContext);
}

export const THEME_STORAGE_KEY = "themeMode";

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function storeThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore storage errors */
  }
}
