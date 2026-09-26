import { useId } from 'react';
import { useTheme } from '../context/useTheme';
import type { ThemePreference } from '../lib/theme';
import { MoonIcon, SunIcon } from './icons';

const preferences: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
  { value: 'system', label: '端末に合わせる' }
];

export function ThemePicker({ className = '' }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const titleId = useId();
  return (
    <section className={`theme-picker ${className}`.trim()} aria-labelledby={titleId}>
      <p id={titleId}>表示テーマ</p>
      <div role="group" aria-label="表示テーマを選択">
        {preferences.map((item) => (
          <button
            type="button"
            key={item.value}
            className={preference === item.value ? 'selected' : ''}
            aria-pressed={preference === item.value}
            onClick={() => setPreference(item.value)}
          >
            {item.value === 'dark' ? <MoonIcon /> : <SunIcon />}
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ThemeToggleButton() {
  const { resolvedTheme, setPreference } = useTheme();
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const label = nextTheme === 'dark' ? 'ダークモードにする' : 'ライトモードにする';
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setPreference(nextTheme)}
      aria-label={label}
      title={label}
    >
      {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
