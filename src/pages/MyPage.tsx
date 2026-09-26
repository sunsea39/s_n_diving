import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { cropAvatar } from '../lib/accounts';
import { serviceBadge, validateDisplayName } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';
import { requireSupabase, supabase } from '../lib/supabase';
import type { GearNote, Post, Profile, Thread } from '../types';
import { useAppData } from '../context/AppDataContext';

type Tab = 'profile' | 'experience' | 'posts' | 'gear' | 'account';
const tabs: [Tab, string][] = [
  ['profile', 'プロフィール'],
  ['experience', 'ダイビング経験'],
  ['posts', '自分の投稿'],
  ['gear', '機材メモ'],
  ['account', 'アカウント']
];
const emptyGear = {
  name: '',
  maker_model: '',
  purchased_on: '',
  last_service_on: '',
  next_service_on: '',
  memo: ''
};

export function MyPage() {
  usePageTitle('マイページ');
  const { user, profile, refreshSession } = useAppData();
  const [tab, setTab] = useState<Tab>('profile');
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [notes, setNotes] = useState<GearNote[]>([]);
  const [gear, setGear] = useState(emptyGear);
  const [editing, setEditing] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => setDraft(profile), [profile]);
  const load = async () => {
    if (!user) return;
    const client = requireSupabase();
    const [notesResult, threadResult, postResult] = await Promise.all([
      client
        .from('gear_notes')
        .select('*')
        .order('next_service_on', { ascending: true, nullsFirst: false }),
      client
        .from('threads')
        .select('*')
        .eq('author_uid', user.id)
        .order('created_at', { ascending: false }),
      client
        .from('posts')
        .select('*, threads(title)')
        .eq('author_uid', user.id)
        .order('created_at', { ascending: false })
    ]);
    if (!notesResult.error) setNotes(notesResult.data as GearNote[]);
    if (!threadResult.error) setThreads(threadResult.data as Thread[]);
    if (!postResult.error) setPosts(postResult.data as Post[]);
  };
  useEffect(() => {
    void load();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return <Navigate to="/login?next=%2Fmypage" replace />;
  if (!draft) return <p>読み込み中です…</p>;
  const saveProfile = async (fields: Partial<Profile>) => {
    setError('');
    setMessage('');
    const name = fields.display_name ?? draft.display_name;
    const invalid = validateDisplayName(name);
    if (invalid) return setError(invalid);
    const result = await requireSupabase().from('profiles').update(fields).eq('id', user.id);
    if (result.error) setError(result.error.message);
    else {
      setDraft({ ...draft, ...fields });
      setMessage('保存しました。');
      await refreshSession();
    }
  };
  const uploadAvatar = async (file: File | null) => {
    if (!file) return;
    setError('');
    try {
      const blob = await cropAvatar(file);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const old = draft.avatar_path;
      const result = await requireSupabase()
        .storage.from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (result.error) throw result.error;
      await saveProfile({ avatar_path: path });
      if (old) await requireSupabase().storage.from('avatars').remove([old]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '画像を保存できませんでした。');
    }
  };
  const saveGear = async () => {
    if (!gear.name.trim()) return setError('機材名を入力してください。');
    const payload = {
      ...gear,
      name: gear.name.trim(),
      maker_model: gear.maker_model.trim(),
      memo: gear.memo.trim(),
      purchased_on: gear.purchased_on || null,
      last_service_on: gear.last_service_on || null,
      next_service_on: gear.next_service_on || null,
      user_id: user.id
    };
    const client = requireSupabase();
    const result = editing
      ? await client.from('gear_notes').update(payload).eq('id', editing)
      : await client.from('gear_notes').insert(payload);
    if (result.error) setError(result.error.message);
    else {
      setGear(emptyGear);
      setEditing(null);
      await load();
    }
  };
  const editGear = (note: GearNote) => {
    setEditing(note.id);
    setGear({
      name: note.name,
      maker_model: note.maker_model,
      purchased_on: note.purchased_on ?? '',
      last_service_on: note.last_service_on ?? '',
      next_service_on: note.next_service_on ?? '',
      memo: note.memo
    });
  };
  const changePassword = async () => {
    if (password.length < 8) return setError('パスワードは8文字以上で入力してください。');
    if (password !== confirmation) return setError('確認用パスワードが一致しません。');
    const result = await requireSupabase().auth.updateUser({ password });
    if (result.error) setError(result.error.message);
    else {
      setPassword('');
      setConfirmation('');
      setMessage('パスワードを変更しました。');
    }
  };
  return (
    <>
      <p className="kicker">アカウント</p>
      <h1>マイページ</h1>
      <div className="account-tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'profile' && (
        <section className="panel form-panel">
          <h2>プロフィール</h2>
          <div className="profile-avatar">
            <Avatar name={draft.display_name} path={draft.avatar_path} />
            <label>
              アイコン画像
              <input
                className="file-input"
                type="file"
                accept="image/jpeg,image/webp"
                onChange={(e) => void uploadAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <label>
            表示名
            <input
              maxLength={20}
              value={draft.display_name}
              onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
            />
          </label>
          <label>
            自己紹介・ひとこと
            <textarea
              maxLength={200}
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
            <span className="field-help">残り {200 - draft.bio.length} 文字</span>
          </label>
          <button
            className="button"
            onClick={() =>
              void saveProfile({ display_name: draft.display_name.trim(), bio: draft.bio })
            }
          >
            保存
          </button>
        </section>
      )}
      {tab === 'experience' && (
        <section className="panel form-panel">
          <h2>ダイビング経験</h2>
          <label>
            ライセンス
            <input
              list="licenses"
              maxLength={60}
              value={draft.license}
              onChange={(e) => setDraft({ ...draft, license: e.target.value })}
            />
          </label>
          <datalist id="licenses">
            <option value="BSAC オーシャンダイバー" />
            <option value="PADI オープン・ウォーター" />
            <option value="NAUI スクーバダイバー" />
            <option value="SSI オープン・ウォーター" />
          </datalist>
          <label>
            経験本数
            <input
              type="number"
              min="0"
              max="100000"
              value={draft.dive_count ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, dive_count: e.target.value ? Number(e.target.value) : null })
              }
            />
          </label>
          <label>
            よく潜る海
            <input
              maxLength={100}
              value={draft.favorite_areas}
              onChange={(e) => setDraft({ ...draft, favorite_areas: e.target.value })}
            />
          </label>
          <button
            className="button"
            onClick={() =>
              void saveProfile({
                license: draft.license,
                dive_count: draft.dive_count,
                favorite_areas: draft.favorite_areas
              })
            }
          >
            保存
          </button>
        </section>
      )}
      {tab === 'posts' && (
        <section>
          <h2>自分の投稿</h2>
          <div className="admin-list">
            {threads.map((item) => (
              <Link className="panel" key={`t${item.id}`} to={`/board/${item.id}`}>
                {item.title}
              </Link>
            ))}
            {posts.map((item) => (
              <Link className="panel" key={`p${item.id}`} to={`/board/${item.thread_id}`}>
                {item.body.slice(0, 80) || '画像のみの返信'}
              </Link>
            ))}
            {!threads.length && !posts.length && <p>投稿はまだありません。</p>}
          </div>
        </section>
      )}
      {tab === 'gear' && (
        <section>
          <div className="section-heading">
            <h2>機材メモ</h2>
            <Link to="/docs/gear-signs">機材の劣化サイン</Link>
          </div>
          <div className="admin-list">
            {notes.map((note) => {
              const badge = serviceBadge(note.next_service_on);
              return (
                <article className="panel" key={note.id}>
                  <b>{note.name}</b>
                  {badge && (
                    <span className={`service-badge ${badge}`}>
                      {badge === 'overdue' ? '点検期限超過' : '30日以内に点検'}
                    </span>
                  )}
                  <p className="meta">
                    {note.maker_model} {note.next_service_on && `・次回 ${note.next_service_on}`}
                  </p>
                  <button onClick={() => editGear(note)}>編集</button>
                  <button
                    onClick={async () => {
                      await requireSupabase().from('gear_notes').delete().eq('id', note.id);
                      await load();
                    }}
                  >
                    削除
                  </button>
                </article>
              );
            })}
          </div>
          <div className="panel form-panel">
            <h3>{editing ? '機材メモを編集' : '機材メモを追加'}</h3>
            <label>
              機材名
              <input
                maxLength={60}
                value={gear.name}
                onChange={(e) => setGear({ ...gear, name: e.target.value })}
              />
            </label>
            <label>
              メーカー・型番
              <input
                maxLength={80}
                value={gear.maker_model}
                onChange={(e) => setGear({ ...gear, maker_model: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                購入日
                <input
                  type="date"
                  value={gear.purchased_on}
                  onChange={(e) => setGear({ ...gear, purchased_on: e.target.value })}
                />
              </label>
              <label>
                最終点検日
                <input
                  type="date"
                  value={gear.last_service_on}
                  onChange={(e) => setGear({ ...gear, last_service_on: e.target.value })}
                />
              </label>
              <label>
                次回点検日
                <input
                  type="date"
                  value={gear.next_service_on}
                  onChange={(e) => setGear({ ...gear, next_service_on: e.target.value })}
                />
              </label>
            </div>
            <label>
              メモ
              <textarea
                maxLength={500}
                value={gear.memo}
                onChange={(e) => setGear({ ...gear, memo: e.target.value })}
              />
            </label>
            <button className="button" onClick={() => void saveGear()}>
              保存
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(null);
                  setGear(emptyGear);
                }}
              >
                取消
              </button>
            )}
          </div>
        </section>
      )}
      {tab === 'account' && (
        <section className="panel form-panel">
          <h2>アカウント</h2>
          <label>
            新しいパスワード
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label>
            確認用パスワード
            <input
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <button className="button" onClick={() => void changePassword()}>
            パスワードを変更
          </button>
          <button
            className="button-secondary"
            onClick={async () => {
              await supabase?.auth.signOut();
            }}
          >
            ログアウト
          </button>
        </section>
      )}
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </>
  );
}
