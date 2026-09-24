import type { EquipmentSection, HiyariFields, NewsItem, Severity } from '../types';

export type JoinBoardStatus = 'ok' | 'wrong' | 'locked' | 'not_set';

export function filterSectionsBySeverity(
  sections: EquipmentSection[],
  severity: Severity | 'all'
): EquipmentSection[] {
  if (severity === 'all') return sections;
  return sections
    .map((section) => ({
      ...section,
      signs: section.signs.filter((sign) => sign.level === severity)
    }))
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

export function validatePasscode(value: string): string | null {
  if (value.length < 8) return '合言葉は8文字以上で入力してください。';
  return null;
}

export function validateThreadInput(input: {
  title: string;
  body: string;
  category: string;
  hiyari?: HiyariFields;
}): string | null {
  if (!['hiyari', 'plan', 'gear', 'chat'].includes(input.category))
    return 'カテゴリを選択してください。';
  if (!input.title.trim()) return 'タイトルを入力してください。';
  if (input.title.length > 60) return 'タイトルは60文字以内で入力してください。';
  if (input.category === 'hiyari') {
    if (
      !input.hiyari ||
      !input.hiyari.what.trim() ||
      !input.hiyari.why.trim() ||
      !input.hiyari.next.trim()
    ) {
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
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
    return 'slug は半角英数とハイフンで入力してください。';
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

export function selectNextDive(news: NewsItem[], now = new Date()): NewsItem | null {
  return (
    news
      .filter((item) => item.next_dive_at && new Date(item.next_dive_at).getTime() > now.getTime())
      .sort(
        (first, second) =>
          new Date(first.next_dive_at as string).getTime() -
          new Date(second.next_dive_at as string).getTime()
      )[0] ?? null
  );
}

export function formatNextDive(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('month')}/${part('day')}(${part('weekday')}) ${part('hour')}:${part('minute')}`;
}

export function joinStatusMessage(status: JoinBoardStatus): string | null {
  switch (status) {
    case 'ok':
      return null;
    case 'wrong':
      return '合言葉が違います。';
    case 'locked':
      return '試行回数が上限に達しました。10分後にもう一度お試しください。';
    case 'not_set':
      return '現在、合言葉は設定されていません。';
  }
}

export function reorder<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
