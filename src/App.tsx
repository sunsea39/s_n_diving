import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppDataProvider, useAppData } from './context/AppData';
import { DocCard, DocContent } from './components/DocContent';
import { resizeToJpeg } from './lib/images';
import { relativeDate, validateDisplayName, validateReply, validateThreadInput } from './lib/logic';
import { requireSupabase, supabase } from './lib/supabase';
import { PlainText } from './lib/text';
import type { BoardCategory, HiyariFields, Post, Thread } from './types';

const categories: Array<{ id: BoardCategory; label: string }> = [
  { id: 'hiyari', label: 'ヒヤリハット' },
  { id: 'plan', label: '計画' },
  { id: 'gear', label: '機材' },
  { id: 'chat', label: '雑談' }
];

function usePageTitle(title: string) {
  useEffect(() => { document.title = `${title} | S×N_Diving`; }, [title]);
}

function PageNotice() {
  const { configured } = useAppData();
  return configured ? null : <p className="notice">Supabase が未設定です。現在は同梱資料のみ表示しています。</p>;
}

function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header"><div className="header-inner">
        <Link to="/" className="brand">S×N_Diving</Link>
        <nav className="desktop-nav" aria-label="メインメニュー">
          <NavLink to="/" end>ホーム</NavLink><NavLink to="/docs">資料</NavLink><NavLink to="/board">掲示板</NavLink><NavLink to="/join">その他</NavLink><NavLink className="admin-link" to="/admin">管理</NavLink>
        </nav>
      </div></header>
      <main><PageNotice /><Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:slug" element={<DocDetailPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/board" element={<BoardGuard><BoardPage /></BoardGuard>} />
        <Route path="/board/new" element={<BoardGuard><NewThreadPage /></BoardGuard>} />
        <Route path="/board/:id" element={<BoardGuard><ThreadPage /></BoardGuard>} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/*" element={<AdminGuard><AdminRoutes /></AdminGuard>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes></main>
      <footer className="site-footer"><div className="footer-inner">S×N_Diving ・ 仲間内専用ページです。URL の取り扱いに注意してください</div></footer>
      <nav className="bottom-tabs" aria-label="モバイルメニュー"><NavLink to="/" end>ホーム</NavLink><NavLink to="/docs">資料</NavLink><NavLink to="/board">掲示板</NavLink><NavLink to="/join">その他</NavLink></nav>
    </div>
  );
}

function TopPage() {
  usePageTitle('ホーム');
  const { docs, news, isBoardMember, loading } = useAppData();
  const nextDive = news.find((item) => item.next_dive_at);
  return <>
    <section className="hero">
      <p className="kicker">仲間内の安全情報</p><h1>安全に、気持ちよく潜るために。</h1>
      <p>潜る前の機材チェックと、仲間どうしの小さな気づきをここに残します。</p>
      <div className="next-dive"><b>次回の予定</b><p>{nextDive ? `${new Date(nextDive.next_dive_at as string).toLocaleString('ja-JP')} ${nextDive.next_dive_place ?? ''}` : '次回の予定は未定です。'}</p></div>
      <div className="button-row"><Link className="button" to="/docs">資料を見る</Link>{isBoardMember ? <Link className="button-secondary" to="/board">掲示板を見る</Link> : <Link className="button-secondary" to="/join?next=/board">合言葉を入れて見る</Link>}</div>
    </section>
    <section><div className="section-heading"><h2>お知らせ</h2></div>{loading ? <p>読み込み中です…</p> : news.slice(0, 3).length ? <div className="news-list">{news.slice(0, 3).map((item) => <Link className="panel news-row" to={`/news/${item.id}`} key={item.id}><span className="meta">{item.pinned && '固定 ・ '}{item.published_at ? relativeDate(item.published_at) : ''}</span><b>{item.title}</b></Link>)}</div> : <p className="empty">お知らせはまだありません。</p>}</section>
    <section><div className="section-heading"><h2>資料</h2><Link to="/docs">一覧へ</Link></div><div className="card-grid">{docs.slice(0, 3).map((doc) => <DocCard doc={doc} key={doc.slug} />)}</div></section>
    <section><div className="section-heading"><h2>掲示板の新着</h2><Link to={isBoardMember ? '/board' : '/join?next=/board'}>{isBoardMember ? '一覧へ' : '合言葉を入れて見る'}</Link></div><RecentThreads /></section>
  </>;
}

function RecentThreads() {
  const { configured, isBoardMember } = useAppData();
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => { if (configured && isBoardMember) void requireSupabase().from('threads').select('*').order('last_post_at', { ascending: false }).limit(3).then(({ data }) => setThreads((data ?? []) as Thread[])); }, [configured, isBoardMember]);
  if (!isBoardMember) return <p className="empty">掲示板は合言葉を入力した仲間だけが見られます。</p>;
  return threads.length ? <div className="thread-list">{threads.map((thread) => <ThreadRow key={thread.id} thread={thread} />)}</div> : <p className="empty">まだ投稿はありません。</p>;
}

function DocsPage() {
  usePageTitle('資料');
  const { docs } = useAppData();
  return <><p className="kicker">資料</p><h1>安全資料</h1><p className="lead">潜る前に、仲間どうしで確認したい情報です。</p><div className="card-grid">{docs.map((doc) => <DocCard doc={doc} key={doc.slug} />)}</div></>;
}

function DocDetailPage() {
  const { slug } = useParams(); const { docs, disclaimer } = useAppData(); const doc = docs.find((item) => item.slug === slug); usePageTitle(doc?.title ?? '資料');
  const displayDoc = doc && disclaimer ? { ...doc, body: { ...doc.body, disclaimer } } : doc;
  return displayDoc ? <DocContent doc={displayDoc} /> : <NotFoundPage />;
}

function NewsDetailPage() {
  const { id } = useParams(); const { news } = useAppData(); const item = news.find((entry) => entry.id === id); usePageTitle(item?.title ?? 'お知らせ');
  return item ? <article className="panel thread-header"><p className="kicker">お知らせ</p><h1>{item.title}</h1><p className="meta">{item.published_at ? new Date(item.published_at).toLocaleString('ja-JP') : ''}</p>{item.next_dive_at && <p><b>次回予定：</b>{new Date(item.next_dive_at).toLocaleString('ja-JP')} {item.next_dive_place}</p>}<p className="post-body"><PlainText text={item.body} /></p></article> : <NotFoundPage />;
}

function JoinPage() {
  usePageTitle('合言葉');
  const { configured, refreshSession } = useAppData(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [name, setName] = useState(() => localStorage.getItem('sn-diving-name') ?? ''); const [passcode, setPasscode] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); const invalid = validateDisplayName(name); if (invalid) return setError(invalid); if (!passcode) return setError('合言葉を入力してください。'); if (!supabase) return setError('Supabase が未設定です。');
    setBusy(true); const session = await supabase.auth.getSession(); if (!session.data.session) { const result = await supabase.auth.signInAnonymously(); if (result.error) { setBusy(false); return setError(result.error.message); } }
    const profile = await supabase.auth.updateUser({ data: { display_name: name.trim() } }); if (profile.error) { setBusy(false); return setError(profile.error.message); }
    const result = await supabase.rpc('join_board', { p_passcode: passcode }); setBusy(false); if (result.error) return setError(result.error.message);
    localStorage.setItem('sn-diving-name', name.trim()); await refreshSession(); const next = params.get('next'); navigate(next?.startsWith('/board') ? next : '/board');
  };
  return <><p className="kicker">掲示板</p><h1>合言葉を入力</h1><p>掲示板は仲間内専用です。表示名はこの端末にだけ保存されます。</p><form className="panel form-panel" onSubmit={submit}><div className="form-grid"><label>表示名<input maxLength={20} value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" /></label><label>合言葉<input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="current-password" /></label></div>{error && <p className="error">{error}</p>}<div className="button-row"><button className="button" disabled={!configured || busy}>{busy ? '確認中…' : '掲示板に入る'}</button></div></form></>;
}

function BoardGuard({ children }: { children: React.ReactNode }) {
  const { configured, isBoardMember, authChecked } = useAppData(); const location = useLocation();
  if (!configured) return <SetupOnlyPage />;
  if (!authChecked) return <p>セッションを確認中です…</p>;
  if (!isBoardMember) return <Navigate to={`/join?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

function SetupOnlyPage() { usePageTitle('掲示板'); return <section><h1>Supabase が未設定です</h1><p>掲示板を利用するには Supabase の環境変数を設定してください。資料は閲覧できます。</p><Link className="button" to="/docs">資料を見る</Link></section>; }

function BoardPage() {
  usePageTitle('掲示板'); const [category, setCategory] = useState<BoardCategory | 'all'>('all'); const [threads, setThreads] = useState<Thread[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; setLoading(true); let query = requireSupabase().from('threads').select('*').order('last_post_at', { ascending: false }); if (category !== 'all') query = query.eq('category', category); void query.then(({ data }) => { if (active) { setThreads((data ?? []) as Thread[]); setLoading(false); } }); return () => { active = false; }; }, [category]);
  return <><div className="section-heading"><div><p className="kicker">掲示板</p><h1>みんなの記録</h1></div><Link className="button" to="/board/new">新規投稿</Link></div><div className="category-row" aria-label="カテゴリ絞り込み"><button className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>すべて</button>{categories.map((item) => <button key={item.id} className={category === item.id ? 'selected' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>{loading ? <p>読み込み中です…</p> : threads.length ? <div className="thread-list">{threads.map((thread) => <ThreadRow key={thread.id} thread={thread} />)}</div> : <p className="empty">このカテゴリの投稿はまだありません。</p>}</>;
}

function ThreadRow({ thread }: { thread: Thread }) { return <Link className="panel thread-row" to={`/board/${thread.id}`}><span className={`category ${thread.category}`}>{categories.find((item) => item.id === thread.category)?.label}</span><b>{thread.title}</b><span className="meta">{thread.author_name} ・ {relativeDate(thread.last_post_at)} ・ 返信 {thread.reply_count}件</span></Link>; }

async function uploadBoardImage(file: File, userId: string): Promise<string> {
  const resized = await resizeToJpeg(file); const path = `${userId}/${crypto.randomUUID()}.jpg`; const result = await requireSupabase().storage.from('board-images').upload(path, resized, { contentType: 'image/jpeg', upsert: false }); if (result.error) throw result.error; return path;
}

function NewThreadPage() {
  usePageTitle('新規投稿'); const navigate = useNavigate(); const { user } = useAppData(); const [category, setCategory] = useState<BoardCategory>('hiyari'); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [hiyari, setHiyari] = useState<HiyariFields>({ what: '', why: '', next: '' }); const [file, setFile] = useState<File | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const invalid = validateThreadInput({ title, body, category, hiyari }); if (invalid) return setError(invalid); if (!user) return setError('セッションを確認できません。もう一度お試しください。'); setBusy(true); setError(''); try { const image_path = file ? await uploadBoardImage(file, user.id) : null; const result = await requireSupabase().from('threads').insert({ category, title: title.trim(), body: category === 'hiyari' ? '' : body.trim(), hiyari: category === 'hiyari' ? hiyari : null, image_path, author_name: localStorage.getItem('sn-diving-name') ?? '名無し', author_uid: user.id }).select().single(); if (result.error) throw result.error; navigate(`/board/${result.data.id}`); } catch (cause) { setError(cause instanceof Error ? cause.message : '投稿できませんでした。'); } finally { setBusy(false); } };
  const hiyariField = (key: keyof HiyariFields, label: string) => <label>{label}<textarea value={hiyari[key]} maxLength={4000} onChange={(event) => setHiyari({ ...hiyari, [key]: event.target.value })} /></label>;
  return <><p className="kicker">掲示板</p><h1>新規投稿</h1><form className="panel form-panel" onSubmit={submit}><div className="form-grid"><label>カテゴリ<select value={category} onChange={(event) => setCategory(event.target.value as BoardCategory)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>タイトル<input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} /><span className="field-help">60文字まで</span></label>{category === 'hiyari' ? <>{hiyariField('what', '何が起きた？')}{hiyariField('why', 'なぜ起きた？')}{hiyariField('next', '次はどうする？')}</> : <label>本文<textarea value={body} maxLength={4000} onChange={(event) => setBody(event.target.value)} /><span className="field-help">4000文字まで</span></label>}<label>画像（1枚まで・JPEGに縮小してアップロード）<input className="file-input" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label></div>{error && <p className="error">{error}</p>}<div className="button-row"><button className="button" disabled={busy}>{busy ? '投稿中…' : '投稿する'}</button><Link className="button-secondary" to="/board">戻る</Link></div></form></>;
}

function ThreadPage() {
  const { id } = useParams(); const { user } = useAppData(); const [thread, setThread] = useState<Thread | null>(null); const [posts, setPosts] = useState<Post[]>([]); const [reply, setReply] = useState(''); const [file, setFile] = useState<File | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); usePageTitle(thread?.title ?? '掲示板');
  const load = useCallback(async () => { const client = requireSupabase(); const [threadResult, postResult] = await Promise.all([client.from('threads').select('*').eq('id', id as string).single(), client.from('posts').select('*').eq('thread_id', id as string).order('created_at')]); if (!threadResult.error) setThread(threadResult.data as Thread); if (!postResult.error) setPosts(postResult.data as Post[]); }, [id]);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const invalid = validateReply(reply); if (invalid) return setError(invalid); if (!user || !thread) return; setBusy(true); setError(''); try { const image_path = file ? await uploadBoardImage(file, user.id) : null; const result = await requireSupabase().from('posts').insert({ thread_id: thread.id, body: reply.trim(), image_path, author_name: localStorage.getItem('sn-diving-name') ?? '名無し', author_uid: user.id }); if (result.error) throw result.error; setReply(''); setFile(null); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : '返信できませんでした。'); } finally { setBusy(false); } };
  if (!thread) return <p>読み込み中です…</p>;
  return <><article className="panel thread-header"><span className={`category ${thread.category}`}>{categories.find((item) => item.id === thread.category)?.label}</span><h1>{thread.title}</h1><p className="meta">{thread.author_name} ・ {new Date(thread.created_at).toLocaleString('ja-JP')}</p><ThreadBody thread={thread} /><BoardImage path={thread.image_path} />{user?.id === thread.author_uid && <ThreadOwnerActions thread={thread} onChange={load} />}</article><section><div className="section-heading"><h2>返信 {posts.length}件</h2></div>{posts.map((post) => <PostCard key={post.id} post={post} currentUserId={user?.id} onChange={load} />)}</section><form className="panel form-panel" onSubmit={submit}><h2>返信する</h2><label>本文<textarea maxLength={2000} value={reply} onChange={(event) => setReply(event.target.value)} /></label><label>画像（1枚まで）<input className="file-input" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>{error && <p className="error">{error}</p>}<button className="button" disabled={busy}>{busy ? '投稿中…' : '返信する'}</button></form></>;
}

function ThreadBody({ thread }: { thread: Thread }) { return thread.category === 'hiyari' && thread.hiyari ? <div className="hiyari-view"><div><b>何が起きた？</b><p><PlainText text={thread.hiyari.what} /></p></div><div><b>なぜ起きた？</b><p><PlainText text={thread.hiyari.why} /></p></div><div><b>次はどうする？</b><p><PlainText text={thread.hiyari.next} /></p></div></div> : <p className="post-body"><PlainText text={thread.body} /></p>; }

function BoardImage({ path }: { path: string | null }) { const [url, setUrl] = useState(''); useEffect(() => { if (path) void requireSupabase().storage.from('board-images').createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? '')); }, [path]); return url ? <img className="board-image" src={url} alt="投稿された画像" /> : null; }

function ThreadOwnerActions({ thread, onChange }: { thread: Thread; onChange: () => Promise<void> }) {
  const navigate = useNavigate(); const [editing, setEditing] = useState(false); const [title, setTitle] = useState(thread.title); const [body, setBody] = useState(thread.body); const [hiyari, setHiyari] = useState<HiyariFields>(thread.hiyari ?? { what: '', why: '', next: '' }); const [error, setError] = useState('');
  const save = async () => { const invalid = validateThreadInput({ title, body, category: thread.category, hiyari }); if (invalid) return setError(invalid); const result = await requireSupabase().from('threads').update({ title: title.trim(), body: thread.category === 'hiyari' ? '' : body.trim(), hiyari: thread.category === 'hiyari' ? hiyari : null }).eq('id', thread.id); if (result.error) setError(result.error.message); else { setEditing(false); await onChange(); } };
  const remove = async () => { if (window.confirm('このスレッドと返信を削除しますか？')) { const result = await requireSupabase().from('threads').delete().eq('id', thread.id); if (result.error) setError(result.error.message); else navigate('/board'); } };
  if (!editing) return <div className="own-actions"><button onClick={() => setEditing(true)}>編集</button><button onClick={() => void remove()}>削除</button>{error && <span className="error">{error}</span>}</div>;
  return <div className="editor-group"><label>タイトル<input maxLength={60} value={title} onChange={(event) => setTitle(event.target.value)} /></label>{thread.category === 'hiyari' ? <><label>何が起きた？<textarea value={hiyari.what} onChange={(event) => setHiyari({ ...hiyari, what: event.target.value })} /></label><label>なぜ起きた？<textarea value={hiyari.why} onChange={(event) => setHiyari({ ...hiyari, why: event.target.value })} /></label><label>次はどうする？<textarea value={hiyari.next} onChange={(event) => setHiyari({ ...hiyari, next: event.target.value })} /></label></> : <label>本文<textarea value={body} maxLength={4000} onChange={(event) => setBody(event.target.value)} /></label>}{error && <p className="error">{error}</p>}<div className="own-actions"><button onClick={() => void save()}>保存</button><button onClick={() => setEditing(false)}>取消</button></div></div>;
}

function PostCard({ post, currentUserId, onChange }: { post: Post; currentUserId?: string; onChange: () => Promise<void> }) { const [editing, setEditing] = useState(false); const [body, setBody] = useState(post.body); const [error, setError] = useState(''); const own = currentUserId === post.author_uid; const update = async () => { const invalid = validateReply(body); if (invalid) return setError(invalid); const result = await requireSupabase().from('posts').update({ body: body.trim() }).eq('id', post.id); if (result.error) setError(result.error.message); else { setEditing(false); await onChange(); } }; const remove = async () => { if (window.confirm('この返信を削除しますか？')) { const result = await requireSupabase().from('posts').delete().eq('id', post.id); if (result.error) setError(result.error.message); else await onChange(); } }; return <article className="panel post"><div className="post-head"><b>{post.author_name}</b><span>{relativeDate(post.created_at)}</span></div>{editing ? <><textarea maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} />{error && <p className="error">{error}</p>}<div className="own-actions"><button onClick={() => void update()}>保存</button><button onClick={() => setEditing(false)}>取消</button></div></> : <><p className="post-body"><PlainText text={post.body} /></p><BoardImage path={post.image_path} />{own && <div className="own-actions"><button onClick={() => setEditing(true)}>編集</button><button onClick={() => void remove()}>削除</button></div>}</>}</article>; }

function AdminGuard({ children }: { children: React.ReactNode }) { const { configured, isAdmin, authChecked } = useAppData(); if (!configured) return <SetupOnlyPage />; if (!authChecked) return <p>セッションを確認中です…</p>; return isAdmin ? <>{children}</> : <Navigate to="/admin/login" replace />; }

function AdminLoginPage() { usePageTitle('管理者ログイン'); const { configured, refreshSession } = useAppData(); const navigate = useNavigate(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!supabase) return; const result = await supabase.auth.signInWithPassword({ email, password }); if (result.error) return setError(result.error.message); await refreshSession(); const admin = await supabase.rpc('is_admin'); if (!admin.data) { await supabase.auth.signOut(); return setError('このアカウントには管理者権限がありません。'); } navigate('/admin'); }; return <><p className="kicker">管理者</p><h1>ログイン</h1><form className="panel form-panel" onSubmit={submit}><div className="form-grid"><label>メールアドレス<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>パスワード<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label></div>{error && <p className="error">{error}</p>}<button className="button" disabled={!configured}>ログイン</button></form></>; }

function AdminRoutes() {
  return <AdminLayout><Routes><Route index element={<AdminDashboard />} /><Route path="docs" element={<AdminDocsList />} /><Route path="docs/new" element={<AdminDocEditor />} /><Route path="docs/:id" element={<AdminDocEditor />} /><Route path="news" element={<AdminNewsList />} /><Route path="news/new" element={<AdminNewsEditor />} /><Route path="news/:id" element={<AdminNewsEditor />} /><Route path="board" element={<AdminBoardPage />} /><Route path="settings" element={<AdminSettingsPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></AdminLayout>;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const entries = [['/admin', '概要'], ['/admin/docs', '資料'], ['/admin/news', 'お知らせ'], ['/admin/board', '投稿管理'], ['/admin/settings', '設定']];
  return <div className="admin-layout"><nav className="admin-tabs" aria-label="管理メニュー">{entries.map(([to, label]) => <Link key={to} to={to} aria-current={location.pathname === to ? 'page' : undefined}>{label}</Link>)}</nav><div>{children}</div></div>;
}

function AdminDashboard() {
  usePageTitle('管理ダッシュボード'); const [stats, setStats] = useState({ published: 0, draft: 0, weekPosts: 0 });
  useEffect(() => { const client = requireSupabase(); const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); void Promise.all([client.from('docs').select('*', { count: 'exact', head: true }).eq('status', 'published'), client.from('docs').select('*', { count: 'exact', head: true }).eq('status', 'draft'), client.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', week)]).then(([published, draft, posts]) => setStats({ published: published.count ?? 0, draft: draft.count ?? 0, weekPosts: posts.count ?? 0 })); }, []);
  return <><p className="kicker">管理者</p><h1>ダッシュボード</h1><div className="dashboard-grid"><div className="panel stat"><span>公開中資料</span><strong>{stats.published}</strong></div><div className="panel stat"><span>下書き</span><strong>{stats.draft}</strong></div><div className="panel stat"><span>今週の投稿</span><strong>{stats.weekPosts}</strong></div></div></>;
}

function AdminDocsList() {
  usePageTitle('資料管理'); const [docs, setDocs] = useState<Array<import('./types').DivingDoc>>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { void requireSupabase().from('docs').select('*').order('sort_order').then(({ data }) => { setDocs((data ?? []) as import('./types').DivingDoc[]); setLoading(false); }); }, []);
  return <><div className="section-heading"><div><p className="kicker">資料</p><h1>資料を管理</h1></div><Link className="button" to="/admin/docs/new">資料を作成</Link></div>{loading ? <p>読み込み中です…</p> : <div className="admin-list">{docs.map((doc) => <Link className="panel news-row" key={doc.id} to={`/admin/docs/${doc.id}`}><span className="meta">{doc.status === 'published' ? '公開中' : '下書き'} ・ 並び順 {doc.sort_order}</span><b>{doc.title}</b><span>{doc.slug}</span></Link>)}</div>}</>;
}

const blankDoc = (): import('./types').DivingDoc => ({ slug: '', title: '', category: '機材', summary: '', icon: 'mask', status: 'draft', sort_order: 0, body: { intro: '', sections: [], habits: [], disclaimer: '' } });
const blankSection = (no: number): import('./types').EquipmentSection => ({ no, name: '', sub: '', icon: 'mask', guideline: '', signs: [] });

function AdminDocEditor() {
  const { id } = useParams(); const navigate = useNavigate(); const { refreshPublic } = useAppData(); const [doc, setDoc] = useState(blankDoc); const [loading, setLoading] = useState(Boolean(id)); const [tab, setTab] = useState<'form' | 'preview'>('form'); const [dirty, setDirty] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(''); usePageTitle(id ? '資料編集' : '資料作成');
  useEffect(() => { if (!id) return; void requireSupabase().from('docs').select('*').eq('id', id).single().then(({ data, error: loadError }) => { if (loadError || !data) setError(loadError?.message ?? '資料が見つかりません。'); else setDoc(data as import('./types').DivingDoc); setLoading(false); }); }, [id]);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; const intercept = (event: MouseEvent) => { const link = (event.target as Element).closest('a'); if (link && !window.confirm('未保存の変更があります。ページを移動しますか？')) { event.preventDefault(); event.stopImmediatePropagation(); } }; window.addEventListener('beforeunload', warn); document.addEventListener('click', intercept, true); return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', intercept, true); }; }, [dirty]);
  const change = <K extends keyof import('./types').DivingDoc>(key: K, value: import('./types').DivingDoc[K]) => { setDoc((current) => ({ ...current, [key]: value })); setDirty(true); };
  const changeBody = (patch: Partial<import('./types').DocBody>) => { setDoc((current) => ({ ...current, body: { ...current.body, ...patch } })); setDirty(true); };
  const updateSection = (index: number, patch: Partial<import('./types').EquipmentSection>) => changeBody({ sections: doc.body.sections.map((section, itemIndex) => itemIndex === index ? { ...section, ...patch } : section) });
  const move = <T,>(items: T[], index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next; };
  const save = async () => { setError(''); if (!doc.title.trim() || !doc.slug.trim()) return setError('タイトルと slug を入力してください。'); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug)) return setError('slug は半角英数とハイフンで入力してください。'); const { id: docId, ...payload } = doc; const client = requireSupabase(); const result = docId ? await client.from('docs').update(payload).eq('id', docId).select().single() : await client.from('docs').insert(payload).select().single(); if (result.error) return setError(result.error.message); setDoc(result.data as import('./types').DivingDoc); setDirty(false); setSaved('保存しました。'); await refreshPublic(); if (!docId) navigate(`/admin/docs/${result.data.id}`, { replace: true }); };
  if (loading) return <p>読み込み中です…</p>;
  return <><p className="kicker">資料</p><h1>{id ? '資料を編集' : '資料を作成'}</h1><div className="editor-tabs"><button className={tab === 'form' ? 'active' : ''} onClick={() => setTab('form')}>編集</button><button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>プレビュー</button></div>{tab === 'preview' ? <DocContent doc={doc} preview /> : <div className="panel form-panel"><div className="form-grid"><label>タイトル<input value={doc.title} onChange={(event) => change('title', event.target.value)} /></label><label>slug<input value={doc.slug} onChange={(event) => change('slug', event.target.value)} /><span className="field-help">半角英数とハイフン</span></label><label>カテゴリ<input value={doc.category} onChange={(event) => change('category', event.target.value)} /></label><label>概要<textarea value={doc.summary} onChange={(event) => change('summary', event.target.value)} /></label><label>一覧用アイコン<select value={doc.icon} onChange={(event) => change('icon', event.target.value)}>{['regulator', 'hose', 'bcd', 'computer', 'mask', 'fin', 'wetsuit', 'tank'].map((icon) => <option value={icon} key={icon}>{icon}</option>)}</select></label><label>状態<select value={doc.status} onChange={(event) => change('status', event.target.value as 'draft' | 'published')}><option value="draft">下書き</option><option value="published">公開</option></select></label><label>並び順<input type="number" value={doc.sort_order} onChange={(event) => change('sort_order', Number(event.target.value))} /></label><label>intro<textarea value={doc.body.intro} onChange={(event) => changeBody({ intro: event.target.value })} /></label></div><SectionEditor sections={doc.body.sections} updateSection={updateSection} changeSections={(sections) => changeBody({ sections })} move={move} /><HabitEditor habits={doc.body.habits} changeHabits={(habits) => changeBody({ habits })} move={move} /><label>注意書き<textarea value={doc.body.disclaimer} onChange={(event) => changeBody({ disclaimer: event.target.value })} /></label>{error && <p className="error">{error}</p>}{saved && <p className="success">{saved}</p>}<div className="button-row"><button className="button" onClick={() => void save()}>保存する</button><Link className="button-secondary" to="/admin/docs">一覧に戻る</Link></div></div>}</>;
}

function SectionEditor({ sections, updateSection, changeSections, move }: { sections: import('./types').EquipmentSection[]; updateSection: (index: number, patch: Partial<import('./types').EquipmentSection>) => void; changeSections: (sections: import('./types').EquipmentSection[]) => void; move: <T>(items: T[], index: number, direction: -1 | 1) => T[] }) {
  return <section className="editor-group"><h3>機材セクション</h3>{sections.map((section, index) => <div className="editor-group" key={`${section.no}-${index}`}><div className="form-grid"><label>機材名<input value={section.name} onChange={(event) => updateSection(index, { name: event.target.value })} /></label><label>サブタイトル<input value={section.sub} onChange={(event) => updateSection(index, { sub: event.target.value })} /></label><label>イラスト<select value={section.icon} onChange={(event) => updateSection(index, { icon: event.target.value })}>{['regulator', 'hose', 'bcd', 'computer', 'mask', 'fin', 'wetsuit', 'tank'].map((icon) => <option value={icon} key={icon}>{icon}</option>)}</select></label><label>交換・点検の目安<textarea value={section.guideline} onChange={(event) => updateSection(index, { guideline: event.target.value })} /></label></div><SignEditor signs={section.signs} changeSigns={(signs) => updateSection(index, { signs })} move={move} /><div className="editor-row"><button onClick={() => changeSections(move(sections, index, -1))}>上へ</button><button onClick={() => changeSections(move(sections, index, 1))}>下へ</button><button className="remove" onClick={() => changeSections(sections.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, no: itemIndex + 1 })))}>削除</button></div></div>)}<button className="button-secondary" onClick={() => changeSections([...sections, blankSection(sections.length + 1)])}>機材を追加</button></section>;
}

function SignEditor({ signs, changeSigns, move }: { signs: import('./types').Sign[]; changeSigns: (signs: import('./types').Sign[]) => void; move: <T>(items: T[], index: number, direction: -1 | 1) => T[] }) {
  const update = (index: number, patch: Partial<import('./types').Sign>) => changeSigns(signs.map((sign, itemIndex) => itemIndex === index ? { ...sign, ...patch } : sign));
  return <div className="editor-group"><h3>症状</h3>{signs.map((sign, index) => <div className="editor-group" key={index}><div className="form-grid"><label>重要度<select value={sign.level} onChange={(event) => update(index, { level: event.target.value as 'stop' | 'check' })}><option value="stop">赤：即中止</option><option value="check">黄：早めに点検</option></select></label><label>症状<input value={sign.sign} onChange={(event) => update(index, { sign: event.target.value })} /></label><label>理由<textarea value={sign.why} onChange={(event) => update(index, { why: event.target.value })} /></label></div><div className="editor-row"><button onClick={() => changeSigns(move(signs, index, -1))}>上へ</button><button onClick={() => changeSigns(move(signs, index, 1))}>下へ</button><button className="remove" onClick={() => changeSigns(signs.filter((_, itemIndex) => itemIndex !== index))}>削除</button></div></div>)}<button className="button-secondary" onClick={() => changeSigns([...signs, { level: 'check', sign: '', why: '' }])}>症状を追加</button></div>;
}

function HabitEditor({ habits, changeHabits, move }: { habits: import('./types').Habit[]; changeHabits: (habits: import('./types').Habit[]) => void; move: <T>(items: T[], index: number, direction: -1 | 1) => T[] }) {
  const update = (index: number, patch: Partial<import('./types').Habit>) => changeHabits(habits.map((habit, itemIndex) => itemIndex === index ? { ...habit, ...patch } : habit));
  return <section className="editor-group"><h3>機材を長持ちさせる習慣</h3>{habits.map((habit, index) => <div className="editor-group" key={index}><div className="form-grid"><label>見出し<input value={habit.title} onChange={(event) => update(index, { title: event.target.value })} /></label><label>本文<textarea value={habit.text} onChange={(event) => update(index, { text: event.target.value })} /></label></div><div className="editor-row"><button onClick={() => changeHabits(move(habits, index, -1))}>上へ</button><button onClick={() => changeHabits(move(habits, index, 1))}>下へ</button><button className="remove" onClick={() => changeHabits(habits.filter((_, itemIndex) => itemIndex !== index))}>削除</button></div></div>)}<button className="button-secondary" onClick={() => changeHabits([...habits, { title: '', text: '' }])}>習慣を追加</button></section>;
}

type NewsDraft = { id?: string; title: string; body: string; next_dive_at: string; next_dive_place: string; pinned: boolean; published_at: string };
const blankNews = (): NewsDraft => ({ title: '', body: '', next_dive_at: '', next_dive_place: '', pinned: false, published_at: new Date().toISOString().slice(0, 16) });

function AdminNewsList() {
  usePageTitle('お知らせ管理'); const [items, setItems] = useState<Array<import('./types').NewsItem>>([]);
  useEffect(() => { void requireSupabase().from('news').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false }).then(({ data }) => setItems((data ?? []) as import('./types').NewsItem[])); }, []);
  return <><div className="section-heading"><div><p className="kicker">お知らせ</p><h1>お知らせを管理</h1></div><Link className="button" to="/admin/news/new">お知らせを作成</Link></div><div className="admin-list">{items.map((item) => <Link className="panel news-row" key={item.id} to={`/admin/news/${item.id}`}><span className="meta">{item.pinned && '固定 ・ '}{item.published_at ? new Date(item.published_at).toLocaleString('ja-JP') : '公開日時なし'}</span><b>{item.title}</b></Link>)}</div></>;
}

function AdminNewsEditor() {
  const { id } = useParams(); const navigate = useNavigate(); const { refreshPublic } = useAppData(); const [item, setItem] = useState<NewsDraft>(blankNews); const [error, setError] = useState(''); const [saved, setSaved] = useState(''); usePageTitle(id ? 'お知らせ編集' : 'お知らせ作成');
  useEffect(() => { if (!id) return; void requireSupabase().from('news').select('*').eq('id', id).single().then(({ data, error: loadError }) => { if (loadError || !data) setError(loadError?.message ?? 'お知らせが見つかりません。'); else { const loaded = data as import('./types').NewsItem; setItem({ id: loaded.id, title: loaded.title, body: loaded.body, next_dive_at: loaded.next_dive_at ? loaded.next_dive_at.slice(0, 16) : '', next_dive_place: loaded.next_dive_place ?? '', pinned: loaded.pinned, published_at: loaded.published_at ? loaded.published_at.slice(0, 16) : '' }); } }); }, [id]);
  const change = <K extends keyof NewsDraft>(key: K, value: NewsDraft[K]) => setItem((current) => ({ ...current, [key]: value }));
  const save = async () => { if (!item.title.trim() || !item.body.trim()) return setError('タイトルと本文を入力してください。'); const { id: itemId, next_dive_at, next_dive_place, published_at, ...rest } = item; const payload = { ...rest, next_dive_at: next_dive_at ? new Date(next_dive_at).toISOString() : null, next_dive_place: next_dive_place.trim() || null, published_at: published_at ? new Date(published_at).toISOString() : null }; const client = requireSupabase(); const result = itemId ? await client.from('news').update(payload).eq('id', itemId).select().single() : await client.from('news').insert(payload).select().single(); if (result.error) return setError(result.error.message); setSaved('保存しました。'); await refreshPublic(); if (!itemId) navigate(`/admin/news/${result.data.id}`, { replace: true }); };
  return <><p className="kicker">お知らせ</p><h1>{id ? 'お知らせを編集' : 'お知らせを作成'}</h1><div className="panel form-panel"><div className="form-grid"><label>タイトル<input maxLength={120} value={item.title} onChange={(event) => change('title', event.target.value)} /></label><label>本文<textarea value={item.body} onChange={(event) => change('body', event.target.value)} /></label><label>次回予定日時（任意）<input type="datetime-local" value={item.next_dive_at} onChange={(event) => change('next_dive_at', event.target.value)} /></label><label>次回場所（任意）<input value={item.next_dive_place} onChange={(event) => change('next_dive_place', event.target.value)} /></label><label>公開日時<input type="datetime-local" value={item.published_at} onChange={(event) => change('published_at', event.target.value)} /></label><label><input type="checkbox" checked={item.pinned} onChange={(event) => change('pinned', event.target.checked)} /> 固定表示する</label></div>{error && <p className="error">{error}</p>}{saved && <p className="success">{saved}</p>}<div className="button-row"><button className="button" onClick={() => void save()}>保存する</button><Link className="button-secondary" to="/admin/news">一覧に戻る</Link></div></div></>;
}

function AdminBoardPage() {
  usePageTitle('投稿管理'); const [threads, setThreads] = useState<Thread[]>([]); const [posts, setPosts] = useState<Post[]>([]); const [error, setError] = useState('');
  const load = useCallback(async () => { const client = requireSupabase(); const [threadResult, postResult] = await Promise.all([client.from('threads').select('*').order('created_at', { ascending: false }), client.from('posts').select('*').order('created_at', { ascending: false })]); if (threadResult.error || postResult.error) setError(threadResult.error?.message ?? postResult.error?.message ?? '取得できませんでした。'); else { setThreads(threadResult.data as Thread[]); setPosts(postResult.data as Post[]); } }, []);
  useEffect(() => { void load(); }, [load]);
  const toggle = async (table: 'threads' | 'posts', item: Thread | Post) => { const result = await requireSupabase().from(table).update({ hidden: !item.hidden }).eq('id', item.id); if (result.error) setError(result.error.message); else await load(); };
  const remove = async (table: 'threads' | 'posts', id: number) => { if (window.confirm('この投稿を削除しますか？')) { const result = await requireSupabase().from(table).delete().eq('id', id); if (result.error) setError(result.error.message); else await load(); } };
  const card = (table: 'threads' | 'posts', item: Thread | Post, title: string) => <article className="panel post" key={`${table}-${item.id}`}><div className="post-head"><b>{title}</b><span>{item.hidden ? '非表示' : '表示中'}</span></div><p className="meta">{item.author_name} ・ {new Date(item.created_at).toLocaleString('ja-JP')}</p><div className="own-actions"><button onClick={() => void toggle(table, item)}>{item.hidden ? '再表示' : '非表示'}</button><button onClick={() => void remove(table, item.id)}>削除</button></div></article>;
  return <><p className="kicker">投稿管理</p><h1>掲示板を管理</h1>{error && <p className="error">{error}</p>}<h2>スレッド</h2><div className="admin-list">{threads.map((thread) => card('threads', thread, thread.title))}</div><h2>返信</h2><div className="admin-list">{posts.map((post) => card('posts', post, post.body.slice(0, 60) || '画像のみの返信'))}</div></>;
}

function AdminSettingsPage() {
  usePageTitle('設定'); const [passcode, setPasscode] = useState(''); const [disclaimer, setDisclaimer] = useState(''); const [admins, setAdmins] = useState<Array<{ user_id: string; display_name: string; role: string }>>([]); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { const client = requireSupabase(); void Promise.all([client.from('public_settings').select('disclaimer').single(), client.from('admins').select('user_id, display_name, role').order('created_at')]).then(([settings, adminResult]) => { if (settings.data) setDisclaimer(settings.data.disclaimer ?? ''); if (adminResult.data) setAdmins(adminResult.data); }); }, []);
  const changePasscode = async () => { setError(''); setMessage(''); if (!passcode) return setError('新しい合言葉を入力してください。'); const result = await requireSupabase().rpc('set_passcode', { p_passcode: passcode }); if (result.error) setError(result.error.message); else { setPasscode(''); setMessage('合言葉を変更しました。掲示板メンバーは再入力が必要です。'); } };
  const saveDisclaimer = async () => { setError(''); setMessage(''); const result = await requireSupabase().rpc('set_disclaimer', { p_disclaimer: disclaimer }); if (result.error) setError(result.error.message); else setMessage('注意書きを保存しました。'); };
  return <><p className="kicker">設定</p><h1>掲示板と表示の設定</h1><div className="panel form-panel"><h2>合言葉を変更</h2><p>変更すると、全員が新しい合言葉を入力するまで掲示板を利用できなくなります。</p><label>新しい合言葉<input type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} /></label><div className="button-row"><button className="button-danger" onClick={() => void changePasscode()}>合言葉を変更</button></div></div><div className="panel form-panel"><h2>注意書き文言</h2><label>資料詳細の注意書き<textarea value={disclaimer} onChange={(event) => setDisclaimer(event.target.value)} /></label><div className="button-row"><button className="button" onClick={() => void saveDisclaimer()}>保存する</button></div></div><section><h2>管理者一覧</h2><div className="admin-list">{admins.map((admin) => <div className="panel" key={admin.user_id}><b>{admin.display_name || '表示名未設定'}</b><span className="meta"> ・ {admin.role}</span></div>)}</div></section>{error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}</>;
}

function NotFoundPage() { usePageTitle('404'); return <section><p className="kicker">404</p><h1>ページが見つかりません</h1><p>URLをご確認ください。</p><Link className="button" to="/">ホームへ戻る</Link></section>; }

export default function App() { return <AppDataProvider><Layout /></AppDataProvider>; }
