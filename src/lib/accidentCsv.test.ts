import { describe, expect, it } from 'vitest';
import { decodeAccidentCsv, parseRfc4180, previewAccidentCsv } from './accidentCsv';

const header =
  'slug,タイトル,発生日,発生時期（表示用）,場所,スタイル,結果,タグ,概要,経過,考えられる原因,防ぐためのポイント,関連資料,出典,公開状態';

describe('accident CSV', () => {
  it('parses quoted commas, quotes and line breaks', () => {
    expect(parseRfc4180('a,"b,c","d""e\nf"\r\n')).toEqual([['a', 'b,c', 'd"e\nf']]);
  });

  it('decodes UTF-8 with a BOM', () => {
    const bytes = new TextEncoder().encode('\uFEFFslug,タイトル');
    expect(decodeAccidentCsv(bytes.buffer).text).toContain('タイトル');
  });

  it('maps headers, converts values and classifies an existing slug', () => {
    const csv = `${header}\ncase-1,例,2025/7/2,2025年7月,海,ボート,ヒヤリ,"海況、漂流",概要,"09:20 入水\n浮上",原因,教訓,gear-signs,"資料 | https://example.test",公開`;
    const preview = previewAccidentCsv(csv, {
      existingSlugs: ['case-1'],
      documentSlugs: ['gear-signs']
    });
    expect(preview.errors).toEqual([]);
    expect(preview.rows[0]).toMatchObject({
      action: 'update',
      accident: {
        occurred_on: '2025-07-02',
        outcome: 'near_miss',
        status: 'published',
        tags: ['海況', '漂流']
      }
    });
    expect(preview.rows[0].accident?.timeline).toEqual([
      { time: '09:20', text: '入水' },
      { time: '', text: '浮上' }
    ]);
  });

  it('reports invalid outcome, tag and source as row errors', () => {
    const csv = `${header}\ncase-1,例,,,,,未知,未登録,,,,,,ラベル | http://example.test,下書き`;
    const preview = previewAccidentCsv(csv, { existingSlugs: [], documentSlugs: [] });
    expect(preview.rows[0].action).toBe('error');
    expect(preview.rows[0].messages.join(' ')).toContain('結果');
    expect(preview.rows[0].messages.join(' ')).toContain('タグ');
    expect(preview.rows[0].messages.join(' ')).toContain('https');
  });
});

describe('bundled accident CSV template', () => {
  it('parses without errors', async () => {
    const { readFileSync } = await import('node:fs');
    const buffer = readFileSync('public/templates/accidents-template.csv');
    const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const { text } = decodeAccidentCsv(bytes as ArrayBuffer);
    const preview = previewAccidentCsv(text, {
      existingSlugs: [],
      documentSlugs: ['gear-signs', 'basics-ch2', 'basics-ch4']
    });
    expect(preview.rows).toHaveLength(2);
    for (const row of preview.rows) {
      expect(row.messages.filter((message) => !message.startsWith('警告'))).toEqual([]);
      expect(row.action).toBe('new');
    }
  });
});
