import type {
  Accident,
  AccidentOutcome,
  Block,
  DocBody,
  DivingDoc,
  EquipmentSection,
  HiyariFields,
  LegacyDocBody,
  NewsItem,
  Severity
} from '../types';

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

export function normalizeDocBody(body: DocBody | LegacyDocBody): DocBody {
  if ('blocks' in body) return body;
  const legacy = body as LegacyDocBody;
  const blocks: Block[] = [];
  if (legacy.intro) blocks.push({ type: 'text', text: legacy.intro });
  blocks.push({ type: 'signs', sections: legacy.sections });
  blocks.push({ type: 'heading', text: '機材を長持ちさせる 3つの習慣' });
  blocks.push({
    type: 'cards',
    columns: 3,
    items: legacy.habits.map((habit) => ({ title: habit.title, text: habit.text }))
  });
  return { intro: '', blocks, disclaimer: legacy.disclaimer };
}

export function validateBlock(block: Block): string | null {
  switch (block.type) {
    case 'heading':
      return block.text.trim() ? null : '見出しを入力してください。';
    case 'text':
      return block.text.trim() ? null : '本文を入力してください。';
    case 'callout':
      return block.title.trim() && block.text.trim()
        ? null
        : '注意ボックスの見出しと本文を入力してください。';
    case 'signs':
      return block.sections.length ? null : '機材セクションを1つ以上追加してください。';
    case 'cards':
      return block.items.length && block.items.every((item) => item.title.trim())
        ? null
        : 'カードを1つ以上追加し、見出しを入力してください。';
    case 'steps':
      return block.items.length && block.items.every((item) => item.title.trim())
        ? null
        : '手順を1つ以上追加し、見出しを入力してください。';
    case 'checklist':
      return block.title.trim() &&
        block.items.length &&
        block.items.every((item) => item.text.trim())
        ? null
        : 'チェックリストの見出しと項目を入力してください。';
    case 'table':
      return block.headers.length && block.headers.every((header) => header.trim())
        ? null
        : '表の見出しを1つ以上入力してください。';
    case 'image':
      return block.src.trim() ? null : '画像をアップロードしてください。';
    case 'qa':
      return block.items.length && block.items.every((item) => item.q.trim() && item.a.trim())
        ? null
        : '質問と回答を1つ以上入力してください。';
    case 'links':
      return block.items.length && block.items.every((item) => item.label.trim() && item.url.trim())
        ? null
        : 'リンク名と URL を1つ以上入力してください。';
  }
}

export const accidentOutcomes: { value: AccidentOutcome; label: string; className: string }[] = [
  { value: 'fatal', label: '死亡', className: 'fatal' },
  { value: 'serious', label: '重症', className: 'serious' },
  { value: 'minor', label: '軽症', className: 'minor' },
  { value: 'near_miss', label: 'ヒヤリ', className: 'near-miss' }
];

export function accidentOutcomeMeta(outcome: AccidentOutcome) {
  return accidentOutcomes.find((item) => item.value === outcome) ?? accidentOutcomes[3];
}

export function sortAndFilterAccidents(
  accidents: Accident[],
  filters: { outcome?: AccidentOutcome | 'all'; tag?: string | 'all' } = {}
): Accident[] {
  return accidents
    .filter(
      (accident) =>
        !filters.outcome || filters.outcome === 'all' || accident.outcome === filters.outcome
    )
    .filter(
      (accident) => !filters.tag || filters.tag === 'all' || accident.tags.includes(filters.tag)
    )
    .sort((first, second) => {
      const firstDate = first.occurred_on ?? '';
      const secondDate = second.occurred_on ?? '';
      return secondDate.localeCompare(firstDate);
    });
}

export function relatedAccidentsForDoc(accidents: Accident[], slug: string) {
  return accidents.filter((accident) => accident.related_doc_slugs.includes(slug));
}

export function groupDocsByCategory(docs: DivingDoc[]): { category: string; docs: DivingDoc[] }[] {
  const groups = new Map<string, DivingDoc[]>();
  [...docs]
    .sort((first, second) => first.sort_order - second.sort_order)
    .forEach((doc) => groups.set(doc.category, [...(groups.get(doc.category) ?? []), doc]));
  return [...groups].map(([category, groupedDocs]) => ({ category, docs: groupedDocs }));
}

export function latestDocs(docs: DivingDoc[], limit = 4): DivingDoc[] {
  return [...docs]
    .sort((first, second) => {
      const firstUpdated = Date.parse(first.updated_at ?? '') || 0;
      const secondUpdated = Date.parse(second.updated_at ?? '') || 0;
      return secondUpdated - firstUpdated || second.sort_order - first.sort_order;
    })
    .slice(0, limit);
}

export function docBodyForSave(doc: DivingDoc): DocBody {
  return normalizeDocBody(doc.body);
}
