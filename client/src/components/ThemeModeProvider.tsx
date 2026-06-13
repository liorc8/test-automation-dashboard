import React, { useMemo, useState, useCallback } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { buildTheme, type ThemeMode } from "../theme";
import { ThemeModeContext, getStoredThemeMode, storeThemeMode } from "../hooks/useThemeMode";

const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(getStoredThemeMode);

  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      storeThemeMode(next);
      return next;
    });
  }, []);

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const ctx = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export default ThemeModeProvider;
