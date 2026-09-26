import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThreadRow } from '../../components/ThreadRow';
import { boardCategories } from '../../lib/board';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import type { BoardCategory, Thread } from '../../types';
import type { Profile } from '../../types';
import { usePageText } from '../../components/PageHeading';

export function BoardPage() {
  usePageTitle('掲示板');
  const [category, setCategory] = useState<BoardCategory | 'all'>('all');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const text = usePageText('board');

  useEffect(() => {
    let active = true;
    setLoading(true);
    let query = requireSupabase()
      .from('threads')
      .select('*')
      .order('last_post_at', { ascending: false });
    if (category !== 'all') query = query.eq('category', category);

    void query.then(async ({ data }) => {
      if (!active) return;
      const items = (data ?? []) as Thread[];
      const profiles = await requireSupabase()
        .from('profiles')
        .select('id, display_name, avatar_path, avatar_style')
        .in('id', [...new Set(items.map((item) => item.author_uid))]);
      const byId = new Map(
        (profiles.data ?? []).map((item) => [
          item.id,
          item as Pick<Profile, 'id' | 'display_name' | 'avatar_path' | 'avatar_style'>
        ])
      );
      setThreads(items.map((item) => ({ ...item, profile: byId.get(item.author_uid) ?? null })));
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
          <p className="kicker">{text.kicker}</p>
          <h1>{text.title}</h1>
          {text.lead && <p className="lead">{text.lead}</p>}
        </div>
        <Link className="button" to="/board/new">
          新規投稿
        </Link>
      </div>
      <div className="category-row" aria-label="カテゴリ絞り込み">
        <button
          className="chip"
          aria-pressed={category === 'all'}
          onClick={() => setCategory('all')}
        >
          すべて
        </button>
        {boardCategories.map((item) => (
          <button
            key={item.id}
            className="chip"
            aria-pressed={category === item.id}
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
