import { describe, expect, it } from 'vitest';
import {
  calculateResizeDimensions,
  filterSectionsBySeverity,
  formatNextDive,
  joinStatusMessage,
  relativeDate,
  selectNextDive,
  validateDisplayName,
  validateThreadInput
} from './logic';
import type { EquipmentSection, NewsItem } from '../types';

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
