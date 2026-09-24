import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BoardImage } from '../../components/BoardImage';
import { useAppData } from '../../context/AppDataContext';
import { categoryLabel, uploadBoardImage } from '../../lib/board';
import { relativeDate, validateReply, validateThreadInput } from '../../lib/logic';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import { PlainText } from '../../lib/text';
import type { HiyariFields, Post, Thread } from '../../types';

function ThreadBody({ thread }: { thread: Thread }) {
  if (thread.category === 'hiyari' && thread.hiyari) {
    return (
      <div className="hiyari-view">
        <div>
          <b>何が起きた？</b>
          <p>
            <PlainText text={thread.hiyari.what} />
          </p>
        </div>
        <div>
          <b>なぜ起きた？</b>
          <p>
            <PlainText text={thread.hiyari.why} />
          </p>
        </div>
        <div>
          <b>次はどうする？</b>
          <p>
            <PlainText text={thread.hiyari.next} />
          </p>
        </div>
      </div>
    );
  }

  return (
    <p className="post-body">
      <PlainText text={thread.body} />
    </p>
  );
}

function ThreadOwnerActions({
  thread,
  onChange
}: {
  thread: Thread;
  onChange: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(thread.title);
  const [body, setBody] = useState(thread.body);
  const [hiyari, setHiyari] = useState<HiyariFields>(
    thread.hiyari ?? { what: '', why: '', next: '' }
  );
  const [error, setError] = useState('');

  const save = async () => {
    const invalid = validateThreadInput({ title, body, category: thread.category, hiyari });
    if (invalid) return setError(invalid);

    const result = await requireSupabase()
      .from('threads')
      .update({
        title: title.trim(),
        body: thread.category === 'hiyari' ? '' : body.trim(),
        hiyari: thread.category === 'hiyari' ? hiyari : null
      })
      .eq('id', thread.id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setEditing(false);
    await onChange();
  };

  const remove = async () => {
    if (!window.confirm('このスレッドと返信を削除しますか？')) return;
    const result = await requireSupabase().from('threads').delete().eq('id', thread.id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    navigate('/board');
  };

  if (!editing) {
    return (
      <div className="own-actions">
        <button onClick={() => setEditing(true)}>編集</button>
        <button onClick={() => void remove()}>削除</button>
        {error && <span className="error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="editor-group">
      <label>
        タイトル
        <input maxLength={60} value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      {thread.category === 'hiyari' ? (
        <>
          <label>
            何が起きた？
            <textarea
              value={hiyari.what}
              onChange={(event) => setHiyari({ ...hiyari, what: event.target.value })}
            />
          </label>
          <label>
            なぜ起きた？
            <textarea
              value={hiyari.why}
              onChange={(event) => setHiyari({ ...hiyari, why: event.target.value })}
            />
          </label>
          <label>
            次はどうする？
            <textarea
              value={hiyari.next}
              onChange={(event) => setHiyari({ ...hiyari, next: event.target.value })}
            />
          </label>
        </>
      ) : (
        <label>
          本文
          <textarea
            value={body}
            maxLength={4000}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <div className="own-actions">
        <button onClick={() => void save()}>保存</button>
        <button onClick={() => setEditing(false)}>取消</button>
      </div>
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  onChange
}: {
  post: Post;
  currentUserId?: string;
  onChange: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(post.body);
  const [error, setError] = useState('');
  const own = currentUserId === post.author_uid;

  const update = async () => {
    const invalid = validateReply(body);
    if (invalid) return setError(invalid);
    const result = await requireSupabase()
      .from('posts')
      .update({ body: body.trim() })
      .eq('id', post.id);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setEditing(false);
    await onChange();
  };

  const remove = async () => {
    if (!window.confirm('この返信を削除しますか？')) return;
    const result = await requireSupabase().from('posts').delete().eq('id', post.id);
    if (result.error) setError(result.error.message);
    else await onChange();
  };

  return (
    <article className="panel post">
      <div className="post-head">
        <b>{post.author_name}</b>
        <span>{relativeDate(post.created_at)}</span>
      </div>
      {editing ? (
        <>
          <textarea
            maxLength={2000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <div className="own-actions">
            <button onClick={() => void update()}>保存</button>
            <button onClick={() => setEditing(false)}>取消</button>
          </div>
        </>
      ) : (
        <>
          <p className="post-body">
            <PlainText text={post.body} />
          </p>
          <BoardImage path={post.image_path} />
          {own && (
            <div className="own-actions">
              <button onClick={() => setEditing(true)}>編集</button>
              <button onClick={() => void remove()}>削除</button>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export function ThreadPage() {
  const { id } = useParams();
  const { user } = useAppData();
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reply, setReply] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  usePageTitle(thread?.title ?? '掲示板');

  const load = useCallback(async () => {
    const client = requireSupabase();
    const [threadResult, postResult] = await Promise.all([
      client
        .from('threads')
        .select('*')
        .eq('id', id as string)
        .single(),
      client
        .from('posts')
        .select('*')
        .eq('thread_id', id as string)
        .order('created_at')
    ]);
    if (!threadResult.error) setThread(threadResult.data as Thread);
    if (!postResult.error) setPosts(postResult.data as Post[]);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validateReply(reply);
    if (invalid) return setError(invalid);
    if (!user || !thread) return;

    setBusy(true);
    setError('');
    try {
      const image_path = file ? await uploadBoardImage(file, user.id) : null;
      const result = await requireSupabase()
        .from('posts')
        .insert({
          thread_id: thread.id,
          body: reply.trim(),
          image_path,
          author_name: localStorage.getItem('sn-diving-name') ?? '名無し',
          author_uid: user.id
        });
      if (result.error) throw result.error;
      setReply('');
      setFile(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '返信できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  if (!thread) return <p>読み込み中です…</p>;

  return (
    <>
      <article className="panel thread-header">
        <span className={`category ${thread.category}`}>{categoryLabel(thread.category)}</span>
        <h1>{thread.title}</h1>
        <p className="meta">
          {thread.author_name} ・ {new Date(thread.created_at).toLocaleString('ja-JP')}
        </p>
        <ThreadBody thread={thread} />
        <BoardImage path={thread.image_path} />
        {user?.id === thread.author_uid && <ThreadOwnerActions thread={thread} onChange={load} />}
      </article>
      <section>
        <div className="section-heading">
          <h2>返信 {posts.length}件</h2>
        </div>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} onChange={load} />
        ))}
      </section>
      <form className="panel form-panel" onSubmit={submit}>
        <h2>返信する</h2>
        <label>
          本文
          <textarea
            maxLength={2000}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
          />
        </label>
        <label>
          画像（1枚まで）
          <input
            className="file-input"
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" disabled={busy}>
          {busy ? '投稿中…' : '返信する'}
        </button>
      </form>
    </>
  );
}
