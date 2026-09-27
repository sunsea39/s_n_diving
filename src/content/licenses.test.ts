import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  addLicense,
  fallbackLicenseCatalog,
  hasLicense,
  isLicenseInCatalog,
  LICENSE_LIMIT,
  LICENSE_RANKS,
  removeLicense,
  replaceLicenseOrganization,
  replaceLicenseRank,
  ranksForOrganization,
  sortLicenseCatalog,
  toggleLicense,
  type SelectedLicense
} from './licenses';

const migrationPath = fileURLToPath(
  new URL('../../supabase/migrations/20261003000000_v2_11.sql', import.meta.url)
);

function seedInMigration() {
  const sql = readFileSync(migrationPath, 'utf8');
  const organizations = Array.from(
    sql.matchAll(/\('([^']+)', \d+, (?:true|false)\)/g),
    ([, name]) => name
  );
  const ranks = Object.fromEntries(
    Array.from(sql.matchAll(/\('([^']+)', '([^']+)', \d+\)/g)).reduce<[string, string[]][]>(
      (result, [, organization, rank]) => {
        const entry = result.find(([name]) => name === organization);
        if (entry) entry[1].push(rank);
        else result.push([organization, [rank]]);
        return result;
      },
      []
    )
  );
  return { organizations, ranks };
}

describe('ライセンスのランク一覧', () => {
  it('v2.11 migration の初期データと定数が一致する', () => {
    expect(seedInMigration()).toEqual({
      organizations: ['BSAC', 'PADI', 'NAUI', 'SSI', 'その他'],
      ranks: LICENSE_RANKS
    });
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

describe('DB カタログからの選択', () => {
  const catalog = sortLicenseCatalog(
    [
      { id: 'other', name: 'その他', sort_order: 30, allow_free_text: true },
      { id: 'padi', name: 'PADI', sort_order: 10, allow_free_text: false }
    ],
    [
      { id: 'advanced', org_id: 'padi', name: 'アドバンスド', sort_order: 20 },
      { id: 'open', org_id: 'padi', name: 'オープン', sort_order: 10 }
    ]
  );

  it('団体とランクを並び順で扱い、自由入力団体を見分ける', () => {
    expect(catalog.organizations.map((item) => item.name)).toEqual(['PADI', 'その他']);
    expect(ranksForOrganization(catalog, 'padi').map((item) => item.name)).toEqual([
      'オープン',
      'アドバンスド'
    ]);
    expect(catalog.organizations[1].allow_free_text).toBe(true);
  });

  it('一覧から消えた登録済みライセンスを判定する', () => {
    expect(isLicenseInCatalog(catalog, { org: 'PADI', rank: 'オープン' })).toBe(true);
    expect(isLicenseInCatalog(catalog, { org: 'PADI', rank: '削除済み' })).toBe(false);
    expect(isLicenseInCatalog(catalog, { org: '消えた団体', rank: 'ランク' })).toBe(false);
  });

  it('定数のフォールバックにも自由入力団体がある', () => {
    expect(fallbackLicenseCatalog().organizations.at(-1)).toMatchObject({
      name: 'その他',
      allow_free_text: true
    });
  });
});

describe('ライセンス名の置き換え', () => {
  it('団体名と団体に属するランク名だけを置き換える', () => {
    const licenses: SelectedLicense[] = [
      { org: 'PADI', rank: 'オープン' },
      { org: 'SSI', rank: 'オープン' }
    ];
    expect(replaceLicenseOrganization(licenses, 'PADI', 'PADI Japan')).toEqual([
      { org: 'PADI Japan', rank: 'オープン' },
      { org: 'SSI', rank: 'オープン' }
    ]);
    expect(replaceLicenseRank(licenses, 'PADI', 'オープン', 'オープン・ウォーター')).toEqual([
      { org: 'PADI', rank: 'オープン・ウォーター' },
      { org: 'SSI', rank: 'オープン' }
    ]);
  });
});
