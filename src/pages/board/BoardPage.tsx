import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThreadRow } from '../../components/ThreadRow';
import { boardCategories } from '../../lib/board';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import type { BoardCategory, Thread } from '../../types';

export function BoardPage() {
  usePageTitle('掲示板');
  const [category, setCategory] = useState<BoardCategory | 'all'>('all');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    let query = requireSupabase()
      .from('threads')
      .select('*')
      .order('last_post_at', { ascending: false });
    if (category !== 'all') query = query.eq('category', category);

    void query.then(({ data }) => {
      if (!active) return;
      setThreads((data ?? []) as Thread[]);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [category]);

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">掲示板</p>
          <h1>みんなの記録</h1>
        </div>
        <Link className="button" to="/board/new">
          新規投稿
        </Link>
      </div>
      <div className="category-row" aria-label="カテゴリ絞り込み">
        <button className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>
          すべて
        </button>
        {boardCategories.map((item) => (
          <button
            key={item.id}
            className={category === item.id ? 'selected' : ''}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading ? (
        <p>読み込み中です…</p>
      ) : threads.length ? (
        <div className="thread-list">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </div>
      ) : (
        <p className="empty">このカテゴリの投稿はまだありません。</p>
      )}
    </>
  );
}
