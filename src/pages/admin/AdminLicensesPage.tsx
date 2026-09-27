import { useCallback, useEffect, useState } from 'react';
import {
  ranksForOrganization,
  sortLicenseCatalog,
  type LicenseCatalog,
  type LicenseOrganizationRecord,
  type LicenseRankRecord
} from '../../content/licenses';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';

type Usage = { org: string; rank: string | null; count: number };
type Edit = { kind: 'org' | 'rank'; id: string; value: string } | null;
type DeleteTarget =
  | { kind: 'org'; item: LicenseOrganizationRecord }
  | { kind: 'rank'; item: LicenseRankRecord }
  | null;

const emptyCatalog: LicenseCatalog = { organizations: [], ranks: [] };

export function AdminLicensesPage() {
  usePageTitle('ライセンス管理');
  const [catalog, setCatalog] = useState<LicenseCatalog>(emptyCatalog);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [newOrganization, setNewOrganization] = useState('');
  const [newRank, setNewRank] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Edit>(null);
  const [deleting, setDeleting] = useState<DeleteTarget>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const client = requireSupabase();
    const [organizations, ranks, usageResult] = await Promise.all([
      client.from('license_orgs').select('id, name, sort_order, allow_free_text'),
      client.from('license_ranks').select('id, org_id, name, sort_order'),
      client.rpc('license_usage')
    ]);
    if (organizations.error || ranks.error || usageResult.error) {
      setError(
        organizations.error?.message ?? ranks.error?.message ?? usageResult.error?.message ?? ''
      );
      return;
    }
    setCatalog(sortLicenseCatalog(organizations.data ?? [], ranks.data ?? []));
    setUsage((usageResult.data ?? []) as Usage[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const organizationUsage = (name: string) =>
    Number(usage.find((item) => item.org === name && item.rank === null)?.count ?? 0);
  const rankUsage = (organization: string, rank: string) =>
    Number(usage.find((item) => item.org === organization && item.rank === rank)?.count ?? 0);
  const report = (message: string) => setError(message);

  const addOrganization = async () => {
    const name = newOrganization.trim();
    if (!name) return;
    setError('');
    const result = await requireSupabase()
      .from('license_orgs')
      .insert({ name, sort_order: (catalog.organizations.at(-1)?.sort_order ?? 0) + 10 });
    if (result.error) return report(result.error.message);
    setNewOrganization('');
    await load();
  };
  const addRank = async (organization: LicenseOrganizationRecord) => {
    const name = (newRank[organization.id] ?? '').trim();
    if (!name) return;
    setError('');
    const ranks = ranksForOrganization(catalog, organization.id);
    const result = await requireSupabase()
      .from('license_ranks')
      .insert({
        org_id: organization.id,
        name,
        sort_order: (ranks.at(-1)?.sort_order ?? 0) + 10
      });
    if (result.error) return report(result.error.message);
    setNewRank((current) => ({ ...current, [organization.id]: '' }));
    await load();
  };
  const saveRename = async () => {
    if (!editing || !editing.value.trim()) return;
    setError('');
    const result = await requireSupabase().rpc(
      editing.kind === 'org' ? 'rename_license_org' : 'rename_license_rank',
      editing.kind === 'org'
        ? { p_org_id: editing.id, p_name: editing.value.trim() }
        : { p_rank_id: editing.id, p_name: editing.value.trim() }
    );
    if (result.error) return report(result.error.message);
    setEditing(null);
    await load();
  };
  const toggleFreeText = async (organization: LicenseOrganizationRecord) => {
    setError('');
    const result = await requireSupabase()
      .from('license_orgs')
      .update({ allow_free_text: !organization.allow_free_text })
      .eq('id', organization.id);
    if (result.error) return report(result.error.message);
    await load();
  };
  const move = async (
    table: 'license_orgs' | 'license_ranks',
    current: LicenseOrganizationRecord | LicenseRankRecord,
    neighbor: LicenseOrganizationRecord | LicenseRankRecord
  ) => {
    setError('');
    const client = requireSupabase();
    const [first, second] = await Promise.all([
      client.from(table).update({ sort_order: neighbor.sort_order }).eq('id', current.id),
      client.from(table).update({ sort_order: current.sort_order }).eq('id', neighbor.id)
    ]);
    if (first.error || second.error) {
      report(first.error?.message ?? second.error?.message ?? '並び順を保存できませんでした。');
    }
    await load();
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setError('');
    const table = deleting.kind === 'org' ? 'license_orgs' : 'license_ranks';
    const result = await requireSupabase().from(table).delete().eq('id', deleting.item.id);
    if (result.error) return report(result.error.message);
    setDeleting(null);
    await load();
  };

  return (
    <>
      <p className="kicker">設定</p>
      <h1>ライセンス</h1>
      <p className="meta">団体名・ランク名の変更は、登録済みのプロフィール表示にも反映されます。</p>
      {error && <p className="error">{error}</p>}
      <div className="admin-list license-admin-list">
        {catalog.organizations.map((organization, organizationIndex) => {
          const ranks = ranksForOrganization(catalog, organization.id);
          return (
            <section className="panel license-admin-card" key={organization.id}>
              <div className="license-admin-heading">
                {editing?.kind === 'org' && editing.id === organization.id ? (
                  <form
                    className="license-admin-inline-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveRename();
                    }}
                  >
                    <input
                      autoFocus
                      maxLength={30}
                      value={editing.value}
                      onChange={(event) => setEditing({ ...editing, value: event.target.value })}
                    />
                    <button className="button" type="submit">
                      保存
                    </button>
                    <button type="button" onClick={() => setEditing(null)}>
                      キャンセル
                    </button>
                  </form>
                ) : (
                  <>
                    <h2>{organization.name}</h2>
                    <small>{organizationUsage(organization.name)}人が登録</small>
                    <button
                      onClick={() =>
                        setEditing({ kind: 'org', id: organization.id, value: organization.name })
                      }
                    >
                      編集
                    </button>
                  </>
                )}
                <div className="license-admin-move">
                  <button
                    disabled={organizationIndex === 0}
                    onClick={() =>
                      void move(
                        'license_orgs',
                        organization,
                        catalog.organizations[organizationIndex - 1]
                      )
                    }
                  >
                    ↑
                  </button>
                  <button
                    disabled={organizationIndex === catalog.organizations.length - 1}
                    onClick={() =>
                      void move(
                        'license_orgs',
                        organization,
                        catalog.organizations[organizationIndex + 1]
                      )
                    }
                  >
                    ↓
                  </button>
                  <button
                    className="button-danger"
                    onClick={() => setDeleting({ kind: 'org', item: organization })}
                  >
                    削除
                  </button>
                </div>
              </div>
              <label className="inline-check">
                自由入力にする
                <input
                  type="checkbox"
                  checked={organization.allow_free_text}
                  onChange={() => void toggleFreeText(organization)}
                />
              </label>
              {!organization.allow_free_text && (
                <>
                  <ul className="license-admin-ranks">
                    {ranks.map((rank, rankIndex) => (
                      <li key={rank.id}>
                        {editing?.kind === 'rank' && editing.id === rank.id ? (
                          <form
                            className="license-admin-inline-form"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveRename();
                            }}
                          >
                            <input
                              autoFocus
                              maxLength={60}
                              value={editing.value}
                              onChange={(event) =>
                                setEditing({ ...editing, value: event.target.value })
                              }
                            />
                            <button className="button" type="submit">
                              保存
                            </button>
                            <button type="button" onClick={() => setEditing(null)}>
                              キャンセル
                            </button>
                          </form>
                        ) : (
                          <>
                            <span>{rank.name}</span>
                            <small>{rankUsage(organization.name, rank.name)}人が登録</small>
                            <button
                              onClick={() =>
                                setEditing({ kind: 'rank', id: rank.id, value: rank.name })
                              }
                            >
                              編集
                            </button>
                          </>
                        )}
                        <button
                          disabled={rankIndex === 0}
                          onClick={() => void move('license_ranks', rank, ranks[rankIndex - 1])}
                        >
                          ↑
                        </button>
                        <button
                          disabled={rankIndex === ranks.length - 1}
                          onClick={() => void move('license_ranks', rank, ranks[rankIndex + 1])}
                        >
                          ↓
                        </button>
                        <button
                          className="button-danger"
                          onClick={() => setDeleting({ kind: 'rank', item: rank })}
                        >
                          削除
                        </button>
                      </li>
                    ))}
                  </ul>
                  <form
                    className="license-admin-add"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void addRank(organization);
                    }}
                  >
                    <input
                      aria-label={`${organization.name}のランク名`}
                      maxLength={60}
                      placeholder="ランク名"
                      value={newRank[organization.id] ?? ''}
                      onChange={(event) =>
                        setNewRank((current) => ({
                          ...current,
                          [organization.id]: event.target.value
                        }))
                      }
                    />
                    <button className="button-secondary" type="submit">
                      ＋ ランクを追加
                    </button>
                  </form>
                </>
              )}
            </section>
          );
        })}
      </div>
      <form
        className="license-admin-add license-admin-add-org"
        onSubmit={(event) => {
          event.preventDefault();
          void addOrganization();
        }}
      >
        <input
          maxLength={30}
          placeholder="団体名"
          value={newOrganization}
          onChange={(event) => setNewOrganization(event.target.value)}
        />
        <button className="button" type="submit">
          ＋ 団体を追加
        </button>
      </form>
      {deleting && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="dialog panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="license-delete-title"
          >
            <h2 id="license-delete-title">削除を確認</h2>
            <p>
              {deleting.kind === 'org'
                ? 'ランクもすべて削除されます。登録済みの人のライセンスは残ります。'
                : 'このランクを一覧から削除します。登録済みの人のライセンスは残ります。'}
            </p>
            <div className="button-row">
              <button className="button-danger" onClick={() => void confirmDelete()}>
                削除する
              </button>
              <button className="button-secondary" onClick={() => setDeleting(null)}>
                キャンセル
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
