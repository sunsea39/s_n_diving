export const THEME_STORAGE_KEY = 'ns-theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): ResolvedTheme {
  return preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;
}

export function readThemePreference(storage?: Pick<Storage, 'getItem'>): ThemePreference {
  try {
    const value: string | null = (storage ?? window.localStorage).getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : 'light';
  } catch {
    return 'light';
  }
}

export function writeThemePreference(
  preference: ThemePreference,
  storage?: Pick<Storage, 'setItem'>
) {
  try {
    (storage ?? window.localStorage).setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Privacy modes can disallow storage; the in-memory preference still applies.
  }
}

export function getSystemIsDark(media = window.matchMedia('(prefers-color-scheme: dark)')) {
  return media.matches;
}

export function themeColor(theme: ResolvedTheme) {
  return theme === 'dark' ? '#0E1A22' : '#FFFFFF';
}
