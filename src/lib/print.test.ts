import { describe, expect, it } from 'vitest';
import {
  createPrintCards,
  filterBlocksForPrint,
  getA4Tiling,
  splitPrintCard,
  tilePrintCards
} from './print';
import type { Block, DivingDoc } from '../types';

const doc: DivingDoc = {
  slug: 'print-test',
  title: '印刷テスト',
  category: '入門',
  summary: '',
  status: 'published',
  sort_order: 1,
  body: {
    intro: '持ち歩くための導入です。',
    disclaimer: '',
    blocks: [
      { type: 'heading', text: '安全の基本' },
      { type: 'callout', tone: 'danger', title: '守ること', text: '息を止めない' },
      { type: 'text', text: '詳しい本文' },
      { type: 'qa', items: [{ q: '質問', a: '回答' }] },
      { type: 'cards', columns: 2, items: [{ title: '習慣', text: '内容' }] }
    ]
  }
};

describe('印刷用カード', () => {
  it('導入、見出し範囲、cards ブロックをカードへ分割する', () => {
    const cards = createPrintCards(doc, 'key');
    expect(cards.map((card) => card.kind)).toEqual(['cover', 'heading', 'cards']);
    expect(cards[1].title).toBe('安全の基本');
    expect(cards[1].blocks.map((block) => block.type)).toEqual(['callout']);
  });

  it('収まらない本文カードを続きのカードに分割する', () => {
    const card = createPrintCards(doc, 'full')[1];
    const split = splitPrintCard(card);
    expect(split).not.toBeNull();
    expect(split?.[1].continuation).toBe(true);
    expect(split?.[0].blocks.length).toBeGreaterThan(0);
    expect(split?.[1].blocks.length).toBeGreaterThan(0);
  });
});

describe('印刷内容の絞り込み', () => {
  const blocks: Block[] = [
    { type: 'callout', tone: 'info', title: '要点', text: '本文' },
    { type: 'steps', items: [{ title: '手順', text: '' }] },
    { type: 'checklist', title: '確認', items: [{ text: '項目' }] },
    { type: 'text', text: '本文' },
    { type: 'table', headers: ['列'], rows: [['値']] },
    { type: 'qa', items: [{ q: 'Q', a: 'A' }] }
  ];

  it('要点のみでは callout、steps、checklist だけを残す', () => {
    expect(filterBlocksForPrint(blocks, 'key').map((block) => block.type)).toEqual([
      'callout',
      'steps',
      'checklist'
    ]);
  });

  it('要点＋本文では本文、表、Q&A を追加する', () => {
    expect(filterBlocksForPrint(blocks, 'full').map((block) => block.type)).toEqual([
      'callout',
      'steps',
      'checklist',
      'text',
      'table',
      'qa'
    ]);
  });
});

describe('A4 タイル配置', () => {
  it('A6 は 2×2、A7 は 2×4、カード間は 5mm とする', () => {
    expect(getA4Tiling('a6')).toEqual({
      columns: 2,
      rows: 2,
      capacity: 4,
      gapMm: 5,
      cardWidthMm: 102.5,
      cardHeightMm: 146
    });
    expect(getA4Tiling('a7')).toEqual({
      columns: 2,
      rows: 4,
      capacity: 8,
      gapMm: 5,
      cardWidthMm: 102.5,
      cardHeightMm: 70.5
    });
  });

  it('カード列を A4 ごとのシートへ配置する', () => {
    expect(tilePrintCards([1, 2, 3, 4, 5], 'a6')).toEqual([[1, 2, 3, 4], [5]]);
    expect(
      tilePrintCards(
        Array.from({ length: 9 }, (_, index) => index),
        'a7'
      )
    ).toHaveLength(2);
  });
});
