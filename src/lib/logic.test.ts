import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createManualSeedSql } from '../../scripts/generate-manual-seed.mjs';
import {
  calculateResizeDimensions,
  filterSectionsBySeverity,
  formatNextDive,
  joinStatusMessage,
  relativeDate,
  selectNextDive,
  sortAndFilterAccidents,
  normalizeDocBody,
  validateBlock,
  accidentOutcomeMeta,
  validateDisplayName,
  validateThreadInput,
  groupDocsByCategory
} from './logic';
import type { Accident, DivingDoc, EquipmentSection, NewsItem } from '../types';
import { InlineBold } from '../components/InlineBold';
import { parseBoldSegments } from './bold';

const section: EquipmentSection = {
  no: 1,
  name: 'テスト',
  sub: '',
  icon: 'mask',
  guideline: '',
  signs: [
    { level: 'stop', sign: '止める', why: '理由' },
    { level: 'check', sign: '確認', why: '理由' }
  ]
};

describe('資料の重要度フィルタ', () => {
  it('即中止だけを残す', () => {
    expect(filterSectionsBySeverity([section], 'stop')[0].signs).toHaveLength(1);
  });
});

describe('画像縮小', () => {
  it('長辺を1600pxに収め、縦横比を維持する', () => {
    expect(calculateResizeDimensions(3200, 1600)).toEqual({ width: 1600, height: 800 });
    expect(calculateResizeDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('入力検証', () => {
  it('表示名とヒヤリハットを検証する', () => {
    expect(validateDisplayName('')).toBeTruthy();
    expect(validateDisplayName('海子')).toBeNull();
    expect(validateThreadInput({ title: '題', body: '', category: 'hiyari' })).toBeTruthy();
  });
});

describe('相対日時', () => {
  it('日本語の相対時刻を返す', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    expect(relativeDate('2026-09-24T11:45:00Z', now)).toBe('15分前');
    expect(relativeDate('2026-09-23T12:00:00Z', now)).toBe('1日前');
  });
});

describe('次回ダイブ', () => {
  const news: NewsItem[] = [
    {
      id: 'past',
      title: '',
      body: '',
      next_dive_at: '2026-10-01T00:00:00Z',
      next_dive_place: null,
      pinned: false,
      published_at: null
    },
    {
      id: 'later',
      title: '',
      body: '',
      next_dive_at: '2026-10-20T00:00:00Z',
      next_dive_place: null,
      pinned: false,
      published_at: null
    },
    {
      id: 'soon',
      title: '',
      body: '',
      next_dive_at: '2026-10-12T00:00:00Z',
      next_dive_place: '伊豆',
      pinned: false,
      published_at: null
    }
  ];

  it('未来の予定から最も早いものを選ぶ', () => {
    expect(selectNextDive(news, new Date('2026-10-10T00:00:00Z'))?.id).toBe('soon');
    expect(selectNextDive(news, new Date('2026-10-21T00:00:00Z'))).toBeNull();
  });

  it('指定形式で日時を表示する', () => {
    expect(formatNextDive('2026-10-11T00:00:00Z')).toBe('10/11(日) 9:00');
  });
});

describe('合言葉の結果表示', () => {
  it('RPC の状態を日本語メッセージに変換する', () => {
    expect(joinStatusMessage('ok')).toBeNull();
    expect(joinStatusMessage('wrong')).toBe('合言葉が違います。');
    expect(joinStatusMessage('locked')).toContain('10分後');
    expect(joinStatusMessage('not_set')).toContain('設定');
  });
});

describe('資料ブロック', () => {
  it('旧形式を表示用ブロックへ変換する', () => {
    const result = normalizeDocBody({
      intro: '導入',
      sections: [section],
      habits: [{ title: '習慣', text: '本文' }],
      disclaimer: '注記'
    });
    expect(result.blocks.map((block) => block.type)).toEqual(['text', 'signs', 'heading', 'cards']);
    expect(validateBlock({ type: 'heading', text: '' })).toContain('見出し');
    expect(validateBlock({ type: 'heading', text: '確認' })).toBeNull();
  });
});

describe('資料の表示と seed', () => {
  it('太字だけを解釈し、HTMLのような本文はエスケープする', () => {
    expect(parseBoldSegments('通常 **強調**')).toEqual([
      { text: '通常 ', bold: false },
      { text: '強調', bold: true }
    ]);
    expect(
      renderToStaticMarkup(
        createElement(InlineBold, { text: '**重要** <script>alert(1)</script>' })
      )
    ).toBe('<strong>重要</strong> &lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('資料をカテゴリごとに sort_order 順でまとめる', () => {
    const docs = [
      { slug: 'intro', category: 'ダイビング入門', sort_order: 10 },
      { slug: 'gear', category: '機材', sort_order: 1 },
      { slug: 'chapter', category: 'ダイビング入門', sort_order: 11 }
    ] as DivingDoc[];
    expect(
      groupDocsByCategory(docs).map((group) => [group.category, group.docs.map((doc) => doc.slug)])
    ).toEqual([
      ['機材', ['gear']],
      ['ダイビング入門', ['intro', 'chapter']]
    ]);
  });

  it('manual JSON を slug の upsert SQL にする', () => {
    const sql = createManualSeedSql([
      {
        slug: 'basics-start',
        title: 'はじめに',
        category: 'ダイビング入門',
        summary: '',
        icon: '',
        status: 'published',
        sort_order: 10,
        body: { intro: '', blocks: [], disclaimer: '' }
      }
    ]);
    expect(sql).toContain('jsonb_array_elements');
    expect(sql).toContain('on conflict (slug) do update');
    expect(sql).toContain('"slug":"basics-start"');
  });
});

describe('事故事例', () => {
  const accidents: Accident[] = [
    {
      id: 'old',
      slug: 'old',
      title: '古い',
      occurred_on: '2024-01-01',
      occurred_label: '',
      location: '',
      dive_style: '',
      outcome: 'minor',
      tags: ['海況'],
      summary: '',
      timeline: [],
      causes: [],
      lessons: [],
      related_doc_slugs: [],
      sources: [],
      status: 'published'
    },
    {
      id: 'new',
      slug: 'new',
      title: '新しい',
      occurred_on: '2025-01-01',
      occurred_label: '',
      location: '',
      dive_style: '',
      outcome: 'near_miss',
      tags: ['漂流'],
      summary: '',
      timeline: [],
      causes: [],
      lessons: [],
      related_doc_slugs: [],
      sources: [],
      status: 'published'
    }
  ];
  it('結果・タグで絞り込み、発生日の新しい順にする', () => {
    expect(sortAndFilterAccidents(accidents).map((item) => item.id)).toEqual(['new', 'old']);
    expect(sortAndFilterAccidents(accidents, { tag: '海況' }).map((item) => item.id)).toEqual([
      'old'
    ]);
    expect(accidentOutcomeMeta('near_miss').label).toBe('ヒヤリ');
  });
});
