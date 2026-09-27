import type { Accident, AccidentOutcome, AccidentSource, AccidentTimelineItem } from '../types';
import { validateSlug } from './logic';

export const ACCIDENT_CSV_HEADERS = {
  slug: 'slug',
  title: 'タイトル',
  occurred_on: '発生日',
  occurred_label: '発生時期（表示用）',
  location: '場所',
  dive_style: 'スタイル',
  outcome: '結果',
  tags: 'タグ',
  summary: '概要',
  timeline: '経過',
  causes: '考えられる原因',
  lessons: '防ぐためのポイント',
  related_doc_slugs: '関連資料',
  sources: '出典',
  status: '公開状態'
} as const;

const requiredHeaders = Object.values(ACCIDENT_CSV_HEADERS);
const allowedTags = new Set([
  'エア切れ',
  '急浮上',
  '漂流',
  '機材トラブル',
  '体調・持病',
  '減圧症',
  'バディ離れ',
  '視界不良',
  '海況',
  '海洋生物',
  'その他',
  '不明'
]);
const outcomeMap: Record<string, AccidentOutcome> = {
  死亡: 'fatal',
  重症: 'serious',
  軽症: 'minor',
  ヒヤリ: 'near_miss'
};
const statusMap: Record<string, Accident['status']> = { 公開: 'published', 下書き: 'draft' };
const allowedStyles = new Set(['ボート', 'ビーチ', 'ドリフト', 'ナイト', 'その他']);

export type CsvPreviewRow = {
  line: number;
  action: 'new' | 'update' | 'error';
  messages: string[];
  warnings: string[];
  accident: Omit<Accident, 'id'> | null;
};

export type AccidentCsvPreview = {
  rows: CsvPreviewRow[];
  errors: string[];
  encoding: 'UTF-8' | 'Shift_JIS';
};

export function decodeAccidentCsv(bytes: ArrayBuffer): {
  text: string;
  encoding: 'UTF-8' | 'Shift_JIS';
} {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' };
  } catch {
    return { text: new TextDecoder('shift_jis').decode(bytes), encoding: 'Shift_JIS' };
  }
}

/** Small RFC 4180 parser: commas, CRLF and escaped quotes inside quoted cells are supported. */
export function parseRfc4180(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (closedQuote && char !== ',' && char !== '\r' && char !== '\n') {
      throw new Error('引用符の後に不正な文字があります。');
    }
    if (char === '"') {
      if (cell) throw new Error('引用符の開始位置が不正です。');
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      closedQuote = false;
      continue;
    }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      closedQuote = false;
      continue;
    }
    cell += char;
  }
  if (quoted) throw new Error('引用符が閉じられていません。');
  if (cell || row.length || closedQuote) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function splitLines(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDate(value: string): string | null | undefined {
  if (!value) return null;
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCDate() !== Number(day)
  )
    return undefined;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseTimeline(value: string): AccidentTimelineItem[] {
  return splitLines(value).map((line) => {
    const match = line.match(/^(\d{1,2}:\d{2})\s+(.*)$/);
    return match ? { time: match[1], text: match[2] } : { time: '', text: line };
  });
}

function parseSources(value: string, messages: string[]): AccidentSource[] {
  const sources: AccidentSource[] = [];
  for (const line of splitLines(value)) {
    const [label, ...urlParts] = line.split('|');
    const url = urlParts.join('|').trim();
    if (!label?.trim() || !url || !/^https:\/\//i.test(url)) {
      messages.push(`出典「${line}」は「ラベル | https://...」で入力してください。`);
    } else {
      sources.push({ label: label.trim(), url });
    }
  }
  return sources;
}

export function previewAccidentCsv(
  text: string,
  options: {
    existingSlugs: Iterable<string>;
    documentSlugs: Iterable<string>;
    encoding?: 'UTF-8' | 'Shift_JIS';
  }
): AccidentCsvPreview {
  let records: string[][];
  try {
    records = parseRfc4180(text);
  } catch (cause) {
    return {
      rows: [],
      errors: [cause instanceof Error ? cause.message : 'CSV を解析できませんでした。'],
      encoding: options.encoding ?? 'UTF-8'
    };
  }
  if (!records.length)
    return { rows: [], errors: ['CSV が空です。'], encoding: options.encoding ?? 'UTF-8' };
  const headers = records[0].map((header) => header.replace(/^\uFEFF/, '').trim());
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length)
    return {
      rows: [],
      errors: [`見出しが不足しています: ${missing.join('、')}`],
      encoding: options.encoding ?? 'UTF-8'
    };
  const columns = new Map(headers.map((header, index) => [header, index]));
  const existing = new Set(options.existingSlugs);
  const seenSlugs = new Set(existing);
  const documents = new Set(options.documentSlugs);
  const rows = records.slice(1).flatMap((record, recordIndex) => {
    if (record.every((cell) => !cell.trim())) return [];
    const messages: string[] = [];
    const warnings: string[] = [];
    if (record.length !== headers.length) messages.push('列数が見出し行と一致しません。');
    const value = (key: keyof typeof ACCIDENT_CSV_HEADERS) =>
      (record[columns.get(ACCIDENT_CSV_HEADERS[key]) ?? -1] ?? '').trim();
    const slug = value('slug');
    if (!slug) messages.push('slug は必須です。');
    else {
      const slugError = validateSlug(slug);
      if (slugError) messages.push(slugError);
    }
    const title = value('title');
    if (!title) messages.push('タイトルは必須です。');
    const occurred_on = parseDate(value('occurred_on'));
    if (occurred_on === undefined)
      messages.push('発生日は YYYY-MM-DD または YYYY/M/D で入力してください。');
    const outcome = outcomeMap[value('outcome')];
    if (!outcome) messages.push('結果は 死亡／重症／軽症／ヒヤリ のいずれかで入力してください。');
    const dive_style = value('dive_style');
    if (dive_style && !allowedStyles.has(dive_style)) messages.push('スタイルを確認してください。');
    const parsedTags = value('tags')
      .split(/[、,，／]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    const unknownTags = parsedTags.filter((tag) => !allowedTags.has(tag));
    if (unknownTags.length) messages.push(`候補にないタグです: ${unknownTags.join('、')}`);
    const statusValue = value('status');
    const status = statusValue ? statusMap[statusValue] : 'draft';
    if (!status) messages.push('公開状態は 公開 または 下書き で入力してください。');
    const related_doc_slugs = value('related_doc_slugs')
      .split(/[\n\r、]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    const missingDocuments = related_doc_slugs.filter((slugValue) => !documents.has(slugValue));
    if (missingDocuments.length)
      warnings.push(`関連資料が見つかりません: ${missingDocuments.join('、')}`);
    const sources = parseSources(value('sources'), messages);
    const accident: Omit<Accident, 'id'> | null = messages.length
      ? null
      : {
          slug,
          title,
          occurred_on: occurred_on ?? null,
          occurred_label: value('occurred_label'),
          location: value('location'),
          dive_style,
          outcome: outcome as AccidentOutcome,
          tags: parsedTags,
          summary: value('summary'),
          timeline: parseTimeline(value('timeline')),
          causes: splitLines(value('causes')),
          lessons: splitLines(value('lessons')),
          related_doc_slugs,
          sources,
          status: status as Accident['status']
        };
    const action: CsvPreviewRow['action'] = messages.length
      ? 'error'
      : seenSlugs.has(slug)
        ? 'update'
        : 'new';
    if (!messages.length) seenSlugs.add(slug);
    return [{ line: recordIndex + 2, action, messages, warnings, accident }];
  });
  return { rows, errors: [], encoding: options.encoding ?? 'UTF-8' };
}
