import type { EquipmentSection, HiyariFields, Severity } from '../types';

export function filterSectionsBySeverity(
  sections: EquipmentSection[],
  severity: Severity | 'all'
): EquipmentSection[] {
  if (severity === 'all') return sections;
  return sections
    .map((section) => ({ ...section, signs: section.signs.filter((sign) => sign.level === severity) }))
    .filter((section) => section.signs.length > 0);
}

export function calculateResizeDimensions(
  width: number,
  height: number,
  maxSide = 1600
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxSide <= 0) throw new Error('画像サイズが不正です');
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function validateDisplayName(value: string): string | null {
  if (!value.trim()) return '表示名を入力してください。';
  if (value.trim().length > 20) return '表示名は20文字以内で入力してください。';
  return null;
}

export function validateThreadInput(input: {
  title: string;
  body: string;
  category: string;
  hiyari?: HiyariFields;
}): string | null {
  if (!['hiyari', 'plan', 'gear', 'chat'].includes(input.category)) return 'カテゴリを選択してください。';
  if (!input.title.trim()) return 'タイトルを入力してください。';
  if (input.title.length > 60) return 'タイトルは60文字以内で入力してください。';
  if (input.category === 'hiyari') {
    if (!input.hiyari || !input.hiyari.what.trim() || !input.hiyari.why.trim() || !input.hiyari.next.trim()) {
      return 'ヒヤリハットの3項目をすべて入力してください。';
    }
    return null;
  }
  if (!input.body.trim()) return '本文を入力してください。';
  if (input.body.length > 4000) return '本文は4000文字以内で入力してください。';
  return null;
}

export function validateReply(value: string): string | null {
  if (!value.trim()) return '返信を入力してください。';
  if (value.length > 2000) return '返信は2000文字以内で入力してください。';
  return null;
}

export function validateSlug(value: string): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return 'slug は半角英数とハイフンで入力してください。';
  return null;
}

export function relativeDate(value: string | Date, now = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'たった今';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function reorder<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
