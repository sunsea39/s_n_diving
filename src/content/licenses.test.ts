import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  addLicense,
  hasLicense,
  LICENSE_LIMIT,
  LICENSE_RANKS,
  removeLicense,
  toggleLicense,
  type SelectedLicense
} from './licenses';

const migrationPath = fileURLToPath(
  new URL('../../supabase/migrations/20260928000000_v2_2.sql', import.meta.url)
);

function ranksInDatabaseMigration() {
  const sql = readFileSync(migrationPath, 'utf8');
  const functionBody = sql.match(
    /create or replace function public\.valid_licenses[\s\S]*?as \$\$([\s\S]*?)\$\$/
  )?.[1];
  if (!functionBody) throw new Error('valid_licenses が見つかりません。');

  return Object.fromEntries(
    Array.from(functionBody.matchAll(/\(org = '([^']+)' and rank in \(([^)]*)\)\)/g)).map(
      ([, organization, ranks]) => [
        organization,
        Array.from(ranks.matchAll(/'([^']*)'/g), ([, rank]) => rank)
      ]
    )
  );
}

describe('ライセンスのランク一覧', () => {
  it('DB の valid_licenses 許可リストと一致する', () => {
    expect(ranksInDatabaseMigration()).toEqual(LICENSE_RANKS);
  });
});

describe('ライセンス選択', () => {
  const oceanDiver: SelectedLicense = { org: 'BSAC', rank: 'オーシャンダイバー' };
  const sportsDiver: SelectedLicense = { org: 'BSAC', rank: 'スポーツダイバー' };

  it('追加と削除を行う', () => {
    expect(addLicense([], oceanDiver)).toEqual([oceanDiver]);
    expect(removeLicense([oceanDiver, sportsDiver], oceanDiver)).toEqual([sportsDiver]);
    expect(toggleLicense([oceanDiver], oceanDiver)).toEqual([]);
    expect(toggleLicense([], oceanDiver)).toEqual([oceanDiver]);
  });

  it('同じライセンスを重複して追加しない', () => {
    expect(addLicense([oceanDiver], oceanDiver)).toEqual([oceanDiver]);
    expect(hasLicense([oceanDiver], oceanDiver)).toBe(true);
  });

  it(`最大 ${LICENSE_LIMIT} 件まで追加できる`, () => {
    const licenses = Array.from({ length: LICENSE_LIMIT }, (_, index) => ({
      org: 'その他',
      rank: `ライセンス${index + 1}`
    }));

    expect(addLicense(licenses, oceanDiver)).toEqual(licenses);
  });
});
