import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocCard } from '../components/DocContent';
import { HeroScene } from '../components/HeroScene';
import { ThreadRow } from '../components/ThreadRow';
import { useAppData } from '../context/AppDataContext';
import { formatNextDive, latestDocs, relativeDate, selectNextDive } from '../lib/logic';
import { requireSupabase } from '../lib/supabase';
import { usePageTitle } from '../lib/pageTitle';
import type { Profile, Thread } from '../types';
import { AccidentCard } from './AccidentsPage';
import { usePageText } from '../components/PageHeading';

function RecentThreads() {
  const { configured, isBoardMember } = useAppData();
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    if (!configured || !isBoardMember) return;
    void requireSupabase()
      .from('threads')
      .select('*')
      .order('last_post_at', { ascending: false })
      .limit(3)
      .then(async ({ data }) => {
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
      });
  }, [configured, isBoardMember]);

  if (!isBoardMember) {
    return <p className="empty">掲示板は承認済みの仲間だけが見られます。</p>;
  }
  return threads.length ? (
    <div className="thread-list">
      {threads.map((thread) => (
        <ThreadRow key={thread.id} thread={thread} />
      ))}
    </div>
  ) : (
    <p className="empty">まだ投稿はありません。</p>
  );
}

export function TopPage() {
  usePageTitle('ホーム');
  const { docs, news, accidents, isBoardMember, loading } = useAppData();
  const text = usePageText('home');
  const nextDive = selectNextDive(news);
  const newestDocs = latestDocs(docs);

  return (
    <>
      <section className="hero">
        <p className="kicker">{text.kicker}</p>
        <h1>{text.title}</h1>
        <p className="lead">{text.lead}</p>
        <div className="button-row">
          <Link className="button" to="/docs">
            資料を見る
          </Link>
          {isBoardMember ? (
            <Link className="button-secondary" to="/board">
              掲示板を見る
            </Link>
          ) : (
            <Link className="button-secondary" to="/login?next=/board">
              ログインして見る
            </Link>
          )}
        </div>
        <HeroScene />
        <section className="next-dive">
          <span className="next-dive-kicker">NEXT DIVE</span>
          {nextDive ? (
            <p>
              <b>{formatNextDive(nextDive)}</b>
              {nextDive.place && <span> ・ {nextDive.place}</span>}
              {nextDive.staff && <small>担当：{nextDive.staff}</small>}
            </p>
          ) : (
            <p>次回の予定は未定です。</p>
          )}
        </section>
      </section>

      <section id="news">
        <div className="section-heading">
          <h2>お知らせ</h2>
        </div>
        {loading ? (
          <p>読み込み中です…</p>
        ) : news.slice(0, 3).length ? (
          <div className="news-list">
            {news.slice(0, 3).map((item) => (
              <Link className="panel news-row" to={`/news/${item.id}`} key={item.id}>
                <span className="meta">
                  {item.pinned && '固定 ・ '}
                  {item.category === 'dive' ? 'ダイビング ・ ' : 'その他 ・ '}
                  {item.published_at ? relativeDate(item.published_at) : ''}
                </span>
                <b>{item.title}</b>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty">お知らせはまだありません。</p>
        )}
      </section>

      <section>
        <div className="section-heading">
          <h2>資料</h2>
          <Link to="/docs">一覧へ</Link>
        </div>
        <div className="card-grid">
          {newestDocs.map((doc) => (
            <DocCard doc={doc} key={doc.slug} />
          ))}
        </div>
      </section>

      {accidents.length > 0 && (
        <section>
          <div className="section-heading">
            <h2>事故事例の新着</h2>
            <Link to="/accidents">一覧へ</Link>
          </div>
          <div className="accident-list compact">
            {accidents.slice(0, 2).map((accident) => (
              <AccidentCard accident={accident} key={accident.id} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-heading">
          <h2>掲示板の新着</h2>
          <Link to={isBoardMember ? '/board' : '/login?next=/board'}>
            {isBoardMember ? '一覧へ' : 'ログインして見る'}
          </Link>
        </div>
        <RecentThreads />
      </section>
    </>
  );
}
