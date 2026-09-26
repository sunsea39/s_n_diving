import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getSystemIsDark,
  readThemePreference,
  resolveTheme,
  themeColor,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference
} from '../lib/theme';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(preference: ThemePreference, systemIsDark = getSystemIsDark()): ResolvedTheme {
  const resolvedTheme = resolveTheme(preference, systemIsDark);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', themeColor(resolvedTheme));
  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => readThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(readThemePreference(), getSystemIsDark())
  );

  useEffect(() => {
    writeThemePreference(preference);
    setResolvedTheme(applyTheme(preference));
  }, [preference]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(applyTheme(preference, media.matches));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      document.documentElement.classList.add('theme-ready')
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
