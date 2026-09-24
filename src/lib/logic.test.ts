import { describe, expect, it } from 'vitest';
import {
  calculateResizeDimensions,
  filterSectionsBySeverity,
  relativeDate,
  validateDisplayName,
  validateThreadInput
} from './logic';
import type { EquipmentSection } from '../types';

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
