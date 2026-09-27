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

export type LicenseOrganizationRecord = {
  id: string;
  name: string;
  sort_order: number;
  allow_free_text: boolean;
};

export type LicenseRankRecord = {
  id: string;
  org_id: string;
  name: string;
  sort_order: number;
};

export type LicenseCatalog = {
  organizations: LicenseOrganizationRecord[];
  ranks: LicenseRankRecord[];
};

export const LICENSE_LIMIT = 5;

export function fallbackLicenseCatalog(): LicenseCatalog {
  return {
    organizations: LICENSE_ORGANIZATIONS.map((name, index) => ({
      id: `fallback-org-${name}`,
      name,
      sort_order: (index + 1) * 10,
      allow_free_text: name === 'その他'
    })),
    ranks: Object.entries(LICENSE_RANKS).flatMap(([orgName, names]) =>
      names.map((name, index) => ({
        id: `fallback-rank-${orgName}-${name}`,
        org_id: `fallback-org-${orgName}`,
        name,
        sort_order: (index + 1) * 10
      }))
    )
  };
}

export function sortLicenseCatalog(
  organizations: LicenseOrganizationRecord[],
  ranks: LicenseRankRecord[]
): LicenseCatalog {
  return {
    organizations: [...organizations].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja')
    ),
    ranks: [...ranks].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja')
    )
  };
}

export function ranksForOrganization(catalog: LicenseCatalog, organizationId: string) {
  return catalog.ranks.filter((rank) => rank.org_id === organizationId);
}

export function isLicenseInCatalog(catalog: LicenseCatalog, license: SelectedLicense): boolean {
  const organization = catalog.organizations.find((item) => item.name === license.org);
  if (!organization) return false;
  return organization.allow_free_text
    ? license.rank.length > 0
    : catalog.ranks.some((rank) => rank.org_id === organization.id && rank.name === license.rank);
}

export function replaceLicenseOrganization(
  licenses: readonly SelectedLicense[],
  from: string,
  to: string
): SelectedLicense[] {
  return licenses.map((license) => (license.org === from ? { ...license, org: to } : license));
}

export function replaceLicenseRank(
  licenses: readonly SelectedLicense[],
  organization: string,
  from: string,
  to: string
): SelectedLicense[] {
  return licenses.map((license) =>
    license.org === organization && license.rank === from ? { ...license, rank: to } : license
  );
}

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
