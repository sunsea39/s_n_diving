export const LICENSE_ORGANIZATIONS = ['BSAC', 'PADI', 'NAUI', 'SSI', 'その他'] as const;

export type LicenseOrganization = (typeof LICENSE_ORGANIZATIONS)[number];

export const LICENSE_RANKS = {
  BSAC: [
    'オーシャンダイバー',
    'スポーツダイバー',
    'ダイブリーダー',
    'アドバンスドダイバー',
    'ファーストクラスダイバー',
    'インストラクター'
  ],
  PADI: [
    'オープン・ウォーター・ダイバー',
    'アドバンスド・オープン・ウォーター・ダイバー',
    'レスキュー・ダイバー',
    'マスター・スクーバ・ダイバー',
    'ダイブマスター',
    'インストラクター'
  ],
  NAUI: [
    'スクーバダイバー',
    'アドバンスドスクーバダイバー',
    'レスキュースクーバダイバー',
    'マスタースクーバダイバー',
    'ダイブマスター',
    'インストラクター'
  ],
  SSI: [
    'オープンウォーターダイバー',
    'アドバンスドアドベンチャラー',
    'ストレス＆レスキュー',
    'アドバンスドオープンウォーターダイバー',
    'マスターダイバー',
    'ダイブガイド',
    'ダイブマスター',
    'インストラクター'
  ]
} as const;

export type SelectedLicense = { org: string; rank: string };

export const LICENSE_LIMIT = 5;

export function isLicenseOrganization(value: string): value is LicenseOrganization {
  return LICENSE_ORGANIZATIONS.some((organization) => organization === value);
}

export function initialLicenseOrganization(
  licenses: readonly SelectedLicense[]
): LicenseOrganization {
  const organization = licenses[0]?.org;
  return organization && isLicenseOrganization(organization) ? organization : 'BSAC';
}

export function hasLicense(
  licenses: readonly SelectedLicense[],
  license: SelectedLicense
): boolean {
  return licenses.some(({ org, rank }) => org === license.org && rank === license.rank);
}

export function addLicense(
  licenses: readonly SelectedLicense[],
  license: SelectedLicense
): SelectedLicense[] {
  const rank = license.rank.trim();
  const nextLicense = { ...license, rank };
  if (!rank || licenses.length >= LICENSE_LIMIT || hasLicense(licenses, nextLicense)) {
    return [...licenses];
  }
  return [...licenses, nextLicense];
}

export function removeLicense(
  licenses: readonly SelectedLicense[],
  license: SelectedLicense
): SelectedLicense[] {
  return licenses.filter(({ org, rank }) => org !== license.org || rank !== license.rank);
}

export function toggleLicense(
  licenses: readonly SelectedLicense[],
  license: SelectedLicense
): SelectedLicense[] {
  return hasLicense(licenses, license)
    ? removeLicense(licenses, license)
    : addLicense(licenses, license);
}
