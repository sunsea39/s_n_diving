import { useCallback, useEffect, useState } from 'react';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import { ConfirmButton } from '../../components/ConfirmButton';
import type { Post, Thread } from '../../types';

export function AdminBoardPage() {
  usePageTitle('投稿管理');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const client = requireSupabase();
    const [threadResult, postResult] = await Promise.all([
      client.from('threads').select('*').order('created_at', { ascending: false }),
      client.from('posts').select('*').order('created_at', { ascending: false })
    ]);
    if (threadResult.error || postResult.error) {
      setError(
        threadResult.error?.message ?? postResult.error?.message ?? '取得できませんでした。'
      );
      return;
    }
    setThreads(threadResult.data as Thread[]);
    setPosts(postResult.data as Post[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (table: 'threads' | 'posts', item: Thread | Post) => {
    const result = await requireSupabase()
      .from(table)
      .update({ hidden: !item.hidden })
      .eq('id', item.id);
    if (result.error) setError(result.error.message);
    else await load();
  };

  const remove = async (table: 'threads' | 'posts', id: number) => {
    const result = await requireSupabase().from(table).delete().eq('id', id);
    if (result.error) setError(result.error.message);
    else await load();
  };

  const card = (table: 'threads' | 'posts', item: Thread | Post, title: string) => (
    <article className="panel post" key={`${table}-${item.id}`}>
      <div className="post-head">
        <b>{title}</b>
        <span>{item.hidden ? '非表示' : '表示中'}</span>
      </div>
      <p className="meta">
        {item.author_name} ・ {new Date(item.created_at).toLocaleString('ja-JP')}
      </p>
      <div className="own-actions">
        <button onClick={() => void toggle(table, item)}>
          {item.hidden ? '再表示' : '非表示'}
        </button>
        <ConfirmButton
          label="削除"
          message="この投稿を削除しますか？"
          onConfirm={() => remove(table, item.id)}
        />
      </div>
    </article>
  );

  return (
    <>
      <p className="kicker">投稿管理</p>
      <h1>掲示板を管理</h1>
      {error && <p className="error">{error}</p>}
      <h2>スレッド</h2>
      <div className="admin-list">
        {threads.map((thread) => card('threads', thread, thread.title))}
      </div>
      <h2>返信</h2>
      <div className="admin-list">
        {posts.map((post) => card('posts', post, post.body.slice(0, 60) || '画像のみの返信'))}
      </div>
    </>
  );
}
