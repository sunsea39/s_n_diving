import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import {
  DEFAULT_AVATAR_STYLE,
  DiverAvatar,
  FACE,
  HAIR,
  PALETTE,
  PRESETS,
  type AvatarStyle
} from '../components/DiverAvatar';
import { cropAvatar } from '../lib/accounts';
import { serviceBadge, serviceBadgeLabel, totalDiveCount, validateDisplayName } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';
import { requireSupabase, supabase } from '../lib/supabase';
import type { Bookmark, DiveLog, GearNote, Post, Profile, Thread } from '../types';
import { useAppData } from '../context/AppDataContext';

type Tab = 'profile' | 'experience' | 'bookmarks' | 'posts' | 'gear' | 'account';
const tabs: [Tab, string][] = [
  ['profile', 'プロフィール'],
  ['experience', 'ダイビング経験'],
  ['bookmarks', 'ブックマーク'],
  ['posts', '自分の投稿'],
  ['gear', '機材メモ'],
  ['account', 'アカウント']
];
const emptyGear = {
  name: '',
  maker_model: '',
  purchased_on: '',
  last_service_on: '',
  memo: ''
};

export function MyPage() {
  usePageTitle('マイページ');
  const { user, profile, refreshSession } = useAppData();
  const [tab, setTab] = useState<Tab>('profile');
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [notes, setNotes] = useState<GearNote[]>([]);
  const [logs, setLogs] = useState<DiveLog[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [profileEditing, setProfileEditing] = useState(false);
  const [experienceEditing, setExperienceEditing] = useState(false);
  const [style, setStyle] = useState<AvatarStyle>(DEFAULT_AVATAR_STYLE);
  const [log, setLog] = useState({
    dived_on: new Date().toISOString().slice(0, 10),
    prefecture: '海外',
    location: '',
    service: '',
    dives: 1,
    comment: ''
  });
  const [editingLog, setEditingLog] = useState<string | null>(null);
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
    const [notesResult, threadResult, postResult, logsResult, bookmarksResult] = await Promise.all([
      client
        .from('gear_notes')
        .select('*')
        .order('last_service_on', { ascending: false, nullsFirst: false }),
      client
        .from('threads')
        .select('*')
        .eq('author_uid', user.id)
        .order('created_at', { ascending: false }),
      client
        .from('posts')
        .select('*, threads(title)')
        .eq('author_uid', user.id)
        .order('created_at', { ascending: false }),
      client.from('dive_logs').select('*').order('dived_on', { ascending: false }),
      client.from('bookmarks').select('*').order('created_at', { ascending: false })
    ]);
    if (!notesResult.error) setNotes(notesResult.data as GearNote[]);
    if (!threadResult.error) setThreads(threadResult.data as Thread[]);
    if (!postResult.error) setPosts(postResult.data as Post[]);
    if (!logsResult.error) setLogs(logsResult.data as DiveLog[]);
    if (!bookmarksResult.error) setBookmarks(bookmarksResult.data as Bookmark[]);
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
      await saveProfile({ avatar_path: path, avatar_style: null });
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
  const saveLog = async () => {
    const payload = {
      ...log,
      location: log.location.trim(),
      service: log.service.trim(),
      comment: log.comment.trim(),
      dives: Number(log.dives),
      user_id: user.id
    };
    const result = editingLog
      ? await requireSupabase().from('dive_logs').update(payload).eq('id', editingLog)
      : await requireSupabase().from('dive_logs').insert(payload);
    if (result.error) setError(result.error.message);
    else {
      setLog({
        dived_on: new Date().toISOString().slice(0, 10),
        prefecture: '海外',
        location: '',
        service: '',
        dives: 1,
        comment: ''
      });
      setEditingLog(null);
      await load();
      await refreshSession();
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
          {!profileEditing ? (
            <>
              <div className="profile-avatar">
                <Avatar
                  name={draft.display_name}
                  path={draft.avatar_path}
                  style={draft.avatar_style}
                />
                <div>
                  <b>{draft.display_name}</b>
                  <p>{draft.bio || '自己紹介はまだありません。'}</p>
                </div>
              </div>
              <dl className="profile-stats">
                <dt>経験本数</dt>
                <dd>{totalDiveCount(draft.dive_count, draft.logged_dives)}本</dd>
                <dt>最後にダイビングした日</dt>
                <dd>{draft.last_dived_on ?? 'まだ記録がありません'}</dd>
              </dl>
              <button className="button" onClick={() => setProfileEditing(true)}>
                プロフィールを編集
              </button>
            </>
          ) : (
            <>
              <div className="profile-avatar">
                <Avatar
                  name={draft.display_name}
                  path={draft.avatar_path}
                  style={draft.avatar_style}
                />
                <label>
                  写真・画像をアップロード
                  <input
                    className="file-input"
                    type="file"
                    accept="image/jpeg,image/webp"
                    onChange={(e) => void uploadAvatar(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="avatar-editor">
                <b>ダイバーのイラストを選ぶ</b>
                <DiverAvatar style={style} />
                <div className="avatar-presets">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      aria-pressed={JSON.stringify(style) === JSON.stringify(preset)}
                      onClick={() =>
                        setStyle({
                          skin: preset.skin,
                          hair: preset.hair,
                          hairColor: preset.hairColor,
                          face: preset.face,
                          suit: preset.suit,
                          bg: preset.bg,
                          mask: preset.mask
                        })
                      }
                    >
                      <DiverAvatar style={preset} />
                      <small>{preset.name}</small>
                    </button>
                  ))}
                </div>
                <div className="avatar-customize">
                  <b>自分で組み合わせる</b>
                  <div>
                    <small>髪形</small>
                    {Object.entries(HAIR).map(([key, value]) => (
                      <button
                        key={key}
                        aria-pressed={style.hair === key}
                        onClick={() => setStyle({ ...style, hair: key as AvatarStyle['hair'] })}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <small>髪の色</small>
                    {Object.keys(PALETTE.hair).map((key) => (
                      <button
                        key={key}
                        aria-pressed={style.hairColor === key}
                        onClick={() =>
                          setStyle({ ...style, hairColor: key as AvatarStyle['hairColor'] })
                        }
                        style={{ backgroundColor: PALETTE.hair[key as AvatarStyle['hairColor']] }}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  <div>
                    <small>肌の色</small>
                    {Object.keys(PALETTE.skin).map((key) => (
                      <button
                        key={key}
                        aria-pressed={style.skin === key}
                        onClick={() => setStyle({ ...style, skin: key as AvatarStyle['skin'] })}
                        style={{ backgroundColor: PALETTE.skin[key as AvatarStyle['skin']] }}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  <div>
                    <small>表情</small>
                    {Object.entries(FACE).map(([key, value]) => (
                      <button
                        key={key}
                        aria-pressed={style.face === key}
                        onClick={() => setStyle({ ...style, face: key as AvatarStyle['face'] })}
                      >
                        {value.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <small>ウェットスーツ</small>
                    {Object.keys(PALETTE.suit).map((key) => (
                      <button
                        key={key}
                        aria-pressed={style.suit === key}
                        onClick={() => setStyle({ ...style, suit: key as AvatarStyle['suit'] })}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  <div>
                    <small>背景</small>
                    {Object.keys(PALETTE.bg).map((key) => (
                      <button
                        key={key}
                        aria-pressed={style.bg === key}
                        onClick={() => setStyle({ ...style, bg: key as AvatarStyle['bg'] })}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={style.mask}
                    onChange={(e) => setStyle({ ...style, mask: e.target.checked })}
                  />
                  マスクあり
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
              </label>
              <div className="button-row">
                <button
                  className="button"
                  onClick={() => {
                    void saveProfile({
                      display_name: draft.display_name.trim(),
                      bio: draft.bio,
                      avatar_style: style,
                      avatar_path: null
                    });
                    setProfileEditing(false);
                  }}
                >
                  保存
                </button>
                <button
                  className="button-secondary"
                  onClick={() => {
                    setDraft(profile);
                    setProfileEditing(false);
                  }}
                >
                  キャンセル
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {tab === 'experience' && (
        <section>
          <div className="panel form-panel">
            <div className="section-heading">
              <h2>ダイビング経験</h2>
              <button
                className="button-secondary"
                onClick={() => setExperienceEditing(!experienceEditing)}
              >
                {experienceEditing ? '表示に戻る' : '編集'}
              </button>
            </div>
            {experienceEditing ? (
              <>
                <label>
                  初期の経験本数
                  <input
                    type="number"
                    min="0"
                    value={draft.dive_count ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        dive_count: e.target.value ? Number(e.target.value) : null
                      })
                    }
                  />
                </label>
                <label>
                  好きな海
                  <input
                    maxLength={100}
                    value={draft.favorite_areas}
                    onChange={(e) => setDraft({ ...draft, favorite_areas: e.target.value })}
                  />
                </label>
                <label>
                  ライセンス（団体・ランクを1行ずつ）
                  <textarea
                    value={(draft.licenses ?? []).map((x) => `${x.org}｜${x.rank}`).join('\n')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        licenses: e.target.value
                          .split('\n')
                          .filter(Boolean)
                          .slice(0, 5)
                          .map((line) => {
                            const [org, rank] = line.split('｜');
                            return { org: org || 'その他', rank: rank || '' };
                          })
                      })
                    }
                  />
                </label>
                <button
                  className="button"
                  onClick={() =>
                    void saveProfile({
                      licenses: draft.licenses,
                      dive_count: draft.dive_count,
                      favorite_areas: draft.favorite_areas
                    })
                  }
                >
                  保存
                </button>
              </>
            ) : (
              <dl className="profile-stats">
                <dt>ライセンス</dt>
                <dd>
                  {(draft.licenses ?? []).map((x) => `${x.org} ${x.rank}`).join('、') || '未登録'}
                </dd>
                <dt>経験本数</dt>
                <dd>
                  {totalDiveCount(draft.dive_count, draft.logged_dives)}本{' '}
                  <small>
                    （初期 {draft.dive_count ?? 0}本＋記録 {draft.logged_dives ?? 0}本）
                  </small>
                </dd>
                <dt>好きな海</dt>
                <dd>{draft.favorite_areas || '未登録'}</dd>
                <dt>最後にダイビングした日</dt>
                <dd>{draft.last_dived_on ?? 'まだ記録がありません'}</dd>
              </dl>
            )}
          </div>
          <div className="section-heading">
            <h2>ダイビング記録</h2>
          </div>
          <div className="admin-list">
            {logs.map((item) => (
              <article className="panel" key={item.id}>
                <b>
                  {item.dived_on} ・ {item.prefecture} {item.location} ・ {item.dives}本
                </b>
                <p className="meta">
                  {item.service}
                  {item.comment && ` ・ ${item.comment}`}
                </p>
                <button
                  onClick={() => {
                    setEditingLog(item.id);
                    setLog({
                      dived_on: item.dived_on,
                      prefecture: item.prefecture,
                      location: item.location,
                      service: item.service,
                      dives: item.dives,
                      comment: item.comment
                    });
                  }}
                >
                  編集
                </button>
                <button
                  onClick={async () => {
                    await requireSupabase().from('dive_logs').delete().eq('id', item.id);
                    await load();
                    await refreshSession();
                  }}
                >
                  削除
                </button>
              </article>
            ))}
          </div>
          <div className="panel form-panel">
            <h3>{editingLog ? '記録を編集' : '＋ 記録を追加'}</h3>
            <div className="form-grid">
              <label>
                潜った日
                <input
                  type="date"
                  value={log.dived_on}
                  onChange={(e) => setLog({ ...log, dived_on: e.target.value })}
                />
              </label>
              <label>
                場所
                <select
                  value={log.prefecture}
                  onChange={(e) => setLog({ ...log, prefecture: e.target.value })}
                >
                  <option>海外</option>
                  <optgroup label="関東">
                    <option>東京都</option>
                    <option>神奈川県</option>
                    <option>千葉県</option>
                    <option>埼玉県</option>
                    <option>茨城県</option>
                    <option>栃木県</option>
                    <option>群馬県</option>
                  </optgroup>
                  <optgroup label="中部・近畿">
                    <option>静岡県</option>
                    <option>愛知県</option>
                    <option>三重県</option>
                    <option>和歌山県</option>
                    <option>大阪府</option>
                    <option>兵庫県</option>
                  </optgroup>
                  <optgroup label="九州・沖縄">
                    <option>福岡県</option>
                    <option>鹿児島県</option>
                    <option>沖縄県</option>
                  </optgroup>
                  <optgroup label="全国（その他）">
                    <option>北海道</option>
                    <option>青森県</option>
                    <option>岩手県</option>
                    <option>宮城県</option>
                    <option>秋田県</option>
                    <option>山形県</option>
                    <option>福島県</option>
                    <option>新潟県</option>
                    <option>富山県</option>
                    <option>石川県</option>
                    <option>福井県</option>
                    <option>山梨県</option>
                    <option>長野県</option>
                    <option>岐阜県</option>
                    <option>滋賀県</option>
                    <option>京都府</option>
                    <option>奈良県</option>
                    <option>鳥取県</option>
                    <option>島根県</option>
                    <option>岡山県</option>
                    <option>広島県</option>
                    <option>山口県</option>
                    <option>徳島県</option>
                    <option>香川県</option>
                    <option>愛媛県</option>
                    <option>高知県</option>
                    <option>佐賀県</option>
                    <option>長崎県</option>
                    <option>熊本県</option>
                    <option>大分県</option>
                    <option>宮崎県</option>
                  </optgroup>
                </select>
              </label>
              <label>
                {log.prefecture === '海外' ? '国・地域／ポイント' : 'ロケーション'}
                <input
                  maxLength={40}
                  value={log.location}
                  onChange={(e) => setLog({ ...log, location: e.target.value })}
                />
              </label>
              <label>
                使ったサービス
                <input
                  maxLength={60}
                  value={log.service}
                  onChange={(e) => setLog({ ...log, service: e.target.value })}
                />
              </label>
              <label>
                潜った本数
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={log.dives}
                  onChange={(e) => setLog({ ...log, dives: Number(e.target.value) })}
                />
              </label>
            </div>
            <label>
              コメント
              <textarea
                maxLength={300}
                value={log.comment}
                onChange={(e) => setLog({ ...log, comment: e.target.value })}
              />
            </label>
            <button className="button" onClick={() => void saveLog()}>
              保存
            </button>
          </div>
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
      {tab === 'bookmarks' && (
        <section>
          <h2>ブックマーク</h2>
          <div className="admin-list">
            {bookmarks.map((item) => (
              <article className="panel" key={item.id}>
                <Link to={`/docs/${item.doc_slug}${item.anchor ? `#${item.anchor}` : ''}`}>
                  <b>{item.doc_slug}</b> ・ {item.label}
                </Link>
                <button
                  onClick={async () => {
                    await requireSupabase().from('bookmarks').delete().eq('id', item.id);
                    await load();
                  }}
                >
                  削除
                </button>
              </article>
            ))}
            {!bookmarks.length && <p className="empty">ブックマークはまだありません。</p>}
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
              const badge = serviceBadge(note.last_service_on);
              return (
                <article className="panel" key={note.id}>
                  <b>{note.name}</b>
                  <span className={`service-badge ${badge}`}>
                    {serviceBadgeLabel(note.last_service_on)}
                  </span>
                  <p className="meta">
                    {note.maker_model} {note.last_service_on && `・前回 ${note.last_service_on}`}
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
