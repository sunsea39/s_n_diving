import { describe, expect, it } from 'vitest';
import {
  THEME_STORAGE_KEY,
  readThemePreference,
  resolveTheme,
  writeThemePreference
} from './theme';

describe('theme preference', () => {
  it('uses light as the default and reads a valid localStorage preference', () => {
    expect(readThemePreference({ getItem: () => null })).toBe('light');
    expect(readThemePreference({ getItem: () => 'dark' })).toBe('dark');
    expect(readThemePreference({ getItem: () => 'unexpected' })).toBe('light');
  });

  it('resolves the system preference from the operating-system mode', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('writes the stable preference key and tolerates unavailable storage', () => {
    const writes: [string, string][] = [];
    writeThemePreference('system', { setItem: (key, value) => writes.push([key, value]) });
    expect(writes).toEqual([[THEME_STORAGE_KEY, 'system']]);
    expect(() =>
      writeThemePreference('dark', {
        setItem: () => {
          throw new Error('blocked');
        }
      })
    ).not.toThrow();
  });
});
