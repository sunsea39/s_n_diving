import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { useAppData } from '../../context/AppDataContext';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import type { AccountRole } from '../../types';

interface Member {
  id: string;
  email: string;
  role: AccountRole;
  display_name: string;
  avatar_path: string | null;
  created_at: string;
  approved_at: string | null;
  last_sign_in_at: string | null;
}
const filters: ['all' | AccountRole, string][] = [
  ['all', 'すべて'],
  ['pending', '承認待ち'],
  ['member', 'メンバー'],
  ['editor', 'サブ管理者'],
  ['owner', 'メイン管理者'],
  ['suspended', '利用停止']
];

export function AdminMembersPage() {
  usePageTitle('メンバー管理');
  const { user } = useAppData();
  const [items, setItems] = useState<Member[]>([]);
  const [filter, setFilter] = useState<'all' | AccountRole>('all');
  const [action, setAction] = useState<{
    member: Member;
    role?: AccountRole;
    password?: boolean;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const result = await requireSupabase().rpc('list_members');
    if (result.error) setError(result.error.message);
    else setItems(result.data as Member[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const commit = async () => {
    if (!action) return;
    setError('');
    if (action.password) {
      if (password.length < 8) return setError('パスワードは8文字以上で入力してください。');
      if (password !== confirmation) return setError('確認用パスワードが一致しません。');
      const r = await requireSupabase().rpc('admin_set_password', {
        p_user: action.member.id,
        p_password: password
      });
      if (r.error) return setError(r.error.message);
    } else {
      const r = await requireSupabase().rpc('set_member_role', {
        p_user: action.member.id,
        p_role: action.role
      });
      if (r.error) return setError(r.error.message);
    }
    setAction(null);
    setPassword('');
    setConfirmation('');
    await load();
  };
  const visible = items.filter((item) => filter === 'all' || item.role === filter);
  const pending = items.filter((item) => item.role === 'pending');
  const askRole = (member: Member, role: AccountRole) => setAction({ member, role });
  return (
    <>
      <p className="kicker">メンバー</p>
      <h1>メンバー管理</h1>
      <div className="panel">
        <b>承認待ち {pending.length}人</b>
      </div>
      <div className="filter-row">
        {filters.map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? 'selected' : ''}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {pending.length > 0 && (
        <section>
          <h2>承認待ち</h2>
          <div className="admin-list">
            {pending.map((member) => (
              <article className="panel member-row" key={member.id}>
                <Avatar name={member.display_name} path={member.avatar_path} />
                <div>
                  <b>{member.display_name}</b>
                  <p className="meta">
                    {member.email} ・ {new Date(member.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
                <button className="button" onClick={() => askRole(member, 'member')}>
                  承認
                </button>
                <button className="button-danger" onClick={() => askRole(member, 'suspended')}>
                  利用停止
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2>メンバー一覧</h2>
        <div className="admin-list">
          {visible.map((member) => {
            const self = member.id === user?.id;
            return (
              <article className="panel member-row" key={member.id}>
                <Avatar name={member.display_name} path={member.avatar_path} />
                <div>
                  <b>{member.display_name}</b>
                  {self && <span className="tag">あなた</span>}
                  <p className="meta">
                    {member.email} ・ {member.role} ・ 登録{' '}
                    {new Date(member.created_at).toLocaleDateString('ja-JP')} ・ 最終ログイン{' '}
                    {member.last_sign_in_at
                      ? new Date(member.last_sign_in_at).toLocaleDateString('ja-JP')
                      : 'なし'}
                  </p>
                </div>
                {member.role !== 'pending' && member.role !== 'suspended' && (
                  <label className="inline-check">
                    サブ管理者
                    <input
                      type="checkbox"
                      disabled={self || member.role === 'owner'}
                      checked={member.role === 'editor'}
                      onChange={(e) => askRole(member, e.target.checked ? 'editor' : 'member')}
                    />
                  </label>
                )}{' '}
                {!self && (
                  <div className="member-actions">
                    {member.role !== 'owner' && (
                      <button onClick={() => askRole(member, 'owner')}>メインの管理者にする</button>
                    )}
                    <button
                      onClick={() =>
                        askRole(member, member.role === 'suspended' ? 'member' : 'suspended')
                      }
                    >
                      {member.role === 'suspended' ? '再開' : '利用停止'}
                    </button>
                    <button onClick={() => setAction({ member, password: true })}>
                      仮パスワード
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
      {action && (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog panel" role="dialog" aria-modal="true">
            <h2>{action.password ? '仮パスワードを設定' : '変更を確認'}</h2>
            <p>
              {action.member.display_name}{' '}
              {action.password
                ? 'の仮パスワードを設定します。'
                : `の権限を「${action.role}」に変更します。`}
            </p>
            {action.password && (
              <>
                <label>
                  仮パスワード
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label>
                  確認
                  <input
                    type="password"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
              </>
            )}
            {error && <p className="error">{error}</p>}
            <div className="button-row">
              <button className="button" onClick={() => void commit()}>
                実行する
              </button>
              <button
                className="button-secondary"
                onClick={() => {
                  setAction(null);
                  setError('');
                }}
              >
                キャンセル
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
