import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { usePageTitle } from '../lib/pageTitle';
import { requireSupabase } from '../lib/supabase';
import { totalDiveCount } from '../lib/logic';
import type { Post, Profile, Thread } from '../types';

type MemberPost = { id: string; threadId: number; label: string; createdAt: string };

export function MemberPage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<MemberPost[]>([]);
  usePageTitle(profile?.display_name ?? '仲間のプロフィール');
  useEffect(() => {
    if (!id) return;
    const client = requireSupabase();
    void Promise.all([
      client.from('profiles').select('*').eq('id', id).single(),
      client
        .from('threads')
        .select('*')
        .eq('author_uid', id)
        .order('created_at', { ascending: false }),
      client
        .from('posts')
        .select('*')
        .eq('author_uid', id)
        .order('created_at', { ascending: false })
    ]).then(([p, t, r]) => {
      if (!p.error) setProfile(p.data as Profile);
      const threadPosts = ((t.data ?? []) as Thread[]).map((post) => ({
        id: `t${post.id}`,
        threadId: post.id,
        label: post.title,
        createdAt: post.created_at
      }));
      const replies = ((r.data ?? []) as Post[]).map((post) => ({
        id: `p${post.id}`,
        threadId: post.thread_id,
        label: post.body.slice(0, 80) || '画像のみの返信',
        createdAt: post.created_at
      }));
      setPosts(
        [...threadPosts, ...replies]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5)
      );
    });
  }, [id]);
  if (!profile) return <p>読み込み中です…</p>;
  return (
    <>
      <p className="kicker">仲間</p>
      <section className="panel member-profile">
        <Avatar
          name={profile.display_name}
          path={profile.avatar_path}
          style={profile.avatar_style}
        />
        <h1>{profile.display_name}</h1>
        {profile.bio && <p>{profile.bio}</p>}
        <dl>
          <dt>ライセンス</dt>
          <dd>
            {profile.licenses?.map((item) => `${item.org} ${item.rank}`).join('、') ||
              profile.license ||
              '未登録'}
          </dd>
          <dt>経験本数</dt>
          <dd>{totalDiveCount(profile.dive_count, profile.logged_dives)}本</dd>
          <dt>最後にダイビングした日</dt>
          <dd>{profile.last_dived_on ?? 'まだ記録がありません'}</dd>
          <dt>よく潜る海</dt>
          <dd>{profile.favorite_areas || '未登録'}</dd>
        </dl>
      </section>
      <h2>最近の投稿</h2>
      <div className="admin-list">
        {posts.map((post) => (
          <Link className="panel" key={post.id} to={`/board/${post.threadId}`}>
            {post.label}
          </Link>
        ))}
      </div>
    </>
  );
}
