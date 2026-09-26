import { normalizeDocBody } from './logic';
import type { Block, DivingDoc, EquipmentSection } from '../types';

export const PRINT_STORAGE_KEY = 'ns-print';

export type PrintFormat = 'cards' | 'full';
export type PrintCardSize = 'a6' | 'a7';
export type PrintPaper = 'tiled' | 'single';
export type PrintContent = 'key' | 'full';

export interface PrintSettings {
  format: PrintFormat;
  cardSize: PrintCardSize;
  paper: PrintPaper;
  content: PrintContent;
}

export const defaultPrintSettings: PrintSettings = {
  format: 'cards',
  cardSize: 'a6',
  paper: 'tiled',
  content: 'key'
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

export function normalizePrintSettings(value: unknown): PrintSettings {
  if (!value || typeof value !== 'object') return defaultPrintSettings;
  const candidate = value as Partial<PrintSettings>;
  return {
    format: isOneOf(candidate.format, ['cards', 'full']) ? candidate.format : 'cards',
    cardSize: isOneOf(candidate.cardSize, ['a6', 'a7']) ? candidate.cardSize : 'a6',
    paper: isOneOf(candidate.paper, ['tiled', 'single']) ? candidate.paper : 'tiled',
    content: isOneOf(candidate.content, ['key', 'full']) ? candidate.content : 'key'
  };
}

export function readPrintSettings(storage?: Pick<StorageLike, 'getItem'>): PrintSettings {
  try {
    const source = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    if (!source) return defaultPrintSettings;
    const stored = source.getItem(PRINT_STORAGE_KEY);
    return stored ? normalizePrintSettings(JSON.parse(stored)) : defaultPrintSettings;
  } catch {
    return defaultPrintSettings;
  }
}

export function writePrintSettings(
  settings: PrintSettings,
  storage?: Pick<StorageLike, 'setItem'>
) {
  try {
    const target = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    target?.setItem(PRINT_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or a full quota must not prevent printing.
  }
}

export type PrintCardKind = 'cover' | 'heading' | 'cards' | 'signs';

export interface PrintCard {
  id: string;
  kind: PrintCardKind;
  title: string;
  blocks: Block[];
  intro?: string;
  section?: EquipmentSection;
  continuation?: boolean;
}

const keyPointBlocks = new Set<Block['type']>(['callout', 'steps', 'checklist']);
const bodyBlocks = new Set<Block['type']>(['text', 'table', 'qa', 'image']);

/** Selects only the material that belongs in a section card for the selected print mode. */
export function filterBlocksForPrint(blocks: Block[], content: PrintContent): Block[] {
  return blocks.filter(
    (block) => keyPointBlocks.has(block.type) || (content === 'full' && bodyBlocks.has(block.type))
  );
}

/** Converts document blocks into the self-contained cards used by the print preview. */
export function createPrintCards(doc: DivingDoc, content: PrintContent): PrintCard[] {
  const body = normalizeDocBody(doc.body);
  const cards: PrintCard[] = [
    {
      id: 'cover',
      kind: 'cover',
      title: doc.title,
      intro: body.intro,
      blocks: []
    }
  ];
  let currentHeading: string | null = null;
  let groupedBlocks: Block[] = [];
  let groupIndex = 0;

  const flushHeading = () => {
    const visible = filterBlocksForPrint(groupedBlocks, content);
    if (visible.length) {
      cards.push({
        id: `heading-${groupIndex++}`,
        kind: 'heading',
        title: currentHeading ?? 'はじめに',
        blocks: visible
      });
    }
    groupedBlocks = [];
  };

  body.blocks.forEach((block, index) => {
    if (block.type === 'heading') {
      flushHeading();
      currentHeading = block.text;
      return;
    }
    if (block.type === 'signs') {
      flushHeading();
      block.sections.forEach((section) =>
        cards.push({
          id: `signs-${index}-${section.no}`,
          kind: 'signs',
          title: `${section.no}. ${section.name}`,
          blocks: [],
          section
        })
      );
      return;
    }
    if (block.type === 'cards') {
      flushHeading();
      cards.push({
        id: `cards-${index}`,
        kind: 'cards',
        title: currentHeading ?? 'ポイント',
        blocks: [block]
      });
      return;
    }
    groupedBlocks.push(block);
  });
  flushHeading();
  return cards;
}

function splitText(value: string): [string, string] | null {
  const paragraphs = value.split(/\n\s*\n/).filter(Boolean);
  if (paragraphs.length > 1) {
    const midpoint = Math.ceil(paragraphs.length / 2);
    return [paragraphs.slice(0, midpoint).join('\n\n'), paragraphs.slice(midpoint).join('\n\n')];
  }
  const lines = value.split('\n').filter(Boolean);
  if (lines.length > 1) {
    const midpoint = Math.ceil(lines.length / 2);
    return [lines.slice(0, midpoint).join('\n'), lines.slice(midpoint).join('\n')];
  }
  if (value.length < 2) return null;
  const midpoint = Math.floor(value.length / 2);
  const punctuation = [...'。！？、'].reduce(
    (best, mark) => Math.max(best, value.lastIndexOf(mark, midpoint) + 1),
    0
  );
  const splitAt = punctuation > 0 ? punctuation : midpoint;
  return [value.slice(0, splitAt).trim(), value.slice(splitAt).trim()];
}

function splitItems<T>(items: T[]): [T[], T[]] | null {
  if (items.length < 2) return null;
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function splitTextItems<T extends { text: string }>(items: T[]): [T[], T[]] | null {
  const multiple = splitItems(items);
  if (multiple) return multiple;
  const item = items[0];
  const parts = item && splitText(item.text);
  return parts ? [[{ ...item, text: parts[0] }], [{ ...item, text: parts[1] }]] : null;
}

function splitBlock(block: Block): [Block, Block] | null {
  switch (block.type) {
    case 'text': {
      const parts = splitText(block.text);
      return (
        parts && [
          { ...block, text: parts[0] },
          { ...block, text: parts[1] }
        ]
      );
    }
    case 'callout': {
      const parts = splitText(block.text);
      return (
        parts && [
          { ...block, text: parts[0] },
          { ...block, text: parts[1] }
        ]
      );
    }
    case 'signs': {
      const parts = splitItems(block.sections);
      return (
        parts && [
          { ...block, sections: parts[0] },
          { ...block, sections: parts[1] }
        ]
      );
    }
    case 'cards': {
      const parts = splitTextItems(block.items);
      return (
        parts && [
          { ...block, items: parts[0] },
          { ...block, items: parts[1] }
        ]
      );
    }
    case 'steps': {
      const parts = splitTextItems(block.items);
      return (
        parts && [
          { ...block, items: parts[0] },
          { ...block, items: parts[1] }
        ]
      );
    }
    case 'checklist': {
      const parts = splitTextItems(block.items);
      return (
        parts && [
          { ...block, items: parts[0] },
          { ...block, items: parts[1] }
        ]
      );
    }
    case 'table': {
      const parts = splitItems(block.rows);
      return (
        parts && [
          { ...block, rows: parts[0] },
          { ...block, rows: parts[1] }
        ]
      );
    }
    case 'qa': {
      const parts = splitItems(block.items);
      if (parts)
        return [
          { ...block, items: parts[0] },
          { ...block, items: parts[1] }
        ];
      const item = block.items[0];
      const answer = item && splitText(item.a);
      return answer
        ? [
            { ...block, items: [{ ...item, a: answer[0] }] },
            { ...block, items: [{ ...item, a: answer[1] }] }
          ]
        : null;
    }
    case 'links': {
      const parts = splitItems(block.items);
      return (
        parts && [
          { ...block, items: parts[0] },
          { ...block, items: parts[1] }
        ]
      );
    }
    case 'heading':
    case 'image':
      return null;
  }
}

/** Splits an overflowing card at a block/item boundary and marks the latter half as a continuation. */
export function splitPrintCard(card: PrintCard): [PrintCard, PrintCard] | null {
  const makePair = (
    first: Partial<PrintCard>,
    second: Partial<PrintCard>
  ): [PrintCard, PrintCard] => [
    { ...card, ...first, id: `${card.id}-1` },
    { ...card, ...second, id: `${card.id}-2`, continuation: true }
  ];

  if (card.kind === 'cover') {
    const parts = splitText(card.intro ?? '');
    return parts ? makePair({ intro: parts[0] }, { intro: parts[1] }) : null;
  }
  if (card.kind === 'signs' && card.section) {
    const parts = splitItems(card.section.signs);
    if (parts)
      return makePair(
        { section: { ...card.section, signs: parts[0] } },
        { section: { ...card.section, signs: parts[1] } }
      );
    const sign = card.section.signs[0];
    const reason = sign && splitText(sign.why);
    return reason
      ? makePair(
          { section: { ...card.section, signs: [{ ...sign, why: reason[0] }] } },
          { section: { ...card.section, signs: [{ ...sign, why: reason[1] }] } }
        )
      : null;
  }
  if (card.blocks.length > 1) {
    const midpoint = Math.ceil(card.blocks.length / 2);
    return makePair(
      { blocks: card.blocks.slice(0, midpoint) },
      { blocks: card.blocks.slice(midpoint) }
    );
  }
  const split = card.blocks[0] && splitBlock(card.blocks[0]);
  return split ? makePair({ blocks: [split[0]] }, { blocks: [split[1]] }) : null;
}

export interface A4Tiling {
  columns: number;
  rows: number;
  capacity: number;
  gapMm: number;
  cardWidthMm: number;
  cardHeightMm: number;
}

export function getA4Tiling(size: PrintCardSize): A4Tiling {
  const columns = 2;
  const rows = size === 'a6' ? 2 : 4;
  const gapMm = 5;
  return {
    columns,
    rows,
    capacity: columns * rows,
    gapMm,
    cardWidthMm: (210 - gapMm) / columns,
    cardHeightMm: (297 - gapMm * (rows - 1)) / rows
  };
}

export function tilePrintCards<T>(cards: T[], size: PrintCardSize): T[][] {
  const { capacity } = getA4Tiling(size);
  return Array.from({ length: Math.ceil(cards.length / capacity) }, (_, index) =>
    cards.slice(index * capacity, (index + 1) * capacity)
  );
}
