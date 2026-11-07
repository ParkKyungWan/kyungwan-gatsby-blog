import { ThemeProvider } from '@emotion/react';
import { darkTheme, lightTheme } from '../styles/const';
import React, { createContext, useEffect, useState } from 'react';

export const ThemeManagerContext = createContext({ isDark: false, toggleDark: () => {} });

export const ThemeManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dark');
      setIsDark(saved === null ? window.matchMedia('(prefers-color-scheme: dark)').matches : saved === 'true');
    } catch {
      /* Storage may be disabled. */
    }
  }, []);
  const toggleDark = () =>
    setIsDark((previous) => {
      const next = !previous;
      try {
        localStorage.setItem('dark', JSON.stringify(next));
      } catch {
        /* Keep in-memory preference. */
      }
      return next;
    });
  return (
    <ThemeManagerContext.Provider value={{ isDark, toggleDark }}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>{children}</ThemeProvider>
    </ThemeManagerContext.Provider>
  );
};
