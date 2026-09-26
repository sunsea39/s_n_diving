import { useEffect, useState } from 'react';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import { useAppData } from '../../context/AppDataContext';

export function AdminDashboardPage() {
  usePageTitle('管理ダッシュボード');
  const [stats, setStats] = useState({ published: 0, draft: 0, weekPosts: 0 });
  const { isOwner } = useAppData();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const client = requireSupabase();
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    void Promise.all([
      client.from('docs').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      client.from('docs').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      client.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', week)
    ]).then(([published, draft, posts]) =>
      setStats({
        published: published.count ?? 0,
        draft: draft.count ?? 0,
        weekPosts: posts.count ?? 0
      })
    );
  }, []);
  useEffect(() => {
    if (!isOwner) return;
    void requireSupabase()
      .rpc('list_members')
      .then((result) => {
        if (!result.error)
          setPending(
            (result.data ?? []).filter((item: { role: string }) => item.role === 'pending').length
          );
      });
  }, [isOwner]);

  return (
    <>
      <p className="kicker">管理者</p>
      <h1>ダッシュボード</h1>
      <div className="dashboard-grid">
        <div className="panel stat">
          <span>公開中資料</span>
          <strong>{stats.published}</strong>
        </div>
        {isOwner && (
          <div className="panel stat">
            <span>承認待ち</span>
            <strong>{pending}</strong>
          </div>
        )}
        <div className="panel stat">
          <span>下書き</span>
          <strong>{stats.draft}</strong>
        </div>
        <div className="panel stat">
          <span>今週の投稿</span>
          <strong>{stats.weekPosts}</strong>
        </div>
      </div>
    </>
  );
}
